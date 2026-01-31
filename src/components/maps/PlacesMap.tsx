"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { SavedPlace } from "@/types"
import { loadGoogleMaps } from "@/lib/maps"
import { MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface PlacesMapProps {
  places: SavedPlace[]
  hoveredPlaceId?: string | null
  focusedPlaceId?: string | null
  locationName?: string
}

export function PlacesMap({ places, hoveredPlaceId, focusedPlaceId, locationName }: PlacesMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerContentsRef = useRef<Map<string, HTMLDivElement>>(new Map())

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter places with valid coordinates
  const validPlaces = useMemo(() =>
    places.filter(
      p => p.coordinates.lat !== 0 && p.coordinates.lng !== 0
    ),
    [places]
  )

  // Create a stable key for places to use in dependencies
  const placesKey = useMemo(() =>
    validPlaces.map(p => `${p.id}:${p.coordinates.lat},${p.coordinates.lng}`).join('|'),
    [validPlaces]
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

        validPlaces.forEach(place => {
          if (place.coordinates.lat !== 0) {
            bounds.extend(new google.maps.LatLng(
              place.coordinates.lat,
              place.coordinates.lng
            ))
            hasValidCoords = true
          }
        })

        // Default center if no valid places
        const defaultCenter = { lat: 40.7128, lng: -74.0060 } // NYC

        googleMapRef.current = new maps.Map(mapRef.current, {
          center: hasValidCoords ? bounds.getCenter().toJSON() : defaultCenter,
          zoom: hasValidCoords ? 13 : 12,
          mapId: 'piper-places-map',
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        if (hasValidCoords && validPlaces.length > 1) {
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

  // Update markers when places change or map finishes loading
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null
    })
    markersRef.current = []
    markerContentsRef.current.clear()

    // Add new markers
    validPlaces.forEach((place) => {
      const position = {
        lat: place.coordinates.lat,
        lng: place.coordinates.lng
      }

      // Create custom marker content - simple circle dot
      const markerContent = document.createElement('div')
      markerContent.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 12px; height: 12px; border-radius: 9999px; background-color: #FF591E; border: 2px solid white; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2); transition: all 0.15s ease; transform: translateY(50%);'

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current,
        position,
        title: place.name,
        content: markerContent
      })

      markersRef.current.push(marker)
      markerContentsRef.current.set(place.id, markerContent)
    })

    // Update bounds
    if (validPlaces.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      validPlaces.forEach(place => {
        bounds.extend(new google.maps.LatLng(
          place.coordinates.lat,
          place.coordinates.lng
        ))
      })

      if (validPlaces.length > 1) {
        googleMapRef.current.fitBounds(bounds, 50)
      } else {
        googleMapRef.current.setCenter(bounds.getCenter())
        googleMapRef.current.setZoom(15)
      }
    }
  }, [placesKey, isLoading])

  // Update marker highlighting when hoveredPlaceId changes
  useEffect(() => {
    markerContentsRef.current.forEach((content, placeId) => {
      if (placeId === hoveredPlaceId) {
        content.style.backgroundColor = '#E04A15' // Slightly darker orange on hover
        content.style.width = '16px'
        content.style.height = '16px'
        content.style.zIndex = '1000'
      } else {
        content.style.backgroundColor = '#FF591E'
        content.style.width = '12px'
        content.style.height = '12px'
        content.style.zIndex = 'auto'
      }
    })
  }, [hoveredPlaceId])

  // Smooth zoom to focused place when clicked
  useEffect(() => {
    if (!googleMapRef.current || !focusedPlaceId) return

    const place = validPlaces.find(p => p.id === focusedPlaceId)
    if (!place) return

    const targetPosition = {
      lat: place.coordinates.lat,
      lng: place.coordinates.lng
    }

    // Smooth pan and zoom animation
    googleMapRef.current.panTo(targetPosition)

    // Animate zoom after pan starts
    setTimeout(() => {
      if (googleMapRef.current) {
        googleMapRef.current.setZoom(16)
      }
    }, 200)
  }, [focusedPlaceId, validPlaces])

  return (
    <div className="relative w-full h-full">
      {/* Map container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Location badge overlay */}
      {locationName && !isLoading && !error && (
        <div className="absolute top-3 left-3">
          <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
            {locationName}
          </Badge>
        </div>
      )}

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
      {!error && !isLoading && validPlaces.length === 0 && (
        <div className="absolute inset-0 bg-muted flex items-center justify-center">
          <div className="text-center p-4">
            <MapPin className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No places with locations yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Add places to see them on the map
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
