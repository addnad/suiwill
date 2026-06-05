# SuiWill — Trustless Digital Estate Vault on Sui

> Built for Sui Overflow 2026 · Agentic Web + Walrus tracks
> Also submitted to Tatum x Walrus Hackathon

SuiWill is a trustless digital estate vault on Sui blockchain. If you stop signing transactions for a configured period, your will executes automatically — distributing locked vault assets to your beneficiaries and unlocking your final message stored on Walrus. No lawyers. No intermediaries. No trust required.

---

## Live Demo

- **App:** https://suiwill.vercel.app
- **Contract (Sui Testnet):** `0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2`
- **Example Will:** https://suiscan.xyz/testnet/object/0x6320e97ab04df18cb51bc6eef312a9b4dae3abd3189dc2658a02da4cd68d75af
- **GitHub:** https://github.com/addnad/suiwill

---

## How It Works

```
1. CONFIGURE  — Connect wallet. Set beneficiaries + percentage splits.
2. VAULT      — Deposit SUI into the will vault at creation time.
3. MESSAGE    — Write a final message. Uploaded to Walrus as a verifiable blob.
4. DEPLOY     — SuiWill Move contract deployed onchain. Blob ID anchored in contract.
5. HEARTBEAT  — Any signed Sui transaction resets your inactivity clock.
6. TRIGGER    — VIGIL watcher agent detects inactivity. Calls trigger_grace().
7. GRACE      — 7-day grace period. Cancel anytime with a single signed tx.
8. EXECUTE    — Vault balance distributed atomically to beneficiaries. Message unlocked.
```

---

## How the Vault Works

When you create a SuiWill, you deposit SUI directly into the contract vault. Assets are held inside the Move object — not on any server, not in a multisig, not in a custodian.

- **Deposit at creation** — set an initial amount when deploying
- **Top up anytime** — call `deposit()` to add more SUI to the vault
- **Withdraw anytime** — call `withdraw()` to reclaim funds (only when not in grace period)
- **Close will** — call `close_will()` to return all vault funds and delete the contract object
- **Automatic distribution** — when `execute_will()` fires, vault balance splits atomically to all beneficiaries by percentage shares
- **Dust handling** — rounding remainder goes to the last beneficiary

---

## Architecture

```
+----------------------------------------------------------+
|                     SUIWILL STACK                        |
+------------------+-------------------+-------------------+
|   FRONTEND       |   AI LAYER        |   ONCHAIN         |
|                  |                   |                   |
|  Next.js 15      |  VIGIL AI Agent   |  Sui Move         |
|  @mysten/        |  Claude Sonnet    |  SuiWill object   |
|  dapp-kit        |  via OpenRouter   |  (shared object)  |
|                  |                   |                   |
|  Dashboard OS    |  Natural language |  create_will()    |
|  /create form    |  to will config   |  deposit()        |
|  /will/[id]      |  auto-fill form   |  withdraw()       |
|  /watcher        |                   |  heartbeat()      |
|  /settings       |                   |  trigger_grace()  |
|                  |                   |  cancel_grace()   |
+------------------+-------------------+  execute_will()   |
|   STORAGE LAYER                      |  close_will()     |
|                                      +-------------------+
|  Walrus Testnet                      |   WATCHER AGENT   |
|  Final message as blob               |                   |
|  Blob ID anchored onchain            |  Node.js script   |
|  Immutable + censorship resistant    |  Polls every 60s  |
|                                      |  Triggers grace   |
+--------------------------------------+-------------------+
```

---

## Tracks

- **Agentic Web** — VIGIL AI agent parses natural language will configuration using Claude Sonnet via OpenRouter. The Node.js watcher agent autonomously monitors all SuiWill contracts every 60 seconds and triggers grace periods on inactivity — no human intervention required.

- **Walrus** — Final messages are stored as verifiable blobs on Walrus. The blob ID is permanently anchored in the Move contract. Messages are immutable, censorship-resistant, and only readable after will execution.

- **Tatum** — All blockchain RPC calls are routed through Tatum's Sui Gateway for reliable, production-grade node access.

---

## Contract

**Package ID (Testnet):** `0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2`
**Network:** Sui Testnet
**Module:** `will`
**Clock Object:** `0x6`

### Key Functions

| Function | Description |
|---|---|
| `create_will` | Deploy a new SuiWill shared object with initial vault deposit |
| `deposit` | Add SUI to the vault (owner only) |
| `withdraw` | Withdraw SUI from vault (owner only, not in grace) |
| `heartbeat` | Reset inactivity clock (owner only) |
| `trigger_grace` | Trigger 7-day grace period (anyone, after timeout) |
| `cancel_grace` | Cancel grace period (owner only) |
| `execute_will` | Distribute vault balance to beneficiaries (anyone, after grace) |
| `close_will` | Return all vault funds and delete the will object (owner only) |
| `update_message` | Update Walrus blob ID (owner only) |

### SuiWill Object Structure

```move
public struct SuiWill has key {
    id: UID,
    owner: address,
    beneficiaries: VecMap<address, u64>,  // address -> basis points (out of 10000)
    last_seen_ms: u64,                     // timestamp of last heartbeat
    timeout_ms: u64,                       // inactivity timeout in milliseconds
    walrus_blob_id: vector<u8>,            // Walrus blob ID for final message
    in_grace: bool,                        // whether grace period is active
    grace_start_ms: u64,                   // when grace period started
    vault: Balance<SUI>,                   // locked SUI vault
}
```

---

## Pages

| Route | Description |
|---|---|
| `/` | Connect wallet + product description |
| `/create` | 3-step will creation: beneficiaries, timeout, message + vault deposit |
| `/will/[id]` | Will management: countdown, vault balance, heartbeat, deposit, withdraw, close |
| `/will/active` | Auto-redirects to user's active will |
| `/watcher` | VIGIL watcher agent status + all monitored wills |
| `/settings` | Wallet info, contract details, network |

---

## Running Locally

### Prerequisites
- Node.js 18+
- pnpm
- Sui CLI

### Frontend

```bash
git clone https://github.com/addnad/suiwill
cd suiwill
pnpm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUIWILL_PACKAGE_ID=0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2
NEXT_PUBLIC_TESTNET_PACKAGE_ID=0xff06e13ff081039003ddbbb7739ed5f43f75298e470f6d09452ef693adac83d2
NEXT_PUBLIC_MAINNET_PACKAGE_ID=
NEXT_PUBLIC_SUIWILL_NETWORK=testnet
NEXT_PUBLIC_SUI_CLOCK_ID=0x6
OPENROUTER_API_KEY=your_openrouter_key
TATUM_API_KEY=your_tatum_api_key
NEXT_PUBLIC_SUI_RPC_URL=https://sui-testnet.gateway.tatum.io
```

```bash
pnpm dev
```

### VIGIL Watcher Agent

```bash
cd watcher
pnpm install
node index.js
```

The watcher uses your local Sui CLI keypair at `~/.sui/sui_config/sui.keystore`. Ensure it has testnet SUI for gas.

### Move Contract

```bash
cd contracts
sui move build
sui client publish --gas-budget 100000000
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, Tailwind 4, TypeScript |
| Wallet | @mysten/dapp-kit, Sui Wallet |
| Contract | Sui Move (edition 2024) |
| Storage | Walrus Testnet |
| AI Agent | Claude Sonnet via OpenRouter |
| Watcher | Node.js + @mysten/sui v2 |
| RPC | Tatum Sui Gateway |
| Deployment | Vercel |

---

## Network Support

SuiWill supports both testnet and mainnet. The network is stored in localStorage and can be switched from the providers context. Each network has its own package ID configured via environment variables.

---

## License

MIT
