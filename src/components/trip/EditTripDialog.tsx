"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Settings, Trash2, ChevronDown, ImagePlus, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { LOCATION_COLORS, parseLocalDate, formatLocalDate } from "@/types"
import { updateTrip, deleteTrip } from "@/lib/db"
import { uploadTripCoverImage, deleteTripCoverImage, ImageUploadError } from "@/lib/storage/image-upload"

interface EditTripDialogProps {
  tripId: string
  tripName: string
  tripColor?: string
  tripCoverImage?: string
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
  tripStartDate,
  tripEndDate,
  isOwner,
  onUpdate,
}: EditTripDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [loading, setLoading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Form state
  const [name, setName] = useState(tripName)
  const [color, setColor] = useState(tripColor || LOCATION_COLORS[0].value)
  const [coverImage, setCoverImage] = useState<string | undefined>(tripCoverImage)
  const [pendingFile, setPendingFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(tripCoverImage)
  const [startDate, setStartDate] = useState<Date | undefined>(parseLocalDate(tripStartDate))
  const [endDate, setEndDate] = useState<Date | undefined>(parseLocalDate(tripEndDate))
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(tripName)
      setColor(tripColor || LOCATION_COLORS[0].value)
      setCoverImage(tripCoverImage)
      setPreviewUrl(tripCoverImage)
      setPendingFile(null)
      setStartDate(parseLocalDate(tripStartDate))
      setEndDate(parseLocalDate(tripEndDate))
      setUploadError(null)
    }
    setOpen(isOpen)
  }

  const handleFileSelect = (file: File) => {
    setUploadError(null)

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"]
    if (!allowedTypes.includes(file.type)) {
      setUploadError("Invalid file type. Please upload a JPEG, PNG, or WebP image.")
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File is too large. Maximum size is 5MB.")
      return
    }

    // Create preview URL
    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)
    setPendingFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleRemoveImage = () => {
    setPreviewUrl(undefined)
    setPendingFile(null)
    setCoverImage(undefined)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) return

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

      await updateTrip(tripId, {
        name: name.trim(),
        color,
        coverImage: newCoverImageUrl,
        startDate: formatLocalDate(startDate),
        endDate: formatLocalDate(endDate),
      })

      setLoading(false)
      setOpen(false)
      await onUpdate()
    } catch {
      setUploadError("Failed to save trip. Please try again.")
      setLoading(false)
    }
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
      setShowDeleteAlert(false)
      setOpen(false)
      router.push("/")
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <NakedIconButton icon={<Settings />} />
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Trip</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Trip Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Trip Name</label>
              <Input
                placeholder="e.g., Summer in Europe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Trip Color */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Color</label>
              <div className="grid grid-cols-7 gap-1.5 p-1 -m-1">
                {LOCATION_COLORS.map(colorOption => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`aspect-square rounded-full transition-all ${colorOption.value} ${
                      color === colorOption.value
                        ? 'ring-2 ring-offset-2 ring-primary'
                        : 'hover:scale-110'
                    }`}
                    onClick={() => setColor(colorOption.value)}
                    title={colorOption.name}
                  />
                ))}
              </div>
            </div>

            {/* Trip Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {startDate ? (
                        startDate.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => {
                        setStartDate(date)
                        // If end date is before new start date, update it
                        if (date && endDate && date > endDate) {
                          setEndDate(date)
                        }
                        setIsStartDateOpen(false)
                      }}
                      defaultMonth={startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">End Date</label>
                <Popover open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                  <PopoverTrigger asChild>
                    <button
                      className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {endDate ? (
                        endDate.toLocaleDateString()
                      ) : (
                        <span className="text-muted-foreground">Select date</span>
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={(date) => {
                        setEndDate(date)
                        setIsEndDateOpen(false)
                      }}
                      disabled={(date) => {
                        return startDate ? date < startDate : false
                      }}
                      defaultMonth={endDate || startDate}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Cover Image Upload */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Cover Image <span className="text-muted-foreground font-normal">(optional)</span>
              </label>
              <div
                className={`relative rounded-lg border-2 border-dashed transition-colors ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {previewUrl ? (
                  <div className="relative">
                    <img
                      src={previewUrl}
                      alt="Cover preview"
                      className="w-full h-[120px] object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    {isUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <Loader2 className="h-6 w-6 text-white animate-spin" />
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-[120px] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ImagePlus className="h-8 w-8" />
                    <span className="text-sm">Click or drag to upload</span>
                    <span className="text-xs text-muted-foreground">JPEG, PNG, WebP (max 5MB)</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>
              {uploadError && (
                <p className="text-sm text-destructive">{uploadError}</p>
              )}
            </div>

            {/* Delete Trip Button - Only for owners */}
            {isOwner && (
              <div className="pt-4 border-t">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => setShowDeleteAlert(true)}
                  leftIcon={<Trash2 />}
                >
                  Delete Trip
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? (isUploading ? "Uploading..." : "Saving...") : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}
