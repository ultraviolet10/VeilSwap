# VeilSwap

> [!NOTE]
> 🏆 [**HackMoney 2026**](https://ethglobal.com/showcase/veilswap-2y9sd) — Uniswap Foundation Uniswap v4 Privacy DeFi **2nd Place** · ENS Prize Pool
>
> _See also: [project write-up](https://hackmd.io/@ultraviolet1000/HyVZnGgdZl)_

Privacy-preserving intent settlement via MPC nodes, onchain Settlement contract, and a web UI.

## Monorepo Structure

- `contracts/` — Foundry smart contracts (`Settlement.sol`)
- `packages/node/` — MPC node service (TypeScript, Uniswap v4 auto-swap)
- `apps/web/` — Next.js web app (Wagmi + Viem)

## Quick Start

```bash
pnpm install
pnpm build
```

### Web App

```bash
pnpm dev
```

Open `http://localhost:3000`.

### Node (MPC)

```bash
cd packages/node
pnpm install
pnpm build
cp .env.example .env
pnpm start
```

### Contracts

```bash
cd contracts
forge build
forge test
```

## Key Concepts

- **Settlement contract** manages intents and batch settlement.
- **MPC nodes** split orders privately using replicated secret sharing.
- **Auto-swap** uses Uniswap v4 (Universal Router + Permit2).

## Environment

Use `.env` files per package.

- `packages/node/.env` for MPC nodes
- `apps/web/.env.local` for web app
- `contracts/.env` (optional) for Foundry scripts

## Further Reading

- `contracts/README.md` — contract details and scripts
- `packages/node/README.md` — MPC node setup and protocol
- `apps/web/README.md` — web app setup and dev workflow
