"use client"

import { TokenSelector } from "#/components/swap/token-selector"
import { Input } from "#/components/ui/input"
import { cn } from "#/lib/utils"
import { formatTokenAmount } from "#/lib/format"
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
				"flex items-center gap-4 border-b px-4 py-4 transition-colors cursor-text",
				!disabled && "hover:bg-muted/30",
				disabled && "opacity-60"
			)}
		>
			<div
				className={cn(
					"flex h-10 w-10 items-center justify-center rounded-lg text-lg",
					highlight ? "bg-brand/10 text-brand" : "bg-muted"
				)}
			>
				{selectedToken?.icon || "?"}
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
							highlight && "text-brand"
						)}
					/>
					<TokenSelector
						tokens={tokens}
						selected={selectedToken}
						onSelect={onSelectToken}
						disabled={disabled}
					/>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5">
					{label}
					{selectedToken && balance !== undefined && (
						<>
							{" · "}
							<button
								type="button"
								className="hover:text-foreground transition-colors"
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
