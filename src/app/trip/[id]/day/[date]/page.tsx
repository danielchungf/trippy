"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  ArrowLeft,
  Plus,
  MapPin,
  Clock,
  Trash2,
  MoreHorizontal,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  GripVertical,
  Sparkles,
  Home,
  LogIn,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trip,
  Activity,
  PlaceInfo,
  Accommodation,
  formatDate,
} from "@/types"
import {
  addActivity,
  updateActivity,
  deleteActivity,
  createActivityFromPlace,
  reorderActivities,
  updateDayName,
} from "@/lib/db"
import { useTrip, useRefreshTrip } from "@/lib/hooks/use-trips"
import { DayMap } from "@/components/maps/DayMap"
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult, optimizeRoute } from "@/lib/maps"

export default function DayPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string
  const date = params.date as string

  // React Query hook for trip data
  const { data: trip, isLoading } = useTrip(tripId)
  const refreshTrip = useRefreshTrip(tripId)

  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [isEditingDayName, setIsEditingDayName] = useState(false)
  const [editingDayNameValue, setEditingDayNameValue] = useState("")

  // DnD sensors - only activate drag on elements with data-drag-handle attribute
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

  // Activity form state
  const [activityTitle, setActivityTitle] = useState("")
  const [activityTitleTouched, setActivityTitleTouched] = useState(false)
  const [activityTime, setActivityTime] = useState("")
  const [hasTime, setHasTime] = useState(false)
  const [activityDuration, setActivityDuration] = useState("")
  const [isCustomDuration, setIsCustomDuration] = useState(false)
  const [activityNotes, setActivityNotes] = useState("")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("")
  const [addMode, setAddMode] = useState<'saved' | 'search'>('search')
  const [searchedPlace, setSearchedPlace] = useState<PlaceSearchResult | null>(null)

  // Redirect if trip not found (after loading completes)
  if (!isLoading && !trip) {
    router.push('/')
    return null
  }

  const day = trip?.days.find(d => d.date === date)
  const dayIndex = trip?.days.findIndex(d => d.date === date) ?? -1
  const location = day?.locationId
    ? trip?.locations.find(l => l.id === day.locationId)
    : null

  const prevDay = dayIndex > 0 ? trip?.days[dayIndex - 1] : null
  const nextDay = trip && dayIndex < trip.days.length - 1 ? trip.days[dayIndex + 1] : null

  const handleEditDayName = () => {
    setEditingDayNameValue(day?.name || "")
    setIsEditingDayName(true)
  }

  const handleSaveDayName = async () => {
    await updateDayName(tripId, date, editingDayNameValue.trim() || undefined)
    setIsEditingDayName(false)
    await refreshTrip()
  }

  const handleDayNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveDayName()
    } else if (e.key === 'Escape') {
      setIsEditingDayName(false)
    }
  }

  const handleOpenActivityDialog = (activity?: Activity) => {
    const presetDurations = ['15', '30', '45', '60', '90', '120', '180', '240']
    if (activity) {
      setEditingActivity(activity)
      setActivityTitle(activity.title)
      setActivityTitleTouched(true) // When editing, treat title as touched
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
      setAddMode(trip?.savedPlaces.length ? 'saved' : 'search')
    }

    setIsActivityOpen(true)
  }

  const handleSaveActivity = async () => {
    let place: PlaceInfo
    let title = activityTitle

    if (addMode === 'saved' && selectedPlaceId) {
      const savedPlace = trip?.savedPlaces.find(p => p.id === selectedPlaceId)
      if (!savedPlace) return
      place = {
        name: savedPlace.name,
        address: savedPlace.address,
        coordinates: savedPlace.coordinates,
        googlePlaceId: savedPlace.googlePlaceId
      }
      // Use place name as title if not provided
      if (!title) title = savedPlace.name
    } else if (addMode === 'search' && searchedPlace) {
      place = {
        name: searchedPlace.name,
        address: searchedPlace.address,
        coordinates: searchedPlace.coordinates,
        googlePlaceId: searchedPlace.placeId
      }
      // Use place name as title if not provided
      if (!title) title = searchedPlace.name
    } else {
      return // Must have a place from search or saved
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
      await updateActivity(tripId, date, editingActivity.id, data)
    } else {
      await addActivity(tripId, date, data)
    }

    setIsActivityOpen(false)
    setSearchedPlace(null)
    await refreshTrip()
  }

  const handlePlaceSearchSelect = (place: PlaceSearchResult) => {
    setSearchedPlace(place)
    // Auto-fill title with place name if user hasn't manually edited it
    if (!activityTitleTouched) {
      setActivityTitle(place.name)
    }
  }

  const handleSavedPlaceSelect = (placeId: string) => {
    setSelectedPlaceId(placeId)
    // Auto-fill title with place name if user hasn't manually edited it
    const savedPlace = trip?.savedPlaces.find(p => p.id === placeId)
    if (savedPlace && !activityTitleTouched) {
      setActivityTitle(savedPlace.name)
    }
  }

  const handleActivityTitleChange = (value: string) => {
    setActivityTitle(value)
    setActivityTitleTouched(true)
  }

  const handleDeleteActivity = async (activityId: string) => {
    await deleteActivity(tripId, date, activityId)
    await refreshTrip()
  }

  const handleAssignSavedPlace = async (placeId: string) => {
    await createActivityFromPlace(tripId, date, placeId)
    await refreshTrip()
  }

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
        await reorderActivities(tripId, date, reordered.map(a => a.id))
        await refreshTrip()
      }
    }
  }

  const handleOptimizeRoute = async () => {
    if (!day) return

    // Find accommodation for this day (staying or check-in)
    const currentAccommodation = trip?.accommodations.find(a => {
      // Staying: date is between check-in and check-out (inclusive of check-in)
      return date >= a.checkIn && date < a.checkOut
    })

    const startingLocation = currentAccommodation?.coordinates

    // Need at least 2 activities if we have a starting location, 3 otherwise
    const minActivities = startingLocation ? 2 : 3
    if (day.activities.length < minActivities) return

    setIsOptimizing(true)
    try {
      const optimizedOrder = await optimizeRoute(day.activities, startingLocation)
      if (optimizedOrder) {
        const reorderedIds = optimizedOrder.map(i => day.activities[i].id)
        await reorderActivities(tripId, date, reorderedIds)
        await refreshTrip()
      }
    } finally {
      setIsOptimizing(false)
    }
  }

  if (!trip || !day) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const unassignedPlaces = trip.savedPlaces.filter(
    place => !day.activities.some(a => a.savedPlaceId === place.id)
  )

  // Find accommodations for this day
  const checkInAccommodations = trip.accommodations.filter(a => a.checkIn === date)
  const checkOutAccommodations = trip.accommodations.filter(a => a.checkOut === date)
  // Staying: date is between check-in (exclusive) and check-out (exclusive)
  const stayingAccommodations = trip.accommodations.filter(a => {
    return date > a.checkIn && date < a.checkOut
  })

  // Current accommodation (where we're staying tonight) - for route optimization
  const currentAccommodation = trip.accommodations.find(a => {
    return date >= a.checkIn && date < a.checkOut
  })
  const hasAccommodationWithCoords = !!currentAccommodation?.coordinates

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={`/trip/${tripId}`}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                {isEditingDayName ? (
                  <Input
                    autoFocus
                    placeholder={`Day ${dayIndex + 1}`}
                    value={editingDayNameValue}
                    onChange={(e) => setEditingDayNameValue(e.target.value)}
                    onKeyDown={handleDayNameKeyDown}
                    onBlur={handleSaveDayName}
                    className="h-8 text-xl font-bold w-48"
                  />
                ) : (
                  <div className="flex items-center gap-2 group">
                    <h1 className="text-xl font-bold">{day.name || `Day ${dayIndex + 1}`}</h1>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={handleEditDayName}
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {formatDate(date)}
                  {location && ` · ${location.name}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {prevDay && (
                <Link href={`/trip/${tripId}/day/${prevDay.date}`}>
                  <Button variant="outline" size="icon">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </Link>
              )}
              {nextDay && (
                <Link href={`/trip/${tripId}/day/${nextDay.date}`}>
                  <Button variant="outline" size="icon">
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Map Area */}
          <div className="lg:col-span-2">
            <Card className="h-[400px] lg:h-[600px] overflow-hidden">
              <CardContent className="p-0 h-full">
                <DayMap activities={day.activities} />
              </CardContent>
            </Card>
          </div>

          {/* Activities Sidebar */}
          <div className="space-y-4">
            {/* Accommodation Cards */}
            {(checkOutAccommodations.length > 0 || checkInAccommodations.length > 0 || stayingAccommodations.length > 0) && (
              <div className="space-y-2">
                {checkOutAccommodations.map(accommodation => (
                  <AccommodationCard
                    key={`checkout-${accommodation.id}`}
                    accommodation={accommodation}
                    type="checkout"
                  />
                ))}
                {stayingAccommodations.map(accommodation => (
                  <AccommodationCard
                    key={`staying-${accommodation.id}`}
                    accommodation={accommodation}
                    type="staying"
                  />
                ))}
                {checkInAccommodations.map(accommodation => (
                  <AccommodationCard
                    key={`checkin-${accommodation.id}`}
                    accommodation={accommodation}
                    type="checkin"
                  />
                ))}
              </div>
            )}

            {/* Activities Card */}
            <Card>
              <CardHeader className="py-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-sm font-medium">Activities</CardTitle>
                    <Badge variant="secondary">{day.activities.length}</Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenActivityDialog()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="py-2 px-4">
                {day.activities.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activities yet
                  </p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={day.activities.map(a => a.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {day.activities.map((activity, index) => (
                          <SortableActivityCard
                            key={activity.id}
                            activity={activity}
                            index={index}
                            onEdit={() => handleOpenActivityDialog(activity)}
                            onDelete={() => handleDeleteActivity(activity.id)}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </CardContent>
            </Card>

            {/* Optimize Route Button */}
            {((hasAccommodationWithCoords && day.activities.length >= 2) || day.activities.length >= 3) && (
              <Button
                variant="outline"
                className="w-full"
                onClick={handleOptimizeRoute}
                disabled={isOptimizing}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                {isOptimizing ? 'Optimizing...' : 'Optimize Route'}
              </Button>
            )}

            {/* Unassigned Saved Places */}
            {unassignedPlaces.length > 0 && (
              <Card>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <Bookmark className="h-4 w-4" />
                    <CardTitle className="text-sm font-medium">Saved Places</CardTitle>
                    <Badge variant="secondary">{unassignedPlaces.length}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  <div className="space-y-2">
                    {unassignedPlaces.slice(0, 5).map(place => (
                      <div
                        key={place.id}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{place.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{place.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAssignSavedPlace(place.id)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {unassignedPlaces.length > 5 && (
                      <Link href={`/trip/${tripId}/places`}>
                        <Button variant="link" className="w-full">
                          View all {unassignedPlaces.length} saved places
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>

      {/* Add/Edit Activity Dialog */}
      <Dialog open={isActivityOpen} onOpenChange={setIsActivityOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingActivity ? 'Edit Activity' : 'Add Activity'}
            </DialogTitle>
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
                onClick={() => {
                  handleDeleteActivity(editingActivity.id)
                  setIsActivityOpen(false)
                }}
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
    </div>
  )
}

function AccommodationCard({
  accommodation,
  type
}: {
  accommodation: Accommodation
  type: 'checkin' | 'checkout' | 'staying'
}) {
  const isCheckIn = type === 'checkin'
  const isCheckOut = type === 'checkout'
  const isStaying = type === 'staying'

  const Icon = isCheckIn ? LogIn : isCheckOut ? LogOut : Home
  const label = isCheckIn ? 'Check-in' : isCheckOut ? 'Check-out' : 'Staying'
  const time = isCheckIn ? accommodation.checkInTime : isCheckOut ? accommodation.checkOutTime : undefined

  const borderColor = isCheckIn ? 'border-l-green-500' : isCheckOut ? 'border-l-orange-500' : 'border-l-blue-500'
  const iconBgColor = isCheckIn ? 'bg-green-100 text-green-600' : isCheckOut ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'
  const badgeVariant = isCheckIn ? 'default' : isStaying ? 'outline' : 'secondary'

  return (
    <Card className={`border-l-4 ${borderColor}`}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${iconBgColor}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Badge variant={badgeVariant as "default" | "secondary" | "outline"} className="text-xs">
                {label}
              </Badge>
              {time && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {time}
                </span>
              )}
            </div>
            <p className="font-medium text-sm mt-1">{accommodation.name}</p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Home className="h-3 w-3" />
              <span className="capitalize">{accommodation.type}</span>
            </div>
            {accommodation.address && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{accommodation.address}</span>
              </div>
            )}
            {accommodation.notes && (
              <p className="text-xs text-muted-foreground mt-1 italic">{accommodation.notes}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function SortableActivityCard({
  activity,
  index,
  onEdit,
  onDelete
}: {
  activity: Activity
  index: number
  onEdit: () => void
  onDelete: () => void
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
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-muted/50 group"
    >
      <div
        {...attributes}
        {...listeners}
        className="mt-1 cursor-grab active:cursor-grabbing touch-none"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium shrink-0">
        {index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium text-sm">{activity.title}</p>
          <button
            type="button"
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 hover:bg-muted rounded"
            onClick={onEdit}
          >
            <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>
        {(activity.time || activity.duration) && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {activity.time && (
              <>
                <Clock className="h-3 w-3" />
                <span>{activity.time}</span>
              </>
            )}
            {activity.duration && (
              <span>{activity.time ? '· ' : ''}{activity.duration}min</span>
            )}
          </div>
        )}
        {activity.place.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{activity.place.address}</span>
          </div>
        )}
      </div>
    </div>
  )
}
