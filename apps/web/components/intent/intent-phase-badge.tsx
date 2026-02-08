"use client"

import { Badge } from "#/components/ui/badge"
import { PHASE_LABELS } from "#/lib/constants"
import { cn } from "#/lib/utils"
import type { IntentPhase } from "#/types/intent"

const PHASE_STYLES: Record<IntentPhase, string> = {
	idle: "bg-muted text-muted-foreground",
	approving: "bg-muted text-muted-foreground animate-pulse-subtle",
	submitting: "bg-muted text-muted-foreground animate-pulse-subtle",
	submitted: "bg-brand/10 text-brand",
	processing: "bg-brand/10 text-brand animate-pulse-subtle",
	settling: "bg-brand/10 text-brand animate-pulse-subtle",
	filled: "bg-brand text-brand-foreground",
	failed: "bg-destructive/10 text-destructive",
}

interface IntentPhaseBadgeProps {
	phase: IntentPhase
}

export function IntentPhaseBadge({ phase }: IntentPhaseBadgeProps) {
	return (
		<Badge
			variant="secondary"
			className={cn(
				"border-0 transition-all duration-300 ease-out",
				PHASE_STYLES[phase],
			)}
		>
			{PHASE_LABELS[phase]}
		</Badge>
	)
}
