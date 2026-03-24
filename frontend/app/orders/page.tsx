"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Package, ArrowLeft, ExternalLink, X } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth"
import { useCart } from "@/lib/cart"

const BASE_URL = "http://localhost:8001"

type OrderItem = {
  product_name?: string | null
  product_image?: string | null
  quantity?: number | null
  unit_price?: number | null
}

type Order = {
  id: string
  order_status?: string
  payment_status?: string
  currency?: string
  total_amount?: number
  created_at?: string
  items?: OrderItem[]
}

const statusColors: Record<string, string> = {
  delivered: "bg-green-100 text-green-700",
  shipped: "bg-blue-100 text-blue-700",
  processing: "bg-yellow-100 text-yellow-700",
  placed: "bg-purple-100 text-purple-700",
  cancelled: "bg-red-100 text-red-700",
}

function formatOrderStatusLabel(statusRaw?: string) {
  const key = (statusRaw || "processing").toLowerCase().replace(/\s+/g, "_")
  const pretty: Record<string, string> = {
    processing: "Processing",
    placed: "Placed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    pending: "Pending",
    completed: "Completed",
  }
  if (pretty[key]) return pretty[key]
  if (!statusRaw) return "Processing"
  return statusRaw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export default function OrdersPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const cartCount = useCart((state) => state.getItemCount())
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    const token = localStorage.getItem("token")
    if (!token) return

    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${BASE_URL}/orders`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        const data = await res.json()
        if (res.ok && data?.statusCode === 200 && Array.isArray(data.data)) {
          setOrders(data.data)
        } else {
          setOrders([])
        }
      } catch (e) {
        console.error(e)
        setOrders([])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [isAuthenticated, router])

  const renderedOrders = useMemo(() => orders, [orders])

  const getStatusChip = (statusRaw?: string) => {
    const status = (statusRaw || "processing").toLowerCase().replace(/\s+/g, "_")
    return {
      label: formatOrderStatusLabel(statusRaw),
      className: statusColors[status] || "bg-gray-100 text-gray-700",
    }
  }

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

          {loading ? (
            <div className="bg-white rounded-lg border border-[#E5E5E5] p-10 text-center text-[#6B6B6B]">
              Loading your orders...
            </div>
          ) : renderedOrders.length === 0 ? (
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
              {renderedOrders.map((order, index) => {
                const statusChip = getStatusChip(order.order_status)
                const orderDate = order.created_at
                  ? new Date(order.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })
                  : "-"
                const itemCount = Array.isArray(order.items) ? order.items.length : 0
                const thumb =
                  order.items?.find((it) => it.product_image)?.product_image ||
                  order.items?.[0]?.product_image
                return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg border border-[#E5E5E5] shadow-sm p-5 sm:p-6"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex-1 flex gap-4 min-w-0">
                      {thumb ? (
                        <div className="relative w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-md overflow-hidden bg-[#EFE8D8]">
                          <Image
                            src={thumb}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="80px"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-20 sm:w-20 sm:h-24 shrink-0 rounded-md bg-[#EFE8D8] flex items-center justify-center">
                          <Package className="w-8 h-8 text-[#C6A96B]/60" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="font-medium text-[#111111] truncate">{order.id}</h3>
                        <span
                          className={`px-2.5 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                            statusChip.className
                          }`}
                        >
                          {statusChip.label}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-[#6B6B6B]">
                        <span>Placed on {orderDate}</span>
                        <span>
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                        </span>
                        <span>Payment: {order.payment_status || "-"}</span>
                      </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm text-[#6B6B6B]">Total</p>
                        <p className="font-medium text-[#111111]">
                          {(order.currency || "USD")}{" "}
                          {Number(order.total_amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedOrder(order)}
                        className="flex items-center gap-2 px-4 py-2 border border-[#E5E5E5] rounded-sm text-sm text-[#111111] hover:border-[#111111] transition-colors"
                      >
                        View Details
                        <ExternalLink className="w-4 h-4" />
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-lg border border-[#E5E5E5] p-6 relative">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-3 right-3 text-[#6B6B6B] hover:text-[#111111]"
              aria-label="Close details"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-serif text-[#111111] mb-3">Order Details</h3>
            <p className="text-sm text-[#6B6B6B] mb-1">Order ID: {selectedOrder.id}</p>
            <p className="text-sm text-[#6B6B6B] mb-1">
              Status:{" "}
              <span className="text-[#111111]">
                {formatOrderStatusLabel(selectedOrder.order_status)}
              </span>
            </p>
            <p className="text-sm text-[#6B6B6B] mb-4">
              Payment: <span className="text-[#111111]">{selectedOrder.payment_status || "-"}</span>
            </p>

            <div className="space-y-3">
              {(selectedOrder.items || []).map((item, i) => (
                <div
                  key={`${item.product_name}-${i}`}
                  className="border border-[#E5E5E5] rounded-md p-3 flex gap-3"
                >
                  {item.product_image ? (
                    <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-[#EFE8D8]">
                      <Image
                        src={item.product_image}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    </div>
                  ) : null}
                  <div>
                  <p className="text-sm text-[#111111] font-medium">{item.product_name || "Product"}</p>
                  <p className="text-xs text-[#6B6B6B]">
                    Qty: {item.quantity || 0} | Price: {selectedOrder.currency || "USD"}{" "}
                    {Number(item.unit_price || 0).toLocaleString()}
                  </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
