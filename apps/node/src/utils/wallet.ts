/**
 * Wallet Management Utilities
 * Auto-generates and persists wallets for each node
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"
import type { Address, Hash } from "viem"
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts"
import {
	checkExistingENSName,
	type ENSConfig,
	registerNodeENS,
} from "./ens-resolver.js"

/**
 * Wallet information
 */
export interface WalletInfo {
	address: Address
	privateKey: Hash
	nodeName: string
	ensName?: string
	ensRegisteredAt?: string
	ensChainId?: number
}

/**
 * Get the wallet directory path
 */
function getWalletDir(): string {
	const dir = join(homedir(), ".mpc-node", "wallets")
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true })
	}
	return dir
}

/**
 * Get wallet file path for a node
 */
function getWalletPath(nodeName: string): string {
	// Sanitize node name for filename
	const safeName = nodeName.replace(/[^a-zA-Z0-9.-]/g, "_")
	return join(getWalletDir(), `${safeName}.json`)
}

/**
 * Generate a new wallet for a node
 */
export function generateWallet(nodeName: string): WalletInfo {
	const privateKey = generatePrivateKey()
	const account = privateKeyToAccount(privateKey)

	const wallet: WalletInfo = {
		address: account.address,
		privateKey,
		nodeName,
	}

	return wallet
}

/**
 * Save wallet to disk
 */
function saveWallet(wallet: WalletInfo): void {
	const walletPath = getWalletPath(wallet.nodeName)
	const data = JSON.stringify(
		{
			address: wallet.address,
			privateKey: wallet.privateKey,
			nodeName: wallet.nodeName,
			ensName: wallet.ensName,
			ensRegisteredAt: wallet.ensRegisteredAt,
			ensChainId: wallet.ensChainId,
			createdAt: new Date().toISOString(),
		},
		null,
		2,
	)

	writeFileSync(walletPath, data, { mode: 0o600 }) // Owner read/write only
	console.log(`Wallet saved to: ${walletPath}`)
}

/**
 * Load wallet from disk
 */
function loadWallet(nodeName: string): WalletInfo | null {
	const walletPath = getWalletPath(nodeName)

	if (!existsSync(walletPath)) {
		return null
	}

	try {
		const data = readFileSync(walletPath, "utf-8")
		const parsed = JSON.parse(data)

		return {
			address: parsed.address,
			privateKey: parsed.privateKey,
			nodeName: parsed.nodeName,
			ensName: parsed.ensName,
			ensRegisteredAt: parsed.ensRegisteredAt,
			ensChainId: parsed.ensChainId,
		}
	} catch (error) {
		console.error(`Error loading wallet from ${walletPath}:`, error)
		return null
	}
}

/**
 * Options for wallet creation with ENS support
 */
export interface WalletOptions {
	privateKey?: Hash
	nodeIndex?: number
	ensConfig?: ENSConfig
}

/**
 * Get or create wallet for a node
 * If a private key is provided, use it. Otherwise, load from disk or generate new.
 * Optionally registers ENS name on Base if ensConfig is provided.
 */
export async function getOrCreateWallet(
	nodeName: string,
	options: WalletOptions = {},
): Promise<WalletInfo> {
	const { privateKey, nodeIndex, ensConfig } = options

	// If private key provided, use it
	if (privateKey) {
		const account = privateKeyToAccount(privateKey)
		console.log(`Using provided private key for ${nodeName}`)
		return {
			address: account.address,
			privateKey,
			nodeName,
		}
	}

	// Try to load existing wallet
	const existingWallet = loadWallet(nodeName)
	if (existingWallet) {
		console.log(`Loaded existing wallet for ${nodeName}`)

		// If wallet has ENS name, we're done
		if (existingWallet.ensName) {
			console.log(`ENS name: ${existingWallet.ensName}`)
			return existingWallet
		}

		// If ENS config provided and no ENS name yet, try to resolve or register
		if (ensConfig && nodeIndex !== undefined) {
			const updatedWallet = await resolveOrRegisterENS(
				existingWallet,
				nodeIndex,
				ensConfig,
			)
			return updatedWallet
		}

		return existingWallet
	}

	// Generate new wallet
	console.log(`Generating new wallet for ${nodeName}`)
	let newWallet = generateWallet(nodeName)
	saveWallet(newWallet)

	// If ENS config provided, try to register
	if (ensConfig && nodeIndex !== undefined) {
		newWallet = await resolveOrRegisterENS(newWallet, nodeIndex, ensConfig)
	}

	return newWallet
}

/**
 * Resolve existing ENS name or register a new one
 */
async function resolveOrRegisterENS(
	wallet: WalletInfo,
	nodeIndex: number,
	ensConfig: ENSConfig,
): Promise<WalletInfo> {
	// First check if address already has an ENS name
	console.log(`Checking for existing ENS name for ${wallet.address}...`)
	const existingName = await checkExistingENSName(
		wallet.address,
		ensConfig.baseRpcUrl,
	)

	if (existingName) {
		console.log(`Found existing ENS name: ${existingName}`)
		wallet.ensName = existingName
		wallet.ensChainId = 8453 // Base chain ID
		saveWallet(wallet)
		return wallet
	}

	// No existing name, try to register
	console.log(`No existing ENS name found, attempting registration...`)
	const result = await registerNodeENS(nodeIndex, wallet.address, ensConfig)

	if (result.success && result.ensName) {
		console.log(`ENS name registered: ${result.ensName}`)
		wallet.ensName = result.ensName
		wallet.ensRegisteredAt = new Date().toISOString()
		wallet.ensChainId = 8453 // Base chain ID
		saveWallet(wallet)
	} else if (result.error) {
		console.warn(`ENS registration failed: ${result.error}`)
		console.warn("Node will continue without ENS name")
	}

	return wallet
}

/**
 * Display wallet information
 */
export function displayWalletInfo(wallet: WalletInfo): void {
	console.log(
		"\n╔═══════════════════════════════════════════════════════════════╗",
	)
	console.log(
		"║                       WALLET INFORMATION                      ║",
	)
	console.log(
		"╠═══════════════════════════════════════════════════════════════╣",
	)
	console.log(`║ Node Name:     ${wallet.nodeName.padEnd(44)}║`)
	console.log(`║ Address:       ${wallet.address.padEnd(44)}║`)
	if (wallet.ensName) {
		console.log(`║ ENS Name:      ${wallet.ensName.padEnd(44)}║`)
	}
	console.log(
		`║ Private Key:   ${wallet.privateKey.substring(0, 20)}...${wallet.privateKey.slice(-20).padEnd(24)}║`,
	)
	console.log(
		"╚═══════════════════════════════════════════════════════════════╝\n",
	)
	console.log(
		"Keep your private key secure! Anyone with access can control your funds.\n",
	)
}
