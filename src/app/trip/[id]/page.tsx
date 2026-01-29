"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  Plus,
  MapPin,
  Hotel,
  ChevronRight,
  Trash2,
  MoreHorizontal,
  Edit2,
  ChevronDown,
  Plane,
  User,
  LogOut,
  Users,
  Settings,
  Calendar as CalendarIcon,
  List,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult } from "@/lib/maps"
import { Coordinates } from "@/types"
import {
  Day,
  Activity,
  Location,
  Accommodation,
  AccommodationType,
  formatDate,
  formatDateRange,
  getTripDuration,
  generateDaysFromTrip,
  parseLocalDate,
  formatLocalDate,
  LOCATION_COLORS
} from "@/types"
import {
  addLocation,
  updateLocation,
  deleteLocation,
  addAccommodation,
  updateAccommodation,
  deleteAccommodation,
  updateDayName,
  TripWithOwnership,
} from "@/lib/db"
import { useTrip, useRefreshTrip } from "@/lib/hooks/use-trips"
import { createClient } from "@/lib/supabase/client"
import { ShareDialog } from "@/components/trip/ShareDialog"
import { EditTripDialog } from "@/components/trip/EditTripDialog"
import { PackingList } from "@/components/trip/PackingList"
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

  // React Query hook for trip data
  const { data: trip, isLoading } = useTrip(tripId)
  const refreshTrip = useRefreshTrip(tripId)

  const [activeTab, setActiveTab] = useState<TabId>('itinerary')

  // Location dialog state
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [locationName, setLocationName] = useState("")
  const [locationColor, setLocationColor] = useState<string>(LOCATION_COLORS[0].value)
  const [locationCoordinates, setLocationCoordinates] = useState<Coordinates | undefined>()
  const [locationGooglePlaceId, setLocationGooglePlaceId] = useState<string | undefined>()
  const [locationStartDate, setLocationStartDate] = useState<Date | undefined>()
  const [locationEndDate, setLocationEndDate] = useState<Date | undefined>()
  const [isLocationStartOpen, setIsLocationStartOpen] = useState(false)
  const [isLocationEndOpen, setIsLocationEndOpen] = useState(false)

  // Accommodation dialog state
  const [isAccommodationOpen, setIsAccommodationOpen] = useState(false)
  const [editingAccommodation, setEditingAccommodation] = useState<Accommodation | null>(null)
  const [accommodationName, setAccommodationName] = useState("")
  const [accommodationType, setAccommodationType] = useState<AccommodationType>("hotel")
  const [accommodationAddress, setAccommodationAddress] = useState("")
  const [accommodationCoordinates, setAccommodationCoordinates] = useState<Coordinates | undefined>()
  const [accommodationGooglePlaceId, setAccommodationGooglePlaceId] = useState<string | undefined>()
  const [accommodationCheckIn, setAccommodationCheckIn] = useState<Date | undefined>()
  const [accommodationCheckOut, setAccommodationCheckOut] = useState<Date | undefined>()
  const [accommodationLocationId, setAccommodationLocationId] = useState("")
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false)

  // Redirect if trip not found (after loading completes)
  if (!isLoading && !trip) {
    router.push('/')
    return null
  }

  // Location handlers
  const handleOpenLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location)
      setLocationName(location.name)
      setLocationColor(location.color || LOCATION_COLORS[0].value)
      setLocationCoordinates(location.coordinates)
      setLocationGooglePlaceId(location.googlePlaceId)
      setLocationStartDate(parseLocalDate(location.startDate))
      setLocationEndDate(parseLocalDate(location.endDate))
    } else {
      setEditingLocation(null)
      setLocationName("")
      const usedColors = trip?.locations.map(l => l.color) || []
      const nextColor = LOCATION_COLORS.find(c => !usedColors.includes(c.value))?.value || LOCATION_COLORS[0].value
      setLocationColor(nextColor)
      setLocationCoordinates(undefined)
      setLocationGooglePlaceId(undefined)
      setLocationStartDate(trip ? parseLocalDate(trip.startDate) : undefined)
      setLocationEndDate(trip ? parseLocalDate(trip.endDate) : undefined)
    }
    setIsLocationStartOpen(false)
    setIsLocationEndOpen(false)
    setIsLocationOpen(true)
  }

  const handleLocationSearchSelect = (place: PlaceSearchResult) => {
    setLocationName(place.name)
    setLocationCoordinates(place.coordinates)
    setLocationGooglePlaceId(place.placeId)
  }

  const handleSaveLocation = async () => {
    if (!locationName || !locationStartDate || !locationEndDate) return

    const startDateStr = formatLocalDate(locationStartDate)
    const endDateStr = formatLocalDate(locationEndDate)

    if (editingLocation) {
      await updateLocation(tripId, editingLocation.id, {
        name: locationName,
        color: locationColor,
        coordinates: locationCoordinates,
        googlePlaceId: locationGooglePlaceId,
        startDate: startDateStr,
        endDate: endDateStr
      })
    } else {
      await addLocation(tripId, {
        name: locationName,
        color: locationColor,
        coordinates: locationCoordinates,
        googlePlaceId: locationGooglePlaceId,
        startDate: startDateStr,
        endDate: endDateStr
      })
    }

    setIsLocationOpen(false)
    await refreshTrip()
  }

  const handleDeleteLocation = async (locationId: string) => {
    await deleteLocation(tripId, locationId)
    await refreshTrip()
  }

  // Accommodation handlers
  const handleOpenAccommodationDialog = (accommodation?: Accommodation) => {
    if (accommodation) {
      setEditingAccommodation(accommodation)
      setAccommodationName(accommodation.name)
      setAccommodationType(accommodation.type)
      setAccommodationAddress(accommodation.address)
      setAccommodationCoordinates(accommodation.coordinates)
      setAccommodationGooglePlaceId(accommodation.googlePlaceId)
      setAccommodationCheckIn(parseLocalDate(accommodation.checkIn))
      setAccommodationCheckOut(parseLocalDate(accommodation.checkOut))
      setAccommodationLocationId(accommodation.locationId || "")
    } else {
      setEditingAccommodation(null)
      setAccommodationName("")
      setAccommodationType("hotel")
      setAccommodationAddress("")
      setAccommodationCoordinates(undefined)
      setAccommodationGooglePlaceId(undefined)
      setAccommodationCheckIn(trip ? parseLocalDate(trip.startDate) : undefined)
      setAccommodationCheckOut(trip ? parseLocalDate(trip.endDate) : undefined)
      setAccommodationLocationId("")
    }
    setIsCheckInOpen(false)
    setIsCheckOutOpen(false)
    setIsAccommodationOpen(true)
  }

  const handleAccommodationSearchSelect = (place: PlaceSearchResult) => {
    setAccommodationName(place.name)
    setAccommodationAddress(place.address)
    setAccommodationCoordinates(place.coordinates)
    setAccommodationGooglePlaceId(place.placeId)
  }

  const getAccommodationSearchCenter = (): Coordinates | undefined => {
    if (accommodationLocationId && accommodationLocationId !== 'none') {
      const location = trip?.locations.find(l => l.id === accommodationLocationId)
      return location?.coordinates
    }
    return trip?.locations.find(l => l.coordinates)?.coordinates
  }

  const handleSaveAccommodation = async () => {
    if (!accommodationName || !accommodationCheckIn || !accommodationCheckOut) return

    const data = {
      name: accommodationName,
      type: accommodationType,
      address: accommodationAddress,
      coordinates: accommodationCoordinates,
      googlePlaceId: accommodationGooglePlaceId,
      checkIn: formatLocalDate(accommodationCheckIn),
      checkOut: formatLocalDate(accommodationCheckOut),
      locationId: accommodationLocationId && accommodationLocationId !== 'none' ? accommodationLocationId : undefined
    }

    if (editingAccommodation) {
      await updateAccommodation(tripId, editingAccommodation.id, data)
    } else {
      await addAccommodation(tripId, data)
    }

    setIsAccommodationOpen(false)
    await refreshTrip()
  }

  const handleDeleteAccommodation = async (accommodationId: string) => {
    await deleteAccommodation(tripId, accommodationId)
    await refreshTrip()
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
        <TripHeader
          trip={trip}
          tripId={tripId}
          duration={duration}
          onOpenLocationDialog={handleOpenLocationDialog}
          onRefresh={refreshTrip}
        />

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab Content */}
        <div className="flex-1 overflow-auto">
          <TabContent
            activeTab={activeTab}
            trip={trip}
            tripId={tripId}
            onRefresh={refreshTrip}
            onOpenAccommodationDialog={handleOpenAccommodationDialog}
            onDeleteAccommodation={handleDeleteAccommodation}
          />
        </div>
      </div>

      {/* Right Panel - Remaining width */}
      <div className="flex-1 border-t border-neutral-200">
        {/* Placeholder for map/activity details */}
        <div className="h-full flex items-center justify-center text-text-secondary">
          Right panel (map + activity details)
        </div>
      </div>

      {/* Location Dialog */}
      <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingLocation ? 'Edit Location' : 'Add Location'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">City/Area</label>
              <PlaceSearch
                onSelect={handleLocationSearchSelect}
                placeholder="Search for a city..."
              />
              {locationName && (
                <div className="mt-2 p-2 rounded-md bg-muted">
                  <p className="font-medium text-sm">{locationName}</p>
                  {locationCoordinates && (
                    <p className="text-xs text-muted-foreground">Location saved</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="space-y-2 p-1 -m-1">
                {[0, 1, 2].map(row => (
                  <div key={row} className="grid grid-cols-14 gap-1.5">
                    {LOCATION_COLORS.filter(c => c.row === row).map(color => (
                      <button
                        key={color.value}
                        type="button"
                        className={`aspect-square rounded-full transition-all ${
                          locationColor === color.value
                            ? 'ring-2 ring-offset-2 ring-primary'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color.value }}
                        onClick={() => setLocationColor(color.value)}
                        title={color.name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover open={isLocationStartOpen} onOpenChange={setIsLocationStartOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {locationStartDate ? (
                        locationStartDate.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={locationStartDate}
                      onSelect={(date) => {
                        setLocationStartDate(date)
                        setIsLocationStartOpen(false)
                      }}
                      disabled={(date) => {
                        const start = parseLocalDate(trip.startDate)
                        const end = parseLocalDate(trip.endDate)
                        return date < start || date > end
                      }}
                      defaultMonth={locationStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover open={isLocationEndOpen} onOpenChange={setIsLocationEndOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {locationEndDate ? (
                        locationEndDate.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={locationEndDate}
                      onSelect={(date) => {
                        setLocationEndDate(date)
                        setIsLocationEndOpen(false)
                      }}
                      disabled={(date) => {
                        const start = locationStartDate || parseLocalDate(trip.startDate)
                        const end = parseLocalDate(trip.endDate)
                        return date < start || date > end
                      }}
                      defaultMonth={locationEndDate || locationStartDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveLocation}>
              {editingLocation ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Accommodation Dialog */}
      <Dialog open={isAccommodationOpen} onOpenChange={setIsAccommodationOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingAccommodation ? 'Edit Accommodation' : 'Add Accommodation'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="e.g., Hotel Barcelona"
                value={accommodationName}
                onChange={(e) => setAccommodationName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type</label>
                <Select value={accommodationType} onValueChange={(v) => setAccommodationType(v as AccommodationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="airbnb">Airbnb</SelectItem>
                    <SelectItem value="hostel">Hostel</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                    <SelectItem value="friend">Friend</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {trip.locations.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Location</label>
                  <Select value={accommodationLocationId} onValueChange={setAccommodationLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select location" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {trip.locations.map(loc => (
                        <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Address</label>
              <PlaceSearch
                onSelect={handleAccommodationSearchSelect}
                placeholder="Search for accommodation..."
                centerLocation={getAccommodationSearchCenter()}
              />
              {accommodationAddress && (
                <div className="mt-2 p-2 rounded-md bg-muted">
                  <p className="font-medium text-sm">{accommodationName}</p>
                  <p className="text-xs text-muted-foreground">{accommodationAddress}</p>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check-in</label>
                <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {accommodationCheckIn ? (
                        accommodationCheckIn.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={accommodationCheckIn}
                      onSelect={(date) => {
                        setAccommodationCheckIn(date)
                        setIsCheckInOpen(false)
                      }}
                      disabled={(date) => {
                        const start = parseLocalDate(trip.startDate)
                        const end = parseLocalDate(trip.endDate)
                        return date < start || date > end
                      }}
                      defaultMonth={accommodationCheckIn}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Check-out</label>
                <Popover open={isCheckOutOpen} onOpenChange={setIsCheckOutOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {accommodationCheckOut ? (
                        accommodationCheckOut.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={accommodationCheckOut}
                      onSelect={(date) => {
                        setAccommodationCheckOut(date)
                        setIsCheckOutOpen(false)
                      }}
                      disabled={(date) => {
                        const start = accommodationCheckIn || parseLocalDate(trip.startDate)
                        const end = parseLocalDate(trip.endDate)
                        return date < start || date > end
                      }}
                      defaultMonth={accommodationCheckOut || accommodationCheckIn}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveAccommodation}>
              {editingAccommodation ? 'Save' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

// Trip Header Component
function TripHeader({
  trip,
  tripId,
  duration,
  onOpenLocationDialog,
  onRefresh
}: {
  trip: TripWithOwnership
  tripId: string
  duration: number
  onOpenLocationDialog: (location?: Location) => void
  onRefresh: () => Promise<void>
}) {
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
          <ShareDialog
            tripId={tripId}
            tripName={trip.name}
            isOwner={trip.isOwner}
          />
          <EditTripDialog
            tripId={tripId}
            tripName={trip.name}
            tripColor={trip.color}
            tripCoverImage={trip.coverImage}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
            isOwner={trip.isOwner}
            onUpdate={onRefresh}
          />
        </div>
      </div>

      {/* Row 2: Location Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        {trip.locations.map((location) => (
          <Badge key={location.id} dotColor={location.color || LOCATION_COLORS[0].value}>
            {location.name}
          </Badge>
        ))}
        <NakedIconButton
          icon={<Plus />}
          onClick={() => onOpenLocationDialog()}
        />
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
function TabContent({
  activeTab,
  trip,
  tripId,
  onRefresh,
  onOpenAccommodationDialog,
  onDeleteAccommodation
}: {
  activeTab: TabId
  trip: TripWithOwnership
  tripId: string
  onRefresh: () => Promise<void>
  onOpenAccommodationDialog: (accommodation?: Accommodation) => void
  onDeleteAccommodation: (id: string) => Promise<void>
}) {
  switch (activeTab) {
    case 'itinerary':
      return <ItineraryPanel trip={trip} onRefresh={onRefresh} />
    case 'stays':
      return (
        <StaysPanel
          trip={trip}
          onOpenAccommodationDialog={onOpenAccommodationDialog}
          onDeleteAccommodation={onDeleteAccommodation}
        />
      )
    case 'places':
      return (
        <div className="p-4 text-text-secondary">
          <Link href={`/trip/${tripId}/places`} className="text-blue-500 hover:underline">
            View {trip.savedPlaces.length} saved places →
          </Link>
        </div>
      )
    case 'packing':
      return (
        <div className="p-4">
          <PackingList
            tripId={tripId}
            packingItems={trip.packingItems}
            onRefresh={onRefresh}
          />
        </div>
      )
    default:
      return null
  }
}

// Itinerary Panel Component
function ItineraryPanel({ trip, onRefresh }: { trip: TripWithOwnership; onRefresh: () => Promise<void> }) {
  const days = generateDaysFromTrip(trip)

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
            tripId={trip.id}
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
  location,
  tripId
}: {
  day: Day
  dayNumber: number
  location?: Location
  tripId: string
}) {
  const formattedDate = formatDate(day.date)
  const hasActivities = day.activities.length > 0

  return (
    <Link href={`/trip/${tripId}/day/${day.date}`} className="block">
      <div className="border-b border-neutral-200 p-4 hover:bg-neutral-50 transition-colors">
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
    </Link>
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

// Stays Panel Component
function StaysPanel({
  trip,
  onOpenAccommodationDialog,
  onDeleteAccommodation
}: {
  trip: TripWithOwnership
  onOpenAccommodationDialog: (accommodation?: Accommodation) => void
  onDeleteAccommodation: (id: string) => Promise<void>
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3">Accommodations</h3>
        <Button variant="ghost" size="sm" onClick={() => onOpenAccommodationDialog()}>
          <Plus className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>

      {trip.accommodations.length === 0 ? (
        <p className="text-sm text-text-secondary text-center py-8">
          No accommodations added yet
        </p>
      ) : (
        <div className="space-y-2">
          {trip.accommodations.map(accommodation => {
            const location = trip.locations.find(l => l.id === accommodation.locationId)
            return (
              <div
                key={accommodation.id}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-neutral-50 group"
              >
                <div>
                  <p className="font-medium">{accommodation.name}</p>
                  <p className="text-xs text-text-secondary">
                    {accommodation.type} · {formatDateRange(accommodation.checkIn, accommodation.checkOut)}
                    {location && ` · ${location.name}`}
                  </p>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenAccommodationDialog(accommodation)}>
                      <Edit2 className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDeleteAccommodation(accommodation.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
