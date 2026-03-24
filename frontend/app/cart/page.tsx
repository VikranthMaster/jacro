"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Minus, Plus, X, ShoppingBag, ArrowLeft, ArrowRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useCart, type CartItem } from "@/lib/cart"

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const { items, fetchCart, removeItem, updateQuantity, getTotal, getItemCount, loading } = useCart()

  useEffect(() => {
    setMounted(true)
    const userId = localStorage.getItem("user_id")
    if (userId) {
      fetchCart(userId)
    }
  }, [])

  const subtotal = mounted ? getTotal() : 0
  const shipping = subtotal > 500 ? 0 : 25
  const total = subtotal + shipping
  const itemCount = mounted ? getItemCount() : 0

  return (
    <main className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={itemCount} />

      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 md:mb-12"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#111111] text-sm mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Continue Shopping
            </Link>
            <h1 className="font-serif text-3xl md:text-4xl text-[#111111]">
              Shopping Cart
            </h1>
            {mounted && items.length > 0 && (
              <p className="text-[#6B6B6B] mt-2">{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
            )}
          </motion.div>

          {/* Loading state */}
          {loading ? (
            <div className="text-center py-16 text-[#6B6B6B]">Loading your cart...</div>
          ) : mounted && items.length === 0 ? (
            <EmptyCart />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
              {/* Cart Items */}
              <div className="lg:col-span-2">
                <AnimatePresence mode="popLayout">
                  {mounted && items.map((item, index) => (
                    <CartItemCard
                      key={`${item.id}-${item.size}-${item.color}`}
                      item={item}
                      index={index}
                      onRemove={() => removeItem(item.id)}
                      onUpdateQuantity={(qty) => updateQuantity(item.id, qty)}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-white p-6 rounded-sm border border-[#E5E5E5] sticky top-24"
                >
                  <h2 className="font-serif text-xl text-[#111111] mb-6">Order Summary</h2>

                  <div className="space-y-4 text-sm">
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Subtotal</span>
                      <span>${subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-[#6B6B6B]">
                      <span>Shipping</span>
                      <span>{shipping === 0 ? 'Free' : `$${shipping}`}</span>
                    </div>
                    {shipping > 0 && (
                      <p className="text-xs text-[#C6A96B]">
                        Free shipping on orders over $500
                      </p>
                    )}
                    <div className="border-t border-[#E5E5E5] pt-4">
                      <div className="flex justify-between text-[#111111] font-medium text-base">
                        <span>Total</span>
                        <span>${total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <Link
                    href="/transactions"
                    className="block mt-6"
                  >
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="w-full py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium rounded-sm flex items-center justify-center gap-2 hover:bg-[#111111]/90 transition-colors"
                    >
                      Checkout
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </Link>

                  <p className="text-xs text-[#6B6B6B] text-center mt-4">
                    Secure checkout (payment integration later)
                  </p>
                </motion.div>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </main>
  )
}

function CartItemCard({
  item,
  index,
  onRemove,
  onUpdateQuantity,
}: {
  item: CartItem
  index: number
  onRemove: () => void
  onUpdateQuantity: (qty: number) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      transition={{ delay: index * 0.1 }}
      className="flex gap-4 sm:gap-6 py-6 border-b border-[#E5E5E5]"
    >
      {/* Image */}
      <Link href={`/product/${item.product_id}`} className="relative w-24 sm:w-32 aspect-[3/4] bg-[#EFE8D8] rounded-sm overflow-hidden flex-shrink-0">
        <Image
          src={item.image}
          alt={item.name}
          fill
          className="object-cover"
        />
      </Link>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2">
          <div>
            <Link href={`/product/${item.product_id}`}>
              <h3 className="text-[#111111] font-medium hover:text-[#C6A96B] transition-colors">
                {item.name}
              </h3>
            </Link>
            <div className="text-sm text-[#6B6B6B] mt-1 space-x-2">
              {item.size && <span>Size: {item.size}</span>}
              {item.color && <span>Color: {item.color}</span>}
            </div>
          </div>
          <button
            onClick={onRemove}
            className="p-1.5 text-[#6B6B6B] hover:text-[#111111] transition-colors"
            aria-label="Remove item"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-end justify-between mt-4">
          {/* Quantity */}
          <div className="flex items-center border border-[#E5E5E5] rounded-sm">
            <button
              onClick={() => onUpdateQuantity(item.quantity - 1)}
              disabled={item.quantity <= 1}
              className="p-2 text-[#6B6B6B] hover:text-[#111111] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="px-4 py-1 text-sm text-[#111111] min-w-[40px] text-center">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQuantity(item.quantity + 1)}
              className="p-2 text-[#6B6B6B] hover:text-[#111111] transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Price */}
          <p className="text-[#111111] font-medium">
            ${(item.price * item.quantity).toLocaleString()}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

function EmptyCart() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <div className="w-20 h-20 mx-auto mb-6 bg-[#EFE8D8] rounded-full flex items-center justify-center">
        <ShoppingBag className="w-8 h-8 text-[#6B6B6B]" />
      </div>
      <h2 className="font-serif text-2xl text-[#111111] mb-2">Your cart is empty</h2>
      <p className="text-[#6B6B6B] mb-8">Looks like you have not added anything to your cart yet.</p>
      <Link href="/#collection">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="px-8 py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium rounded-sm"
        >
          Start Shopping
        </motion.button>
      </Link>
    </motion.div>
  )
}