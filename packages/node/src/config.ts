/**
 * Configuration Management
 * Loads and validates configuration from environment variables
 */

import { existsSync, readFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import { config as dotenvConfig } from "dotenv"
import type { Address, Hash } from "viem"
import type { PartyConfig } from "./types.js"
import {
	createNodeList,
	findMyNode,
	generateEnsSubname,
	type NodeInfo,
	parsePeerList,
	validateNodeName,
} from "./utils/ens.js"
import type { ENSConfig } from "./utils/ens-resolver.js"
import { getOrCreateWallet, type WalletInfo } from "./utils/wallet.js"

// Load .env file
dotenvConfig()

/**
 * Server configuration
 */
export interface Config {
	// Node identity
	nodeName: string
	partyId: number
	address: string
	port: number

	// Network configuration
	peers: PartyConfig[]
	allNodes: NodeInfo[]

	// Blockchain configuration
	rpcUrl: string
	chainId: number
	settlementAddress: Address
	privateKey: Hash

	// Wallet information
	wallet: WalletInfo

	// Capacity configuration
	initialCapacities: Map<string, bigint>

	// Uniswap configuration
	enableAutoSwap: boolean

	// ENS configuration (optional)
	ensConfig?: ENSConfig
}

/**
 * Load ENS configuration from environment variables
 */
function loadENSConfig(): ENSConfig | undefined {
	const l1RpcUrl = process.env.L1_RPC_URL
	const baseRpcUrl = process.env.BASE_MAINNET_RPC_URL
	const ownerPrivateKey = process.env.VEILSWAP_ENS_OWNER_KEY as Hash | undefined
	const disableRegistration =
		process.env.DISABLE_ENS_REGISTRATION?.toLowerCase() === "true"

	// ENS requires both L1 and Base RPC URLs
	if (!l1RpcUrl || !baseRpcUrl) {
		if (ownerPrivateKey) {
			console.warn(
				"ENS owner key provided but missing L1_RPC_URL or BASE_MAINNET_RPC_URL",
			)
		}
		return undefined
	}

	return {
		l1RpcUrl,
		baseRpcUrl,
		ownerPrivateKey,
		disableRegistration,
	}
}

/**
 * Load configuration from environment variables
 */
export async function loadConfig(): Promise<Config> {
	// Node identity - support auto-generation from base ENS
	const baseEns = process.env.BASE_ENS // e.g., "myproject.eth"
	const nodeIndex = process.env.NODE_INDEX
		? parseInt(process.env.NODE_INDEX, 10)
		: undefined

	let nodeName: string

	// If NODE_NAME provided, use it directly
	if (process.env.NODE_NAME) {
		nodeName = getEnv("NODE_NAME")
	} else if (baseEns && nodeIndex !== undefined) {
		// Auto-generate from BASE_ENS + NODE_INDEX
		nodeName = generateEnsSubname(baseEns, nodeIndex)
		console.log(`Auto-generated node name: ${nodeName}`)
	} else {
		throw new Error(
			"Either NODE_NAME or (BASE_ENS + NODE_INDEX) must be provided",
		)
	}

	validateNodeName(nodeName)

	// Parse peer list
	const peersString = getEnv("PEERS", "")
	const peerList = parsePeerList(peersString)

	// Get or set port
	const portEnv = process.env.PORT
	const port = portEnv && portEnv !== "auto" ? parseInt(portEnv, 10) : undefined // Will be auto-generated from node name

	// Create sorted node list with assigned party IDs
	const allNodes = createNodeList(nodeName, peerList, port)
	const myNode = findMyNode(allNodes, nodeName)

	// Blockchain configuration
	const rpcUrl = getEnv("RPC_URL", "http://localhost:8545")
	const chainId = getEnvNumber("CHAIN_ID", 31337)
	const settlementAddress = getEnv("SETTLEMENT_ADDRESS") as Address

	// Load ENS configuration
	const ensConfig = loadENSConfig()

	// Wallet management - auto-generate if not provided
	const privateKeyEnv = process.env.PRIVATE_KEY as Hash | undefined
	const wallet = await getOrCreateWallet(nodeName, {
		privateKey: privateKeyEnv,
		nodeIndex,
		ensConfig,
	})

	// Build peer configuration for MPC server
	const peers = buildPeerConfig(allNodes, myNode.partyId, wallet.address)

	// Initial capacities
	const initialCapacities = loadInitialCapacities()

	// Uniswap configuration
	const enableAutoSwap =
		getEnv("ENABLE_AUTO_SWAP", "true").toLowerCase() === "true"

	return {
		nodeName,
		partyId: myNode.partyId,
		address: myNode.address,
		port: myNode.port,
		peers,
		allNodes,
		rpcUrl,
		chainId,
		settlementAddress,
		privateKey: wallet.privateKey,
		wallet,
		initialCapacities,
		enableAutoSwap,
		ensConfig,
	}
}

/**
 * Build peer configuration from node list
 */
function buildPeerConfig(
	allNodes: NodeInfo[],
	myPartyId: number,
	myBlockchainAddress: Address,
): PartyConfig[] {
	return allNodes.map((node) => {
		const config: PartyConfig = {
			id: node.partyId,
			address: node.address,
			port: node.port,
		}

		// Add blockchain address
		if (node.partyId === myPartyId) {
			// Use own wallet address
			config.blockchainAddress = myBlockchainAddress
		} else {
			// For other nodes, try to load their wallet if it exists locally
			// This allows nodes running on the same machine to discover each other
			const peerWallet = loadPeerWallet(node.name)
			if (peerWallet) {
				config.blockchainAddress = peerWallet.address
				console.log(
					`📂 Loaded blockchain address for ${node.name}: ${peerWallet.address}`,
				)
			} else {
				// Will be shared via P2P handshake or set via env var
				config.blockchainAddress = process.env[
					`PEER_${node.partyId}_BLOCKCHAIN_ADDRESS`
				] as Address
			}
		}

		return config
	})
}

/**
 * Try to load a peer's wallet from the local wallet directory
 * This helps when running multiple nodes on the same machine
 */
function loadPeerWallet(nodeName: string): { address: Address } | null {
	try {
		const safeName = nodeName.replace(/[^a-zA-Z0-9.-]/g, "_")
		const walletPath = join(
			homedir(),
			".mpc-node",
			"wallets",
			`${safeName}.json`,
		)

		if (existsSync(walletPath)) {
			const data = JSON.parse(readFileSync(walletPath, "utf-8"))
			return { address: data.address }
		}
	} catch (_error) {
		// Ignore errors, wallet doesn't exist or can't be read
	}
	return null
}

/**
 * Load initial capacities
 * Expects CAPACITY_TOKEN_0, CAPACITY_AMOUNT_0, etc.
 */
function loadInitialCapacities(): Map<string, bigint> {
	const capacities = new Map<string, bigint>()

	// Try to load up to 10 token capacities
	for (let i = 0; i < 10; i++) {
		const tokenKey = `CAPACITY_TOKEN_${i}`
		const amountKey = `CAPACITY_AMOUNT_${i}`

		if (process.env[tokenKey] && process.env[amountKey]) {
			const token = process.env[tokenKey]
			const amount = BigInt(process.env[amountKey])
			// Normalize address to lowercase for case-insensitive lookups
			capacities.set(token.toLowerCase(), amount)
		}
	}

	return capacities
}

/**
 * Get required environment variable
 */
function getEnv(key: string, defaultValue?: string): string {
	const value = process.env[key]
	if (!value) {
		if (defaultValue !== undefined) {
			return defaultValue
		}
		throw new Error(`Missing required environment variable: ${key}`)
	}
	return value
}

/**
 * Get number from environment variable
 */
function getEnvNumber(key: string, defaultValue?: number): number {
	const value = process.env[key]
	if (!value) {
		if (defaultValue !== undefined) {
			return defaultValue
		}
		throw new Error(`Missing required environment variable: ${key}`)
	}
	const num = parseInt(value, 10)
	if (Number.isNaN(num)) {
		throw new Error(`Invalid number for environment variable ${key}: ${value}`)
	}
	return num
}

/**
 * Validate configuration
 */
export function validateConfig(config: Config): void {
	// Validate party ID
	if (config.partyId < 0 || config.partyId >= config.peers.length) {
		throw new Error(`Invalid party ID: ${config.partyId}`)
	}

	// Validate addresses
	if (!config.settlementAddress || !config.settlementAddress.startsWith("0x")) {
		throw new Error("Invalid settlement address")
	}

	// Validate private key
	if (!config.privateKey || !config.privateKey.startsWith("0x")) {
		throw new Error("Invalid private key")
	}

	// Validate RPC URL
	if (!config.rpcUrl) {
		throw new Error("Invalid RPC URL")
	}

	console.log("Configuration validated successfully")
}

/**
 * Print configuration (excluding sensitive data)
 */
export function printConfig(config: Config): void {
	console.log(
		"\n╔═══════════════════════════════════════════════════════════════╗",
	)
	console.log(
		"║                  MPC SERVER CONFIGURATION                     ║",
	)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(`║ Node Name:     ${config.nodeName.padEnd(44)}║`)
	console.log(`║ Party ID:      ${config.partyId.toString().padEnd(44)}║`)
	console.log(
		`║ Network:       ${`${config.address}:${config.port}`.padEnd(44)}║`,
	)
	console.log(`║ Wallet:        ${config.wallet.address.padEnd(44)}║`)
	if (config.wallet.ensName) {
		console.log(`║ ENS Name:      ${config.wallet.ensName.padEnd(44)}║`)
	}
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(
		"║ BLOCKCHAIN                                                    ║",
	)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(`║ Chain ID:      ${config.chainId.toString().padEnd(44)}║`)
	console.log(`║ RPC URL:       ${config.rpcUrl.padEnd(44)}║`)
	console.log(`║ Settlement:    ${config.settlementAddress.padEnd(44)}║`)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(
		"║ NETWORK PEERS                                                 ║",
	)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)

	for (const node of config.allNodes) {
		const isSelf = node.partyId === config.partyId
		const marker = isSelf ? " (YOU)" : ""
		const nodeStr = `Party ${node.partyId}: ${node.name}${marker}`
		console.log(`║ ${nodeStr.padEnd(61)}║`)
	}

	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(
		"║ INITIAL CAPACITIES                                            ║",
	)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)

	if (config.initialCapacities.size === 0) {
		console.log(
			"║ (none configured)                                             ║",
		)
	} else {
		for (const [token, amount] of config.initialCapacities.entries()) {
			const capacityStr = `${token.substring(0, 10)}...${token.slice(-8)}: ${amount}`
			console.log(`║ ${capacityStr.padEnd(61)}║`)
		}
	}

	console.log(
		"╚═══════════════════════════════════════════════════════════════╝\n",
	)
}
