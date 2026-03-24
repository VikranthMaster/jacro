"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart"
import { useEffect, useState } from "react"

export default function AboutPage() {
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
        >
          <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase mb-3">About</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-6">About JACRO</h1>
          <div className="space-y-4 text-[#6B6B6B] leading-relaxed">
            <p>
              JACRO redefines everyday fashion with quiet luxury—pieces built for longevity,
              not seasonal noise. We design for people who care how clothes feel, move, and age.
            </p>
            <p>
              Our collections balance structure and ease: tailored outerwear, refined tops, and
              footwear that works from weekday commute to weekend ease.
            </p>
            <p>
              We believe understatement is its own form of confidence. Thank you for being here.
            </p>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}
