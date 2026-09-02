const digitsOnly = (value) => String(value || "").replace(/\D/g, "")

export function formatBrazilianDocument(value, personType) {
  const digits = digitsOnly(value).slice(0, personType === "PJ" ? 14 : 11)
  if (personType === "PJ") {
    return digits
      .replace(/^(\d{2})(\d)/, "$1.$2")
      .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
      .replace(/\.(\d{3})(\d)/, ".$1/$2")
      .replace(/(\d{4})(\d)/, "$1-$2")
  }
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2")
}

export function isValidCPF(value) {
  const digits = digitsOnly(value)
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false
  const calculate = (length) => {
    let sum = 0
    for (let index = 0; index < length; index += 1) sum += Number(digits[index]) * (length + 1 - index)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10])
}

export function isValidCNPJ(value) {
  const digits = digitsOnly(value)
  if (digits.length !== 14 || /^(\d)\1{13}$/.test(digits)) return false
  const calculate = (base) => {
    let weight = base.length - 7
    const sum = [...base].reduce((total, digit) => {
      const result = total + Number(digit) * weight
      weight = weight === 2 ? 9 : weight - 1
      return result
    }, 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }
  const first = calculate(digits.slice(0, 12))
  const second = calculate(`${digits.slice(0, 12)}${first}`)
  return digits.endsWith(`${first}${second}`)
}

export function isValidBrazilianDocument(value, personType) {
  return personType === "PJ" ? isValidCNPJ(value) : isValidCPF(value)
}

export const documentDigits = digitsOnly
