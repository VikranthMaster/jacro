"use client"

import { useRef } from "react"
import { motion } from "framer-motion"
import { ChevronLeft, ChevronRight } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import type { Product } from "./product-card"

interface FeaturedCarouselProps {
  products: Product[]
}

export function FeaturedCarousel({ products }: FeaturedCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  return (
    <section id="new" className="py-16 md:py-24 bg-[#EFE8D8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex items-end justify-between mb-8 md:mb-12"
        >
          <div>
            <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase mb-3">
              Featured
            </p>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#111111] tracking-wide">
              New Arrivals
            </h2>
          </div>

          {/* Navigation arrows */}
          <div className="hidden md:flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scroll("left")}
              className="w-10 h-10 border border-[#111111]/20 bg-white flex items-center justify-center text-[#111111]/60 hover:text-[#111111] hover:border-[#111111]/40 transition-all rounded-sm"
              aria-label="Previous"
            >
              <ChevronLeft className="w-5 h-5" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => scroll("right")}
              className="w-10 h-10 border border-[#111111]/20 bg-white flex items-center justify-center text-[#111111]/60 hover:text-[#111111] hover:border-[#111111]/40 transition-all rounded-sm"
              aria-label="Next"
            >
              <ChevronRight className="w-5 h-5" />
            </motion.button>
          </div>
        </motion.div>

        {/* Carousel */}
        <div
          ref={scrollRef}
          className="flex gap-4 md:gap-6 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8 snap-x snap-mandatory"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {products.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex-shrink-0 w-[260px] sm:w-[300px] md:w-[320px] snap-start"
            >
              <Link href={`/product/${product.id}`} className="group block">
                <div className="relative aspect-[3/4] bg-white overflow-hidden mb-4 rounded-sm shadow-sm">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    loading={index === 0 ? "eager" : "lazy"}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all duration-500" />
                </div>
                
                {/* Always visible product info */}
                <div className="space-y-1">
                  {product.category && (
                    <p className="text-[#6B6B6B] text-xs tracking-[0.1em] uppercase">
                      {product.category}
                    </p>
                  )}
                  <h3 className="text-[#111111] text-sm font-medium tracking-wide group-hover:text-[#C6A96B] transition-colors">
                    {product.name}
                  </h3>
                  <p className="text-[#111111]/70 text-sm">
                    ${product.price.toLocaleString()}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
