"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, MapPin, Calendar, Trash2, MoreHorizontal } from "lucide-react"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Trip, TripStatus, getTripStatus, formatDateRange, getTripDuration } from "@/types"
import { getTrips, createTrip, deleteTrip } from "@/lib/storage"

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTripName, setNewTripName] = useState("")
  const [newTripStartDate, setNewTripStartDate] = useState("")
  const [newTripEndDate, setNewTripEndDate] = useState("")

  useEffect(() => {
    setTrips(getTrips())
  }, [])

  const handleCreateTrip = () => {
    if (!newTripName || !newTripStartDate || !newTripEndDate) return

    const trip = createTrip({
      name: newTripName,
      startDate: newTripStartDate,
      endDate: newTripEndDate,
    })

    setTrips([...trips, trip])
    setNewTripName("")
    setNewTripStartDate("")
    setNewTripEndDate("")
    setIsCreateOpen(false)
  }

  const handleDeleteTrip = (id: string) => {
    deleteTrip(id)
    setTrips(trips.filter(t => t.id !== id))
  }

  const groupedTrips = trips.reduce((acc, trip) => {
    const status = getTripStatus(trip)
    if (!acc[status]) acc[status] = []
    acc[status].push(trip)
    return acc
  }, {} as Record<TripStatus, Trip[]>)

  const statusOrder: TripStatus[] = ['ongoing', 'upcoming', 'past']
  const statusLabels: Record<TripStatus, string> = {
    ongoing: 'Current Trip',
    upcoming: 'Upcoming',
    past: 'Past Trips'
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Piper</h1>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Start Date</label>
                    <Input
                      type="date"
                      value={newTripStartDate}
                      onChange={(e) => setNewTripStartDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">End Date</label>
                    <Input
                      type="date"
                      value={newTripEndDate}
                      onChange={(e) => setNewTripEndDate(e.target.value)}
                      min={newTripStartDate}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateTrip} disabled={!newTripName || !newTripStartDate || !newTripEndDate}>
                  Create Trip
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {trips.length === 0 ? (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
              <MapPin className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No trips yet</h2>
            <p className="text-muted-foreground mb-6">Create your first trip to get started</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Trip
            </Button>
          </div>
        ) : (
          <div className="space-y-8">
            {statusOrder.map(status => {
              const statusTrips = groupedTrips[status]
              if (!statusTrips || statusTrips.length === 0) return null

              return (
                <section key={status}>
                  <h2 className="text-lg font-semibold mb-4">{statusLabels[status]}</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {statusTrips.map(trip => (
                      <TripCard
                        key={trip.id}
                        trip={trip}
                        status={status}
                        onDelete={() => handleDeleteTrip(trip.id)}
                      />
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}

function TripCard({
  trip,
  status,
  onDelete
}: {
  trip: Trip
  status: TripStatus
  onDelete: () => void
}) {
  const duration = getTripDuration(trip)
  const locationNames = trip.locations.map(l => l.name).join(' → ') || 'No locations added'

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Link href={`/trip/${trip.id}`}>
              <CardTitle className="text-lg hover:underline cursor-pointer">
                {trip.name}
              </CardTitle>
            </Link>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
              <span>·</span>
              <span>{duration} {duration === 1 ? 'day' : 'days'}</span>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-sm text-muted-foreground truncate">{locationNames}</span>
        </div>
        <div className="flex items-center gap-2 mt-3">
          {status === 'ongoing' && <Badge variant="default">In Progress</Badge>}
          {status === 'upcoming' && <Badge variant="secondary">Upcoming</Badge>}
          {trip.savedPlaces.length > 0 && (
            <Badge variant="outline">{trip.savedPlaces.length} places</Badge>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
