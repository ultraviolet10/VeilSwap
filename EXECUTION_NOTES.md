## Execution Notes (Base Sepolia)

This documents the most recent execution flow to verify Uniswap v4 swaps with
the custom `TKA/TKB` pool on Base Sepolia, using the existing MPC nodes.

### Environment
- Chain: Base Sepolia (chain id `84532`)
- Settlement: `0x93e571b6F1A1F5dBBb5863335Bc4fB3348B93369`
- Node wallets:
  - `node0.veil`: `0xC67ef54A950320D1F226a225DFffD467E7991a1E`
  - `node1.veil`: `0xE94Aed964d9579E5decf8491B3525CADD3f49919`
  - `node2.veil`: `0x6dbE29E1bbe6b5f0CC4B324cb09e0DFC5377445e`
- Token A (TKA): `0x05b62c612f89df3ae745e1148fd083bd9b2aa7bb`
- Token B (TKB): `0x5f527bfd17429ea6890bfde4ad5c85c857c32538`
- Uniswap v4 params:
  - Fee: `3000`
  - Tick spacing: `60`
  - Hooks: `0x0000000000000000000000000000000000000000`

### Key Transactions
- Pool + liquidity tx: `0x8dc534573a8f99e6abb8ee35284f23f300f2634061b7350ab78f0d5a8eefce59`
- Latest intent (small, swap‑forcing):
  - Create intent: `0x9a91be71dde35b61a8b8abe9356b143ae369dddd0c70df6d9310269a2ade2f79`
  - Intent id: `0x91b28f45411e60fb07b7c972a4a8f2a4194d3927cb68db9aee9f75eb88844525`
- Settlement‑completing intent (lower minAmountOut):
  - Create intent: `0xc272c7dbf7e7c40e8dfc35985eabad07520578c2f9ce78e4794069beaee5c6db`
  - Intent id: `0x9f6dfc87fcea9297948d691ecc23e24132da25edbee9a6e7948c1325e6f0a474`
  - Settlement tx: `0xa411b1f49815151f8122a6ac4d51baeeb31a26064a772dfb71f804099a48952c`
 - Latest intent (buffered per-node swap, settled):
   - Create intent: `0x13048483c5ad939b84b6cdb667e67d0bc55cc6b80f20fc652aeab8d60dd4785c`
   - Intent id: `0x8c7f65f17c5bf16da380c0267734a39e1becacc9d5330062ca88546fd0b24fa2`
   - Settlement tx: `0x95f4df8defe0386042228285dc02066f4337c8c63775449c102abbe992c3adf8`

### What Was Done
1. **Verified v4 pool params from the pool/LP tx** and set:
   `UNISWAP_V4_FEE=3000`, `UNISWAP_V4_TICK_SPACING=60`, `UNISWAP_V4_HOOKS=0x0`.
2. **Registered nodes** against the Settlement contract and ensured each node had
   persistent wallets from `~/.mpc-node/wallets/*.json`.
3. **Funded nodes with TKA** and **cleared TKB balances** (sent any residual TKB
   back to the deployer) so swaps are forced.
4. **Restarted all three nodes** to clear in‑memory capacity cache.
5. **Created a small TKA → TKB intent** with `amountIn=1e18` and
   `minAmountOut=3e15` to force the nodes to attempt v4 swaps for TKB.

### Swap Evidence (Uniswap v4)
For node0 (similar behavior for node1/node2), the swap executed through the
Universal Router and emitted ERC20 transfers:

- Swap tx (node0): `0x4afa9c8633f23816b2fa74dea7e5a60a62ced2eb6f27ed601857019c2ccdb06d`
- On‑chain transfers show:
  - **TKA in** to PoolManager: `0x0003bdd7cc9a9de9` (≈ `1.053e15`)
  - **TKB out** to node0: `0x000388220de6afe3` (≈ `9.941e14`)
- Confirmed node0 TKB balance after swap:
  - `balanceOf(node0) = 994104773619683` (≈ `0.000994 TKB`)

### Post‑Fix Verification
After updating swap accounting (receipt log parsing + inventory fallback) and
restarting the nodes with cleared TKB balances, each node reported non‑zero
`Got` and `New balance`, and MPC used the on‑chain balances for capacity.

- Node0 swap tx: `0x0d7809656c2afc153b59653bc8650b18fe5f6c51a36a110a022aea284f977eea`
  - `Got: 994086602133673`, `New balance: 994086602133673`
  - Capacity set: `994086602133673`
- Node1 swap tx: `0x47a54cdd501ab5b52f20545b66b42a574551c8c7e18fee52ccd49e2aabcc21eb`
  - `Got: 994068431145899`, `New balance: 994068431145899`
  - Capacity set: `994068431145899`
- Node2 swap tx: `0x4435e4fc777f2fe58ba2e1e3542a9ef764f7f653b151c1bbbce5a4f65d2e9905`
  - `Got: 994050260656344`, `New balance: 994050260656344`
  - Capacity set: `994050260656344`

### Latest Run (Buffered Swap + Settlement)
This run explicitly allowed small slippage by buffering per‑node swap targets
and topping up when partial balances existed.

- Intent parameters:
  - `amountIn=1e18` (TKA)
  - `minAmountOut=9e11` (TKB)
- Per‑node target calculation:
  - Base per‑node requirement: `ceil(9e11 / 3) = 300000000000`
  - Buffer: `+2%` => `306000000000` target per node
- Swap transactions (Uniswap v4):
  - Node0 swap tx: `0x64d85d2a252ebf7239302b2d46fe09271218a2db421747b9ad8cae06a4a7b07b`
    - `Got: 7800594408`, `New balance: 305951624914`
  - Node1 swap tx: `0xa43deac19bb2702a2d54be0f55febfe0dc4a78a95e9e7ce80714cda49d542430`
    - `Got: 7800592785`, `New balance: 305951624926`
  - Node2 swap tx: `0x87d155d3da8aef91644d30c2237a70139c24ae589091008fcbdcf9438268eac3`
    - `Got: 7800596034`, `New balance: 305951624905`
- MPC capacity + settlement:
  - `Reconstructed total capacity: 917854874745`
  - `Order size: 900000000000`
  - `Sufficient capacity: true`
  - Settlement tx: `0x95f4df8defe0386042228285dc02066f4337c8c63775449c102abbe992c3adf8`

### Observations
- The swap transaction **succeeds on‑chain** and the node logs now reflect the
  non‑zero `amountOut` and updated balances immediately after the swap.
- MPC still does not settle the intent because `minAmountOut=3e15` is slightly
  higher than total available capacity (`≈2.982e15`). Lowering `minAmountOut`
  below total capacity would allow settlement to complete.
 - With buffered per‑node swap targets and a top‑up when balances are below the
   target, small slippage is tolerated and settlement completes.

### Commands Used
Set env vars (use your own private key):
```bash
export PRIVATE_KEY="<DEPLOYER_PRIVATE_KEY>"
export RPC_URL="https://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
export WS_RPC_URL="wss://base-sepolia.g.alchemy.com/v2/YOUR_API_KEY"
export SETTLEMENT_ADDRESS="0x93e571b6F1A1F5dBBb5863335Bc4fB3348B93369"
```

Run the three nodes (from `packages/node`):
```bash
NODE_NAME=node0.veil PEERS=node1.veil,node2.veil RPC_URL="$RPC_URL" WS_RPC_URL="$WS_RPC_URL" CHAIN_ID=84532 SETTLEMENT_ADDRESS="$SETTLEMENT_ADDRESS" UNISWAP_V4_FEE=3000 UNISWAP_V4_TICK_SPACING=60 UNISWAP_V4_HOOKS=0x0000000000000000000000000000000000000000 pnpm exec tsx src/index.ts
NODE_NAME=node1.veil PEERS=node0.veil,node2.veil RPC_URL="$RPC_URL" WS_RPC_URL="$WS_RPC_URL" CHAIN_ID=84532 SETTLEMENT_ADDRESS="$SETTLEMENT_ADDRESS" UNISWAP_V4_FEE=3000 UNISWAP_V4_TICK_SPACING=60 UNISWAP_V4_HOOKS=0x0000000000000000000000000000000000000000 pnpm exec tsx src/index.ts
NODE_NAME=node2.veil PEERS=node0.veil,node1.veil RPC_URL="$RPC_URL" WS_RPC_URL="$WS_RPC_URL" CHAIN_ID=84532 SETTLEMENT_ADDRESS="$SETTLEMENT_ADDRESS" UNISWAP_V4_FEE=3000 UNISWAP_V4_TICK_SPACING=60 UNISWAP_V4_HOOKS=0x0000000000000000000000000000000000000000 pnpm exec tsx src/index.ts
```

Create the intent (TKA → TKB):
```bash
cast send "$SETTLEMENT_ADDRESS" "createIntent(address,address,uint256,uint256,uint256)" \
  0x05b62c612f89df3ae745e1148fd083bd9b2aa7bb \
  0x5f527bfd17429ea6890bfde4ad5c85c857c32538 \
  1000000000000000000 \
  900000000000 \
  $(($(date +%s)+3600)) \
  --private-key "$PRIVATE_KEY" \
  --rpc-url "$RPC_URL"
```
