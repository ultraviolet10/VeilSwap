"use client"

import { Activity, CheckCircle, Clock, TrendingUp } from "lucide-react"

interface ProtocolStats {
	totalIntents: number
	totalFilled: number
	fillRate: number
	avgSettlementTime: string
}

interface LpStatsProps {
	stats: ProtocolStats
}

export function LpStats({ stats }: LpStatsProps) {
	const statItems = [
		{
			label: "Total Intents",
			value: stats.totalIntents,
			icon: Activity,
		},
		{
			label: "Intents Filled",
			value: stats.totalFilled,
			icon: CheckCircle,
		},
		{
			label: "Fill Rate",
			value: `${stats.fillRate.toFixed(1)}%`,
			icon: TrendingUp,
			highlight: true,
		},
		{
			label: "Avg Settlement",
			value: stats.avgSettlementTime,
			icon: Clock,
		},
	]

	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/5">
			<div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0">
				{statItems.map((item, i) => (
					<div
						key={item.label}
						className="group flex items-center gap-3 px-4 py-4 transition-all duration-200 ease-out hover:bg-muted/30"
						style={{ animationDelay: `${i * 50}ms` }}
					>
						<div
							className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200 ease-out group-hover:scale-110 ${
								item.highlight
									? "bg-brand/10 group-hover:bg-brand/15"
									: "bg-muted group-hover:bg-muted/80"
							}`}
						>
							<item.icon
								className={`h-4 w-4 transition-colors duration-200 ${
									item.highlight ? "text-brand" : "text-muted-foreground"
								}`}
							/>
						</div>
						<div>
							<p
								className={`text-xl font-semibold transition-colors duration-200 ${
									item.highlight ? "text-brand" : ""
								}`}
							>
								{item.value}
							</p>
							<p className="text-xs text-muted-foreground">{item.label}</p>
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
