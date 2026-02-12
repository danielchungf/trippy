"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import { cn } from "@/lib/utils"

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel: string
  onConfirm: () => void
  loading?: boolean
  loadingLabel?: string
  destructive?: boolean
  className?: string
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  loading,
  loadingLabel,
  destructive,
  className,
}: ConfirmDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-full max-w-[500px] translate-x-[-50%] translate-y-[-50%]",
            "rounded-lg bg-white",
            "duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
            className
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border-muted">
            <DialogPrimitive.Title className="text-h1 font-fustat text-text-primary">
              {title}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <NakedIconButton icon={<X />} />
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-4">
            <DialogPrimitive.Description className="text-body text-text-secondary">
              {description}
            </DialogPrimitive.Description>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border-muted">
            <DialogPrimitive.Close asChild>
              <Button variant="secondary" size="small">Cancel</Button>
            </DialogPrimitive.Close>
            <Button
              variant={destructive ? "destructive" : "primary"}
              size="small"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                  {loadingLabel ?? "Loading..."}
                </span>
              ) : (
                confirmLabel
              )}
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
