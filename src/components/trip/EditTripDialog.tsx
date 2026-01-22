"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Settings, Trash2, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
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

interface EditTripDialogProps {
  tripId: string
  tripName: string
  tripColor?: string
  tripStartDate: string
  tripEndDate: string
  isOwner: boolean
  onUpdate: () => Promise<void>
}

export function EditTripDialog({
  tripId,
  tripName,
  tripColor,
  tripStartDate,
  tripEndDate,
  isOwner,
  onUpdate,
}: EditTripDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [showDeleteAlert, setShowDeleteAlert] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form state
  const [name, setName] = useState(tripName)
  const [color, setColor] = useState(tripColor || LOCATION_COLORS[0].value)
  const [startDate, setStartDate] = useState<Date | undefined>(parseLocalDate(tripStartDate))
  const [endDate, setEndDate] = useState<Date | undefined>(parseLocalDate(tripEndDate))
  const [isStartDateOpen, setIsStartDateOpen] = useState(false)
  const [isEndDateOpen, setIsEndDateOpen] = useState(false)

  // Reset form when dialog opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setName(tripName)
      setColor(tripColor || LOCATION_COLORS[0].value)
      setStartDate(parseLocalDate(tripStartDate))
      setEndDate(parseLocalDate(tripEndDate))
    }
    setOpen(isOpen)
  }

  const handleSave = async () => {
    if (!name.trim() || !startDate || !endDate) return

    setLoading(true)

    await updateTrip(tripId, {
      name: name.trim(),
      color,
      startDate: formatLocalDate(startDate),
      endDate: formatLocalDate(endDate),
    })

    setLoading(false)
    setOpen(false)
    await onUpdate()
  }

  const handleDelete = async () => {
    setLoading(true)
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
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
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
              <div className="space-y-2 p-1 -m-1">
                {[0, 1, 2].map(row => (
                  <div key={row} className="grid grid-cols-14 gap-1.5">
                    {LOCATION_COLORS.filter(c => c.row === row).map(colorOption => (
                      <button
                        key={colorOption.value}
                        type="button"
                        className={`aspect-square rounded-full transition-all ${
                          color === colorOption.value
                            ? 'ring-2 ring-offset-2 ring-primary'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: colorOption.value }}
                        onClick={() => setColor(colorOption.value)}
                        title={colorOption.name}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Trip Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Start Date</label>
                <Popover open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {startDate ? (
                        startDate.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
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
                    <Button
                      variant="outline"
                      className="w-full justify-between font-normal"
                    >
                      {endDate ? (
                        endDate.toLocaleDateString()
                      ) : (
                        "Select date"
                      )}
                      <ChevronDown className="h-4 w-4 opacity-50" />
                    </Button>
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

            {/* Delete Trip Button - Only for owners */}
            {isOwner && (
              <div className="pt-4 border-t">
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteAlert(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Trip
                </Button>
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={loading || !name.trim()}>
              {loading ? "Saving..." : "Save"}
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
