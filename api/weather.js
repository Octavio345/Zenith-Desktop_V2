const validCity = (value) => /^[\p{L}\s.'-]{2,100}$/u.test(value)
const validState = (value) => /^[A-Z]{2}$/.test(value)

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET")
    response.status(405).json({ error: "Método não permitido." })
    return
  }

  const city = String(request.query.city || "").trim()
  const state = String(request.query.state || "").trim().toUpperCase()
  const apiKey = process.env.OPENWEATHER_API_KEY

  if (!validCity(city) || !validState(state)) {
    response.status(400).json({ error: "Localização inválida." })
    return
  }

  if (!apiKey) {
    response.status(503).json({ error: "Serviço de clima indisponível." })
    return
  }

  const query = new URLSearchParams({
    q: `${city},${state},BR`,
    appid: apiKey,
    units: "metric",
    lang: "pt_br",
  })

  try {
    const [weatherResponse, forecastResponse] = await Promise.all([
      fetch(`https://api.openweathermap.org/data/2.5/weather?${query}`),
      fetch(`https://api.openweathermap.org/data/2.5/forecast?${query}`),
    ])

    if (!weatherResponse.ok || !forecastResponse.ok) {
      response.status(502).json({ error: "Não foi possível consultar o clima agora." })
      return
    }

    const [weather, forecast] = await Promise.all([
      weatherResponse.json(),
      forecastResponse.json(),
    ])

    response.setHeader("Cache-Control", "s-maxage=600, stale-while-revalidate=300")
    response.status(200).json({ weather, forecast })
  } catch {
    response.status(502).json({ error: "Não foi possível consultar o clima agora." })
  }
}
