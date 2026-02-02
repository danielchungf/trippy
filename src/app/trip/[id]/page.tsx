"use client"

import { useState, useEffect, useRef, useCallback, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
  DndContext,
  closestCenter,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
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
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plane,
  User,
  LogOut,
  Route,
  GripVertical,
  BedDouble,
  ExternalLink,
  ImageOff,
  MapPinCheck,
  Map,
  List,
  MapPin,
  LayoutGrid,
  ListOrdered,
  ScrollText,
  CalendarClock,
  // Category icons
  Soup,
  Coffee,
  ShoppingBag,
  Castle,
  Amphora,
  Shrub,
  Wine,
  Drama,
  Bubbles,
  Flower,
  type LucideIcon,
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
import { Checkbox } from "@/components/ui/checkbox"
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
  SavedPlace,
  PlaceCategory,
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
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace,
  updateDayName,
  addActivity,
  updateActivity,
  deleteActivity,
  reorderActivities,
  createActivityFromPlace,
  TripWithOwnership,
} from "@/lib/db"
import { useTrip, useRefreshTrip } from "@/lib/hooks/use-trips"
import { createClient } from "@/lib/supabase/client"
import { ShareDialog } from "@/components/trip/ShareDialog"
import { EditTripDialog } from "@/components/trip/EditTripDialog"
import { PackingList } from "@/components/trip/PackingList"
import { StayDrawer } from "@/components/trip/StayDrawer"
import { DayMap } from "@/components/maps/DayMap"
import { DestinationsMap } from "@/components/maps/DestinationsMap"
import { PlacePhoto } from "@/components/PlacePhoto"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { PlacesMap } from "@/components/maps/PlacesMap"
import logo from "@/app/logo.png"

// Tab types
type TabId = 'overview' | 'itinerary' | 'places' | 'packing'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'itinerary', label: 'ITINERARY' },
  { id: 'places', label: 'PLACES' },
  // { id: 'packing', label: 'PACKING' }, // TODO: Re-enable for post-MVP
]

// Category configuration with icons
const CATEGORY_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  food: { label: 'Food', icon: Soup },
  coffee: { label: 'Coffee', icon: Coffee },
  shopping: { label: 'Shopping', icon: ShoppingBag },
  sights: { label: 'Sights', icon: Castle },
  museums: { label: 'Museums', icon: Amphora },
  nature: { label: 'Nature', icon: Shrub },
  nightlife: { label: 'Nightlife', icon: Wine },
  entertainment: { label: 'Entertainment', icon: Drama },
  wellness: { label: 'Wellness', icon: Bubbles },
  other: { label: 'Other', icon: Flower },
  // Legacy categories for backwards compatibility
  see: { label: 'See', icon: Castle },
  do: { label: 'Do', icon: Drama },
  stay: { label: 'Stay', icon: BedDouble },
  shop: { label: 'Shop', icon: ShoppingBag },
}

export default function TripPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  // React Query hook for trip data
  const { data: trip, isLoading } = useTrip(tripId)
  const refreshTrip = useRefreshTrip(tripId)

  const [activeTab, setActiveTab] = useState<TabId>('overview')
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
  const [isSavingLocation, setIsSavingLocation] = useState(false)

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
  const [isSavingAccommodation, setIsSavingAccommodation] = useState(false)

  // Stay drawer state
  const [selectedStay, setSelectedStay] = useState<Accommodation | null>(null)
  const [isStayDrawerOpen, setIsStayDrawerOpen] = useState(false)

  // Place dialog state
  const [isPlaceOpen, setIsPlaceOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null)
  const [placeName, setPlaceName] = useState("")
  const [placeNameTouched, setPlaceNameTouched] = useState(false)
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory>("food")
  const [placeLocationId, setPlaceLocationId] = useState("")
  const [placeNotes, setPlaceNotes] = useState("")
  const [searchedPlace, setSearchedPlace] = useState<PlaceSearchResult | null>(null)
  const [isSavingPlace, setIsSavingPlace] = useState(false)

  // Place-to-day drag state
  const [draggingPlace, setDraggingPlace] = useState<SavedPlace | null>(null)
  const [assignedConfirmation, setAssignedConfirmation] = useState<{
    placeId: string
    dayName: string
    dayNumber: number
    dayDate: string
  } | null>(null)

  // Drag sensors for place-to-day
  const placeDragSensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Handle drag start for place-to-day
  const handlePlaceDragStart = (event: DragStartEvent) => {
    const placeId = event.active.id as string
    const place = trip?.savedPlaces.find(p => p.id === placeId)
    if (place) {
      setDraggingPlace(place)
    }
  }

  // Handle drag end for place-to-day
  const handlePlaceDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setDraggingPlace(null)

    if (!over || !trip) return

    const placeId = active.id as string
    const dayDate = over.id as string

    // Check if dropped on a day (day IDs are date strings like "2024-01-15")
    if (!dayDate.match(/^\d{4}-\d{2}-\d{2}$/)) return

    const place = trip.savedPlaces.find(p => p.id === placeId)
    if (!place) return

    // Find the day info for confirmation
    const days = generateDaysFromTrip(trip)
    const dayIndex = days.findIndex(d => d.date === dayDate)
    const day = days[dayIndex]

    if (!day) return

    // Create activity from place
    await addActivity(trip.id, dayDate, {
      title: place.name,
      place: {
        name: place.name,
        address: place.address,
        coordinates: place.coordinates,
        googlePlaceId: place.googlePlaceId,
      },
      savedPlaceId: place.id,
    })

    // Show confirmation on the place card
    setAssignedConfirmation({
      placeId: place.id,
      dayName: day.name || `Day ${dayIndex + 1}`,
      dayNumber: dayIndex + 1,
      dayDate: dayDate,
    })

    // Clear confirmation after 2 seconds
    setTimeout(() => {
      setAssignedConfirmation(null)
    }, 2000)

    await refreshTrip()
  }

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
    if (!locationName || !locationStartDate || !locationEndDate || isSavingLocation) return

    setIsSavingLocation(true)
    try {
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
    } finally {
      setIsSavingLocation(false)
    }
  }

  const handleDeleteLocation = async () => {
    if (!editingLocation) return

    await deleteLocation(tripId, editingLocation.id)
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

  // Handler for opening stay drawer (for viewing existing stays)
  const handleOpenStayDrawer = (accommodation: Accommodation) => {
    setSelectedStay(accommodation)
    setIsStayDrawerOpen(true)
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
    if (!accommodationAddress || !accommodationCheckIn || !accommodationCheckOut || isSavingAccommodation) return

    setIsSavingAccommodation(true)
    try {
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
        locationId: accommodationLocationId || undefined
      }

      if (editingAccommodation) {
        await updateAccommodation(tripId, editingAccommodation.id, data)
      } else {
        await addAccommodation(tripId, data)
      }

      setIsAccommodationOpen(false)
      await refreshTrip()
    } finally {
      setIsSavingAccommodation(false)
    }
  }

  const handleDeleteAccommodation = async (accommodationId: string) => {
    await deleteAccommodation(tripId, accommodationId)
    await refreshTrip()
  }

  // Place handlers
  const handleOpenPlaceDialog = (place?: SavedPlace) => {
    if (place) {
      setEditingPlace(place)
      setPlaceName(place.name)
      setPlaceNameTouched(true)
      setPlaceCategory(place.category as PlaceCategory)
      setPlaceLocationId(place.locationId || "")
      setPlaceNotes(place.notes || "")
      setSearchedPlace(place.googlePlaceId ? {
        placeId: place.googlePlaceId,
        name: place.name,
        address: place.address,
        coordinates: place.coordinates,
        photos: place.photos
      } : null)
    } else {
      setEditingPlace(null)
      setPlaceName("")
      setPlaceNameTouched(false)
      setPlaceCategory("food")
      setPlaceLocationId("")
      setPlaceNotes("")
      setSearchedPlace(null)
    }
    setIsPlaceOpen(true)
  }

  const handlePlaceSearchSelect = (place: PlaceSearchResult) => {
    setSearchedPlace(place)
    if (!placeNameTouched) {
      setPlaceName(place.name)
    }
  }

  const handlePlaceNameChange = (value: string) => {
    setPlaceName(value)
    setPlaceNameTouched(true)
  }

  const handleSavePlace = async () => {
    if (!searchedPlace || isSavingPlace) return

    setIsSavingPlace(true)
    try {
      const name = placeName || searchedPlace.name

      const data = {
        name,
        address: searchedPlace.address,
        coordinates: searchedPlace.coordinates,
        googlePlaceId: searchedPlace.placeId,
        category: placeCategory,
        locationId: placeLocationId && placeLocationId !== 'none' ? placeLocationId : undefined,
        notes: placeNotes || undefined,
        photos: searchedPlace.photos
      }

      if (editingPlace) {
        await updateSavedPlace(tripId, editingPlace.id, data)
      } else {
        await addSavedPlace(tripId, data)
      }

      setIsPlaceOpen(false)
      setSearchedPlace(null)
      await refreshTrip()
    } finally {
      setIsSavingPlace(false)
    }
  }

  const handleDeletePlace = async () => {
    if (!editingPlace) return
    await deleteSavedPlace(tripId, editingPlace.id)
    setIsPlaceOpen(false)
    setEditingPlace(null)
    await refreshTrip()
  }

  const handleDeletePlaceById = async (placeId: string) => {
    await deleteSavedPlace(tripId, placeId)
    await refreshTrip()
  }

  // Get center location for biasing place search results
  const getPlaceSearchCenter = (): Coordinates | undefined => {
    return trip?.locations.find(l => l.coordinates)?.coordinates
  }

  if (!trip) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const duration = getTripDuration(trip)

  // Content area based on active tab
  const tabContent = activeTab === 'places' ? (
    // Places tab: Full-width places panel
    <div className="flex-1 overflow-hidden">
      <PlacesRightPanel
        trip={trip}
        onOpenPlaceDialog={handleOpenPlaceDialog}
        onDeletePlace={handleDeletePlaceById}
        onRefresh={refreshTrip}
        assignedConfirmation={assignedConfirmation}
      />
    </div>
  ) : activeTab === 'itinerary' ? (
    // Itinerary tab: Two-panel layout
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* Left Panel - Itinerary list */}
      <ResizablePanel
        defaultSize="500px"
        minSize="420px"
        maxSize="580px"
        className="border-r border-neutral-200 flex flex-col overflow-hidden"
      >
        <div className="flex-1 overflow-auto">
          <ItineraryPanel
            trip={trip}
            onRefresh={refreshTrip}
            onSelectDay={setSelectedDayDate}
            selectedDayDate={selectedDayDate}
          />
        </div>
      </ResizablePanel>

      <ResizableHandle direction="horizontal" className="w-px bg-transparent focus:outline-none focus-visible:ring-0" />

      {/* Right Panel - Map + day activities */}
      <ResizablePanel className="flex flex-col overflow-hidden">
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
      </ResizablePanel>
    </ResizablePanelGroup>
  ) : (
    // Overview tab: Two-panel layout with destinations + map
    <OverviewPanel
      trip={trip}
      onOpenLocationDialog={handleOpenLocationDialog}
      onOpenAccommodationDialog={handleOpenAccommodationDialog}
      onOpenStayDrawer={handleOpenStayDrawer}
      onRefresh={refreshTrip}
    />
  )

  const mainContent = (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Trip Header with Tabs */}
      <TripHeader
        trip={trip}
        tripId={tripId}
        duration={duration}
        onRefresh={refreshTrip}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Tab Content Area */}
      {tabContent}
    </div>
  )

  return (
    <div className="h-screen bg-background flex overflow-hidden">
      {/* Sidebar */}
      <Sidebar onNavigateHome={() => router.push('/')} />

      {/* Main content - wrapped in DndContext when places tab is active */}
      {activeTab === 'places' ? (
        <DndContext
          sensors={placeDragSensors}
          collisionDetection={rectIntersection}
          onDragStart={handlePlaceDragStart}
          onDragEnd={handlePlaceDragEnd}
        >
          {mainContent}
          <DragOverlay dropAnimation={null}>
            {draggingPlace && (() => {
              const location = draggingPlace.locationId
                ? trip.locations.find(l => l.id === draggingPlace.locationId) ?? null
                : null
              const photoUrl = draggingPlace.photos?.[0]

              return (
                <div className="bg-white rounded-lg shadow-xl border border-neutral-300 w-64 overflow-hidden opacity-95">
                  {/* Photo */}
                  <div className="w-full aspect-video bg-neutral-100 flex items-center justify-center overflow-hidden">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={draggingPlace.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageOff className="w-6 h-6 text-text-secondary" strokeWidth={1.5} />
                    )}
                  </div>
                  {/* Content */}
                  <div className="p-3">
                    {location && (
                      <Badge dotColor={location.color || LOCATION_COLORS[0].value} className="mb-2">
                        {location.name}
                      </Badge>
                    )}
                    <p className="text-h3 text-text-primary truncate">{draggingPlace.name}</p>
                    <p className="text-body text-text-secondary truncate">{draggingPlace.address}</p>
                  </div>
                </div>
              )
            })()}
          </DragOverlay>
        </DndContext>
      ) : (
        mainContent
      )}

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
          <DialogFooter className="sm:!justify-between sm:!space-x-0">
            {editingLocation ? (
              <Button variant="secondary" size="small" onClick={handleDeleteLocation} className="mr-auto" leftIcon={<Trash2 />}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="secondary" size="small">Cancel</Button>
              </DialogClose>
              <Button variant="primary" size="small" onClick={handleSaveLocation} disabled={isSavingLocation}>
                {isSavingLocation ? 'Saving...' : (editingLocation ? 'Save' : 'Add')}
              </Button>
            </div>
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
              <label className="text-sm font-medium">Place <span className="text-destructive">*</span></label>
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
              <label className="text-sm font-medium">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="Defaults to location name"
                value={accommodationName}
                onChange={(e) => handleAccommodationNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Select value={accommodationLocationId} onValueChange={setAccommodationLocationId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a location" />
                </SelectTrigger>
                <SelectContent>
                  {trip.locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
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
            <Button variant="primary" size="small" onClick={handleSaveAccommodation} disabled={!accommodationAddress || isSavingAccommodation}>
              {isSavingAccommodation ? 'Saving...' : (editingAccommodation ? 'Save' : 'Add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stay Drawer */}
      <StayDrawer
        open={isStayDrawerOpen}
        onOpenChange={setIsStayDrawerOpen}
        tripId={tripId}
        accommodation={selectedStay}
        locations={trip.locations}
        onRefresh={refreshTrip}
        onEdit={handleOpenAccommodationDialog}
      />

      {/* Place Dialog */}
      <Dialog open={isPlaceOpen} onOpenChange={setIsPlaceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlace ? 'Edit Place' : 'New Place'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Place <span className="text-destructive">*</span></label>
              <PlaceSearch
                onSelect={handlePlaceSearchSelect}
                placeholder="Search for a place..."
                centerLocation={getPlaceSearchCenter()}
              />
              {searchedPlace && (
                <div className="mt-2 p-2 rounded-md bg-muted">
                  <p className="font-medium text-sm">{searchedPlace.name}</p>
                  <p className="text-xs text-muted-foreground">{searchedPlace.address}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="Defaults to place name"
                value={placeName}
                onChange={(e) => handlePlaceNameChange(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select value={placeCategory} onValueChange={(v) => setPlaceCategory(v as PlaceCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">Food</SelectItem>
                  <SelectItem value="coffee">Coffee</SelectItem>
                  <SelectItem value="shopping">Shopping</SelectItem>
                  <SelectItem value="sights">Sights</SelectItem>
                  <SelectItem value="museums">Museums</SelectItem>
                  <SelectItem value="nature">Nature</SelectItem>
                  <SelectItem value="nightlife">Nightlife</SelectItem>
                  <SelectItem value="entertainment">Entertainment</SelectItem>
                  <SelectItem value="wellness">Wellness</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {trip.locations.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Location <span className="text-muted-foreground font-normal">(optional)</span></label>
                <Select value={placeLocationId} onValueChange={setPlaceLocationId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Notes <span className="text-muted-foreground font-normal">(optional)</span></label>
              <Input
                placeholder="Any notes..."
                value={placeNotes}
                onChange={(e) => setPlaceNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="sm:!justify-between sm:!space-x-0">
            {editingPlace ? (
              <Button variant="secondary" size="small" onClick={handleDeletePlace} className="mr-auto" leftIcon={<Trash2 />}>
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <DialogClose asChild>
                <Button variant="secondary" size="small">Cancel</Button>
              </DialogClose>
              <Button variant="primary" size="small" onClick={handleSavePlace} disabled={!searchedPlace || isSavingPlace}>
                {isSavingPlace ? 'Saving...' : (editingPlace ? 'Save' : 'Add')}
              </Button>
            </div>
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

// Trip Header Component (with tabs)
function TripHeader({
  trip,
  tripId,
  duration,
  onRefresh,
  activeTab,
  onTabChange
}: {
  trip: TripWithOwnership
  tripId: string
  duration: number
  onRefresh: () => Promise<void>
  activeTab: TabId
  onTabChange: (tab: TabId) => void
}) {
  return (
    <header className="flex border-t border-b border-border-muted">
      {/* Left Section: Title + Dates + Buttons (500px fixed) */}
      <div className="w-[500px] shrink-0 p-3 flex items-center justify-between border-r border-border-muted">
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
            tripCoverImageFocusX={trip.coverImageFocusX}
            tripCoverImageFocusY={trip.coverImageFocusY}
            tripStartDate={trip.startDate}
            tripEndDate={trip.endDate}
            isOwner={trip.isOwner}
            onUpdate={onRefresh}
          />
        </div>
      </div>

      {/* Right Section: Tabs (fills remaining space) */}
      <div className="flex-1 flex items-center">
        <TabBar activeTab={activeTab} onTabChange={onTabChange} />
      </div>
    </header>
  )
}

// Tab Bar Component
function TabBar({ activeTab, onTabChange }: { activeTab: TabId; onTabChange: (tab: TabId) => void }) {
  return (
    <div className="flex w-full h-full">
      {TABS.map((tab, index) => {
        const isActive = activeTab === tab.id
        const prevIsActive = index > 0 && activeTab === TABS[index - 1].id
        const showDivider = !isActive && !prevIsActive && index > 0

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex-1 px-4 text-center font-inter text-[14px] font-medium leading-[18px] tracking-[-0.02em]
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

// Draggable Place Card Component
function DraggablePlaceCard({
  place,
  location,
  tripId,
  onOpenPlaceDialog,
  onRefresh,
  confirmation,
  isAssigned
}: {
  place: SavedPlace
  location: Location | null
  tripId: string
  onOpenPlaceDialog: (place: SavedPlace) => void
  onRefresh: () => Promise<void>
  confirmation: {
    placeId: string
    dayName: string
    dayNumber: number
    dayDate: string
  } | null
  isAssigned: boolean
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: place.id,
  })

  const categoryConfig = CATEGORY_CONFIG[place.category] || { label: place.category, icon: Flower }
  const CategoryIcon = categoryConfig.icon

  // Format confirmation date
  const confirmationDateFormatted = confirmation ? (() => {
    const date = parseLocalDate(confirmation.dayDate)
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'short' })
    const dayOfMonth = String(date.getDate()).padStart(2, '0')
    const dayNumberPadded = String(confirmation.dayNumber).padStart(2, '0')
    return `DAY ${dayNumberPadded}, ${dayOfWeek.toUpperCase()} ${dayOfMonth}`
  })() : null

  return (
    <div
      ref={setNodeRef}
      className="group/card border-r border-b border-neutral-200 overflow-hidden hover:bg-neutral-100 cursor-grab relative"
      {...listeners}
      {...attributes}
      onClick={() => onOpenPlaceDialog(place)}
    >
      {/* Confirmation Overlay */}
      {confirmation && (
        <div className="absolute inset-0 bg-white flex flex-col items-center justify-center z-10">
          <p className="text-body text-text-primary">Place assigned to</p>
          <p className="text-body text-text-primary">{confirmation.dayName}</p>
          <p className="text-mono-small text-text-secondary mt-2">{confirmationDateFormatted}</p>
        </div>
      )}

      {/* Photo */}
      <PlacePhoto
        googlePlaceId={place.googlePlaceId}
        selectedPhotoIndex={place.selectedPhotoIndex}
        alt={place.name}
        className="w-full aspect-video"
        placeholderIcon={<ImageOff className="w-8 h-8 text-text-secondary" strokeWidth={1.5} />}
        editable={{
          tripId,
          entityId: place.id,
          entityType: 'savedPlace',
          onRefresh
        }}
      />
      {/* Content */}
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {location && (
              <Badge dotColor={location.color || LOCATION_COLORS[0].value} className="group-hover/card:bg-neutral-100">
                {location.name}
              </Badge>
            )}
            <Badge icon={<CategoryIcon />} className="group-hover/card:bg-neutral-100">
              {categoryConfig.label}
            </Badge>
          </div>
          {isAssigned && (
            <div className="w-7 h-7 flex items-center justify-center rounded-lg border border-border-muted">
              <span className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25] text-text-secondary">
                <MapPinCheck />
              </span>
            </div>
          )}
        </div>
        <p className="text-h3 text-text-primary line-clamp-1">{place.name}</p>
        <p className="text-body text-text-secondary line-clamp-1">{place.address}</p>
      </div>
    </div>
  )
}

// Places Right Panel Component (Grid of place cards)
function PlacesRightPanel({
  trip,
  onOpenPlaceDialog,
  onDeletePlace,
  onRefresh,
  assignedConfirmation
}: {
  trip: TripWithOwnership
  onOpenPlaceDialog: (place?: SavedPlace) => void
  onDeletePlace: (placeId: string) => Promise<void>
  onRefresh: () => Promise<void>
  assignedConfirmation: {
    placeId: string
    dayName: string
    dayNumber: number
    dayDate: string
  } | null
}) {
  const [showMapView, setShowMapView] = useState(false)
  const [hoveredPlaceId, setHoveredPlaceId] = useState<string | null>(null)
  const [focusedPlaceId, setFocusedPlaceId] = useState<string | null>(null)

  // Location filter state - null means "all locations" (including places with no location)
  const [selectedLocationIds, setSelectedLocationIds] = useState<Set<string | null> | null>(null)

  // Assignment filter state
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'assigned' | 'not_assigned'>('all')

  // Get unique locations from places (including null for places without a location)
  const locationsInPlaces = useMemo(() => {
    const locationIds = new Set<string | null>()
    trip.savedPlaces.forEach(place => {
      locationIds.add(place.locationId ?? null)
    })
    return trip.locations.filter(loc => locationIds.has(loc.id))
  }, [trip.savedPlaces, trip.locations])

  // Check if any places have no location assigned
  const hasUnassignedPlaces = useMemo(() => {
    return trip.savedPlaces.some(place => !place.locationId)
  }, [trip.savedPlaces])

  // Category filter state - null means "all categories", otherwise single category selected
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Get unique categories from places
  const categoriesInPlaces = useMemo(() => {
    const categories = new Set<string>()
    trip.savedPlaces.forEach(place => {
      categories.add(place.category)
    })
    return Array.from(categories).sort()
  }, [trip.savedPlaces])

  // Get days to check assignment status
  const days = useMemo(() => generateDaysFromTrip(trip), [trip])

  // Check if a place is assigned to any day
  const isPlaceAssigned = useCallback((placeId: string) => {
    return days.some(day =>
      day.activities.some(activity => activity.savedPlaceId === placeId)
    )
  }, [days])

  // Filter places based on selected locations, categories, and assignment status
  const filteredPlaces = useMemo(() => {
    return trip.savedPlaces.filter(place => {
      // Location filter
      if (selectedLocationIds !== null) {
        const placeLocationId = place.locationId ?? null
        if (!selectedLocationIds.has(placeLocationId)) return false
      }
      // Category filter
      if (selectedCategory !== null) {
        if (place.category !== selectedCategory) return false
      }
      // Assignment filter
      if (assignmentFilter !== 'all') {
        const assigned = isPlaceAssigned(place.id)
        if (assignmentFilter === 'assigned' && !assigned) return false
        if (assignmentFilter === 'not_assigned' && assigned) return false
      }
      return true
    })
  }, [trip.savedPlaces, selectedLocationIds, selectedCategory, assignmentFilter, isPlaceAssigned])

  const filteredPlaceCount = filteredPlaces.length
  const totalPlaceCount = trip.savedPlaces.length

  // Toggle a location in the filter
  const toggleLocation = (locationId: string | null) => {
    setSelectedLocationIds(prev => {
      // If currently showing all, create a new set with all locations except the toggled one
      if (prev === null) {
        const allIds = new Set<string | null>(locationsInPlaces.map(l => l.id))
        if (hasUnassignedPlaces) allIds.add(null)
        allIds.delete(locationId)
        return allIds
      }
      // Toggle the location in the existing set
      const newSet = new Set(prev)
      if (newSet.has(locationId)) {
        newSet.delete(locationId)
      } else {
        newSet.add(locationId)
      }
      // If all are selected again, return null to indicate "all"
      const allCount = locationsInPlaces.length + (hasUnassignedPlaces ? 1 : 0)
      if (newSet.size === allCount) {
        return null
      }
      return newSet
    })
  }

  // Check if a location is selected
  const isLocationSelected = (locationId: string | null) => {
    if (selectedLocationIds === null) return true
    return selectedLocationIds.has(locationId)
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-neutral-200 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-h2 text-text-primary">Places</span>
          <span className="text-h3 text-text-secondary">
            {totalPlaceCount} {totalPlaceCount === 1 ? 'place' : 'places'} saved on this trip
          </span>
        </div>
        <div className="flex items-center gap-3">
          {/* Map/List Toggle - Segmented Control */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-neutral-200 bg-neutral-100">
            <button
              onClick={() => setShowMapView(false)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors [&>svg]:stroke-[2.25]",
                !showMapView
                  ? "bg-white text-text-primary shadow-sm"
                  : "bg-transparent text-text-secondary"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowMapView(true)}
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors [&>svg]:stroke-[2.25]",
                showMapView
                  ? "bg-white text-text-primary shadow-sm"
                  : "bg-transparent text-text-secondary"
              )}
            >
              <Map className="h-4 w-4" />
            </button>
          </div>
          <Button
            variant="secondary"
            size="small"
            leftIcon={<Plus />}
            onClick={() => onOpenPlaceDialog()}
          >
            New place
          </Button>
        </div>
      </div>

      {/* Content */}
      {showMapView ? (
        /* Map View with horizontal ResizablePanelGroup */
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* Left Panel - Filters + Places List */}
          <ResizablePanel
            defaultSize="500px"
            minSize="420px"
            maxSize="580px"
            className="border-r border-neutral-200 flex flex-col overflow-hidden"
          >
            {/* Filter Header */}
            <div className="p-3 flex items-center justify-between border-b border-neutral-200 flex-shrink-0">
              <div className="flex items-center gap-2">
              {/* Location Filter Dropdown */}
              <Popover>
                <PopoverTrigger asChild>
                  <button className="inline-flex items-center h-[32px] px-[8px] py-[6px] gap-[6px] rounded-[10px] border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 font-fustat font-bold text-[14px] leading-[10px] tracking-[-0.02em] transition-colors">
                    <span className="px-[2px]">Location</span>
                    <span className="w-[16px] h-[16px] flex-shrink-0">
                      <ChevronDown className="w-full h-full stroke-[2]" />
                    </span>
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2">
                  {/* Location checkboxes */}
                  <div className="flex flex-col gap-1">
                    {locationsInPlaces.map(location => (
                      <label
                        key={location.id}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isLocationSelected(location.id)}
                          onCheckedChange={() => toggleLocation(location.id)}
                        />
                        <span className="text-sm text-text-primary">{location.name}</span>
                      </label>
                    ))}
                    {hasUnassignedPlaces && (
                      <label
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                      >
                        <Checkbox
                          checked={isLocationSelected(null)}
                          onCheckedChange={() => toggleLocation(null)}
                        />
                        <span className="text-sm text-text-secondary italic">No location</span>
                      </label>
                    )}
                  </div>
                  {/* Divider */}
                  <div className="my-2 h-px bg-neutral-200" />
                  {/* Assignment radio options */}
                  <div className="flex flex-col gap-1">
                    <label
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                      onClick={() => setAssignmentFilter('all')}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        assignmentFilter === 'all' ? "border-neutral-800" : "border-neutral-300"
                      )}>
                        {assignmentFilter === 'all' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                      </span>
                      <span className="text-sm text-text-primary">All</span>
                    </label>
                    <label
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                      onClick={() => setAssignmentFilter('assigned')}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        assignmentFilter === 'assigned' ? "border-neutral-800" : "border-neutral-300"
                      )}>
                        {assignmentFilter === 'assigned' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                      </span>
                      <span className="text-sm text-text-primary">Assigned</span>
                    </label>
                    <label
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                      onClick={() => setAssignmentFilter('not_assigned')}
                    >
                      <span className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                        assignmentFilter === 'not_assigned' ? "border-neutral-800" : "border-neutral-300"
                      )}>
                        {assignmentFilter === 'not_assigned' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                      </span>
                      <span className="text-sm text-text-primary">Not assigned</span>
                    </label>
                  </div>
                </PopoverContent>
              </Popover>
              {/* Category Filter Dropdown */}
              <Select
                value={selectedCategory ?? "_all"}
                onValueChange={(value) => setSelectedCategory(value === "_all" ? null : value)}
              >
                <SelectTrigger
                  className={cn(
                    "w-auto h-[32px] px-[8px] py-[6px] gap-[6px] rounded-[10px] bg-white font-fustat font-bold text-[14px] leading-[10px] tracking-[-0.02em] transition-colors shadow-none focus:ring-0 [&>span]:line-clamp-none border",
                    selectedCategory === null && "border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                  )}
                  style={selectedCategory !== null ? { borderColor: '#FF591E', color: '#FF591E' } : undefined}
                >
                  <span>
                    {selectedCategory !== null
                      ? (CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory)
                      : "Category"}
                  </span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Categories</SelectItem>
                  {categoriesInPlaces.map(category => {
                    const config = CATEGORY_CONFIG[category] || { label: category, icon: Flower }
                    return (
                      <SelectItem key={category} value={category}>
                        {config.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              </div>
              {/* Places count */}
              <span className="text-mono-small text-text-secondary">
                {filteredPlaceCount}/{totalPlaceCount} PLACES
              </span>
            </div>

            {/* Scrollable Places List or Empty State */}
            <div className="flex-1 overflow-auto">
              {totalPlaceCount === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenPlaceDialog()}>
                    New place
                  </Button>
                </div>
              ) : (
                filteredPlaces.map(place => {
                  const location = place.locationId
                    ? trip.locations.find(l => l.id === place.locationId) ?? null
                    : null

                  return (
                    <PlaceCardMapView
                      key={place.id}
                      place={place}
                      location={location}
                      tripId={trip.id}
                      onEdit={() => onOpenPlaceDialog(place)}
                      onDelete={() => onDeletePlace(place.id)}
                      onHover={setHoveredPlaceId}
                      onClick={() => setFocusedPlaceId(place.id)}
                      onRefresh={onRefresh}
                    />
                  )
                })
              )}
            </div>
          </ResizablePanel>

          <ResizableHandle direction="horizontal" className="w-px bg-transparent focus:outline-none focus-visible:ring-0" />

          {/* Right Panel - Map or Empty State */}
          <ResizablePanel className="flex flex-col overflow-hidden">
            {totalPlaceCount === 0 ? (
              <div className="h-full bg-neutral-100 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-h2 text-text-primary">Nothing to show yet</span>
                  <span className="text-body text-text-secondary">Add places to reveal the map</span>
                </div>
              </div>
            ) : (
              <PlacesMap
                places={filteredPlaces}
                hoveredPlaceId={hoveredPlaceId}
                focusedPlaceId={focusedPlaceId}
              />
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      ) : (
        /* Grid View (original) */
        <div className="flex-1 flex flex-col min-h-0">
          {/* Filter Header */}
          <div className="p-3 flex items-center justify-between border-b border-neutral-200 flex-shrink-0">
            <div className="flex items-center gap-2">
            {/* Location Filter Dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <button className="inline-flex items-center h-[32px] px-[8px] py-[6px] gap-[6px] rounded-[10px] border border-neutral-200 bg-white text-neutral-800 hover:bg-neutral-50 font-fustat font-bold text-[14px] leading-[10px] tracking-[-0.02em] transition-colors">
                  <span className="px-[2px]">Location</span>
                  <span className="w-[16px] h-[16px] flex-shrink-0">
                    <ChevronDown className="w-full h-full stroke-[2]" />
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-2">
                {/* Location checkboxes */}
                <div className="flex flex-col gap-1">
                  {locationsInPlaces.map(location => (
                    <label
                      key={location.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                    >
                      <Checkbox
                        checked={isLocationSelected(location.id)}
                        onCheckedChange={() => toggleLocation(location.id)}
                      />
                      <span className="text-sm text-text-primary">{location.name}</span>
                    </label>
                  ))}
                  {hasUnassignedPlaces && (
                    <label
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                    >
                      <Checkbox
                        checked={isLocationSelected(null)}
                        onCheckedChange={() => toggleLocation(null)}
                      />
                      <span className="text-sm text-text-secondary italic">No location</span>
                    </label>
                  )}
                </div>
                {/* Divider */}
                <div className="my-2 h-px bg-neutral-200" />
                {/* Assignment radio options */}
                <div className="flex flex-col gap-1">
                  <label
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setAssignmentFilter('all')}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      assignmentFilter === 'all' ? "border-neutral-800" : "border-neutral-300"
                    )}>
                      {assignmentFilter === 'all' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                    </span>
                    <span className="text-sm text-text-primary">All</span>
                  </label>
                  <label
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setAssignmentFilter('assigned')}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      assignmentFilter === 'assigned' ? "border-neutral-800" : "border-neutral-300"
                    )}>
                      {assignmentFilter === 'assigned' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                    </span>
                    <span className="text-sm text-text-primary">Assigned</span>
                  </label>
                  <label
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-neutral-100 cursor-pointer"
                    onClick={() => setAssignmentFilter('not_assigned')}
                  >
                    <span className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0",
                      assignmentFilter === 'not_assigned' ? "border-neutral-800" : "border-neutral-300"
                    )}>
                      {assignmentFilter === 'not_assigned' && <span className="w-2 h-2 rounded-full bg-neutral-800" />}
                    </span>
                    <span className="text-sm text-text-primary">Not assigned</span>
                  </label>
                </div>
              </PopoverContent>
            </Popover>
            {/* Category Filter Dropdown */}
            <Select
              value={selectedCategory ?? "_all"}
              onValueChange={(value) => setSelectedCategory(value === "_all" ? null : value)}
            >
              <SelectTrigger
                className={cn(
                  "w-auto h-[32px] px-[8px] py-[6px] gap-[6px] rounded-[10px] bg-white font-fustat font-bold text-[14px] leading-[10px] tracking-[-0.02em] transition-colors shadow-none focus:ring-0 [&>span]:line-clamp-none border",
                  selectedCategory === null && "border-neutral-200 text-neutral-800 hover:bg-neutral-50"
                )}
                style={selectedCategory !== null ? { borderColor: '#FF591E', color: '#FF591E' } : undefined}
              >
                <span>
                  {selectedCategory !== null
                    ? (CATEGORY_CONFIG[selectedCategory]?.label || selectedCategory)
                    : "Category"}
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_all">All Categories</SelectItem>
                {categoriesInPlaces.map(category => {
                  const config = CATEGORY_CONFIG[category] || { label: category, icon: Flower }
                  return (
                    <SelectItem key={category} value={category}>
                      {config.label}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            </div>
            {/* Places count */}
            <span className="text-mono-small text-text-secondary">
              {filteredPlaceCount}/{totalPlaceCount} PLACES
            </span>
          </div>
          {/* Grid or Empty State */}
          <div className="flex-1 overflow-auto">
            {totalPlaceCount === 0 ? (
              <div className="h-full flex items-center justify-center">
                <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenPlaceDialog()}>
                  New place
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-3 min-[1000px]:grid-cols-4 min-[1250px]:grid-cols-5">
                {filteredPlaces.map(place => {
                  const location = place.locationId
                    ? trip.locations.find(l => l.id === place.locationId) ?? null
                    : null

                  const confirmation = assignedConfirmation?.placeId === place.id ? assignedConfirmation : null

                  return (
                    <DraggablePlaceCard
                      key={place.id}
                      place={place}
                      location={location}
                      tripId={trip.id}
                      onOpenPlaceDialog={onOpenPlaceDialog}
                      onRefresh={onRefresh}
                      confirmation={confirmation}
                      isAssigned={isPlaceAssigned(place.id)}
                    />
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Place card for map view (horizontal layout)
function PlaceCardMapView({
  place,
  location,
  tripId,
  onEdit,
  onDelete,
  onHover,
  onClick,
  onRefresh
}: {
  place: SavedPlace
  location: Location | null
  tripId: string
  onEdit: () => void
  onDelete: () => void
  onHover: (placeId: string | null) => void
  onClick: () => void
  onRefresh: () => Promise<void>
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null)

  // Measure content height and calculate photo dimensions (4:3 ratio)
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight
      setPhotoDimensions({
        width: Math.round(height * (4 / 3)),
        height: height
      })
    }
  }, [place, location])

  const categoryConfig = CATEGORY_CONFIG[place.category] || { label: place.category, icon: Flower }
  const CategoryIcon = categoryConfig.icon

  return (
    <div
      className="group flex hover:bg-neutral-50 transition-colors border-b border-neutral-200 cursor-pointer"
      onMouseEnter={() => onHover(place.id)}
      onMouseLeave={() => onHover(null)}
      onClick={onClick}
    >
      {/* Photo - dimensions explicitly set to match content height with 4:3 ratio */}
      <PlacePhoto
        googlePlaceId={place.googlePlaceId}
        selectedPhotoIndex={place.selectedPhotoIndex}
        alt={place.name}
        width={photoDimensions?.width ?? 0}
        height={photoDimensions?.height ?? 'auto'}
        editable={{
          tripId,
          entityId: place.id,
          entityType: 'savedPlace',
          onRefresh
        }}
      />

      {/* Content - 16px padding, 12px gap */}
      <div ref={contentRef} className="flex-1 min-w-0 flex flex-col justify-center p-4 gap-3">
        {/* Badges row: Location + Category with 8px gap */}
        <div className="flex items-center gap-2">
          {location && (
            <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
              {location.name}
            </Badge>
          )}
          <Badge icon={<CategoryIcon />}>
            {categoryConfig.label}
          </Badge>
        </div>
        <div className="flex flex-col">
          <span className="text-h3 text-text-primary truncate">{place.name}</span>
          {place.address && (
            <span className="text-body text-text-secondary truncate">
              {place.address}
            </span>
          )}
        </div>
      </div>

      {/* Dropdown menu - animated on hover */}
      <div className="flex items-center pr-4">
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
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit() }}>
              <Edit2 className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete() }}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
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

  // Filter saved places not already scheduled for this day
  // Hide if: linked via savedPlaceId OR same googlePlaceId
  const unscheduledSavedPlaces = useMemo(() =>
    trip.savedPlaces.filter(
      place => !day?.activities.some(a =>
        a.savedPlaceId === place.id ||
        (place.googlePlaceId && a.place.googlePlaceId === place.googlePlaceId)
      )
    ),
    [trip.savedPlaces, day?.activities]
  )

  // Handler to add saved place as activity from map
  const handleAddSavedPlaceFromMap = async (placeId: string) => {
    await createActivityFromPlace(trip.id, selectedDayDate, placeId)
    await onRefresh()
  }

  // Edit day name state
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [dayName, setDayName] = useState("")

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

  // Display name: use custom day name if set, otherwise "Day X"
  const displayName = day.name || `Day ${dayNumber}`
  const dayInfo = `${dayOfWeek}, ${monthDay}`

  // Departing accommodation (checking out this day) - shown at top
  const departingAccommodation = trip.accommodations.find(a => a.checkOut === selectedDayDate)
  // Staying accommodation (checking in or staying that night) - shown at bottom
  const stayingAccommodation = trip.accommodations.find(a => {
    return selectedDayDate >= a.checkIn && selectedDayDate < a.checkOut
  })
  // For route optimization, prefer departing accommodation as starting point
  const routeStartAccommodation = departingAccommodation || stayingAccommodation
  const hasAccommodationWithCoords = !!routeStartAccommodation?.coordinates
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
      setAddMode('search')
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
        googlePlaceId: searchedPlace.placeId,
        photos: searchedPlace.photos
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

    const startingLocation = routeStartAccommodation?.coordinates

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

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDayName(day.name || '')
    setIsEditNameOpen(true)
  }

  const handleSaveDayName = async () => {
    await updateDayName(trip.id, day.date, dayName || undefined)
    setIsEditNameOpen(false)
    await onRefresh()
  }

  return (
    <>
      <div ref={containerRef} className="flex flex-col h-full">
        {/* Map Panel - Resizable height */}
        <div
          className="flex-shrink-0"
          style={{ height: mapHeight }}
        >
          <DayMap
              activities={day.activities}
              hoveredIndex={hoveredActivityIndex}
              savedPlaces={unscheduledSavedPlaces}
              onAddPlaceAsActivity={handleAddSavedPlaceFromMap}
              locationCenter={location?.coordinates}
            />
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
              <div className="flex items-center gap-2">
                <span className="text-h2 text-text-primary">{displayName}</span>
                <button
                  onClick={handleEditClick}
                  className="w-4 h-4 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Edit2 className="w-3 h-3 stroke-[2]" />
                </button>
              </div>
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
            {/* Departing Accommodation Row (checking out today) */}
            {departingAccommodation && (
              <div className="group py-3 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors">
                {/* Left: Bed icon + Name */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8] text-text-secondary">
                    <BedDouble />
                  </span>
                  <span className="text-h3 text-text-secondary">{departingAccommodation.name}</span>
                </div>
                {/* Right: Date range + External link */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-mono-regular text-text-secondary">
                    {(() => {
                      const checkIn = parseLocalDate(departingAccommodation.checkIn)
                      const checkOut = parseLocalDate(departingAccommodation.checkOut)
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
                  {departingAccommodation.googlePlaceId && (
                    <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-200">
                      <NakedIconButton
                        icon={<ExternalLink />}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://www.google.com/maps/place/?q=place_id:${departingAccommodation.googlePlaceId}`, '_blank')
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
            ) : !(departingAccommodation || stayingAccommodation) ? (
              <div className="h-full flex items-center justify-center">
                <Button
                  variant="secondary"
                  size="small"
                  leftIcon={<Plus />}
                  onClick={() => handleOpenActivityDialog()}
                >
                  New activity
                </Button>
              </div>
            ) : null}

            {/* Staying Accommodation Row (checking in or staying tonight) */}
            {stayingAccommodation && (
              <div className={cn("group py-3 px-4 border-b border-neutral-200 flex items-center justify-between bg-neutral-50 hover:bg-neutral-100 transition-colors", day.activities.length > 0 && "border-t")}>
                {/* Left: Bed icon + Name */}
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 flex-shrink-0 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.8] text-text-secondary">
                    <BedDouble />
                  </span>
                  <span className="text-h3 text-text-secondary">{stayingAccommodation.name}</span>
                </div>
                {/* Right: Date range + External link */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-mono-regular text-text-secondary">
                    {(() => {
                      const checkIn = parseLocalDate(stayingAccommodation.checkIn)
                      const checkOut = parseLocalDate(stayingAccommodation.checkOut)
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
                  {stayingAccommodation.googlePlaceId && (
                    <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 transition-all duration-200">
                      <NakedIconButton
                        icon={<ExternalLink />}
                        onClick={(e) => {
                          e.stopPropagation()
                          window.open(`https://www.google.com/maps/place/?q=place_id:${stayingAccommodation.googlePlaceId}`, '_blank')
                        }}
                      />
                    </div>
                  )}
                </div>
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

      {/* Edit Day Name Dialog */}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Day Name</DialogTitle>
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
        <div className="overflow-hidden w-0 opacity-0 group-hover:w-7 group-hover:opacity-100 group-hover:mr-2 transition-all duration-200 flex-shrink-0 -mt-1 -ml-1">
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
  const [viewMode, setViewMode] = useState<'list' | 'timeline'>('list')

  // Persist view mode preference
  useEffect(() => {
    const saved = localStorage.getItem('piper_itinerary_view')
    if (saved === 'list' || saved === 'timeline') {
      setViewMode(saved)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('piper_itinerary_view', viewMode)
  }, [viewMode])

  const days = generateDaysFromTrip(trip)

  const getLocationForDay = (day: Day): Location | undefined => {
    return trip.locations.find(loc => loc.id === day.locationId)
  }

  // Calculate total activities
  const totalActivities = days.reduce((sum, day) => sum + day.activities.length, 0)
  const totalDays = days.length

  // When no activities, always use compact view
  const effectiveViewMode = totalActivities === 0 ? 'list' : viewMode

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 flex items-center justify-between border-b border-neutral-200 flex-shrink-0">
        <div className="flex flex-col">
          <span className="text-h2 text-text-primary">Itinerary</span>
          <span className="text-h3 text-text-secondary">
            {totalActivities} {totalActivities === 1 ? 'activity' : 'activities'} across {totalDays} {totalDays === 1 ? 'day' : 'days'}
          </span>
        </div>
        {/* Only show view toggle when there are activities */}
        {totalActivities > 0 && (
          <div className="flex items-center gap-3">
            {/* View Toggle - Segmented Control */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg border border-neutral-200 bg-neutral-100">
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors [&>svg]:stroke-[2.25]",
                  viewMode === 'list'
                    ? "bg-white text-text-primary shadow-sm"
                    : "bg-transparent text-text-secondary"
                )}
              >
                <ListOrdered className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('timeline')}
                className={cn(
                  "flex items-center justify-center w-7 h-7 rounded-[6px] transition-colors [&>svg]:stroke-[2.25]",
                  viewMode === 'timeline'
                    ? "bg-white text-text-primary shadow-sm"
                    : "bg-transparent text-text-secondary"
                )}
              >
                <ScrollText className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Day Cards */}
      <div className="flex-1 overflow-auto">
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
              viewMode={effectiveViewMode}
            />
          )
        })}
      </div>
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
  isSelected,
  viewMode
}: {
  day: Day
  dayNumber: number
  location?: Location
  tripId: string
  onRefresh: () => Promise<void>
  onSelect: () => void
  isSelected: boolean
  viewMode: 'list' | 'timeline'
}) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [dayName, setDayName] = useState(day.name || '')

  const date = parseLocalDate(day.date)
  const dayOfWeekLong = date.toLocaleDateString('en-US', { weekday: 'long' })
  const monthName = date.toLocaleDateString('en-US', { month: 'long' })
  const dayOfMonthNum = date.getDate()
  const activityCount = day.activities.length

  // Badge always shows date format
  const badgeLabel = `${monthName} ${dayOfMonthNum}, ${dayOfWeekLong}`
  // Day name shows custom name or "Day X"
  const displayDayName = day.name || `Day ${dayNumber}`

  const handleSaveDayName = async () => {
    await updateDayName(tripId, day.date, dayName || undefined)
    setIsEditNameOpen(false)
    await onRefresh()
  }

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDayName(day.name || '')
    setIsEditNameOpen(true)
  }

  return (
    <>
      <div
        className={cn(
          "group border-b border-neutral-200 p-4 hover:bg-neutral-100 transition-colors flex flex-col cursor-pointer",
          isSelected && "bg-neutral-100"
        )}
        onClick={onSelect}
      >
        {/* Row 1: Badge (date only, not editable) */}
        <div className="flex items-center">
          <Badge dotColor={location?.color || LOCATION_COLORS[0].value} truncate>
            {badgeLabel}
          </Badge>
        </div>

        {/* Row 2: Day Name + Edit Icon */}
        <div className="flex items-center gap-2 mt-2">
          <span className="text-h3 text-text-primary">{displayDayName}</span>
          <button
            onClick={handleEditClick}
            className="w-3 h-3 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors opacity-0 group-hover:opacity-100"
          >
            <Edit2 className="w-3 h-3 stroke-[2]" />
          </button>
        </div>

        {/* Row 3: Activities (detailed) or Activity Count (compact) */}
        {viewMode === 'timeline' ? (
          // Detailed view: show activities list
          activityCount > 0 ? (
            <div className="flex flex-col gap-1.5 mt-3">
              {day.activities.map((activity) => (
                <ActivityRow key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <p className="text-body text-text-secondary mt-3">
              No activities planned
            </p>
          )
        ) : (
          // Compact view: show activity count
          <p className="text-body text-text-secondary mt-2">
            {activityCount} {activityCount === 1 ? 'activity' : 'activities'}
          </p>
        )}
      </div>

      {/* Edit Day Name Dialog */}
      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change Day Name</DialogTitle>
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

// Overview Panel Component (two-panel layout with destinations + map)
function OverviewPanel({
  trip,
  onOpenLocationDialog,
  onOpenAccommodationDialog,
  onOpenStayDrawer,
  onRefresh
}: {
  trip: TripWithOwnership
  onOpenLocationDialog: (location?: Location) => void
  onOpenAccommodationDialog: (accommodation?: Accommodation) => void
  onOpenStayDrawer: (accommodation: Accommodation) => void
  onRefresh: () => Promise<void>
}) {
  const [hoveredLocationIndex, setHoveredLocationIndex] = useState<number | null>(null)

  // Resizable map state for right panel
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const [mapHeight, setMapHeight] = useState(500)
  const [isResizing, setIsResizing] = useState(false)

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!rightPanelRef.current) return
      const containerRect = rightPanelRef.current.getBoundingClientRect()
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

  // Calculate days away
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tripStart = parseLocalDate(trip.startDate)
  const tripEnd = parseLocalDate(trip.endDate)

  const getDaysAwayInfo = () => {
    if (today >= tripStart && today <= tripEnd) {
      return { text: 'NOW', type: 'ongoing' as const }
    }
    if (today > tripEnd) {
      const diffDays = Math.ceil((today.getTime() - tripEnd.getTime()) / (1000 * 60 * 60 * 24))
      return { text: `${diffDays} DAY${diffDays === 1 ? '' : 'S'} AGO`, type: 'past' as const }
    }
    const diffDays = Math.ceil((tripStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return { text: `${diffDays} DAY${diffDays === 1 ? '' : 'S'} AWAY`, type: 'upcoming' as const }
  }

  const daysAwayInfo = getDaysAwayInfo()

  // Calculate stats
  const duration = getTripDuration(trip)
  const days = generateDaysFromTrip(trip)
  const daysPlanned = days.filter(day => day.activities && day.activities.length > 0).length
  const activitiesCount = days.reduce((acc, day) => acc + (day.activities?.length || 0), 0)
  const placesSaved = trip.savedPlaces?.length || 0
  const staysLogged = trip.accommodations?.length || 0

  // Format stat numbers with leading zeros
  const formatStat = (num: number) => String(num).padStart(2, '0')

  // Sort locations by startDate
  const sortedLocations = useMemo(() =>
    [...trip.locations].sort((a, b) => a.startDate.localeCompare(b.startDate)),
    [trip.locations]
  )

  return (
    <ResizablePanelGroup direction="horizontal" className="flex-1">
      {/* Left Panel */}
      <ResizablePanel
        defaultSize="500px"
        minSize="420px"
        maxSize="580px"
        className="border-r border-neutral-200 flex flex-col overflow-hidden"
      >
        {/* Days Away Banner */}
        <div className="py-3 px-4 bg-white border-b border-border-muted flex items-center justify-center gap-2 flex-shrink-0">
          <span className="w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25] text-[#FF591E]">
            <CalendarClock />
          </span>
          <span className="text-[14px] leading-[18px] tracking-[-0.02em] font-semibold text-[#FF591E] uppercase">{daysAwayInfo.text}</span>
        </div>

        {/* Stats Grid - 2x2 */}
        <div className="h-[200px] grid grid-cols-2 grid-rows-2 border-b border-border-muted flex-shrink-0">
          {/* Days Planned */}
          <div className="flex flex-col items-center justify-center gap-[8px] border-r border-b border-border-muted">
            <span className="text-mono-large text-text-primary">{formatStat(daysPlanned)}/{formatStat(duration)}</span>
            <span className="text-h3 text-text-secondary uppercase">Days Planned</span>
          </div>

          {/* Activities */}
          <div className="flex flex-col items-center justify-center gap-[8px] border-b border-border-muted">
            <span className="text-mono-large text-text-primary">{formatStat(activitiesCount)}</span>
            <span className="text-h3 text-text-secondary uppercase">Activities</span>
          </div>

          {/* Places Saved */}
          <div className="flex flex-col items-center justify-center gap-[8px] border-r border-border-muted">
            <span className="text-mono-large text-text-primary">{formatStat(placesSaved)}</span>
            <span className="text-h3 text-text-secondary uppercase">Places Saved</span>
          </div>

          {/* Stays Logged */}
          <div className="flex flex-col items-center justify-center gap-[8px]">
            <span className="text-mono-large text-text-primary">{formatStat(staysLogged)}</span>
            <span className="text-h3 text-text-secondary uppercase">Stays Logged</span>
          </div>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-auto">
          {/* Destinations Header */}
          <div className="p-3 border-b border-neutral-200 flex items-center justify-between sticky top-0 bg-white z-10">
            <span className="text-h2 text-text-primary">Destinations</span>
            <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenLocationDialog()}>
              New destination
            </Button>
          </div>

          {/* Destinations List */}
          {sortedLocations.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenLocationDialog()}>
                Add your first destination
              </Button>
            </div>
          ) : (
            <div>
              {sortedLocations.map((location, index) => (
                <DestinationCard
                  key={location.id}
                  tripId={trip.id}
                  location={location}
                  index={index}
                  onEdit={() => onOpenLocationDialog(location)}
                  onHover={() => setHoveredLocationIndex(index)}
                  onLeave={() => setHoveredLocationIndex(null)}
                  onRefresh={onRefresh}
                />
              ))}
            </div>
          )}
        </div>
      </ResizablePanel>

      <ResizableHandle direction="horizontal" className="w-px bg-transparent focus:outline-none focus-visible:ring-0" />

      {/* Right Panel - Map + Stays */}
      <ResizablePanel className="flex flex-col overflow-hidden">
        <div ref={rightPanelRef} className="flex flex-col h-full">
          {/* Map Panel - Resizable height */}
          <div
            className="flex-shrink-0"
            style={{ height: mapHeight }}
          >
            <DestinationsMap
              locations={trip.locations}
              hoveredIndex={hoveredLocationIndex}
            />
          </div>

          {/* Stays Panel - Takes remaining space */}
          <div className="flex-1 flex flex-col min-h-0 bg-white">
            {trip.accommodations.length === 0 ? (
              /* Empty State - No header, just centered content with resize handle */
              <div className="flex-1 flex flex-col relative group">
                {/* Resize Handle - pill at top */}
                <div
                  className="absolute top-0 left-0 right-0 h-3 cursor-row-resize flex items-center justify-center z-10"
                  onMouseDown={handleMouseDown}
                >
                  <div className={cn(
                    "w-8 h-1 rounded-full bg-neutral-200 opacity-0 group-hover:opacity-100 transition-opacity",
                    isResizing && "opacity-100"
                  )} />
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-4 bg-white">
                  <div className="text-center">
                    <h2 className="text-h2 text-text-primary">Where are you staying?</h2>
                    <p className="text-body text-text-secondary mt-1">Add your hotels, Airbnbs, or other accommodations</p>
                  </div>
                  <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenAccommodationDialog()}>
                    New stay
                  </Button>
                </div>
              </div>
            ) : (
              /* Non-empty State - Header + List */
              <>
                {/* Stays Header with Resize Handle */}
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
                    <span className="text-h2 text-text-primary">Stays</span>
                    <span className="text-body text-text-secondary">
                      {trip.accommodations.length} {trip.accommodations.length === 1 ? 'stay' : 'stays'} across {new Set(trip.accommodations.map(a => a.locationId)).size} {new Set(trip.accommodations.map(a => a.locationId)).size === 1 ? 'destination' : 'destinations'}
                    </span>
                  </div>
                  <Button variant="secondary" size="small" leftIcon={<Plus />} onClick={() => onOpenAccommodationDialog()}>
                    New stay
                  </Button>
                </div>

                {/* Stays List */}
                <div className="flex-1 overflow-auto">
                  <OverviewStaysList
                    trip={trip}
                    onOpenStayDrawer={onOpenStayDrawer}
                    onRefresh={onRefresh}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

// Destination Card Component
function DestinationCard({
  tripId,
  location,
  index,
  onEdit,
  onHover,
  onLeave,
  onRefresh
}: {
  tripId: string
  location: Location
  index: number
  onEdit: () => void
  onHover: () => void
  onLeave: () => void
  onRefresh: () => Promise<void>
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null)

  // Measure content height and calculate photo dimensions (4:3 ratio)
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight
      setPhotoDimensions({
        width: Math.round(height * (4 / 3)),
        height: height
      })
    }
  }, [location])

  // Calculate nights
  const startDate = parseLocalDate(location.startDate)
  const endDate = parseLocalDate(location.endDate)
  const nights = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))

  // Format dates: "APR 06 — APR 08" or "MAR 25 — APR 02"
  const monthFormat = new Intl.DateTimeFormat('en', { month: 'short' })
  const startMonth = monthFormat.format(startDate).toUpperCase()
  const endMonth = monthFormat.format(endDate).toUpperCase()
  const startDay = String(startDate.getDate()).padStart(2, '0')
  const endDay = String(endDate.getDate()).padStart(2, '0')
  const dateRange = `${startMonth} ${startDay} — ${endMonth} ${endDay}`

  return (
    <div
      className="group flex hover:bg-neutral-50 transition-colors border-b border-neutral-200 cursor-pointer"
      onClick={onEdit}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
    >
      {/* Photo - dimensions explicitly set to match content height with 4:3 ratio */}
      <PlacePhoto
        googlePlaceId={location.googlePlaceId}
        selectedPhotoIndex={location.selectedPhotoIndex}
        alt={location.name}
        width={photoDimensions?.width ?? 0}
        height={photoDimensions?.height ?? 'auto'}
        editable={{
          tripId,
          entityId: location.id,
          entityType: 'location',
          onRefresh
        }}
      />

      {/* Content - 16px padding, 12px gap */}
      <div ref={contentRef} className="flex-1 min-w-0 flex flex-col justify-center p-4 gap-3">
        {/* Badge row */}
        <div className="flex items-center">
          <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
            {location.name}
          </Badge>
        </div>
        {/* Nights text */}
        <span className="text-body text-text-secondary">
          {nights} {nights === 1 ? 'night' : 'nights'}
        </span>
      </div>

      {/* Date Range */}
      <div className="flex items-center pr-4 flex-shrink-0">
        <span className="text-mono-regular text-text-secondary">{dateRange}</span>
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
  if (trip.accommodations.length === 0) {
    return (
      <div className="py-8 flex items-center justify-center">
        <span className="text-body text-text-secondary">No stays logged yet</span>
      </div>
    )
  }

  return (
    <div>
      {trip.accommodations.map(accommodation => {
        const location = trip.locations.find(l => l.id === accommodation.locationId)
        const checkIn = parseLocalDate(accommodation.checkIn)
        const checkOut = parseLocalDate(accommodation.checkOut)
        const monthFormat = new Intl.DateTimeFormat('en', { month: 'short' })
        const inMonth = monthFormat.format(checkIn).toUpperCase()
        const outMonth = monthFormat.format(checkOut).toUpperCase()
        const inDay = checkIn.getDate()
        const outDay = checkOut.getDate()
        const dateRange = inMonth === outMonth
          ? `${inMonth} ${inDay}—${outDay}`
          : `${inMonth} ${inDay}—${outMonth} ${outDay}`

        return (
          <div
            key={accommodation.id}
            className="p-4 border-b border-neutral-200 hover:bg-neutral-50 cursor-pointer"
            onClick={() => onOpenAccommodationDialog(accommodation)}
          >
            {/* Row 1: Location badge + Date range */}
            <div className="flex items-center justify-between">
              {location && (
                <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
                  {location.name}
                </Badge>
              )}
              <span className="text-mono-small text-text-secondary">{dateRange}</span>
            </div>
            {/* Row 2: Name + Address (12px gap from row 1) */}
            <div className="mt-3">
              <p className="text-h3 text-text-primary">{accommodation.name}</p>
              <p className="text-body text-text-secondary">{accommodation.address}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// Overview Stays List Component (for right panel)
function OverviewStaysList({
  trip,
  onOpenStayDrawer,
  onRefresh
}: {
  trip: TripWithOwnership
  onOpenStayDrawer: (accommodation: Accommodation) => void
  onRefresh: () => Promise<void>
}) {
  return (
    <div>
      {trip.accommodations.map(accommodation => {
        const location = trip.locations.find(l => l.id === accommodation.locationId)
        return (
          <StayCard
            key={accommodation.id}
            tripId={trip.id}
            accommodation={accommodation}
            location={location}
            onClick={() => onOpenStayDrawer(accommodation)}
            onRefresh={onRefresh}
          />
        )
      })}
    </div>
  )
}

// Stay Card Component (for Overview right panel)
function StayCard({
  tripId,
  accommodation,
  location,
  onClick,
  onRefresh
}: {
  tripId: string
  accommodation: Accommodation
  location?: Location
  onClick: () => void
  onRefresh: () => Promise<void>
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [photoDimensions, setPhotoDimensions] = useState<{ width: number; height: number } | null>(null)

  // Measure content height and calculate photo dimensions (4:3 ratio)
  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight
      setPhotoDimensions({
        width: Math.round(height * (4 / 3)),
        height: height
      })
    }
  }, [accommodation])

  // Format dates: "APR 06 — APR 08" or "MAR 25 — APR 02"
  const checkIn = parseLocalDate(accommodation.checkIn)
  const checkOut = parseLocalDate(accommodation.checkOut)
  const monthFormat = new Intl.DateTimeFormat('en', { month: 'short' })
  const inMonth = monthFormat.format(checkIn).toUpperCase()
  const outMonth = monthFormat.format(checkOut).toUpperCase()
  const inDay = String(checkIn.getDate()).padStart(2, '0')
  const outDay = String(checkOut.getDate()).padStart(2, '0')
  const dateRange = `${inMonth} ${inDay} — ${outMonth} ${outDay}`

  return (
    <div
      className="group flex hover:bg-neutral-50 transition-colors border-b border-neutral-200 cursor-pointer"
      onClick={onClick}
    >
      {/* Photo - dimensions explicitly set to match content height with 4:3 ratio */}
      <PlacePhoto
        googlePlaceId={accommodation.googlePlaceId}
        selectedPhotoIndex={accommodation.selectedPhotoIndex}
        alt={accommodation.name}
        width={photoDimensions?.width ?? 0}
        height={photoDimensions?.height ?? 'auto'}
        editable={{
          tripId,
          entityId: accommodation.id,
          entityType: 'accommodation',
          onRefresh
        }}
      />

      {/* Content - 16px padding, 12px gap */}
      <div ref={contentRef} className="flex-1 min-w-0 flex flex-col justify-center p-4 gap-2">
        {/* Badge + Date range row */}
        <div className="flex items-center justify-between">
          {location && (
            <Badge dotColor={location.color || LOCATION_COLORS[0].value}>
              {location.name}
            </Badge>
          )}
          <span className="text-mono-regular text-text-secondary">{dateRange}</span>
        </div>
        {/* Name */}
        <h3 className="text-h3 text-text-primary truncate">{accommodation.name}</h3>
        {/* Address */}
        {accommodation.address && (
          <p className="text-body text-text-secondary truncate">{accommodation.address}</p>
        )}
      </div>
    </div>
  )
}
