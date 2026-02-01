"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { UserRoundPlus, Mail, Crown, Trash2, Clock, Loader2, Search } from "lucide-react"
import { toast } from "sonner"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { TripMember } from "@/types"
import { getTripMembers, inviteMember, removeMember, searchUsers, UserSearchResult } from "@/lib/db"

interface ShareDialogProps {
  tripId: string
  tripName: string
  isOwner: boolean
}

// Format relative time (e.g., "2 hours ago", "3 days ago")
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "just now"
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return date.toLocaleDateString()
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debouncedValue
}

export function ShareDialog({ tripId, tripName, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<TripMember[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedUser, setSelectedUser] = useState<UserSearchResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const debouncedQuery = useDebounce(searchQuery, 300)

  // Load members when dialog opens
  useEffect(() => {
    if (open) {
      loadMembers()
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      // Reset state when dialog closes
      setSearchQuery("")
      setSearchResults([])
      setSelectedUser(null)
      setShowDropdown(false)
    }
  }, [open, tripId])

  // Search users when query changes
  useEffect(() => {
    async function performSearch() {
      if (!debouncedQuery || debouncedQuery.length < 2 || selectedUser) {
        setSearchResults([])
        setShowDropdown(false)
        return
      }

      setIsSearching(true)
      const results = await searchUsers(debouncedQuery)

      // Filter out users already in members list
      const memberEmails = members.map(m => (m.email || m.invitedEmail)?.toLowerCase())
      const filteredResults = results.filter(
        r => !memberEmails.includes(r.email?.toLowerCase())
      )

      setSearchResults(filteredResults)
      setShowDropdown(filteredResults.length > 0)
      setIsSearching(false)
    }

    performSearch()
  }, [debouncedQuery, members, selectedUser])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const loadMembers = async () => {
    const data = await getTripMembers(tripId)
    setMembers(data)
  }

  const handleSelectUser = (user: UserSearchResult) => {
    setSelectedUser(user)
    setSearchQuery(user.name || user.email)
    setShowDropdown(false)
    setSearchResults([])
  }

  const handleInputChange = (value: string) => {
    setSearchQuery(value)
    // Clear selected user if they edit the input
    if (selectedUser && value !== (selectedUser.name || selectedUser.email)) {
      setSelectedUser(null)
    }
  }

  const handleInvite = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (loading) return

    // Use selected user's email or treat input as email
    const emailToInvite = selectedUser?.email || searchQuery.trim()

    if (!emailToInvite) return

    // Basic email validation if no user selected
    if (!selectedUser && !emailToInvite.includes("@")) {
      toast.error("Please enter a valid email address")
      return
    }

    setLoading(true)

    const member = await inviteMember(tripId, emailToInvite)

    if (member) {
      setMembers([...members, member])
      setSearchQuery("")
      setSelectedUser(null)
      const displayName = selectedUser?.name || emailToInvite
      toast.success(`Invitation sent to ${displayName}`)
    } else {
      toast.error("Failed to send invite. User may already be a member.")
    }

    setLoading(false)
  }

  const handleRemove = async (memberId: string, memberEmail?: string) => {
    const result = await removeMember(tripId, memberId)
    if (result) {
      setMembers(members.filter(m => m.id !== memberId))
      toast.success(`Removed ${memberEmail || 'member'} from trip`)
    } else {
      toast.error("Failed to remove member")
    }
  }

  const canInvite = selectedUser || (searchQuery.trim() && searchQuery.includes("@"))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <NakedIconButton icon={<UserRoundPlus />} />
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share &quot;{tripName}&quot;</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Invite form - only for owners */}
          {isOwner && (
            <form onSubmit={handleInvite} className="space-y-2">
              <div className="relative" ref={dropdownRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    ref={inputRef}
                    placeholder="Search by name or enter email"
                    value={searchQuery}
                    onChange={(e) => handleInputChange(e.target.value)}
                    onFocus={() => {
                      if (searchResults.length > 0 && !selectedUser) {
                        setShowDropdown(true)
                      }
                    }}
                    className="pl-9 pr-4"
                    disabled={loading}
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search results dropdown */}
                {showDropdown && searchResults.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-white border border-border rounded-md shadow-lg max-h-48 overflow-auto">
                    {searchResults.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-3 transition-colors"
                        onClick={() => handleSelectUser(user)}
                      >
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-medium text-primary">
                            {(user.name || user.email)?.[0]?.toUpperCase() || "?"}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">
                            {user.name || user.email}
                          </p>
                          {user.name && (
                            <p className="text-xs text-muted-foreground truncate">
                              {user.email}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !canInvite}
                className="w-full"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4 mr-2" />
                )}
                {loading ? "Sending..." : "Send Invite"}
              </Button>
            </form>
          )}

          {/* Members list */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              People with access
            </p>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No one else has access yet. Invite someone to collaborate!
              </p>
            ) : (
              members.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-2 rounded-md bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      {member.role === 'owner' ? (
                        <Crown className="h-4 w-4 text-primary" />
                      ) : member.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <span className="text-sm font-medium text-primary">
                          {(member.email || member.invitedEmail || '?')[0].toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {member.email || member.invitedEmail}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {member.role}
                        {member.status === 'pending' && (
                          <span className="ml-1 text-amber-600">
                            (invited {formatRelativeTime(member.createdAt)})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Remove button - only for owners, cannot remove owner */}
                  {isOwner && member.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemove(member.id, member.email || member.invitedEmail)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
