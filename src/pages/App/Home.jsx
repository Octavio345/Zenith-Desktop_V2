import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { collection, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore"
import { auth, db } from "../../services/firebase"
import { isOperationalRole } from "../../services/accessControl"
import { getWeatherByCity } from "../../services/weatherService"
import AppHeader from "../../components/App/Global/AppHeader"
import MenuBar from "../../components/App/Global/MenuBar"
import AppFooter from "../../components/App/Global/AppFooter"
import "../../styles/App/Home.css"

export default function Home() {
  const navigate = useNavigate()
  const [userData, setUserData] = useState(null)
  const [farmData, setFarmData] = useState(null)
  const [weather, setWeather] = useState(null)
  const [activities, setActivities] = useState([])
  const [assignedTasks, setAssignedTasks] = useState([])
  const [employeeAction, setEmployeeAction] = useState("")
  const [employeeActionError, setEmployeeActionError] = useState("")

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return
    try {
      const userSnap = await getDoc(doc(db, "users", user.uid))
      const profile = userSnap.exists() ? userSnap.data() : {}
      if (userSnap.exists()) setUserData({ ...profile, uid: user.uid })
      if (isOperationalRole(profile.role)) {
        const tasksSnap = await getDocs(query(collection(db, "tasks"), where("employeeId", "==", user.uid)))
        setAssignedTasks(tasksSnap.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))))
      } else {
        setAssignedTasks([])
      }
      const farmOwnerId = profile.ownerId || profile.teamId || user.uid
      const farmsSnap = await getDocs(query(collection(db, "farms"), where("ownerId", "==", farmOwnerId)))
      const farm = farmsSnap.empty ? null : { ...farmsSnap.docs[0].data(), id: farmsSnap.docs[0].id }
      setFarmData(farm)
      const city = farm?.municipio || profile.city
      const state = farm?.uf || profile.state
      if (city && state) setWeather(await getWeatherByCity(city, state))
    } catch (error) {
      console.error("Erro ao carregar o painel:", error)
    }
  }), [])

  useEffect(() => {
    if (!auth.currentUser || !isOperationalRole(userData?.role)) return undefined
    const tasksQuery = query(collection(db, "tasks"), where("employeeId", "==", auth.currentUser.uid))
    return onSnapshot(tasksQuery, (snapshot) => {
      setAssignedTasks(snapshot.docs.map((taskDoc) => ({ id: taskDoc.id, ...taskDoc.data() })).sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))))
    }, (error) => console.error("Erro ao sincronizar tarefas do funcionário:", error))
  }, [userData?.role])

  useEffect(() => {
    const user = auth.currentUser
    if (!user || !userData) return undefined

    const subscriptions = []
    const sortActivities = (items) => [...items].sort((a, b) => String(b.createdAt || b.date || "").localeCompare(String(a.createdAt || a.date || "")))

    if (!isOperationalRole(userData.role)) {
      const ownerActivities = query(collection(db, "activities"), where("ownerId", "==", user.uid))
      subscriptions.push(onSnapshot(ownerActivities, (snapshot) => {
        setActivities(sortActivities(snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() }))))
      }, (error) => console.error("Erro ao sincronizar atividades da fazenda:", error)))
    } else {
      const ownerId = userData.ownerId || userData.teamId
      if (!ownerId) return undefined
      let generalActivities = []
      let assignedActivities = []
      const syncVisibleActivities = () => {
        const merged = new Map([...generalActivities, ...assignedActivities].map((activity) => [activity.id, activity]))
        setActivities(sortActivities([...merged.values()]))
      }
      subscriptions.push(onSnapshot(
        query(collection(db, "activities"), where("ownerId", "==", ownerId), where("scope", "==", "general")),
        (snapshot) => { generalActivities = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisibleActivities() },
        (error) => console.error("Erro ao sincronizar atividades gerais:", error),
      ))
      subscriptions.push(onSnapshot(
        query(collection(db, "activities"), where("assigneeId", "==", user.uid)),
        (snapshot) => { assignedActivities = snapshot.docs.map((activityDoc) => ({ id: activityDoc.id, ...activityDoc.data() })); syncVisibleActivities() },
        (error) => console.error("Erro ao sincronizar atividades atribuídas:", error),
      ))
    }

    return () => subscriptions.forEach((unsubscribe) => unsubscribe())
  }, [userData])

  const firstName = userData?.name?.split(" ")[0] || "Agricultor"
  const isEmployee = isOperationalRole(userData?.role)
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

  const formatClock = (date) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(date)

  const updateWorkShift = async (action) => {
    if (!auth.currentUser || !isEmployee) return
    const now = new Date()
    setEmployeeActionError("")
    setEmployeeAction(action)
    try {
      const payload = action === "start"
        ? { status: "trabalhando", entry: formatClock(now), exit: "--:--", workStartedAt: now.toISOString(), lastActivity: `Entrada registrada em ${formatClock(now)}` }
        : {
            status: "offline",
            exit: formatClock(now),
            workEndedAt: now.toISOString(),
            hours: Math.max(0, Math.round(((now.getTime() - new Date(userData?.workStartedAt || now).getTime()) / 3600000) * 100) / 100),
            lastActivity: `Saída registrada em ${formatClock(now)}`,
          }
      await updateDoc(doc(db, "users", auth.currentUser.uid), payload)
      setUserData((current) => ({ ...current, ...payload }))
    } catch (error) {
      console.error("Erro ao registrar jornada:", error)
      setEmployeeActionError("Não foi possível registrar a jornada. Verifique a permissão do Firestore.")
    } finally { setEmployeeAction("") }
  }

  const updateAssignedTask = async (task, status) => {
    const now = new Date().toISOString()
    setEmployeeActionError("")
    setEmployeeAction(task.id)
    try {
      const payload = status === "andamento"
        ? { status, startedAt: now, updatedAt: now }
        : { status, completedAt: now, updatedAt: now }
      await updateDoc(doc(db, "tasks", task.id), payload)
      setAssignedTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...payload } : item))
    } catch (error) {
      console.error("Erro ao atualizar tarefa:", error)
      setEmployeeActionError("Não foi possível atualizar a tarefa. Verifique a permissão do Firestore.")
    } finally { setEmployeeAction("") }
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
            <div className="home-activity-card__head"><span><span className="material-symbols-outlined">{isEmployee ? "assignment" : "history"}</span><strong>{isEmployee ? "Minha jornada e tarefas" : "Atividades recentes"}</strong></span>{!isEmployee && <button type="button" onClick={() => openExplore("atividades")}>Ver todas</button>}</div>
            {isEmployee && <div className="employee-shift-card"><div><span className={`employee-shift-card__dot ${userData?.status === "trabalhando" ? "active" : ""}`} /><span><small>Jornada de hoje</small><strong>{userData?.status === "trabalhando" ? `Em campo desde ${userData?.entry || "agora"}` : "Aguardando entrada"}</strong></span></div><button type="button" disabled={Boolean(employeeAction)} onClick={() => updateWorkShift(userData?.status === "trabalhando" ? "end" : "start")}>{employeeAction === "start" || employeeAction === "end" ? "Salvando..." : userData?.status === "trabalhando" ? "Registrar saída" : "Registrar entrada"}</button></div>}
            {isEmployee && employeeActionError && <p className="employee-action-error">{employeeActionError}</p>}
            {isEmployee && assignedTasks.length ? assignedTasks.slice(0, 3).map((task) => (
              <div className="home-activity-row home-activity-row--task" key={task.id}><span className="material-symbols-outlined">assignment_turned_in</span><span><strong>{task.title || "Tarefa da equipe"}</strong><small>{task.due && task.due !== "Sem prazo" ? `Prazo: ${task.due}` : "Sem prazo definido"}</small></span><div className="employee-task-action">{task.status === "pendente" ? <button type="button" disabled={Boolean(employeeAction)} onClick={() => updateAssignedTask(task, "andamento")}>{employeeAction === task.id ? "..." : "Iniciar"}</button> : task.status === "andamento" ? <button type="button" disabled={Boolean(employeeAction)} onClick={() => updateAssignedTask(task, "concluida")}>{employeeAction === task.id ? "..." : "Concluir"}</button> : <i>Concluída</i>}</div></div>
            )) : !isEmployee && activities.length ? activities.slice(0, 3).map((activity, index) => (
              <div className="home-activity-row" key={activity.id || index}><span className="material-symbols-outlined">task_alt</span><span><strong>{activity.title || activity.name || "Atividade da fazenda"}</strong><small>{activity.date || "Registro recente"}</small></span><i>{activity.status || "Pendente"}</i></div>
            )) : <div className="home-activity-empty"><span className="material-symbols-outlined">event_available</span><div><strong>{isEmployee ? "Nenhuma tarefa recebida" : "Sua rotina começa aqui"}</strong><p>{isEmployee ? "As novas tarefas enviadas pelo responsável aparecerão aqui." : "Crie tarefas e acompanhe a operação da fazenda."}</p></div><button type="button" onClick={() => openExplore("atividades")}>Abrir atividades</button></div>}
          </article>
        </section>
      </main>
      <AppFooter />
      <MenuBar />
    </div>
  )
}
