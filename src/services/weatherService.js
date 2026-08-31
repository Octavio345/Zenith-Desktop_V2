const API_KEY = "d77668673cf15b7d0488f921007cbd6b"

export async function getWeatherByCity(city, state) {
  try {
    if (!city || !state) return null
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${encodeURIComponent(state)},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    )
    const weather = await response.json()

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

  } catch (error) {
    console.error("Erro ao buscar clima:", error)
    return null
  }
}
