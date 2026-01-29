import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        // Custom design system variants
        primary:
          "font-fustat font-bold bg-blue-400 text-white hover:[background:linear-gradient(rgba(0,0,0,0.05),rgba(0,0,0,0.05)),_rgb(96,165,250)]",
        secondary:
          "font-fustat font-bold bg-white text-neutral-800 border border-neutral-200 hover:bg-neutral-50",
        // Standard shadcn variants for dialogs/forms
        default:
          "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        outline:
          "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
        ghost:
          "hover:bg-accent hover:text-accent-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
      },
      size: {
        medium: "h-[36px] px-[10px] rounded-[12px] gap-[6px] text-[16px] leading-none tracking-[-0.02em]",
        small: "h-[32px] px-[8px] py-[6px] rounded-[10px] gap-[6px] text-[14px] leading-[10px] tracking-[-0.02em]",
        // Standard shadcn sizes
        default: "h-9 px-4 py-2 rounded-md text-sm font-medium",
        sm: "h-8 rounded-md px-3 text-xs font-medium",
        lg: "h-10 rounded-md px-8 text-sm font-medium",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "medium",
    },
  }
)

const iconClasses = "w-[16px] h-[16px] flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.33px]"

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
          <span className={iconClasses}>
            {leftIcon}
          </span>
        )}
        {children && <span className="px-[2px] translate-y-[1px]">{children}</span>}
        {rightIcon && (
          <span className={iconClasses}>
            {rightIcon}
          </span>
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
