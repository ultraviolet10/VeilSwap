"use client"

import { Server } from "lucide-react"
import { Badge } from "#/components/ui/badge"
import { truncateAddress } from "#/lib/format"

interface LpServer {
	address: string
	settlements: number
	online: boolean
}

interface LpTableProps {
	servers: LpServer[]
}

export function LpTable({ servers }: LpTableProps) {
	return (
		<div className="overflow-hidden rounded-xl border bg-card shadow-lg shadow-black/5">
			{/* Header */}
			<div className="border-b px-4 py-3">
				<div className="flex items-center gap-2">
					<Server className="h-4 w-4 text-muted-foreground" />
					<span className="text-sm font-medium">Active LP Servers</span>
					<span className="ml-auto rounded-md bg-muted px-2 py-0.5 text-xs font-mono text-muted-foreground transition-all duration-150 hover:bg-muted/80">
						{servers.length}
					</span>
				</div>
			</div>

			{/* Column headers */}
			<div className="grid grid-cols-3 px-4 py-2 text-xs font-medium text-muted-foreground bg-muted/30 border-b">
				<span>Address</span>
				<span className="text-center">Settlements</span>
				<span className="text-right">Status</span>
			</div>

			{/* Rows */}
			<div className="divide-y">
				{servers.map((server, i) => (
					<div
						key={server.address}
						className="group grid grid-cols-3 items-center px-4 py-3 text-sm transition-all duration-200 ease-out hover:bg-muted/30"
						style={{ animationDelay: `${i * 30}ms` }}
					>
						<span className="font-mono text-xs transition-colors duration-150 group-hover:text-foreground">
							{truncateAddress(server.address)}
						</span>
						<span className="text-center transition-transform duration-150 group-hover:scale-105">
							{server.settlements}
						</span>
						<div className="flex justify-end">
							<Badge
								variant={server.online ? "default" : "secondary"}
								className={`transition-all duration-150 ${
									server.online
										? "bg-brand/10 text-brand hover:bg-brand/20 border-0 group-hover:scale-105"
										: ""
								}`}
							>
								{server.online ? "Online" : "Offline"}
							</Badge>
						</div>
					</div>
				))}
				{servers.length === 0 && (
					<div className="px-4 py-8 text-center animate-fade-in-up">
						<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-muted transition-transform duration-200 hover:scale-105">
							<Server className="h-6 w-6 text-muted-foreground" />
						</div>
						<p className="text-sm text-muted-foreground">
							No servers registered yet
						</p>
					</div>
				)}
			</div>
		</div>
	)
}
