"use client"

import { useEffect, useRef, useState, useMemo, useCallback } from "react"
import { Activity, SavedPlace } from "@/types"
import { loadGoogleMaps, getDirections, formatDistance, formatDuration } from "@/lib/maps"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getPlaceDetails } from "@/lib/maps"
import { MapPin, Footprints, Car, Plus } from "lucide-react"

interface DayMapProps {
  activities: Activity[]
  hoveredIndex?: number | null
  focusedIndex?: number | null
  savedPlaces?: SavedPlace[]
  onAddPlaceAsActivity?: (placeId: string) => void
  locationCenter?: { lat: number; lng: number }
}

export function DayMap({ activities, hoveredIndex, focusedIndex, savedPlaces, onAddPlaceAsActivity, locationCenter }: DayMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerContentsRef = useRef<HTMLDivElement[]>([])
  const savedPlaceMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
  const isUpdatingRouteRef = useRef(false)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [routeMode, setRouteMode] = useState<'lines' | 'directions'>('lines')
  const [travelMode, setTravelMode] = useState<'WALKING' | 'DRIVING'>('WALKING')
  const [routeInfo, setRouteInfo] = useState<{ distance: number; duration: number } | null>(null)
  const [selectedSavedPlace, setSelectedSavedPlace] = useState<SavedPlace | null>(null)
  const [popoverPosition, setPopoverPosition] = useState<{ x: number; y: number } | null>(null)
  const [popoverPhoto, setPopoverPhoto] = useState<string | null>(null)

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

  // Filter saved places with valid coordinates
  const validSavedPlaces = useMemo(() =>
    (savedPlaces || []).filter(
      p => p.coordinates.lat !== 0 && p.coordinates.lng !== 0
    ),
    [savedPlaces]
  )

  // Close popover when clicking outside
  const handleMapClick = useCallback(() => {
    setSelectedSavedPlace(null)
    setPopoverPosition(null)
    setPopoverPhoto(null)
  }, [])

  // Fetch photo when saved place is selected
  useEffect(() => {
    if (!selectedSavedPlace?.googlePlaceId) {
      setPopoverPhoto(null)
      return
    }

    getPlaceDetails(selectedSavedPlace.googlePlaceId).then(details => {
      if (details?.photos?.[0]) {
        setPopoverPhoto(details.photos[0])
      }
    }).catch(() => {
      setPopoverPhoto(null)
    })
  }, [selectedSavedPlace])

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

        // Default center: use location center if provided, otherwise NYC fallback
        const defaultCenter = locationCenter || { lat: 40.7128, lng: -74.0060 }

        googleMapRef.current = new maps.Map(mapRef.current, {
          center: hasValidCoords ? bounds.getCenter().toJSON() : defaultCenter,
          zoom: hasValidCoords ? 13 : (locationCenter ? 13 : 12),
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

  // Update markers when activities change or map finishes loading
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null
    })
    markersRef.current = []
    markerContentsRef.current = []

    // Add new markers
    validActivities.forEach((activity, index) => {
      const position = {
        lat: activity.place.coordinates.lat,
        lng: activity.place.coordinates.lng
      }

      // Create custom marker content - matches ActivityCard number circle
      // translateY(50%) shifts the marker down so its center aligns with the coordinate
      const markerContent = document.createElement('div')
      markerContent.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 9999px; background-color: rgb(38, 38, 38); color: white; font-size: 12px; font-weight: 500; line-height: 16px; letter-spacing: -0.02em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: background-color 0.15s ease; transform: translateY(50%);'
      markerContent.style.fontFamily = 'var(--font-dm-mono), ui-monospace, monospace'
      markerContent.textContent = (index + 1).toString()

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current,
        position,
        title: activity.title,
        content: markerContent,
        zIndex: 100 // Above saved place markers and POI labels
      })

      markersRef.current.push(marker)
      markerContentsRef.current.push(markerContent)
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
  }, [validActivities, isLoading])

  // Update saved place markers
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return

    // Clear existing saved place markers
    savedPlaceMarkersRef.current.forEach(marker => {
      marker.map = null
    })
    savedPlaceMarkersRef.current = []

    if (validSavedPlaces.length === 0) return

    // Add saved place markers as small blue dots
    validSavedPlaces.forEach((place) => {
      const position = {
        lat: place.coordinates.lat,
        lng: place.coordinates.lng
      }

      // Create custom marker content - small orange dot
      const markerContent = document.createElement('div')
      markerContent.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: center;
        width: 12px;
        height: 12px;
        border-radius: 9999px;
        background-color: #FF591E;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        transition: all 0.15s ease;
        transform: translateY(50%);
        cursor: pointer;
      `

      // Hover effects
      markerContent.addEventListener('mouseenter', () => {
        markerContent.style.width = '16px'
        markerContent.style.height = '16px'
        markerContent.style.backgroundColor = '#E04D15'
      })
      markerContent.addEventListener('mouseleave', () => {
        markerContent.style.width = '12px'
        markerContent.style.height = '12px'
        markerContent.style.backgroundColor = '#FF591E'
      })

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current,
        position,
        title: place.name,
        content: markerContent,
        zIndex: 1 // Below activity markers
      })

      // Click handler to show popover
      marker.addListener('click', () => {
        if (!mapRef.current || !googleMapRef.current) return

        // Get marker position on screen
        const projection = googleMapRef.current.getProjection()
        const bounds = googleMapRef.current.getBounds()
        if (!projection || !bounds) return

        const scale = Math.pow(2, googleMapRef.current.getZoom() || 0)
        const nw = projection.fromLatLngToPoint(bounds.getNorthEast())
        const point = projection.fromLatLngToPoint(new google.maps.LatLng(position.lat, position.lng))

        if (!nw || !point) return

        const mapRect = mapRef.current.getBoundingClientRect()
        const x = Math.floor((point.x - nw.x) * scale + mapRect.width)
        const y = Math.floor((point.y - nw.y) * scale)

        // Adjust position to keep popover in view
        const popoverWidth = 240
        const popoverHeight = 200
        const adjustedX = Math.min(Math.max(10, x - popoverWidth / 2), mapRect.width - popoverWidth - 10)
        const adjustedY = y + 20 > mapRect.height - popoverHeight ? y - popoverHeight - 20 : y + 20

        setSelectedSavedPlace(place)
        setPopoverPosition({ x: adjustedX, y: adjustedY })
      })

      savedPlaceMarkersRef.current.push(marker)
    })

    // Update map center when no activities
    if (validActivities.length === 0) {
      if (locationCenter) {
        // Center on the day's location (e.g., Kyoto)
        googleMapRef.current.setCenter(locationCenter)
        googleMapRef.current.setZoom(13)
      } else if (validSavedPlaces.length > 0) {
        // Fallback: fit to saved places if no location center
        const bounds = new google.maps.LatLngBounds()
        validSavedPlaces.forEach(place => {
          bounds.extend(new google.maps.LatLng(place.coordinates.lat, place.coordinates.lng))
        })
        if (validSavedPlaces.length > 1) {
          googleMapRef.current.fitBounds(bounds, 50)
        } else {
          googleMapRef.current.setCenter(bounds.getCenter())
          googleMapRef.current.setZoom(15)
        }
      }
    }
  }, [validSavedPlaces, validActivities.length, isLoading, locationCenter])

  // Add map click listener to close popover
  useEffect(() => {
    if (!googleMapRef.current) return
    const listener = googleMapRef.current.addListener('click', handleMapClick)
    return () => {
      google.maps.event.removeListener(listener)
    }
  }, [handleMapClick, isLoading])

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

    if (validActivities.length < 2) {
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
        strokeColor: '#FF591E',
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
              strokeColor: '#FF591E',
              strokeOpacity: 0.8,
              strokeWeight: 3
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
  }, [activitiesKey, routeMode, travelMode, isLoading])

  // Update marker highlighting when hoveredIndex changes
  useEffect(() => {
    markerContentsRef.current.forEach((content, index) => {
      if (index === hoveredIndex) {
        content.style.backgroundColor = '#FF591E'
      } else {
        content.style.backgroundColor = 'rgb(38, 38, 38)'
      }
    })
  }, [hoveredIndex])

  // Smooth zoom to focused activity when clicked
  useEffect(() => {
    if (!googleMapRef.current || focusedIndex === null || focusedIndex === undefined) return

    const activity = validActivities[focusedIndex]
    if (!activity) return

    const targetPosition = {
      lat: activity.place.coordinates.lat,
      lng: activity.place.coordinates.lng
    }

    googleMapRef.current.panTo(targetPosition)

    setTimeout(() => {
      if (googleMapRef.current) {
        googleMapRef.current.setZoom(16)
      }
    }, 200)
  }, [focusedIndex, validActivities])

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

      {/* Empty state overlay - only show if no activities AND no saved places */}
      {!error && !isLoading && validActivities.length === 0 && validSavedPlaces.length === 0 && (
        <div className="absolute inset-0 bg-neutral-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-1">
            <span className="text-h2 text-text-primary">Nothing to show yet</span>
            <span className="text-body text-text-secondary">Add activities to reveal the map</span>
          </div>
        </div>
      )}

      {/* Route controls - Hidden for now, saved for later use
      {!isLoading && !error && validActivities.length >= 2 && (
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-background rounded-lg shadow-lg p-1 flex gap-1">
            <Button
              variant={routeMode === 'lines' ? "default" : "ghost"}
              size="sm"
              onClick={() => setRouteMode('lines')}
            >
              Lines
            </Button>
            <Button
              variant={routeMode === 'directions' ? "default" : "ghost"}
              size="sm"
              onClick={() => setRouteMode('directions')}
            >
              Directions
            </Button>
          </div>

          {routeMode === 'directions' && (
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

          {routeMode === 'directions' && routeInfo && (
            <div className="bg-background rounded-lg shadow-lg px-3 py-2">
              <div className="flex gap-2 text-sm">
                <Badge variant="secondary">{formatDistance(routeInfo.distance)}</Badge>
                <Badge variant="outline">{formatDuration(routeInfo.duration)}</Badge>
              </div>
            </div>
          )}
        </div>
      )}
      */}

      {/* Saved Place Popover */}
      {selectedSavedPlace && popoverPosition && (
        <div
          className="absolute z-50 bg-white rounded-lg shadow-lg border overflow-hidden w-[240px]"
          style={{ left: popoverPosition.x, top: popoverPosition.y }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Photo - 16:9 aspect ratio */}
          <div className="w-full aspect-video bg-neutral-100">
            {popoverPhoto ? (
              <img
                src={popoverPhoto}
                alt={selectedSavedPlace.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <MapPin className="h-6 w-6 text-neutral-300" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="p-3 flex flex-col gap-2">
            <div className="text-h3 text-text-primary line-clamp-1">{selectedSavedPlace.name}</div>
            <Button
              variant="secondary"
              size="small"
              className="w-full"
              leftIcon={<Plus />}
              onClick={() => {
                onAddPlaceAsActivity?.(selectedSavedPlace.id)
                setSelectedSavedPlace(null)
                setPopoverPosition(null)
                setPopoverPhoto(null)
              }}
            >
              Add as activity
            </Button>
          </div>
        </div>
      )}

    </div>
  )
}
