"use client"

import { Badge } from "#/components/ui/badge"
import { cn } from "#/lib/utils"
import { PHASE_LABELS } from "#/lib/constants"
import type { IntentPhase } from "#/types/intent"

const PHASE_STYLES: Record<IntentPhase, string> = {
	idle: "bg-muted text-muted-foreground",
	approving: "bg-muted text-muted-foreground",
	submitting: "bg-muted text-muted-foreground",
	submitted: "bg-brand/10 text-brand",
	processing: "bg-brand/10 text-brand",
	settling: "bg-brand/10 text-brand",
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
			className={cn("border-0", PHASE_STYLES[phase])}
		>
			{PHASE_LABELS[phase]}
		</Badge>
	)
}
