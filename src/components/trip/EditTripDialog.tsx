"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { Settings } from "lucide-react"
import { DateRange } from "react-day-picker"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
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
import { FormDialog } from "@/components/ui/form-dialog"
import { FormField } from "@/components/ui/form-field"
import { TextField } from "@/components/ui/text-field"
import { DateRangePickerField } from "@/components/ui/date-range-picker-field"
import { ColorPicker } from "@/components/ui/color-picker"
import { ImageUploadField } from "@/components/ui/image-upload-field"
import { LOCATION_COLORS, parseLocalDate, formatLocalDate } from "@/types"
import { updateTrip, deleteTrip } from "@/lib/db"
import { uploadTripCoverImage, deleteTripCoverImage, ImageUploadError } from "@/lib/storage/image-upload"
import { tripKeys } from "@/lib/hooks/use-trips"

interface EditTripDialogProps {
  tripId: string
  tripName: string
  tripColor?: string
  tripCoverImage?: string
  tripCoverImageFocusX?: number
  tripCoverImageFocusY?: number
  tripStartDate: string
  tripEndDate: string
  isOwner: boolean
  onUpdate: () => Promise<void>
}

export function EditTripDialog({
  tripId,
  tripName,
  tripColor,
  tripCoverImage,
  tripCoverImageFocusX,
  tripCoverImageFocusY,
  tripStartDate,
  tripEndDate,
  isOwner,
  onUpdate,
}: EditTripDialogProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [showDateShortenAlert, setShowDateShortenAlert] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [name, setName] = useState(tripName)
  const [color, setColor] = useState(tripColor || LOCATION_COLORS[0].value)
  const [coverImage, setCoverImage] = useState<string | undefined>(tripCoverImage)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(tripCoverImage)
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: parseLocalDate(tripStartDate),
    to: parseLocalDate(tripEndDate),
  })
  const [focusX, setFocusX] = useState(tripCoverImageFocusX ?? 0.5)
  const [focusY, setFocusY] = useState(tripCoverImageFocusY ?? 0.5)

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(tripName)
      setColor(tripColor || LOCATION_COLORS[0].value)
      setCoverImage(tripCoverImage)
      setPreviewUrl(tripCoverImage)
      setPendingFile(null)
      setDateRange({
        from: parseLocalDate(tripStartDate),
        to: parseLocalDate(tripEndDate),
      })
      setUploadError(null)
      setFocusX(tripCoverImageFocusX ?? 0.5)
      setFocusY(tripCoverImageFocusY ?? 0.5)
    }
    setOpen(isOpen)
  }

  const handleFileSelect = (file: File) => {
    setUploadError(null)
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setPendingFile(file)
    setFocusX(0.5)
    setFocusY(0.5)
  }

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setPendingFile(null)
    setCoverImage(undefined)
  }

  // Check if new dates would shorten the trip
  const wouldShortenTrip = () => {
    if (!dateRange?.from || !dateRange?.to) return false
    const originalStart = parseLocalDate(tripStartDate)
    const originalEnd = parseLocalDate(tripEndDate)
    if (!originalStart || !originalEnd) return false

    return dateRange.from > originalStart || dateRange.to < originalEnd
  }

  const performSave = async () => {
    if (!name.trim() || !dateRange?.from || !dateRange?.to) return

    setLoading(true)
    setUploadError(null)

    try {
      let newCoverImageUrl = coverImage

      // Upload new image if there's a pending file
      if (pendingFile) {
        setIsUploading(true)
        try {
          newCoverImageUrl = await uploadTripCoverImage(pendingFile, tripId)

          // Delete old image if it exists and is different
          if (tripCoverImage && tripCoverImage !== newCoverImageUrl) {
            await deleteTripCoverImage(tripCoverImage)
          }
        } catch (err) {
          if (err instanceof ImageUploadError) {
            setUploadError(err.message)
          } else {
            setUploadError("Failed to upload image. Please try again.")
          }
          setLoading(false)
          setIsUploading(false)
          return
        }
        setIsUploading(false)
      } else if (coverImage === undefined && tripCoverImage) {
        // User removed the image
        await deleteTripCoverImage(tripCoverImage)
        newCoverImageUrl = undefined
      }

      const result = await updateTrip(tripId, {
        name: name.trim(),
        color,
        coverImage: newCoverImageUrl,
        coverImageFocusX: focusX,
        coverImageFocusY: focusY,
        startDate: formatLocalDate(dateRange.from),
        endDate: formatLocalDate(dateRange.to),
      })

      if (!result) {
        setUploadError("Failed to save trip. Please try again.")
        setLoading(false)
        return
      }

      await onUpdate()
      setLoading(false)
      setOpen(false)
      setShowDateShortenAlert(false)
    } catch {
      setUploadError("Failed to save trip. Please try again.")
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !dateRange?.from || !dateRange?.to) return

    // Check if dates are being shortened - warn user about potential activity loss
    if (wouldShortenTrip()) {
      setShowDateShortenAlert(true)
      return
    }

    await performSave()
  }

  const handleDelete = async () => {
    setLoading(true)

    // Delete cover image from storage if it exists
    if (tripCoverImage) {
      await deleteTripCoverImage(tripCoverImage)
    }

    const success = await deleteTrip(tripId)
    setLoading(false)

    if (success) {
      queryClient.removeQueries({ queryKey: tripKeys.detail(tripId) })
      queryClient.invalidateQueries({ queryKey: tripKeys.lists() })
      setShowDeleteAlert(false)
      setOpen(false)
      router.push("/")
    }
  }

  return (
    <>
      <NakedIconButton icon={<Settings />} onClick={() => setOpen(true)} />

      <FormDialog
        open={open}
        onOpenChange={handleOpenChange}
        title={`Edit Trip to ${tripName}`}
        submitLabel="Save"
        onSubmit={handleSave}
        submitDisabled={loading || !name.trim() || !dateRange?.from || !dateRange?.to}
        loading={loading}
        loadingLabel={isUploading ? "Uploading..." : "Saving..."}
        onDelete={isOwner ? () => setShowDeleteAlert(true) : undefined}
        deleteLabel="Delete"
      >
        <FormField label="Trip name">
          <TextField
            placeholder="e.g., Summer in Europe"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </FormField>

        <FormField label="Dates">
          <DateRangePickerField
            value={dateRange}
            onChange={setDateRange}
          />
        </FormField>

        <FormField label="Color">
          <ColorPicker value={color} onChange={setColor} />
        </FormField>

        <FormField label="Cover image">
          <ImageUploadField
            previewUrl={previewUrl}
            focusX={focusX}
            focusY={focusY}
            onFocusChange={(x, y) => {
              setFocusX(x)
              setFocusY(y)
            }}
            onFileSelect={handleFileSelect}
            onRemove={handleRemoveImage}
            error={uploadError ?? undefined}
          />
        </FormField>
      </FormDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Trip</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{tripName}&quot;? This will permanently
              delete all locations, accommodations, saved places, and activities.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Deleting..." : "Delete Trip"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Date Shortening Warning Dialog */}
      <AlertDialog open={showDateShortenAlert} onOpenChange={setShowDateShortenAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Shorten Trip Dates?</AlertDialogTitle>
            <AlertDialogDescription>
              You are shortening the trip dates. Activities on removed days will be
              permanently deleted. Are you sure you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={performSave}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "Saving..." : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
