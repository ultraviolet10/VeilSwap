"use client"

import { useAccount, useConnect } from "wagmi"
import { Button } from "#/components/ui/button"
import type { IntentPhase } from "#/types/intent"

interface SwapButtonProps {
	phase: IntentPhase
	hasAmount: boolean
	hasTokens: boolean
	needsApproval: boolean
	onSwap: () => void
	disabled?: boolean
}

export function SwapButton({
	phase,
	hasAmount,
	hasTokens,
	needsApproval,
	onSwap,
	disabled = false,
}: SwapButtonProps) {
	const { isConnected } = useAccount()
	const { connectors, connect } = useConnect()

	if (!isConnected) {
		return (
			<Button
				size="sm"
				className="h-8 px-4 text-sm bg-brand text-brand-foreground hover:bg-brand/90"
				onClick={() => {
					const connector = connectors[0]
					if (connector) connect({ connector })
				}}
			>
				Connect Wallet
			</Button>
		)
	}

	if (!hasTokens) {
		return (
			<Button size="sm" className="h-8 px-4 text-sm" disabled>
				Select tokens
			</Button>
		)
	}

	if (!hasAmount) {
		return (
			<Button size="sm" className="h-8 px-4 text-sm" disabled>
				Enter amount
			</Button>
		)
	}

	const isActive = phase !== "idle" && phase !== "filled" && phase !== "failed"

	const label = (() => {
		switch (phase) {
			case "approving":
				return "Approving..."
			case "submitting":
				return "Submitting..."
			case "submitted":
			case "processing":
			case "settling":
				return "Processing..."
			default:
				return needsApproval ? "Approve & Swap" : "Swap Now"
		}
	})()

	return (
		<Button
			size="sm"
			className="h-8 px-4 text-sm bg-brand text-brand-foreground hover:bg-brand/90"
			onClick={onSwap}
			disabled={disabled || isActive}
		>
			{label}
		</Button>
	)
}
