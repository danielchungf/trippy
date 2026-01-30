import * as React from "react"
import { cn } from "@/lib/utils"

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  asChild?: boolean
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, icon, ...props }, ref) => {
    return (
      <button
        className={cn(
          "w-[36px] h-[36px] inline-flex items-center justify-center",
          "bg-white border border-neutral-200 rounded-[8px]",
          "hover:bg-neutral-50 transition-colors",
          "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      >
        <span className="w-[16px] h-[16px] flex items-center justify-center [&>svg]:w-full [&>svg]:h-full">
          {icon}
        </span>
      </button>
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton }
