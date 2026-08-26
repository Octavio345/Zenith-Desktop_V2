import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"
import { auth, db } from "../../services/firebase"
import { getWeatherByCity } from "../../services/weatherService"
import AppHeader from "../../components/App/Global/AppHeader"
import MenuBar from "../../components/App/Global/MenuBar"
import AppFooter from "../../components/App/Global/AppFooter"
import "../../styles/App/Home.css"

const readActivities = () => {
  try {
    const items = JSON.parse(localStorage.getItem("activities") || "[]")
    return Array.isArray(items) ? items : []
  } catch {
    return []
  }
}

export default function Home() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [weather, setWeather] = useState(null)
  const [activities, setActivities] = useState(readActivities)

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid))
      const profile = userSnap.exists() ? userSnap.data() : {}
      if (userSnap.exists()) setUserData({ ...profile, uid: user.uid })
      const farmOwnerId = profile.ownerId || profile.teamId || user.uid
      const farmsSnap = await getDocs(query(collection(db, "farms"), where("ownerId", "==", farmOwnerId)))
      if (farmsSnap.empty) return
      const farm = { ...farmsSnap.docs[0].data(), id: farmsSnap.docs[0].id }
      setFarmData(farm)
      if (farm.municipio && farm.uf) setWeather(await getWeatherByCity(farm.municipio, farm.uf))
    } catch (error) {
      console.error("Erro ao carregar o painel:", error)
    }
  }), [])

  useEffect(() => {
    const sync = () => setActivities(readActivities())
    window.addEventListener("storage", sync)
    window.addEventListener("focus", sync)
    return () => {
      window.removeEventListener("storage", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  const firstName = userData?.name?.split(" ")[0] || "Agricultor"
  const hasFarm = Boolean(farmData)
  const temperature = hasFarm && weather?.temperature !== undefined ? Math.round(weather.temperature) : "--"
  const summary = useMemo(() => [
    { icon: "eco", label: "Saúde da lavoura", value: hasFarm ? "Pronta para análise" : "Cadastre a fazenda", tab: "diagnostico" },
    { icon: "cloud", label: "Condição do clima", value: weather?.conditionDescription || "Sem dados agora", tab: "clima" },
    { icon: "task_alt", label: "Atividades", value: `${activities.length} registradas`, tab: "atividades" },
    { icon: "monitoring", label: "Monitoramento", value: hasFarm ? "Área conectada" : "Aguardando dados", tab: "monitoramento" },
  ], [activities.length, hasFarm, weather])

  const openExplore = (tab) => {
    localStorage.setItem("activeExploreTab", tab)
    navigate("/explore", { state: { activeTab: tab } })
  }

  return (
    <div className="zenith-home">
      <AppHeader />
      <main className="zenith-home__content">
        <section className="zenith-home__greeting">
          <div>
            <span className="zenith-kicker"><span className="material-symbols-outlined">wb_sunny</span> Visão geral da propriedade</span>
            <h1>Olá, <strong>{firstName}</strong><span className="material-symbols-outlined">eco</span></h1>
            <button type="button" onClick={() => navigate("/cadastrar-fazenda")}>
              <span className="material-symbols-outlined">location_on</span>
              {farmData?.name || "Cadastre sua fazenda"}
            </button>
          </div>
          <div className="zenith-home__date">
            <span className="material-symbols-outlined">calendar_today</span>
            <span><small>Hoje</small>{new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date())}</span>
          </div>
        </section>

        <section className="zenith-home__hero-grid">
          <article className="weather-hero-card">
            <div className="weather-hero-card__copy">
              <span className="card-label"><span className="material-symbols-outlined">partly_cloudy_day</span> Clima atual</span>
              <div className="weather-temperature"><strong>{temperature}</strong><sup>{temperature !== "--" ? "°" : ""}</sup></div>
              <h2>{weather?.conditionDescription || "Dados climáticos"}</h2>
              <p>{farmData?.municipio ? `${farmData.municipio}${farmData.uf ? `, ${farmData.uf}` : ""}` : "Cadastre a localização para acompanhar o clima."}</p>
            </div>
            <img src="/assets/image/soja-hero-cutout.webp" alt="Vagens e folhas de soja" />
            <div className="weather-metrics">
              <div><span className="material-symbols-outlined">humidity_percentage</span><small>Umidade</small><strong>{weather?.humidity !== undefined ? `${weather.humidity}%` : "--"}</strong></div>
              <div><span className="material-symbols-outlined">air</span><small>Vento</small><strong>{weather?.windSpeed !== undefined ? `${weather.windSpeed} km/h` : "--"}</strong></div>
              <div><span className="material-symbols-outlined">rainy</span><small>Precipitação</small><strong>{weather?.rain !== undefined ? `${weather.rain} mm` : "--"}</strong></div>
            </div>
          </article>

          <article className="farm-showcase-card">
            <img src="/assets/image/Fundo_landing.jpg" alt="Lavoura ao pôr do sol" />
            <div className="farm-showcase-card__shade" />
            <div className="farm-showcase-card__top">
              <span><span className="material-symbols-outlined">agriculture</span> Minha fazenda</span>
              <strong>{farmData?.produtividade || farmData?.rendimento || "7200 kg/ha"}</strong>
            </div>
            <div className="farm-showcase-card__bottom">
              <span><small>Cultura principal</small><strong>{farmData?.plantacao || "Soja"}</strong></span>
              <span><small>Área total</small><strong>{farmData?.area_total ? `${farmData.area_total} ha` : "--"}</strong></span>
              <button type="button" onClick={() => navigate(hasFarm ? "/profile" : "/cadastrar-fazenda")}>{hasFarm ? "Ver propriedade" : "Cadastrar agora"}<span className="material-symbols-outlined">arrow_forward</span></button>
            </div>
          </article>
        </section>

        <section className="zenith-section">
          <div className="zenith-section__head"><div><span className="material-symbols-outlined">insights</span><span><small>Painel operacional</small><h2>Resumo rápido</h2></span></div><button type="button" onClick={() => openExplore("diagnostico")}>Explorar recursos <span className="material-symbols-outlined">arrow_forward</span></button></div>
          <div className="quick-summary-grid">
            {summary.map((item) => (
              <button type="button" key={item.label} onClick={() => openExplore(item.tab)}>
                <span className="quick-summary-grid__icon material-symbols-outlined">{item.icon}</span>
                <span><small>{item.label}</small><strong>{item.value}</strong></span>
                <span className="material-symbols-outlined">arrow_outward</span>
              </button>
            ))}
          </div>
        </section>

        <section className="home-operation-grid">
          <article className="home-operation-card home-operation-card--feature">
            <div><span className="card-label card-label--light"><span className="material-symbols-outlined">flight</span> Inteligência aérea</span><h2>Veja sua lavoura por uma nova perspectiva.</h2><p>Envie imagens do drone para diagnóstico e acompanhamento do alinhamento da plantação.</p><button type="button" onClick={() => openExplore("monitoramento")}>Iniciar monitoramento <span className="material-symbols-outlined">arrow_forward</span></button></div>
            <img src="/assets/image/drone-plantio.webp" alt="Drone sobrevoando a plantação" />
          </article>
          <article className="home-activity-card">
            <div className="home-activity-card__head"><span><span className="material-symbols-outlined">history</span><strong>Atividades recentes</strong></span><button type="button" onClick={() => openExplore("atividades")}>Ver todas</button></div>
            {activities.length ? activities.slice(0, 3).map((activity, index) => (
              <div className="home-activity-row" key={activity.id || index}><span className="material-symbols-outlined">task_alt</span><span><strong>{activity.title || activity.name || "Atividade da fazenda"}</strong><small>{activity.date || "Registro recente"}</small></span><i>{activity.status || "Pendente"}</i></div>
            )) : <div className="home-activity-empty"><span className="material-symbols-outlined">event_available</span><div><strong>Sua rotina começa aqui</strong><p>Crie tarefas e acompanhe a operação da fazenda.</p></div><button type="button" onClick={() => openExplore("atividades")}>Abrir atividades</button></div>}
          </article>
        </section>
      </main>
      <AppFooter />
      <MenuBar />
    </div>
  )
}
