"use client"

import { Suspense, useState } from "react"
import { motion } from "framer-motion"
import { Mail, ShieldCheck } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter, useSearchParams } from "next/navigation"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"

const BASE_URL = "/api"

function VerifyOtpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const email = searchParams.get("email")?.trim() || ""

  const [otp, setOtp] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [resendMessage, setResendMessage] = useState("")

  if (!email) {
    return (
      <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-8 border border-[#E5E5E5] text-center">
          <p className="text-[#6B6B6B] text-sm mb-6">
            No email address found. Please sign up first.
          </p>
          <Link
            href="/signup"
            className="inline-flex justify-center items-center py-3 px-4 bg-[#111111] text-white text-sm font-medium rounded-md hover:bg-[#2a2a2a] transition-colors"
          >
            Go to sign up
          </Link>
        </div>
      </div>
    )
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setResendMessage("")

    if (otp.length !== 6) {
      setError("Please enter the 6-digit code")
      return
    }

    setIsLoading(true)

    try {
      const res = await fetch(`${BASE_URL}/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.statusCode === 200) {
        router.push("/")
        return
      }

      setError(data.message || "Invalid or expired code. Please try again.")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    setError("")
    setResendMessage("")
    setIsResending(true)

    try {
      const res = await fetch(`${BASE_URL}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.ok && data.statusCode === 200) {
        setResendMessage("A new code has been sent to your email.")
        setOtp("")
        return
      }

      setError(data.message || "Could not resend code. Please try again.")
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Link href="/" className="flex justify-center mb-8">
          <div className="relative w-16 h-16">
            <Image
              src="/logo.png"
              alt="JACRO"
              fill
              className="object-contain"
            />
          </div>
        </Link>

        <div className="bg-white rounded-lg shadow-lg p-8 border border-[#E5E5E5]">
          <div className="flex justify-center mb-6">
            <div className="rounded-full bg-[#F5F5DC] p-4">
              <ShieldCheck className="w-10 h-10 text-[#C6A96B]" aria-hidden />
            </div>
          </div>

          <h1 className="text-2xl font-serif text-center text-[#111111] mb-2">
            Verify your email
          </h1>
          <p className="text-center text-[#6B6B6B] text-sm mb-2 leading-relaxed">
            OTP sent to{" "}
            <span className="inline-flex items-center gap-1 font-medium text-[#111111]">
              <Mail className="w-3.5 h-3.5" aria-hidden />
              {email}
            </span>
          </p>
          <p className="text-center text-[#6B6B6B] text-xs mb-8">
            Enter the 6-digit code from your inbox. Check spam if you don&apos;t see it.
          </p>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-md mb-6"
            >
              {error}
            </motion.div>
          )}

          {resendMessage && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-4 py-3 rounded-md mb-6"
            >
              {resendMessage}
            </motion.div>
          )}

          <form onSubmit={handleVerify} className="space-y-6">
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={otp}
                onChange={setOtp}
                disabled={isLoading}
              >
                <InputOTPGroup>
                  <InputOTPSlot index={0} className="h-12 w-11 text-base border-[#E5E5E5]" />
                  <InputOTPSlot index={1} className="h-12 w-11 text-base border-[#E5E5E5]" />
                  <InputOTPSlot index={2} className="h-12 w-11 text-base border-[#E5E5E5]" />
                  <InputOTPSlot index={3} className="h-12 w-11 text-base border-[#E5E5E5]" />
                  <InputOTPSlot index={4} className="h-12 w-11 text-base border-[#E5E5E5]" />
                  <InputOTPSlot index={5} className="h-12 w-11 text-base border-[#E5E5E5]" />
                </InputOTPGroup>
              </InputOTP>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 bg-[#111111] text-white font-medium rounded-md hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "Verify email"}
            </motion.button>
          </form>

          <p className="text-center text-[#6B6B6B] text-sm mt-6">
            Didn&apos;t get a code?{" "}
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-[#C6A96B] hover:underline font-medium disabled:opacity-50"
            >
              {isResending ? "Sending..." : "Resend OTP"}
            </button>
          </p>

          <p className="text-center text-[#6B6B6B] text-sm mt-4">
            Wrong email?{" "}
            <Link href="/signup" className="text-[#C6A96B] hover:underline font-medium">
              Sign up again
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}

export default function VerifyOtpPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F5F5DC] flex items-center justify-center text-[#6B6B6B] text-sm">
          Loading…
        </div>
      }
    >
      <VerifyOtpForm />
    </Suspense>
  )
}
