"use client"

import { useState, useEffect, useCallback } from "react"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { cn } from "@/lib/utils"
import { updateAccommodation, updateSavedPlace, updateLocation } from "@/lib/db"
import { usePlaceDetails, useInvalidatePlacePhotos } from "@/lib/hooks/use-places"

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
  const [needsFresh, setNeedsFresh] = useState(false)

  // Fetch photos via React Query — only when no preloaded photos or URLs expired
  const shouldFetch = !preloadedPhotos?.length || needsFresh
  const { data: placeDetails } = usePlaceDetails(shouldFetch ? googlePlaceId : undefined)
  const invalidatePhotos = useInvalidatePlacePhotos()

  // Sync photoIndex when selectedPhotoIndex prop changes
  useEffect(() => {
    setPhotoIndex(selectedPhotoIndex)
  }, [selectedPhotoIndex])

  // Use preloaded photos if provided (and not marked as needing fresh)
  useEffect(() => {
    if (preloadedPhotos && preloadedPhotos.length > 0 && !needsFresh) {
      setPhotos(preloadedPhotos)
    }
  }, [preloadedPhotos, needsFresh])

  // Sync photos from React Query result
  useEffect(() => {
    if (placeDetails?.photos && placeDetails.photos.length > 0) {
      setPhotos(placeDetails.photos)
    }
  }, [placeDetails])

  // Handle image load error (expired Google Places URLs return 403)
  const handleImageError = useCallback(() => {
    if (!needsFresh && googlePlaceId) {
      invalidatePhotos(googlePlaceId)
      setPhotos([])
      setNeedsFresh(true)
    }
  }, [needsFresh, googlePlaceId, invalidatePhotos])

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
            onError={handleImageError}
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
