"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Plus,
  MapPin,
  Trash2,
  MoreHorizontal,
  Edit2,
  Search,
  Utensils,
  Eye,
  Activity,
  Hotel,
  ShoppingBag,
  Moon,
  Tag
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import {
  Trip,
  SavedPlace,
  PlaceCategory
} from "@/types"
import {
  getTrip,
  addSavedPlace,
  updateSavedPlace,
  deleteSavedPlace,
  createActivityFromPlace
} from "@/lib/db"
import { PlaceSearch } from "@/components/maps/PlaceSearch"
import { PlaceSearchResult } from "@/lib/maps"

const CATEGORIES: { value: PlaceCategory; label: string; icon: React.ReactNode }[] = [
  { value: 'food', label: 'Food', icon: <Utensils className="h-4 w-4" /> },
  { value: 'see', label: 'See', icon: <Eye className="h-4 w-4" /> },
  { value: 'do', label: 'Do', icon: <Activity className="h-4 w-4" /> },
  { value: 'stay', label: 'Stay', icon: <Hotel className="h-4 w-4" /> },
  { value: 'shop', label: 'Shop', icon: <ShoppingBag className="h-4 w-4" /> },
  { value: 'nightlife', label: 'Nightlife', icon: <Moon className="h-4 w-4" /> },
]

export default function SavedPlacesPage() {
  const params = useParams()
  const router = useRouter()
  const tripId = params.id as string

  const [trip, setTrip] = useState<Trip | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterCategory, setFilterCategory] = useState<string>("all")
  const [filterLocation, setFilterLocation] = useState<string>("all")

  // Add/Edit place dialog
  const [isPlaceOpen, setIsPlaceOpen] = useState(false)
  const [editingPlace, setEditingPlace] = useState<SavedPlace | null>(null)
  const [placeName, setPlaceName] = useState("")
  const [placeNameTouched, setPlaceNameTouched] = useState(false)
  const [placeCategory, setPlaceCategory] = useState<PlaceCategory | string>("food")
  const [placeLocationId, setPlaceLocationId] = useState("")
  const [placeNotes, setPlaceNotes] = useState("")
  const [searchedPlace, setSearchedPlace] = useState<PlaceSearchResult | null>(null)

  // Assign to day dialog
  const [isAssignOpen, setIsAssignOpen] = useState(false)
  const [assigningPlace, setAssigningPlace] = useState<SavedPlace | null>(null)
  const [assignDay, setAssignDay] = useState("")

  useEffect(() => {
    async function loadTrip() {
      const loadedTrip = await getTrip(tripId)
      if (loadedTrip) {
        setTrip(loadedTrip)
      } else {
        router.push('/')
      }
    }
    loadTrip()
  }, [tripId, router])

  const refreshTrip = async () => {
    const updated = await getTrip(tripId)
    if (updated) setTrip(updated)
  }

  const handleOpenPlaceDialog = (place?: SavedPlace) => {
    if (place) {
      setEditingPlace(place)
      setPlaceName(place.name)
      setPlaceNameTouched(true)
      setPlaceCategory(place.category)
      setPlaceLocationId(place.locationId || "")
      setPlaceNotes(place.notes || "")
      setSearchedPlace(place.googlePlaceId ? {
        placeId: place.googlePlaceId,
        name: place.name,
        address: place.address,
        coordinates: place.coordinates
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
    if (!searchedPlace) return

    const name = placeName || searchedPlace.name

    const data = {
      name,
      address: searchedPlace.address,
      coordinates: searchedPlace.coordinates,
      googlePlaceId: searchedPlace.placeId,
      category: placeCategory,
      locationId: placeLocationId && placeLocationId !== 'none' ? placeLocationId : undefined,
      notes: placeNotes || undefined
    }

    if (editingPlace) {
      await updateSavedPlace(tripId, editingPlace.id, data)
    } else {
      await addSavedPlace(tripId, data)
    }

    setIsPlaceOpen(false)
    setSearchedPlace(null)
    await refreshTrip()
  }

  const handleDeletePlace = async (placeId: string) => {
    await deleteSavedPlace(tripId, placeId)
    await refreshTrip()
  }

  const handleOpenAssignDialog = (place: SavedPlace) => {
    setAssigningPlace(place)
    setAssignDay(trip?.days[0]?.date || "")
    setIsAssignOpen(true)
  }

  const handleAssignToDay = async () => {
    if (!assigningPlace || !assignDay) return
    await createActivityFromPlace(tripId, assignDay, assigningPlace.id)
    setIsAssignOpen(false)
    await refreshTrip()
  }

  if (!trip) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // Filter places
  let filteredPlaces = trip.savedPlaces

  if (searchQuery) {
    const query = searchQuery.toLowerCase()
    filteredPlaces = filteredPlaces.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.address.toLowerCase().includes(query)
    )
  }

  if (filterCategory !== 'all') {
    filteredPlaces = filteredPlaces.filter(p => p.category === filterCategory)
  }

  if (filterLocation !== 'all') {
    filteredPlaces = filteredPlaces.filter(p => p.locationId === filterLocation)
  }

  // Group by category
  const placesByCategory = filteredPlaces.reduce((acc, place) => {
    const cat = typeof place.category === 'string' ? place.category : place.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(place)
    return acc
  }, {} as Record<string, SavedPlace[]>)

  const getCategoryIcon = (category: string) => {
    const found = CATEGORIES.find(c => c.value === category)
    return found?.icon || <Tag className="h-4 w-4" />
  }

  const getCategoryLabel = (category: string) => {
    const found = CATEGORIES.find(c => c.value === category)
    return found?.label || category
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href={`/trip/${tripId}`}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Saved Places</h1>
              <p className="text-sm text-muted-foreground">
                {trip.savedPlaces.length} places saved
              </p>
            </div>
            <Button onClick={() => handleOpenPlaceDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Place
            </Button>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search places..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    <div className="flex items-center gap-2">
                      {cat.icon}
                      {cat.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {trip.locations.length > 0 && (
              <Select value={filterLocation} onValueChange={setFilterLocation}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {trip.locations.map(loc => (
                    <SelectItem key={loc.id} value={loc.id}>{loc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {filteredPlaces.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No places saved yet</h2>
            <p className="text-muted-foreground mb-6">Start adding places you want to visit</p>
            <Button onClick={() => handleOpenPlaceDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Place
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(placesByCategory).map(([category, places]) => (
              <section key={category}>
                <div className="flex items-center gap-2 mb-4">
                  {getCategoryIcon(category)}
                  <h2 className="text-lg font-semibold">{getCategoryLabel(category)}</h2>
                  <Badge variant="secondary">{places.length}</Badge>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {places.map(place => (
                    <PlaceCard
                      key={place.id}
                      place={place}
                      trip={trip}
                      onEdit={() => handleOpenPlaceDialog(place)}
                      onDelete={() => handleDeletePlace(place.id)}
                      onAssign={() => handleOpenAssignDialog(place)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Add/Edit Place Dialog */}
      <Dialog open={isPlaceOpen} onOpenChange={setIsPlaceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPlace ? 'Edit Place' : 'Add Place'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Location <span className="text-destructive">*</span></label>
              <PlaceSearch onSelect={handlePlaceSearchSelect} />
              {searchedPlace && (
                <div className="mt-2 p-2 rounded-md bg-muted">
                  <p className="font-medium text-sm">{searchedPlace.name}</p>
                  <p className="text-xs text-muted-foreground">{searchedPlace.address}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Name <span className="text-muted-foreground text-xs">(optional)</span></label>
              <Input
                placeholder="Defaults to location name"
                value={placeName}
                onChange={(e) => handlePlaceNameChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={placeCategory} onValueChange={setPlaceCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          {cat.icon}
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {trip.locations.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trip Location</label>
                  <Select value={placeLocationId} onValueChange={setPlaceLocationId}>
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
              <label className="text-sm font-medium">Notes</label>
              <Input
                placeholder="Any notes..."
                value={placeNotes}
                onChange={(e) => setPlaceNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSavePlace} disabled={!searchedPlace}>
              {editingPlace ? 'Save' : 'Add Place'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign to Day Dialog */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Day</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Add <strong>{assigningPlace?.name}</strong> to your itinerary
            </p>
            <div className="space-y-2">
              <label className="text-sm font-medium">Day</label>
              <Select value={assignDay} onValueChange={setAssignDay}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a day" />
                </SelectTrigger>
                <SelectContent>
                  {trip.days.map((day, index) => {
                    const location = trip.locations.find(l => l.id === day.locationId)
                    return (
                      <SelectItem key={day.date} value={day.date}>
                        Day {index + 1} - {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {location && ` (${location.name})`}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAssignToDay}>
              Add to Day
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function PlaceCard({
  place,
  trip,
  onEdit,
  onDelete,
  onAssign
}: {
  place: SavedPlace
  trip: Trip
  onEdit: () => void
  onDelete: () => void
  onAssign: () => void
}) {
  const location = place.locationId
    ? trip.locations.find(l => l.id === place.locationId)
    : null

  // Check if this place is already assigned to any day
  const assignedDays = trip.days.filter(day =>
    day.activities.some(a => a.savedPlaceId === place.id)
  )

  return (
    <Card className="group">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium">{place.name}</h3>
            {place.address && (
              <p className="text-sm text-muted-foreground truncate mt-1">
                {place.address}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {location && (
                <Badge variant="outline">{location.name}</Badge>
              )}
              {assignedDays.length > 0 && (
                <Badge variant="secondary">
                  {assignedDays.length === 1
                    ? `Day ${trip.days.indexOf(assignedDays[0]) + 1}`
                    : `${assignedDays.length} days`
                  }
                </Badge>
              )}
            </div>
            {place.notes && (
              <p className="text-sm text-muted-foreground mt-2">{place.notes}</p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onAssign}>
                <Plus className="h-4 w-4 mr-2" />
                Add to Day
              </DropdownMenuItem>
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
      </CardContent>
    </Card>
  )
}
