"use client"

import { useEffect, useState } from "react"
import { Plus, MapPin, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Calendar } from "@/components/ui/calendar"
import { getTripStatus, parseLocalDate, LOCATION_COLORS } from "@/types"
import { TripWithOwnership } from "@/lib/db"
import { useTrips, useCreateTrip } from "@/lib/hooks/use-trips"
import { useMediaQuery } from "@/hooks/use-media-query"
import { TripTabs, TripTabValue } from "@/components/home/TripTabs"
import { MobileNavBar, MobileNavItem } from "@/components/home/MobileNavBar"
import { NextTripCard } from "@/components/home/NextTripCard"
import { SimpleTripCard } from "@/components/home/SimpleTripCard"
import { UserMenu } from "@/components/auth/UserMenu"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TripTabValue>('upcoming')
  const [mobileNavItem, setMobileNavItem] = useState<MobileNavItem>('home')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTripName, setNewTripName] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const [tripColor, setTripColor] = useState<string | undefined>()
  const [user, setUser] = useState<User | null>(null)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  // React Query hooks
  const { data: trips = [], isLoading } = useTrips()
  const createTripMutation = useCreateTrip()

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    loadUser()
  }, [])

  const handleCreateTrip = async () => {
    if (!newTripName || !dateRange?.from || !dateRange?.to) return

    await createTripMutation.mutateAsync({
      name: newTripName,
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to.toISOString().split('T')[0],
      color: tripColor,
    })

    setNewTripName("")
    setDateRange(undefined)
    setTripColor(undefined)
    setIsCreateOpen(false)
  }

  // Sort trips by start date (upcoming first)
  const sortedTrips = [...trips].sort((a, b) => {
    return parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime()
  })

  // Get upcoming trips (including ongoing)
  const upcomingTrips = sortedTrips.filter(trip => {
    const status = getTripStatus(trip)
    return status === 'upcoming' || status === 'ongoing'
  })

  // Get past trips (sorted by end date descending)
  const pastTrips = sortedTrips
    .filter(trip => getTripStatus(trip) === 'past')
    .sort((a, b) => parseLocalDate(b.endDate).getTime() - parseLocalDate(a.endDate).getTime())

  // The next trip is the first upcoming trip
  const nextTrip = upcomingTrips[0]
  // Other upcoming trips (excluding the next one)
  const otherUpcomingTrips = upcomingTrips.slice(1)

  // Filter trips based on active tab (for mobile trips view)
  const filteredTrips = trips.filter(trip => {
    const status = getTripStatus(trip)
    if (activeTab === 'upcoming') {
      return status === 'upcoming' || status === 'ongoing'
    }
    return status === 'past'
  })

  // Sort filtered trips
  const sortedFilteredTrips = [...filteredTrips].sort((a, b) => {
    if (activeTab === 'upcoming') {
      return parseLocalDate(a.startDate).getTime() - parseLocalDate(b.startDate).getTime()
    }
    return parseLocalDate(b.endDate).getTime() - parseLocalDate(a.endDate).getTime()
  })

  return (
    <div className="min-h-screen bg-white">
      {isDesktop ? (
        <DesktopLayout
          nextTrip={nextTrip}
          upcomingTrips={otherUpcomingTrips}
          pastTrips={pastTrips}
          onCreateTrip={() => setIsCreateOpen(true)}
          user={user}
          isLoading={isLoading}
        />
      ) : (
        <MobileLayout
          nextTrip={nextTrip}
          upcomingTrips={otherUpcomingTrips}
          filteredTrips={sortedFilteredTrips}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          mobileNavItem={mobileNavItem}
          onNavItemChange={setMobileNavItem}
          onCreateTrip={() => setIsCreateOpen(true)}
          user={user}
          isLoading={isLoading}
        />
      )}

      {/* Create Trip Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={(open) => {
        setIsCreateOpen(open)
        if (!open) {
          setNewTripName("")
          setDateRange(undefined)
          setTripColor(undefined)
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Trip</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Name</label>
              <Input
                placeholder="e.g., Summer in Europe"
                value={newTripName}
                onChange={(e) => setNewTripName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Dates</label>
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between font-normal"
                  >
                    {dateRange?.from && dateRange?.to ? (
                      `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    ) : (
                      "Select dates"
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => {
                      setDateRange(range)
                      if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                        setIsCalendarOpen(false)
                      }
                    }}
                    numberOfMonths={isDesktop ? 2 : 1}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color (for calendar)</label>
              <div className="space-y-2 p-1 -m-1">
                {[0, 1, 2].map(row => (
                  <div key={row} className="grid grid-cols-14 gap-1.5">
                    {LOCATION_COLORS.filter(c => c.row === row).map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`aspect-square rounded-full transition-all ${
                          tripColor === color.value
                            ? 'ring-2 ring-offset-2 ring-primary'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setTripColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateTrip} disabled={!newTripName || !dateRange?.from || !dateRange?.to}>
              Create Trip
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function MobileLayout({
  nextTrip,
  upcomingTrips,
  filteredTrips,
  activeTab,
  onTabChange,
  mobileNavItem,
  onNavItemChange,
  onCreateTrip,
  user,
  isLoading
}: {
  nextTrip: TripWithOwnership | undefined
  upcomingTrips: TripWithOwnership[]
  filteredTrips: TripWithOwnership[]
  activeTab: TripTabValue
  onTabChange: (tab: TripTabValue) => void
  mobileNavItem: MobileNavItem
  onNavItemChange: (item: MobileNavItem) => void
  onCreateTrip: () => void
  user: User | null
  isLoading: boolean
}) {
  return (
    <div className="flex flex-col min-h-screen pb-[52px]">
      {mobileNavItem === 'home' ? (
        // Home tab - "Plan your trips" view
        <MobileHomeView
          nextTrip={nextTrip}
          upcomingTrips={upcomingTrips}
          onCreateTrip={onCreateTrip}
          user={user}
          isLoading={isLoading}
        />
      ) : mobileNavItem === 'trips' ? (
        // Trips tab - Past/Upcoming view
        <MobileTripsView
          trips={filteredTrips}
          activeTab={activeTab}
          onTabChange={onTabChange}
          onCreateTrip={onCreateTrip}
          user={user}
          isLoading={isLoading}
        />
      ) : (
        // Calendar tab - placeholder
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#a1a1a1]">Calendar view coming soon</p>
        </div>
      )}

      {/* Bottom navigation */}
      <MobileNavBar activeItem={mobileNavItem} onItemChange={onNavItemChange} />
    </div>
  )
}

function MobileHomeView({
  nextTrip,
  upcomingTrips,
  onCreateTrip,
  user,
  isLoading
}: {
  nextTrip: TripWithOwnership | undefined
  upcomingTrips: TripWithOwnership[]
  onCreateTrip: () => void
  user: User | null
  isLoading: boolean
}) {
  return (
    <div className="flex-1 bg-white px-[15px] pt-[15px] pb-[40px] overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-[20px]">
        <h1 className="text-[24px] font-bold text-[#2f2f2f]">
          Plan your trips
        </h1>
        {user && (
          <UserMenu
            email={user.email}
            name={user.user_metadata?.name}
          />
        )}
      </div>

      {/* Content */}
      <div className="space-y-[20px]">
        {isLoading ? (
          <LoadingSkeleton />
        ) : nextTrip ? (
          <>
            {/* Featured next trip */}
            <NextTripCard trip={nextTrip} variant="mobile" />

            {/* Other upcoming trips */}
            {upcomingTrips.map(trip => (
              <SimpleTripCard key={trip.id} trip={trip} isShared={!trip.isOwner} />
            ))}
          </>
        ) : (
          <EmptyState onCreateTrip={onCreateTrip} />
        )}
      </div>
    </div>
  )
}

function MobileTripsView({
  trips,
  activeTab,
  onTabChange,
  onCreateTrip,
  user,
  isLoading
}: {
  trips: TripWithOwnership[]
  activeTab: TripTabValue
  onTabChange: (tab: TripTabValue) => void
  onCreateTrip: () => void
  user: User | null
  isLoading: boolean
}) {
  return (
    <>
      {/* Header area with tabs and add button */}
      <div className="flex items-center justify-between px-[15px] pt-[15px] pb-[20px]">
        <TripTabs activeTab={activeTab} onTabChange={onTabChange} />
        <div className="flex items-center gap-2">
          <button
            onClick={onCreateTrip}
            className="w-[36px] h-[36px] bg-black rounded-full flex items-center justify-center hover:bg-gray-800 transition-colors"
          >
            <Plus className="h-5 w-5 text-white" />
          </button>
          {user && (
            <UserMenu
              email={user.email}
              name={user.user_metadata?.name}
            />
          )}
        </div>
      </div>

      {/* Trip cards list */}
      <div className="flex-1 px-[15px] pb-[40px] space-y-[20px] overflow-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : trips.length > 0 ? (
          trips.map(trip => (
            <SimpleTripCard key={trip.id} trip={trip} isShared={!trip.isOwner} />
          ))
        ) : (
          <EmptyState onCreateTrip={onCreateTrip} />
        )}
      </div>
    </>
  )
}

function DesktopLayout({
  nextTrip,
  upcomingTrips,
  pastTrips,
  onCreateTrip,
  user,
  isLoading
}: {
  nextTrip: TripWithOwnership | undefined
  upcomingTrips: TripWithOwnership[]
  pastTrips: TripWithOwnership[]
  onCreateTrip: () => void
  user: User | null
  isLoading: boolean
}) {
  return (
    <div
      className="min-h-screen flex items-start justify-center overflow-auto rounded-[14px] px-[60px] py-[80px]"
      style={{ background: "linear-gradient(126deg, rgb(255, 251, 242) 0%, rgb(245, 249, 255) 100%)" }}
    >
      <div className="w-[1000px] flex flex-col gap-[40px] pb-[80px]">
        {/* User menu in top right */}
        {user && (
          <div className="flex justify-end">
            <UserMenu
              email={user.email}
              name={user.user_metadata?.name}
            />
          </div>
        )}

        {isLoading ? (
          <LoadingSkeletonDesktop />
        ) : (
          <>
            {/* Your next trip section */}
            {nextTrip && (
              <section className="flex flex-col gap-[20px]">
                <h2 className="text-[24px] font-bold text-[#292524]">
                  Your next trip
                </h2>
                <NextTripCard trip={nextTrip} variant="desktop" />
              </section>
            )}

            {/* Upcoming section */}
            <section className="flex flex-col gap-[20px]">
              <div className="flex items-center justify-between">
                <h2 className="text-[24px] font-bold text-[#262626]">
                  Upcoming
                </h2>
                <button
                  onClick={onCreateTrip}
                  className="flex items-center gap-[10px] bg-[#51a2ff] text-white px-[12px] py-[8px] rounded-[8px] hover:bg-[#4090e8] transition-colors"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-[16px] font-bold tracking-[-0.32px]">New trip</span>
                </button>
              </div>

              {upcomingTrips.length > 0 ? (
                <div className="grid grid-cols-3 gap-[20px]">
                  {upcomingTrips.map(trip => (
                    <SimpleTripCard key={trip.id} trip={trip} isShared={!trip.isOwner} />
                  ))}
                </div>
              ) : !nextTrip ? (
                <EmptyState onCreateTrip={onCreateTrip} />
              ) : (
                <p className="text-[#a1a1a1] text-center py-8">No other upcoming trips</p>
              )}
            </section>

            {/* Past trips section */}
            {pastTrips.length > 0 && (
              <section className="flex flex-col gap-[20px]">
                <h2 className="text-[24px] font-bold text-[#525252]">
                  Past trips
                </h2>
                <div className="grid grid-cols-3 gap-[20px]">
                  {pastTrips.map(trip => (
                    <SimpleTripCard key={trip.id} trip={trip} isShared={!trip.isOwner} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="text-center py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#f5f5f5] mb-4">
        <MapPin className="h-8 w-8 text-[#a1a1a1]" />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-[#0a0a0a]">No trips yet</h2>
      <p className="text-[#a1a1a1] mb-6">Create your first trip to get started</p>
      <button
        onClick={onCreateTrip}
        className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Create Trip
      </button>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-[20px]">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white border-[0.5px] border-[#e5e5e5] rounded-[15px] overflow-hidden"
        >
          {/* Image skeleton */}
          <div className="p-[5px]">
            <div className="h-[120px] rounded-[10px] bg-[#f5f5f5] animate-pulse" />
          </div>
          {/* Content skeleton */}
          <div className="px-[15px] pt-[10px] pb-[15px]">
            <div className="h-[22px] w-3/4 bg-[#f5f5f5] rounded animate-pulse" />
            <div className="h-[17px] w-1/2 bg-[#f5f5f5] rounded animate-pulse mt-[8px]" />
          </div>
        </div>
      ))}
    </div>
  )
}

function LoadingSkeletonDesktop() {
  return (
    <div className="flex flex-col gap-[40px]">
      {/* Featured trip skeleton */}
      <section className="flex flex-col gap-[20px]">
        <div className="h-[29px] w-[200px] bg-[#f5f5f5] rounded animate-pulse" />
        <div className="bg-white border-[0.5px] border-[#e5e5e5] rounded-[15px] h-[300px] animate-pulse" />
      </section>

      {/* Grid skeleton */}
      <section className="flex flex-col gap-[20px]">
        <div className="h-[29px] w-[150px] bg-[#f5f5f5] rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-[20px]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border-[0.5px] border-[#e5e5e5] rounded-[15px] overflow-hidden"
            >
              <div className="p-[5px]">
                <div className="h-[120px] rounded-[10px] bg-[#f5f5f5] animate-pulse" />
              </div>
              <div className="px-[15px] pt-[10px] pb-[15px]">
                <div className="h-[22px] w-3/4 bg-[#f5f5f5] rounded animate-pulse" />
                <div className="h-[17px] w-1/2 bg-[#f5f5f5] rounded animate-pulse mt-[8px]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
