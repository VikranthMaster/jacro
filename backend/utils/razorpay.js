import crypto from "crypto"
import axios from "axios"

function getCredentials() {
  return {
    keyId: process.env.RAZORPAY_KEY_ID?.trim() || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET?.trim() || "",
  }
}

export function isRazorpayConfigured() {
  const { keyId, keySecret } = getCredentials()
  return Boolean(keyId && keySecret)
}

export function getRazorpayKeyId() {
  return getCredentials().keyId || null
}

function getApi() {
  const { keyId, keySecret } = getCredentials()
  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured")
  }
  return axios.create({
    baseURL: "https://api.razorpay.com/v1",
    auth: { username: keyId, password: keySecret },
    headers: { "Content-Type": "application/json" },
    timeout: 20000,
  })
}

/** Amount in major units (e.g. INR rupees) → paise for Razorpay */
export function toRazorpayAmount(amountMajor, currency = "INR") {
  const n = Number(amountMajor)
  if (!Number.isFinite(n) || n <= 0) {
    throw new Error("Invalid payment amount")
  }
  const zeroDecimal = new Set(["JPY"])
  if (zeroDecimal.has(String(currency).toUpperCase())) {
    return Math.round(n)
  }
  return Math.round(n * 100)
}

/** Razorpay receipt: max 40 chars, alphanumeric only */
export function toRazorpayReceipt(orderId) {
  const compact = String(orderId).replace(/[^a-zA-Z0-9]/g, "").slice(0, 40)
  return compact || `ord${Date.now()}`.slice(0, 40)
}

export function formatRazorpayError(err) {
  const data = err?.response?.data?.error
  if (data?.description) {
    const code = data.code ? ` (${data.code})` : ""
    return `${data.description}${code}`
  }
  if (err?.code === "ECONNABORTED") return "Razorpay request timed out"
  if (err?.message) return err.message
  return "Unknown Razorpay error"
}

export async function createRazorpayOrder({
  amountMajor,
  currency,
  receipt,
  notes,
}) {
  const api = getApi()
  const amount = toRazorpayAmount(amountMajor, currency)
  const safeNotes = {}
  if (notes && typeof notes === "object") {
    for (const [k, v] of Object.entries(notes)) {
      if (v != null) safeNotes[k] = String(v).slice(0, 256)
    }
  }
  const { data: order } = await api.post("/orders", {
    amount,
    currency: String(currency).toUpperCase(),
    receipt: toRazorpayReceipt(receipt),
    notes: safeNotes,
  })
  return { order, amountPaise: amount }
}

export function verifyPaymentSignature({
  razorpay_order_id,
  razorpay_payment_id,
  razorpay_signature,
}) {
  const { keySecret } = getCredentials()
  if (!keySecret) return false
  const body = `${razorpay_order_id}|${razorpay_payment_id}`
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(body)
    .digest("hex")
  const a = Buffer.from(expected, "utf8")
  const b = Buffer.from(String(razorpay_signature || ""), "utf8")
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export async function fetchRazorpayPayment(paymentId) {
  const api = getApi()
  const { data } = await api.get(`/payments/${paymentId}`)
  return data
}

export async function fetchRazorpayOrderPayments(razorpayOrderId) {
  const api = getApi()
  const { data } = await api.get(`/orders/${razorpayOrderId}/payments`)
  return data?.items || []
}
