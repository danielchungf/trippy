"use client"

import { useRef, useState } from "react"
import { Trash2, Replace } from "lucide-react"

interface FocalPointPickerProps {
  imageUrl: string
  focusX: number
  focusY: number
  onChange: (x: number, y: number) => void
  onRemove?: () => void
  onReplace?: () => void
  disabled?: boolean
}

export function FocalPointPicker({
  imageUrl,
  focusX,
  focusY,
  onChange,
  onRemove,
  onReplace,
  disabled,
}: FocalPointPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const updatePosition = (e: React.PointerEvent) => {
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
    onChange(x, y)
  }

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return
    setIsDragging(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    updatePosition(e)
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return
    updatePosition(e)
  }

  const handlePointerUp = () => {
    setIsDragging(false)
  }

  const objectPosition = `${focusX * 100}% ${focusY * 100}%`

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className={`relative w-full h-[120px] rounded-lg overflow-hidden select-none ${
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-crosshair"
        }`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <img
          src={imageUrl}
          alt="Cover image"
          className="w-full h-full object-cover"
          style={{ objectPosition }}
          draggable={false}
        />

        {/* Focal point marker */}
        <div
          className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{ left: `${focusX * 100}%`, top: `${focusY * 100}%` }}
        >
          <div className="absolute inset-0 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.3),0_2px_4px_rgba(0,0,0,0.3)]" />
          <div className="absolute inset-[9px] rounded-full bg-white shadow-sm" />
        </div>
      </div>

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex gap-1">
        {onReplace && (
          <button
            type="button"
            onClick={onReplace}
            className="w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Replace image"
          >
            <Replace className="h-4 w-4" />
          </button>
        )}
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="w-8 h-8 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            title="Remove image"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  )
}
