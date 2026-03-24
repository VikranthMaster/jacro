import axios from "axios"

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"

/**
 * Verifies a Cloudflare Turnstile token.
 * @param {string | undefined | null} token
 * @returns {Promise<boolean>}
 */
export async function verifyCaptcha(token) {
  const secret = process.env.TURNSTILE_SECRET

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error("[captcha] TURNSTILE_SECRET missing in production")
      return false
    }
    return true
  }

  if (!token || typeof token !== "string" || !token.trim()) {
    return false
  }

  try {
    const body = new URLSearchParams()
    body.set("secret", secret)
    body.set("response", token.trim())

    const { data } = await axios.post(TURNSTILE_VERIFY_URL, body.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 10_000,
    })

    return data?.success === true
  } catch (err) {
    console.error("[captcha] Turnstile verify error:", err?.message || err)
    return false
  }
}
