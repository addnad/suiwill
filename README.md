# SuiWill — Onchain Dead Man's Switch on Sui

> Built for Sui Overflow 2026 · Agentic Web + Walrus tracks

SuiWill is a trustless digital estate vault on Sui. If you stop signing transactions, your will executes automatically — distributing your onchain assets to your beneficiaries and unlocking your final message stored on Walrus. No lawyers. No intermediaries. No trust required.

---

## Live Demo

- **Contract (Sui Testnet):** `0xbf03c8995a9e571b96815206bb6654aa43281db2347dc93813f33647f6f0ddba`
- **Example Will:** https://suiscan.xyz/testnet/object/0xc0a6f9d2a153e99081c01d68de481aac14be8b75cb53480b1e49396613ca02ec
- **Example Tx:** https://suiscan.xyz/testnet/tx/CjGJTTtFJJni2A7KW5nd7iahqQNVurDDQ8bVxTuG5TXU

---

## How It Works

```
1. CONFIGURE  — Connect wallet. Set beneficiaries + percentage splits.
2. VAULT      — Write a final message. Uploaded to Walrus as a verifiable blob.
3. DEPLOY     — SuiWill Move contract deployed onchain. Blob ID anchored in contract.
4. HEARTBEAT  — Any signed Sui transaction resets your inactivity clock.
5. TRIGGER    — VIGIL watcher agent detects inactivity. Calls trigger_grace().
6. GRACE      — 7-day grace period. Cancel anytime with a single signed tx.
7. EXECUTE    — Assets distributed atomically to beneficiaries. Message unlocked.
```

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
|  /create form    |  to will config   |  heartbeat()      |
|  /will/[id]      |  auto-fill form   |  trigger_grace()  |
|                  |                   |  cancel_grace()   |
+------------------+-------------------+  execute_will()   |
|   STORAGE LAYER                      |                   |
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

- **Agentic Web** — VIGIL AI agent parses natural language will configuration using Claude Sonnet via OpenRouter. The watcher agent autonomously monitors all SuiWill contracts and triggers grace periods on inactivity.
- **Walrus** — Final messages are stored as verifiable blobs on Walrus. The blob ID is permanently anchored in the Move contract. Messages are immutable, censorship-resistant, and only readable after will execution.

---

## Contract

**Package ID:** `0xbf03c8995a9e571b96815206bb6654aa43281db2347dc93813f33647f6f0ddba`  
**Network:** Sui Testnet  
**Module:** `will`

### Key Functions

| Function | Description |
|---|---|
| `create_will` | Deploy a new SuiWill shared object |
| `heartbeat` | Reset inactivity clock (owner only) |
| `trigger_grace` | Trigger 7-day grace period (anyone, after timeout) |
| `cancel_grace` | Cancel grace period (owner only) |
| `execute_will` | Distribute assets to beneficiaries (anyone, after grace) |

---

## Running Locally

### Prerequisites
- Node.js 18+
- pnpm
- Sui CLI

### Frontend

```bash
git clone https://github.com/your-handle/suiwill
cd suiwill
pnpm install
```

Create `.env.local`:
```
NEXT_PUBLIC_SUIWILL_PACKAGE_ID=0xbf03c8995a9e571b96815206bb6654aa43281db2347dc93813f33647f6f0ddba
NEXT_PUBLIC_SUIWILL_NETWORK=testnet
NEXT_PUBLIC_SUI_CLOCK_ID=0x6
OPENROUTER_API_KEY=your_openrouter_key
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

The watcher uses your local Sui CLI keypair (~/.sui/sui_config/sui.keystore). Make sure it has testnet SUI for gas.

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

---

## License

MIT
