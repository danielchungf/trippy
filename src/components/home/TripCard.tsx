"use client"

import Link from "next/link"
import { Trip, parseLocalDate } from "@/types"
import placeholderImage from "@/app/landscape-placeholder.jpg"

interface TripCardProps {
  trip: Trip
}

// Get countdown text for upcoming trips
function getCountdownText(trip: Trip): string | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)

  if (today > end) return null // Past trip - no badge
  if (today >= start && today <= end) return 'Now' // Ongoing

  const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return `In ${diffDays} day${diffDays === 1 ? '' : 's'}`
}

// Format date range for display (e.g., "Mar 25 — Apr 12")
function formatTripDateRange(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  if (startMonth === endMonth) {
    return `${startMonth} ${start.getDate()} — ${end.getDate()}`
  }

  return `${startMonth} ${start.getDate()} — ${endMonth} ${end.getDate()}`
}

export function TripCard({ trip }: TripCardProps) {
  const countdown = getCountdownText(trip)

  return (
    <Link href={`/trip/${trip.id}`}>
      <div className="bg-white border-[0.5px] border-[#e5e5e5] rounded-[15px] overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
        {/* Image container with padding */}
        <div className="p-[5px]">
          <div className="relative h-[120px] rounded-[10px] overflow-hidden">
            {/* Cover image or placeholder */}
            <img
              src={trip.coverImage || placeholderImage.src}
              alt={trip.name}
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Countdown badge */}
            {countdown && (
              <div className="absolute top-[10px] left-[10px] bg-white rounded-full px-[10px] py-[5px]">
                <span className="text-[12px] font-semibold text-[#0a0a0a] tracking-[-0.24px]">
                  {countdown}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-[15px] pt-[10px] pb-[15px]">
          <h3 className="text-[18px] font-semibold text-[#0a0a0a] tracking-[-0.36px] truncate">
            {trip.name}
          </h3>
          <p className="text-[14px] font-medium text-[#a1a1a1] tracking-[-0.28px] mt-[5px]">
            {formatTripDateRange(trip.startDate, trip.endDate)}
          </p>
        </div>
      </div>
    </Link>
  )
}
