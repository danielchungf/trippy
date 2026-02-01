"use client"

import { useState, useEffect } from "react"
import {
  MapPin,
  Phone,
  Globe,
  SquarePen,
  Trash2,
  X,
  BedDouble,
} from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { PlacePhoto } from "@/components/PlacePhoto"
import { Accommodation, Location, parseLocalDate } from "@/types"
import { getPlaceDetailsExtended, PlaceDetailsExtended } from "@/lib/maps"
import { deleteAccommodation } from "@/lib/db"

interface StayDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tripId: string
  accommodation: Accommodation | null
  locations: Location[]
  onRefresh: () => Promise<void>
}

function formatDateRange(checkIn: string, checkOut: string): string {
  const start = parseLocalDate(checkIn)
  const end = parseLocalDate(checkOut)

  const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  const startStr = start.toLocaleDateString('en-US', formatOptions).toUpperCase()
  const endStr = end.toLocaleDateString('en-US', formatOptions).toUpperCase()

  return `${startStr} — ${endStr}`
}

function getNightsCount(checkIn: string, checkOut: string): number {
  const start = parseLocalDate(checkIn)
  const end = parseLocalDate(checkOut)
  const diff = end.getTime() - start.getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export function StayDrawer({
  open,
  onOpenChange,
  tripId,
  accommodation,
  locations,
  onRefresh,
}: StayDrawerProps) {
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Google details state
  const [googleDetails, setGoogleDetails] = useState<PlaceDetailsExtended | null>(null)

  // Get location for this accommodation
  const location = accommodation?.locationId
    ? locations.find(l => l.id === accommodation.locationId)
    : undefined

  // Fetch extended Google details when drawer opens
  useEffect(() => {
    if (open && accommodation?.googlePlaceId) {
      getPlaceDetailsExtended(accommodation.googlePlaceId)
        .then(details => {
          setGoogleDetails(details)
        })
        .catch(() => {
          // Silently fail - just don't show extended details
        })
    } else {
      setGoogleDetails(null)
    }
  }, [open, accommodation?.googlePlaceId])

  const handleDelete = async () => {
    if (!accommodation) return

    setIsDeleting(true)
    try {
      await deleteAccommodation(tripId, accommodation.id)
      await onRefresh()
      setShowDeleteAlert(false)
      onOpenChange(false)
    } catch {
      // Error handling
    } finally {
      setIsDeleting(false)
    }
  }

  const getDirectionsUrl = () => {
    if (accommodation?.coordinates) {
      return `https://www.google.com/maps/dir/?api=1&destination=${accommodation.coordinates.lat},${accommodation.coordinates.lng}`
    }
    if (accommodation?.address) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(accommodation.address)}`
    }
    return null
  }

  if (!accommodation) return null

  const nightsCount = getNightsCount(accommodation.checkIn, accommodation.checkOut)
  const directionsUrl = getDirectionsUrl()

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="p-0 overflow-hidden"
          style={{ width: 520 }}
          hideCloseButton
        >
          <SheetTitle className="sr-only">
            {accommodation?.name || "Stay Details"}
          </SheetTitle>
          <div className="h-full flex flex-col">
            {/* Photo Hero - 16:9 aspect ratio at 520px width = 293px height */}
            <div className="relative w-full shrink-0 bg-neutral-100" style={{ height: 293 }}>
              <PlacePhoto
                googlePlaceId={accommodation.googlePlaceId}
                selectedPhotoIndex={accommodation.selectedPhotoIndex}
                alt={accommodation.name}
                width={520}
                height={293}
                placeholderIcon={<BedDouble className="h-12 w-12 text-neutral-300" />}
              />
              {/* Close button - 32x32, icon 20x20, bg black/50 */}
              <SheetClose className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/60 transition-colors">
                <X className="w-5 h-5" />
              </SheetClose>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
              {/* Header Section - 16px padding */}
              <div className="p-4">
                {/* Badge + Date row */}
                <div className="flex items-center justify-between">
                  {location && (
                    <Badge dotColor={location.color}>
                      {location.name}
                    </Badge>
                  )}
                  <span className="text-mono-regular text-text-secondary">
                    {formatDateRange(accommodation.checkIn, accommodation.checkOut)} ({nightsCount} {nightsCount === 1 ? 'NIGHT' : 'NIGHTS'})
                  </span>
                </div>

                {/* Name + Directions - gap of 12px from above */}
                <div className="mt-3">
                  <h2 className="text-h2 text-text-primary">
                    {accommodation.name}
                  </h2>

                  {/* Address - no gap, secondary color */}
                  {accommodation.address && (
                    <p className="text-body text-text-secondary">
                      {accommodation.address}
                    </p>
                  )}

                  {/* Action buttons - gap of 20px from address, gap of 8px between */}
                  <div className="flex gap-2 mt-5">
                    {directionsUrl && (
                      <Button
                        variant="secondary"
                        size="small"
                        asChild
                      >
                        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          Google Maps
                        </a>
                      </Button>
                    )}
                    {googleDetails?.website && (
                      <Button
                        variant="secondary"
                        size="small"
                        asChild
                      >
                        <a href={googleDetails.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5">
                          <Globe className="w-4 h-4" />
                          Website
                        </a>
                      </Button>
                    )}
                    {googleDetails?.phoneNumber && (
                      <Button
                        variant="secondary"
                        size="small"
                        asChild
                      >
                        <a href={`tel:${googleDetails.phoneNumber}`} className="inline-flex items-center gap-1.5">
                          <Phone className="w-4 h-4" />
                          Call
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>

            </ScrollArea>

            {/* Footer Actions */}
            <div className="p-4 border-t border-muted flex items-center justify-between">
              <Button
                variant="secondary"
                size="small"
                leftIcon={<Trash2 />}
                onClick={() => setShowDeleteAlert(true)}
              >
                Delete stay
              </Button>
              <Button
                variant="secondary"
                size="small"
                leftIcon={<SquarePen />}
              >
                Edit
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Stay</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &quot;{accommodation.name}&quot; from your trip?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
