"use client"

import Link from "next/link"
import { Shrub, NotepadText, BedDouble, CircleAlert, MapPinned } from "lucide-react"
import { Trip, parseLocalDate, getTripDuration } from "@/types"
import placeholderImage from "@/app/landscape-placeholder.jpg"

interface NextTripCardProps {
  trip: Trip
  variant?: 'desktop' | 'mobile'
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

// Format date range with duration for display (e.g., "Mar 25 — Apr 12 (19 days)")
function formatTripDateRangeWithDuration(startDate: string, endDate: string): string {
  const start = parseLocalDate(startDate)
  const end = parseLocalDate(endDate)
  const duration = getTripDuration({ startDate, endDate } as Trip)

  const startMonth = start.toLocaleDateString('en-US', { month: 'short' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'short' })

  const dateRange = startMonth === endMonth
    ? `${startMonth} ${start.getDate()} — ${end.getDate()}`
    : `${startMonth} ${start.getDate()} — ${endMonth} ${end.getDate()}`

  return `${dateRange} (${duration} day${duration === 1 ? '' : 's'})`
}

export function NextTripCard({ trip, variant = 'desktop' }: NextTripCardProps) {
  const countdown = getCountdownText(trip)
  const duration = getTripDuration(trip)

  // Calculate stats from trip data
  const placesCount = trip.savedPlaces?.length || 0
  const activitiesCount = trip.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0
  const daysPlanned = trip.days?.filter(day => day.activities && day.activities.length > 0).length || 0
  const staysLogged = trip.accommodations?.length || 0

  // Calculate missing stays (nights without accommodation)
  const tripNights = duration - 1
  let coveredNights = 0
  trip.accommodations?.forEach(acc => {
    const checkIn = parseLocalDate(acc.checkIn)
    const checkOut = parseLocalDate(acc.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    coveredNights += nights
  })
  const missingStays = Math.max(0, tripNights - coveredNights)

  // Get location names as tags
  const locationTags = trip.locations?.map(loc => loc.name) || []

  if (variant === 'mobile') {
    return (
      <Link href={`/trip/${trip.id}`} className="block">
        <div className="bg-white border-[0.5px] border-[rgba(47,47,47,0.1)] rounded-[15px] overflow-hidden">
          {/* Image */}
          <div className="p-[5px]">
            <div className="relative h-[120px] rounded-[10px] overflow-hidden">
              <img
                src={trip.coverImage || placeholderImage.src}
                alt={trip.name}
                className="absolute inset-0 w-full h-full object-cover"
              />
              {countdown && (
                <div className="absolute top-[10px] left-[10px] bg-white rounded-full px-[10px] py-[5px]">
                  <span className="text-[12px] font-semibold text-[#2f2f2f] tracking-[-0.24px]">
                    {countdown}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="px-[15px] pt-[10px] pb-[15px] flex flex-col gap-[20px]">
            {/* Title and date */}
            <div className="flex flex-col gap-[12px]">
              <div className="flex flex-col gap-[8px]">
                <h3 className="text-[18px] font-semibold text-[#2f2f2f] tracking-[-0.36px] truncate">
                  {trip.name}
                </h3>
                <p className="text-[14px] font-medium text-[#525252] tracking-[-0.28px]">
                  {formatTripDateRangeWithDuration(trip.startDate, trip.endDate)}
                </p>
              </div>

              {/* Location tags */}
              {locationTags.length > 0 && (
                <div className="flex flex-wrap gap-[8px]">
                  {locationTags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-[8px] py-[4px] border border-[rgba(0,0,0,0.1)] rounded-full text-[12px] font-medium text-[#a1a1a1] tracking-[-0.24px]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="h-[1px] bg-[#e5e5e5]" />

            {/* Stats */}
            <div className="flex flex-col gap-[8px]">
              <div className="flex items-center gap-[8px]">
                <Shrub className="w-[20px] h-[20px] text-[#525252]" />
                <span className="text-[14px] font-medium text-[#525252]">
                  {activitiesCount} activities
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <NotepadText className="w-[20px] h-[20px] text-[#525252]" />
                <span className="text-[14px] font-medium text-[#525252]">
                  {daysPlanned}/{duration} days planned
                </span>
              </div>
              <div className="flex items-center gap-[8px]">
                <BedDouble className="w-[20px] h-[20px] text-[#525252]" />
                <span className="text-[14px] font-medium text-[#525252]">
                  {staysLogged} stays logged
                </span>
              </div>
              {missingStays > 0 && (
                <div className="flex items-center gap-[8px]">
                  <CircleAlert className="w-[20px] h-[20px] text-[#525252]" />
                  <span className="text-[14px] font-medium text-[#525252]">
                    {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
                  </span>
                </div>
              )}
            </div>

            {/* Keep planning button */}
            <button className="w-full bg-[#51a2ff] text-white py-[12px] px-[15px] rounded-full text-[16px] font-bold text-center hover:bg-[#4090e8] transition-colors">
              Keep planning
            </button>
          </div>
        </div>
      </Link>
    )
  }

  // Desktop variant - horizontal layout
  return (
    <div className="bg-white border-[0.5px] border-[rgba(47,47,47,0.1)] rounded-[16px] overflow-hidden flex">
      {/* Image - 4:3 aspect ratio, fills card height */}
      <div className="p-[4px] shrink-0 relative">
        <img
          src={trip.coverImage || placeholderImage.src}
          alt={trip.name}
          className="h-full aspect-[4/3] w-[477px] object-cover object-center rounded-[12px]"
        />
        {countdown && (
          <div className="absolute top-[14px] left-[14px] bg-white rounded-full px-[10px] py-[5px]">
            <span className="text-[12px] font-bold text-[#2f2f2f]">
              {countdown}
            </span>
          </div>
        )}
      </div>

      {/* Content - fills remaining space */}
      <div className="flex-1 min-w-0 pl-[24px] pr-[20px] py-[20px] flex flex-col gap-[20px]">
        {/* Title and date */}
        <div className="flex flex-col">
          <h3 className="text-[24px] font-bold text-[#2f2f2f] truncate">
            {trip.name}
          </h3>
          <p className="text-[16px] font-medium text-[#525252] tracking-[-0.32px]">
            {formatTripDateRangeWithDuration(trip.startDate, trip.endDate)}
          </p>
        </div>

        {/* Location tags */}
        {locationTags.length > 0 && (
          <div className="flex flex-wrap gap-[8px]">
            {locationTags.map((tag, index) => (
              <span
                key={index}
                className="px-[8px] py-[4px] border border-[rgba(0,0,0,0.1)] rounded-full text-[14px] font-medium text-[#a1a1a1] tracking-[-0.28px]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Stats */}
        <div className="flex flex-col gap-[4px]">
          <div className="flex items-center gap-[8px]">
            <MapPinned className="w-[24px] h-[24px] text-[#525252]" />
            <span className="text-[16px] font-medium text-[#525252]">
              {placesCount} places
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <Shrub className="w-[24px] h-[24px] text-[#525252]" />
            <span className="text-[16px] font-medium text-[#525252]">
              {activitiesCount} activities
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <NotepadText className="w-[24px] h-[24px] text-[#525252]" />
            <span className="text-[16px] font-medium text-[#525252]">
              {daysPlanned}/{duration} days planned
            </span>
          </div>
          <div className="flex items-center gap-[8px]">
            <BedDouble className="w-[24px] h-[24px] text-[#525252]" />
            <span className="text-[16px] font-medium text-[#525252]">
              {staysLogged} stays logged
            </span>
          </div>
          {missingStays > 0 && (
            <div className="flex items-center gap-[8px]">
              <CircleAlert className="w-[24px] h-[24px] text-[#525252]" />
              <span className="text-[16px] font-medium text-[#525252]">
                {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
              </span>
            </div>
          )}
        </div>

        {/* Keep planning button */}
        <Link
          href={`/trip/${trip.id}`}
          className="w-full border border-[#e5e5e5] py-[8px] px-[12px] rounded-[8px] text-[16px] font-bold text-[#525252] text-center hover:bg-[#f5f5f5] transition-colors tracking-[-0.32px]"
        >
          Keep planning
        </Link>
      </div>
    </div>
  )
}
