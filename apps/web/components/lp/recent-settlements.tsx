"use client"

import { ArrowRightLeft, Clock } from "lucide-react"
import { truncateAddress } from "#/lib/format"

interface Settlement {
	intentId: string
	tokenIn: string
	tokenOut: string
	amountIn: string
	amountOut: string
	serverCount: number
	timestamp: string
}

interface RecentSettlementsProps {
	settlements: Settlement[]
}

export function RecentSettlements({ settlements }: RecentSettlementsProps) {
	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/5">
			{/* Header */}
			<div className="border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<Clock className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Recent Settlements</span>
					<span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground transition-all duration-150 hover:bg-muted/80">
						{settlements.length}
					</span>
				</div>
			</div>

			{/* Column headers */}
			<div className="grid grid-cols-5 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border-b">
				<span>Intent</span>
				<span>Pair</span>
				<span className="text-right">In</span>
				<span className="text-right">Out</span>
				<span className="text-right">Servers</span>
			</div>

			{/* Rows */}
			<div className="divide-y">
				{settlements.map((s, i) => (
					<div
						key={s.intentId}
						className="group grid grid-cols-5 items-center px-4 py-3 text-sm transition-all duration-200 ease-out hover:bg-muted/30"
						style={{ animationDelay: `${i * 30}ms` }}
					>
						<span className="font-mono text-xs transition-colors duration-150 group-hover:text-foreground">
							{truncateAddress(s.intentId, 2)}
						</span>
						<span className="text-xs">
							{s.tokenIn}/{s.tokenOut}
						</span>
						<span className="text-right text-xs">{s.amountIn}</span>
						<span className="text-right text-xs text-brand font-medium transition-transform duration-150 group-hover:scale-105">
							{s.amountOut}
						</span>
						<span className="text-right text-xs">{s.serverCount}</span>
					</div>
				))}
				{settlements.length === 0 && (
					<div className="px-4 py-8 text-center animate-fade-in-up">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform duration-200 hover:scale-105 hover:rotate-12">
							<ArrowRightLeft className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">No settlements yet</p>
					</div>
				)}
			</div>
		</div>
	)
}
