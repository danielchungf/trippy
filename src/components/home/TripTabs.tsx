"use client"

import { cn } from "@/lib/utils"

export type TripTabValue = 'past' | 'upcoming'

interface TripTabsProps {
  activeTab: TripTabValue
  onTabChange: (tab: TripTabValue) => void
}

export function TripTabs({ activeTab, onTabChange }: TripTabsProps) {
  return (
    <div className="flex gap-[5px]">
      <button
        onClick={() => onTabChange('past')}
        className={cn(
          "px-[15px] py-[5px] rounded-full text-[14px] font-medium tracking-[-0.28px] transition-colors",
          activeTab === 'past'
            ? "bg-[rgba(0,179,255,0.15)] text-[#00b3ff]"
            : "border border-[#e5e5e5] text-[#a1a1a1]"
        )}
      >
        Past
      </button>
      <button
        onClick={() => onTabChange('upcoming')}
        className={cn(
          "px-[15px] py-[5px] rounded-full text-[14px] font-medium tracking-[-0.28px] transition-colors",
          activeTab === 'upcoming'
            ? "bg-[rgba(0,179,255,0.15)] text-[#00b3ff]"
            : "border border-[#e5e5e5] text-[#a1a1a1]"
        )}
      >
        Upcoming
      </button>
    </div>
  )
}
