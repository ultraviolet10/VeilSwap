import { Keyboard, Server } from "lucide-react"
import { LpStats } from "#/components/lp/lp-stats"
import { LpTable } from "#/components/lp/lp-table"
import { RecentSettlements } from "#/components/lp/recent-settlements"
import { getIntentStats, getLpStats } from "#/lib/lp-data"

// Revalidate every 30 seconds
export const revalidate = 30

export default async function LpPage() {
	const [lpStats, intentStats] = await Promise.all([
		getLpStats(),
		getIntentStats(),
	])

	// Map registered nodes to server format
	const servers = lpStats.registeredNodes.map((address) => ({
		address,
		settlements: 0, // We don't track per-node settlements on-chain yet
		online: true, // Assume registered nodes are online
	}))

	const stats = {
		totalIntents: intentStats.totalIntents,
		totalFilled: intentStats.filledIntents,
		fillRate: intentStats.fillRate,
		avgSettlementTime: "N/A", // Not tracked on-chain
	}

	// Recent settlements placeholder - would need event indexing for real data
	const recentSettlements: {
		intentId: string
		tokenIn: string
		tokenOut: string
		amountIn: string
		amountOut: string
		serverCount: number
		timestamp: string
	}[] = []

	return (
		<div className="mx-auto max-w-5xl px-4 py-8">
			{/* Command palette style header */}
			<div className="mb-6 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10">
						<Server className="h-5 w-5 text-brand" />
					</div>
					<div>
						<h1 className="text-xl font-semibold tracking-tight">LP Servers</h1>
						<p className="text-xs text-muted-foreground">
							On-chain data from Base Sepolia · {lpStats.totalNodes} nodes
						</p>
					</div>
				</div>
				<div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
					<Keyboard className="h-3 w-3" />
					<kbd className="rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
						R
					</kbd>
					<span>refresh</span>
				</div>
			</div>

			<div className="space-y-6">
				<LpStats stats={stats} />
				<div className="grid gap-6 lg:grid-cols-2">
					<LpTable servers={servers} />
					<RecentSettlements settlements={recentSettlements} />
				</div>
			</div>
		</div>
	)
}
