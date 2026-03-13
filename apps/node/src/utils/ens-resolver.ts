/**
 * ENS Resolution and Registration Utilities
 * Handles Base Basenames (ENS on Base) for node identity
 */

import {
	type Address,
	createPublicClient,
	createWalletClient,
	type Hash,
	http,
	keccak256,
	namehash,
	toBytes,
	toHex,
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import { base, mainnet } from "viem/chains"

// L1 Ethereum ENS Registry
const L1_ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e" as const

// Base L2 Resolver (for address records)
const BASE_L2_RESOLVER = "0xC6d566A56A1aFf6508b41f6c90ff131615583BCD" as const

// Parent domain for node subnames
const PARENT_DOMAIN = "veilswap.eth" as const

// ENS Registry ABI (subset we need)
const ENS_REGISTRY_ABI = [
	{
		name: "setSubnodeRecord",
		type: "function",
		inputs: [
			{ name: "node", type: "bytes32" },
			{ name: "label", type: "bytes32" },
			{ name: "owner", type: "address" },
			{ name: "resolver", type: "address" },
			{ name: "ttl", type: "uint64" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		name: "owner",
		type: "function",
		inputs: [{ name: "node", type: "bytes32" }],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
	{
		name: "resolver",
		type: "function",
		inputs: [{ name: "node", type: "bytes32" }],
		outputs: [{ name: "", type: "address" }],
		stateMutability: "view",
	},
] as const

// L2 Resolver ABI (subset we need)
const L2_RESOLVER_ABI = [
	{
		name: "setAddr",
		type: "function",
		inputs: [
			{ name: "node", type: "bytes32" },
			{ name: "coinType", type: "uint256" },
			{ name: "a", type: "bytes" },
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		name: "addr",
		type: "function",
		inputs: [
			{ name: "node", type: "bytes32" },
			{ name: "coinType", type: "uint256" },
		],
		outputs: [{ name: "", type: "bytes" }],
		stateMutability: "view",
	},
] as const

/**
 * ENS configuration for registration
 */
export interface ENSConfig {
	l1RpcUrl: string
	baseRpcUrl: string
	ownerPrivateKey?: Hash
	disableRegistration?: boolean
}

/**
 * ENS registration result
 */
export interface ENSRegistrationResult {
	success: boolean
	ensName?: string
	l1TxHash?: Hash
	baseTxHash?: Hash
	error?: string
}

/**
 * Generate node subname from index
 * @param nodeIndex - Node index (0, 1, 2, ...)
 * @returns Full ENS name like "node0.veilswap.eth"
 */
export function generateNodeSubname(nodeIndex: number): string {
	return `node${nodeIndex}.${PARENT_DOMAIN}`
}

/**
 * Compute label hash for ENS subnode
 */
function labelhash(label: string): Hash {
	return keccak256(toBytes(label))
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Retry a function with exponential backoff
 */
async function withRetry<T>(
	fn: () => Promise<T>,
	maxAttempts: number = 3,
	baseDelayMs: number = 1000,
): Promise<T> {
	let lastError: Error | undefined

	for (let attempt = 1; attempt <= maxAttempts; attempt++) {
		try {
			return await fn()
		} catch (error) {
			lastError = error as Error
			if (attempt < maxAttempts) {
				const delay = baseDelayMs * 2 ** (attempt - 1)
				console.log(`  Attempt ${attempt} failed, retrying in ${delay}ms...`)
				await sleep(delay)
			}
		}
	}

	throw lastError
}

/**
 * Resolve an address to its ENS name on Base
 * @param address - Ethereum address to look up
 * @param rpcUrl - Base RPC URL
 * @returns ENS name or null if not found
 */
export async function resolveAddressToName(
	address: Address,
	rpcUrl: string,
): Promise<string | null> {
	try {
		const client = createPublicClient({
			chain: base,
			transport: http(rpcUrl),
		})

		const name = await client.getEnsName({
			address,
			universalResolverAddress: BASE_L2_RESOLVER,
		})

		return name
	} catch (error) {
		console.warn(`Failed to resolve address ${address} to ENS name:`, error)
		return null
	}
}

/**
 * Resolve an ENS name to its address on Base
 * @param ensName - ENS name to look up
 * @param rpcUrl - Base RPC URL
 * @returns Address or null if not found
 */
export async function resolveNameToAddress(
	ensName: string,
	rpcUrl: string,
): Promise<Address | null> {
	try {
		const client = createPublicClient({
			chain: base,
			transport: http(rpcUrl),
		})

		const address = await client.getEnsAddress({
			name: ensName,
			universalResolverAddress: BASE_L2_RESOLVER,
		})

		return address
	} catch (error) {
		console.warn(`Failed to resolve ENS name ${ensName} to address:`, error)
		return null
	}
}

/**
 * Check if a subname is already registered
 * @param ensName - Full ENS name to check
 * @param l1RpcUrl - L1 Ethereum RPC URL
 * @returns true if the name has an owner
 */
export async function isSubnameRegistered(
	ensName: string,
	l1RpcUrl: string,
): Promise<boolean> {
	try {
		const client = createPublicClient({
			chain: mainnet,
			transport: http(l1RpcUrl),
		})

		const node = namehash(ensName)
		const owner = await (client.readContract as any)({
			address: L1_ENS_REGISTRY,
			abi: ENS_REGISTRY_ABI,
			functionName: "owner",
			args: [node],
		})

		return owner !== "0x0000000000000000000000000000000000000000"
	} catch (error) {
		console.warn(`Failed to check if ${ensName} is registered:`, error)
		return false
	}
}

/**
 * Register a subname on L1 ENS Registry
 * @param subname - Subname label (e.g., "node0" for "node0.veilswap.eth")
 * @param ownerAddress - Address to set as owner
 * @param ownerPrivateKey - Private key of the parent domain owner
 * @param l1RpcUrl - L1 Ethereum RPC URL
 * @returns Transaction hash
 */
export async function registerSubnameL1(
	subname: string,
	ownerAddress: Address,
	ownerPrivateKey: Hash,
	l1RpcUrl: string,
): Promise<Hash> {
	const account = privateKeyToAccount(ownerPrivateKey)

	const walletClient = createWalletClient({
		account,
		chain: mainnet,
		transport: http(l1RpcUrl),
	})

	const publicClient = createPublicClient({
		chain: mainnet,
		transport: http(l1RpcUrl),
	})

	const parentNode = namehash(PARENT_DOMAIN)
	const label = labelhash(subname)

	console.log(`  Creating subnode ${subname}.${PARENT_DOMAIN} on L1...`)

	const hash = await walletClient.writeContract({
		account,
		chain: mainnet,
		address: L1_ENS_REGISTRY,
		abi: ENS_REGISTRY_ABI,
		functionName: "setSubnodeRecord",
		args: [
			parentNode,
			label,
			ownerAddress,
			BASE_L2_RESOLVER,
			0n, // No TTL
		],
	})

	// Wait for confirmation
	console.log(`  Waiting for L1 transaction ${hash}...`)
	await publicClient.waitForTransactionReceipt({ hash })

	return hash
}

/**
 * Set address record on Base L2 Resolver
 * @param ensName - Full ENS name
 * @param targetAddress - Address to resolve to
 * @param ownerPrivateKey - Private key of the name owner
 * @param baseRpcUrl - Base RPC URL
 * @returns Transaction hash
 */
export async function setAddressRecordBase(
	ensName: string,
	targetAddress: Address,
	ownerPrivateKey: Hash,
	baseRpcUrl: string,
): Promise<Hash> {
	const account = privateKeyToAccount(ownerPrivateKey)

	const walletClient = createWalletClient({
		account,
		chain: base,
		transport: http(baseRpcUrl),
	})

	const publicClient = createPublicClient({
		chain: base,
		transport: http(baseRpcUrl),
	})

	const node = namehash(ensName)
	// Coin type 8453 = Base chain ID
	const coinType = 8453n
	const addressBytes = toHex(toBytes(targetAddress))

	console.log(`  Setting address record for ${ensName} on Base...`)

	const hash = await walletClient.writeContract({
		account,
		chain: base,
		address: BASE_L2_RESOLVER,
		abi: L2_RESOLVER_ABI,
		functionName: "setAddr",
		args: [node, coinType, addressBytes],
	})

	// Wait for confirmation
	console.log(`  Waiting for Base transaction ${hash}...`)
	await publicClient.waitForTransactionReceipt({ hash })

	return hash
}

/**
 * Find an available node subname
 * If node{x} is taken, try node{x}-2, node{x}-3, etc.
 * @param nodeIndex - Starting node index
 * @param l1RpcUrl - L1 Ethereum RPC URL
 * @returns Available subname label and full ENS name
 */
export async function findAvailableSubname(
	nodeIndex: number,
	l1RpcUrl: string,
): Promise<{ label: string; fullName: string }> {
	const baseLabel = `node${nodeIndex}`
	let label = baseLabel
	let suffix = 1

	while (await isSubnameRegistered(`${label}.${PARENT_DOMAIN}`, l1RpcUrl)) {
		suffix++
		label = `${baseLabel}-${suffix}`
		console.log(`  ${baseLabel} taken, trying ${label}...`)

		// Safety limit
		if (suffix > 100) {
			throw new Error(
				`Could not find available subname after ${suffix} attempts`,
			)
		}
	}

	return {
		label,
		fullName: `${label}.${PARENT_DOMAIN}`,
	}
}

/**
 * Register a node with ENS
 * Performs two-step registration:
 * 1. Create subnode on L1 ENS
 * 2. Set address record on Base L2Resolver
 *
 * @param nodeIndex - Node index for naming
 * @param nodeAddress - Node's blockchain address
 * @param config - ENS configuration
 * @returns Registration result
 */
export async function registerNodeENS(
	nodeIndex: number,
	nodeAddress: Address,
	config: ENSConfig,
): Promise<ENSRegistrationResult> {
	// Check if registration is disabled
	if (config.disableRegistration) {
		console.log("ENS registration is disabled")
		return { success: false, error: "Registration disabled" }
	}

	// Check if owner key is provided
	if (!config.ownerPrivateKey) {
		console.log("No ENS owner key provided, skipping registration")
		return { success: false, error: "No owner key provided" }
	}

	try {
		// Find available subname
		console.log(`Finding available ENS subname for node ${nodeIndex}...`)
		const { label, fullName } = await findAvailableSubname(
			nodeIndex,
			config.l1RpcUrl,
		)

		// Step 1: Register subnode on L1 with retry
		console.log(`Registering ${fullName} on L1 ENS...`)
		const l1TxHash = await withRetry(
			() =>
				registerSubnameL1(
					label,
					nodeAddress,
					config.ownerPrivateKey!,
					config.l1RpcUrl,
				),
			3,
			2000,
		)

		// Step 2: Set address record on Base with retry
		console.log(`Setting address record for ${fullName} on Base...`)
		const baseTxHash = await withRetry(
			() =>
				setAddressRecordBase(
					fullName,
					nodeAddress,
					config.ownerPrivateKey!,
					config.baseRpcUrl,
				),
			3,
			2000,
		)

		console.log(`ENS registration complete: ${fullName}`)

		return {
			success: true,
			ensName: fullName,
			l1TxHash,
			baseTxHash,
		}
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error)
		console.error(`ENS registration failed: ${errorMessage}`)

		return {
			success: false,
			error: errorMessage,
		}
	}
}

/**
 * Check if a node already has an ENS name resolved
 * @param address - Node's blockchain address
 * @param baseRpcUrl - Base RPC URL
 * @returns ENS name if found, null otherwise
 */
export async function checkExistingENSName(
	address: Address,
	baseRpcUrl: string,
): Promise<string | null> {
	try {
		const name = await resolveAddressToName(address, baseRpcUrl)
		if (name && name.endsWith(`.${PARENT_DOMAIN}`)) {
			return name
		}
		return null
	} catch {
		return null
	}
}
