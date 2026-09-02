const MAX_INTEGER_DIGITS = 9
const MAX_DECIMAL_DIGITS = 2

export const sanitizeHectaresInput = (value) => {
  const rawValue = String(value ?? "")
  if (/[-+]/.test(rawValue)) return ""

  const normalized = rawValue
    .replace(/\./g, ",")
    .replace(/[^\d,]/g, "")

  const [integerPart = "", ...decimalParts] = normalized.split(",")
  const integer = integerPart
    .replace(/^0+(?=\d)/, "")
    .slice(0, MAX_INTEGER_DIGITS)

  if (decimalParts.length === 0) return integer

  const decimal = decimalParts.join("").slice(0, MAX_DECIMAL_DIGITS)
  return `${integer || "0"},${decimal}`
}

export const parseHectaresInput = (value) => {
  const parsed = Number(String(value ?? "").replace(",", "."))
  return Number.isFinite(parsed) ? parsed : 0
}

export const isValidHectares = (value) => parseHectaresInput(value) > 0
