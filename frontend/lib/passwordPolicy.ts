const MIN_LENGTH = 8

export const PASSWORD_REQUIREMENTS_TEXT = [
  `At least ${MIN_LENGTH} characters`,
  "One uppercase letter (A–Z)",
  "One lowercase letter (a–z)",
  "One number (0–9)",
  "One symbol (e.g. !@#$%^&*)",
] as const

/**
 * @returns Error message, or null if valid
 */
export function validatePasswordStrength(password: string): string | null {
  const p = String(password ?? "")
  if (p.length < MIN_LENGTH) {
    return `Password must be at least ${MIN_LENGTH} characters`
  }
  if (!/[a-z]/.test(p)) {
    return "Password must include a lowercase letter"
  }
  if (!/[A-Z]/.test(p)) {
    return "Password must include an uppercase letter"
  }
  if (!/[0-9]/.test(p)) {
    return "Password must include a number"
  }
  if (!/[^A-Za-z0-9]/.test(p)) {
    return "Password must include a symbol (e.g. !@#$%^&*)"
  }
  return null
}
