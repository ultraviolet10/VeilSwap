# ENS Integration for Node Wallet Setup

## Overview
Add Base Basenames (ENS on Base mainnet) resolution/registration to wallet creation. Nodes get human-readable names like `node0.veilswap.eth`.

## Prerequisites
**Parent domain `veilswap.eth` must be registered on Base first.**
- Register via [base.org/names](https://www.base.org/names) or programmatically
- Cost: ~0.001 ETH/year (5-9 char name)
- Owner wallet private key needed for subname creation

## Naming Format
`node{x}.veilswap.eth` where x = node index (0, 1, 2, ...)

## Flow
```
getOrCreateWallet()
  └─> Create/load wallet (existing)
  └─> NEW: Check ENS resolution on Base
       ├─> Name exists? → Store in wallet.json, done
       └─> No name? (auto-registration enabled by default)
            └─> Register subname under veilswap.eth
            └─> Set address record for UI resolution
```

## Implementation

### 1. New File: `src/utils/ens-resolver.ts`
ENS resolution + registration logic using viem:

```typescript
// L1 Ethereum ENS contracts
const L1_ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"

// Base L2 Resolver (for address records)
const BASE_L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD"

// Functions:
- resolveAddressToName(address) → string | null
- resolveNameToAddress(ensName) → Address | null
- registerSubnameL1(subname, address, parentOwnerKey) → txHash (L1)
- setAddressRecordBase(ensName, address) → txHash (Base)
- generateNodeSubname(nodeIndex) → "node{x}.veilswap.eth"
```

**Two-step registration:**
1. Create subnode on L1 ENS (requires L1 gas)
2. Set Base address record on L2Resolver (requires Base gas)

### 2. Modify: `src/utils/wallet.ts`
- Extend `WalletInfo` interface:
  ```typescript
  ensName?: string
  ensRegisteredAt?: string
  ensChainId?: number
  ```
- Make `getOrCreateWallet()` async
- Add ENS resolution/registration after wallet creation
- Update `displayWalletInfo()` to show ENS name

### 3. Modify: `src/config.ts`
- Add ENS config loading from env vars:
  ```
  L1_RPC_URL (required - Ethereum mainnet for subnode creation)
  BASE_MAINNET_RPC_URL (required - Base for address records)
  VEILSWAP_ENS_OWNER_KEY (required - parent domain owner private key)
  DISABLE_ENS_REGISTRATION (optional - set true to skip)
  ```
- Make `loadConfig()` async (wallet creation becomes async)
- Auto-register by default when owner key is provided

### 4. Modify: `src/index.ts`
- Handle async `loadConfig()`

## Contract Interactions

**Check name exists:**
```typescript
const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) })
const name = await publicClient.getEnsName({ address })
```

**Register subname (parent owner only):**
```typescript
// 1. Create subnode
await walletClient.writeContract({
  address: BASE_ENS_REGISTRY,
  abi: parseAbi(["function setSubnodeRecord(bytes32,bytes32,address,address,uint64)"]),
  functionName: "setSubnodeRecord",
  args: [parentNode, labelHash, ownerAddress, resolverAddress, 0n]
})

// 2. Set address record for resolution
await walletClient.writeContract({
  address: BASE_L2_RESOLVER,
  abi: parseAbi(["function setAddr(bytes32,uint256,bytes)"]),
  functionName: "setAddr",
  args: [fullNode, 8453n, addressBytes]
})
```

## Error Handling
- Resolution fails → log warning, continue without ENS
- Registration fails → retry 3x with backoff, then continue without ENS
- Name taken → append suffix (e.g., `node0-2.veilswap.eth`)
- Node operates normally if ENS ops fail (graceful degradation)

## Files to Modify
| File | Change |
|------|--------|
| `src/utils/ens-resolver.ts` | **NEW** - resolution/registration logic |
| `src/utils/wallet.ts` | Extend WalletInfo, async getOrCreateWallet |
| `src/config.ts` | ENS config loading, async loadConfig |
| `src/index.ts` | Handle async config |
| `.env.example` | Add ENS env vars |

## Verification
1. **Pre-req**: Register `veilswap.eth` on Base via base.org/names
2. Start node with `BASE_MAINNET_RPC_URL` + `VEILSWAP_ENS_OWNER_KEY` → should auto-register `node0.veilswap.eth`
3. Check logs show: "ENS name registered: node0.veilswap.eth"
4. Restart node → should load ENS name from wallet.json (no re-registration)
5. Start second node → should register `node1.veilswap.eth`
6. Verify resolution: `cast ens-resolve node0.veilswap.eth --rpc-url https://mainnet.base.org`
7. Start without owner key → should skip registration, log warning

## Dependencies
None new - viem already has ENS support built-in.

## First-Time Setup (One-time) - DEFERRED
> **Note**: Domain registration deferred. Code assumes `veilswap.eth` is already registered and owner key is available.

**When ready to set up:**
1. Register `veilswap.eth` on L1 Ethereum (~$5/year) via [app.ens.domains](https://app.ens.domains)
2. Fund owner wallet with ETH on L1 (for subnode creation) + Base (for address records)
3. Set `VEILSWAP_ENS_OWNER_KEY` env var

**Architecture**:
- Subnode records created on L1 ENS registry (gas only, no ENS fee)
- Address records set on Base L2Resolver
- Resolution via CCIP-Read gateway (automatic with modern ENS)
