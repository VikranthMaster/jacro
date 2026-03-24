import "dotenv/config"
import cors from "cors"
import express from "express"
import multer from "multer"
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
import dotenv from "dotenv";
dotenv.config();

const PORT = Number(process.env.PORT) || 8001

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://dnyuomscigxcyibonylq.supabase.co"
const SV_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SV_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRueXVvbXNjaWd4Y3lpYm9ueWxxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDEwNzEzMiwiZXhwIjoyMDg5NjgzMTMyfQ.6oAx-3B8BSn1DueonjX49bd8ctdpIp5uvejrbYbGJ34"

const supabase = createClient(SUPABASE_URL, SV_KEY)

const app = express()
app.use(
  cors({
    origin: "*",
    credentials: true,
    methods: ["*"],
    allowedHeaders: ["*"],
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

app.get("/", (_req, res) => {
  res.json({ message: "Alive!" })
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
      return res.status(401).json({ message: error?.message || "Login failed" })
    }

    const appJwt = signAppJwt(data.user.id)

    return res.json({
      statusCode: 200,
      user: {
        id: data.user.id,
        email: data.user.email,
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

    const { data, error } = await supabase.auth.signUp({
      email: emailNorm,
      password,
    })

    if (error || !data.user) {
      const msg = error?.message || "Register failed"
      // Supabase commonly returns "User already registered" if an account exists
      // (including unconfirmed/previously created users).
      const isAlreadyRegistered =
        /already registered|already exists|user exists/i.test(msg)
      return res
        .status(isAlreadyRegistered ? 409 : 400)
        .json({ message: msg })
    }

    return res.json({
      statusCode: 200,
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

    const shippingAmount = subtotal > 500 ? 0 : 25
    const taxAmount = 0
    const totalAmount = subtotal + shippingAmount + taxAmount

    const orderId = uuidv4()

    await supabase.from("orders").insert({
      id: orderId,
      user_id,
      cart_id: cartId,
      order_status: "processing",
      payment_status: "unpaid",
      currency: "USD",
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

    const paymentId = uuidv4()

    await supabase.from("payments").insert({
      id: paymentId,
      order_id: orderId,
      provider: "manual",
      status: "requires_payment_method",
      method: "manual",
      amount: totalAmount,
      currency: "USD",
    })

    await supabase.from("transactions").insert({
      id: uuidv4(),
      payment_id: paymentId,
      transaction_type: "payment_attempt",
      status: "created",
      amount: totalAmount,
      currency: "USD",
      raw: null,
    })

    await supabase.from("cart_items").delete().eq("cart_id", cartId)

    return res.json({ statusCode: 200, order_id: orderId })
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

app.listen(PORT, () => {
  console.log(`Jacro API listening on http://localhost:${PORT}`)
})
