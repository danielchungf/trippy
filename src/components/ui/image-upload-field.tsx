"use client"

import { useRef, useState } from "react"
import { ImagePlus } from "lucide-react"
import { FocalPointPicker } from "@/components/ui/FocalPointPicker"
import { cn } from "@/lib/utils"

interface ImageUploadFieldProps {
  previewUrl?: string
  focusX: number
  focusY: number
  onFocusChange: (x: number, y: number) => void
  onFileSelect: (file: File) => void
  onRemove: () => void
  isUploading?: boolean
  error?: string
  maxSizeMB?: number
  acceptTypes?: string[]
}

const DEFAULT_ACCEPT_TYPES = ["image/jpeg", "image/png", "image/webp"]

export function ImageUploadField({
  previewUrl,
  focusX,
  focusY,
  onFocusChange,
  onFileSelect,
  onRemove,
  isUploading,
  error,
  maxSizeMB = 5,
  acceptTypes = DEFAULT_ACCEPT_TYPES,
}: ImageUploadFieldProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateAndSelect = (file: File) => {
    setValidationError(null)

    if (!acceptTypes.includes(file.type)) {
      setValidationError("Invalid file type. Please upload a JPEG, PNG, or WebP image.")
      return
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setValidationError(`File is too large. Maximum size is ${maxSizeMB}MB.`)
      return
    }

    onFileSelect(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) validateAndSelect(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) validateAndSelect(file)
  }

  const handleRemove = () => {
    setValidationError(null)
    if (fileInputRef.current) fileInputRef.current.value = ""
    onRemove()
  }

  const displayError = error || validationError

  return (
    <div>
      {previewUrl ? (
        <FocalPointPicker
          imageUrl={previewUrl}
          focusX={focusX}
          focusY={focusY}
          onChange={onFocusChange}
          onRemove={handleRemove}
          onReplace={() => fileInputRef.current?.click()}
          disabled={isUploading}
        />
      ) : (
        <div
          className={cn(
            "relative rounded-lg border border-dashed transition-colors",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border-muted hover:border-border-regular"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-[138.9px] flex flex-col items-center justify-center gap-4 transition-colors"
          >
            <span className="w-8 h-8 text-text-accent [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2]">
              <ImagePlus />
            </span>
            <div className="flex flex-col items-center gap-1">
              <span className="text-h3 font-fustat text-text-primary">Click or drag to upload</span>
              <span className="text-body font-inter text-text-secondary">JPEG, PNG or WebP (max {maxSizeMB}MB)</span>
            </div>
          </button>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptTypes.join(",")}
        onChange={handleInputChange}
        className="hidden"
      />
      {displayError && (
        <p className="text-body-sm text-destructive mt-2">{displayError}</p>
      )}
    </div>
  )
}
