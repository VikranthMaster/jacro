import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SV_KEY

function decodeJwtRole(key) {
  try {
    const payload = key.split(".")[1]
    const json = Buffer.from(
      payload.replace(/-/g, "+").replace(/_/g, "/"),
      "base64"
    ).toString("utf8")
    return JSON.parse(json).role
  } catch {
    return null
  }
}

export function assertSupabaseServiceRole() {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error(
      "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SV_KEY) are required in backend/.env"
    )
  }
  const role = decodeJwtRole(SERVICE_KEY)
  if (role && role !== "service_role") {
    throw new Error(
      `Supabase key role is "${role}", not "service_role". ` +
        "With RLS enabled, payments need the service role key so the API can read/write orders and payments."
    )
  }
}

assertSupabaseServiceRole()

export const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Surface PostgREST / RLS failures instead of continuing checkout without a payment row. */
export function throwIfDbError(result, context) {
  if (result?.error) {
    const msg = result.error.message || String(result.error)
    console.error(`db_${context}:`, result.error)
    const err = new Error(`${context}: ${msg}`)
    err.db = result.error
    throw err
  }
  return result.data
}
