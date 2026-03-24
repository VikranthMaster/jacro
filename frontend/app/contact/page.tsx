"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft, Mail } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart"
import { useEffect, useState } from "react"

export default function ContactPage() {
  const { getItemCount } = useCart()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={mounted ? getItemCount() : 0} />
      <main className="pt-24 pb-20 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] mb-10"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Shop
        </Link>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[#E5E5E5] rounded-lg p-8 shadow-sm"
        >
          <h1 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-3">Contact Us</h1>
          <p className="text-[#6B6B6B] text-sm leading-relaxed mb-8">
            Questions about an order, sizing, or a return? We read every message and reply within
            1–2 business days.
          </p>
          <div className="flex items-start gap-3 text-[#111111]">
            <Mail className="w-5 h-5 text-[#C6A96B] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium mb-1">Email</p>
              <a
                href="mailto:hello@jacro.com"
                className="text-[#C6A96B] hover:underline text-sm"
              >
                hello@jacro.com
              </a>
            </div>
          </div>
          <p className="text-sm text-[#6B6B6B] mt-8">
            Before writing in, you may find an answer in the{" "}
            <Link href="/faq" className="text-[#C6A96B] hover:underline">
              FAQ
            </Link>{" "}
            or{" "}
            <Link href="/help" className="text-[#C6A96B] hover:underline">
              Help
            </Link>{" "}
            section.
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}
