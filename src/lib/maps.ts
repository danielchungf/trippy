import { setOptions, importLibrary } from '@googlemaps/js-api-loader'
import { Coordinates, Activity } from '@/types'

let optionsSet = false
let mapsLibrary: google.maps.MapsLibrary | null = null
let placesLibrary: google.maps.PlacesLibrary | null = null

function ensureOptions(): void {
  if (optionsSet) return

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    throw new Error('Google Maps API key is not configured')
  }

  setOptions({
    key: apiKey,
    v: 'weekly',
  })
  optionsSet = true
}

export async function loadGoogleMaps(): Promise<google.maps.MapsLibrary> {
  if (mapsLibrary) return mapsLibrary

  ensureOptions()
  mapsLibrary = await importLibrary('maps')
  // Also load marker library for AdvancedMarkerElement
  await importLibrary('marker')
  return mapsLibrary
}

export async function loadPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (placesLibrary) return placesLibrary

  ensureOptions()
  placesLibrary = await importLibrary('places')
  return placesLibrary
}

export interface PlaceSearchResult {
  placeId: string
  name: string
  address: string
  coordinates: Coordinates
  photos?: string[]
}

export interface GeocodeResult {
  address: string
  coordinates: Coordinates
}

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  await loadGoogleMaps()
  const geocoder = new google.maps.Geocoder()

  try {
    const response = await geocoder.geocode({ address })
    if (response.results[0]?.geometry?.location) {
      const location = response.results[0].geometry.location
      return {
        address: response.results[0].formatted_address || address,
        coordinates: {
          lat: location.lat(),
          lng: location.lng()
        }
      }
    }
    return null
  } catch {
    return null
  }
}

export async function searchPlaces(
  query: string,
  location?: Coordinates,
  /** When true, strictly filter results to only include places within 500m of the coordinates */
  preciseMatch?: boolean
): Promise<PlaceSearchResult[]> {
  await loadGoogleMaps()
  await loadPlacesLibrary()

  const request: google.maps.places.SearchByTextRequest = {
    fields: ['id', 'displayName', 'formattedAddress', 'location'],
    textQuery: query,
    maxResultCount: 10,
    ...(location && {
      locationBias: {
        center: { lat: location.lat, lng: location.lng },
        radius: preciseMatch ? 5000 : 50000,
      } as google.maps.CircleLiteral,
    }),
  }

  try {
    const { places: results } = await google.maps.places.Place.searchByText(request)

    let mapped: PlaceSearchResult[] = (results || []).map(place => ({
      placeId: place.id || '',
      name: place.displayName || '',
      address: place.formattedAddress || '',
      coordinates: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0
      },
    }))

    // When preciseMatch is true and we have coordinates, strictly filter results
    // to only include places within 500m of the target coordinates.
    if (preciseMatch && location) {
      mapped = mapped.filter(place => {
        const distance = calculateDistance(location, place.coordinates)
        return distance <= 500
      })

      mapped.sort((a, b) => {
        const distA = calculateDistance(location, a.coordinates)
        const distB = calculateDistance(location, b.coordinates)
        return distA - distB
      })
    }

    return mapped
  } catch {
    return []
  }
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
  await loadGoogleMaps()
  await loadPlacesLibrary()

  try {
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({
      fields: ['id', 'displayName', 'formattedAddress', 'location', 'photos']
    })

    return {
      placeId: place.id || '',
      name: place.displayName || '',
      address: place.formattedAddress || '',
      coordinates: {
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0
      },
      photos: place.photos?.slice(0, 3).map(p => p.getURI({ maxWidth: 400 }))
    }
  } catch {
    return null
  }
}

// Essentials-tier Place Details call — only fetches photos + location data.
// Avoids requesting displayName (Pro tier) since callers already have the name.
export async function getPlacePhotos(placeId: string): Promise<{ photos: string[] } | null> {
  await loadGoogleMaps()
  await loadPlacesLibrary()

  try {
    const place = new google.maps.places.Place({ id: placeId })
    await place.fetchFields({
      fields: ['id', 'photos']
    })

    const photos = place.photos?.slice(0, 3).map(p => p.getURI({ maxWidth: 400 })) || []
    return { photos }
  } catch {
    return null
  }
}

export interface DirectionsResult {
  directionsResult: google.maps.DirectionsResult
  totalDistance: number // meters
  totalDuration: number // seconds
}

export async function getDirections(
  activities: Activity[],
  travelMode: 'WALKING' | 'DRIVING' = 'WALKING'
): Promise<DirectionsResult | null> {
  if (activities.length < 2) return null

  const validActivities = activities.filter(
    a => a.place.coordinates.lat !== 0 && a.place.coordinates.lng !== 0
  )

  if (validActivities.length < 2) return null

  await loadGoogleMaps()

  const directionsService = new google.maps.DirectionsService()

  // Convert string to TravelMode enum after loading the library
  const mode = travelMode === 'WALKING' ? google.maps.TravelMode.WALKING : google.maps.TravelMode.DRIVING

  const origin = validActivities[0].place.coordinates
  const destination = validActivities[validActivities.length - 1].place.coordinates
  const waypoints = validActivities.slice(1, -1).map(a => ({
    location: new google.maps.LatLng(a.place.coordinates.lat, a.place.coordinates.lng),
    stopover: true
  }))

  return new Promise((resolve) => {
    directionsService.route(
      {
        origin: new google.maps.LatLng(origin.lat, origin.lng),
        destination: new google.maps.LatLng(destination.lat, destination.lng),
        waypoints,
        travelMode: mode,
        optimizeWaypoints: false
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          let totalDistance = 0
          let totalDuration = 0

          result.routes[0].legs.forEach(leg => {
            totalDistance += leg.distance?.value || 0
            totalDuration += leg.duration?.value || 0
          })

          resolve({
            directionsResult: result,
            totalDistance,
            totalDuration
          })
        } else {
          resolve(null)
        }
      }
    )
  })
}

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(a: Coordinates, b: Coordinates): number {
  const R = 6371e3 // Earth's radius in meters
  const lat1 = a.lat * Math.PI / 180
  const lat2 = b.lat * Math.PI / 180
  const deltaLat = (b.lat - a.lat) * Math.PI / 180
  const deltaLng = (b.lng - a.lng) * Math.PI / 180

  const x = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) *
    Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x))

  return R * c
}

export async function optimizeRoute(
  activities: Activity[],
  startingLocation?: Coordinates
): Promise<number[] | null> {
  const validActivities = activities.filter(
    a => a.place.coordinates.lat !== 0 && a.place.coordinates.lng !== 0
  )

  // Need at least 2 activities to optimize (or 3 if no starting location)
  if (validActivities.length < 2) return null
  if (!startingLocation && validActivities.length < 3) return null

  await loadGoogleMaps()

  const directionsService = new google.maps.DirectionsService()

  // If we have a starting location (e.g., accommodation), use it as origin
  // Otherwise, use first activity as origin
  const origin = startingLocation || validActivities[0].place.coordinates

  // For a one-way optimized route:
  // - Find the activity farthest from origin to use as destination
  // - This gives us a sensible "end point" for the day
  // - All other activities become waypoints to be optimized

  if (startingLocation) {
    // Find activity farthest from starting location to use as destination
    let farthestIdx = 0
    let maxDistance = 0
    validActivities.forEach((activity, idx) => {
      const dist = calculateDistance(origin, activity.place.coordinates)
      if (dist > maxDistance) {
        maxDistance = dist
        farthestIdx = idx
      }
    })

    const destination = validActivities[farthestIdx]
    const waypointActivities = validActivities.filter((_, idx) => idx !== farthestIdx)
    const waypoints = waypointActivities.map(a => ({
      location: new google.maps.LatLng(a.place.coordinates.lat, a.place.coordinates.lng),
      stopover: true
    }))

    return new Promise((resolve) => {
      directionsService.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(
            destination.place.coordinates.lat,
            destination.place.coordinates.lng
          ),
          waypoints,
          travelMode: google.maps.TravelMode.WALKING,
          optimizeWaypoints: true
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const order = result.routes[0].waypoint_order

            // Map waypoint order back to original activity indices
            // waypointActivities excludes the farthest activity (destination)
            // so we need to map through that filtered list
            const optimizedWaypoints = order.map(i => activities.indexOf(waypointActivities[i]))
            // Add the farthest activity at the end (it's the destination)
            const fullOrder = [...optimizedWaypoints, activities.indexOf(destination)]

            resolve(fullOrder)
          } else {
            resolve(null)
          }
        }
      )
    })
  } else {
    // No starting location: use first activity as origin, find farthest as destination
    let farthestIdx = 1
    let maxDistance = 0
    for (let i = 1; i < validActivities.length; i++) {
      const dist = calculateDistance(origin, validActivities[i].place.coordinates)
      if (dist > maxDistance) {
        maxDistance = dist
        farthestIdx = i
      }
    }

    const destination = validActivities[farthestIdx]
    const waypointActivities = validActivities.filter((_, idx) => idx !== 0 && idx !== farthestIdx)
    const waypoints = waypointActivities.map(a => ({
      location: new google.maps.LatLng(a.place.coordinates.lat, a.place.coordinates.lng),
      stopover: true
    }))

    return new Promise((resolve) => {
      directionsService.route(
        {
          origin: new google.maps.LatLng(origin.lat, origin.lng),
          destination: new google.maps.LatLng(
            destination.place.coordinates.lat,
            destination.place.coordinates.lng
          ),
          waypoints,
          travelMode: google.maps.TravelMode.WALKING,
          optimizeWaypoints: true
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            const order = result.routes[0].waypoint_order

            // First activity (origin) stays first
            // Map waypoint indices, then add destination at end
            const waypointIndices = waypointActivities.map(a => validActivities.indexOf(a))
            const optimizedMiddle = order.map(i => waypointIndices[i])
            const fullOrder = [0, ...optimizedMiddle, farthestIdx]

            resolve(fullOrder)
          } else {
            resolve(null)
          }
        }
      )
    })
  }
}

export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) {
    return `${minutes} min`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}
