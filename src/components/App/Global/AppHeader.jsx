import { useEffect, useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "../../../services/firebase"
import { getUserAccessProfile, isOperationalRole } from "../../../services/accessControl"
import "../../../styles/Global/AppHeader.css"

const navItems = [
  { label: "Início", href: "/home", icon: "home" },
  { label: "Explore", href: "/explore", icon: "explore" },
  { label: "Equipe", href: "/equipe", icon: "groups" },
  { label: "Perfil", href: "/profile", icon: "person" },
]

export default function AppHeader() {
  const navigate = useNavigate()
  const [canManageTeam, setCanManageTeam] = useState(false)

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setCanManageTeam(false)
      return
    }
    try {
      const profile = await getUserAccessProfile(user.uid)
      setCanManageTeam(!isOperationalRole(profile?.role))
    } catch {
      setCanManageTeam(false)
    }
  }), [])

  const navigateWithLoader = (path) => {
    window.dispatchEvent(new CustomEvent("zenith:navigate"))
    navigate(path)
  }

  const goTo = (event, item) => {
    event.preventDefault()
    window.dispatchEvent(new CustomEvent("zenith:navigate"))
    navigate(item.href)
  }

  return (
    <header className="app-header">
      <div className="app-header__inner">
        <button className="app-header__brand" type="button" onClick={() => navigateWithLoader("/home")}>
          <img src="/assets/image/Logo-redonda.webp" alt="" />
          <span><strong>Zenith</strong><small>Agricultura inteligente</small></span>
        </button>

        <nav className="app-header__nav" aria-label="Navegação principal">
          {navItems.filter((item) => item.href !== "/equipe" || canManageTeam).map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              onClick={(event) => goTo(event, item)}
              className={({ isActive }) => {
                const active = isActive
                return `app-header__link ${active ? "active" : ""}`
              }}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="app-header__actions">
          <button className="app-header__profile" type="button" onClick={() => navigateWithLoader("/profile")}>
            <span className="material-symbols-outlined">person</span><span>Minha conta</span>
          </button>
        </div>
      </div>
    </header>
  )
}
