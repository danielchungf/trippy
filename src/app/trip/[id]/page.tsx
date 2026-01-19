"use client"

import { useEffect, useState } from "react"
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
  formatLocalDate
} from "@/types"
import {
  getTrip,
  addLocation,
  updateLocation,
  deleteLocation,
  addAccommodation,
  updateAccommodation,
  deleteAccommodation
} from "@/lib/storage"

export default function TripPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('list')

  // Location dialog state
  const [isLocationOpen, setIsLocationOpen] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [locationName, setLocationName] = useState("")
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

  useEffect(() => {
    const loadedTrip = getTrip(tripId)
    if (loadedTrip) {
      setTrip(loadedTrip)
    } else {
      router.push('/')
    }
  }, [tripId, router])

  const refreshTrip = () => {
    const updated = getTrip(tripId)
    if (updated) setTrip(updated)
  }

  // Location handlers
  const handleOpenLocationDialog = (location?: Location) => {
    if (location) {
      setEditingLocation(location)
      setLocationName(location.name)
      setLocationCoordinates(location.coordinates)
      setLocationGooglePlaceId(location.googlePlaceId)
      setLocationStartDate(parseLocalDate(location.startDate))
      setLocationEndDate(parseLocalDate(location.endDate))
    } else {
      setEditingLocation(null)
      setLocationName("")
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

  const handleSaveLocation = () => {
    if (!locationName || !locationStartDate || !locationEndDate) return

    const startDateStr = formatLocalDate(locationStartDate)
    const endDateStr = formatLocalDate(locationEndDate)

    if (editingLocation) {
      updateLocation(tripId, editingLocation.id, {
        name: locationName,
        coordinates: locationCoordinates,
        googlePlaceId: locationGooglePlaceId,
        startDate: startDateStr,
        endDate: endDateStr
      })
    } else {
      addLocation(tripId, {
        name: locationName,
        coordinates: locationCoordinates,
        googlePlaceId: locationGooglePlaceId,
        startDate: startDateStr,
        endDate: endDateStr
      })
    }

    setIsLocationOpen(false)
    refreshTrip()
  }

  const handleDeleteLocation = (locationId: string) => {
    deleteLocation(tripId, locationId)
    refreshTrip()
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

  const handleSaveAccommodation = () => {
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
      updateAccommodation(tripId, editingAccommodation.id, data)
    } else {
      addAccommodation(tripId, data)
    }

    setIsAccommodationOpen(false)
    refreshTrip()
  }

  const handleDeleteAccommodation = (accommodationId: string) => {
    deleteAccommodation(tripId, accommodationId)
    refreshTrip()
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
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">{trip.name}</h1>
              <p className="text-sm text-muted-foreground">
                {formatDateRange(trip.startDate, trip.endDate)} · {duration} days
              </p>
            </div>
            <Link href={`/trip/${tripId}/places`}>
              <Button variant="outline">
                <Bookmark className="h-4 w-4 mr-2" />
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
                  <DaysList trip={trip} />
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

function DaysList({ trip }: { trip: Trip }) {
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

              return (
                <Link
                  key={day.date}
                  href={`/trip/${trip.id}/day/${day.date}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium">{dayNumber}</span>
                      </div>
                      <div>
                        <p className="font-medium">{formatDate(day.date)}</p>
                        <p className="text-sm text-muted-foreground">
                          {activityCount === 0
                            ? 'No activities planned'
                            : `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}`
                          }
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </Link>
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
  const startDate = new Date(trip.startDate)
  const endDate = new Date(trip.endDate)

  // Get the month(s) to display
  const months: Date[] = []
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1)

  while (current <= end) {
    months.push(new Date(current))
    current.setMonth(current.getMonth() + 1)
  }

  return (
    <div className="space-y-6">
      {months.map(month => (
        <MonthCalendar
          key={month.toISOString()}
          month={month}
          trip={trip}
        />
      ))}
    </div>
  )
}

function MonthCalendar({ month, trip }: { month: Date; trip: Trip }) {
  const year = month.getFullYear()
  const monthIndex = month.getMonth()

  const monthName = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const firstDay = new Date(year, monthIndex, 1)
  const lastDay = new Date(year, monthIndex + 1, 0)

  const startPadding = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const tripStart = new Date(trip.startDate)
  const tripEnd = new Date(trip.endDate)

  const days = Array.from({ length: 42 }, (_, i) => {
    const dayNum = i - startPadding + 1
    if (dayNum < 1 || dayNum > daysInMonth) return null

    const date = new Date(year, monthIndex, dayNum)
    const dateStr = date.toISOString().split('T')[0]
    const isInTrip = date >= tripStart && date <= tripEnd
    const tripDay = trip.days.find(d => d.date === dateStr)
    const location = tripDay?.locationId
      ? trip.locations.find(l => l.id === tripDay.locationId)
      : null

    return { dayNum, date, dateStr, isInTrip, tripDay, location }
  })

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div>
      <h3 className="font-medium mb-3">{monthName}</h3>
      <div className="grid grid-cols-7 gap-1">
        {weekDays.map(day => (
          <div key={day} className="text-center text-xs text-muted-foreground py-2">
            {day}
          </div>
        ))}
        {days.map((day, i) => (
          <div key={i} className="aspect-square p-1">
            {day && (
              day.isInTrip ? (
                <Link href={`/trip/${trip.id}/day/${day.dateStr}`}>
                  <div className={`
                    w-full h-full rounded-md flex flex-col items-center justify-center
                    ${day.location ? 'bg-primary/10' : 'bg-muted'}
                    hover:ring-2 ring-primary cursor-pointer transition-all
                  `}>
                    <span className="text-sm font-medium">{day.dayNum}</span>
                    {day.tripDay && day.tripDay.activities.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {day.tripDay.activities.length}
                      </span>
                    )}
                  </div>
                </Link>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                  {day.dayNum}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
