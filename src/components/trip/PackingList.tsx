"use client"

import { useState } from "react"
import { Package, Plus, MoreHorizontal, Edit2, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { PackingItem, PackingCategory } from "@/types"
import {
  addPackingItem,
  updatePackingItem,
  deletePackingItem,
  togglePackingItemPacked,
} from "@/lib/db"

interface PackingListProps {
  tripId: string
  packingItems: PackingItem[]
  onRefresh: () => Promise<void>
}

const CATEGORY_LABELS: Record<PackingCategory, string> = {
  clothing: "Clothing",
  toiletries: "Toiletries",
  electronics: "Electronics",
  documents: "Documents",
  health: "Health",
  accessories: "Accessories",
  misc: "Other",
}

const CATEGORY_ORDER: PackingCategory[] = [
  "documents",
  "clothing",
  "toiletries",
  "electronics",
  "health",
  "accessories",
  "misc",
]

export function PackingList({ tripId, packingItems, onRefresh }: PackingListProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PackingItem | null>(null)

  // Form state
  const [itemName, setItemName] = useState("")
  const [itemCategory, setItemCategory] = useState<PackingCategory>("misc")
  const [itemQuantity, setItemQuantity] = useState(1)
  const [itemNotes, setItemNotes] = useState("")

  // Calculate progress
  const totalItems = packingItems.length
  const packedItems = packingItems.filter((item) => item.isPacked).length

  // Group items by category
  const itemsByCategory = CATEGORY_ORDER.reduce((acc, category) => {
    const items = packingItems.filter((item) => item.category === category)
    if (items.length > 0) {
      acc[category] = items
    }
    return acc
  }, {} as Record<PackingCategory, PackingItem[]>)

  const handleOpenDialog = (item?: PackingItem) => {
    if (item) {
      setEditingItem(item)
      setItemName(item.name)
      setItemCategory(item.category)
      setItemQuantity(item.quantity)
      setItemNotes(item.notes || "")
    } else {
      setEditingItem(null)
      setItemName("")
      setItemCategory("misc")
      setItemQuantity(1)
      setItemNotes("")
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!itemName.trim()) return

    if (editingItem) {
      await updatePackingItem(tripId, editingItem.id, {
        name: itemName.trim(),
        category: itemCategory,
        quantity: itemQuantity,
        notes: itemNotes.trim() || undefined,
      })
    } else {
      await addPackingItem(tripId, {
        name: itemName.trim(),
        category: itemCategory,
        quantity: itemQuantity,
        isPacked: false,
        notes: itemNotes.trim() || undefined,
      })
    }

    setIsDialogOpen(false)
    await onRefresh()
  }

  const handleDelete = async (itemId: string) => {
    await deletePackingItem(tripId, itemId)
    await onRefresh()
  }

  const handleTogglePacked = async (itemId: string) => {
    await togglePackingItemPacked(tripId, itemId)
    await onRefresh()
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Packing List
            {totalItems > 0 && (
              <Badge variant="outline" className="ml-1">
                {packedItems}/{totalItems}
              </Badge>
            )}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {totalItems === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No items added yet
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(itemsByCategory).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category as PackingCategory]}
                </h4>
                <div className="space-y-1">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted group"
                    >
                      <Checkbox
                        checked={item.isPacked}
                        onCheckedChange={() => handleTogglePacked(item.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span
                          className={
                            item.isPacked
                              ? "line-through text-muted-foreground"
                              : ""
                          }
                        >
                          {item.name}
                        </span>
                        {item.quantity > 1 && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            x{item.quantity}
                          </Badge>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                            <Edit2 className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(item.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit Item" : "Add Item"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Item Name</label>
              <Input
                placeholder="e.g., Passport, T-shirts, Phone charger"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={itemCategory}
                  onValueChange={(v) => setItemCategory(v as PackingCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ORDER.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <Input
                  type="number"
                  min={1}
                  value={itemQuantity}
                  onChange={(e) =>
                    setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                placeholder="Any additional details..."
                value={itemNotes}
                onChange={(e) => setItemNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={!itemName.trim()}>
              {editingItem ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
