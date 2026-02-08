"use client"

import { FileText, Keyboard } from "lucide-react"
import { useParams } from "next/navigation"
import type { Hex } from "viem"
import { formatUnits } from "viem"
import { IntentPhaseBadge } from "#/components/intent/intent-phase-badge"
import { Skeleton } from "#/components/ui/skeleton"
import { useIntentStatus } from "#/hooks/use-intent-status"
import { IntentStatus } from "#/lib/abis/intent-registry"
import { truncateAddress } from "#/lib/format"

export default function IntentPage() {
	const params = useParams<{ id: string }>()
	const intentId = params.id as Hex

	const { intentData, status } = useIntentStatus(intentId)

	const getPhaseFromStatus = () => {
		if (!intentData) return "processing"
		if (intentData.status === IntentStatus.Filled) return "filled"
		if (intentData.status === IntentStatus.Cancelled) return "failed"
		return "processing"
	}

	const fields = intentData
		? [
				{ label: "Intent ID", value: truncateAddress(intentId, 8), mono: true },
				{ label: "User", value: truncateAddress(intentData.user), mono: true },
				{
					label: "Token In",
					value: truncateAddress(intentData.tokenIn),
					mono: true,
				},
				{
					label: "Token Out",
					value: truncateAddress(intentData.tokenOut),
					mono: true,
				},
				{ label: "Amount In", value: formatUnits(intentData.amountIn, 18) },
				{
					label: "Min Amount Out",
					value: formatUnits(intentData.minAmountOut, 18),
					highlight: true,
				},
				{
					label: "Deadline",
					value: new Date(Number(intentData.deadline) * 1000).toLocaleString(),
				},
			]
		: []

	return (
		<div className="flex min-h-[calc(100vh-3.5rem)] items-start justify-center pt-16 px-4">
			<div className="w-full max-w-md animate-fade-in-up">
				{/* Command palette style header */}
				<div className="mb-4 flex items-center justify-between animate-fade-in-up [animation-delay:50ms]">
					<div className="flex items-center gap-2">
						<div className="rounded-md bg-muted px-2 py-1 text-xs font-mono text-muted-foreground transition-colors duration-150 hover:bg-muted/80">
							⌘I
						</div>
						<span className="text-sm text-muted-foreground">
							Intent details
						</span>
					</div>
					<div className="flex items-center gap-1.5 text-xs text-muted-foreground/50">
						<Keyboard className="h-3 w-3" />
						<span>Esc to close</span>
					</div>
				</div>

				{/* Main card */}
				<div className="overflow-hidden rounded-xl border bg-card shadow-2xl shadow-black/5 animate-fade-in-scale [animation-delay:100ms]">
					{/* Header */}
					<div className="border-b px-4 py-3">
						<div className="flex items-center gap-2">
							<FileText className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm font-medium">Intent Details</span>
							<div className="flex-1" />
							{intentData && <IntentPhaseBadge phase={getPhaseFromStatus()} />}
						</div>
					</div>

					{/* Content */}
					<div className="divide-y">
						{intentData ? (
							fields.map((field, i) => (
								<div
									key={field.label}
									className="group flex items-center justify-between px-4 py-3 transition-all duration-200 ease-out hover:bg-muted/30 animate-stagger-in"
									style={{ animationDelay: `${150 + i * 40}ms` }}
								>
									<span className="text-sm text-muted-foreground">
										{field.label}
									</span>
									<span
										className={`text-sm transition-all duration-150 group-hover:translate-x-0.5 ${field.mono ? "font-mono text-xs" : ""} ${field.highlight ? "text-brand font-medium" : ""}`}
									>
										{field.value}
									</span>
								</div>
							))
						) : (
							<div className="space-y-3 px-4 py-4">
								<div className="flex justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-32" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-20" />
									<Skeleton className="h-4 w-28" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-24" />
									<Skeleton className="h-4 w-24" />
								</div>
								<div className="flex justify-between">
									<Skeleton className="h-4 w-28" />
									<Skeleton className="h-4 w-20" />
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Keyboard hints */}
				<div className="mt-6 flex justify-center gap-6 text-xs text-muted-foreground/50 animate-fade-in-up [animation-delay:400ms]">
					<span className="transition-colors duration-150 hover:text-muted-foreground">
						<kbd className="font-mono">↑↓</kbd> navigate
					</span>
					<span className="transition-colors duration-150 hover:text-muted-foreground">
						<kbd className="font-mono">Enter</kbd> copy
					</span>
					<span className="transition-colors duration-150 hover:text-muted-foreground">
						<kbd className="font-mono">Esc</kbd> back
					</span>
				</div>
			</div>
		</div>
	)
}
