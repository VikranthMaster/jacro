"use client"

import { motion } from "framer-motion"
import { ProductCard, type Product } from "./product-card"

interface ProductGridProps {
  products: Product[]
  title?: string
  subtitle?: string
}

export function ProductGrid({ products, title, subtitle }: ProductGridProps) {
  return (
    <section id="collection" className="py-16 md:py-24 bg-[#F5F5DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        {(title || subtitle) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 md:mb-16"
          >
            {subtitle && (
              <p className="text-[#C6A96B] text-xs tracking-[0.3em] uppercase mb-3">
                {subtitle}
              </p>
            )}
            {title && (
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl text-[#111111] tracking-wide">
                {title}
              </h2>
            )}
          </motion.div>
        )}

        {/* Grid - 2 cols mobile, 3 cols tablet, 4 cols desktop */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 md:gap-8">
          {products.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>

        {/* View all button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-12 md:mt-16"
        >
          <motion.button
            whileHover={{ scale: 1.02, backgroundColor: "#111111", color: "#FFFFFF" }}
            whileTap={{ scale: 0.98 }}
            className="px-8 py-4 border border-[#111111]/30 text-[#111111] text-sm tracking-[0.15em] uppercase transition-all duration-300 rounded-sm"
          >
            View All Products
          </motion.button>
        </motion.div>
      </div>
    </section>
  )
}
