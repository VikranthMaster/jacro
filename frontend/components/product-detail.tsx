"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import Image from "next/image"
import { ChevronLeft, Minus, Plus, ShoppingBag, Heart } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useCart } from "@/lib/cart"
import { useWishlist } from "@/lib/wishlist"
import { toast } from "@/hooks/use-toast"

interface ProductDetailProps {
  product: {
    id: string
    name: string
    price: number
    description: string
    images: string[]
    colors?: { name: string; value: string }[] // optional
    sizes: string[]
    category: string
  }
}

export function ProductDetail({ product }: ProductDetailProps) {
  const router = useRouter()
  const [selectedImage, setSelectedImage] = useState(0)
  const images = product.images ?? []
  const colors = product.colors ?? []
  const sizes = product.sizes ?? ['S']
  const [selectedColor, setSelectedColor] = useState(colors[0]?.name || "")
  const [selectedSize, setSelectedSize] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [isAdding, setIsAdding] = useState(false)
  const [isBuying, setIsBuying] = useState(false)
  const { addItem } = useCart()
  const { isInWishlist, toggleItem } = useWishlist()
  const wishlisted = isInWishlist(product.id)

  const handleAddToCart = async () => {
    if (!selectedSize) {
      alert("Please select a size")
      return
    }

    const userId = localStorage.getItem("user_id")
    if (!userId) {
      alert("Please log in to add items to your cart")
      return
    }

    setIsAdding(true)
    try {
      await addItem(userId, {
        product_id: product.id,
        quantity,
        size: selectedSize,
        color: selectedColor,
      })
      toast({
        title: "Added to cart",
        description: product.name,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Couldn't add to cart",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const handleBuyNow = async () => {
    if (!selectedSize) {
      alert("Please select a size")
      return
    }
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      alert("Please log in to continue")
      return
    }
    setIsBuying(true)
    try {
      await addItem(userId, {
        product_id: product.id,
        quantity,
        size: selectedSize,
        color: selectedColor,
      })
      toast({
        title: "Ready for checkout",
        description: product.name,
      })
      router.push("/transactions")
    } catch (err) {
      console.error(err)
      toast({
        title: "Could not continue",
        description: "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBuying(false)
    }
  }

  const handleWishlist = async () => {
    const userId = localStorage.getItem("user_id")
    if (!userId) {
      alert("Please log in to save items to your wishlist")
      return
    }
    try {
      await toggleItem(userId, {
        id: product.id,
        name: product.name,
        price: product.price,
        image: images[0] || "",
        category: product.category,
      })
      toast({
        title: wishlisted ? "Removed from wishlist" : "Added to wishlist",
        description: product.name,
      })
    } catch (err) {
      console.error(err)
      toast({
        title: "Wishlist update failed",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F5DC] pt-20 md:pt-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#6B6B6B] hover:text-[#111111] text-sm tracking-wide transition-colors mb-6 md:mb-8"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Shop
          </Link>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4"
          >
            {/* Main image */}
            <div className="relative aspect-[3/4] bg-[#EFE8D8] overflow-hidden rounded-sm">
              <Image
                src={images[selectedImage]}
                alt={product.name}
                fill
                className="object-cover"
                priority
              />
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-3">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-16 h-20 sm:w-20 sm:h-24 overflow-hidden rounded-sm transition-all ${
                      selectedImage === index
                        ? "ring-2 ring-[#C6A96B]"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Product info */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 md:space-y-8"
          >
            {/* Category */}
            <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase">
              {product.category}
            </p>

            {/* Name */}
            <h1 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#111111] tracking-wide">
              {product.name}
            </h1>

            {/* Price */}
            <p className="text-xl md:text-2xl text-[#111111]">
              ${product.price.toLocaleString()}
            </p>

            {/* Description */}
            <p className="text-[#6B6B6B] leading-relaxed">
              {product.description}
            </p>

            {/* Divider */}
            <div className="h-px bg-[#E5E5E5]" />

            {/* Color selector */}
            <div>
              <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
                Color: <span className="text-[#6B6B6B] font-normal">{selectedColor}</span>
              </h4>
              <div className="flex gap-3">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-9 h-9 rounded-full border-2 transition-all ${
                      selectedColor === color.name
                        ? "border-[#C6A96B] scale-110 ring-2 ring-[#C6A96B]/30"
                        : "border-[#E5E5E5] hover:scale-105"
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                    aria-label={`Select ${color.name}`}
                  >
                    <span className="sr-only">{color.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Size selector */}
            <div>
              <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
                Size {!selectedSize && <span className="text-[#DC2626] font-normal">*</span>}
              </h4>
              <div className="flex flex-wrap gap-2">
                {sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`w-12 h-11 text-sm tracking-wide rounded-sm transition-all ${
                      selectedSize === size
                        ? "bg-[#111111] text-white"
                        : "bg-white text-[#111111]/60 hover:bg-[#EFE8D8] hover:text-[#111111] border border-[#E5E5E5]"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div>
              <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
                Quantity
              </h4>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 border border-[#E5E5E5] bg-white flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:border-[#111111]/30 transition-all rounded-sm"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-14 text-center text-[#111111] text-base">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 border border-[#E5E5E5] bg-white flex items-center justify-center text-[#6B6B6B] hover:text-[#111111] hover:border-[#111111]/30 transition-all rounded-sm"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <motion.button
                whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddToCart}
                disabled={isAdding}
                className="flex-1 flex items-center justify-center gap-3 px-6 py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium transition-all rounded-sm disabled:opacity-70"
              >
                <ShoppingBag className="w-4 h-4" />
                {isAdding ? "Adding…" : "Add to Cart"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleWishlist}
                className="flex items-center justify-center gap-3 px-6 py-4 border border-[#E5E5E5] bg-white text-[#111111] text-sm tracking-[0.15em] uppercase transition-all hover:border-[#111111]/30 rounded-sm"
              >
                <Heart className={`w-4 h-4 ${wishlisted ? "fill-[#C6A96B] text-[#C6A96B]" : ""}`} />
                <span>{wishlisted ? "Wishlisted" : "Add to Wishlist"}</span>
              </motion.button>
            </div>

            {/* Buy now */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleBuyNow}
              disabled={isBuying}
              className="w-full px-6 py-4 bg-[#C6A96B] text-white text-sm tracking-[0.15em] uppercase font-medium transition-all hover:bg-[#B89B50] rounded-sm disabled:opacity-70"
            >
              {isBuying ? "Going to checkout…" : "Buy Now"}
            </motion.button>
          </motion.div>
        </div>
      </div>
    </div>
  )
}