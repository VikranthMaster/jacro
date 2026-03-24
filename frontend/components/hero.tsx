"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight } from "lucide-react"
import { HashLink } from "@/components/hash-link"

const dynamicWords = ["bold", "timeless", "modern"]

export function Hero() {
  const [currentWordIndex, setCurrentWordIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % dynamicWords.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#F5F5DC]">
      {/* Subtle radial gradient */}
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-radial from-[#C6A96B]/10 via-transparent to-transparent rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        {/* Main JACRO title - centered */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="font-serif text-6xl sm:text-7xl md:text-8xl lg:text-9xl tracking-wider text-[#111111] mb-8"
        >
          JACRO
        </motion.h1>

        {/* Tagline with animated word */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-[#6B6B6B] text-lg md:text-xl lg:text-2xl tracking-wide max-w-xl mx-auto mb-12"
        >
          <span>Wear the </span>
          <span className="relative inline-block w-[100px] sm:w-[120px] md:w-[140px] h-[1.3em] overflow-hidden align-bottom">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentWordIndex}
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -30, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
                className="absolute left-0 text-[#C6A96B] italic font-serif"
              >
                {dynamicWords[currentWordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.div>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <HashLink href="/#collection">
            <motion.button
              whileHover={{ scale: 1.02, boxShadow: "0 8px 30px rgba(0,0,0,0.12)" }}
              whileTap={{ scale: 0.98 }}
              className="group relative px-8 py-4 bg-[#111111] text-white text-sm tracking-[0.15em] uppercase font-medium rounded-sm overflow-hidden transition-all duration-300"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                Shop Now
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          </HashLink>

          <HashLink href="/#categories">
            <motion.button
              whileHover={{ scale: 1.02, backgroundColor: "#111111", color: "#FFFFFF" }}
              whileTap={{ scale: 0.98 }}
              className="group px-8 py-4 bg-transparent border border-[#111111]/30 text-[#111111] text-sm tracking-[0.15em] uppercase font-medium rounded-sm transition-all duration-300"
            >
              <span className="flex items-center justify-center gap-3">
                Explore Collection
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
            </motion.button>
          </HashLink>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1 }}
        className="absolute bottom-10 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-[1px] h-16 bg-gradient-to-b from-[#111111]/40 to-transparent"
        />
      </motion.div>
    </section>
  )
}
