"use client"

import Image from "next/image"
import Link from "next/link"
import { Keyboard } from "lucide-react"
import { useAccount, useConnect, useDisconnect } from "wagmi"
import { Button } from "#/components/ui/button"
import { truncateAddress } from "#/lib/format"

export function Header() {
	const { address, isConnected, chain } = useAccount()
	const { connectors, connect, isPending } = useConnect()
	const { disconnect } = useDisconnect()

	return (
		<header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			<div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
				<div className="flex items-center gap-6">
					<Link href="/" className="flex items-center gap-2">
						<Image
							src="/logo.svg"
							alt="VeilSwap"
							width={24}
							height={24}
							className="h-6 w-auto"
						/>
						<span className="font-semibold tracking-tight italic">VeilSwap</span>
					</Link>
					<nav className="flex items-center gap-1">
						<Link
							href="/"
							className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							Swap
						</Link>
						<Link
							href="/lp"
							className="rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							LPs
						</Link>
					</nav>
				</div>

				<div className="flex items-center gap-3">
					{/* Keyboard hint - command palette style */}
					<div className="hidden items-center gap-1.5 text-xs text-muted-foreground/50 sm:flex">
						<Keyboard className="h-3 w-3" />
						<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
							⌘K
						</kbd>
					</div>

					{isConnected ? (
						<>
							{chain && (
								<span className="rounded-md bg-brand/10 px-2.5 py-1 text-xs font-medium text-brand">
									{chain.name}
								</span>
							)}
							<Button
								variant="outline"
								size="sm"
								onClick={() => disconnect()}
								className="font-mono text-xs"
							>
								{truncateAddress(address!)}
							</Button>
						</>
					) : (
						connectors.slice(0, 1).map((connector) => (
							<Button
								key={connector.uid}
								size="sm"
								onClick={() => connect({ connector })}
								disabled={isPending}
								className="bg-brand text-brand-foreground hover:bg-brand/90"
							>
								{isPending ? "Connecting..." : "Connect Wallet"}
							</Button>
						))
					)}
				</div>
			</div>
		</header>
	)
}
