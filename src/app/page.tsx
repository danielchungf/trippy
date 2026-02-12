"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Plus, User as UserIcon, LogOut, CircleAlert } from "lucide-react"
import { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FormDialog } from "@/components/ui/form-dialog"
import { FormField } from "@/components/ui/form-field"
import { TextField } from "@/components/ui/text-field"
import { DateRangePickerField } from "@/components/ui/date-range-picker-field"
import { ColorPicker } from "@/components/ui/color-picker"
import { ImageUploadField } from "@/components/ui/image-upload-field"
import { getTripStatus, parseLocalDate, formatDateRange, getTripDuration } from "@/types"
import { TripWithOwnership, acceptPendingInvites } from "@/lib/db"
import { useTrips, useCreateTrip, tripKeys } from "@/lib/hooks/use-trips"
import { useRealtimeInvites } from "@/lib/hooks/use-realtime-invites"
import { useQueryClient } from "@tanstack/react-query"
import { useMediaQuery } from "@/hooks/use-media-query"
import { UserMenu } from "@/components/auth/UserMenu"
import { CalendarView } from "@/components/home/CalendarView"
import { createClient } from "@/lib/supabase/client"
import { uploadTripCoverImage, ImageUploadError } from "@/lib/storage/image-upload"
import { toast } from "sonner"
import type { User } from "@supabase/supabase-js"
import logo from "@/app/logo.png"

export default function HomePage() {
  const [desktopView, setDesktopView] = useState<'trips' | 'calendar'>('trips')
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTripName, setNewTripName] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [tripColor, setTripColor] = useState<string | undefined>()
  const [user, setUser] = useState<User | null>(null)
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null)
  const [coverImagePreview, setCoverImagePreview] = useState<string | undefined>()
  const [isUploading, setIsUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [coverImageFocusX, setCoverImageFocusX] = useState(0.5)
  const [coverImageFocusY, setCoverImageFocusY] = useState(0.5)
  const isDesktop = useMediaQuery("(min-width: 1024px)")

  // React Query hooks
  const queryClient = useQueryClient()
  const { data: trips = [], isLoading } = useTrips()
  const createTripMutation = useCreateTrip()

  // Subscribe to real-time invite notifications
  useRealtimeInvites(user?.email)

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    loadUser()
  }, [])

  // Check and accept any pending trip invites when user loads
  useEffect(() => {
    async function checkPendingInvites() {
      if (!user) return
      const acceptedCount = await acceptPendingInvites()
      if (acceptedCount > 0) {
        // Refetch trips to include newly accepted shared trips
        queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
        // Notify user about the new shared trip(s)
        toast.success(
          acceptedCount === 1
            ? "You were added to a shared trip!"
            : `You were added to ${acceptedCount} shared trips!`
        )
      }
    }

    checkPendingInvites()
  }, [user, queryClient])

  const handleFileSelect = (file: File) => {
    setUploadError(null)
    const objectUrl = URL.createObjectURL(file)
    setCoverImagePreview(objectUrl)
    setCoverImageFile(file)
    setCoverImageFocusX(0.5)
    setCoverImageFocusY(0.5)
  }

  const handleRemoveCoverImage = () => {
    setCoverImagePreview(undefined)
    setCoverImageFile(null)
  }

  const handleCreateOpenChange = (open: boolean) => {
    setIsCreateOpen(open)
    if (!open) {
      setNewTripName("")
      setDateRange(undefined)
      setTripColor(undefined)
      setCoverImageFile(null)
      setCoverImagePreview(undefined)
      setCoverImageFocusX(0.5)
      setCoverImageFocusY(0.5)
      setUploadError(null)
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
          // Update trip with cover image URL and focal point
          const { updateTrip } = await import("@/lib/db")
          await updateTrip(newTrip.id, {
            coverImage: coverImageUrl,
            coverImageFocusX,
            coverImageFocusY,
          })
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
      setCoverImageFocusX(0.5)
      setCoverImageFocusY(0.5)
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

  return (
    <div className="min-h-screen bg-white">
      {isDesktop ? (
        <DesktopLayout
          nextTrip={nextTrip}
          upcomingTrips={otherUpcomingTrips}
          pastTrips={pastTrips}
          allTrips={trips}
          onCreateTrip={() => setIsCreateOpen(true)}
          user={user}
          isLoading={isLoading}
          activeView={desktopView}
          onViewChange={setDesktopView}
        />
      ) : (
        <MobileHomeLayout
          nextTrip={nextTrip}
          upcomingTrips={otherUpcomingTrips}
          pastTrips={pastTrips}
          onCreateTrip={() => setIsCreateOpen(true)}
          user={user}
          isLoading={isLoading}
        />
      )}

      {/* Create Trip Dialog */}
      <FormDialog
        open={isCreateOpen}
        onOpenChange={handleCreateOpenChange}
        title="Create new trip"
        submitLabel="Create"
        onSubmit={handleCreateTrip}
        submitDisabled={!newTripName || !dateRange?.from || !dateRange?.to}
        loading={isUploading || createTripMutation.isPending}
        loadingLabel="Creating..."
      >
        <FormField label="Trip name">
          <TextField
            placeholder="e.g., Spring Trip to Japan"
            value={newTripName}
            onChange={(e) => setNewTripName(e.target.value)}
          />
        </FormField>

        <FormField label="Dates">
          <DateRangePickerField
            value={dateRange}
            onChange={setDateRange}
            numberOfMonths={isDesktop ? 2 : 1}
          />
        </FormField>

        <FormField label="Color">
          <ColorPicker value={tripColor} onChange={setTripColor} />
        </FormField>

        <FormField label="Cover image">
          <ImageUploadField
            previewUrl={coverImagePreview}
            focusX={coverImageFocusX}
            focusY={coverImageFocusY}
            onFocusChange={(x, y) => {
              setCoverImageFocusX(x)
              setCoverImageFocusY(y)
            }}
            onFileSelect={handleFileSelect}
            onRemove={handleRemoveCoverImage}
            error={uploadError ?? undefined}
          />
        </FormField>
      </FormDialog>
    </div>
  )
}

function MobileHomeLayout({
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
    <div className="flex flex-col min-h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between p-3 border-b border-border-muted">
        <div className="flex items-center">
          <Image src={logo} alt="Logo" width={20} height={20} />
        </div>
        <div className="flex items-center gap-2">
          {(nextTrip || upcomingTrips.length > 0 || pastTrips.length > 0) && (
            <Button
              onClick={onCreateTrip}
              variant="primary"
              size="small"
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
      </header>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {isLoading ? (
          <LoadingSkeleton />
        ) : (
          <div className="flex flex-col">
            {/* Next trip */}
            {nextTrip && (
              <section className="flex flex-col border-b border-border-muted">
                <SectionHeader>Your next trip</SectionHeader>
                <MobileNextTripCard trip={nextTrip} />
              </section>
            )}

            {/* Upcoming trips */}
            {upcomingTrips.length > 0 && (
              <section className="flex flex-col border-b border-border-muted">
                <SectionHeader>Upcoming trips</SectionHeader>
                {upcomingTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </section>
            )}

            {/* Past trips */}
            {pastTrips.length > 0 && (
              <section className="flex flex-col">
                <SectionHeader>Past trips</SectionHeader>
                {pastTrips.map(trip => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </section>
            )}

            {/* Empty state */}
            {!nextTrip && upcomingTrips.length === 0 && pastTrips.length === 0 && (
              <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <EmptyState onCreateTrip={onCreateTrip} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function DesktopLayout({
  nextTrip,
  upcomingTrips,
  pastTrips,
  allTrips,
  onCreateTrip,
  user,
  isLoading,
  activeView,
  onViewChange
}: {
  nextTrip: TripWithOwnership | undefined
  upcomingTrips: TripWithOwnership[]
  pastTrips: TripWithOwnership[]
  allTrips: TripWithOwnership[]
  onCreateTrip: () => void
  user: User | null
  isLoading: boolean
  activeView: 'trips' | 'calendar'
  onViewChange: (view: 'trips' | 'calendar') => void
}) {
  const userName = user?.user_metadata?.name?.split(' ')[0] || 'there'
  const hasTrips = !!nextTrip || upcomingTrips.length > 0 || pastTrips.length > 0

  // Random greeting subtitle - selected once on mount
  const [greeting] = useState(() => {
    const greetings = [
      "Ready to keep planning?",
      "Let's pick up where you left off.",
      "Where to next?",
      "Good to see you again.",
      "Let's make some plans.",
      "Where were we?",
      "Tick tock—adventure o'clock.",
      "Those plans won't plan themselves.",
    ]
    return greetings[Math.floor(Math.random() * greetings.length)]
  })

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      {/* Sidebar */}
      <HomeSidebar activeView={activeView} onViewChange={onViewChange} />

      {/* Main content */}
      <div className="flex-1 flex flex-col h-full border-t border-neutral-200 overflow-hidden">
        {activeView === 'trips' ? (
          <>
            {/* Header */}
            <header className="flex items-center justify-between p-3 border-b border-border-muted">
              <div className="flex flex-col">
                <h1 className="text-h1 text-text-primary">{hasTrips ? `Welcome back, ${userName}` : `Welcome, ${userName}`}</h1>
                <p className="text-h2 text-text-secondary">{hasTrips ? greeting : 'The time has come to plan your trips.'}</p>
              </div>
              {hasTrips && (
                <Button
                  onClick={onCreateTrip}
                  variant="primary"
                  size="small"
                  leftIcon={<Plus />}
                >
                  New trip
                </Button>
              )}
            </header>

            {/* Content area */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <LoadingSkeletonDesktop />
              ) : !hasTrips ? (
                <div className="flex items-center justify-center h-full">
                  <EmptyState onCreateTrip={onCreateTrip} />
                </div>
              ) : (
                <div className="flex h-full">
                  {/* Your next trip section - 580px fixed */}
                  {nextTrip && (
                    <section className="w-[580px] flex-shrink-0 flex flex-col h-full border-r border-border-muted">
                      <SectionHeader>Your next trip</SectionHeader>
                      <NextTripCard trip={nextTrip} />
                    </section>
                  )}

                  {/* Upcoming trips section */}
                  <section className="flex-1 flex flex-col border-r border-border-muted">
                    <SectionHeader>Upcoming trips</SectionHeader>
                    {upcomingTrips.length > 0 ? (
                      <div className="flex-1 overflow-auto flex flex-col">
                        {upcomingTrips.map(trip => (
                          <TripCard key={trip.id} trip={trip} />
                        ))}
                      </div>
                    ) : null}
                  </section>

                  {/* Past trips section */}
                  <section className="flex-1 flex flex-col">
                    <SectionHeader>Past trips</SectionHeader>
                    {pastTrips.length > 0 ? (
                      <div className="flex-1 overflow-auto flex flex-col">
                        {pastTrips.map(trip => (
                          <TripCard key={trip.id} trip={trip} />
                        ))}
                      </div>
                    ) : null}
                  </section>
                </div>
              )}
            </div>
          </>
        ) : (
          <CalendarView trips={allTrips} />
        )}
      </div>
    </div>
  )
}

function EmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <h2 className="text-h1 text-text-primary">No trips yet</h2>
      <p className="text-body text-text-tertiary">Create your first trip to get started</p>
      <Button
        onClick={onCreateTrip}
        variant="primary"
        size="small"
        className="mt-2"
      >
        Create trip
      </Button>
    </div>
  )
}

function HomeSidebar({
  activeView,
  onViewChange
}: {
  activeView: 'trips' | 'calendar'
  onViewChange: (view: 'trips' | 'calendar') => void
}) {
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

      {/* Middle: Empty for now */}
      <div className="flex-1" />

      {/* Bottom: User Menu */}
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <NakedIconButton icon={<UserIcon />} />
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

function SectionHeader({
  children,
  variant = "primary"
}: {
  children: React.ReactNode
  variant?: "primary" | "secondary"
}) {
  return (
    <h2
      className={`text-h2 px-[12px] py-[16px] ${
        variant === "primary" ? "text-text-primary" : "text-text-secondary"
      }`}
    >
      {children}
    </h2>
  )
}

// Get countdown text for trips (upcoming or past)
function getCountdownText(trip: TripWithOwnership): { text: string; type: 'upcoming' | 'ongoing' | 'past' } | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = parseLocalDate(trip.startDate)
  const end = parseLocalDate(trip.endDate)

  // Ongoing trip
  if (today >= start && today <= end) {
    return { text: 'NOW', type: 'ongoing' }
  }

  // Past trip
  if (today > end) {
    const diffDays = Math.ceil((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24))
    return { text: `${diffDays} DAY${diffDays === 1 ? '' : 'S'} AGO`, type: 'past' }
  }

  // Upcoming trip
  const diffDays = Math.ceil((start.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  return { text: `IN ${diffDays} DAY${diffDays === 1 ? '' : 'S'}`, type: 'upcoming' }
}

function CountdownBadge({ trip }: { trip: TripWithOwnership }) {
  const countdown = getCountdownText(trip)
  if (!countdown) return null

  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 bg-white px-[8px] py-[4px]">
      <span className="text-h3 font-bold text-text-primary">{countdown.text}</span>
    </div>
  )
}

function NextTripCard({ trip }: { trip: TripWithOwnership }) {
  const router = useRouter()
  const duration = getTripDuration(trip)
  const dateRangeText = `${formatDateRange(trip.startDate, trip.endDate)} (${duration} day${duration === 1 ? '' : 's'})`

  // Calculate stats
  const daysPlanned = trip.days?.filter(day => day.activities && day.activities.length > 0).length || 0
  const activitiesCount = trip.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0
  const placesSaved = trip.savedPlaces?.length || 0
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

  // Format number with leading zero for single digits
  const formatStat = (num: number) => num.toString().padStart(2, '0')

  return (
    <Link href={`/trip/${trip.id}`} className="flex flex-col h-full cursor-pointer">
      {/* Trip Image - full width, 320px height */}
      <div className="relative w-full h-[320px] flex-shrink-0">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${(trip.coverImageFocusX ?? 0.5) * 100}% ${(trip.coverImageFocusY ?? 0.5) * 100}%` }}
          />
        ) : (
          <div className="w-full h-full bg-neutral-300" />
        )}
        <CountdownBadge trip={trip} />
      </div>

      {/* Trip Header - title and dates */}
      <div className="p-[16px] text-center flex-shrink-0">
        <h3 className="text-h2 text-text-primary">{trip.name}</h3>
        <p className="text-h2 text-text-secondary">{dateRangeText}</p>
      </div>

      {/* Stats Grid - 2x2 quadrant */}
      <div className="flex-1 grid grid-cols-2 grid-rows-2 border-t border-border-muted">
        {/* Days Planned */}
        <div
          className="flex flex-col items-center justify-center gap-[8px] border-r border-b border-border-muted hover:bg-neutral-50 transition-colors cursor-pointer"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=itinerary`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(daysPlanned)}/{formatStat(duration)}</span>
          <span className="text-h3 text-text-secondary uppercase">Days Planned</span>
        </div>

        {/* Activities */}
        <div
          className="flex flex-col items-center justify-center gap-[8px] border-b border-border-muted hover:bg-neutral-50 transition-colors cursor-pointer"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=itinerary`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(activitiesCount)}</span>
          <span className="text-h3 text-text-secondary uppercase">Activities</span>
        </div>

        {/* Places Saved */}
        <div
          className="flex flex-col items-center justify-center gap-[8px] border-r border-border-muted hover:bg-neutral-50 transition-colors cursor-pointer"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=places`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(placesSaved)}</span>
          <span className="text-h3 text-text-secondary uppercase">Places Saved</span>
        </div>

        {/* Stays Logged */}
        <div className="flex flex-col items-center justify-center gap-[8px]">
          <span className="text-mono-large text-text-primary">{formatStat(staysLogged)}</span>
          <span className="text-h3 text-text-secondary uppercase">Stays Logged</span>
        </div>
      </div>

      {/* Missing Stays Warning - conditional */}
      {missingStays > 0 && (
        <div className="py-[16px] flex items-center justify-center gap-[8px] flex-shrink-0 border-t border-border-muted">
          <span className="w-4 h-4 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8] text-orange-400">
            <CircleAlert />
          </span>
          <span className="text-h3 text-orange-400 uppercase">
            {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
          </span>
        </div>
      )}
    </Link>
  )
}

// Trip card for upcoming/past trips sections
// 2 TripCards stacked = NextTrip image (320px) + title section (~82px)
// TripCard image = (320 - 82) / 2 = 119px
function TripCard({ trip }: { trip: TripWithOwnership }) {
  const duration = getTripDuration(trip)
  const dateRangeText = `${formatDateRange(trip.startDate, trip.endDate)} (${duration} day${duration === 1 ? '' : 's'})`

  return (
    <Link href={`/trip/${trip.id}`} className="flex flex-col cursor-pointer flex-shrink-0 border-b border-border-muted">
      {/* Trip Image with countdown badge - 119px height */}
      <div className="relative w-full h-[119px]">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${(trip.coverImageFocusX ?? 0.5) * 100}% ${(trip.coverImageFocusY ?? 0.5) * 100}%` }}
          />
        ) : (
          <div className="w-full h-full bg-neutral-300" />
        )}
        <CountdownBadge trip={trip} />
      </div>

      {/* Trip details - left aligned, same padding as NextTrip title section */}
      <div className="p-[16px]">
        <h3 className="text-h2 text-text-primary">{trip.name}</h3>
        <p className="text-h2 text-text-secondary">{dateRangeText}</p>
      </div>
    </Link>
  )
}

// Mobile version of NextTripCard — full-width with image, stats, and missing stays warning
function MobileNextTripCard({ trip }: { trip: TripWithOwnership }) {
  const router = useRouter()
  const duration = getTripDuration(trip)
  const dateRangeText = `${formatDateRange(trip.startDate, trip.endDate)} (${duration} day${duration === 1 ? '' : 's'})`

  const daysPlanned = trip.days?.filter(day => day.activities && day.activities.length > 0).length || 0
  const activitiesCount = trip.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0
  const placesSaved = trip.savedPlaces?.length || 0
  const staysLogged = trip.accommodations?.length || 0

  const tripNights = duration - 1
  let coveredNights = 0
  trip.accommodations?.forEach(acc => {
    const checkIn = parseLocalDate(acc.checkIn)
    const checkOut = parseLocalDate(acc.checkOut)
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24))
    coveredNights += nights
  })
  const missingStays = Math.max(0, tripNights - coveredNights)
  const formatStat = (num: number) => num.toString().padStart(2, '0')

  return (
    <Link href={`/trip/${trip.id}`} className="flex flex-col cursor-pointer">
      <div className="relative w-full h-[200px]">
        {trip.coverImage ? (
          <img
            src={trip.coverImage}
            alt={trip.name}
            className="w-full h-full object-cover"
            style={{ objectPosition: `${(trip.coverImageFocusX ?? 0.5) * 100}% ${(trip.coverImageFocusY ?? 0.5) * 100}%` }}
          />
        ) : (
          <div className="w-full h-full bg-neutral-300" />
        )}
        <CountdownBadge trip={trip} />
      </div>

      <div className="p-[16px] text-center">
        <h3 className="text-h2 text-text-primary">{trip.name}</h3>
        <p className="text-h2 text-text-secondary">{dateRangeText}</p>
      </div>

      <div className="grid grid-cols-2 grid-rows-2 border-t border-border-muted">
        <div
          className="flex flex-col items-center justify-center gap-[8px] py-[16px] border-r border-b border-border-muted"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=itinerary`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(daysPlanned)}/{formatStat(duration)}</span>
          <span className="text-h3 text-text-secondary uppercase">Days Planned</span>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-[8px] py-[16px] border-b border-border-muted"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=itinerary`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(activitiesCount)}</span>
          <span className="text-h3 text-text-secondary uppercase">Activities</span>
        </div>
        <div
          className="flex flex-col items-center justify-center gap-[8px] py-[16px] border-r border-border-muted"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); router.push(`/trip/${trip.id}?tab=places`) }}
        >
          <span className="text-mono-large text-text-primary">{formatStat(placesSaved)}</span>
          <span className="text-h3 text-text-secondary uppercase">Places Saved</span>
        </div>
        <div className="flex flex-col items-center justify-center gap-[8px] py-[16px]">
          <span className="text-mono-large text-text-primary">{formatStat(staysLogged)}</span>
          <span className="text-h3 text-text-secondary uppercase">Stays Logged</span>
        </div>
      </div>

      {missingStays > 0 && (
        <div className="py-[16px] flex items-center justify-center gap-[8px] border-t border-border-muted">
          <span className="w-4 h-4 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8] text-orange-400">
            <CircleAlert />
          </span>
          <span className="text-h3 text-orange-400 uppercase">
            {missingStays} night{missingStays === 1 ? '' : 's'} missing stay
          </span>
        </div>
      )}
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex flex-col">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border-b border-border-muted">
          <div className="h-[119px] bg-neutral-100 animate-pulse" />
          <div className="p-[16px]">
            <div className="h-[18px] w-3/4 bg-neutral-100 rounded animate-pulse" />
            <div className="h-[16px] w-1/2 bg-neutral-100 rounded animate-pulse mt-[8px]" />
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
