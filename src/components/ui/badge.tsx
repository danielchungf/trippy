import * as React from "react"

import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind bg class for the dot indicator (only shown when provided) */
  dotColor?: string
  /** Variant for different surface contexts */
  variant?: "default" | "secondary" | "outline"
  /** Truncate text to single line with ellipsis */
  truncate?: boolean
}

function Badge({ className, dotColor, variant = "default", truncate, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[8px] px-2 py-1 transition-colors ring-1 ring-inset",
        variant === "default" && "ring-neutral-200 bg-white hover:bg-neutral-50",
        variant === "secondary" && "ring-transparent bg-neutral-100 text-neutral-900",
        variant === "outline" && "ring-neutral-200 bg-transparent",
        truncate && "max-w-full",
        className
      )}
      {...props}
    >
      {dotColor && (
        <span
          className={cn("w-3 h-3 shrink-0 rounded-full", dotColor)}
        />
      )}
      <span className={`text-h3 text-text-primary${truncate ? " truncate" : ""}`}>{children}</span>
    </div>
  )
}

export { Badge }
