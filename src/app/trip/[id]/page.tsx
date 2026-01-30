"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import {
  Plus,
  Trash2,
  MoreHorizontal,
  Edit2,
  ChevronDown,
  Plane,
  User,
  LogOut,
  Route,
  GripVertical,
  BedDouble,
  ExternalLink,
} from "lucide-react"
import { cn } from "@/lib/utils"
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult, optimizeRoute } from "@/lib/maps"
import { Coordinates } from "@/types"
import {
  Day,
  Activity,
  Location,
  Accommodation,
  AccommodationType,
  PlaceInfo,
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
  addAccommodation,
  updateAccommodation,
  deleteAccommodation,
  updateDayName,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  TripWithOwnership,
} from "@/lib/db"
import { useTrip, useRefreshTrip } from "@/lib/hooks/use-trips"
import { createClient } from "@/lib/supabase/client"
import { ShareDialog } from "@/components/trip/ShareDialog"
import { EditTripDialog } from "@/components/trip/EditTripDialog"
import { PackingList } from "@/components/trip/PackingList"
import { DayMap } from "@/components/maps/DayMap"
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
  const [selectedDayDate, setSelectedDayDate] = useState<string | null>(null)

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
  const [accommodationNameTouched, setAccommodationNameTouched] = useState(false)
  const [accommodationType, setAccommodationType] = useState<AccommodationType>("hotel")
  const [accommodationAddress, setAccommodationAddress] = useState("")
  const [accommodationCoordinates, setAccommodationCoordinates] = useState<Coordinates | undefined>()
  const [accommodationGooglePlaceId, setAccommodationGooglePlaceId] = useState<string | undefined>()
  const [accommodationCheckIn, setAccommodationCheckIn] = useState<Date | undefined>()
  const [accommodationCheckOut, setAccommodationCheckOut] = useState<Date | undefined>()
  const [accommodationLocationId, setAccommodationLocationId] = useState("")
  const [isCheckInOpen, setIsCheckInOpen] = useState(false)
  const [isCheckOutOpen, setIsCheckOutOpen] = useState(false)

  // Select first day by default when trip loads
  useEffect(() => {
    if (trip && !selectedDayDate) {
      const days = generateDaysFromTrip(trip)
      if (days.length > 0) {
        setSelectedDayDate(days[0].date)
      }
    }
  }, [trip, selectedDayDate])

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

  // Accommodation handlers
  const handleOpenAccommodationDialog = (accommodation?: Accommodation) => {
    if (accommodation) {
      setEditingAccommodation(accommodation)
      setAccommodationName(accommodation.name)
      setAccommodationNameTouched(true)
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
      setAccommodationNameTouched(false)
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
    if (!accommodationNameTouched) {
      setAccommodationName(place.name)
    }
    setAccommodationAddress(place.address)
    setAccommodationCoordinates(place.coordinates)
    setAccommodationGooglePlaceId(place.placeId)
  }

  const handleAccommodationNameChange = (value: string) => {
    setAccommodationName(value)
    setAccommodationNameTouched(true)
  }

  const getAccommodationSearchCenter = (): Coordinates | undefined => {
    if (accommodationLocationId && accommodationLocationId !== 'none') {
      const location = trip?.locations.find(l => l.id === accommodationLocationId)
      return location?.coordinates
    }
    return trip?.locations.find(l => l.coordinates)?.coordinates
  }

  const handleSaveAccommodation = async () => {
    if (!accommodationAddress || !accommodationCheckIn || !accommodationCheckOut) return

    // Use custom name if provided, otherwise fall back to the place name from search
    const finalName = accommodationName.trim() || accommodationAddress.split(',')[0]

    const data = {
      name: finalName,
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
            onSelectDay={setSelectedDayDate}
            selectedDayDate={selectedDayDate}
          />
        </div>
      </div>

      {/* Right Panel - Remaining width */}
      <div className="flex-1 border-t border-neutral-200 flex flex-col overflow-hidden">
        {selectedDayDate ? (
          <RightPanel
            trip={trip}
            selectedDayDate={selectedDayDate}
            onRefresh={refreshTrip}
            onOpenAccommodationDialog={handleOpenAccommodationDialog}
          />
        ) : (
          <div className="h-full flex items-center justify-center text-text-secondary">
            Select a day to view the map
          </div>
        )}
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
              <div className="grid grid-cols-7 gap-1.5 p-1 -m-1">
                {LOCATION_COLORS.map(color => (
                  <button
                    key={color.value}
                    type="button"
                    className={`aspect-square rounded-full transition-all ${color.value} ${
                      locationColor === color.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    }`}
                    onClick={() => setLocationColor(color.value)}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover open={isLocationStartOpen} onOpenChange={setIsLocationStartOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {locationStartDate ? (
                        locationStartDate.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
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
                    <button
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {locationEndDate ? (
                        locationEndDate.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
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
              <Button variant="secondary" size="small">Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="small" onClick={handleSaveLocation}>
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
              {editingAccommodation ? 'Edit Stay' : 'Add Stay'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Address <span className="text-destructive">*</span></label>
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-muted-foreground text-xs">(optional)</span></label>
              <Input
                placeholder="Defaults to location name"
                value={accommodationName}
                onChange={(e) => handleAccommodationNameChange(e.target.value)}
              />
            </div>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Check-in</label>
                <Popover open={isCheckInOpen} onOpenChange={setIsCheckInOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {accommodationCheckIn ? (
                        accommodationCheckIn.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
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
                    <button
                      type="button"
                      className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {accommodationCheckOut ? (
                        accommodationCheckOut.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
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
              <Button variant="secondary" size="small">Cancel</Button>
            </DialogClose>
            <Button variant="primary" size="small" onClick={handleSaveAccommodation} disabled={!accommodationAddress}>
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
          <button
            key={location.id}
            onClick={() => onOpenLocationDialog(location)}
            className="cursor-pointer"
          >
            <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
              {location.name}
            </Badge>
          </button>
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
  onDeleteAccommodation,
  onSelectDay,
  selectedDayDate
}: {
  activeTab: TabId
  trip: TripWithOwnership
  tripId: string
  onRefresh: () => Promise<void>
  onOpenAccommodationDialog: (accommodation?: Accommodation) => void
  onDeleteAccommodation: (id: string) => Promise<void>
  onSelectDay: (date: string) => void
  selectedDayDate: string | null
}) {
  // Local state for optimistic updates on packing items
  const [localPackingItems, setLocalPackingItems] = useState(trip.packingItems)

  // Sync local state when trip data changes (e.g., after add/delete)
  useEffect(() => {
    setLocalPackingItems(trip.packingItems)
  }, [trip.packingItems])

  switch (activeTab) {
    case 'itinerary':
      return <ItineraryPanel trip={trip} onRefresh={onRefresh} onSelectDay={onSelectDay} selectedDayDate={selectedDayDate} />
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
            packingItems={localPackingItems}
            onPackingItemsChange={setLocalPackingItems}
            onRefresh={onRefresh}
          />
        </div>
      )
    default:
      return null
  }
}

// Right Panel Component (Map + Activities)
function RightPanel({
  trip,
  selectedDayDate,
  onRefresh,
  onOpenAccommodationDialog
}: {
  trip: TripWithOwnership
  selectedDayDate: string
  onRefresh: () => Promise<void>
  onOpenAccommodationDialog: (accommodation?: Accommodation) => void
}) {
  const days = generateDaysFromTrip(trip)
  const dayIndex = days.findIndex(d => d.date === selectedDayDate)
  const day = days[dayIndex]
  const dayNumber = dayIndex + 1

  // Resizable map state
  const containerRef = useRef<HTMLDivElement>(null)
  const [mapHeight, setMapHeight] = useState(500) // Default 500px
  const [isResizing, setIsResizing] = useState(false)

  // Activity dialog state
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [hoveredActivityIndex, setHoveredActivityIndex] = useState<number | null>(null)

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Handle drag end for reordering activities
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const activities = day?.activities || []
      const oldIndex = activities.findIndex(a => a.id === active.id)
      const newIndex = activities.findIndex(a => a.id === over.id)

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = [...activities]
        const [removed] = reordered.splice(oldIndex, 1)
        reordered.splice(newIndex, 0, removed)
        await reorderActivities(trip.id, selectedDayDate, reordered.map(a => a.id))
        await onRefresh()
      }
    }
  }

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return
      const containerRect = containerRef.current.getBoundingClientRect()
      const newHeight = e.clientY - containerRect.top
      // Clamp between 200px and 500px
      setMapHeight(Math.min(500, Math.max(200, newHeight)))
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizing])

  // Activity form state
  const [activityTitle, setActivityTitle] = useState("")
  const [activityTitleTouched, setActivityTitleTouched] = useState(false)
  const [activityTime, setActivityTime] = useState("09:00")
  const [hasTime, setHasTime] = useState(false)
  const [activityDuration, setActivityDuration] = useState("")
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [activityNotes, setActivityNotes] = useState("")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("")
  const [addMode, setAddMode] = useState<'saved' | 'search'>('search')
  const [searchedPlace, setSearchedPlace] = useState<PlaceSearchResult | null>(null)

  if (!day) return null

  const location = day.locationId
    ? trip.locations.find(l => l.id === day.locationId)
    : null

  const date = parseLocalDate(day.date)
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthDay = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })
  const dayNumberPadded = String(dayNumber).padStart(2, '0')

  // Display name: use day name if set, otherwise location name, otherwise "Day X"
  const displayName = day.name || location?.name || `Day ${dayNumber}`
  const dayInfo = `Day ${dayNumberPadded}: ${dayOfWeek}, ${monthDay}`

  // Current accommodation for route optimization
  const currentAccommodation = trip.accommodations.find(a => {
    return selectedDayDate >= a.checkIn && selectedDayDate < a.checkOut
  })
  const hasAccommodationWithCoords = !!currentAccommodation?.coordinates
  const canOptimize = (hasAccommodationWithCoords && day.activities.length >= 2) || day.activities.length >= 3

  const presetDurations = ['15', '30', '45', '60', '90', '120', '180', '240']

  const handleOpenActivityDialog = (activity?: Activity) => {
    if (activity) {
      setEditingActivity(activity)
      setActivityTitle(activity.title)
      setActivityTitleTouched(true)
      setActivityTime(activity.time || "09:00")
      setHasTime(!!activity.time)
      const durationStr = activity.duration?.toString() || ""
      setActivityDuration(durationStr)
      setIsCustomDuration(durationStr !== "" && !presetDurations.includes(durationStr))
      setActivityNotes(activity.notes || "")
      setSelectedPlaceId(activity.savedPlaceId || "")
      setSearchedPlace(activity.place.googlePlaceId ? {
        placeId: activity.place.googlePlaceId,
        name: activity.place.name,
        address: activity.place.address,
        coordinates: activity.place.coordinates
      } : null)
      setAddMode(activity.savedPlaceId ? 'saved' : 'search')
    } else {
      setEditingActivity(null)
      setActivityTitle("")
      setActivityTitleTouched(false)
      setActivityTime("09:00")
      setHasTime(false)
      setActivityDuration("")
      setIsCustomDuration(false)
      setActivityNotes("")
      setSelectedPlaceId("")
      setSearchedPlace(null)
      setAddMode(trip.savedPlaces.length ? 'saved' : 'search')
    }
    setIsActivityOpen(true)
  }

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(trip.id, selectedDayDate, activityId)
    setIsActivityOpen(false)
    await onRefresh()
  }

  const handleRemoveTime = async (activity: Activity) => {
    await updateActivity(trip.id, selectedDayDate, activity.id, {
      time: '',
      duration: 0,
    })
    await onRefresh()
  }

  const handlePlaceSearchSelect = (place: PlaceSearchResult) => {
    setSearchedPlace(place)
    if (!activityTitleTouched) {
      setActivityTitle(place.name)
    }
  }

  const handleSavedPlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId)
    const savedPlace = trip.savedPlaces.find(p => p.id === placeId)
    if (savedPlace && !activityTitleTouched) {
      setActivityTitle(savedPlace.name)
    }
  }

  const handleActivityTitleChange = (value: string) => {
    setActivityTitle(value)
    setActivityTitleTouched(true)
  }

  const handleSaveActivity = async () => {
    let place: PlaceInfo
    let title = activityTitle

    if (addMode === 'saved' && selectedPlaceId) {
      const savedPlace = trip.savedPlaces.find(p => p.id === selectedPlaceId)
      if (!savedPlace) return
      place = {
        name: savedPlace.name,
        address: savedPlace.address,
        coordinates: savedPlace.coordinates,
        googlePlaceId: savedPlace.googlePlaceId
      }
      if (!title) title = savedPlace.name
    } else if (addMode === 'search' && searchedPlace) {
      place = {
        name: searchedPlace.name,
        address: searchedPlace.address,
        coordinates: searchedPlace.coordinates,
        googlePlaceId: searchedPlace.placeId
      }
      if (!title) title = searchedPlace.name
    } else {
      return
    }

    const data = {
      title,
      time: hasTime ? activityTime : undefined,
      duration: hasTime && activityDuration ? parseInt(activityDuration) : undefined,
      notes: activityNotes || undefined,
      savedPlaceId: addMode === 'saved' ? selectedPlaceId : undefined,
      place
    }

    if (editingActivity) {
      await updateActivity(trip.id, selectedDayDate, editingActivity.id, data)
    } else {
      await addActivity(trip.id, selectedDayDate, data)
    }
    setIsActivityOpen(false)
    setSearchedPlace(null)
    await onRefresh()
  }

  const handleOptimizeRoute = async () => {
    if (!day || !canOptimize) return

    const startingLocation = currentAccommodation?.coordinates

    setIsOptimizing(true)
    try {
      const optimizedOrder = await optimizeRoute(day.activities, startingLocation)
      if (optimizedOrder) {
        const reorderedIds = optimizedOrder.map(i => day.activities[i].id)
        await reorderActivities(trip.id, selectedDayDate, reorderedIds)
        await onRefresh()
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  return (
    <>
      <div ref={containerRef} className="flex flex-col h-full">
        {/* Map Panel - Resizable height */}
        <div
          className="flex-shrink-0"
          style={{ height: mapHeight }}
        >
          <DayMap activities={day.activities} hoveredIndex={hoveredActivityIndex} />
        </div>

        {/* Activities Panel - Takes remaining space */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Activities Header with Resize Handle */}
          <div className="relative p-3 flex items-center justify-between border-b border-neutral-200 flex-shrink-0 group">
            {/* Resize Handle - pill at top of header */}
            <div
              className="absolute top-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center"
              onMouseDown={handleMouseDown}
            >
              <div className={cn(
                "w-8 h-1 rounded-full bg-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity",
                isResizing && "opacity-100"
              )} />
            </div>
            <div className="flex flex-col">
              <span className="text-h2 text-text-primary">{displayName}</span>
              <span className="text-h3 text-text-secondary">{dayInfo}</span>
            </div>
            <div className="flex items-center gap-2">
              {canOptimize && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="secondary"
                        size="small"
                        leftIcon={<Route />}
                        onClick={handleOptimizeRoute}
                        disabled={isOptimizing}
                      >
                        {isOptimizing ? 'Optimizing...' : 'Optimize'}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Optimize activities to minimize travel distance</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              <Button
                variant="secondary"
                size="small"
                leftIcon={<Plus />}
                onClick={() => handleOpenActivityDialog()}
              >
                New activity
              </Button>
            </div>
          </div>

          {/* Activities List */}
          <div className="flex-1 overflow-auto">
            {/* Accommodation Row */}
            {currentAccommodation && (
              <div className="group py-3 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors">
                {/* Left: Bed icon + Name */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8] text-text-secondary">
                    <BedDouble />
                  </span>
                  <span className="text-h3 text-text-secondary">{currentAccommodation.name}</span>
                </div>
                {/* Right: Date range + External link */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-mono-regular text-text-secondary">
                    {(() => {
                      const checkIn = parseLocalDate(currentAccommodation.checkIn)
                      const checkOut = parseLocalDate(currentAccommodation.checkOut)
                      const monthFormat = new Intl.DateTimeFormat('en', { month: 'short' })
                      const inMonth = monthFormat.format(checkIn).toUpperCase()
                      const outMonth = monthFormat.format(checkOut).toUpperCase()
                      const inDay = checkIn.getDate()
                      const outDay = checkOut.getDate()
                      if (inMonth === outMonth) {
                        return `${inMonth} ${inDay}—${outDay}`
                      }
                      return `${inMonth} ${inDay}—${outMonth} ${outDay}`
                    })()}
                  </span>
                  {currentAccommodation.googlePlaceId && (
                    <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-200">
                      <NakedIconButton
                        icon={<ExternalLink />}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://www.google.com/maps/place/?q=place_id:${currentAccommodation.googlePlaceId}`, '_blank')
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {day.activities.length > 0 ? (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={day.activities.map(a => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {day.activities.map((activity, index) => (
                    <SortableActivityCard
                      key={activity.id}
                      activity={activity}
                      number={index + 1}
                      onMouseEnter={() => setHoveredActivityIndex(index)}
                      onMouseLeave={() => setHoveredActivityIndex(null)}
                      onEdit={() => handleOpenActivityDialog(activity)}
                      onRemoveTime={() => handleRemoveTime(activity)}
                      onDelete={() => handleDeleteActivity(activity.id)}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            ) : (
              <div className="p-4 text-body text-text-secondary">
                No activities planned for this day
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Activity Dialog */}
      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingActivity ? 'Edit Activity' : 'Add Activity'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Location <span className="text-destructive">*</span></label>
              {trip.savedPlaces.length > 0 ? (
                <Tabs value={addMode} onValueChange={(v) => setAddMode(v as typeof addMode)}>
                  <TabsList className="w-full">
                    <TabsTrigger value="search" className="flex-1">Search</TabsTrigger>
                    <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
                  </TabsList>
                  <TabsContent value="search" className="mt-2">
                    <PlaceSearch
                      onSelect={handlePlaceSearchSelect}
                      placeholder="Search Google Maps..."
                      centerLocation={location?.coordinates}
                    />
                    {searchedPlace && (
                      <div className="mt-2 p-2 rounded-md bg-muted">
                        <p className="font-medium text-sm">{searchedPlace.name}</p>
                        <p className="text-xs text-muted-foreground">{searchedPlace.address}</p>
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="saved" className="mt-2">
                    <Select value={selectedPlaceId} onValueChange={handleSavedPlaceSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a saved place" />
                      </SelectTrigger>
                      <SelectContent>
                        {trip.savedPlaces.map(place => (
                          <SelectItem key={place.id} value={place.id}>
                            {place.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TabsContent>
                </Tabs>
              ) : (
                <>
                  <PlaceSearch
                    onSelect={handlePlaceSearchSelect}
                    placeholder="Search Google Maps..."
                    centerLocation={location?.coordinates}
                  />
                  {searchedPlace && (
                    <div className="mt-2 p-2 rounded-md bg-muted">
                      <p className="font-medium text-sm">{searchedPlace.name}</p>
                      <p className="text-xs text-muted-foreground">{searchedPlace.address}</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Activity Name <span className="text-muted-foreground text-xs">(optional)</span></label>
              <Input
                placeholder="Defaults to location name"
                value={activityTitle}
                onChange={(e) => handleActivityTitleChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Time & Duration</label>
                <Switch
                  checked={hasTime}
                  onCheckedChange={setHasTime}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                  disabled={!hasTime}
                  className={!hasTime ? "text-muted-foreground disabled:opacity-100" : ""}
                />
                <Select
                  value={isCustomDuration ? 'custom' : activityDuration}
                  onValueChange={(val) => {
                    if (val === 'custom') {
                      setIsCustomDuration(true)
                      setActivityDuration('')
                    } else {
                      setIsCustomDuration(false)
                      setActivityDuration(val)
                    }
                  }}
                  disabled={!hasTime}
                >
                  <SelectTrigger className={!hasTime ? "text-muted-foreground disabled:opacity-100" : ""}>
                    <SelectValue placeholder="Duration" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 min</SelectItem>
                    <SelectItem value="30">30 min</SelectItem>
                    <SelectItem value="45">45 min</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasTime && isCustomDuration && (
                <Input
                  type="number"
                  placeholder="Enter duration in minutes"
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(e.target.value)}
                  autoFocus
                />
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Any additional notes..."
                value={activityNotes}
                onChange={(e) => setActivityNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className={editingActivity ? "flex justify-between sm:justify-between" : ""}>
            {editingActivity && (
              <Button
                variant="secondary"
                size="small"
                leftIcon={<Trash2 />}
                onClick={() => handleDeleteActivity(editingActivity.id)}
              >
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="secondary" size="small">Cancel</Button>
              </DialogClose>
              <Button
                variant="primary"
                size="small"
                onClick={handleSaveActivity}
                disabled={addMode === 'search' ? !searchedPlace : !selectedPlaceId}
              >
                {editingActivity ? 'Save' : 'Add Activity'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Sortable Activity Card Component (wrapper for drag-and-drop)
function SortableActivityCard({
  activity,
  number,
  onMouseEnter,
  onMouseLeave,
  onEdit,
  onRemoveTime,
  onDelete
}: {
  activity: Activity
  number: number
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onEdit?: () => void
  onRemoveTime?: () => void
  onDelete?: () => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: activity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  // Format time as XX:XX
  const formattedTime = activity.time || 'NO TIME'
  const hasTime = !!activity.time

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group py-4 px-4 border-b border-neutral-200 flex items-start justify-between hover:bg-neutral-100 transition-colors cursor-pointer",
        isDragging && "opacity-50 bg-neutral-100 shadow-lg z-50"
      )}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Left: Drag handle + Number + Details */}
      <div className="flex items-start">
        {/* Drag handle */}
        <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 group-hover:mr-2 transition-all duration-200 flex-shrink-0 -mt-1">
          <div {...attributes} {...listeners}>
            <NakedIconButton
              icon={<GripVertical />}
              className="cursor-grab active:cursor-grabbing touch-none"
            />
          </div>
        </div>
        {/* Numbered circle matching map markers */}
        <div className="w-5 h-5 rounded-full bg-neutral-800 text-white flex items-center justify-center text-mono-small font-medium flex-shrink-0">
          {number}
        </div>
        {/* Activity details */}
        <div className="flex flex-col ml-2">
          <span className="text-h3 text-text-primary">{activity.title}</span>
          <span className="text-body text-text-secondary">{activity.place?.address || 'No address'}</span>
        </div>
      </div>
      {/* Right: Time + Dropdown menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-mono-regular text-text-secondary">{formattedTime}</span>
        <DropdownMenu>
          <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 has-[[data-state=open]]:w-7 has-[[data-state=open]]:opacity-100 transition-all duration-200">
            <DropdownMenuTrigger asChild>
              <NakedIconButton
                icon={<MoreHorizontal />}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=open]:bg-neutral-200 focus-visible:ring-0"
              />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                Edit
              </DropdownMenuItem>
            )}
            {onRemoveTime && hasTime && (
              <DropdownMenuItem onClick={onRemoveTime}>
                Remove time
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Activity Card Component (non-sortable version)
function ActivityCard({
  activity,
  number,
  onMouseEnter,
  onMouseLeave,
  onEdit,
  onRemoveTime,
  onDelete
}: {
  activity: Activity
  number: number
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  onEdit?: () => void
  onRemoveTime?: () => void
  onDelete?: () => void
}) {
  // Format time as XX:XX
  const formattedTime = activity.time || 'NO TIME'
  const hasTime = !!activity.time

  return (
    <div
      className="group py-4 px-4 border-b border-neutral-200 flex items-start justify-between hover:bg-neutral-100 transition-colors cursor-pointer"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Left: Number + Details */}
      <div className="flex items-start gap-2">
        {/* Numbered circle matching map markers */}
        <div className="w-5 h-5 rounded-full bg-neutral-800 text-white flex items-center justify-center text-mono-small font-medium flex-shrink-0">
          {number}
        </div>
        {/* Activity details */}
        <div className="flex flex-col">
          <span className="text-h3 text-text-primary">{activity.title}</span>
          <span className="text-body text-text-secondary">{activity.place?.address || 'No address'}</span>
        </div>
      </div>
      {/* Right: Time + Dropdown menu */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-mono-regular text-text-secondary">{formattedTime}</span>
        <DropdownMenu>
          <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 has-[[data-state=open]]:w-7 has-[[data-state=open]]:opacity-100 transition-all duration-200">
            <DropdownMenuTrigger asChild>
              <NakedIconButton
                icon={<MoreHorizontal />}
                onClick={(e) => e.stopPropagation()}
                className="data-[state=open]:bg-neutral-200 focus-visible:ring-0"
              />
            </DropdownMenuTrigger>
          </div>
          <DropdownMenuContent align="end">
            {onEdit && (
              <DropdownMenuItem onClick={onEdit}>
                Edit
              </DropdownMenuItem>
            )}
            {onRemoveTime && hasTime && (
              <DropdownMenuItem onClick={onRemoveTime}>
                Remove time
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
              >
                Delete
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// Itinerary Panel Component
function ItineraryPanel({
  trip,
  onRefresh,
  onSelectDay,
  selectedDayDate
}: {
  trip: TripWithOwnership
  onRefresh: () => Promise<void>
  onSelectDay: (date: string) => void
  selectedDayDate: string | null
}) {
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
            onRefresh={onRefresh}
            onSelect={() => onSelectDay(day.date)}
            isSelected={day.date === selectedDayDate}
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
  tripId,
  onRefresh,
  onSelect,
  isSelected
}: {
  day: Day
  dayNumber: number
  location?: Location
  tripId: string
  onRefresh: () => Promise<void>
  onSelect: () => void
  isSelected: boolean
}) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [dayName, setDayName] = useState(day.name || '')

  const date = parseLocalDate(day.date)
  const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
  const dayOfMonth = String(date.getDate()).padStart(2, '0')
  const dayNumberPadded = String(dayNumber).padStart(2, '0')
  const hasActivities = day.activities.length > 0

  const handleSaveDayName = async () => {
    await updateDayName(tripId, day.date, dayName || undefined)
    setIsEditNameOpen(false)
    await onRefresh()
  }

  const handleBadgeClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDayName(day.name || '')
    setIsEditNameOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          "border-b border-neutral-200 p-4 hover:bg-neutral-100 transition-colors flex flex-col gap-3 cursor-pointer",
          isSelected && "bg-neutral-100"
        )}
        onClick={onSelect}
      >
        {/* Row 1: Badge + Day/Date */}
        <div className="flex items-center justify-between">
          {/* Left: Day Name Badge */}
          <button onClick={handleBadgeClick}>
            <Badge dotColor={location?.color || LOCATION_COLORS[0].value}>
              {day.name || `Day ${dayNumber}`}
            </Badge>
          </button>
          {/* Right: Day/Date combo */}
          <span className="text-mono-small text-text-secondary">
            DAY {dayNumberPadded}, {dayOfWeek.toUpperCase()} {dayOfMonth}
          </span>
        </div>

        {/* Row 2: Activities or Empty State */}
        {hasActivities ? (
          <div className="flex flex-col gap-1.5">
            {day.activities.map((activity) => (
              <ActivityRow key={activity.id} activity={activity} />
            ))}
          </div>
        ) : (
          <p className="text-body text-text-secondary">
            No activities planned
          </p>
        )}
      </div>

      {/* Edit Day Name Dialog */}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Day Name</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="e.g., Beach Day, Museum Tour"
              value={dayName}
              onChange={(e) => setDayName(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveDayName}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Activity Row Component
function ActivityRow({ activity }: { activity: Activity }) {
  return (
    <div className="flex items-center gap-3">
      {/* Time */}
      <span className="text-mono-regular text-text-secondary w-[41px] shrink-0 text-left">
        {activity.time || 'N/T'}
      </span>
      {/* Activity Name */}
      <span className="text-body text-text-primary truncate">
        {activity.title}
      </span>
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
