"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  List,
  Plus,
  MapPin,
  Hotel,
  Bookmark,
  ChevronRight,
  Trash2,
  MoreHorizontal,
  Edit2,
  ChevronDown
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
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
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult } from "@/lib/maps"
import { Coordinates } from "@/types"
import {
  Trip,
  Location,
  Accommodation,
  AccommodationType,
  formatDate,
  formatDateRange,
  getTripDuration,
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
} from "@/lib/db"
import { useTrip, useRefreshTrip } from "@/lib/hooks/use-trips"
import { ShareDialog } from "@/components/trip/ShareDialog"
import { EditTripDialog } from "@/components/trip/EditTripDialog"
import { PackingList } from "@/components/trip/PackingList"

export default function TripPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  // React Query hook for trip data
  const { data: trip, isLoading } = useTrip(tripId)
  const refreshTrip = useRefreshTrip(tripId)

  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')

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
      // Pick next available color based on existing locations
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

  // Get center location for accommodation search based on selected trip location or first location
  const getAccommodationSearchCenter = (): Coordinates | undefined => {
    if (accommodationLocationId && accommodationLocationId !== 'none') {
      const location = trip?.locations.find(l => l.id === accommodationLocationId)
      return location?.coordinates
    }
    // Fall back to first location with coordinates
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <IconButton icon={<ArrowLeft />} />
            </Link>
            <div className="flex-1">
              <h1 className="font-fustat text-xl font-bold">{trip.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(trip.startDate, trip.endDate)} · {duration} days
              </p>
            </div>
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
              onUpdate={refreshTrip}
            />
            <Link href={`/trip/${tripId}/places`}>
              <Button variant="secondary" leftIcon={<Bookmark />}>
                Saved Places
                {trip.savedPlaces.length > 0 && (
                  <Badge variant="secondary" className="ml-2">{trip.savedPlaces.length}</Badge>
                )}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Locations & Accommodations */}
          <div className="space-y-6">
            {/* Locations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Locations
                  </CardTitle>
                  <Dialog open={isLocationOpen} onOpenChange={setIsLocationOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenLocationDialog()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
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
                </div>
              </CardHeader>
              <CardContent>
                {trip.locations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No locations added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {trip.locations.map((location, index) => (
                      <div
                        key={location.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                      >
                        <div className="flex items-center gap-2">
                          {index > 0 && (
                            <span className="text-muted-foreground">→</span>
                          )}
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: location.color || LOCATION_COLORS[0].value }}
                          />
                          <div>
                            <p className="font-medium">{location.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateRange(location.startDate, location.endDate)}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenLocationDialog(location)}>
                              <Edit2 className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteLocation(location.id)}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Accommodations */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Hotel className="h-4 w-4" />
                    Accommodations
                  </CardTitle>
                  <Dialog open={isAccommodationOpen} onOpenChange={setIsAccommodationOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={() => handleOpenAccommodationDialog()}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
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
              </CardHeader>
              <CardContent>
                {trip.accommodations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No accommodations added yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {trip.accommodations.map(accommodation => {
                      const location = trip.locations.find(l => l.id === accommodation.locationId)
                      return (
                        <div
                          key={accommodation.id}
                          className="flex items-center justify-between p-2 rounded-md hover:bg-muted group"
                        >
                          <div>
                            <p className="font-medium">{accommodation.name}</p>
                            <p className="text-xs text-muted-foreground">
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
                              <DropdownMenuItem onClick={() => handleOpenAccommodationDialog(accommodation)}>
                                <Edit2 className="h-4 w-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => handleDeleteAccommodation(accommodation.id)}
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
              </CardContent>
            </Card>

            {/* Packing List */}
            <PackingList
              tripId={tripId}
              packingItems={trip.packingItems}
              onRefresh={refreshTrip}
            />
          </div>

          {/* Right Column - Days */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Itinerary</CardTitle>
                  <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'calendar' | 'list')}>
                    <TabsList className="h-8">
                      <TabsTrigger value="list" className="h-7 px-2">
                        <List className="h-4 w-4" />
                      </TabsTrigger>
                      <TabsTrigger value="calendar" className="h-7 px-2">
                        <CalendarIcon className="h-4 w-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'list' ? (
                  <DaysList trip={trip} onRefresh={refreshTrip} />
                ) : (
                  <CalendarView trip={trip} />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function DaysList({ trip, onRefresh }: { trip: Trip; onRefresh: () => Promise<void> }) {
  const [editingDayDate, setEditingDayDate] = useState<string | null>(null)
  const [editingDayName, setEditingDayName] = useState("")

  // Group days by location
  const daysByLocation: { location: Location | null; days: typeof trip.days }[] = []

  trip.days.forEach(day => {
    const location = trip.locations.find(l => l.id === day.locationId) || null
    const existing = daysByLocation.find(g => g.location?.id === location?.id)

    if (existing) {
      existing.days.push(day)
    } else {
      daysByLocation.push({ location, days: [day] })
    }
  })

  const handleEditDayName = (day: typeof trip.days[0], e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditingDayDate(day.date)
    setEditingDayName(day.name || "")
  }

  const handleSaveDayName = async (date: string) => {
    await updateDayName(trip.id, date, editingDayName.trim() || undefined)
    setEditingDayDate(null)
    setEditingDayName("")
    await onRefresh()
  }

  const handleKeyDown = (e: React.KeyboardEvent, date: string) => {
    if (e.key === 'Enter') {
      handleSaveDayName(date)
    } else if (e.key === 'Escape') {
      setEditingDayDate(null)
      setEditingDayName("")
    }
  }

  return (
    <div className="space-y-6">
      {daysByLocation.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group.location && (
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{group.location.name}</span>
            </div>
          )}
          <div className="space-y-2">
            {group.days.map((day) => {
              const dayNumber = trip.days.indexOf(day) + 1
              const activityCount = day.activities.length
              const isEditing = editingDayDate === day.date
              const displayName = day.name || `Day ${dayNumber}`

              return (
                <div key={day.date} className="relative group">
                  {isEditing ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: group.location?.color
                            ? `${group.location.color}20`
                            : 'hsl(var(--primary) / 0.1)'
                        }}
                      >
                        <span
                          className="text-sm font-medium"
                          style={{ color: group.location?.color }}
                        >
                          {dayNumber}
                        </span>
                      </div>
                      <div className="flex-1">
                        <Input
                          autoFocus
                          placeholder={`Day ${dayNumber}`}
                          value={editingDayName}
                          onChange={(e) => setEditingDayName(e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, day.date)}
                          onBlur={() => handleSaveDayName(day.date)}
                          className="h-8 text-sm font-medium"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(day.date)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href={`/trip/${trip.id}/day/${day.date}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center"
                            style={{
                              backgroundColor: group.location?.color
                                ? `${group.location.color}20`
                                : 'hsl(var(--primary) / 0.1)'
                            }}
                          >
                            <span
                              className="text-sm font-medium"
                              style={{ color: group.location?.color }}
                            >
                              {dayNumber}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{displayName}</p>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => handleEditDayName(day, e)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(day.date)} · {activityCount === 0
                                ? 'No activities planned'
                                : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`
                              }
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      </div>
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
          {groupIndex < daysByLocation.length - 1 && (
            <Separator className="my-4" />
          )}
        </div>
      ))}
    </div>
  )
}

function CalendarView({ trip }: { trip: Trip }) {
  const tripStart = parseLocalDate(trip.startDate)
  const tripEnd = parseLocalDate(trip.endDate)

  // Find the first Sunday on or before the trip start
  const calendarStart = new Date(tripStart)
  calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay())

  // Find the last Saturday on or after the trip end
  const calendarEnd = new Date(tripEnd)
  const daysUntilSaturday = (6 - calendarEnd.getDay()) % 7
  calendarEnd.setDate(calendarEnd.getDate() + daysUntilSaturday)

  // Build all days from calendar start to calendar end
  type DayInfo = {
    dayNum: number
    date: Date
    dateStr: string
    isInTrip: boolean
    tripDay: typeof trip.days[0] | undefined
    isFirstOfMonth: boolean
    monthLabel: string
    colIndex: number // 0-6 for day of week
  }

  const allDays: DayInfo[] = []
  const current = new Date(calendarStart)
  let colIndex = 0

  while (current <= calendarEnd) {
    const date = new Date(current)
    const dateStr = formatLocalDate(date)
    const isInTrip = date >= tripStart && date <= tripEnd
    const tripDay = trip.days.find(d => d.date === dateStr)
    const isFirstOfMonth = date.getDate() === 1
    const monthLabel = date.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()

    allDays.push({
      dayNum: date.getDate(),
      date,
      dateStr,
      isInTrip,
      tripDay,
      isFirstOfMonth,
      monthLabel,
      colIndex: colIndex % 7
    })

    current.setDate(current.getDate() + 1)
    colIndex++
  }

  // Group into weeks
  const weeks: DayInfo[][] = []
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7))
  }

  // Calculate location bar segments for each row
  // A segment represents a portion of a location that appears in one row
  type LocationSegment = {
    location: typeof trip.locations[0]
    startCol: number // 0-6
    endCol: number // 0-6 (inclusive)
    lane: number // vertical stacking position
  }

  const getSegmentsForWeek = (week: DayInfo[]): LocationSegment[] => {
    const segments: LocationSegment[] = []
    const weekStartDate = week[0].date
    const weekEndDate = week[6].date

    trip.locations.forEach(location => {
      const locStart = parseLocalDate(location.startDate)
      const locEnd = parseLocalDate(location.endDate)

      // Check if location overlaps with this week
      if (locEnd < weekStartDate || locStart > weekEndDate) return

      // Calculate start and end columns within this week
      let startCol = 0
      let endCol = 6

      if (locStart > weekStartDate) {
        startCol = Math.floor((locStart.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
      }
      if (locEnd < weekEndDate) {
        endCol = Math.floor((locEnd.getTime() - weekStartDate.getTime()) / (1000 * 60 * 60 * 24))
      }

      // Clamp to valid range
      startCol = Math.max(0, Math.min(6, startCol))
      endCol = Math.max(0, Math.min(6, endCol))

      segments.push({
        location,
        startCol,
        endCol,
        lane: 0 // Will be assigned below
      })
    })

    // Assign lanes to avoid overlaps
    segments.forEach((seg, i) => {
      let lane = 0
      let conflict = true
      while (conflict) {
        conflict = false
        for (let j = 0; j < i; j++) {
          const other = segments[j]
          if (other.lane === lane) {
            // Check if they overlap horizontally
            if (!(seg.endCol < other.startCol || seg.startCol > other.endCol)) {
              conflict = true
              lane++
              break
            }
          }
        }
      }
      seg.lane = lane
    })

    return segments
  }

  const weekDays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const barHeight = 22
  const barGap = 2
  const dayLabelHeight = 24

  return (
    <div className="select-none">
      {/* Week day headers */}
      <div className="grid grid-cols-7 border-b border-border/50">
        {weekDays.map(day => (
          <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1.5">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar weeks */}
      <div>
        {weeks.map((week, weekIdx) => {
          const segments = getSegmentsForWeek(week)
          const maxLane = segments.length > 0 ? Math.max(...segments.map(s => s.lane)) : -1
          const barsHeight = (maxLane + 1) * (barHeight + barGap)
          const rowHeight = dayLabelHeight + barsHeight + 8

          return (
            <div
              key={weekIdx}
              className="grid grid-cols-7 border-b border-border/30 relative"
              style={{ minHeight: `${Math.max(rowHeight, 50)}px` }}
            >
              {/* Day cells with numbers */}
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`relative border-r border-border/20 last:border-r-0 ${
                    day.isInTrip ? '' : 'bg-muted/30'
                  }`}
                >
                  {/* Month label badge */}
                  {day.isFirstOfMonth && (
                    <span className="absolute top-1 left-1 text-[9px] font-bold bg-foreground text-background px-1 py-0.5 rounded">
                      {day.monthLabel}
                    </span>
                  )}
                  {/* Day number */}
                  <div className={`p-1 ${day.isFirstOfMonth ? 'pl-10' : ''}`}>
                    {day.isInTrip ? (
                      <Link href={`/trip/${trip.id}/day/${day.dateStr}`} className="block">
                        <span className={`text-xs font-medium ${
                          day.tripDay && day.tripDay.activities.length > 0
                            ? 'text-foreground'
                            : 'text-muted-foreground'
                        }`}>
                          {day.dayNum}
                        </span>
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">
                        {day.dayNum}
                      </span>
                    )}
                  </div>
                </div>
              ))}

              {/* Location bars overlay */}
              {segments.map((segment) => {
                const leftPercent = (segment.startCol / 7) * 100
                const widthPercent = ((segment.endCol - segment.startCol + 1) / 7) * 100
                const top = dayLabelHeight + segment.lane * (barHeight + barGap)

                // Check if this is the start of the location (to show the name)
                const locStart = parseLocalDate(segment.location.startDate)
                const isStart = week[segment.startCol].date.getTime() === locStart.getTime()

                return (
                  <div
                    key={`${segment.location.id}-${weekIdx}`}
                    className="absolute z-10 flex items-center px-2 text-xs font-medium text-white overflow-hidden whitespace-nowrap"
                    style={{
                      left: `calc(${leftPercent}% + 2px)`,
                      width: `calc(${widthPercent}% - 4px)`,
                      top: `${top}px`,
                      height: `${barHeight}px`,
                      backgroundColor: segment.location.color || '#3b82f6',
                      borderRadius: '4px'
                    }}
                  >
                    {isStart && segment.location.name}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
