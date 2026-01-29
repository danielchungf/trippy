"use client"

import { useState, useEffect } from "react"
import { UserRoundPlus, Mail, Crown, Trash2, Clock } from "lucide-react"
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
import { getTripMembers, inviteMember, removeMember } from "@/lib/db"

interface ShareDialogProps {
  tripId: string
  tripName: string
  isOwner: boolean
}

export function ShareDialog({ tripId, tripName, isOwner }: ShareDialogProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<TripMember[]>([])
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadMembers()
    }
  }, [open, tripId])

  const loadMembers = async () => {
    const data = await getTripMembers(tripId)
    setMembers(data)
  }

  const handleInvite = async (e?: React.FormEvent) => {
    e?.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setError(null)
    setSuccess(null)

    const member = await inviteMember(tripId, email.trim())

    if (member) {
      setMembers([...members, member])
      setEmail("")
      setSuccess(`Invite sent to ${email.trim()}`)
    } else {
      setError("Failed to send invite. User may already be a member.")
    }

    setLoading(false)
  }

  const handleRemove = async (memberId: string, memberEmail?: string) => {
    const success = await removeMember(tripId, memberId)
    if (success) {
      setMembers(members.filter(m => m.id !== memberId))
      setSuccess(`Removed ${memberEmail || 'member'} from trip`)
    }
  }

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
            <form onSubmit={handleInvite} className="flex gap-2">
              <Input
                placeholder="Enter email address"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setError(null)
                  setSuccess(null)
                }}
                className="flex-1"
              />
              <Button type="submit" disabled={loading || !email.trim()}>
                <Mail className="h-4 w-4 mr-2" />
                Invite
              </Button>
            </form>
          )}

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {success && (
            <p className="text-sm text-green-600">{success}</p>
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
                          <span className="ml-1 text-amber-600">(invite pending)</span>
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
