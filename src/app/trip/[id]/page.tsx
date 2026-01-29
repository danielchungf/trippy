"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import {
  Users,
  Settings,
  Plus,
  Plane,
  User,
  LogOut,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Trip,
  Day,
  Activity,
  Location,
  formatDateRange,
  formatDate,
  getTripDuration,
  generateDaysFromTrip,
  LOCATION_COLORS
} from "@/types"
import { useTrip } from "@/lib/hooks/use-trips"
import { createClient } from "@/lib/supabase/client"
import logo from "@/app/logo.png"

// Tab types
type TabId = 'itinerary' | 'stays' | 'places' | 'packing'

const TABS: { id: TabId; label: string }[] = [
  { id: 'itinerary', label: 'ITINERARY' },
  { id: 'stays', label: 'STAYS' },
  { id: 'places', label: 'PLACES' },
  { id: 'packing', label: 'PACKING' },
]

export default function TripPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const { data: trip, isLoading } = useTrip(tripId)
  const [activeTab, setActiveTab] = useState<TabId>('itinerary')

  if (!isLoading && !trip) {
    router.push('/')
    return null
  }

  if (!trip) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const duration = getTripDuration(trip)

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar onNavigateHome={() => router.push('/')} />

      {/* Left Panel - Fixed 580px */}
      <div className="w-[580px] flex-shrink-0 border-r border-t border-neutral-200 flex flex-col overflow-hidden">
        {/* Trip Header */}
        <TripHeader trip={trip} duration={duration} />

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <TabContent activeTab={activeTab} trip={trip} />
        </div>
      </div>

      {/* Right Panel - Remaining width */}
      <div className="flex-1 border-t border-neutral-200">
        {/* Placeholder for map/activity details */}
        <div className="h-full flex items-center justify-center text-text-secondary">
          Right panel (map + activity details)
        </div>
      </div>
    </div>
  )
}

// Trip Header Component
function TripHeader({ trip, duration }: { trip: Trip; duration: number }) {
  return (
    <header className="p-3 flex flex-col gap-3">
      {/* Row 1: Title + Buttons */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-h1">{trip.name}</h1>
          <p className="text-h2 text-text-secondary">
            {formatDateRange(trip.startDate, trip.endDate)} ({duration} days)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NakedIconButton icon={<Users />} />
          <NakedIconButton icon={<Settings />} />
        </div>
      </div>

      {/* Row 2: Location Badges */}
      <div className="flex items-center gap-2">
        {trip.locations.map((location) => (
          <Badge key={location.id} dotColor={location.color || LOCATION_COLORS[0].value}>
            {location.name}
          </Badge>
        ))}
        <NakedIconButton icon={<Plus />} />
      </div>
    </header>
  )
}

// Tab Bar Component
function TabBar({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <div className="flex border-y border-neutral-200">
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        const prevIsActive = index > 0 && activeTab === TABS[index - 1].id
        const showDivider = !isActive && !prevIsActive && index > 0

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 px-4 py-3 text-center font-inter text-[14px] font-medium leading-[18px] tracking-[-0.02em]
              transition-colors relative
              ${isActive
                ? 'bg-neutral-800 text-white'
                : 'bg-transparent text-text-secondary hover:bg-neutral-50'
              }
            `}
          >
            {showDivider && (
              <span className="absolute left-0 top-0 w-px h-full bg-neutral-200" />
            )}
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}

// Tab Content Component
function TabContent({ activeTab, trip }: { activeTab: TabId; trip: Trip }) {
  switch (activeTab) {
    case 'itinerary':
      return <ItineraryPanel trip={trip} />
    case 'stays':
      return (
        <div className="p-4 text-text-secondary">
          Stays content ({trip.accommodations.length} accommodations)
        </div>
      )
    case 'places':
      return (
        <div className="p-4 text-text-secondary">
          Places content ({trip.savedPlaces.length} saved places)
        </div>
      )
    case 'packing':
      return (
        <div className="p-4 text-text-secondary">
          Packing content (coming soon)
        </div>
      )
    default:
      return null
  }
}

// Itinerary Panel Component
function ItineraryPanel({ trip }: { trip: Trip }) {
  const days = generateDaysFromTrip(trip)

  // Group days by location
  const getLocationForDay = (day: Day): Location | undefined => {
    return trip.locations.find(loc => loc.id === day.locationId)
  }

  return (
    <div className="flex flex-col">
      {days.map((day, index) => {
        const location = getLocationForDay(day)
        const dayNumber = index + 1
        return (
          <DayCard
            key={day.date}
            day={day}
            dayNumber={dayNumber}
            location={location}
          />
        )
      })}
    </div>
  )
}

// Day Card Component
function DayCard({
  day,
  dayNumber,
  location
}: {
  day: Day
  dayNumber: number
  location?: Location
}) {
  const formattedDate = formatDate(day.date)
  const hasActivities = day.activities.length > 0

  return (
    <div className="border-b border-neutral-200 p-4">
      {/* Day Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-h3 text-text-primary">Day {dayNumber}</span>
        <span className="text-body text-text-secondary">{formattedDate}</span>
        {location && (
          <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
            {location.name}
          </Badge>
        )}
      </div>

      {/* Activities or Empty State */}
      {hasActivities ? (
        <div className="flex flex-col gap-2 mt-3">
          {day.activities.map((activity) => (
            <ActivityRow key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <p className="text-small text-text-tertiary mt-1">
          No activities planned
        </p>
      )}
    </div>
  )
}

// Activity Row Component
function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-start gap-3 py-1">
      {/* Time */}
      <span className="text-small text-text-secondary w-12 flex-shrink-0">
        {activity.time || '—'}
      </span>

      {/* Activity Details */}
      <div className="flex-1 min-w-0">
        <p className="text-body text-text-primary truncate">{activity.title}</p>
        {activity.place?.name && activity.place.name !== activity.title && (
          <p className="text-small text-text-tertiary truncate">{activity.place.name}</p>
        )}
      </div>
    </div>
  )
}

// Sidebar Component
function Sidebar({ onNavigateHome }: { onNavigateHome: () => void }) {
  const router = useRouter()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="w-[49px] flex-shrink-0 border-r border-t border-neutral-200 flex flex-col p-3 px-[10px] bg-background">
      {/* Top: Logo */}
      <div className="flex justify-center">
        <NakedIconButton
          icon={<Image src={logo} alt="Logo" width={20} height={20} />}
        />
      </div>

      {/* Middle: Home/Trips */}
      <div className="flex-1 flex items-center justify-center">
        <NakedIconButton
          icon={<Plane />}
          onClick={onNavigateHome}
        />
      </div>

      {/* Bottom: User Menu */}
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <NakedIconButton icon={<User />} />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-48">
            <DropdownMenuItem onClick={handleSignOut} disabled={isLoggingOut}>
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Signing out..." : "Sign out"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
