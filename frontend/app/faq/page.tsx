"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart } from "@/lib/cart"
import { useEffect, useState } from "react"

const items = [
  {
    q: "How long does shipping take?",
    a: "Most domestic orders ship within 2–4 business days. You will receive a tracking link by email when your order leaves our warehouse.",
  },
  {
    q: "Can I change or cancel my order?",
    a: "Contact us as soon as possible. Once an order has shipped, we cannot modify it, but we can help with a return or exchange.",
  },
  {
    q: "What payment methods do you accept?",
    a: "We accept major cards and other methods as shown at checkout. Your payment is processed securely through our payment partner.",
  },
  {
    q: "How do I find my size?",
    a: "Each product page includes fit notes. When in doubt, size up for an easier layer or down for a closer silhouette.",
  },
]

export default function FaqPage() {
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
          <h1 className="font-serif text-3xl sm:text-4xl text-[#111111] mb-2">FAQ</h1>
          <p className="text-[#6B6B6B] mb-10">
            Quick answers to common questions. For more help, visit our{" "}
            <Link href="/help" className="text-[#C6A96B] hover:underline">
              Help
            </Link>{" "}
            page or{" "}
            <Link href="/contact" className="text-[#C6A96B] hover:underline">
              Contact us
            </Link>
            .
          </p>
          <ul className="space-y-8">
            {items.map((item, i) => (
              <li key={i} className="border-b border-[#E5E5E5] pb-8">
                <h2 className="font-medium text-[#111111] mb-2">{item.q}</h2>
                <p className="text-[#6B6B6B] text-sm leading-relaxed">{item.a}</p>
              </li>
            ))}
          </ul>
        </motion.div>
      </main>
      <Footer />
    </div>
  )
}
