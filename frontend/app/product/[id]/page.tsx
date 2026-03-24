"use client"

import { useState, useEffect, use } from "react"
import { Navbar } from "@/components/navbar"
import { ProductDetail } from "@/components/product-detail"
import { Footer } from "@/components/footer"
import { getProductById } from "@/lib/products"
import type { ProductDetails } from "@/lib/products"
import { useCart } from "@/lib/cart"

interface ProductPageProps {
  params: Promise<{ id: string }>
}

export default function ProductPage({ params }: ProductPageProps) {
  const { id } = use(params)
  const [product, setProduct] = useState<ProductDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const { getItemCount } = useCart()

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const fetchProduct = async () => {
      setLoading(true)
      const data = await getProductById(id)
      setProduct(data)
      setLoading(false)
    }
    fetchProduct()
  }, [id])

  return (
    <main className="bg-[#F5F5DC]">
      <Navbar cartCount={mounted ? getItemCount() : 0} />

      {loading ? (
        <div className="min-h-screen flex items-center justify-center text-[#6B6B6B]">
          Loading...
        </div>
      ) : !product ? (
        <div className="min-h-screen flex items-center justify-center text-[#6B6B6B]">
          Product not found.
        </div>
      ) : (
        <ProductDetail product={product} />
      )}

      <Footer />
    </main>
  )
}