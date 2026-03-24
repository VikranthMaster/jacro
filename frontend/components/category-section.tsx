"use client"

import { useRef } from "react"
import { motion, useInView } from "framer-motion"
import Image from "next/image"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface Category {
  name: string
  slug: string
  image: string
}

const categories: Category[] = [
  {
    name: "Tops",
    slug: "Tops",
    image: "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
  },
  {
    name: "Outerwear",
    slug: "Outerwear",
    image: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&q=80",
  },
  {
    name: "Shoes",
    slug: "Shoes",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
  },
  {
    name: "Coats",
    slug: "Coats",
    image: "https://images.unsplash.com/photo-1544923246-77307dd628b7?w=800&q=80",
  },
  {
    name: "Accessories",
    slug: "Accessories",
    image: "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&q=80",
  },
]

interface CategorySectionProps {
  onCategorySelect?: (category: string) => void
}

export function CategorySection({ onCategorySelect }: CategorySectionProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const sectionRef = useRef<HTMLElement>(null)
  const isInView = useInView(sectionRef, { once: true, margin: "-100px" })

  const scroll = (direction: "left" | "right") => {
    if (containerRef.current) {
      const scrollAmount = 320
      containerRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      })
    }
  }

  const handleCategoryClick = (slug: string) => {
    if (onCategorySelect) {
      onCategorySelect(slug)
    }
  }

  return (
    <section
      ref={sectionRef}
      id="categories"
      className="py-20 md:py-28 bg-[#F5F5DC]"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <span className="text-[#C6A96B] text-sm tracking-[0.2em] uppercase mb-3 block">
            Browse
          </span>
          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#111111] tracking-wide">
            Shop by Category
          </h2>
        </motion.div>

        {/* Category Cards Container */}
        <div className="relative">
          {/* Navigation Arrows - Desktop */}
          <button
            onClick={() => scroll("left")}
            className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-12 h-12 items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-[#111111]" />
          </button>
          <button
            onClick={() => scroll("right")}
            className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-12 h-12 items-center justify-center bg-white/90 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-[#111111]" />
          </button>

          {/* Scrollable Container */}
          <div
            ref={containerRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide pb-4 -mx-6 px-6 md:mx-0 md:px-0 snap-x snap-mandatory"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {categories.map((category, index) => (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 30 }}
                animate={isInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="flex-shrink-0 snap-start"
              >
                <Link
                  href={`#collection`}
                  onClick={() => handleCategoryClick(category.slug)}
                  className="group block relative w-[280px] md:w-[300px] h-[400px] md:h-[450px] rounded-sm overflow-hidden"
                >
                  {/* Image */}
                  <div className="absolute inset-0">
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      loading={index < 2 ? "eager" : "lazy"}
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  </div>

                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent transition-opacity duration-500 group-hover:from-black/80" />

                  {/* Category Name */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <h3 className="font-serif text-2xl md:text-3xl text-white tracking-wide transition-all duration-500 group-hover:text-[#C6A96B]">
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-2 opacity-0 transform translate-y-2 transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-0">
                      <span className="text-white/80 text-sm tracking-wider uppercase">
                        Explore
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/80" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
