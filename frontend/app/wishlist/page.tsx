"use client"

import { useEffect } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingBag, Trash2, ArrowLeft } from "lucide-react"
import { Navbar } from "@/components/navbar"
import { Footer } from "@/components/footer"
import { useWishlist } from "@/lib/wishlist"
import { useCart } from "@/lib/cart"
import { useAuth } from "@/lib/auth"
import { useRouter } from "next/navigation"

export default function WishlistPage() {
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const { items, fetchWishlist, removeItem } = useWishlist()
  const { addItem: addToCart, getItemCount } = useCart()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    const userId = localStorage.getItem("user_id")
    if (userId) {
      fetchWishlist(userId)
    }
  }, [isAuthenticated, fetchWishlist, router])

  const handleMoveToCart = async (item: typeof items[0]) => {
    const userId = localStorage.getItem("user_id")
    if (!userId) return
    try {
      await addToCart(userId, {
        product_id: item.id,
        quantity: 1,
        size: undefined,
        color: undefined,
      })
      await removeItem(userId, item.id)
    } catch (err) {
      console.error(err)
      alert("Couldn't move item to cart. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC]">
      <Navbar cartCount={getItemCount()} />

      <main className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              Your Wishlist
            </h1>
            <p className="text-[#6B6B6B] mt-2">
              {items.length} {items.length === 1 ? "item" : "items"} saved
            </p>
          </motion.div>

          {items.length === 0 ? (
            /* Empty State */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-20 h-20 bg-[#EFE8D8] rounded-full flex items-center justify-center mx-auto mb-6">
                <Heart className="w-10 h-10 text-[#C6A96B]" />
              </div>
              <h2 className="text-xl font-serif text-[#111111] mb-2">
                Your wishlist is empty
              </h2>
              <p className="text-[#6B6B6B] mb-8 max-w-md mx-auto">
                Save your favorite items to your wishlist and find them here anytime.
              </p>
              <Link href="/#collection">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-8 py-3 bg-[#111111] text-white rounded-sm hover:bg-[#2a2a2a] transition-colors"
                >
                  Explore Products
                </motion.button>
              </Link>
            </motion.div>
          ) : (
            /* Wishlist Grid */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-lg overflow-hidden border border-[#E5E5E5] shadow-sm group"
                >
                  {/* Image */}
                  <Link href={`/product/${item.id}`}>
                    <div className="relative aspect-[3/4] bg-[#EFE8D8] overflow-hidden">
                      <Image
                        src={item.image}
                        alt={item.name}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  </Link>

                  {/* Info */}
                  <div className="p-4">
                    {item.category && (
                      <p className="text-[#6B6B6B] text-xs tracking-[0.1em] uppercase mb-1">
                        {item.category}
                      </p>
                    )}
                    <Link href={`/product/${item.id}`}>
                      <h3 className="text-[#111111] font-medium mb-1 hover:text-[#C6A96B] transition-colors">
                        {item.name}
                      </h3>
                    </Link>
                    <p className="text-[#111111]/70 text-sm mb-4">
                      ${item.price.toLocaleString()}
                    </p>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleMoveToCart(item)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-[#111111] text-white text-sm rounded-sm hover:bg-[#2a2a2a] transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        Move to Cart
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const userId = localStorage.getItem("user_id")
                          if (!userId) return
                          removeItem(userId, item.id)
                        }}
                        className="p-2.5 border border-[#E5E5E5] rounded-sm text-[#6B6B6B] hover:text-red-500 hover:border-red-200 transition-colors"
                        aria-label="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
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
