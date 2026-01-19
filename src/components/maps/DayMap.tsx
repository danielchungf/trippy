"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Activity } from "@/types"
import { loadGoogleMaps, getDirections, formatDistance, formatDuration } from "@/lib/maps"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Route, Footprints, Car } from "lucide-react"

interface DayMapProps {
  activities: Activity[]
  showRoute?: boolean
  onRouteToggle?: (show: boolean) => void
}

export function DayMap({ activities, showRoute = true, onRouteToggle }: DayMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const isUpdatingRouteRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeMode, setRouteMode] = useState<'lines' | 'directions'>('lines')
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING'>('WALKING')
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)

  // Filter activities with valid coordinates - memoize to prevent unnecessary re-renders
  const validActivities = useMemo(() =>
    activities.filter(
      a => a.place.coordinates.lat !== 0 && a.place.coordinates.lng !== 0
    ),
    [activities]
  )

  // Create a stable key for activities to use in dependencies
  const activitiesKey = useMemo(() =>
    validActivities.map(a => `${a.id}:${a.place.coordinates.lat},${a.place.coordinates.lng}`).join('|'),
    [validActivities]
  )

  // Initialize map
  useEffect(() => {
    let mounted = true

    async function initMap() {
      if (!mapRef.current) return

      try {
        const maps = await loadGoogleMaps()

        if (!mounted) return

        // Calculate bounds
        const bounds = new google.maps.LatLngBounds()
        let hasValidCoords = false

        validActivities.forEach(activity => {
          if (activity.place.coordinates.lat !== 0) {
            bounds.extend(new google.maps.LatLng(
              activity.place.coordinates.lat,
              activity.place.coordinates.lng
            ))
            hasValidCoords = true
          }
        })

        // Default center if no valid activities
        const defaultCenter = { lat: 40.7128, lng: -74.0060 } // NYC

        googleMapRef.current = new maps.Map(mapRef.current, {
          center: hasValidCoords ? bounds.getCenter().toJSON() : defaultCenter,
          zoom: hasValidCoords ? 13 : 12,
          mapId: 'piper-day-map',
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        if (hasValidCoords && validActivities.length > 1) {
          googleMapRef.current.fitBounds(bounds, 50)
        }

        setIsLoading(false)
      } catch {
        if (!mounted) return
        setError('Failed to load Google Maps. Check your API key.')
        setIsLoading(false)
      }
    }

    initMap()

    return () => {
      mounted = false
    }
  }, [])

  // Update markers when activities change
  useEffect(() => {
    if (!googleMapRef.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null
    })
    markersRef.current = []

    // Add new markers
    validActivities.forEach((activity, index) => {
      const position = {
        lat: activity.place.coordinates.lat,
        lng: activity.place.coordinates.lng
      }

      // Create custom marker content
      const markerContent = document.createElement('div')
      markerContent.className = 'flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-medium text-sm shadow-lg'
      markerContent.textContent = (index + 1).toString()

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current,
        position,
        title: activity.title,
        content: markerContent
      })

      markersRef.current.push(marker)
    })

    // Update bounds
    if (validActivities.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      validActivities.forEach(activity => {
        bounds.extend(new google.maps.LatLng(
          activity.place.coordinates.lat,
          activity.place.coordinates.lng
        ))
      })

      if (validActivities.length > 1) {
        googleMapRef.current.fitBounds(bounds, 50)
      } else {
        googleMapRef.current.setCenter(bounds.getCenter())
        googleMapRef.current.setZoom(15)
      }
    }
  }, [validActivities])

  // Update route display
  useEffect(() => {
    // Don't run until map is fully loaded
    if (!googleMapRef.current || isLoading) return

    // Prevent concurrent updates
    if (isUpdatingRouteRef.current) return
    isUpdatingRouteRef.current = true

    // Clear existing route
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null)
      directionsRendererRef.current = null
    }

    if (!showRoute || validActivities.length < 2) {
      setRouteInfo(null)
      isUpdatingRouteRef.current = false
      return
    }

    if (routeMode === 'lines') {
      // Simple polyline
      const path = validActivities.map(a => ({
        lat: a.place.coordinates.lat,
        lng: a.place.coordinates.lng
      }))

      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#3b82f6',
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map: googleMapRef.current
      })
      setRouteInfo(null)
      isUpdatingRouteRef.current = false
    } else {
      // Google Directions
      getDirections(validActivities, travelMode).then(result => {
        if (result && googleMapRef.current) {
          // Clear any existing renderer before creating new one
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null)
          }

          directionsRendererRef.current = new google.maps.DirectionsRenderer({
            map: googleMapRef.current,
            directions: result.directionsResult,
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#3b82f6',
              strokeOpacity: 0.8,
              strokeWeight: 4
            }
          })

          setRouteInfo({
            distance: result.totalDistance,
            duration: result.totalDuration
          })
        } else {
          setRouteInfo(null)
        }
        isUpdatingRouteRef.current = false
      }).catch(() => {
        isUpdatingRouteRef.current = false
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRoute, activitiesKey, routeMode, travelMode, isLoading])

  return (
    <div className="relative w-full h-full">
      {/* Map container - always rendered so it can initialize */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-destructive">{error}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in your environment
            </p>
          </div>
        </div>
      )}

      {/* Loading overlay */}
      {!error && isLoading && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground mt-2">Loading map...</p>
          </div>
        </div>
      )}

      {/* Empty state overlay */}
      {!error && !isLoading && validActivities.length === 0 && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activities with locations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add activities to see them on the map
            </p>
          </div>
        </div>
      )}

      {/* Route controls */}
      {!isLoading && !error && validActivities.length >= 2 && (
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-background rounded-lg shadow-lg p-2 flex gap-1">
            <Button
              variant={showRoute ? "default" : "outline"}
              size="sm"
              onClick={() => onRouteToggle?.(!showRoute)}
            >
              <Route className="h-4 w-4 mr-1" />
              Route
            </Button>

            {showRoute && (
              <>
                <Button
                  variant={routeMode === 'lines' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRouteMode('lines')}
                >
                  Lines
                </Button>
                <Button
                  variant={routeMode === 'directions' ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setRouteMode('directions')}
                >
                  Directions
                </Button>
              </>
            )}
          </div>

          {showRoute && routeMode === 'directions' && (
            <div className="bg-background rounded-lg shadow-lg p-2 flex gap-1">
              <Button
                variant={travelMode === 'WALKING' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTravelMode('WALKING')}
              >
                <Footprints className="h-4 w-4" />
              </Button>
              <Button
                variant={travelMode === 'DRIVING' ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setTravelMode('DRIVING')}
              >
                <Car className="h-4 w-4" />
              </Button>
            </div>
          )}

          {routeInfo && (
            <div className="bg-background rounded-lg shadow-lg px-3 py-2">
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">{formatDistance(routeInfo.distance)}</Badge>
                <Badge variant="outline">{formatDuration(routeInfo.duration)}</Badge>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Activity count */}
      {!isLoading && !error && validActivities.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-background rounded-lg shadow-lg px-3 py-2">
          <p className="text-sm text-muted-foreground">
            {validActivities.length} {validActivities.length === 1 ? 'location' : 'locations'}
          </p>
        </div>
      )}
    </div>
  )
}
