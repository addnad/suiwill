import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { CoreClient } from "@mysten/sui/client";
import * as fs from "fs";
import * as path from "path";

// ===== CONFIG =====
const NETWORK = process.env.WATCHER_NETWORK ?? "testnet";
const PACKAGE_IDS = {
  testnet: "0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2",
  mainnet: "0x8cbf4b60bff206ce8ef24f7b4a9344eec01a862d3ec206262600b3da86419cae",
};
const TATUM_KEY = "t-65a7c7b760fded001ccd19d3-de68f6cb571143d58ea5c811";
const RPC_URLS = {
  primary: {
    testnet: "https://fullnode.testnet.sui.io:443",
    mainnet: "https://fullnode.mainnet.sui.io:443",
  },
  fallback: {
    testnet: `https://sui-testnet.gateway.tatum.io/${TATUM_KEY}`,
    mainnet: `https://sui-mainnet.gateway.tatum.io/${TATUM_KEY}`,
  },
};
const PACKAGE_ID = PACKAGE_IDS[NETWORK];
const CLOCK_ID = "0x6";
const CHECK_INTERVAL_MS = 60000;
console.log(`VIGIL watcher starting on ${NETWORK} — package ${PACKAGE_ID}`);
console.log(`Primary RPC: Tatum | Fallback: Sui public fullnode`);

// Load keypair from Sui CLI keystore
function loadKeypair() {
  const configPath = path.join(process.env.HOME, ".sui/sui_config/sui.keystore");
  const keystore = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const keyBytes = fromBase64(keystore[0]);
  return Ed25519Keypair.fromSecretKey(keyBytes.slice(1));
}

// Raw RPC call with Tatum primary + fullnode fallback
async function rpc(method, params) {
  const endpoints = [
    RPC_URLS.primary[NETWORK],
    RPC_URLS.fallback[NETWORK],
  ];
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json();
      if (data.error) throw new Error(JSON.stringify(data.error));
      return data.result;
    } catch (err) {
      const isTatum = url.includes("tatum");
      if (isTatum) {
        console.warn(`Tatum RPC failed (${err.message}), falling back to public fullnode...`);
        continue;
      }
      throw err;
    }
  }
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
const coreClient = new CoreClient({ url: RPC_URLS.primary[NETWORK] });

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
  const { execSync } = await import("child_process");
  const cmd = `sui client call --package ${PACKAGE_ID} --module will --function trigger_grace --args ${willId} ${CLOCK_ID} --gas-budget 20000000 --json`;
  const output = JSON.parse(execSync(cmd, { encoding: "utf8" }));
  if (output.effects?.status?.status !== "success") {
    throw new Error(`Tx failed: ${JSON.stringify(output.effects?.status)}`);
  }
  return output.effects.transactionDigest;
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

      let obj;
      try {
        obj = await getObject(willId);
      } catch (e) {
        console.log(`  [SKIP] ${willId.slice(0,10)}... object not found or deleted`);
        continue;
      }
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
