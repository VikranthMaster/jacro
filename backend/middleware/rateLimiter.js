import rateLimit from "express-rate-limit"
import dotenv from "dotenv";
dotenv.config();

/** 100 requests / 15 min per IP */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests" },
})

/** 5 / 10 min — login */
export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many login attempts" },
})

/** 5 / 10 min — registration */
export const signupLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many signup attempts" },
})

/** 3 / 10 min — payment-style endpoints */
export const createPaymentLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many payment attempts" },
})
