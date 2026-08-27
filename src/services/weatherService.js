const API_KEY = "d77668673cf15b7d0488f921007cbd6b"

export async function getWeatherByCity(city, state) {
  try {
    if (!city || !state) return null
    const response = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)},${encodeURIComponent(state)},BR&appid=${API_KEY}&units=metric&lang=pt_br`
    ) 

    const data = await response.json()

    if (data.cod !== 200) {
      console.error("Cidade não encontrada:", data.message)
      return null
    }

    return {
      temperature: Math.round(data.main.temp),
      feelsLike: Math.round(data.main.feels_like),
      humidity: data.main.humidity,
      windSpeed: Math.round((data.wind?.speed || 0) * 3.6),
      rain: data.rain?.["1h"] || 0,
      conditionDescription: data.weather?.[0]?.description || "Condição atual",
      description: data.weather?.[0]?.description || "Condição atual",
      icon: data.weather?.[0]?.icon || "",
      updatedAt: new Date().toISOString()
    }

  } catch (error) {
    console.error("Erro ao buscar clima:", error)
    return null
  }
}
