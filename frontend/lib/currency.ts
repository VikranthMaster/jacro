export const CHECKOUT_CURRENCY = "INR"

/** Set to true when you want shipping fees back on cart/checkout */
export const SHIPPING_CHARGES_ENABLED = false

/** Free shipping when subtotal exceeds this (INR) — used when SHIPPING_CHARGES_ENABLED */
export const FREE_SHIPPING_MIN = 5000

/** Flat shipping fee (INR) — used when SHIPPING_CHARGES_ENABLED */
export const SHIPPING_FEE = 199

export function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: CHECKOUT_CURRENCY,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function calcShipping(subtotal: number): number {
  if (!SHIPPING_CHARGES_ENABLED) return 0
  return subtotal > FREE_SHIPPING_MIN ? 0 : SHIPPING_FEE
}
