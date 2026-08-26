import { useEffect, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../../services/firebase"
import { getUserAccessProfile, isOperationalRole } from "../../../services/accessControl"
import "../../../styles/Global/MenuBar.css"

const items = [
  { path: "/home", icon: "home", label: "Início" },
  { path: "/equipe", icon: "groups", label: "Equipe" },
  { path: "/explore", icon: "grid_view", label: "Mapa", tab: "mapa" },
  { path: "/profile", icon: "person", label: "Perfil" },
]

export default function MenuBar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [canManageTeam, setCanManageTeam] = useState(false)

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) return setCanManageTeam(false)
    try {
      const profile = await getUserAccessProfile(user.uid)
      setCanManageTeam(!isOperationalRole(profile?.role))
    } catch {
      setCanManageTeam(false)
    }
  }), [])

  const visibleItems = items.filter((item) => item.path !== "/equipe" || canManageTeam)
  const firstItems = visibleItems.slice(0, 2)
  const lastItems = visibleItems.slice(2)
  const goTo = (item) => {
    if (item.tab) localStorage.setItem("activeExploreTab", item.tab)
    window.dispatchEvent(new CustomEvent("zenith:navigate"))
    navigate(item.path, item.tab ? { state: { activeTab: item.tab } } : undefined)
  }

  return (
    <nav className={`mobile-menu-bar ${canManageTeam ? "" : "is-operational"}`} aria-label="Navegação móvel">
      {firstItems.map((item) => (
        <button key={item.label} type="button" className={location.pathname === item.path ? "active" : ""} onClick={() => goTo(item)}>
          <span className="material-symbols-outlined">{item.icon}</span><small>{item.label}</small>
        </button>
      ))}
      <button className="mobile-menu-bar__primary" type="button" aria-label="Abrir Explore" onClick={() => goTo({ path: "/explore" })}>
        <span className="material-symbols-outlined">add</span>
      </button>
      {lastItems.map((item) => (
        <button key={item.label} type="button" className={location.pathname === item.path && !item.tab ? "active" : ""} onClick={() => goTo(item)}>
          <span className="material-symbols-outlined">{item.icon}</span><small>{item.label}</small>
        </button>
      ))}
    </nav>
  )
}
