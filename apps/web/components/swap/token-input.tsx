"use client"

import Image from "next/image"
import { TokenSelector } from "#/components/swap/token-selector"
import { Input } from "#/components/ui/input"
import { formatTokenAmount } from "#/lib/format"
import { cn } from "#/lib/utils"
import type { Token } from "#/types/token"

interface TokenInputProps {
	label: string
	tokens: Token[]
	selectedToken: Token | null
	onSelectToken: (token: Token) => void
	amount: string
	onAmountChange?: (value: string) => void
	balance?: bigint
	readOnly?: boolean
	disabled?: boolean
	highlight?: boolean
}

export function TokenInput({
	label,
	tokens,
	selectedToken,
	onSelectToken,
	amount,
	onAmountChange,
	balance,
	readOnly = false,
	disabled = false,
	highlight = false,
}: TokenInputProps) {
	return (
		<div
			className={cn(
				"group flex items-center gap-4 border-b px-4 py-4 cursor-text",
				"transition-all duration-200 ease-out",
				!disabled && "hover:bg-muted/30",
				disabled && "opacity-60",
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 items-center justify-center rounded-lg text-lg",
					"transition-all duration-200 ease-out",
					"group-hover:scale-105",
					highlight
						? "bg-brand/10 text-brand group-hover:bg-brand/15"
						: "bg-muted group-hover:bg-muted/80",
				)}
			>
				{selectedToken?.logoURI ? (
					<Image
						src={selectedToken.logoURI}
						alt={selectedToken.symbol}
						width={24}
						height={24}
						className="rounded-full"
					/>
				) : (
					"?"
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-baseline gap-2">
					<Input
						type="text"
						inputMode="decimal"
						placeholder="0"
						value={amount}
						onChange={(e) => {
							const val = e.target.value
							if (/^[0-9]*\.?[0-9]*$/.test(val)) {
								onAmountChange?.(val)
							}
						}}
						readOnly={readOnly}
						disabled={disabled}
						className={cn(
							"border-0 bg-transparent p-0 text-2xl font-medium shadow-none focus-visible:ring-0 w-full",
							"transition-colors duration-150",
							highlight && "text-brand",
						)}
					/>
					<TokenSelector
						tokens={tokens}
						selected={selectedToken}
						onSelect={onSelectToken}
						disabled={disabled}
					/>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5 transition-colors duration-150">
					{label}
					{selectedToken && balance !== undefined && (
						<>
							{" · "}
							<button
								type="button"
								className="hover:text-foreground transition-all duration-150 hover:underline underline-offset-2"
								onClick={() => {
									if (onAmountChange && !readOnly) {
										onAmountChange(
											formatTokenAmount(
												balance,
												selectedToken.decimals,
												selectedToken.decimals,
											),
										)
									}
								}}
							>
								Balance: {formatTokenAmount(balance, selectedToken.decimals)}
								{!readOnly && " (Max)"}
							</button>
						</>
					)}
				</p>
			</div>
		</div>
	)
}
