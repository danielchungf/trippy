"use client"

import { useState, useRef, useCallback } from "react"
import { Upload, ExternalLink, X, MapPin, Bookmark, FolderDown, FolderUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogPortal,
  DialogOverlay,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import { PlaceCategory } from "@/types"
import {
  parseGoogleMapsCSV,
  ParsedCSVPlace,
  detectCategoryFromTags,
  detectCategoryFromName,
} from "@/lib/csv-import"

export interface PlaceToImport {
  place: ParsedCSVPlace
  category: PlaceCategory | null
}

interface PlaceWithSelection extends PlaceToImport {
  selected: boolean
}

interface ImportPlacesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartImport: (places: PlaceToImport[]) => void
}

const PLACE_CATEGORIES: { value: PlaceCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'coffee', label: 'Coffee' },
  { value: 'shopping', label: 'Shopping' },
  { value: 'sights', label: 'Sights' },
  { value: 'museums', label: 'Museums' },
  { value: 'nature', label: 'Nature' },
  { value: 'nightlife', label: 'Nightlife' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'wellness', label: 'Wellness' },
  { value: 'other', label: 'Other' },
]

export function ImportPlacesDialog({
  open,
  onOpenChange,
  onStartImport,
}: ImportPlacesDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  // Places with categories and selection state
  const [places, setPlaces] = useState<PlaceWithSelection[]>([])

  // Reset state when dialog closes
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setIsDragging(false)
      setUploadError(null)
      setFileName(null)
      setPlaces([])
    }
    onOpenChange(isOpen)
  }

  // File handling - parse and immediately show list
  const handleFileSelect = useCallback((file: File) => {
    setUploadError(null)

    if (!file.name.endsWith('.csv')) {
      setUploadError('Please upload a CSV file')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        const parsedPlaces = parseGoogleMapsCSV(content)

        if (parsedPlaces.length === 0) {
          setUploadError('No places found in the CSV file')
          return
        }

        // Initialize places with auto-detected categories, all selected by default
        const placesWithCategories: PlaceWithSelection[] = parsedPlaces.map(place => {
          let category = detectCategoryFromTags(place.tags)
          if (category === null) {
            category = detectCategoryFromName(place.name)
          }
          return {
            place,
            category,
            selected: true,
          }
        })

        setPlaces(placesWithCategories)
        setFileName(file.name)
      } catch (err) {
        setUploadError(err instanceof Error ? err.message : 'Failed to parse CSV file')
      }
    }
    reader.onerror = () => {
      setUploadError('Failed to read file')
    }
    reader.readAsText(file)
  }, [])

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
    if (file) handleFileSelect(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFileSelect(file)
  }

  // Selection helpers
  const handleSelectAll = () => {
    setPlaces(prev => prev.map(p => ({ ...p, selected: true })))
  }

  const handleDeselectAll = () => {
    setPlaces(prev => prev.map(p => ({ ...p, selected: false })))
  }

  const handleTogglePlace = (index: number) => {
    setPlaces(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], selected: !updated[index].selected }
      return updated
    })
  }

  const handleUpdateCategory = (index: number, category: PlaceCategory) => {
    setPlaces(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], category }
      return updated
    })
  }

  // Clear file to go back to upload state
  const handleClearFile = () => {
    setFileName(null)
    setPlaces([])
    setUploadError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Get selected places for import
  const selectedPlaces = places.filter(p => p.selected)
  const selectedCount = selectedPlaces.length

  // Start import - close dialog and call parent
  const handleStartImport = () => {
    const placesToImport: PlaceToImport[] = selectedPlaces.map(({ place, category }) => ({
      place,
      category,
    }))
    handleOpenChange(false)
    onStartImport(placesToImport)
  }

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        <div className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]">
          <div className="bg-white rounded-lg p-5 w-[700px] h-[500px] flex flex-col shadow-lg">
            {/* Show upload step if no file loaded, otherwise show selection step */}
            {places.length === 0 ? (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h1 className="text-h1 text-text-primary">Import Google Maps places</h1>
                  <NakedIconButton
                    icon={<X />}
                    onClick={() => handleOpenChange(false)}
                  />
                </div>

                {/* Description */}
                <div className="mt-5">
                  <p className="text-body text-text-secondary">
                    Great news! You can import all your saved places from Google Maps by uploading a CSV file:
                  </p>

                  {/* Steps */}
                  <div className="mt-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-text-secondary [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25]">
                        <MapPin />
                      </span>
                      <span className="text-body text-text-secondary">
                        Open{' '}
                        <a
                          href="https://takeout.google.com/settings/takeout"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-text-accent underline"
                        >
                          Google Takeout
                        </a>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-text-secondary [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25]">
                        <Bookmark />
                      </span>
                      <span className="text-body text-text-secondary">
                        Select only "Saved" data, then click "Next" and "Create export".
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-text-secondary [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25]">
                        <FolderDown />
                      </span>
                      <span className="text-body text-text-secondary">
                        Download and unzip your export. You'll find a CSV for each saved list
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 flex items-center justify-center text-text-secondary [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2.25]">
                        <FolderUp />
                      </span>
                      <span className="text-body text-text-secondary">
                        Upload a CSV file below
                      </span>
                    </div>
                  </div>
                </div>

                {/* Drop zone */}
                <div
                  className={`
                    mt-5 flex-1 border-2 border-dashed rounded-lg text-center cursor-pointer
                    transition-colors flex flex-col items-center justify-center
                    ${isDragging ? 'border-text-accent bg-orange-50' : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50'}
                    ${uploadError ? 'border-red-300' : ''}
                  `}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileInputChange}
                  />
                  <span className="w-8 h-8 text-text-accent [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[1.5]">
                    <Upload />
                  </span>
                  <h2 className="text-h2 text-text-primary mt-4">Drop your CSV file here</h2>
                  <p className="text-body text-text-secondary mt-1">or click to browse</p>
                </div>

                {uploadError && (
                  <p className="text-body text-red-600 mt-3">{uploadError}</p>
                )}
              </>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h1 className="text-h1 text-text-primary">Select places to import</h1>
                  <NakedIconButton
                    icon={<X />}
                    onClick={() => handleOpenChange(false)}
                  />
                </div>

                {/* Subheader with actions */}
                <div className="flex items-center justify-between mt-5">
                  <p className="text-body text-text-secondary">
                    {selectedCount} of {places.length} places selected
                  </p>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="small" onClick={handleSelectAll}>
                      Select All
                    </Button>
                    <Button variant="secondary" size="small" onClick={handleDeselectAll}>
                      Deselect All
                    </Button>
                  </div>
                </div>

                {/* List with checkboxes and category dropdowns */}
                <div className="flex-1 min-h-0 mt-4 -mx-5 px-5 overflow-y-auto max-h-[400px]">
                  <div>
                    {places.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 py-1 px-2 rounded hover:bg-neutral-50"
                      >
                        <Checkbox
                          checked={item.selected}
                          onCheckedChange={() => handleTogglePlace(index)}
                        />
                        <span className="flex-1 min-w-0 text-body text-text-primary truncate">
                          {item.place.name}
                        </span>
                        <Select
                          value={item.category || ""}
                          onValueChange={(value) => handleUpdateCategory(index, value as PlaceCategory)}
                        >
                          <SelectTrigger className="w-[110px] h-7 text-xs flex-shrink-0">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {PLACE_CATEGORIES.map(cat => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <a
                          href={item.place.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-neutral-400 hover:text-neutral-600 flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between gap-2 mt-4 pt-4 border-t border-neutral-200">
                  <Button variant="secondary" size="small" onClick={handleClearFile}>
                    Change file
                  </Button>
                  <Button
                    size="small"
                    onClick={handleStartImport}
                    disabled={selectedCount === 0}
                  >
                    Import {selectedCount} places
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogPortal>
    </Dialog>
  )
}
