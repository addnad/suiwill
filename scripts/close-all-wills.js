import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { fromBase64 } from "@mysten/sui/utils";
import { CoreClient } from "@mysten/sui/client";
import * as fs from "fs";
import * as path from "path";

const NETWORK = process.env.WATCHER_NETWORK ?? "testnet";
const PACKAGE_IDS = {
  testnet: "0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2",
  mainnet: "0x8cbf4b60bff206ce8ef24f7b4a9344eec01a862d3ec206262600b3da86419cae",
};
const TATUM_KEY = "t-65a7c7b760fded001ccd19d3-de68f6cb571143d58ea5c811";
const RPC_URLS = {
  testnet: `https://sui-testnet.gateway.tatum.io/${TATUM_KEY}`,
  mainnet: `https://sui-mainnet.gateway.tatum.io/${TATUM_KEY}`,
};
const PACKAGE_ID = PACKAGE_IDS[NETWORK];
const client = new CoreClient({ url: RPC_URLS[NETWORK] });

function loadKeypair() {
  const configPath = path.join(process.env.HOME, ".sui/sui_config/sui.keystore");
  const keystore = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const keyBytes = fromBase64(keystore[0]);
  return Ed25519Keypair.fromSecretKey(keyBytes.slice(1));
}

async function getAllWillIds(address) {
  const res = await fetch(RPC_URLS[NETWORK], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "suix_queryEvents",
      params: [{ MoveEventType: PACKAGE_ID + "::will::WillCreated" }, null, 50, false]
    }),
  });
  const data = await res.json();
  return data.result.data
    .filter(e => e.sender === address)
    .map(e => e.parsedJson?.will_id)
    .filter(Boolean);
}

async function closeWill(keypair, willId) {
  const tx = new Transaction();
  tx.moveCall({
    target: PACKAGE_ID + "::will::close_will",
    arguments: [tx.object(willId)],
  });
  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true },
  });
  return result.digest;
}

async function main() {
  const keypair = loadKeypair();
  const address = keypair.getPublicKey().toSuiAddress();
  console.log("Network:", NETWORK.toUpperCase());
  console.log("Address:", address);

  const willIds = await getAllWillIds(address);
  console.log("Found", willIds.length, "will(s):", willIds);

  for (const willId of willIds) {
    console.log("Closing will:", willId);
    try {
      const digest = await closeWill(keypair, willId);
      console.log("  Closed. Tx:", digest);
    } catch (err) {
      console.error("  Failed:", err.message);
    }
  }
  console.log("Done.");
}

main().catch(console.error);
