export const BRAZIL_STATE_CODES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
]

export const BRAZIL_STATE_OPTIONS = BRAZIL_STATE_CODES.map((uf) => ({
  value: uf,
  label: uf
}))

export const BRAZIL_STATE_SET = new Set(BRAZIL_STATE_CODES)
