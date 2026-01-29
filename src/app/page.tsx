"use client"

import { useEffect, useState, useRef } from "react"
import { Plus, MapPin, ChevronDown, ImagePlus, X, Loader2 } from "lucide-react"
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
import { useTrips, useCreateTrip, tripKeys } from "@/lib/hooks/use-trips"
import { useQueryClient } from "@tanstack/react-query"
import { useMediaQuery } from "@/hooks/use-media-query"
import { TripTabs, TripTabValue } from "@/components/home/TripTabs"
import { MobileNavBar, MobileNavItem } from "@/components/home/MobileNavBar"
import { NextTripCard } from "@/components/home/NextTripCard"
import { SimpleTripCard } from "@/components/home/SimpleTripCard"
import { UserMenu } from "@/components/auth/UserMenu"
import { createClient } from "@/lib/supabase/client"
import { uploadTripCoverImage, ImageUploadError } from "@/lib/storage/image-upload"
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
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | undefined>()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  // React Query hooks
  const queryClient = useQueryClient()
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

  const handleFileSelect = (file: File) => {
    setUploadError(null)

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file type. Please upload a JPEG, PNG, or WebP image.")
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 5MB.")
      return
    }

    const objectUrl = URL.createObjectURL(file)
    setCoverImagePreview(objectUrl)
    setCoverImageFile(file)
  }

  const handleRemoveCoverImage = () => {
    setCoverImagePreview(undefined)
    setCoverImageFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleCreateTrip = async () => {
    if (!newTripName || !dateRange?.from || !dateRange?.to) return

    setIsUploading(true)
    setUploadError(null)

    try {
      // Create trip first to get the ID
      const newTrip = await createTripMutation.mutateAsync({
        name: newTripName,
        startDate: dateRange.from.toISOString().split('T')[0],
        endDate: dateRange.to.toISOString().split('T')[0],
        color: tripColor,
      })

      // Upload cover image if one was selected
      if (coverImageFile && newTrip) {
        try {
          const coverImageUrl = await uploadTripCoverImage(coverImageFile, newTrip.id)
          // Update trip with cover image URL
          const { updateTrip } = await import("@/lib/db")
          await updateTrip(newTrip.id, { coverImage: coverImageUrl })
          // Invalidate the trips cache so home page shows updated cover image
          await queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
        } catch (err) {
          console.error("Failed to upload cover image:", err)
          // Trip was created, just without cover image - don't block
        }
      }

      setNewTripName("")
      setDateRange(undefined)
      setTripColor(undefined)
      setCoverImageFile(null)
      setCoverImagePreview(undefined)
      setIsCreateOpen(false)
    } catch (err) {
      if (err instanceof ImageUploadError) {
        setUploadError(err.message)
      } else {
        setUploadError("Failed to create trip. Please try again.")
      }
    } finally {
      setIsUploading(false)
    }
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
          setCoverImageFile(null)
          setCoverImagePreview(undefined)
          setUploadError(null)
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
                  <button
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {dateRange?.from && dateRange?.to ? (
                      `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                    ) : (
                      <span className="text-muted-foreground">Select dates</span>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
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
              <div className="grid grid-cols-7 gap-1.5 p-1 -m-1">
                {LOCATION_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={`aspect-square rounded-full transition-all ${color.value} ${
                      tripColor === color.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    }`}
                    onClick={() => setTripColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cover Image <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div
                className={`relative rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
                onDrop={(e) => {
                  e.preventDefault()
                  setIsDragging(false)
                  const file = e.dataTransfer.files?.[0]
                  if (file) handleFileSelect(file)
                }}
              >
                {coverImagePreview ? (
                  <div className="relative">
                    <img
                      src={coverImagePreview}
                      alt="Cover preview"
                      className="w-full h-[120px] object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveCoverImage}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[120px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Click or drag to upload</span>
                    <span className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 5MB)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileSelect(file)
                  }}
                  className="hidden"
                />
              </div>
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleCreateTrip} disabled={isUploading || createTripMutation.isPending || !newTripName || !dateRange?.from || !dateRange?.to}>
              {isUploading || createTripMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Trip"
              )}
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
          <p className="text-text-tertiary">Calendar view coming soon</p>
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
        <h1 className="text-h1">
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
  // Check if there's only one trip (nextTrip exists but no other upcoming or past trips)
  const hasOnlyOneTrip = nextTrip && upcomingTrips.length === 0 && pastTrips.length === 0

  return (
    <div
      className="min-h-screen flex items-start justify-center overflow-auto rounded-[14px] px-[60px] py-[80px] bg-background"
    >
      <div className="w-[1000px] flex flex-col gap-[40px] pb-[80px]">
        {isLoading ? (
          <LoadingSkeletonDesktop />
        ) : (
          <>
            {/* Your next trip section */}
            {nextTrip && (
              <section className="flex flex-col gap-[20px]">
                <div className="flex items-center justify-between">
                  <h2 className="text-h1 text-text-primary">
                    Your next trip
                  </h2>
                  <div className="flex items-center gap-[8px]">
                    {hasOnlyOneTrip && (
                      <Button
                        onClick={onCreateTrip}
                        variant="primary"
                        size="medium"
                        leftIcon={<Plus />}
                      >
                        New trip
                      </Button>
                    )}
                    {user && (
                      <UserMenu
                        email={user.email}
                        name={user.user_metadata?.name}
                      />
                    )}
                  </div>
                </div>
                <NextTripCard trip={nextTrip} variant="desktop" />
              </section>
            )}

            {/* Upcoming section - hide if only one trip */}
            {!hasOnlyOneTrip && (
              <section className="flex flex-col gap-[20px]">
                <div className="flex items-center justify-between">
                  <h2 className="text-h1 text-text-primary">
                    Upcoming
                  </h2>
                  <div className="flex items-center gap-[12px]">
                    <Button
                      onClick={onCreateTrip}
                      variant="primary"
                      size="medium"
                      leftIcon={<Plus />}
                    >
                      New trip
                    </Button>
                    {!nextTrip && user && (
                      <UserMenu
                        email={user.email}
                        name={user.user_metadata?.name}
                      />
                    )}
                  </div>
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
                  <p className="text-text-tertiary text-center py-8">No other upcoming trips</p>
                )}
              </section>
            )}

            {/* Past trips section */}
            {pastTrips.length > 0 && (
              <section className="flex flex-col gap-[20px]">
                <h2 className="text-h1 text-text-secondary">
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
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-neutral-100 mb-4">
        <MapPin className="h-8 w-8 text-text-tertiary" />
      </div>
      <h2 className="text-h1 mb-2">No trips yet</h2>
      <p className="text-text-tertiary mb-6">Create your first trip to get started</p>
      <button
        onClick={onCreateTrip}
        className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition-colors text-h3 font-fustat"
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
          className="bg-white border-[0.5px] border-neutral-200 rounded-[15px] overflow-hidden"
        >
          {/* Image skeleton */}
          <div className="p-[5px]">
            <div className="h-[120px] rounded-[10px] bg-neutral-100 animate-pulse" />
          </div>
          {/* Content skeleton */}
          <div className="px-[15px] pt-[10px] pb-[15px]">
            <div className="h-[22px] w-3/4 bg-neutral-100 rounded animate-pulse" />
            <div className="h-[17px] w-1/2 bg-neutral-100 rounded animate-pulse mt-[8px]" />
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
        <div className="h-[29px] w-[200px] bg-neutral-100 rounded animate-pulse" />
        <div className="bg-white border-[0.5px] border-neutral-200 rounded-[15px] h-[300px] animate-pulse" />
      </section>

      {/* Grid skeleton */}
      <section className="flex flex-col gap-[20px]">
        <div className="h-[29px] w-[150px] bg-neutral-100 rounded animate-pulse" />
        <div className="grid grid-cols-3 gap-[20px]">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white border-[0.5px] border-neutral-200 rounded-[15px] overflow-hidden"
            >
              <div className="p-[5px]">
                <div className="h-[120px] rounded-[10px] bg-neutral-100 animate-pulse" />
              </div>
              <div className="px-[15px] pt-[10px] pb-[15px]">
                <div className="h-[22px] w-3/4 bg-neutral-100 rounded animate-pulse" />
                <div className="h-[17px] w-1/2 bg-neutral-100 rounded animate-pulse mt-[8px]" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
