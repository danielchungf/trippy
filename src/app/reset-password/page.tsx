"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sessionChecked, setSessionChecked] = useState(false)
  const [hasSession, setHasSession] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    let isMounted = true

    // Listen for auth state changes - this handles the recovery token from URL hash
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(true)
        setSessionChecked(true)
      }
    })

    // Check for existing session
    // If there's a hash fragment, Supabase needs time to process it
    const checkSession = async () => {
      const hasHashParams = window.location.hash.includes('access_token') ||
                           window.location.hash.includes('type=recovery')

      if (hasHashParams) {
        // Wait for Supabase to process hash fragments
        await new Promise(resolve => setTimeout(resolve, 500))
      }

      if (!isMounted) return

      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setHasSession(true)
      }
      setSessionChecked(true)
    }

    checkSession()

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!hasSession) {
      setError("Auth session missing! Please request a new password reset link.")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/")
    router.refresh()
  }

  // Show loading while checking session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <p className="text-[#a1a1a1]">Loading...</p>
        </div>
      </div>
    )
  }

  // Show error if no valid session
  if (!hasSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold text-[#0a0a0a]">Session expired</h1>
            <p className="text-[#a1a1a1] mt-2">
              Your password reset link has expired or is invalid.
            </p>
          </div>
          <Link href="/forgot-password">
            <Button className="w-full bg-[#0a0a0a] hover:bg-[#262626]">
              Request new reset link
            </Button>
          </Link>
          <Link href="/login" className="block text-sm text-[#0a0a0a] font-medium hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-[#0a0a0a]">Set new password</h1>
          <p className="text-[#a1a1a1] mt-2">Enter your new password below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              New password
            </label>
            <Input
              id="password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">
              Confirm password
            </label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-[#0a0a0a] hover:bg-[#262626]"
            disabled={loading}
          >
            {loading ? "Updating..." : "Update password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
