"use client"

import { LOCATION_COLORS } from "@/types"
import { cn } from "@/lib/utils"

interface ColorPickerProps {
  value: string | undefined
  onChange: (value: string) => void
  colors?: typeof LOCATION_COLORS
}

export function ColorPicker({
  value,
  onChange,
  colors = LOCATION_COLORS,
}: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {colors.map((colorOption) => (
        <button
          key={colorOption.value}
          type="button"
          className={cn(
            "aspect-square flex-1 min-w-0 rounded transition-all",
            colorOption.value,
            value === colorOption.value
              ? "ring-[1.5px] ring-offset-2 ring-text-primary"
              : "hover:scale-110"
          )}
          onClick={() => onChange(colorOption.value)}
          title={colorOption.name}
        />
      ))}
    </div>
  )
}
