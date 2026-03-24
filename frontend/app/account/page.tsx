"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { User, Mail, Edit2, Check, X, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth"
import { useCart } from "@/lib/cart"

export default function AccountPage() {
  const router = useRouter()
  const { user, isAuthenticated, updateProfile } = useAuth()
  const displayName =
    user?.name && user.name.trim().toLowerCase() !== "user"
      ? user.name
      : (user?.email?.split("@")[0] ?? "")
  const cartCount = useCart((state) => state.getItemCount())
  
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  useEffect(() => {
    if (user) {
      setName(displayName)
      setEmail(user.email)
    }
  }, [user, displayName])

  const handleSave = async () => {
    setIsSaving(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    updateProfile(name, email)
    setIsEditing(false)
    setIsSaving(false)
  }

  const handleCancel = () => {
    if (user) {
      setName(displayName)
      setEmail(user.email)
    }
    setIsEditing(false)
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={cartCount} />

      <main className="pt-24 pb-16">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Shop
            </Link>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#111111]">
              My Account
            </h1>
          </motion.div>

          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg border border-[#E5E5E5] shadow-sm p-6 sm:p-8"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-medium text-[#111111]">Profile Information</h2>
              {!isEditing && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-2 text-sm text-[#C6A96B] hover:text-[#B89B50] transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit
                </motion.button>
              )}
            </div>

            <div className="space-y-5">
              {/* Name */}
              <div>
                <label className="block text-sm text-[#6B6B6B] mb-2">Full Name</label>
                {isEditing ? (
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] rounded-md text-[#111111] focus:outline-none focus:border-[#C6A96B] transition-colors"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-3 text-[#111111]">
                    <User className="w-5 h-5 text-[#6B6B6B]" />
                    {displayName}
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm text-[#6B6B6B] mb-2">Email Address</label>
                {isEditing ? (
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#6B6B6B]" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 border border-[#E5E5E5] rounded-md text-[#111111] focus:outline-none focus:border-[#C6A96B] transition-colors"
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-3 py-3 text-[#111111]">
                    <Mail className="w-5 h-5 text-[#6B6B6B]" />
                    {user?.email}
                  </div>
                )}
              </div>

              {/* Edit Actions */}
              {isEditing && (
                <div className="flex gap-3 pt-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#111111] text-white rounded-md hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? "Saving..." : "Save Changes"}
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCancel}
                    className="flex items-center justify-center gap-2 px-6 py-3 border border-[#E5E5E5] text-[#6B6B6B] rounded-md hover:border-[#111111] hover:text-[#111111] transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <Link href="/orders">
              <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 hover:border-[#C6A96B] transition-colors">
                <h3 className="font-medium text-[#111111] mb-1">Order History</h3>
                <p className="text-sm text-[#6B6B6B]">View your past orders</p>
              </div>
            </Link>
            <Link href="/change-password">
              <div className="bg-white rounded-lg border border-[#E5E5E5] p-5 hover:border-[#C6A96B] transition-colors">
                <h3 className="font-medium text-[#111111] mb-1">Change Password</h3>
                <p className="text-sm text-[#6B6B6B]">Update your password</p>
              </div>
            </Link>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
