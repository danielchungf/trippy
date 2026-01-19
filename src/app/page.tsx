"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Plus, MapPin, Calendar as CalendarIcon, Trash2, MoreHorizontal, ChevronDown } from "lucide-react"
import { DateRange } from "react-day-picker"
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { Trip, TripStatus, getTripStatus, formatDateRange, getTripDuration } from "@/types"
import { getTrips, createTrip, deleteTrip } from "@/lib/storage"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function HomePage() {
  const [trips, setTrips] = useState<Trip[]>([])
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTripName, setNewTripName] = useState("")
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const isDesktop = useMediaQuery("(min-width: 768px)")

  useEffect(() => {
    setTrips(getTrips())
  }, [])

  const handleCreateTrip = () => {
    if (!newTripName || !dateRange?.from || !dateRange?.to) return

    const trip = createTrip({
      name: newTripName,
      startDate: dateRange.from.toISOString().split('T')[0],
      endDate: dateRange.to.toISOString().split('T')[0],
    })

    setTrips([...trips, trip])
    setNewTripName("")
    setDateRange(undefined)
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
          <Dialog open={isCreateOpen} onOpenChange={(open) => {
            setIsCreateOpen(open)
            if (!open) {
              setNewTripName("")
              setDateRange(undefined)
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Trip Dates</label>
                  <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between font-normal"
                      >
                        {dateRange?.from && dateRange?.to ? (
                          `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
                        ) : (
                          "Select dates"
                        )}
                        <ChevronDown className="h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={dateRange?.from}
                        selected={dateRange}
                        onSelect={(range) => {
                          setDateRange(range)
                          // Close popover when end date is selected (different from start date)
                          if (range?.from && range?.to && range.from.getTime() !== range.to.getTime()) {
                            setIsCalendarOpen(false)
                          }
                        }}
                        numberOfMonths={isDesktop ? 2 : 1}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleCreateTrip} disabled={!newTripName || !dateRange?.from || !dateRange?.to}>
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
              <CalendarIcon className="h-3.5 w-3.5" />
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
