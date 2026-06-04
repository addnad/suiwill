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
const RPC_URLS = {
  testnet: "https://fullnode.testnet.sui.io:443",
  mainnet: "https://fullnode.mainnet.sui.io:443",
};
const WALRUS_PUBLISHERS = {
  testnet: "https://publisher.walrus-testnet.walrus.space",
  mainnet: "https://publisher.walrus-testnet.walrus.space",
};

const PACKAGE_ID = PACKAGE_IDS[NETWORK];
const CLOCK_ID = "0x6";
const client = new CoreClient({ url: RPC_URLS[NETWORK] });

function loadKeypair() {
  const configPath = path.join(process.env.HOME, ".sui/sui_config/sui.keystore");
  const keystore = JSON.parse(fs.readFileSync(configPath, "utf8"));
  const keyBytes = fromBase64(keystore[0]);
  return Ed25519Keypair.fromSecretKey(keyBytes.slice(1));
}

async function uploadToWalrus(message) {
  const publisher = WALRUS_PUBLISHERS[NETWORK];
  console.log("\n📦 Uploading message to Walrus (" + NETWORK + ")...");
  console.log("   Message: \"" + message + "\"");
  console.log("   Publisher: " + publisher);

  const res = await fetch(publisher + "/v1/blobs?epochs=10", {
    method: "PUT",
    headers: { "Content-Type": "application/octet-stream" },
    body: new TextEncoder().encode(message),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error("Walrus upload failed: " + err);
  }

  const data = await res.json();
  const blobId = data?.newlyCreated?.blobObject?.blobId ?? data?.alreadyCertified?.blobId;
  if (!blobId) throw new Error("No blob ID in response: " + JSON.stringify(data));

  console.log("   ✅ Blob ID: " + blobId);
  return blobId;
}

function blobIdToBytes(blobId) {
  const base64 = blobId.replace(/-/g, "+").replace(/_/g, "/");
  const binary = Buffer.from(base64, "base64");
  return Array.from(binary);
}

async function createWill(keypair, blobIdBytes) {
  const address = keypair.getPublicKey().toSuiAddress();
  console.log("\n📝 Creating will on " + NETWORK + "...");
  console.log("   Owner: " + address);
  console.log("   Package: " + PACKAGE_ID);

  const tx = new Transaction();
  const addresses = [address];
  const shares = [10000];
  const timeoutMs = BigInt(30 * 24 * 60 * 60 * 1000);
  const depositMist = BigInt(100_000_000);
  const [depositCoin] = tx.splitCoins(tx.gas, [depositMist]);

  tx.moveCall({
    target: PACKAGE_ID + "::will::create_will",
    arguments: [
      tx.pure.vector("address", addresses),
      tx.pure.vector("u64", shares),
      tx.pure.u64(timeoutMs),
      tx.pure.vector("u8", blobIdBytes),
      depositCoin,
      tx.object(CLOCK_ID),
    ],
  });

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
    options: { showEffects: true, showObjectChanges: true },
  });

  return result;
}

async function main() {
  console.log("\n🚀 SuiWill Test Script");
  console.log("   Network: " + NETWORK.toUpperCase());

  const keypair = loadKeypair();
  const address = keypair.getPublicKey().toSuiAddress();
  console.log("   Address: " + address);

  const blobId = await uploadToWalrus("I love you all");
  const blobIdBytes = blobIdToBytes(blobId);
  console.log("   Blob bytes (" + blobIdBytes.length + "): [" + blobIdBytes.slice(0,4).join(",") + "...]");

  const result = await createWill(keypair, blobIdBytes);

  console.log("\n✅ Will Created Successfully!");
  console.log("   Tx Digest: " + result.digest);
  console.log("   Status: " + result.effects?.status?.status);

  const willObj = result.objectChanges?.find(
    (o) => o.type === "created" && o.objectType?.includes("::will::SuiWill")
  );
  if (willObj) {
    console.log("   Will Object ID: " + willObj.objectId);
    console.log("\n🔍 View on explorer:");
    console.log("   https://suiscan.xyz/" + NETWORK + "/tx/" + result.digest);
    console.log("   https://suiscan.xyz/" + NETWORK + "/object/" + willObj.objectId);
  }

  console.log("\n🌊 Walrus Blob:");
  console.log("   https://aggregator.walrus-testnet.walrus.space/v1/blobs/" + blobId);
}

main().catch(console.error);
