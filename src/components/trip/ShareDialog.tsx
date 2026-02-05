"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { UserRoundPlus, UserRoundPen, Trash2, Clock, Loader2, Search, Check } from "lucide-react"
import { toast } from "sonner"
import { NakedIconButton } from "@/components/ui/naked-icon-button"
import { FormDialog } from "@/components/ui/form-dialog"
import { FormField } from "@/components/ui/form-field"
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
    setSearchQuery(user.name ? `${user.name} (${user.email})` : user.email)
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

  const handleInvite = async () => {
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
  const nonOwnerMembers = members.filter(m => m.role !== 'owner')

  return (
    <>
      <NakedIconButton icon={<UserRoundPlus />} onClick={() => setOpen(true)} />

      <FormDialog
        open={open}
        onOpenChange={setOpen}
        title={`Share ${tripName}`}
        submitLabel="Send invite"
        onSubmit={handleInvite}
        submitDisabled={loading || !canInvite || !isOwner}
        loading={loading}
        loadingLabel="Sending..."
      >
        {isOwner && (
          <FormField label="Users in Piper">
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2] text-text-secondary">
                  {selectedUser ? <Check /> : <Search />}
                </span>
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleInvite()
                    }
                  }}
                  className="pl-9 pr-9 h-[42px] py-3 rounded-lg border-border-muted shadow-none"
                  disabled={loading}
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-secondary" />
                )}
              </div>

              {/* Search results dropdown */}
              {showDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-border-muted rounded-lg shadow-lg max-h-48 overflow-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-neutral-50 flex items-center gap-3 transition-colors"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-h3 font-fustat text-text-primary">
                          {(user.name || user.email)?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-body font-inter text-text-primary truncate">
                          {user.name || user.email}
                        </p>
                        {user.name && (
                          <p className="text-small font-inter text-text-secondary truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FormField>
        )}

        {/* Editors section */}
        <div className="flex flex-col gap-2">
          <span className="text-h2 font-fustat text-text-primary">Editors</span>
          {nonOwnerMembers.length === 0 ? (
            <p className="text-body font-inter text-text-secondary">
              No other editors yet. Invite a Piper user to collaborate.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {nonOwnerMembers.map(member => (
                <div
                  key={member.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#FF591E]/10 flex items-center justify-center flex-shrink-0">
                      {member.status === 'pending' ? (
                        <Clock className="h-4 w-4 text-text-accent" />
                      ) : (
                        <UserRoundPen className="h-4 w-4 text-text-accent" />
                      )}
                    </div>
                    <div>
                      <p className="text-body font-inter text-text-primary">
                        {member.email || member.invitedEmail}
                      </p>
                      {member.status === 'pending' && (
                        <p className="text-small font-inter text-text-secondary">
                          Invited {formatRelativeTime(member.createdAt)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Remove button - only for owners */}
                  {isOwner && (
                    <button
                      type="button"
                      className="w-5 h-5 [&>svg]:w-full [&>svg]:h-full [&>svg]:stroke-[2] text-text-secondary hover:text-text-primary transition-colors"
                      onClick={() => handleRemove(member.id, member.email || member.invitedEmail)}
                    >
                      <Trash2 />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </FormDialog>
    </>
  )
}
