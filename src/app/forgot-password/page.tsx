"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const urlError = searchParams.get("error")

  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(urlError)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  if (success) {
    return (
      <div className="w-full max-w-sm space-y-6 text-center">
        <div>
          <h1 className="text-2xl font-bold text-[#0a0a0a]">Check your email</h1>
          <p className="text-[#a1a1a1] mt-2">
            We sent a password reset link to <span className="font-medium text-[#0a0a0a]">{email}</span>
          </p>
        </div>
        <p className="text-sm text-[#a1a1a1]">
          Didn&apos;t receive the email? Check your spam folder or{" "}
          <button
            onClick={() => setSuccess(false)}
            className="text-[#0a0a0a] font-medium hover:underline"
          >
            try again
          </button>
        </p>
        <Link href="/login" className="block text-sm text-[#0a0a0a] font-medium hover:underline">
          Back to login
        </Link>
      </div>
    )
  }

  return (
    <div className="w-full max-w-sm space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-[#0a0a0a]">Forgot password?</h1>
        <p className="text-[#a1a1a1] mt-2">Enter your email and we&apos;ll send you a reset link</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
          {loading ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="text-center text-sm text-[#a1a1a1]">
        Remember your password?{" "}
        <Link href="/login" className="text-[#0a0a0a] font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Suspense fallback={<div className="w-full max-w-sm h-64" />}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
