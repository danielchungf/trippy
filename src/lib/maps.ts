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
  rating?: number
  types?: string[]
  photos?: string[]
}

export interface PlaceReview {
  authorName: string
  rating: number
  text: string
  relativeTimeDescription: string
}

export interface PlaceDetailsExtended extends PlaceSearchResult {
  website?: string
  phoneNumber?: string
  openingHours?: string[]
  isOpenNow?: boolean
  priceLevel?: number
  reviewCount?: number
  reviews?: PlaceReview[]
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
  location?: Coordinates
): Promise<PlaceSearchResult[]> {
  // Load both maps (for LatLng) and places libraries
  await loadGoogleMaps()
  const places = await loadPlacesLibrary()

  const request: google.maps.places.TextSearchRequest = {
    query,
    ...(location && {
      location: new google.maps.LatLng(location.lat, location.lng),
      radius: 50000 // 50km radius
    })
  }

  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement('div'))

    service.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        const mapped: PlaceSearchResult[] = results.slice(0, 10).map(place => ({
          placeId: place.place_id || '',
          name: place.name || '',
          address: place.formatted_address || '',
          coordinates: {
            lat: place.geometry?.location?.lat() || 0,
            lng: place.geometry?.location?.lng() || 0
          },
          rating: place.rating,
          types: place.types,
          photos: place.photos?.slice(0, 3).map(p => p.getUrl({ maxWidth: 400 }))
        }))
        resolve(mapped)
      } else {
        resolve([])
      }
    })
  })
}

export async function getPlaceDetails(placeId: string): Promise<PlaceSearchResult | null> {
  await loadGoogleMaps()
  const places = await loadPlacesLibrary()

  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement('div'))

    service.getDetails(
      {
        placeId,
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'photos', 'types']
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve({
            placeId: place.place_id || '',
            name: place.name || '',
            address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0
            },
            rating: place.rating,
            types: place.types,
            photos: place.photos?.slice(0, 3).map(p => p.getUrl({ maxWidth: 400 }))
          })
        } else {
          resolve(null)
        }
      }
    )
  })
}

export async function getPlaceDetailsExtended(placeId: string): Promise<PlaceDetailsExtended | null> {
  await loadGoogleMaps()
  const places = await loadPlacesLibrary()

  return new Promise((resolve) => {
    const service = new places.PlacesService(document.createElement('div'))

    service.getDetails(
      {
        placeId,
        fields: [
          'place_id',
          'name',
          'formatted_address',
          'geometry',
          'rating',
          'photos',
          'types',
          'website',
          'formatted_phone_number',
          'opening_hours',
          'price_level',
          'reviews',
          'user_ratings_total'
        ]
      },
      (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          resolve({
            placeId: place.place_id || '',
            name: place.name || '',
            address: place.formatted_address || '',
            coordinates: {
              lat: place.geometry?.location?.lat() || 0,
              lng: place.geometry?.location?.lng() || 0
            },
            rating: place.rating,
            types: place.types,
            photos: place.photos?.slice(0, 5).map(p => p.getUrl({ maxWidth: 800 })),
            website: place.website,
            phoneNumber: place.formatted_phone_number,
            openingHours: place.opening_hours?.weekday_text,
            isOpenNow: place.opening_hours?.isOpen?.(),
            priceLevel: place.price_level,
            reviewCount: place.user_ratings_total,
            reviews: place.reviews?.slice(0, 3).map(review => ({
              authorName: review.author_name || 'Anonymous',
              rating: review.rating || 0,
              text: review.text || '',
              relativeTimeDescription: review.relative_time_description || ''
            }))
          })
        } else {
          resolve(null)
        }
      }
    )
  })
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
