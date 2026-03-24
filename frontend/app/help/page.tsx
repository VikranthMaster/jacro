"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart"
import { useEffect, useState } from "react"

export default function HelpPage() {
  const { getItemCount } = useCart()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    const id = typeof window !== "undefined" ? window.location.hash.slice(1) : ""
    if (id) {
      requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    }
  }, [])

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
          className="space-y-12"
        >
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-2">Help</h1>
            <p className="text-[#6B6B6B]">
              Shipping, returns, and how we support you after you order.
            </p>
          </div>

          <section id="shipping">
            <h2 className="font-medium text-[#111111] text-lg mb-3">Shipping</h2>
            <p className="text-[#6B6B6B] text-sm leading-relaxed mb-3">
              We pack orders carefully and ship via trusted carriers. Standard delivery windows
              are shown at checkout. International orders may take longer due to customs.
            </p>
            <p className="text-[#6B6B6B] text-sm leading-relaxed">
              You will receive tracking information by email when your package ships.
            </p>
          </section>

          <section id="returns">
            <h2 className="font-medium text-[#111111] text-lg mb-3">Returns</h2>
            <p className="text-[#6B6B6B] text-sm leading-relaxed mb-3">
              Unworn items with tags attached may be returned within 14 days of delivery,
              unless marked final sale.
            </p>
            <p className="text-[#6B6B6B] text-sm leading-relaxed">
              To start a return, email us from the{" "}
              <Link href="/contact" className="text-[#C6A96B] hover:underline">
                Contact
              </Link>{" "}
              page with your order number.
            </p>
          </section>

          <p className="text-sm text-[#6B6B6B]">
            More quick answers:{" "}
            <Link href="/faq" className="text-[#C6A96B] hover:underline">
              FAQ
            </Link>
          </p>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}
