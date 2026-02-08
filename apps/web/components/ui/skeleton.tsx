import { cn } from "#/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="skeleton"
			className={cn(
				"relative overflow-hidden bg-muted rounded-md",
				"before:absolute before:inset-0 before:animate-shimmer",
				"motion-reduce:before:animate-none",
				className,
			)}
			{...props}
		/>
	)
}

export { Skeleton }
