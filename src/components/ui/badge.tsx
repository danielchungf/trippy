import * as React from "react"

import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Tailwind bg class for the dot indicator (only shown when provided) */
  dotColor?: string
  /** Variant for different surface contexts */
  variant?: "default" | "secondary" | "outline"
}

function Badge({ className, dotColor, variant = "default", children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] border px-2 py-1 transition-colors",
        variant === "default" && "border-neutral-200 bg-white hover:bg-neutral-50",
        variant === "secondary" && "border-transparent bg-neutral-100 text-neutral-900",
        variant === "outline" && "border-neutral-200 bg-transparent",
        className
      )}
      {...props}
    >
      {dotColor && (
        <span
          className={cn("w-3 h-3 shrink-0 rounded-full", dotColor)}
        />
      )}
      <span className="text-h3 text-text-primary">{children}</span>
    </div>
  )
}

export { Badge }
