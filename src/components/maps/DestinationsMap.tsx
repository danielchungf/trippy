"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { Location } from "@/types"
import { loadGoogleMaps } from "@/lib/maps"
import { MapPin } from "lucide-react"

interface DestinationsMapProps {
  locations: Location[]
  hoveredIndex?: number | null
}

export function DestinationsMap({ locations, hoveredIndex }: DestinationsMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const googleMapRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerContentsRef = useRef<HTMLDivElement[]>([])
  const polylineRef = useRef<google.maps.Polyline | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filter locations with valid coordinates - memoize to prevent unnecessary re-renders
  // Sort by startDate to ensure correct order
  const validLocations = useMemo(() =>
    [...locations]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .filter(l => l.coordinates && l.coordinates.lat !== 0 && l.coordinates.lng !== 0),
    [locations]
  )

  // Create a stable key for locations to use in dependencies
  const locationsKey = useMemo(() =>
    validLocations.map(l => `${l.id}:${l.coordinates?.lat},${l.coordinates?.lng}`).join('|'),
    [validLocations]
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

        validLocations.forEach(location => {
          if (location.coordinates && location.coordinates.lat !== 0) {
            bounds.extend(new google.maps.LatLng(
              location.coordinates.lat,
              location.coordinates.lng
            ))
            hasValidCoords = true
          }
        })

        // Default center: world view when no destinations
        const defaultCenter = { lat: 20, lng: 0 }
        const defaultZoom = 2

        googleMapRef.current = new maps.Map(mapRef.current, {
          center: hasValidCoords ? bounds.getCenter().toJSON() : defaultCenter,
          zoom: hasValidCoords ? 5 : defaultZoom,
          mapId: 'piper-destinations-map',
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        })

        if (hasValidCoords && validLocations.length > 1) {
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

  // Update markers when locations change or map finishes loading
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return

    // Clear existing markers
    markersRef.current.forEach(marker => {
      marker.map = null
    })
    markersRef.current = []
    markerContentsRef.current = []

    // Add new markers
    validLocations.forEach((location, index) => {
      if (!location.coordinates) return

      const position = {
        lat: location.coordinates.lat,
        lng: location.coordinates.lng
      }

      // Create custom marker content - matches DayMap number circle style
      const markerContent = document.createElement('div')
      markerContent.style.cssText = 'display: flex; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 9999px; background-color: rgb(38, 38, 38); color: white; font-size: 12px; font-weight: 500; line-height: 16px; letter-spacing: -0.02em; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); transition: background-color 0.15s ease; transform: translateY(50%);'
      markerContent.style.fontFamily = 'var(--font-dm-mono), ui-monospace, monospace'
      markerContent.textContent = (index + 1).toString()

      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: googleMapRef.current,
        position,
        title: location.name,
        content: markerContent,
        zIndex: 100
      })

      markersRef.current.push(marker)
      markerContentsRef.current.push(markerContent)
    })

    // Update bounds
    if (validLocations.length > 0) {
      const bounds = new google.maps.LatLngBounds()
      validLocations.forEach(location => {
        if (location.coordinates) {
          bounds.extend(new google.maps.LatLng(
            location.coordinates.lat,
            location.coordinates.lng
          ))
        }
      })

      if (validLocations.length > 1) {
        googleMapRef.current.fitBounds(bounds, 50)
      } else {
        googleMapRef.current.setCenter(bounds.getCenter())
        googleMapRef.current.setZoom(10)
      }
    }
  }, [validLocations, isLoading])

  // Update route/polyline display
  useEffect(() => {
    if (!googleMapRef.current || isLoading) return

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    if (validLocations.length < 2) return

    // Simple polyline connecting destinations
    const path = validLocations
      .filter(l => l.coordinates)
      .map(l => ({
        lat: l.coordinates!.lat,
        lng: l.coordinates!.lng
      }))

    polylineRef.current = new google.maps.Polyline({
      path,
      geodesic: true,
      strokeColor: '#FF591E',
      strokeOpacity: 0.8,
      strokeWeight: 3,
      map: googleMapRef.current
    })
  }, [locationsKey, isLoading])

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
    </div>
  )
}
