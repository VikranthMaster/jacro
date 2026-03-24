"use client"

import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowLeft, Loader2, Truck } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useAuth } from "@/lib/auth"
import { useCart } from "@/lib/cart"
import { toast } from "@/hooks/use-toast"

const BASE_URL = "http://localhost:8001"

type Address = {
  recipient_name: string
  phone?: string
  line1: string
  line2?: string
  city: string
  state?: string
  postal_code?: string
  country: string
}

export default function TransactionsPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { items, fetchCart, getTotal, clearCart, loading } = useCart()

  const [mounted, setMounted] = useState(false)
  const [busy, setBusy] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [sameAsShipping, setSameAsShipping] = useState(true)

  const subtotal = useMemo(() => getTotal(), [items, getTotal])
  const shipping = useMemo(() => (subtotal > 500 ? 0 : 25), [subtotal])
  const total = subtotal + shipping

  const [shippingAddress, setShippingAddress] = useState<Address>({
    recipient_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "United States",
  })

  const [billingAddress, setBillingAddress] = useState<Address>({
    recipient_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "United States",
  })

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }
    setMounted(true)
    const userId = localStorage.getItem("user_id")
    if (userId) fetchCart(userId)
  }, [isAuthenticated, fetchCart, router])

  const validate = () => {
    if (!shippingAddress.recipient_name.trim()) return "Enter recipient name"
    if (!shippingAddress.line1.trim()) return "Enter address line 1"
    if (!shippingAddress.city.trim()) return "Enter city"
    if (!shippingAddress.country.trim()) return "Enter country"
    if (!sameAsShipping) {
      if (!billingAddress.recipient_name.trim()) return "Enter billing recipient name"
      if (!billingAddress.line1.trim()) return "Enter billing address line 1"
      if (!billingAddress.city.trim()) return "Enter billing city"
      if (!billingAddress.country.trim()) return "Enter billing country"
    }
    return null
  }

  const handlePlaceOrder = async () => {
    const err = validate()
    if (err) {
      toast({
        title: "Missing info",
        description: err,
        variant: "destructive",
      })
      return
    }

    const token = localStorage.getItem("token")
    if (!token) {
      toast({ title: "Please log in", description: "Login to checkout.", variant: "destructive" })
      return
    }

    try {
      setBusy(true)
      const res = await fetch(`${BASE_URL}/checkout/place`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          shipping_address: shippingAddress,
          billing_address: sameAsShipping ? null : billingAddress,
        }),
      })

      const data = await res.json()
      if (!res.ok || data.statusCode !== 200) {
        throw new Error(data?.message || "Checkout failed")
      }

      setOrderId(data.order_id)
      clearCart()

      toast({
        title: "Order created",
        description: "Payment integration later. Your transaction is pending.",
      })
    } catch (e: any) {
      console.error(e)
      toast({
        title: "Checkout failed",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={mounted ? items.reduce((c, it) => c + it.quantity, 0) : 0} />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12"
          >
            <Link
              href="/cart"
              className="inline-flex items-center gap-2 text-sm text-[#6B6B6B] hover:text-[#111111] transition-colors mb-6"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Cart
            </Link>

            <h1 className="font-serif text-3xl md:text-4xl text-[#111111]">Checkout</h1>
            <p className="text-[#6B6B6B] mt-2">Transactions will be integrated with a payment app later.</p>
          </motion.div>

          {orderId ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-[#E5E5E5] rounded-sm p-6 md:p-8"
            >
              <div className="flex items-center gap-3 text-[#111111]">
                <div className="w-12 h-12 rounded-sm bg-[#EFE8D8] flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#111111]" />
                </div>
                <div>
                  <h2 className="font-serif text-2xl">Transaction created</h2>
                  <p className="text-[#6B6B6B]">Order ID: {orderId}</p>
                </div>
              </div>

              <div className="mt-8 flex gap-3 flex-col sm:flex-row">
                <Link
                  href="/orders"
                  className="flex-1 text-center px-6 py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium rounded-sm hover:bg-[#111111]/90 transition-colors"
                >
                  Go to Orders
                </Link>
                <Link
                  href="/#collection"
                  className="flex-1 text-center px-6 py-4 border border-[#E5E5E5] text-[#111111] text-sm tracking-[0.15em] uppercase font-medium rounded-sm hover:border-[#111111]/30 transition-colors"
                >
                  Continue Shopping
                </Link>
              </div>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              <div className="lg:col-span-2">
                <div className="bg-white border border-[#E5E5E5] rounded-sm p-6 md:p-8">
                  <h2 className="font-serif text-xl text-[#111111] mb-6">Shipping Address</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Recipient name">
                      <input
                        value={shippingAddress.recipient_name}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, recipient_name: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                    <Field label="Phone (optional)">
                      <input
                        value={shippingAddress.phone ?? ""}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, phone: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Address line 1">
                      <input
                        value={shippingAddress.line1}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, line1: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                    <div className="mt-4">
                      <Field label="Address line 2 (optional)">
                        <input
                          value={shippingAddress.line2 ?? ""}
                          onChange={(e) => setShippingAddress((s) => ({ ...s, line2: e.target.value }))}
                          className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                        />
                      </Field>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <Field label="City">
                      <input
                        value={shippingAddress.city}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, city: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                    <Field label="State (optional)">
                      <input
                        value={shippingAddress.state ?? ""}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, state: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                    <Field label="ZIP (optional)">
                      <input
                        value={shippingAddress.postal_code ?? ""}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, postal_code: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                  </div>

                  <div className="mt-4">
                    <Field label="Country">
                      <input
                        value={shippingAddress.country}
                        onChange={(e) => setShippingAddress((s) => ({ ...s, country: e.target.value }))}
                        className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                      />
                    </Field>
                  </div>

                  <div className="mt-8 border-t border-[#E5E5E5] pt-6">
                    <label className="flex items-center gap-3 text-[#111111]">
                      <input
                        type="checkbox"
                        checked={sameAsShipping}
                        onChange={(e) => setSameAsShipping(e.target.checked)}
                      />
                      Use shipping address as billing address
                    </label>
                  </div>

                  {!sameAsShipping && (
                    <div className="mt-6">
                      <h2 className="font-serif text-xl text-[#111111] mb-6">Billing Address</h2>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Recipient name">
                          <input
                            value={billingAddress.recipient_name}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, recipient_name: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                        <Field label="Phone (optional)">
                          <input
                            value={billingAddress.phone ?? ""}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, phone: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                      </div>

                      <div className="mt-4">
                        <Field label="Address line 1">
                          <input
                            value={billingAddress.line1}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, line1: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                        <div className="mt-4">
                          <Field label="Address line 2 (optional)">
                            <input
                              value={billingAddress.line2 ?? ""}
                              onChange={(e) => setBillingAddress((s) => ({ ...s, line2: e.target.value }))}
                              className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                            />
                          </Field>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <Field label="City">
                          <input
                            value={billingAddress.city}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, city: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                        <Field label="State (optional)">
                          <input
                            value={billingAddress.state ?? ""}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, state: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                        <Field label="ZIP (optional)">
                          <input
                            value={billingAddress.postal_code ?? ""}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, postal_code: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                      </div>

                      <div className="mt-4">
                        <Field label="Country">
                          <input
                            value={billingAddress.country}
                            onChange={(e) => setBillingAddress((s) => ({ ...s, country: e.target.value }))}
                            className="w-full border border-[#E5E5E5] rounded-md px-3 py-2 bg-white text-[#111111] focus:outline-none focus:border-[#C6A96B]"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="bg-white p-6 rounded-sm border border-[#E5E5E5] sticky top-24"
                >
                  <h2 className="font-serif text-xl text-[#111111] mb-6">Order Summary</h2>

                  {loading ? (
                    <div className="text-[#6B6B6B]">Loading cart...</div>
                  ) : items.length === 0 ? (
                    <div className="text-[#6B6B6B]">Your cart is empty.</div>
                  ) : (
                    <div className="space-y-4 text-sm">
                      <div className="flex justify-between text-[#6B6B6B]">
                        <span>Subtotal</span>
                        <span>${subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[#6B6B6B]">
                        <span>Shipping</span>
                        <span>{shipping === 0 ? "Free" : `$${shipping}`}</span>
                      </div>
                      <div className="border-t border-[#E5E5E5] pt-4">
                        <div className="flex justify-between text-[#111111] font-medium text-base">
                          <span>Total</span>
                          <span>${total.toLocaleString()}</span>
                        </div>
                      </div>

                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={busy || items.length === 0}
                        onClick={handlePlaceOrder}
                        className="w-full mt-6 py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#111111]/90 transition-colors disabled:opacity-70"
                      >
                        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Place Order"}
                      </motion.button>

                      <p className="text-xs text-[#6B6B6B] text-center mt-4">
                        Payment provider integration will be connected later.
                      </p>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-[#6B6B6B] mb-2 tracking-[0.1em] uppercase">{label}</span>
      {children}
    </label>
  )
}

