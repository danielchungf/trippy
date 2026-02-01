"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateAccommodation, updateSavedPlace, updateLocation } from "@/lib/db"

type EntityType = 'accommodation' | 'savedPlace' | 'location'

interface PlacePhotoProps {
  /** Google Place ID to fetch photos from */
  googlePlaceId?: string
  /** Pre-loaded photos array (optional - if provided, skips API fetch) */
  photos?: string[]
  /** Currently selected photo index (from database) */
  selectedPhotoIndex?: number
  /** Alt text for the image */
  alt: string
  /** Additional class names for the container */
  className?: string
  /** Width of the photo container */
  width?: number | string
  /** Height of the photo container */
  height?: number | string
  /** Placeholder icon when no photo is available */
  placeholderIcon?: React.ReactNode
  /** If provided, enables editing and saves photo selection to database */
  editable?: {
    tripId: string
    entityId: string
    entityType: EntityType
    onRefresh?: () => Promise<void>
  }
}

// Cache for fetched photos to avoid redundant API calls
const photoCache = new Map<string, string[]>()

export function PlacePhoto({
  googlePlaceId,
  photos: preloadedPhotos,
  selectedPhotoIndex = 0,
  alt,
  className,
  width,
  height,
  placeholderIcon,
  editable
}: PlacePhotoProps) {
  const [photos, setPhotos] = useState<string[]>(preloadedPhotos || [])
  const [photoIndex, setPhotoIndex] = useState(selectedPhotoIndex)

  // Sync photoIndex when selectedPhotoIndex prop changes
  useEffect(() => {
    setPhotoIndex(selectedPhotoIndex)
  }, [selectedPhotoIndex])

  // Use preloaded photos if provided
  useEffect(() => {
    if (preloadedPhotos && preloadedPhotos.length > 0) {
      setPhotos(preloadedPhotos)
    }
  }, [preloadedPhotos])

  // Fetch photos from Google Places API (with caching) if no preloaded photos
  useEffect(() => {
    if (preloadedPhotos && preloadedPhotos.length > 0) return
    if (!googlePlaceId) return

    // Check cache first
    const cached = photoCache.get(googlePlaceId)
    if (cached) {
      setPhotos(cached)
      return
    }

    import('@/lib/maps').then(({ getPlaceDetails }) => {
      getPlaceDetails(googlePlaceId).then(details => {
        if (details?.photos && details.photos.length > 0) {
          photoCache.set(googlePlaceId, details.photos)
          setPhotos(details.photos)
        }
      }).catch(() => {
        // Silently fail - no photos available
      })
    })
  }, [googlePlaceId, preloadedPhotos])

  // Save photo selection to database based on entity type
  const savePhotoIndex = useCallback(async (newIndex: number) => {
    if (!editable) return

    const { tripId, entityId, entityType, onRefresh } = editable

    switch (entityType) {
      case 'accommodation':
        await updateAccommodation(tripId, entityId, { selectedPhotoIndex: newIndex })
        break
      case 'savedPlace':
        await updateSavedPlace(tripId, entityId, { selectedPhotoIndex: newIndex })
        break
      case 'location':
        await updateLocation(tripId, entityId, { selectedPhotoIndex: newIndex })
        break
    }

    if (onRefresh) {
      await onRefresh()
    }
  }, [editable])

  const handlePrevPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const newIndex = (photoIndex - 1 + photos.length) % photos.length
    setPhotoIndex(newIndex)
    if (editable) {
      savePhotoIndex(newIndex)
    }
  }, [photoIndex, photos.length, editable, savePhotoIndex])

  const handleNextPhoto = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    const newIndex = (photoIndex + 1) % photos.length
    setPhotoIndex(newIndex)
    if (editable) {
      savePhotoIndex(newIndex)
    }
  }, [photoIndex, photos.length, editable, savePhotoIndex])

  const hasMultiplePhotos = photos.length > 1
  const showArrows = hasMultiplePhotos
  const currentPhoto = photos[photoIndex] || photos[0]

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden bg-neutral-100 relative",
        showArrows && "group/photo",
        className
      )}
      style={{
        width: width ?? 'auto',
        height: height ?? 'auto'
      }}
    >
      {currentPhoto ? (
        <>
          <img
            src={currentPhoto}
            alt={alt}
            className="w-full h-full object-cover"
          />
          {/* Hover overlay with navigation arrows */}
          {showArrows && (
            <div className="absolute inset-0 bg-black/25 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-between px-1">
              <button
                onClick={handlePrevPhoto}
                className="w-6 h-6 flex items-center justify-center text-white hover:scale-110 transition-transform"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={handleNextPhoto}
                className="w-6 h-6 flex items-center justify-center text-white hover:scale-110 transition-transform"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {placeholderIcon || <MapPin className="h-5 w-5 text-neutral-300" />}
        </div>
      )}
    </div>
  )
}

// Re-export for backwards compatibility
export { PlacePhoto as AccommodationPhoto }
