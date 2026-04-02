# EscrowNG — Trustless P2P Escrow DApp

> Final Year Project · Fully Decentralized Automated Escrow using Solidity, IPFS & Frontend-Only Event Indexing for Nigerian Online Marketplaces

---

## The Problem

Nigerian online marketplaces (Jiji, Facebook Marketplace, WhatsApp) have a massive trust problem:
- Buyers send money → seller disappears
- Sellers ship items → buyer claims never arrived
- No recourse, no protection, no middleman

**EscrowNG solves this with a smart contract**: funds lock in Ethereum until the buyer confirms delivery. No bank. No escrow company. No trust required.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                 React Frontend (Vite)                │
│                                                      │
│  Navbar  ·  Home  ·  Marketplace  ·  Create         │
│  EscrowDetail  ·  MyEscrows  ·  WalletContext        │
│                                                      │
│  ethers.js v6 ←→ MetaMask ←→ Sepolia Testnet        │
│  Pinata SDK   ←→ IPFS Network                       │
│  queryFilter() + contract.on() — NO backend server  │
└─────────────────────────────────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐       ┌────────────────────┐
│  EscrowNG.sol   │       │  IPFS (Pinata)     │
│  Sepolia        │       │  Item images       │
│  Testnet        │       │  Metadata JSON     │
│                 │       │  (CID on-chain)    │
└─────────────────┘       └────────────────────┘
```

### What goes on-chain
- Escrow ID, seller, buyer, amount (wei), IPFS CID
- Status (Pending / Active / Completed / Refunded)
- Timestamps (createdAt, depositedAt), timeout duration

### What goes on IPFS
- Item title, description, category, location
- Item images (separate CID referenced in metadata JSON)

### Frontend-only indexing (key innovation)
No The Graph. No backend. The React app:
1. Calls `contract.queryFilter("EscrowCreated", fromBlock, "latest")` on load
2. Fetches full details for each returned escrow ID
3. Caches results in localStorage (5-minute TTL)
4. Listens for new events with `contract.on(...)` for real-time updates

---

## User Flows

### Seller
1. Connect MetaMask (Sepolia)
2. Fill Create Escrow form — title, description, image, buyer address, price, timeout
3. Image + metadata uploaded to IPFS → get CID
4. Sign `createEscrow(buyer, cid, timeout)` transaction with ETH attached
5. Share escrow link with buyer
6. Funds auto-release when buyer confirms ✓

### Buyer
1. Connect MetaMask (Sepolia)
2. Browse Marketplace OR open shared escrow link
3. Review item details fetched from IPFS
4. Click **Deposit Funds** → `deposit(escrowId)` with ETH
5. Receive item in real life
6. Click **Confirm Delivery** → `confirmDelivery(escrowId)` → funds go to seller ✓
7. If item never arrives → wait for timeout → **Claim Refund** → `claimRefund(escrowId)` ✓

---

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Blockchain  | Solidity 0.8.20 · Sepolia Testnet   |
| Dev tooling | Hardhat or Remix IDE                |
| Frontend    | React 18 + Vite 5                   |
| Web3        | ethers.js v6                        |
| Wallet      | MetaMask                            |
| Storage     | IPFS via Pinata (free tier)         |
| Fonts       | Bebas Neue · Syne · DM Mono         |
| Hosting     | IPFS + Pinata gateway / Fleek       |
| Security    | OpenZeppelin ReentrancyGuard        |

---

## Project Structure

```
escrow-dapp/
├── index.html
├── vite.config.js
├── package.json
├── .env.example
├── .gitignore
├── README.md
└── src/
    ├── main.jsx              — React entry point
    ├── App.jsx               — Router + layout
    ├── index.css             — Global neo-brutalist design system
    │
    ├── context/
    │   └── WalletContext.jsx — MetaMask state, toast system
    │
    ├── hooks/
    │   └── useEscrows.js     — Frontend event indexing (queryFilter + listeners)
    │
    ├── components/
    │   ├── Navbar.jsx        — Navigation with wallet connect
    │   └── EscrowCard.jsx    — Reusable escrow preview card
    │
    ├── pages/
    │   ├── Home.jsx          — Landing page (geometric art hero)
    │   ├── Marketplace.jsx   — Browse all recent escrows
    │   ├── CreateEscrow.jsx  — Seller creates an escrow
    │   ├── EscrowDetail.jsx  — View, deposit, confirm, refund
    │   └── MyEscrows.jsx     — Personal dashboard
    │
    └── utils/
        ├── contract.js       — ABI, address, status enums
        ├── ipfs.js           — Pinata upload/fetch helpers
        └── helpers.js        — Formatting, validation, cache
```

---

## Getting Started

### Prerequisites

- **Node.js v18+** — [nodejs.org](https://nodejs.org)
- **MetaMask** — [metamask.io](https://metamask.io)
- **Sepolia ETH** — [sepoliafaucet.com](https://sepoliafaucet.com) (free testnet ETH)
- **Pinata account** — [pinata.cloud](https://pinata.cloud) (free tier, no credit card)

### 1 — Clone and install

```bash
git clone https://github.com/yourusername/escrow-dapp.git
cd escrow-dapp
npm install
```

### 2 — Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

```env
VITE_CONTRACT_ADDRESS=0xYourDeployedContractAddressHere
VITE_PINATA_JWT=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Get Pinata JWT:**
1. Sign up at [app.pinata.cloud](https://app.pinata.cloud)
2. Go to **API Keys** → **New Key**
3. Enable `pinFileToIPFS` and `pinJSONToIPFS`
4. Copy the JWT token into `.env`

### 3 — Deploy the smart contract

#### Option A: Remix IDE (easier)
1. Open [remix.ethereum.org](https://remix.ethereum.org)
2. Create `EscrowNG.sol`, paste your contract code
3. Compile with Solidity 0.8.20
4. In Deploy tab: Environment = **Injected Provider (MetaMask)**, select Sepolia
5. Click Deploy, confirm in MetaMask
6. Copy the contract address into your `.env`

#### Option B: Hardhat
```bash
# In your contracts folder
npx hardhat compile
npx hardhat run scripts/deploy.js --network sepolia
# Copy the output address into .env
```

### 4 — Run the app

```bash
npm run dev
```

Open **http://localhost:5173** in your browser.

### 5 — Test the full flow

1. Open MetaMask → switch to **Sepolia Test Network**
2. Connect wallet on the app
3. Go to **Create Escrow** → fill in item details, set buyer address (use a second MetaMask account), set price e.g. `0.01` ETH
4. Submit → approve the two transactions (IPFS upload is automatic, then sign the contract TX)
5. Switch MetaMask to the buyer account
6. Open the escrow link → click **Deposit Funds** → confirm TX
7. Click **Confirm Delivery** → confirm TX
8. Switch back to seller → verify ETH balance increased

---

## Smart Contract Reference

### `EscrowNG.sol`

#### Functions

| Function | Caller | Description |
|----------|--------|-------------|
| `createEscrow(buyer, cid, timeout)` | Seller | Creates escrow. Seller sends ETH (msg.value = price). Stores CID. Emits `EscrowCreated`. |
| `deposit(escrowId)` | Buyer | Buyer deposits exact ETH amount. Locks funds. Emits `DepositMade`. |
| `confirmDelivery(escrowId)` | Buyer | Buyer confirms receipt. Releases ETH to seller. Emits `DeliveryConfirmed` + `FundsReleased`. |
| `claimRefund(escrowId)` | Buyer | Buyer claims refund after timeout. Emits `RefundIssued`. |
| `getEscrow(id)` | Anyone | Returns full escrow struct. |
| `escrowCount()` | Anyone | Total escrows created. |

#### Events

| Event | When emitted |
|-------|-------------|
| `EscrowCreated(id, seller, buyer, amount, cid)` | On creation |
| `DepositMade(id, buyer, amount)` | On deposit |
| `DeliveryConfirmed(id)` | On confirmation |
| `FundsReleased(id, seller, amount)` | On fund release |
| `RefundIssued(id, buyer, amount)` | On refund |

#### Status Enum
```solidity
enum Status { PENDING, ACTIVE, COMPLETED, REFUNDED }
//            0        1       2           3
```

---

## Frontend Indexing — Technical Details

This is the core technical contribution of the project. Instead of using The Graph or a centralized backend, the React app discovers escrows entirely from the blockchain:

```javascript
// 1. On app load — scan last 10,000 blocks
const latest   = await provider.getBlockNumber()
const fromBlock = Math.max(0, latest - 10000)
const filter   = contract.filters.EscrowCreated()
const events   = await contract.queryFilter(filter, fromBlock, 'latest')

// 2. For each event, fetch full escrow struct from contract
const escrows = await Promise.all(
  events.slice(-50).map(ev => contract.getEscrow(Number(ev.args.escrowId)))
)

// 3. Real-time — listen for new escrows without page refresh
contract.on('EscrowCreated', async (escrowId) => {
  const newEscrow = await contract.getEscrow(Number(escrowId))
  setList(prev => [newEscrow, ...prev])
})
```

**Known limitations (documented in project report):**
- Displays last ~50 escrows from last 10,000 blocks (~1.4 days on Sepolia)
- No full-text search or complex filtering
- Slower initial load than a centralised indexer
- Suitable for academic demo; production would use The Graph or a custom indexer

---

## Gas Analysis

| Operation | Est. Gas | At 20 gwei |
|-----------|----------|------------|
| `createEscrow` | ~185,000 | ~0.0037 ETH |
| `deposit` | ~62,000 | ~0.0012 ETH |
| `confirmDelivery` | ~55,000 | ~0.0011 ETH |
| `claimRefund` | ~50,000 | ~0.0010 ETH |

*Measured on Sepolia testnet. Mainnet may vary.*

---

## Deployment to IPFS (Frontend)

```bash
# Build the static site
npm run build

# The /dist folder is your static site
# Option A: Pin via Pinata web dashboard → upload /dist folder
# Option B: Use Fleek (https://fleek.co) — auto-deploys from GitHub to IPFS
# Option C: Pinata CLI
npx pinata-cli --upload ./dist
```

Access your site at:
- `https://gateway.pinata.cloud/ipfs/<YOUR_DIST_CID>`
- Or configure a custom domain via Fleek

---

## Security Notes

- **ReentrancyGuard** prevents re-entrancy attacks on all ETH transfers
- **Access control**: Only the designated buyer can deposit, confirm, or refund
- **Immutable terms**: Once created, escrow amount and parties cannot change
- **Non-custodial**: No admin key can touch user funds (except optional emergency pause)
- **Timeout safety**: Buyer always has a refund path if seller doesn't deliver

---

## Demo Video Outline

1. Show MetaMask on Sepolia network
2. Home page walkthrough
3. Connect wallet (Seller account)
4. Create Escrow → upload image → IPFS CID shown → sign TX → Etherscan link
5. Switch to Buyer account in MetaMask
6. Open escrow link → click Deposit → confirm TX
7. Click Confirm Delivery → confirm TX
8. Switch to Seller → show ETH balance increased
9. Show My Escrows dashboard

---

## References

- Ethereum Docs: https://ethereum.org/developers
- Solidity 0.8.20: https://docs.soliditylang.org
- OpenZeppelin: https://docs.openzeppelin.com
- ethers.js v6: https://docs.ethers.org/v6
- IPFS: https://docs.ipfs.tech
- Pinata API: https://docs.pinata.cloud
- Vite: https://vitejs.dev
- React Router: https://reactrouter.com

---

## Author

**Samuel** · Computer Science Final Year Project · 2025

*Built on Ethereum · Powered by IPFS · 100% Decentralized*