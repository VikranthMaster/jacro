"use client"

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface User {
  id: string
  name: string
  email: string
}

export type SignupResult =
  | { ok: true; needsEmailConfirmation: true; email: string }
  | { ok: true; needsEmailConfirmation: false }
  | { ok: false; message: string }

export type LoginResult =
  | { ok: true }
  | { ok: false; message: string; emailNotConfirmed?: boolean }

interface AuthStore {
  user: User | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<LoginResult>
  signup: (name: string, email: string, password: string) => Promise<SignupResult>
  logout: () => void
  updateProfile: (name: string, email: string) => void
  changePassword: (oldPassword: string, newPassword: string) => Promise<boolean>
}

const BASE_URL = "http://localhost:8001";


export const useAuth = create<AuthStore>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        try {
          const res = await fetch(`${BASE_URL}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email, password
            })
          })

          const data = await res.json().catch(() => ({}))

          if (res.ok && data.statusCode == 200) {
            const fallbackName = (data.user.email || "").split("@")[0] || "Account"
            set({
              user: {
                id: data.user.id,
                name: data.user.name || fallbackName,
                email: data.user.email,
              },
              isAuthenticated: true,
            })
            localStorage.setItem("user_id", data.user.id);
            localStorage.setItem("token", data.token);
            return { ok: true }
          }

          const emailNotConfirmed = data.code === "EMAIL_NOT_CONFIRMED"
          const hint =
            "Check your mail for verification — open the link we sent, then sign in here."
          return {
            ok: false,
            message: emailNotConfirmed
              ? hint
              : data.message || "Invalid email or password",
            emailNotConfirmed: emailNotConfirmed || undefined,
          }
        } catch (err) {
          console.error(err)
          return { ok: false, message: "An error occurred. Please try again." }
        }
      },

      signup: async (name: string, email: string, password: string) => {
        try {
          const res = await fetch(`${BASE_URL}/register`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              name, email, password
            })
          })
          const data = await res.json().catch(() => ({}))

          if (res.status === 409 || res.status === 400) {
            const msg = data.message || "Registration failed"
            const looksLikeDuplicate =
              /already registered|already exists|user exists/i.test(msg)
            return {
              ok: false,
              message: looksLikeDuplicate ? "Email already exists" : msg,
            }
          }

          if (data.statusCode == 200 && data.needsEmailConfirmation) {
            return {
              ok: true,
              needsEmailConfirmation: true,
              email: data.user?.email || email.trim(),
            }
          }

          if (data.statusCode == 200 && data.user) {
            // Sign in only from /login — register never returns a session token.
            return { ok: true, needsEmailConfirmation: false }
          }

          return { ok: false, message: data.message || "Registration failed" }
        } catch (err) {
          console.error(err)
          return { ok: false, message: "An error occurred. Please try again." }
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
        try {
          const token = localStorage.getItem("token")
          if (!token) return false

          const res = await fetch(`${BASE_URL}/auth/change-password`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              oldPassword,
              newPassword,
            }),
          })

          if (!res.ok) return false
          const data = await res.json()
          return data?.statusCode === 200
        } catch (err) {
          console.error(err)
          return false
        }
      },
    }),
    {
      name: 'jacro-auth',
    }
  )
)
