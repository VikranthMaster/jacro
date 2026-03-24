"use client"

import { motion } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { Heart } from "lucide-react"
import { useWishlist } from "@/lib/wishlist"

export interface Product {
  id: string
  name: string
  price: number
  image: string
  category?: string
  colors?: string[]
  sizes?: string[]
}

interface ProductCardProps {
  product: Product
  index?: number
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const { isInWishlist, toggleItem } = useWishlist()
  const isWishlisted = isInWishlist(product.id)

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      alert("Please log in to save items to your wishlist")
      return
    }

    toggleItem(userId, {
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      category: product.category,
    }).catch((err) => {
      console.error(err)
      alert("Failed to update wishlist. Please try again.")
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6, delay: index * 0.1 }}
    >
      <Link href={`/product/${product.id}`} className="group block">
        <div className="relative aspect-[3/4] bg-[#EFE8D8] overflow-hidden mb-4 rounded-sm">
          <Image
            src={product.image}
            alt={product.name}
            fill
            loading={index < 4 ? "eager" : "lazy"}
            priority={index < 2}
            className="object-cover transition-transform duration-700 group-hover:scale-105"
          />
          
          {/* Wishlist Heart Button */}
          <motion.button
            onClick={handleWishlistClick}
            whileTap={{ scale: 0.85 }}
            className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 backdrop-blur-sm shadow-sm hover:bg-white transition-colors"
            aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          >
            <motion.div
              animate={isWishlisted ? { scale: [1, 1.3, 1] } : { scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isWishlisted
                    ? "fill-[#C6A96B] text-[#C6A96B]"
                    : "text-[#111111]/60 hover:text-[#C6A96B]"
                }`}
              />
            </motion.div>
          </motion.button>
          
          {/* Subtle hover overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500 pointer-events-none" />
        </div>
        
        {/* Always visible product info */}
        <div className="space-y-1.5">
          {product.category && (
            <p className="text-[#6B6B6B] text-xs tracking-[0.1em] uppercase">
              {product.category}
            </p>
          )}
          <h3 className="text-[#111111] text-sm tracking-wide font-medium group-hover:text-[#C6A96B] transition-colors">
            {product.name}
          </h3>
          <p className="text-[#111111]/70 text-sm">
            ${product.price.toLocaleString()}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}
