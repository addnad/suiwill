import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { CoreClient } from "@mysten/sui/client";
import * as fs from "fs";
import * as path from "path";

// ===== CONFIG =====
const PACKAGE_ID = "0xbf03c8995a9e571b96815206bb6654aa43281db2347dc93813f33647f6f0ddba";
const CLOCK_ID = "0x6";
const RPC_URL = "https://fullnode.testnet.sui.io:443";
const CHECK_INTERVAL_MS = 60000;

// Load keypair from Sui CLI keystore
function loadKeypair() {
  const configPath = path.join(process.env.HOME, ".sui/sui_config/sui.keystore");
  const keystore = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const keyBytes = fromBase64(keystore[0]);
  return Ed25519Keypair.fromSecretKey(keyBytes.slice(1));
}

// Raw RPC call
async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const data = await res.json();
  if (data.error) throw new Error(JSON.stringify(data.error));
  return data.result;
}

async function queryEvents(eventType, cursor = null) {
  return rpc("suix_queryEvents", [
    { MoveEventType: eventType },
    cursor,
    50,
    false,
  ]);
}

async function getObject(id) {
  return rpc("sui_getObject", [id, { showContent: true, showType: true }]);
}

const keypair = loadKeypair();
const watcherAddress = keypair.getPublicKey().toSuiAddress();
const coreClient = new CoreClient({ url: RPC_URL });

console.log("=================================");
console.log("VIGIL WATCHER AGENT");
console.log("=================================");
console.log(`Network:  testnet`);
console.log(`Package:  ${PACKAGE_ID}`);
console.log(`Watcher:  ${watcherAddress}`);
console.log(`Interval: ${CHECK_INTERVAL_MS / 1000}s`);
console.log("=================================\n");

async function getAllWills() {
  const events = [];
  let cursor = null;

  while (true) {
    const result = await queryEvents(`${PACKAGE_ID}::will::WillCreated`, cursor);
    events.push(...result.data);
    if (!result.hasNextPage) break;
    cursor = result.nextCursor;
  }

  return events;
}

async function triggerGrace(willId) {
  const tx = new Transaction();
  tx.moveCall({
    target: `${PACKAGE_ID}::will::trigger_grace`,
    arguments: [tx.object(willId), tx.object(CLOCK_ID)],
  });

  const result = await coreClient.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  return result.digest;
}

async function checkWills() {
  const now = Date.now();
  console.log(`[${new Date().toISOString()}] Checking wills...`);

  try {
    const events = await getAllWills();
    console.log(`  Found ${events.length} will(s)`);

    for (const event of events) {
      const willId = event.parsedJson?.will_id;
      if (!willId) continue;

      const obj = await getObject(willId);
      const content = obj?.data?.content;
      if (!content || content.dataType !== "moveObject") continue;

      const fields = content.fields;
      const lastSeenMs = parseInt(fields.last_seen_ms);
      const timeoutMs = parseInt(fields.timeout_ms);
      const inGrace = fields.in_grace;
      const owner = fields.owner;
      const msUntilTrigger = lastSeenMs + timeoutMs - now;
      const daysUntilTrigger = Math.floor(msUntilTrigger / 86400000);

      if (inGrace) {
        const graceStartMs = parseInt(fields.grace_start_ms);
        const msUntilExecution = graceStartMs + 604800000 - now;
        console.log(`  [GRACE] ${willId.slice(0,10)}... owner=${owner.slice(0,8)}... execution in ${Math.floor(msUntilExecution/86400000)}d`);
        continue;
      }

      if (msUntilTrigger <= 0) {
        console.log(`  [TRIGGER] ${willId.slice(0,10)}... INACTIVITY DETECTED — triggering grace`);
        try {
          const digest = await triggerGrace(willId);
          console.log(`  [OK] Grace triggered. Tx: ${digest}`);
        } catch (err) {
          console.error(`  [ERROR] Failed: ${err.message}`);
        }
      } else {
        console.log(`  [OK] ${willId.slice(0,10)}... owner=${owner.slice(0,8)}... active — ${daysUntilTrigger}d until trigger`);
      }
    }
  } catch (err) {
    console.error(`  [ERROR] ${err.message}`);
  }
  console.log("");
}

checkWills();
setInterval(checkWills, CHECK_INTERVAL_MS);
