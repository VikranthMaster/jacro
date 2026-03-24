"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import { Package, ArrowLeft, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth"
import { useCart } from "@/lib/cart"

// Mock orders data
const mockOrders = [
  {
    id: "ORD-2026-001",
    date: "March 15, 2026",
    status: "Delivered",
    total: 1280,
    items: 3,
  },
  {
    id: "ORD-2026-002",
    date: "March 10, 2026",
    status: "Shipped",
    total: 890,
    items: 2,
  },
  {
    id: "ORD-2026-003",
    date: "March 5, 2026",
    status: "Processing",
    total: 450,
    items: 1,
  },
]

const statusColors: Record<string, string> = {
  Delivered: "bg-green-100 text-green-700",
  Shipped: "bg-blue-100 text-blue-700",
  Processing: "bg-yellow-100 text-yellow-700",
  Cancelled: "bg-red-100 text-red-700",
}

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const cartCount = useCart((state) => state.getItemCount())

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={cartCount} />

      <main className="pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10"
          >
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Account
            </Link>
            <h1 className="text-3xl sm:text-4xl font-serif text-[#111111]">
              Order History
            </h1>
            <p className="text-[#6B6B6B] mt-2">
              Track and view your recent orders
            </p>
          </motion.div>

          {mockOrders.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20 bg-white rounded-lg border border-[#E5E5E5]"
            >
              <div className="w-20 h-20 bg-[#EFE8D8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Package className="w-10 h-10 text-[#C6A96B]" />
              </div>
              <h2 className="text-xl font-serif text-[#111111] mb-2">
                No orders yet
              </h2>
              <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
                When you place orders, they will appear here.
              </p>
              <Link href="/#collection">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-[#111111] text-white rounded-sm hover:bg-[#2a2a2a] transition-colors"
                >
                  Start Shopping
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            /* Orders List */
            <div className="space-y-4">
              {mockOrders.map((order, index) => (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg border border-[#E5E5E5] shadow-sm p-5 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-medium text-[#111111]">{order.id}</h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                            statusColors[order.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B6B6B]">
                        <span>Placed on {order.date}</span>
                        <span>{order.items} {order.items === 1 ? "item" : "items"}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-[#6B6B6B]">Total</p>
                        <p className="font-medium text-[#111111]">
                          ${order.total.toLocaleString()}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] rounded-sm text-sm text-[#111111] hover:border-[#111111] transition-colors"
                      >
                        View Details
                        <ExternalLink className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
