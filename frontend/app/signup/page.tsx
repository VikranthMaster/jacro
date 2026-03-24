"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { Eye, EyeOff, Mail, Lock, User, Inbox } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"
import {
  PASSWORD_REQUIREMENTS_TEXT,
  validatePasswordStrength,
} from "@/lib/passwordPolicy"

export default function SignupPage() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const router = useRouter()
  const { signup } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    const pwMsg = validatePasswordStrength(password)
    if (pwMsg) {
      setError(pwMsg)
      return
    }

    setIsLoading(true)

    try {
      const result = await signup(name, email, password)
      if (result.ok && result.needsEmailConfirmation) {
        setPendingEmail(result.email)
        return
      }
      if (result.ok) {
        router.push("/login?registered=1")
        return
      }
      setError(result.message)
    } catch {
      setError("An error occurred. Please try again.")
    } finally {
      setIsLoading(false)
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
        {/* Logo */}
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

        {/* Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 border border-[#E5E5E5]">
          {pendingEmail ? (
            <>
              <div className="flex justify-center mb-6">
                <div className="rounded-full bg-[#F5F5DC] p-4">
                  <Inbox className="w-10 h-10 text-[#C6A96B]" aria-hidden />
                </div>
              </div>
              <h1 className="text-2xl font-serif text-center text-[#111111] mb-2">
                Check your mail for verification
              </h1>
              <p className="text-center text-[#6B6B6B] text-sm mb-2 leading-relaxed">
                We sent a verification link to{" "}
                <span className="font-medium text-[#111111]">{pendingEmail}</span>. You are{" "}
                <strong>not signed up</strong> in the app until you open that email and confirm.
                After that, use <strong>Sign in</strong> with your password.
              </p>
              <p className="text-center text-[#6B6B6B] text-xs mb-8">
                Didn&apos;t see it? Check spam or promotions, or wait a minute and try again.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/login"
                  className="inline-flex justify-center items-center py-3 px-4 bg-[#111111] text-white text-sm font-medium rounded-md hover:bg-[#2a2a2a] transition-colors"
                >
                  Go to sign in
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setPendingEmail(null)
                    setError("")
                  }}
                  className="inline-flex justify-center items-center py-3 px-4 border border-[#E5E5E5] text-[#111111] text-sm font-medium rounded-md hover:bg-[#FAFAFA] transition-colors"
                >
                  Use a different email
                </button>
              </div>
            </>
          ) : (
            <>
          <h1 className="text-2xl font-serif text-center text-[#111111] mb-2">
            Create Account
          </h1>
          <p className="text-center text-[#6B6B6B] text-sm mb-4">
            Join JACRO for exclusive access
          </p>
          <div className="rounded-md border border-[#E8DFC8] bg-[#FAF6ED] text-[#5C5346] text-xs sm:text-sm px-4 py-3 mb-8 leading-relaxed">
            <strong className="text-[#111111]">Email verification required.</strong> After you
            submit, check your mail for a verification link. You won&apos;t be logged in and your
            account won&apos;t count as active until you confirm — then sign in on the login page.
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-200 text-red-600 text-sm px-4 py-3 rounded-md mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name */}
            <div>
              <label className="block text-sm text-[#111111] mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Doe"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] rounded-md text-[#111111] placeholder-[#9B9B9B] focus:outline-none focus:border-[#C6A96B] transition-colors"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm text-[#111111] mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] rounded-md text-[#111111] placeholder-[#9B9B9B] focus:outline-none focus:border-[#C6A96B] transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm text-[#111111] mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  className="w-full pl-11 pr-12 py-3 border border-[#E5E5E5] rounded-md text-[#111111] placeholder-[#9B9B9B] focus:outline-none focus:border-[#C6A96B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm text-[#111111] mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  className="w-full pl-11 pr-12 py-3 border border-[#E5E5E5] rounded-md text-[#111111] placeholder-[#9B9B9B] focus:outline-none focus:border-[#C6A96B] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="rounded-md border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-3">
              <p className="text-xs font-medium text-[#111111] mb-2">Password must include:</p>
              <ul className="text-xs text-[#6B6B6B] space-y-1 list-disc list-inside">
                {PASSWORD_REQUIREMENTS_TEXT.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full py-3 bg-[#111111] text-white font-medium rounded-md hover:bg-[#2a2a2a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating account..." : "Create Account"}
            </motion.button>
          </form>

          {/* Login Link */}
          <p className="text-center text-[#6B6B6B] text-sm mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-[#C6A96B] hover:underline font-medium">
              Sign in
            </Link>
          </p>
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}
