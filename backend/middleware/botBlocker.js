const BLOCKED_SUBSTRINGS = ["curl", "postman", "bot", "spider", "wget"]

/**
 * Blocks common scripted clients by User-Agent substring (case-insensitive).
 * @type {import("express").RequestHandler}
 */
export function botBlocker(req, res, next) {
  const ua = (req.get("user-agent") || "").toLowerCase()
  const blocked = BLOCKED_SUBSTRINGS.some((s) => ua.includes(s))
  if (blocked) {
    return res.status(403).json({ message: "Forbidden" })
  }
  next()
}
