import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center font-fustat font-bold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-blue-400 text-white hover:[background:linear-gradient(rgba(0,0,0,0.05),rgba(0,0,0,0.05)),_rgb(96,165,250)]",
        secondary:
          "bg-white text-neutral-600 border border-neutral-200 hover:bg-neutral-50",
      },
      size: {
        medium: "h-[36px] px-[10px] py-[8px] rounded-[12px] gap-[6px] text-[16px] leading-[20px] tracking-[-0.02em]",
        small: "h-[32px] px-[8px] py-[6px] rounded-[10px] gap-[6px] text-[14px] leading-[10px] tracking-[-0.02em]",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  }
)

const iconSizeClasses = {
  medium: "w-[20px] h-[20px]",
  small: "w-[16px] h-[16px]",
} as const

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  leftIcon?: React.ReactNode
  rightIcon?: React.ReactNode
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, leftIcon, rightIcon, asChild = false, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    const iconSize = iconSizeClasses[size || "medium"]

    // If asChild, render without icon wrapper logic
    if (asChild) {
      return (
        <Comp
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Comp>
      )
    }

    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        {leftIcon && (
          <span className={cn(iconSize, "flex-shrink-0 [&>svg]:w-full [&>svg]:h-full")}>
            {leftIcon}
          </span>
        )}
        {children && <span className="px-[2px]">{children}</span>}
        {rightIcon && (
          <span className={cn(iconSize, "flex-shrink-0 [&>svg]:w-full [&>svg]:h-full")}>
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
