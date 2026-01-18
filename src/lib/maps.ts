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

export async function searchPlaces(
  query: string,
  location?: Coordinates
): Promise<PlaceSearchResult[]> {
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

export interface DirectionsResult {
  routes: google.maps.DirectionsRoute[]
  totalDistance: number // meters
  totalDuration: number // seconds
}

export async function getDirections(
  activities: Activity[],
  travelMode: google.maps.TravelMode = google.maps.TravelMode.WALKING
): Promise<DirectionsResult | null> {
  if (activities.length < 2) return null

  const validActivities = activities.filter(
    a => a.place.coordinates.lat !== 0 && a.place.coordinates.lng !== 0
  )

  if (validActivities.length < 2) return null

  await loadGoogleMaps()

  const directionsService = new google.maps.DirectionsService()

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
        travelMode,
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
            routes: result.routes,
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

export async function optimizeRoute(
  activities: Activity[]
): Promise<number[] | null> {
  if (activities.length < 3) return null

  const validActivities = activities.filter(
    a => a.place.coordinates.lat !== 0 && a.place.coordinates.lng !== 0
  )

  if (validActivities.length < 3) return null

  await loadGoogleMaps()

  const directionsService = new google.maps.DirectionsService()

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
        travelMode: google.maps.TravelMode.WALKING,
        optimizeWaypoints: true
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          const order = result.routes[0].waypoint_order
          // Map back to original indices
          // 0 = first activity (origin), then optimized waypoints, then last activity (destination)
          const fullOrder = [0, ...order.map(i => i + 1), validActivities.length - 1]
          resolve(fullOrder)
        } else {
          resolve(null)
        }
      }
    )
  })
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
