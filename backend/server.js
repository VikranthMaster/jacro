import "dotenv/config"
import cors from "cors"
import express from "express"
import multer from "multer"
import nodemailer from "nodemailer"
import { createClient } from "@supabase/supabase-js"
import { v4 as uuidv4 } from "uuid"
import { authenticateJWT, signAppJwt } from "./middleware/auth.js"
import {
  globalLimiter,
  loginLimiter,
  signupLimiter,
  createPaymentLimiter,
} from "./middleware/rateLimiter.js"
import { botBlocker } from "./middleware/botBlocker.js"
import { verifyCaptcha } from "./utils/captcha.js"
import { validatePasswordStrength } from "./utils/passwordPolicy.js"
import {
  createRazorpayOrder,
  fetchRazorpayOrderPayments,
  fetchRazorpayPayment,
  formatRazorpayError,
  getRazorpayKeyId,
  isRazorpayConfigured,
  toRazorpayAmount,
  verifyPaymentSignature,
} from "./utils/razorpay.js"
import dotenv from "dotenv";
dotenv.config();

const PORT = Number(process.env.PORT) || 8001
const CHECKOUT_CURRENCY = (
  process.env.CHECKOUT_CURRENCY || "INR"
).toUpperCase()
/** Set true to charge shipping again at checkout */
const SHIPPING_CHARGES_ENABLED = false
const FREE_SHIPPING_MIN = Number(process.env.FREE_SHIPPING_MIN) || 5000
const SHIPPING_FEE = Number(process.env.SHIPPING_FEE) || 199

const SUPABASE_URL = process.env.SUPABASE_URL;
  // process.env.SUPABASE_URL || "https://dnyuomscigxcyibonylq.supabase.co"
const SV_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SV_KEY;
  // "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueXVvbXNjaWd4Y3lpYm9ueWxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNzEzMiwiZXhwIjoyMDg5NjgzMTMyfQ.6oAx-3B8BSn1DueonjX49bd8ctdpIp5uvejrbYbGJ34"

const supabase = createClient(SUPABASE_URL, SV_KEY)

const app = express()

if (isRazorpayConfigured()) {
  const key = getRazorpayKeyId() || ""
  console.log(
    `Razorpay: configured (${key.startsWith("rzp_test_") ? "test" : key.startsWith("rzp_live_") ? "live" : "unknown"} mode)`
  )
} else {
  console.warn("Razorpay: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET missing in .env")
}

app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
  })
)
app.use(express.json())
app.set("trust proxy", 1)
app.use(botBlocker)
app.use(globalLimiter)

/**
 * Expects Turnstile token in JSON body: captcha_token | turnstile_token | cf_turnstile_response
 * @type {import("express").RequestHandler}
 */
async function requireCaptcha(req, res, next) {
  try {
    // Local/dev convenience: don't block auth flows on Turnstile.
    // In production, captcha must be validated.
    if (process.env.NODE_ENV !== "production") {
      return next()
    }

    const token =
      req.body?.captcha_token ??
      req.body?.turnstile_token ??
      req.body?.cf_turnstile_response
    const ok = await verifyCaptcha(token)
    if (!ok) {
      return res
        .status(400)
        .json({ message: "Captcha verification failed" })
    }
    next()
  } catch (e) {
    console.error("requireCaptcha:", e)
    return res.status(500).json({ message: "Captcha verification error" })
  }
}

const upload = multer({ storage: multer.memoryStorage() })

let mailTransporter = null
function getMailTransporter() {
  if (mailTransporter) return mailTransporter
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS?.replace(/\s+/g, "") || ""
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true"
  if (!host || !user || !pass) return null
  mailTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  })
  return mailTransporter
}

function escapeHtml(s) {
  if (s == null) return ""
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function formatAddressLines(addr) {
  if (!addr || typeof addr !== "object") return []
  const parts = [
    addr.recipient_name,
    addr.line1,
    addr.line2,
    [addr.city, addr.state, addr.postal_code].filter(Boolean).join(", "),
    addr.country,
    addr.phone ? `Phone: ${addr.phone}` : null,
  ].filter(Boolean)
  return parts
}

function getBrandLogoUrl() {
  const base =
    process.env.FRONTEND_URL ||
    process.env.PUBLIC_APP_URL ||
    "http://localhost:3000"
  return `${String(base).replace(/\/$/, "")}/icon.svg`
}

const PAID_ORDER_STATUS = "confirmed"

async function sendCustomerOrderPlacedEmail({
  to,
  orderId,
  totalAmount,
  currency,
  customerName,
}) {
  try {
    if (!to) return false
    const transporter = getMailTransporter()
    if (!transporter) {
      console.warn("Customer order email skipped: SMTP config missing")
      return false
    }
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    const cur = currency || CHECKOUT_CURRENCY
    const total = Number(totalAmount || 0).toLocaleString("en-IN")
    const logoUrl = getBrandLogoUrl()
    const greeting = customerName ? `Hi ${escapeHtml(customerName)},` : "Hi there,"

    await transporter.sendMail({
      from,
      to,
      subject: `Your JACRO order is confirmed — ${orderId.slice(0, 8)}`,
      text: `Thank you for your order with JACRO.

Order number: ${orderId}
Total: ${cur} ${total}

Your order is confirmed. Shipping usually arrives in 4–5 business days.

— JACRO`,
      html: `
        <div style="font-family: Georgia, 'Times New Roman', serif; background:#F5F5DC; padding:32px 16px;">
          <motion.div style="max-width:520px; margin:0 auto; background:#ffffff; border:1px solid #E5E5E5; border-radius:4px; overflow:hidden;">
            <div style="background:#111111; padding:28px 24px; text-align:center;">
              <img src="${logoUrl}" alt="JACRO" width="56" height="56" style="display:block; margin:0 auto 12px; border-radius:8px;" />
              <p style="margin:0; color:#F5F5DC; font-size:22px; letter-spacing:0.2em;">JACRO</p>
            </div>
            <div style="padding:28px 24px; color:#111111; line-height:1.6;">
              <p style="margin:0 0 16px; font-size:16px;">${greeting}</p>
              <p style="margin:0 0 20px; color:#6B6B6B;">Thank you for your order. We're getting it ready for you.</p>
              <p style="margin:0 0 8px; font-size:13px; color:#6B6B6B; text-transform:uppercase; letter-spacing:0.1em;">Order number</p>
              <p style="margin:0 0 20px; font-family:monospace; font-size:14px; word-break:break-all;">${escapeHtml(orderId)}</p>
              <p style="margin:0 0 24px; font-size:18px;"><strong>Total:</strong> ${escapeHtml(cur)} ${escapeHtml(total)}</p>
              <div style="background:#EFE8D8; border-radius:4px; padding:16px 18px; margin-bottom:24px;">
                <p style="margin:0; font-size:15px; color:#111111;">
                  <strong>Delivery:</strong> Your shipping should arrive in <strong>4–5 business days</strong>.
                </p>
              </div>
              <p style="margin:0; color:#6B6B6B; font-size:14px;">We'll send another update when your order ships.</p>
            </div>
            <div style="padding:16px 24px; border-top:1px solid #E5E5E5; text-align:center; color:#6B6B6B; font-size:12px;">
              © JACRO
            </div>
          </div>
        </div>
      `.replace(/<motion\.div/g, "<div"),
    })
    return true
  } catch (e) {
    console.error("send_customer_order_email:", e)
    return false
  }
}

/**
 * Notify store owner when a new order is placed (checkout).
 */
async function sendOwnerNewOrderEmail({
  orderId,
  customerName,
  customerEmail,
  userId,
  currency,
  subtotal,
  shippingAmount,
  taxAmount,
  totalAmount,
  orderStatus,
  paymentStatus,
  orderLines,
  shippingAddress,
  billingAddress,
  billingSameAsShipping,
}) {
  const to =
    process.env.ORDER_OWNER_EMAIL?.trim() || "vikrantht32@gmail.com"
  try {
    const transporter = getMailTransporter()
    if (!transporter) {
      console.warn("Owner order email skipped: SMTP config missing")
      return false
    }
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    const cur = currency || "USD"
    const who = [customerName, customerEmail && `(${customerEmail})`].filter(Boolean).join(" ")
    const linesText = (orderLines || [])
      .map(
        (l) =>
          `- ${l.product_name} × ${l.quantity} @ ${cur} ${Number(l.unit_price).toFixed(2)}` +
          (l.size ? ` | Size: ${l.size}` : "") +
          (l.color ? ` | Color: ${l.color}` : "")
      )
      .join("\n")

    const shipLines = formatAddressLines(shippingAddress)
    const billLines = billingSameAsShipping
      ? ["Same as shipping"]
      : formatAddressLines(billingAddress)

    const text = [
      `New JACRO order`,
      ``,
      `Customer: ${who || "Unknown"}`,
      customerEmail ? `Account email: ${customerEmail}` : null,
      userId ? `User ID: ${userId}` : null,
      ``,
      `Order ID: ${orderId}`,
      `Order status: ${orderStatus}`,
      `Payment status: ${paymentStatus}`,
      ``,
      `Items:`,
      linesText || "(none)",
      ``,
      `Subtotal: ${cur} ${Number(subtotal).toFixed(2)}`,
      `Shipping: ${cur} ${Number(shippingAmount).toFixed(2)}`,
      `Tax: ${cur} ${Number(taxAmount).toFixed(2)}`,
      `Total: ${cur} ${Number(totalAmount).toFixed(2)}`,
      ``,
      `Ship to:`,
      ...shipLines.map((x) => `  ${x}`),
      ``,
      `Bill to:`,
      ...billLines.map((x) => `  ${x}`),
    ]
      .filter((x) => x != null)
      .join("\n")

    const rowsHtml = (orderLines || [])
      .map(
        (l) => `<tr>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(l.product_name)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:center;">${escapeHtml(l.quantity)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(l.size)}</td>
          <td style="padding:8px;border:1px solid #ddd;">${escapeHtml(l.color)}</td>
          <td style="padding:8px;border:1px solid #ddd;text-align:right;">${cur} ${Number(l.unit_price).toFixed(2)}</td>
        </tr>`
      )
      .join("")

    const addrBlock = (title, lines) =>
      `<p style="margin:0 0 4px 0;font-weight:bold;">${escapeHtml(title)}</p>` +
      `<p style="margin:0;line-height:1.5;">${lines.map((ln) => escapeHtml(ln)).join("<br/>")}</p>`

    const html = `
      <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111;">
        <h2 style="margin-top:0;">New order — ${escapeHtml(who || "customer")}</h2>
        <p><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
        <p><strong>Account email:</strong> ${escapeHtml(customerEmail || "—")}</p>
        <p><strong>User ID:</strong> ${escapeHtml(userId || "—")}</p>
        <p><strong>Order status:</strong> ${escapeHtml(orderStatus)} &nbsp;|&nbsp;
           <strong>Payment:</strong> ${escapeHtml(paymentStatus)}</p>
        <table style="border-collapse:collapse;width:100%;max-width:640px;margin:16px 0;">
          <thead>
            <tr style="background:#f5f5f5;">
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Product</th>
              <th style="padding:8px;border:1px solid #ddd;">Qty</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Size</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:left;">Color</th>
              <th style="padding:8px;border:1px solid #ddd;text-align:right;">Unit</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
        <p><strong>Subtotal:</strong> ${cur} ${Number(subtotal).toFixed(2)}<br/>
           <strong>Shipping:</strong> ${cur} ${Number(shippingAmount).toFixed(2)}<br/>
           <strong>Tax:</strong> ${cur} ${Number(taxAmount).toFixed(2)}<br/>
           <strong>Total:</strong> ${cur} ${Number(totalAmount).toFixed(2)}</p>
        <div style="margin-top:20px;">
          ${addrBlock("Shipping address", shipLines)}
        </div>
        <div style="margin-top:16px;">
          ${addrBlock("Billing address", billLines)}
        </div>
      </div>
    `

    const subjLabel = String(
      customerName || customerEmail || "JACRO"
    ).slice(0, 80)
    await transporter.sendMail({
      from,
      to,
      subject: `New order ${orderId.slice(0, 8)}… — ${subjLabel}`,
      text,
      html,
    })
    return true
  } catch (e) {
    console.error("send_owner_order_email:", e)
    return false
  }
}

app.get("/", (_req, res) => {
  res.json({ message: "Alive!" })
})

app.get("/health", (req, res)=>{
  res.json({message: "Healthy!"})
})

app.post("/add_product", upload.array("files"), async (req, res) => {
  try {
    const { name, desc, price, category } = req.body
    const files = req.files || []
    if (!name || desc == null || price == null || !category || files.length === 0) {
      return res.status(400).json({ statusCode: 400, message: "Missing fields" })
    }

    const productId = uuidv4()
    const priceNum = parseFloat(String(price))

    await supabase
      .from("products")
      .insert({
        id: productId,
        name,
        description: desc,
        price: priceNum,
        category,
      })
      .throwOnError()

    for (const file of files) {
      const fileName = `${productId}/${file.originalname}`
      await supabase.storage.from("products").upload(fileName, file.buffer, {
        contentType: file.mimetype || "application/octet-stream",
        upsert: true,
      })

      const imageUrl = `${SUPABASE_URL}/storage/v1/object/public/products/${fileName}`

      await supabase
        .from("product_images")
        .insert({ product_id: productId, image_url: imageUrl })
        .throwOnError()
    }

    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("add_product:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.post("/login", loginLimiter, requireCaptcha, async (req, res) => {
  try {
    const { email, password } = req.body || {}
    const emailNorm = typeof email === "string" ? email.trim().toLowerCase() : ""
    if (!emailNorm || !password) {
      return res.status(400).json({ message: "email and password required" })
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailNorm,
      password,
    })

    if (error || !data.user) {
      const msg = error?.message || "Login failed"
      const emailNotConfirmed =
        /email not confirmed|confirm your email|not verified/i.test(msg)
      return res.status(401).json({
        message: msg,
        ...(emailNotConfirmed ? { code: "EMAIL_NOT_CONFIRMED" } : {}),
      })
    }

    if (!data.user.email_confirmed_at) {
      return res.status(401).json({
        message: "Email not confirmed",
        code: "EMAIL_NOT_CONFIRMED",
      })
    }

    const appJwt = signAppJwt(data.user.id)

    const meta = data.user.user_metadata || {}
    const fallbackName = emailNorm.split("@")[0] || "User"
    return res.json({
      statusCode: 200,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: meta.full_name || meta.name || fallbackName,
      },
      token: appJwt,
    })
  } catch (e) {
    console.error("login:", e)
    return res.status(500).json({ message: String(e) })
  }
})

async function registerUser(req, res) {
  try {
    const { name, email, password } = req.body || {}
    const nameNorm = typeof name === "string" ? name.trim() : ""
    const emailNorm = typeof email === "string" ? email.trim().toLowerCase() : ""
    if (!nameNorm || !emailNorm || !password) {
      return res.status(400).json({ message: "name, email, password required" })
    }

    const pwErr = validatePasswordStrength(password)
    if (pwErr) {
      return res.status(400).json({ message: pwErr })
    }

    const { data, error } = await supabase.auth.signUp({
      email: emailNorm,
      password,
      options: {
        data: {
          full_name: nameNorm,
          name: nameNorm,
        },
      },
    })

    if (error || !data.user) {
      const msg = error?.message || "Register failed"
      const isAlreadyRegistered =
        /already registered|already exists|user exists/i.test(msg)
      return res
        .status(isAlreadyRegistered ? 409 : 400)
        .json({ message: msg })
    }


    if (!data.user.email_confirmed_at) {
      return res.json({
        statusCode: 200,
        needsEmailConfirmation: true,
        message:
          "Check your mail for verification, then sign in. Your account is not active until you confirm.",
        user: {
          id: data.user.id,
          email: data.user.email,
          name: nameNorm,
        },
      })
    }

    return res.json({
      statusCode: 200,
      needsEmailConfirmation: false,
      user: {
        id: data.user.id,
        email: data.user.email,
        name: nameNorm,
      },
    })
  } catch (e) {
    console.error("register:", e)
    return res.status(500).json({ message: String(e) })
  }
}

app.post("/register", signupLimiter, requireCaptcha, registerUser)
app.post("/signup", signupLimiter, requireCaptcha, registerUser)

app.post("/auth/change-password", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const { oldPassword, newPassword } = req.body || {}

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "oldPassword and newPassword required" })
    }

    const newPwErr = validatePasswordStrength(newPassword)
    if (newPwErr) {
      return res.status(400).json({ statusCode: 400, message: newPwErr })
    }

    const { data: userData, error: userErr } = await supabase.auth.admin.getUserById(
      userId
    )
    if (userErr || !userData?.user?.email) {
      return res
        .status(404)
        .json({ statusCode: 404, message: "User not found" })
    }

    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email: userData.user.email,
      password: oldPassword,
    })

    if (verifyErr) {
      return res
        .status(401)
        .json({ statusCode: 401, message: "Current password is incorrect" })
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(userId, {
      password: String(newPassword),
    })

    if (updateErr) {
      return res.status(400).json({ statusCode: 400, message: updateErr.message })
    }

    return res.json({ statusCode: 200, message: "Password updated successfully" })
  } catch (e) {
    console.error("change_password:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.get("/products", async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category, product_images(image_url)")

    if (error) throw error

    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      image:
        p.product_images?.length > 0 ? p.product_images[0].image_url : null,
    }))

    return res.json({ statusCode: 200, data: products })
  } catch (e) {
    console.error("get_products:", e)
    return res.json({ statusCode: 500 })
  }
})

/** Must be registered before `/products/:productId` */
app.get("/products/filter", async (req, res) => {
  try {
    const { category, min_price, max_price } = req.query

    let q = supabase
      .from("products")
      .select("id, name, price, category, product_images(image_url)")

    if (category) q = q.eq("category", category)
    if (min_price != null && min_price !== "")
      q = q.gte("price", parseFloat(String(min_price)))
    if (max_price != null && max_price !== "")
      q = q.lte("price", parseFloat(String(max_price)))

    const { data, error } = await q
    if (error) throw error

    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      image:
        p.product_images?.length > 0 ? p.product_images[0].image_url : null,
    }))

    return res.json({ statusCode: 200, data: products })
  } catch (e) {
    console.error("filter_products:", e)
    return res.json({ statusCode: 500 })
  }
})

app.get("/products/search", async (req, res) => {
  try {
    const query = req.query.query
    if (query == null || query === "") {
      return res.json({ statusCode: 200, data: [] })
    }

    const { data, error } = await supabase
      .from("products")
      .select("id, name, price, category, product_images(image_url)")
      .ilike("name", `%${query}%`)

    if (error) throw error

    const products = (data || []).map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      category: p.category,
      image:
        p.product_images?.length > 0 ? p.product_images[0].image_url : null,
    }))

    return res.json({ statusCode: 200, data: products })
  } catch (e) {
    console.error("search_products:", e)
    return res.json({ statusCode: 500 })
  }
})

app.get("/products/:productId", async (req, res) => {
  try {
    const { productId } = req.params

    const { data: p, error } = await supabase
      .from("products")
      .select("*, product_images(image_url)")
      .eq("id", productId)
      .maybeSingle()

    if (error) throw error
    if (!p) {
      return res.json({ statusCode: 500 })
    }

    return res.json({
      statusCode: 200,
      data: {
        id: p.id,
        name: p.name,
        price: p.price,
        description: p.description,
        category: p.category,
        images: (p.product_images || []).map((img) => img.image_url),
      },
    })
  } catch (e) {
    console.error("get_product:", e)
    return res.json({ statusCode: 500 })
  }
})

app.get("/cart", authenticateJWT, async (req, res) => {
  const userId = req.user.user_id

  try {
    const { data: cartRows, error: cartErr } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)

    if (cartErr) throw cartErr
    if (!cartRows?.length) return res.json([])

    const cartId = cartRows[0].id

    const { data: items, error: itemsErr } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, size, color")
      .eq("cart_id", cartId)

    if (itemsErr) throw itemsErr
    if (!items?.length) return res.json([])

    const productIds = [...new Set(items.map((it) => it.product_id))]

    const { data: products, error: prodErr } = await supabase
      .from("products")
      .select("id, name, price")
      .in("id", productIds)

    if (prodErr) throw prodErr
    const productById = Object.fromEntries((products || []).map((p) => [p.id, p]))

    const { data: images, error: imgErr } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)

    if (imgErr) throw imgErr

    const imageByProductId = {}
    for (const row of images || []) {
      const pid = row.product_id
      if (imageByProductId[pid] == null) {
        imageByProductId[pid] = row.image_url
      }
    }

    const result = []
    for (const it of items) {
      const pid = it.product_id
      const p = productById[pid]
      if (!p) continue
      result.push({
        id: it.id,
        product_id: pid,
        name: p.name,
        price: Number(p.price),
        image: imageByProductId[pid],
        quantity: it.quantity,
        size: it.size,
        color: it.color,
      })
    }

    return res.json(result)
  } catch (e) {
    console.error("get_cart:", e)
    return res.json([])
  }
})

app.post("/cart/add", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const item = req.body || {}

    const { product_id, quantity = 1, size = null, color = null } = item

    let { data: cartRows } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", userId)

    let cartId
    if (cartRows?.length) {
      cartId = cartRows[0].id
    } else {
      cartId = uuidv4()
      await supabase.from("carts").insert({ id: cartId, user_id: userId })
    }

    let existingQ = supabase
      .from("cart_items")
      .select("*")
      .eq("cart_id", cartId)
      .eq("product_id", product_id)

    if (size == null) existingQ = existingQ.is("size", null)
    else existingQ = existingQ.eq("size", size)

    if (color == null) existingQ = existingQ.is("color", null)
    else existingQ = existingQ.eq("color", color)

    const { data: existingRows } = await existingQ

    if (existingRows?.length) {
      const row = existingRows[0]
      await supabase
        .from("cart_items")
        .update({ quantity: row.quantity + quantity })
        .eq("id", row.id)
    } else {
      await supabase.from("cart_items").insert({
        id: uuidv4(),
        cart_id: cartId,
        product_id,
        quantity,
        size,
        color,
      })
    }

    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("add_to_cart:", e)
    return res.status(500).json({ statusCode: 500 })
  }
})

app.delete("/cart/item/:itemId", authenticateJWT, async (req, res) => {
  try {
    const { data: row } = await supabase
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", req.params.itemId)
      .maybeSingle()

    if (!row) {
      return res.status(404).json({ statusCode: 404, message: "Not found" })
    }

    const { data: cart } = await supabase
      .from("carts")
      .select("user_id")
      .eq("id", row.cart_id)
      .maybeSingle()

    if (!cart || cart.user_id !== req.user.user_id) {
      return res.status(403).json({ statusCode: 403, message: "Forbidden" })
    }

    await supabase.from("cart_items").delete().eq("id", req.params.itemId)
    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("remove_cart_item:", e)
    return res.status(500).json({ statusCode: 500 })
  }
})

app.put("/cart/item/:itemId", authenticateJWT, async (req, res) => {
  try {
    const quantity = parseInt(req.query.quantity, 10)
    if (Number.isNaN(quantity)) {
      return res.status(400).json({ statusCode: 400 })
    }

    const { data: row } = await supabase
      .from("cart_items")
      .select("id, cart_id")
      .eq("id", req.params.itemId)
      .maybeSingle()

    if (!row) {
      return res.status(404).json({ statusCode: 404, message: "Not found" })
    }

    const { data: cart } = await supabase
      .from("carts")
      .select("user_id")
      .eq("id", row.cart_id)
      .maybeSingle()

    if (!cart || cart.user_id !== req.user.user_id) {
      return res.status(403).json({ statusCode: 403, message: "Forbidden" })
    }

    await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", req.params.itemId)
    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("update_cart_quantity:", e)
    return res.status(500).json({ statusCode: 500 })
  }
})

app.get("/wishlist", authenticateJWT, async (req, res) => {
  const userId = req.user.user_id

  try {
    const { data: wishRows } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)

    if (!wishRows?.length) return res.json([])

    const wishlistId = wishRows[0].id

    const { data: itemRows } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("wishlist_id", wishlistId)

    const productIds = (itemRows || []).map((r) => r.product_id)
    if (!productIds.length) return res.json([])

    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, category")
      .in("id", productIds)

    const productById = Object.fromEntries((products || []).map((p) => [p.id, p]))

    const { data: images } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)

    const imageByProductId = {}
    for (const row of images || []) {
      const pid = row.product_id
      if (imageByProductId[pid] == null) {
        imageByProductId[pid] = row.image_url
      }
    }

    const result = []
    for (const pid of productIds) {
      const p = productById[pid]
      if (!p) continue
      result.push({
        id: pid,
        name: p.name,
        price: Number(p.price),
        image: imageByProductId[pid],
        category: p.category,
      })
    }

    return res.json(result)
  } catch (e) {
    console.error("get_wishlist:", e)
    return res.json([])
  }
})

app.post("/wishlist/add", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const { product_id } = req.body || {}
    if (!product_id) {
      return res.status(400).json({ statusCode: 400 })
    }

    let { data: wishRows } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)

    let wishlistId
    if (wishRows?.length) {
      wishlistId = wishRows[0].id
    } else {
      wishlistId = uuidv4()
      await supabase.from("wishlists").insert({ id: wishlistId, user_id: userId })
    }

    const { data: existing } = await supabase
      .from("wishlist_items")
      .select("product_id")
      .eq("wishlist_id", wishlistId)
      .eq("product_id", product_id)

    if (existing?.length) {
      return res.json({ statusCode: 200 })
    }

    await supabase
      .from("wishlist_items")
      .insert({ wishlist_id: wishlistId, product_id })

    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("add_to_wishlist:", e)
    return res.json({ statusCode: 500 })
  }
})

app.delete("/wishlist/item/:productId", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const { productId } = req.params

    const { data: wishRows } = await supabase
      .from("wishlists")
      .select("id")
      .eq("user_id", userId)

    if (!wishRows?.length) {
      return res.json({ statusCode: 200 })
    }

    const wishlistId = wishRows[0].id

    await supabase
      .from("wishlist_items")
      .delete()
      .eq("wishlist_id", wishlistId)
      .eq("product_id", productId)

    return res.json({ statusCode: 200 })
  } catch (e) {
    console.error("remove_wishlist_item:", e)
    return res.json({ statusCode: 500 })
  }
})

async function placeCheckout(req, res) {
  try {
    const user_id = req.user.user_id
    const { shipping_address, billing_address } = req.body || {}

    if (!shipping_address) {
      return res.status(400).json({
        statusCode: 400,
        message: "shipping_address required",
      })
    }

    const { data: cartRows } = await supabase
      .from("carts")
      .select("id")
      .eq("user_id", user_id)

    if (!cartRows?.length) {
      return res.json({ statusCode: 400, message: "Cart not found" })
    }

    const cartId = cartRows[0].id

    const { data: cartItems } = await supabase
      .from("cart_items")
      .select("id, product_id, quantity, size, color")
      .eq("cart_id", cartId)

    if (!cartItems?.length) {
      return res.json({ statusCode: 400, message: "Cart is empty" })
    }

    const productIds = [...new Set(cartItems.map((it) => it.product_id))]

    const { data: products } = await supabase
      .from("products")
      .select("id, name, price")
      .in("id", productIds)

    const productById = Object.fromEntries((products || []).map((p) => [p.id, p]))

    let subtotal = 0
    const orderLines = []

    for (const it of cartItems) {
      const pid = it.product_id
      const p = productById[pid]
      if (!p) continue
      const unitPrice = Number(p.price)
      const qty = Number(it.quantity)
      subtotal += unitPrice * qty
      orderLines.push({
        product_id: pid,
        product_name: p.name,
        unit_price: unitPrice,
        quantity: qty,
        size: it.size,
        color: it.color,
      })
    }

    if (!orderLines.length) {
      return res.json({ statusCode: 400, message: "No valid cart items" })
    }

    const shippingAmount = SHIPPING_CHARGES_ENABLED
      ? subtotal > FREE_SHIPPING_MIN
        ? 0
        : SHIPPING_FEE
      : 0
    const taxAmount = 0
    const totalAmount = subtotal + shippingAmount + taxAmount

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        statusCode: 503,
        message: "Payment service is not configured",
      })
    }

    const orderId = uuidv4()

    await supabase.from("orders").insert({
      id: orderId,
      user_id,
      cart_id: cartId,
      order_status: "pending_payment",
      payment_status: "unpaid",
      currency: CHECKOUT_CURRENCY,
      subtotal,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })

    for (const line of orderLines) {
      await supabase.from("order_items").insert({
        id: uuidv4(),
        order_id: orderId,
        product_id: line.product_id,
        product_name: line.product_name,
        unit_price: line.unit_price,
        quantity: line.quantity,
        size: line.size,
        color: line.color,
      })
    }

    const billing = billing_address || shipping_address

    await supabase.from("order_addresses").insert({
      id: uuidv4(),
      order_id: orderId,
      address_type: "shipping",
      recipient_name: shipping_address.recipient_name,
      phone: shipping_address.phone,
      line1: shipping_address.line1,
      line2: shipping_address.line2,
      city: shipping_address.city,
      state: shipping_address.state,
      postal_code: shipping_address.postal_code,
      country: shipping_address.country,
    })

    await supabase.from("order_addresses").insert({
      id: uuidv4(),
      order_id: orderId,
      address_type: "billing",
      recipient_name: billing.recipient_name,
      phone: billing.phone,
      line1: billing.line1,
      line2: billing.line2,
      city: billing.city,
      state: billing.state,
      postal_code: billing.postal_code,
      country: billing.country,
    })

    let userEmail = null
    let userName = null
    try {
      const { data: userRow } = await supabase.auth.admin.getUserById(user_id)
      userEmail = userRow?.user?.email || null
      userName =
        userRow?.user?.user_metadata?.full_name ||
        userRow?.user?.user_metadata?.name ||
        null
    } catch (emailLookupErr) {
      console.error("checkout_user_email_lookup:", emailLookupErr)
    }

    let razorpayOrder
    try {
      const created = await createRazorpayOrder({
        amountMajor: totalAmount,
        currency: CHECKOUT_CURRENCY,
        receipt: orderId,
        notes: { order_id: orderId, user_id },
      })
      razorpayOrder = created.order
    } catch (rzErr) {
      const rzMessage = formatRazorpayError(rzErr)
      const status = rzErr?.response?.status
      console.error("razorpay_create_order:", status, rzMessage, rzErr?.response?.data)
      await supabase.from("order_items").delete().eq("order_id", orderId)
      await supabase.from("order_addresses").delete().eq("order_id", orderId)
      await supabase.from("orders").delete().eq("id", orderId)

      const isAuthError =
        status === 401 ||
        /authentication failed/i.test(rzMessage)
      return res.status(502).json({
        statusCode: 502,
        message: isAuthError
          ? "Payment gateway credentials are invalid. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env from the Razorpay Dashboard (Settings → API Keys), then restart the server."
          : `Could not start payment: ${rzMessage}`,
      })
    }

    const paymentId = uuidv4()

    await supabase.from("payments").insert({
      id: paymentId,
      order_id: orderId,
      provider: "razorpay",
      provider_payment_intent_id: razorpayOrder.id,
      status: "requires_payment_method",
      amount: totalAmount,
      currency: CHECKOUT_CURRENCY,
    })

    await supabase.from("transactions").insert({
      id: uuidv4(),
      payment_id: paymentId,
      transaction_type: "payment_attempt",
      status: "created",
      amount: totalAmount,
      currency: CHECKOUT_CURRENCY,
      raw: { razorpay_order_id: razorpayOrder.id },
    })

    return res.json({
      statusCode: 200,
      order_id: orderId,
      payment_id: paymentId,
      currency: CHECKOUT_CURRENCY,
      amount: totalAmount,
      razorpay: {
        key_id: getRazorpayKeyId(),
        order_id: razorpayOrder.id,
        amount: toRazorpayAmount(totalAmount, CHECKOUT_CURRENCY),
        currency: CHECKOUT_CURRENCY,
        name: "JACRO",
        description: `Order ${orderId.slice(0, 8)}`,
        prefill: {
          name: shipping_address.recipient_name || userName || undefined,
          email: userEmail || undefined,
          contact: shipping_address.phone || undefined,
        },
      },
    })
  } catch (e) {
    console.error("place_checkout:", e)
    return res.json({ statusCode: 500, message: String(e) })
  }
}

app.post("/checkout/place", authenticateJWT, placeCheckout)
app.post(
  "/create-payment",
  createPaymentLimiter,
  authenticateJWT,
  requireCaptcha,
  placeCheckout
)

app.get("/payments/razorpay/config", (_req, res) => {
  if (!isRazorpayConfigured()) {
    return res.status(503).json({
      statusCode: 503,
      message: "Payment service is not configured",
    })
  }
  return res.json({
    statusCode: 200,
    key_id: getRazorpayKeyId(),
    currency: CHECKOUT_CURRENCY,
  })
})

async function loadOrderContext(orderId) {
  const { data: orderItems } = await supabase
    .from("order_items")
    .select("product_name, unit_price, quantity, size, color")
    .eq("order_id", orderId)

  const { data: addrRows } = await supabase
    .from("order_addresses")
    .select("*")
    .eq("order_id", orderId)

  const shippingAddress = (addrRows || []).find(
    (a) => a.address_type === "shipping"
  )
  const billingAddress = (addrRows || []).find(
    (a) => a.address_type === "billing"
  )

  return { orderItems: orderItems || [], shippingAddress, billingAddress }
}

async function finalizePaidOrder({
  orderRow,
  paymentRow,
  razorpay_order_id,
  razorpay_payment_id,
  rzPayment,
  sendEmails = true,
}) {
  const order_id = orderRow.id
  const user_id = orderRow.user_id
  const currency = orderRow.currency || CHECKOUT_CURRENCY

  await supabase
    .from("orders")
    .update({
      payment_status: "paid",
      order_status: PAID_ORDER_STATUS,
    })
    .eq("id", order_id)

  await supabase
    .from("payments")
    .update({
      status: "succeeded",
      provider_payment_intent_id: razorpay_order_id,
    })
    .eq("id", paymentRow.id)

  const { data: existingTx } = await supabase
    .from("transactions")
    .select("id")
    .eq("payment_id", paymentRow.id)
    .eq("transaction_type", "payment_capture")
    .eq("provider_event_id", razorpay_payment_id)
    .maybeSingle()

  if (!existingTx) {
    await supabase.from("transactions").insert({
      id: uuidv4(),
      payment_id: paymentRow.id,
      transaction_type: "payment_capture",
      status: "succeeded",
      provider_event_id: razorpay_payment_id,
      amount: orderRow.total_amount,
      currency,
      raw: rzPayment,
    })
  }

  if (orderRow.cart_id) {
    await supabase.from("cart_items").delete().eq("cart_id", orderRow.cart_id)
  }

  if (!sendEmails) {
    return { order_id, payment_status: "paid", order_status: PAID_ORDER_STATUS }
  }

  const { orderItems, shippingAddress, billingAddress } =
    await loadOrderContext(order_id)

  let userEmail = null
  try {
    const { data: userRow } = await supabase.auth.admin.getUserById(user_id)
    userEmail = userRow?.user?.email || null
  } catch (emailLookupErr) {
    console.error("finalize_user_email_lookup:", emailLookupErr)
  }

  await sendCustomerOrderPlacedEmail({
    to: userEmail,
    orderId: order_id,
    totalAmount: orderRow.total_amount,
    currency,
    customerName: shippingAddress?.recipient_name,
  })

  void sendOwnerNewOrderEmail({
    orderId: order_id,
    customerName: shippingAddress?.recipient_name,
    customerEmail: userEmail,
    userId: user_id,
    currency,
    subtotal: orderRow.subtotal,
    shippingAmount: orderRow.shipping_amount,
    taxAmount: orderRow.tax_amount,
    totalAmount: orderRow.total_amount,
    orderStatus: PAID_ORDER_STATUS,
    paymentStatus: "paid",
    orderLines: orderItems.map((it) => ({
      product_name: it.product_name,
      unit_price: it.unit_price,
      quantity: it.quantity,
      size: it.size,
      color: it.color,
    })),
    shippingAddress,
    billingAddress,
    billingSameAsShipping:
      JSON.stringify(shippingAddress) === JSON.stringify(billingAddress),
  })

  return { order_id, payment_status: "paid", order_status: PAID_ORDER_STATUS }
}

async function getOrderForPayment(userId, orderId) {
  const { data: orderRow, error: orderErr } = await supabase
    .from("orders")
    .select(
      "id, user_id, cart_id, payment_status, order_status, total_amount, currency, subtotal, shipping_amount, tax_amount"
    )
    .eq("id", orderId)
    .maybeSingle()

  if (orderErr) throw orderErr
  if (!orderRow || orderRow.user_id !== userId) {
    return { error: { status: 404, message: "Order not found" } }
  }
  return { orderRow }
}

async function getRazorpayPaymentRow(orderId) {
  const { data: paymentRow, error: payErr } = await supabase
    .from("payments")
    .select("id, provider_payment_intent_id, status")
    .eq("order_id", orderId)
    .eq("provider", "razorpay")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()
  if (payErr) throw payErr
  return paymentRow
}

async function verifyRazorpayPayment(req, res) {
  try {
    const user_id = req.user.user_id
    const {
      order_id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    } = req.body || {}

    if (
      !order_id ||
      !razorpay_order_id ||
      !razorpay_payment_id ||
      !razorpay_signature
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Missing payment verification fields",
      })
    }

    if (!verifyPaymentSignature({
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    })) {
      return res.status(400).json({
        statusCode: 400,
        message: "Invalid payment signature",
      })
    }

    const { orderRow, error: orderLookupErr } = await getOrderForPayment(
      user_id,
      order_id
    )
    if (orderLookupErr) {
      return res.status(orderLookupErr.status).json({
        statusCode: orderLookupErr.status,
        message: orderLookupErr.message,
      })
    }

    if (orderRow.payment_status === "paid") {
      return res.json({
        statusCode: 200,
        order_id,
        payment_status: "paid",
        order_status: orderRow.order_status || PAID_ORDER_STATUS,
        already_paid: true,
      })
    }

    const paymentRow = await getRazorpayPaymentRow(order_id)
    if (
      !paymentRow ||
      paymentRow.provider_payment_intent_id !== razorpay_order_id
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Payment does not match this order",
      })
    }

    let rzPayment
    try {
      rzPayment = await fetchRazorpayPayment(razorpay_payment_id)
    } catch (fetchErr) {
      console.error("razorpay_fetch_payment:", fetchErr)
      return res.status(502).json({
        statusCode: 502,
        message: "Could not verify payment with Razorpay",
      })
    }

    if (
      rzPayment.order_id !== razorpay_order_id ||
      !["captured", "authorized"].includes(rzPayment.status)
    ) {
      return res.status(400).json({
        statusCode: 400,
        message: "Payment was not successful",
      })
    }

    const result = await finalizePaidOrder({
      orderRow,
      paymentRow,
      razorpay_order_id,
      razorpay_payment_id,
      rzPayment,
    })

    return res.json({ statusCode: 200, ...result })
  } catch (e) {
    console.error("verify_razorpay_payment:", e)
    const message =
      e && typeof e === "object" && "message" in e && e.message
        ? String(e.message)
        : "Payment verification failed"
    return res.status(500).json({ statusCode: 500, message })
  }
}

/** Reconcile unpaid order against Razorpay (paid in app but DB not updated) */
async function reconcileRazorpayPayment(req, res) {
  try {
    const user_id = req.user.user_id
    const order_id = req.body?.order_id || req.params?.orderId

    if (!order_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "order_id required",
      })
    }

    const { orderRow, error: orderLookupErr } = await getOrderForPayment(
      user_id,
      order_id
    )
    if (orderLookupErr) {
      return res.status(orderLookupErr.status).json({
        statusCode: orderLookupErr.status,
        message: orderLookupErr.message,
      })
    }

    if (orderRow.payment_status === "paid") {
      return res.json({
        statusCode: 200,
        order_id,
        payment_status: "paid",
        order_status: orderRow.order_status || PAID_ORDER_STATUS,
        already_paid: true,
      })
    }

    const paymentRow = await getRazorpayPaymentRow(order_id)
    if (!paymentRow?.provider_payment_intent_id) {
      return res.status(400).json({
        statusCode: 400,
        message: "No Razorpay payment session found for this order",
      })
    }

    const rzOrderId = paymentRow.provider_payment_intent_id
    let paymentsList
    try {
      paymentsList = await fetchRazorpayOrderPayments(rzOrderId)
    } catch (fetchErr) {
      console.error("razorpay_fetch_order_payments:", fetchErr)
      return res.status(502).json({
        statusCode: 502,
        message: "Could not fetch payments from Razorpay",
      })
    }

    const captured = (paymentsList || []).find((p) =>
      ["captured", "authorized"].includes(p.status)
    )

    if (!captured) {
      return res.status(400).json({
        statusCode: 400,
        message:
          "No successful payment found on Razorpay for this order. Complete payment or try Pay again.",
      })
    }

    const result = await finalizePaidOrder({
      orderRow,
      paymentRow,
      razorpay_order_id: rzOrderId,
      razorpay_payment_id: captured.id,
      rzPayment: captured,
    })

    return res.json({
      statusCode: 200,
      ...result,
      reconciled: true,
    })
  } catch (e) {
    console.error("reconcile_razorpay_payment:", e)
    const message =
      e && typeof e === "object" && "message" in e && e.message
        ? String(e.message)
        : "Could not reconcile payment"
    return res.status(500).json({ statusCode: 500, message })
  }
}

/** New Razorpay session for an unpaid order */
async function resumeOrderPayment(req, res) {
  try {
    const user_id = req.user.user_id
    const { orderId } = req.params

    const { orderRow, error: orderLookupErr } = await getOrderForPayment(
      user_id,
      orderId
    )
    if (orderLookupErr) {
      return res.status(orderLookupErr.status).json({
        statusCode: orderLookupErr.status,
        message: orderLookupErr.message,
      })
    }

    if (orderRow.payment_status === "paid") {
      return res.status(400).json({
        statusCode: 400,
        message: "Order is already paid",
      })
    }

    if (!isRazorpayConfigured()) {
      return res.status(503).json({
        statusCode: 503,
        message: "Payment service is not configured",
      })
    }

    const totalAmount = orderRow.total_amount
    const currency = orderRow.currency || CHECKOUT_CURRENCY

    let razorpayOrder
    try {
      const created = await createRazorpayOrder({
        amountMajor: totalAmount,
        currency,
        receipt: orderId,
        notes: { order_id: orderId, user_id, retry: "true" },
      })
      razorpayOrder = created.order
    } catch (rzErr) {
      const rzMessage = formatRazorpayError(rzErr)
      console.error("razorpay_resume_order:", rzErr)
      return res.status(502).json({
        statusCode: 502,
        message: `Could not start payment: ${rzMessage}`,
      })
    }

    const paymentRow = await getRazorpayPaymentRow(orderId)
    if (paymentRow) {
      await supabase
        .from("payments")
        .update({
          provider_payment_intent_id: razorpayOrder.id,
          status: "requires_payment_method",
        })
        .eq("id", paymentRow.id)
    }

    let userEmail = null
    let userName = null
    const { shippingAddress } = await loadOrderContext(orderId)
    try {
      const { data: userRow } = await supabase.auth.admin.getUserById(user_id)
      userEmail = userRow?.user?.email || null
      userName =
        userRow?.user?.user_metadata?.full_name ||
        userRow?.user?.user_metadata?.name ||
        null
    } catch (_) {}

    return res.json({
      statusCode: 200,
      order_id: orderId,
      currency,
      amount: totalAmount,
      razorpay: {
        key_id: getRazorpayKeyId(),
        order_id: razorpayOrder.id,
        amount: toRazorpayAmount(totalAmount, currency),
        currency,
        name: "JACRO",
        description: `Order ${orderId.slice(0, 8)}`,
        prefill: {
          name: shippingAddress?.recipient_name || userName || undefined,
          email: userEmail || undefined,
          contact: shippingAddress?.phone || undefined,
        },
      },
    })
  } catch (e) {
    console.error("resume_order_payment:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
}

app.post(
  "/payments/razorpay/verify",
  createPaymentLimiter,
  authenticateJWT,
  verifyRazorpayPayment
)

app.post(
  "/payments/razorpay/reconcile",
  createPaymentLimiter,
  authenticateJWT,
  reconcileRazorpayPayment
)

app.post(
  "/orders/:orderId/resume-payment",
  createPaymentLimiter,
  authenticateJWT,
  resumeOrderPayment
)

function requireAdminKey(req, res, next) {
  const required = process.env.ADMIN_API_KEY?.trim()
  if (!required) return next()
  const key = req.headers["x-admin-key"]
  if (key !== required) {
    return res.status(401).json({ statusCode: 401, message: "Unauthorized" })
  }
  next()
}

function normalizeGateway(providerRaw) {
  const provider = String(providerRaw || "manual").toLowerCase()
  const map = {
    phonepe: { provider: "phonepe", method: "upi" },
    razorpay: { provider: "razorpay", method: "upi" },
    stripe: { provider: "stripe", method: "card" },
    paypal: { provider: "paypal", method: "wallet" },
    manual: { provider: "manual", method: "manual" },
  }
  return map[provider] || { provider, method: "manual" }
}

async function buildOrdersPayload(orderRows) {
  if (!orderRows?.length) return []
  const orderIds = orderRows.map((o) => o.id)

  const [
    { data: payments, error: paymentErr },
    { data: addresses, error: addressErr },
    { data: items, error: itemsErr },
  ] = await Promise.all([
    supabase
      .from("payments")
      .select("id, order_id, provider, status, amount, currency, created_at")
      .in("order_id", orderIds),
    supabase
      .from("order_addresses")
      .select(
        "order_id, address_type, recipient_name, phone, line1, line2, city, state, postal_code, country, created_at"
      )
      .in("order_id", orderIds),
    supabase
      .from("order_items")
      .select("order_id, product_id, product_name, unit_price, quantity, size, color, created_at")
      .in("order_id", orderIds),
  ])

  if (paymentErr) throw paymentErr
  if (addressErr) throw addressErr
  if (itemsErr) throw itemsErr

  const productIds = [...new Set((items || []).map((i) => i.product_id).filter(Boolean))]
  let imageRows = []
  if (productIds.length) {
    const { data, error } = await supabase
      .from("product_images")
      .select("product_id, image_url")
      .in("product_id", productIds)
    if (error) throw error
    imageRows = data || []
  }

  const paymentByOrder = {}
  for (const p of payments || []) {
    if (!paymentByOrder[p.order_id]) paymentByOrder[p.order_id] = p
  }
  const addressByOrder = {}
  for (const a of addresses || []) {
    if (a.address_type === "shipping" && !addressByOrder[a.order_id]) {
      addressByOrder[a.order_id] = a
    }
  }
  const itemsByOrder = {}
  for (const i of items || []) {
    if (!itemsByOrder[i.order_id]) itemsByOrder[i.order_id] = []
    itemsByOrder[i.order_id].push(i)
  }
  const imageByProduct = {}
  for (const row of imageRows || []) {
    if (!imageByProduct[row.product_id]) imageByProduct[row.product_id] = row.image_url
  }

  return orderRows.map((o) => {
    const a = addressByOrder[o.id] || {}
    const p = paymentByOrder[o.id] || {}
    const orderItems = (itemsByOrder[o.id] || []).map((it) => ({
      product_id: it.product_id || null,
      product_name: it.product_name || null,
      product_image: it.product_id ? imageByProduct[it.product_id] || null : null,
      unit_price: it.unit_price || null,
      quantity: it.quantity || null,
      size: it.size || null,
      color: it.color || null,
    }))
    const firstItem = orderItems[0] || {}

    return {
      id: o.id,
      order_status: o.order_status,
      payment_status: o.payment_status,
      payment_provider: p.provider || null,
      payment_method: p.provider || null,
      currency: o.currency,
      subtotal: o.subtotal,
      shipping_amount: o.shipping_amount,
      tax_amount: o.tax_amount,
      total_amount: o.total_amount,
      recipient_name: a.recipient_name || null,
      phone: a.phone || null,
      address_line_1: a.line1 || null,
      address_line_2: a.line2 || null,
      city: a.city || null,
      state: a.state || null,
      postal_code: a.postal_code || null,
      country: a.country || null,
      product_name: firstItem.product_name || null,
      product_image: firstItem.product_image || null,
      quantity: firstItem.quantity || null,
      unit_price: firstItem.unit_price || null,
      size: firstItem.size || null,
      color: firstItem.color || null,
      items: orderItems,
      created_at: o.created_at,
    }
  })
}

app.get("/orders", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const { data: orders, error } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_status, payment_status, currency, subtotal, shipping_amount, tax_amount, total_amount, created_at"
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
    if (error) throw error
    const data = await buildOrdersPayload(orders || [])
    return res.json({ statusCode: 200, data })
  } catch (e) {
    console.error("get_orders:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

/** Must be registered before /orders/:orderId or "demo" is treated as an order id. */
app.get("/orders/demo", async (_req, res) => {
  try {
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select(
        "id, order_status, payment_status, currency, subtotal, shipping_amount, tax_amount, total_amount, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(50)

    if (ordersErr) throw ordersErr
    if (!orders?.length) {
      return res.json({ statusCode: 200, data: [] })
    }

    const data = await buildOrdersPayload(orders)

    return res.json({ statusCode: 200, data })
  } catch (e) {
    console.error("get_demo_orders:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.get("/orders/:orderId", authenticateJWT, async (req, res) => {
  try {
    const userId = req.user.user_id
    const { orderId } = req.params
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_status, payment_status, currency, subtotal, shipping_amount, tax_amount, total_amount, created_at"
      )
      .eq("id", orderId)
      .eq("user_id", userId)
      .maybeSingle()
    if (error) throw error
    if (!order) {
      return res.status(404).json({ statusCode: 404, message: "Order not found" })
    }
    const payload = await buildOrdersPayload([order])
    return res.json({ statusCode: 200, data: payload[0] || null })
  } catch (e) {
    console.error("get_order_detail:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.post("/orders/demo", async (req, res) => {
  try {
    const body = req.body || {}
    const items = Array.isArray(body.items) ? body.items : []
    if (!items.length) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "items must be a non-empty array" })
    }

    const address = body.address || {}
    if (
      !address.recipient_name ||
      !address.phone ||
      !address.line1 ||
      !address.city ||
      !address.state ||
      !address.postal_code ||
      !address.country
    ) {
      return res
        .status(400)
        .json({ statusCode: 400, message: "address fields are required" })
    }

    const subtotal = items.reduce((sum, item) => {
      const qty = Number(item.quantity || 1)
      const unit = Number(item.unit_price || 0)
      return sum + qty * unit
    }, 0)

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      return res.status(400).json({ statusCode: 400, message: "Invalid amount" })
    }

    const shippingAmount =
      Number.isFinite(Number(body.shipping_amount)) && Number(body.shipping_amount) >= 0
        ? Number(body.shipping_amount)
        : subtotal > 500
          ? 0
          : 25
    const taxAmount =
      Number.isFinite(Number(body.tax_amount)) && Number(body.tax_amount) >= 0
        ? Number(body.tax_amount)
        : 0
    const totalAmount = subtotal + shippingAmount + taxAmount
    const currency = String(body.currency || "INR").toUpperCase()
    const gateway = normalizeGateway(body.gateway)

    const orderId = uuidv4()
    const paymentId = uuidv4()
    const nowIso = new Date().toISOString()

    await supabase.from("orders").insert({
      id: orderId,
      user_id: null,
      cart_id: null,
      order_status: "placed",
      payment_status: "paid",
      currency,
      subtotal,
      shipping_amount: shippingAmount,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    })

    for (const item of items) {
      await supabase.from("order_items").insert({
        id: uuidv4(),
        order_id: orderId,
        product_id: item.product_id || null,
        product_name: String(item.product_name || "Demo Product"),
        unit_price: Number(item.unit_price || 0),
        quantity: Number(item.quantity || 1),
        size: item.size ?? null,
        color: item.color ?? null,
      })
    }

    await supabase.from("order_addresses").insert({
      id: uuidv4(),
      order_id: orderId,
      address_type: "shipping",
      recipient_name: String(address.recipient_name),
      phone: String(address.phone),
      line1: String(address.line1),
      line2: address.line2 ?? null,
      city: String(address.city),
      state: String(address.state),
      postal_code: String(address.postal_code),
      country: String(address.country),
    })

    await supabase.from("payments").insert({
      id: paymentId,
      order_id: orderId,
      provider: gateway.provider,
      provider_payment_intent_id: `${gateway.provider}_${orderId}`,
      status: "succeeded",
      amount: totalAmount,
      currency,
    })

    await supabase.from("transactions").insert({
      id: uuidv4(),
      payment_id: paymentId,
      transaction_type: "payment_capture",
      status: "succeeded",
      provider_event_id: `${gateway.provider}_event_${orderId}`,
      amount: totalAmount,
      currency,
      raw: {
        source: "demo_order_api",
        created_at: nowIso,
      },
    })

    return res.json({
      statusCode: 200,
      data: {
        order_id: orderId,
        payment_id: paymentId,
        payment_provider: gateway.provider,
        payment_method: gateway.method,
        payment_status: "succeeded",
      },
    })
  } catch (e) {
    console.error("create_demo_order:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.get("/admin/orders", requireAdminKey, async (_req, res) => {
  try {
    const { data: orders, error: ordersErr } = await supabase
      .from("orders")
      .select(
        "id, user_id, order_status, payment_status, currency, subtotal, shipping_amount, tax_amount, total_amount, created_at"
      )
      .order("created_at", { ascending: false })
      .limit(100)

    if (ordersErr) throw ordersErr
    const data = await buildOrdersPayload(orders || [])
    return res.json({ statusCode: 200, data })
  } catch (e) {
    console.error("admin_orders:", e)
    return res.status(500).json({ statusCode: 500, message: String(e) })
  }
})

app.listen(PORT, () => {
  console.log(`Jacro API listening on http://localhost:${PORT}`)
})
