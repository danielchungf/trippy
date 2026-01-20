import { Trip, Activity, SavedPlace, Accommodation, Location, generateDaysFromTrip } from '@/types'
import { v4 as uuidv4 } from 'uuid'

const TRIPS_KEY = 'piper_trips'

// Get all trips from localStorage
export function getTrips(): Trip[] {
  if (typeof window === 'undefined') return []
  const data = localStorage.getItem(TRIPS_KEY)
  if (!data) return []
  try {
    return JSON.parse(data)
  } catch {
    return []
  }
}

// Save all trips to localStorage
export function saveTrips(trips: Trip[]): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(TRIPS_KEY, JSON.stringify(trips))
}

// Get a single trip by ID
export function getTrip(id: string): Trip | undefined {
  const trips = getTrips()
  return trips.find(t => t.id === id)
}

// Create a new trip
export function createTrip(data: {
  name: string
  startDate: string
  endDate: string
  coverImage?: string
}): Trip {
  const trips = getTrips()

  const newTrip: Trip = {
    id: uuidv4(),
    name: data.name,
    startDate: data.startDate,
    endDate: data.endDate,
    coverImage: data.coverImage,
    locations: [],
    accommodations: [],
    savedPlaces: [],
    days: []
  }

  // Generate days
  newTrip.days = generateDaysFromTrip(newTrip)

  trips.push(newTrip)
  saveTrips(trips)

  return newTrip
}

// Update a trip
export function updateTrip(id: string, data: Partial<Trip>): Trip | undefined {
  const trips = getTrips()
  const index = trips.findIndex(t => t.id === id)
  if (index === -1) return undefined

  const updatedTrip = { ...trips[index], ...data }

  // Regenerate days if dates changed
  if (data.startDate || data.endDate) {
    updatedTrip.days = generateDaysFromTrip(updatedTrip)
  }

  trips[index] = updatedTrip
  saveTrips(trips)

  return updatedTrip
}

// Delete a trip
export function deleteTrip(id: string): boolean {
  const trips = getTrips()
  const filtered = trips.filter(t => t.id !== id)
  if (filtered.length === trips.length) return false
  saveTrips(filtered)
  return true
}

// Add a location to a trip
export function addLocation(tripId: string, data: {
  name: string
  color?: string
  startDate: string
  endDate: string
  coordinates?: { lat: number; lng: number }
  googlePlaceId?: string
}): Location | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const newLocation: Location = {
    id: uuidv4(),
    name: data.name,
    color: data.color,
    startDate: data.startDate,
    endDate: data.endDate,
    coordinates: data.coordinates,
    googlePlaceId: data.googlePlaceId
  }

  trip.locations.push(newLocation)

  // Update days with location assignments
  trip.days = generateDaysFromTrip(trip)

  saveTrips(trips)
  return newLocation
}

// Update a location
export function updateLocation(tripId: string, locationId: string, data: Partial<Location>): Location | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const locIndex = trip.locations.findIndex(l => l.id === locationId)
  if (locIndex === -1) return undefined

  trip.locations[locIndex] = { ...trip.locations[locIndex], ...data }

  // Update days with location assignments
  trip.days = generateDaysFromTrip(trip)

  saveTrips(trips)
  return trip.locations[locIndex]
}

// Delete a location
export function deleteLocation(tripId: string, locationId: string): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  trip.locations = trip.locations.filter(l => l.id !== locationId)
  // Also remove locationId from accommodations, savedPlaces, and days
  trip.accommodations = trip.accommodations.map(a =>
    a.locationId === locationId ? { ...a, locationId: undefined } : a
  )
  trip.savedPlaces = trip.savedPlaces.map(p =>
    p.locationId === locationId ? { ...p, locationId: undefined } : p
  )
  trip.days = trip.days.map(d =>
    d.locationId === locationId ? { ...d, locationId: undefined } : d
  )

  saveTrips(trips)
  return true
}

// Add an accommodation to a trip
export function addAccommodation(tripId: string, data: Omit<Accommodation, 'id'>): Accommodation | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const newAccommodation: Accommodation = {
    id: uuidv4(),
    ...data
  }

  trip.accommodations.push(newAccommodation)
  saveTrips(trips)
  return newAccommodation
}

// Update an accommodation
export function updateAccommodation(tripId: string, accommodationId: string, data: Partial<Accommodation>): Accommodation | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const index = trip.accommodations.findIndex(a => a.id === accommodationId)
  if (index === -1) return undefined

  trip.accommodations[index] = { ...trip.accommodations[index], ...data }
  saveTrips(trips)
  return trip.accommodations[index]
}

// Delete an accommodation
export function deleteAccommodation(tripId: string, accommodationId: string): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  trip.accommodations = trip.accommodations.filter(a => a.id !== accommodationId)
  saveTrips(trips)
  return true
}

// Add a saved place to a trip
export function addSavedPlace(tripId: string, data: Omit<SavedPlace, 'id'>): SavedPlace | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const newPlace: SavedPlace = {
    id: uuidv4(),
    ...data
  }

  trip.savedPlaces.push(newPlace)
  saveTrips(trips)
  return newPlace
}

// Update a saved place
export function updateSavedPlace(tripId: string, placeId: string, data: Partial<SavedPlace>): SavedPlace | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const index = trip.savedPlaces.findIndex(p => p.id === placeId)
  if (index === -1) return undefined

  trip.savedPlaces[index] = { ...trip.savedPlaces[index], ...data }
  saveTrips(trips)
  return trip.savedPlaces[index]
}

// Delete a saved place
export function deleteSavedPlace(tripId: string, placeId: string): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  trip.savedPlaces = trip.savedPlaces.filter(p => p.id !== placeId)
  // Also remove references from activities
  trip.days = trip.days.map(d => ({
    ...d,
    activities: d.activities.map(a =>
      a.savedPlaceId === placeId ? { ...a, savedPlaceId: undefined } : a
    )
  }))

  saveTrips(trips)
  return true
}

// Add an activity to a day
export function addActivity(tripId: string, date: string, data: Omit<Activity, 'id'>): Activity | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return undefined

  const newActivity: Activity = {
    id: uuidv4(),
    ...data
  }

  trip.days[dayIndex].activities.push(newActivity)
  saveTrips(trips)
  return newActivity
}

// Update an activity
export function updateActivity(tripId: string, date: string, activityId: string, data: Partial<Activity>): Activity | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return undefined

  const actIndex = trip.days[dayIndex].activities.findIndex(a => a.id === activityId)
  if (actIndex === -1) return undefined

  trip.days[dayIndex].activities[actIndex] = { ...trip.days[dayIndex].activities[actIndex], ...data }
  saveTrips(trips)
  return trip.days[dayIndex].activities[actIndex]
}

// Delete an activity
export function deleteActivity(tripId: string, date: string, activityId: string): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return false

  trip.days[dayIndex].activities = trip.days[dayIndex].activities.filter(a => a.id !== activityId)
  saveTrips(trips)
  return true
}

// Reorder activities within a day
export function reorderActivities(tripId: string, date: string, activityIds: string[]): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return false

  const activities = trip.days[dayIndex].activities
  const reordered = activityIds
    .map(id => activities.find(a => a.id === id))
    .filter((a): a is Activity => a !== undefined)

  trip.days[dayIndex].activities = reordered
  saveTrips(trips)
  return true
}

// Move activity to a different day
export function moveActivity(tripId: string, fromDate: string, toDate: string, activityId: string): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  const fromDayIndex = trip.days.findIndex(d => d.date === fromDate)
  const toDayIndex = trip.days.findIndex(d => d.date === toDate)
  if (fromDayIndex === -1 || toDayIndex === -1) return false

  const actIndex = trip.days[fromDayIndex].activities.findIndex(a => a.id === activityId)
  if (actIndex === -1) return false

  const [activity] = trip.days[fromDayIndex].activities.splice(actIndex, 1)
  trip.days[toDayIndex].activities.push(activity)

  saveTrips(trips)
  return true
}

// Update a day's name
export function updateDayName(tripId: string, date: string, name: string | undefined): boolean {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return false

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return false

  trip.days[dayIndex].name = name || undefined
  saveTrips(trips)
  return true
}

// Create activity from saved place (assign place to day)
export function createActivityFromPlace(tripId: string, date: string, placeId: string): Activity | undefined {
  const trips = getTrips()
  const trip = trips.find(t => t.id === tripId)
  if (!trip) return undefined

  const place = trip.savedPlaces.find(p => p.id === placeId)
  if (!place) return undefined

  const dayIndex = trip.days.findIndex(d => d.date === date)
  if (dayIndex === -1) return undefined

  const newActivity: Activity = {
    id: uuidv4(),
    title: place.name,
    savedPlaceId: place.id,
    place: {
      name: place.name,
      address: place.address,
      coordinates: place.coordinates,
      googlePlaceId: place.googlePlaceId
    },
    notes: place.notes
  }

  trip.days[dayIndex].activities.push(newActivity)
  saveTrips(trips)
  return newActivity
}
