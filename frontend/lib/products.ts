import type { Product } from "@/components/product-card"

// colors: ["Charcoal", "Camel", "Navy"],
//   sizes: ["XS", "S", "M", "L", "XL"],

const BASE_URL = "http://localhost:8001"

// -----------------------------
// 🧠 TYPES
// -----------------------------

export interface ProductDetails {
  id: string
  name: string
  price: number
  description: string
  images: string[]
  colors: { name: string; value: string }[]
  sizes: string[]
  category: string
}

// -----------------------------
// 🔄 TRANSFORM FUNCTION
// -----------------------------

function transformProduct(p: any): Product {
  return {
    id: p.id,
    name: p.name,
    price: p.price,
    category: p.category,
    image: p.image || "", // backend already sends this
  }
}


export async function getAllProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE_URL}/products`)
    const data = await res.json()

    if (data.statusCode !== 200) return []

    return data.data.map(transformProduct)
  } catch (err) {
    console.error("Error fetching products:", err)
    return []
  }
}


export async function getFeaturedProducts(): Promise<Product[]> {
  const products = await getAllProducts()
  return products.slice(0, 5)
}



export async function getProductById(id: string): Promise<ProductDetails | null> {
  try {
    const res = await fetch(`${BASE_URL}/products/${id}`)
    const data = await res.json()

    if (data.statusCode !== 200) return null

    const p = data.data

    return {
      id: p.id,
      name: p.name,
      price: p.price,
      description: p.description,
      images: p.images || [],
      category: p.category,

      colors: [
        { name: "Charcoal", value: "#36454F" },
        { name: "Camel", value: "#C19A6B" },
        { name: "Navy", value: "#001F5B" },
      ],
      sizes: ["XS", "S", "M", "L", "XL"],
    }
  } catch (err) {
    console.error("Error fetching product:", err)
    return null
  }
}



export async function searchProducts(query: string): Promise<Product[]> {
  try {
    const res = await fetch(`${BASE_URL}/products/search?query=${query}`)
    const data = await res.json()

    if (data.statusCode !== 200) return []

    return data.data.map(transformProduct)
  } catch (err) {
    console.error("Search error:", err)
    return []
  }
}



export async function filterProducts(params: {
  category?: string
  min_price?: number
  max_price?: number
}): Promise<Product[]> {
  try {
    const query = new URLSearchParams()

    if (params.category) query.append("category", params.category)
    if (params.min_price) query.append("min_price", params.min_price.toString())
    if (params.max_price) query.append("max_price", params.max_price.toString())

    const res = await fetch(`${BASE_URL}/products/filter?${query.toString()}`)
    const data = await res.json()

    if (data.statusCode !== 200) return []

    return data.data.map(transformProduct)
  } catch (err) {
    console.error("Filter error:", err)
    return []
  }
}