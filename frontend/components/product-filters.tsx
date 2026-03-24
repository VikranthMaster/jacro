"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Search, SlidersHorizontal, X, ChevronDown } from "lucide-react"
import { Slider } from "@/components/ui/slider"

const categories = ["All", "Tops", "Outerwear", "Coats", "Shoes", "Bottoms", "Accessories"]
const sizes = ["XS", "S", "M", "L", "XL"]
const colors = [
  { name: "Black", value: "#0A0A0A" },
  { name: "White", value: "#FFFFFF" },
  { name: "Beige", value: "#D4C4A8" },
  { name: "Navy", value: "#1E3A5F" },
  { name: "Olive", value: "#4A5043" },
]

interface Filters {
  category: string
  priceRange: [number, number]
  size: string[]
  colors: string[]
}

interface ProductFiltersProps {
  onSearch?: (query: string) => void
  onFilterChange?: (filters: Filters) => void
  activeCategory?: string
}

export function ProductFilters({ onSearch, onFilterChange, activeCategory }: ProductFiltersProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [isFiltersOpen, setIsFiltersOpen] = useState(false)
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(activeCategory || "All")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 5000])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedColors, setSelectedColors] = useState<string[]>([])

  // Sync activeCategory prop with state
  useEffect(() => {
    if (activeCategory && activeCategory !== selectedCategory) {
      setSelectedCategory(activeCategory)
    }
  }, [activeCategory, selectedCategory])

  // Debounced search (slightly faster feel)
  useEffect(() => {
    // When clearing, update immediately so results reset right away.
    if (searchQuery.trim() === "") {
      onSearch?.("")
      return
    }

    const timer = setTimeout(() => {
      onSearch?.(searchQuery)
    }, 150)
    return () => clearTimeout(timer)
  }, [searchQuery, onSearch])

  // Auto-apply filters when they change
  const applyFilters = useCallback(() => {
    // Backend filtering currently supports category + price only.
    // Size/colors are kept in UI state, but not sent upstream until backend supports them.
    onFilterChange?.({
      category: selectedCategory,
      priceRange,
      size: [],
      colors: [],
    })
  }, [selectedCategory, priceRange, onFilterChange])

  useEffect(() => {
    applyFilters()
  }, [applyFilters])

  const toggleSize = (size: string) => {
    setSelectedSizes(prev =>
      prev.includes(size)
        ? prev.filter(s => s !== size)
        : [...prev, size]
    )
  }

  const toggleColor = (color: string) => {
    setSelectedColors(prev =>
      prev.includes(color)
        ? prev.filter(c => c !== color)
        : [...prev, color]
    )
  }

  const clearFilters = () => {
    setSelectedCategory("All")
    setPriceRange([0, 5000])
    setSelectedSizes([])
    setSelectedColors([])
    setSearchQuery("")
  }

  const hasActiveFilters =
    selectedCategory !== "All" ||
    priceRange[0] !== 0 ||
    priceRange[1] !== 5000

  const FilterContent = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
      {/* Categories */}
      <div>
        <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
          Category
        </h4>
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 text-xs tracking-wide rounded-sm transition-all ${
                selectedCategory === category
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#111111]/60 hover:bg-[#EFE8D8] hover:text-[#111111] border border-[#E5E5E5]"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
          Price Range
        </h4>
        <div className="px-2">
          <Slider
            value={priceRange}
            min={0}
            max={5000}
            step={100}
            onValueChange={(value) => setPriceRange(value as [number, number])}
            className="mb-3"
          />
          <div className="flex justify-between text-xs text-[#6B6B6B]">
            <span>${priceRange[0]}</span>
            <span>${priceRange[1]}</span>
          </div>
        </div>
      </div>

      {/* Sizes */}
      <div>
        <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
          Size
        </h4>
        <div className="flex flex-wrap gap-2">
          {sizes.map((size) => (
            <button
              key={size}
              onClick={() => toggleSize(size)}
              className={`w-10 h-10 text-xs rounded-sm transition-all ${
                selectedSizes.includes(size)
                  ? "bg-[#111111] text-white"
                  : "bg-white text-[#111111]/60 hover:bg-[#EFE8D8] hover:text-[#111111] border border-[#E5E5E5]"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <h4 className="text-[#111111] text-sm tracking-[0.1em] uppercase mb-4 font-medium">
          Color
        </h4>
        <div className="flex flex-wrap gap-3">
          {colors.map((color) => (
            <button
              key={color.name}
              onClick={() => toggleColor(color.name)}
              className={`w-8 h-8 rounded-full border-2 transition-all ${
                selectedColors.includes(color.name)
                  ? "border-[#C6A96B] scale-110 ring-2 ring-[#C6A96B]/30"
                  : "border-[#E5E5E5] hover:scale-105"
              }`}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={color.name}
            >
              <span className="sr-only">{color.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <section className="py-6 md:py-8 bg-[#F5F5DC] border-b border-[#E5E5E5]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B6B6B]" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-[#E5E5E5] pl-12 pr-4 py-3 text-sm text-[#111111] placeholder:text-[#6B6B6B] focus:outline-none focus:border-[#C6A96B] focus:ring-1 focus:ring-[#C6A96B]/20 transition-all rounded-sm"
            />
          </div>

          {/* Desktop Filter toggle */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsFiltersOpen(!isFiltersOpen)}
            className="hidden sm:flex items-center gap-2 px-6 py-3 border border-[#E5E5E5] bg-white text-[#111111]/70 hover:text-[#111111] hover:border-[#111111]/30 transition-all text-sm tracking-wide rounded-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[#C6A96B]" />
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
          </motion.button>

          {/* Mobile Filter toggle */}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsMobileFiltersOpen(true)}
            className="sm:hidden flex items-center justify-center gap-2 px-6 py-3 border border-[#E5E5E5] bg-white text-[#111111]/70 text-sm tracking-wide rounded-sm"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-[#C6A96B]" />
            )}
          </motion.button>
        </div>

        {/* Desktop Filter panel */}
        <AnimatePresence>
          {isFiltersOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="hidden sm:block overflow-hidden"
            >
              <div className="pt-8">
                <FilterContent />

                {/* Filter actions */}
                {hasActiveFilters && (
                  <div className="flex justify-end mt-6 pt-6 border-t border-[#E5E5E5]">
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-2 text-[#6B6B6B] hover:text-[#111111] text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Clear All Filters
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Filter drawer */}
        <AnimatePresence>
          {isMobileFiltersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-50 sm:hidden"
                onClick={() => setIsMobileFiltersOpen(false)}
              />
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed bottom-0 left-0 right-0 bg-[#F5F5DC] z-50 rounded-t-2xl max-h-[85vh] overflow-y-auto sm:hidden"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-serif text-xl text-[#111111]">Filters</h3>
                    <button
                      onClick={() => setIsMobileFiltersOpen(false)}
                      className="p-2 text-[#6B6B6B] hover:text-[#111111]"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <FilterContent />

                  <div className="flex gap-3 mt-8 pt-6 border-t border-[#E5E5E5]">
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="flex-1 py-3 border border-[#E5E5E5] text-[#111111] text-sm tracking-wide rounded-sm"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setIsMobileFiltersOpen(false)}
                      className="flex-1 py-3 bg-[#111111] text-white text-sm tracking-wide rounded-sm"
                    >
                      Apply Filters
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </section>
  )
}
