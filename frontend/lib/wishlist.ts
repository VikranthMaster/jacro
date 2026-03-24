"use client"
import { create } from "zustand"

const BASE_URL = "http://localhost:8001"

function jsonAuthHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token")
    if (t) h.Authorization = `Bearer ${t}`
  }
  return h
}

export interface WishlistItem {
  id: string
  name: string
  price: number
  image: string
  category?: string
}

interface WishlistStore {
  items: WishlistItem[]
  loading: boolean
  fetchWishlist: (userId: string) => Promise<void>
  addItem: (userId: string, productId: string) => Promise<void>
  removeItem: (userId: string, productId: string) => Promise<void>
  isInWishlist: (id: string) => boolean
  toggleItem: (userId: string, product: WishlistItem) => Promise<void>
  clearWishlist: () => void
  getItemCount: () => number
}

export const useWishlist = create<WishlistStore>()((set, get) => ({
  items: [],
  loading: false,

  fetchWishlist: async (userId: string) => {
    try {
      set({ loading: true })
      const res = await fetch(`${BASE_URL}/wishlist`, {
        headers: jsonAuthHeaders(),
      })
      const data = await res.json()
      set({ items: Array.isArray(data) ? data : [] })
    } catch (err) {
      console.error("Failed to fetch wishlist:", err)
      set({ items: [] })
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (userId: string, productId: string) => {
    const res = await fetch(`${BASE_URL}/wishlist/add`, {
      method: "POST",
      headers: jsonAuthHeaders(),
      body: JSON.stringify({ product_id: productId }),
    })
    if (!res.ok) throw new Error(`Wishlist add failed (${res.status})`)
    await get().fetchWishlist(userId)
  },

  removeItem: async (userId: string, productId: string) => {
    await fetch(`${BASE_URL}/wishlist/item/${productId}`, {
      method: "DELETE",
      headers: jsonAuthHeaders(),
    })
    set((state) => ({
      items: state.items.filter((i) => i.id !== productId),
    }))
  },

  isInWishlist: (id: string) => get().items.some((item) => item.id === id),

  toggleItem: async (userId: string, product: WishlistItem) => {
    const inList = get().isInWishlist(product.id)
    if (inList) {
      await get().removeItem(userId, product.id)
    } else {
      await get().addItem(userId, product.id)
    }
  },

  clearWishlist: () => set({ items: [] }),

  getItemCount: () => get().items.length,
}))

