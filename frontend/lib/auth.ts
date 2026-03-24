"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
}

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  signup: (name: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  updateProfile: (name: string, email: string) => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
}



export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const res = await fetch("http://localhost:8001/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email, password
            })
          })

          const data = await res.json()

          if (data.statusCode == 200) {
            set({
              user: {
                id: data.user.id,
                name: data.user.name || "User",
                email: data.user.email,
              },
              isAuthenticated: true,
            })
            localStorage.setItem("user_id", data.user.id);
            localStorage.setItem("token", data.token);
            return true
          }
          return false
        } catch (err) {
          console.error(err)
          return false
        }
      },

      signup: async (name: string, email: string, password: string) => {
        try {
          const res = await fetch("http://localhost:8001/register", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name, email, password
            })
          })
          const data = await res.json()
          if (data.statusCode == 200) {
            set({
              user: data.user,
              isAuthenticated: true,
            })
            return true
          }

          return false
        } catch (err) {
          console.error(err)
          return false
        }
      },

      logout: () => {
        localStorage.removeItem("user_id")
        localStorage.removeItem("token")
        localStorage.removeItem("jacro-auth")
        set({ user: null, isAuthenticated: false })
      },

      updateProfile: (name: string, email: string) => {
        const current = get().user
        if (!current) return
        set({
          user: { ...current, name, email },
        })
      },

      changePassword: async (oldPassword: string, newPassword: string) => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))
        // In a real app, validate old password and update
        return true
      },
    }),
    {
      name: 'jacro-auth',
    }
  )
)
