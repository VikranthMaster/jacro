"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { Hero } from "@/components/hero"
import { CategorySection } from "@/components/category-section"
import { FeaturedCarousel } from "@/components/featured-carousel"
import { ProductFilters } from "@/components/product-filters"
import { ProductGrid } from "@/components/product-grid"
import { Footer } from "@/components/footer"
import { getFeaturedProducts, getAllProducts, filterProducts, searchProducts } from "@/lib/products"
import type { Product } from "@/components/product-card"
import { useCart } from "@/lib/cart"

interface Filters {
  category: string
  priceRange: [number, number]
  size: string[]
  colors: string[]
}

function HomeContent() {
  const searchParams = useSearchParams()
  const urlQ = searchParams.get("q") ?? ""

  const [mounted, setMounted] = useState(false)
  const [searchQuery, setSearchQuery] = useState(urlQ)
  const [filters, setFilters] = useState<Filters>({
    category: "All",
    priceRange: [0, 5000],
    size: [],
    colors: [],
  })
  const [allProducts, setAllProducts] = useState<Product[]>([])
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(false)

  const collectionRef = useRef<HTMLDivElement>(null)
  const { getItemCount } = useCart()

  useEffect(() => {
    setSearchQuery(urlQ)
  }, [urlQ])

  // Initial load
  useEffect(() => {
    setMounted(true)

    const loadInitialData = async () => {
      const [all, featured] = await Promise.all([
        getAllProducts(),
        getFeaturedProducts(),
      ])
      setAllProducts(all)
      setFeaturedProducts(featured)
      setFilteredProducts(all)
    }

    loadInitialData()
  }, [])

  // React to search or filter changes
  useEffect(() => {
    const applyFilters = async () => {
      setLoading(true)

      try {
        const trimmed = searchQuery.trim()
        const categoryActive = filters.category !== "All"
        const priceActive = filters.priceRange[0] !== 0 || filters.priceRange[1] !== 5000

        let baseProducts: Product[] = []

        if (trimmed) {
          baseProducts = await searchProducts(trimmed)
        } else if (categoryActive || priceActive) {
          baseProducts = await filterProducts({
            category: categoryActive ? filters.category : undefined,
            min_price: filters.priceRange[0] !== 0 ? filters.priceRange[0] : undefined,
            max_price: filters.priceRange[1] !== 5000 ? filters.priceRange[1] : undefined,
          })
        } else {
          baseProducts = allProducts
        }

        let final = baseProducts
        if (categoryActive) {
          final = final.filter((p) => p.category === filters.category)
        }
        if (priceActive) {
          final = final.filter(
            (p) => p.price >= filters.priceRange[0] && p.price <= filters.priceRange[1]
          )
        }

        setFilteredProducts(final)
      } catch (err) {
        console.error("Filter/search error:", err)
        setFilteredProducts(allProducts)
      } finally {
        setLoading(false)
      }
    }

    applyFilters()
  }, [searchQuery, filters, allProducts])

  const handleCategorySelect = (category: string) => {
    setFilters((prev) => ({ ...prev, category }))
    setTimeout(() => {
      collectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 100)
  }

  return (
    <main className="bg-[#F5F5DC]">
      <Navbar cartCount={mounted ? getItemCount() : 0} />
      <Hero />
      <CategorySection onCategorySelect={handleCategorySelect} />
      <FeaturedCarousel products={featuredProducts} />
      <div ref={collectionRef} id="collection">
        <ProductFilters
          onSearch={setSearchQuery}
          onFilterChange={setFilters}
          activeCategory={filters.category}
          urlSearchSync={urlQ}
        />
        <ProductGrid
          products={filteredProducts}
          title={filteredProducts.length === 0 && !loading ? "No Products Found" : "The Collection"}
          subtitle={
            filteredProducts.length === 0 && !loading
              ? "Try adjusting your filters"
              : filters.category !== "All"
                ? filters.category
                : "Explore"
          }
        />
      </div>
      <Footer />
    </main>
  )
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#F5F5DC] flex items-center justify-center text-[#6B6B6B]">
          Loading…
        </main>
      }
    >
      <HomeContent />
    </Suspense>
  )
}
