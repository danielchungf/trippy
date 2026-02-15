"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X, Loader2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import { cn } from "@/lib/utils"

interface FormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  children: React.ReactNode
  submitLabel: string
  onSubmit: () => void
  submitDisabled?: boolean
  loading?: boolean
  loadingLabel?: string
  onDelete?: () => void
  deleteLabel?: string
  className?: string
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  children,
  submitLabel,
  onSubmit,
  submitDisabled,
  loading,
  loadingLabel,
  onDelete,
  deleteLabel = "Delete",
  className,
}: FormDialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/25 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[calc(100%-2rem)] max-w-[500px] translate-x-[-50%] translate-y-[-50%]",
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
          <div className="flex flex-col gap-5 p-4">
            {children}
          </div>

          {/* Footer */}
          <div className={cn(
            "flex items-center p-4 border-t border-border-muted",
            onDelete ? "justify-between" : "justify-end"
          )}>
            {onDelete && (
              <Button variant="secondary" size="small" onClick={onDelete} leftIcon={<Trash2 />}>
                {deleteLabel}
              </Button>
            )}
            <div className="flex gap-2">
              <DialogPrimitive.Close asChild>
                <Button variant="secondary" size="small">Cancel</Button>
              </DialogPrimitive.Close>
              <Button
                variant="primary"
                size="small"
                onClick={onSubmit}
                disabled={submitDisabled || loading}
              >
                {loading ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Loader2 className="h-4 w-4 animate-spin flex-shrink-0" />
                    {loadingLabel ?? "Saving..."}
                  </span>
                ) : (
                  submitLabel
                )}
              </Button>
            </div>
          </div>

          <DialogPrimitive.Description className="sr-only">
            {title}
          </DialogPrimitive.Description>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
