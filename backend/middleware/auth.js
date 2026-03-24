import jwt from "jsonwebtoken"
import dotenv from "dotenv";
dotenv.config();

function getJwtSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET is required in production")
    }
    console.warn(
      "[auth] JWT_SECRET unset; using dev fallback. Set JWT_SECRET in .env."
    )
    return "dev-only-change-me"
  }
  return secret
}

/**
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const token = authHeader.slice("Bearer ".length).trim()
  if (!token) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  let secret
  try {
    secret = getJwtSecret()
  } catch (e) {
    console.error(e)
    return res.status(500).json({ message: "Server misconfiguration" })
  }

  try {
    const decoded = jwt.verify(token, secret)
    const userId = decoded.user_id ?? decoded.sub
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" })
    }
    req.user = { user_id: userId }
    next()
  } catch (e) {
    if (e instanceof jwt.JsonWebTokenError || e instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: "Unauthorized" })
    }
    console.error(e)
    return res.status(500).json({ message: "Server error" })
  }
}

/**
 * @param {string} userId
 */
export function signAppJwt(userId) {
  const secret = getJwtSecret()
  return jwt.sign({ user_id: userId }, secret, { expiresIn: "7d" })
}
