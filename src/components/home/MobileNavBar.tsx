"use client"

import { Plane, MapPinned, CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"

interface MobileNavBarProps {
  activeItem?: 'trips' | 'explore' | 'calendar'
}

export function MobileNavBar({ activeItem = 'trips' }: MobileNavBarProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#f5f5f5] h-[52px] px-[48px] py-[10px] flex items-center justify-between lg:hidden">
      <button
        className={cn(
          "p-2",
          activeItem === 'trips' ? "text-[#0a0a0a]" : "text-[#a1a1a1]"
        )}
        aria-label="Trips"
      >
        <Plane className="h-6 w-6" />
      </button>
      <button
        className={cn(
          "p-2",
          activeItem === 'explore' ? "text-[#0a0a0a]" : "text-[#a1a1a1]"
        )}
        aria-label="Explore"
      >
        <MapPinned className="h-6 w-6" />
      </button>
      <button
        className={cn(
          "p-2",
          activeItem === 'calendar' ? "text-[#0a0a0a]" : "text-[#a1a1a1]"
        )}
        aria-label="Calendar"
      >
        <CalendarDays className="h-6 w-6" />
      </button>
    </div>
  )
}
