import { create } from 'zustand'

const BASE_URL = "http://localhost:8001"

function jsonAuthHeaders(): HeadersInit {
  const h: Record<string, string> = { "Content-Type": "application/json" }
  if (typeof window !== "undefined") {
    const t = localStorage.getItem("token")
    if (t) h.Authorization = `Bearer ${t}`
  }
  return h
}

export interface CartItem {
  id: string          // cart_item id (used for delete/update)
  product_id: string
  name: string
  price: number
  image: string
  quantity: number
  size?: string
  color?: string
}

interface CartStore {
  items: CartItem[]
  loading: boolean
  fetchCart: (userId: string) => Promise<void>
  addItem: (userId: string, item: { product_id: string; size?: string; color?: string; quantity?: number }) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  updateQuantity: (itemId: string, quantity: number) => Promise<void>
  clearCart: () => void
  getTotal: () => number
  getItemCount: () => number
}

export const useCart = create<CartStore>()((set, get) => ({
  items: [],
  loading: false,

  fetchCart: async (userId: string) => {
    try {
      set({ loading: true })
      const res = await fetch(`${BASE_URL}/cart`, { headers: jsonAuthHeaders() })
      if (!res.ok) throw new Error(`Cart fetch failed (${res.status})`)
      const data = await res.json()
      set({ items: Array.isArray(data) ? data : [] })
    } catch (err) {
      console.error("Failed to fetch cart:", err)
      set({ items: [] })
    } finally {
      set({ loading: false })
    }
  },

  addItem: async (userId, item) => {
    try {
      const res = await fetch(`${BASE_URL}/cart/add`, {
        method: "POST",
        headers: jsonAuthHeaders(),
        body: JSON.stringify({
          product_id: item.product_id,
          quantity: item.quantity ?? 1,
          size: item.size ?? null,
          color: item.color ?? null,
        }),
      })

      if (!res.ok) throw new Error(`Cart add failed (${res.status})`)
      // Refresh cart after adding
      await get().fetchCart(userId)
    } catch (err) {
      console.error("Failed to add to cart:", err)
      throw err
    }
  },

  removeItem: async (itemId: string) => {
    try {
      await fetch(`${BASE_URL}/cart/item/${itemId}`, {
        method: "DELETE",
        headers: jsonAuthHeaders(),
      })
      set((state) => ({
        items: state.items.filter((i) => i.id !== itemId),
      }))
    } catch (err) {
      console.error("Failed to remove item:", err)
    }
  },

  updateQuantity: async (itemId: string, quantity: number) => {
    if (quantity < 1) return
    try {
      await fetch(`${BASE_URL}/cart/item/${itemId}?quantity=${quantity}`, {
        method: "PUT",
        headers: jsonAuthHeaders(),
      })
      set((state) => ({
        items: state.items.map((i) =>
          i.id === itemId ? { ...i, quantity } : i
        ),
      }))
    } catch (err) {
      console.error("Failed to update quantity:", err)
    }
  },

  clearCart: () => set({ items: [] }),

  getTotal: () =>
    get().items.reduce((total, item) => total + item.price * item.quantity, 0),

  getItemCount: () =>
    get().items.reduce((count, item) => count + item.quantity, 0),
}))