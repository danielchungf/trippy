"use client"

import { useEffect, useState, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
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
  GripVertical
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trip,
  Activity,
  ActivitySection,
  PlaceInfo,
  formatDate,
} from "@/types"
import {
  getTrip,
  addActivity,
  updateActivity,
  deleteActivity,
  createActivityFromPlace,
} from "@/lib/storage"

export default function DayPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string
  const date = params.date as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [isActivityOpen, setIsActivityOpen] = useState(false)
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null)
  const [activitySection, setActivitySection] = useState<ActivitySection>("morning")

  // Activity form state
  const [activityTitle, setActivityTitle] = useState("")
  const [activityTime, setActivityTime] = useState("")
  const [activityDuration, setActivityDuration] = useState("")
  const [activityNotes, setActivityNotes] = useState("")
  const [selectedPlaceId, setSelectedPlaceId] = useState<string>("")
  const [manualPlaceName, setManualPlaceName] = useState("")
  const [manualPlaceAddress, setManualPlaceAddress] = useState("")
  const [addMode, setAddMode] = useState<'saved' | 'search' | 'manual'>('saved')

  useEffect(() => {
    const loadedTrip = getTrip(tripId)
    if (loadedTrip) {
      setTrip(loadedTrip)
    } else {
      router.push('/')
    }
  }, [tripId, router])

  const refreshTrip = useCallback(() => {
    const updated = getTrip(tripId)
    if (updated) setTrip(updated)
  }, [tripId])

  const day = trip?.days.find(d => d.date === date)
  const dayIndex = trip?.days.findIndex(d => d.date === date) ?? -1
  const location = day?.locationId
    ? trip?.locations.find(l => l.id === day.locationId)
    : null

  const prevDay = dayIndex > 0 ? trip?.days[dayIndex - 1] : null
  const nextDay = trip && dayIndex < trip.days.length - 1 ? trip.days[dayIndex + 1] : null

  const handleOpenActivityDialog = (section: ActivitySection, activity?: Activity) => {
    setActivitySection(section)

    if (activity) {
      setEditingActivity(activity)
      setActivityTitle(activity.title)
      setActivityTime(activity.time || "")
      setActivityDuration(activity.duration?.toString() || "")
      setActivityNotes(activity.notes || "")
      setSelectedPlaceId(activity.savedPlaceId || "")
      setManualPlaceName(activity.place.name)
      setManualPlaceAddress(activity.place.address)
      setAddMode(activity.savedPlaceId ? 'saved' : 'manual')
    } else {
      setEditingActivity(null)
      setActivityTitle("")
      setActivityTime("")
      setActivityDuration("")
      setActivityNotes("")
      setSelectedPlaceId("")
      setManualPlaceName("")
      setManualPlaceAddress("")
      setAddMode(trip?.savedPlaces.length ? 'saved' : 'manual')
    }

    setIsActivityOpen(true)
  }

  const handleSaveActivity = () => {
    if (!activityTitle) return

    let place: PlaceInfo

    if (addMode === 'saved' && selectedPlaceId) {
      const savedPlace = trip?.savedPlaces.find(p => p.id === selectedPlaceId)
      if (!savedPlace) return
      place = {
        name: savedPlace.name,
        address: savedPlace.address,
        coordinates: savedPlace.coordinates,
        googlePlaceId: savedPlace.googlePlaceId
      }
    } else {
      place = {
        name: manualPlaceName || activityTitle,
        address: manualPlaceAddress,
        coordinates: { lat: 0, lng: 0 }
      }
    }

    const data = {
      title: activityTitle,
      time: activityTime || undefined,
      duration: activityDuration ? parseInt(activityDuration) : undefined,
      notes: activityNotes || undefined,
      savedPlaceId: addMode === 'saved' ? selectedPlaceId : undefined,
      place,
      section: activitySection
    }

    if (editingActivity) {
      updateActivity(tripId, date, editingActivity.id, data)
    } else {
      addActivity(tripId, date, data)
    }

    setIsActivityOpen(false)
    refreshTrip()
  }

  const handleDeleteActivity = (activityId: string) => {
    deleteActivity(tripId, date, activityId)
    refreshTrip()
  }

  const handleAssignSavedPlace = (placeId: string, section: ActivitySection) => {
    createActivityFromPlace(tripId, date, placeId, section)
    refreshTrip()
  }

  if (!trip || !day) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  const activitiesBySection: Record<ActivitySection, Activity[]> = {
    morning: day.activities.filter(a => a.section === 'morning'),
    afternoon: day.activities.filter(a => a.section === 'afternoon'),
    evening: day.activities.filter(a => a.section === 'evening')
  }

  const sections: { key: ActivitySection; label: string; timeRange: string }[] = [
    { key: 'morning', label: 'Morning', timeRange: '6am - 12pm' },
    { key: 'afternoon', label: 'Afternoon', timeRange: '12pm - 6pm' },
    { key: 'evening', label: 'Evening', timeRange: '6pm - 12am' }
  ]

  const unassignedPlaces = trip.savedPlaces.filter(
    place => !day.activities.some(a => a.savedPlaceId === place.id)
  )

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
                <h1 className="text-xl font-bold">Day {dayIndex + 1}</h1>
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
            <Card className="h-[400px] lg:h-[600px]">
              <CardContent className="p-0 h-full">
                <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>Map will appear here</p>
                    <p className="text-sm">Add activities with locations to see them on the map</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Activities Sidebar */}
          <div className="space-y-4">
            {/* Activity Sections */}
            {sections.map(section => (
              <Card key={section.key}>
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-medium">{section.label}</CardTitle>
                      <p className="text-xs text-muted-foreground">{section.timeRange}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenActivityDialog(section.key)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="py-2 px-4">
                  {activitiesBySection[section.key].length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No activities yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {activitiesBySection[section.key].map(activity => (
                        <ActivityCard
                          key={activity.id}
                          activity={activity}
                          onEdit={() => handleOpenActivityDialog(section.key, activity)}
                          onDelete={() => handleDeleteActivity(activity.id)}
                        />
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <Plus className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {sections.map(s => (
                              <DropdownMenuItem
                                key={s.key}
                                onClick={() => handleAssignSavedPlace(place.id, s.key)}
                              >
                                Add to {s.label}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
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
              <label className="text-sm font-medium">Activity Title</label>
              <Input
                placeholder="e.g., Visit Sagrada Familia"
                value={activityTitle}
                onChange={(e) => setActivityTitle(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Tabs value={addMode} onValueChange={(v) => setAddMode(v as typeof addMode)}>
                <TabsList className="w-full">
                  {trip.savedPlaces.length > 0 && (
                    <TabsTrigger value="saved" className="flex-1">Saved</TabsTrigger>
                  )}
                  <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
                </TabsList>
                <TabsContent value="saved" className="mt-2">
                  <Select value={selectedPlaceId} onValueChange={setSelectedPlaceId}>
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
                <TabsContent value="manual" className="mt-2 space-y-2">
                  <Input
                    placeholder="Place name"
                    value={manualPlaceName}
                    onChange={(e) => setManualPlaceName(e.target.value)}
                  />
                  <Input
                    placeholder="Address (optional)"
                    value={manualPlaceAddress}
                    onChange={(e) => setManualPlaceAddress(e.target.value)}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={activityTime}
                  onChange={(e) => setActivityTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (min)</label>
                <Input
                  type="number"
                  placeholder="60"
                  value={activityDuration}
                  onChange={(e) => setActivityDuration(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Section</label>
              <Select value={activitySection} onValueChange={(v) => setActivitySection(v as ActivitySection)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Morning</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                  <SelectItem value="evening">Evening</SelectItem>
                </SelectContent>
              </Select>
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
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSaveActivity} disabled={!activityTitle}>
              {editingActivity ? 'Save' : 'Add Activity'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ActivityCard({
  activity,
  onEdit,
  onDelete
}: {
  activity: Activity
  onEdit: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-start gap-2 p-2 rounded-md border bg-card hover:bg-muted/50 group">
      <div className="mt-1 cursor-grab">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{activity.title}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {activity.time && (
            <>
              <Clock className="h-3 w-3" />
              <span>{activity.time}</span>
            </>
          )}
          {activity.duration && (
            <span>· {activity.duration}min</span>
          )}
        </div>
        {activity.place.address && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{activity.place.address}</span>
          </div>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onEdit}>
            <Edit2 className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
