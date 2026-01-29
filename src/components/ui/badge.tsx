import * as React from "react"

import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Color of the dot indicator (only shown when provided) */
  dotColor?: string
}

function Badge({ className, dotColor, children, ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-[10px] border border-neutral-200 px-2 py-1",
        className
      )}
      {...props}
    >
      {dotColor && (
        <span
          className="w-3 h-3 shrink-0 rounded-full"
          style={{ backgroundColor: dotColor }}
        />
      )}
      <span className="text-h3 text-text-primary">{children}</span>
    </div>
  )
}

export { Badge }
