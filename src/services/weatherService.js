export async function fetchWeatherData(city, state) {
  const query = new URLSearchParams({ city: String(city || ""), state: String(state || "") })
  const response = await fetch(`/api/weather?${query}`)

  if (!response.ok) throw new Error("Clima indisponível")
  return response.json()
}

export async function getWeatherByCity(city, state) {
  try {
    if (!city || !state) return null
    const { weather } = await fetchWeatherData(city, state)

    if (Number(weather.cod) !== 200) {
      return null
    }

    return {
      temperature: Math.round(weather.main.temp),
      feelsLike: Math.round(weather.main.feels_like),
      humidity: weather.main.humidity,
      windSpeed: Math.round((weather.wind?.speed || 0) * 3.6),
      rain: weather.rain?.["1h"] || 0,
      conditionDescription: weather.weather?.[0]?.description || "Condição atual",
      description: weather.weather?.[0]?.description || "Condição atual",
      icon: weather.weather?.[0]?.icon || "",
      updatedAt: new Date().toISOString()
    }

  } catch {
    return null
  }
}
