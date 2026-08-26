// App.jsx do PWA
import { BrowserRouter, Navigate, Routes, Route, useLocation } from "react-router-dom"
import { useState, useEffect, useRef } from "react"
import { onAuthStateChanged } from "firebase/auth"

import Intro from "./pages/App/Intro"
import Login from "./pages/App/Login"
import CadastroCompleto from "./pages/App/CadastroCompleto"
import CadastrarFazenda from "./pages/App/CadastroFazenda"
import Home from "./pages/App/Home"
import Profile from "./pages/App/Profile"
import ForgotPassword from "./pages/App/ForgotPassword"
import Explore from "./pages/App/Explore"
import AdminTeamDashboard from "./pages/App/AdminTeamDashboard"
import { auth } from "./services/firebase"
import { getUserAccessProfile, isOperationalRole } from "./services/accessControl"

// Componentes
import InstallPrompt from "./components/App/Global/InstallPrompt"
import InstallSuccess from "./components/App/Global/InstallSuccess"

// Estilos
import "./App.css"
import "./styles/Global/DesktopMobileTheme.css"

function TeamRoute() {
  const [access, setAccess] = useState("loading")

  useEffect(() => onAuthStateChanged(auth, async (user) => {
    if (!user) {
      setAccess("denied")
      return
    }
    try {
      const profile = await getUserAccessProfile(user.uid)
      setAccess(isOperationalRole(profile?.role) ? "denied" : "allowed")
    } catch {
      setAccess("denied")
    }
  }), [])

  if (access === "loading") {
    return (
      <div className="access-loader" role="status">
        <img src="/assets/image/Logo-redonda.webp" alt="" />
        <div><strong>Verificando acesso</strong><span>Preparando sua área de trabalho</span></div>
        <i aria-hidden="true" />
      </div>
    )
  }
  return access === "allowed" ? <AdminTeamDashboard /> : <Navigate to="/home" replace />
}

function AppShell() {
  const location = useLocation()
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showInstallSuccess, setShowInstallSuccess] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)
  const [quickLoading, setQuickLoading] = useState(false)
  const firstRoute = useRef(true)

  useEffect(() => {
    let timeout
    const showQuickLoader = () => {
      setQuickLoading(true)
      window.clearTimeout(timeout)
      timeout = window.setTimeout(() => setQuickLoading(false), 850)
    }
    window.addEventListener("zenith:navigate", showQuickLoader)
    return () => {
      window.removeEventListener("zenith:navigate", showQuickLoader)
      window.clearTimeout(timeout)
    }
  }, [])

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" })
    if (firstRoute.current) {
      firstRoute.current = false
      return
    }
    setQuickLoading(true)
    const routeTimeout = window.setTimeout(() => setQuickLoading(false), 900)
    return () => window.clearTimeout(routeTimeout)
  }, [location.pathname])

  
  
  useEffect(() => {
    // Detectar dispositivo
    const userAgent = navigator.userAgent
    setIsIOS(/iPhone|iPad|iPod/i.test(userAgent))
    setIsAndroid(/Android/i.test(userAgent))

    // Verificar se já está instalado (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true
    
    if (isStandalone) {
      setIsInstalled(true)
      console.log('✅ App rodando em modo standalone')
      return
    }

    // Verificar parâmetros da URL
    const params = new URLSearchParams(window.location.search)
    const shouldInstall = params.get('install') === 'true'
    const source = params.get('source')
    
    console.log('📱 Modo:', isStandalone ? 'standalone' : 'navegador')
    console.log('🔧 Parâmetros:', { shouldInstall, source })

    // Se veio para instalar, mostrar prompt após 1 segundo
    if (shouldInstall && !isStandalone) {
      setTimeout(() => {
        setShowInstallPrompt(true)
      }, 1000)
    }

    // Capturar evento de instalação
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      console.log('📲 Evento beforeinstallprompt capturado')
      setDeferredPrompt(e)
      
      // Se veio com install=true, disparar automaticamente
      if (shouldInstall) {
        setTimeout(() => {
          handleInstall()
        }, 1500)
      }
    }

    

    // Quando o app for instalado
    const handleAppInstalled = (e) => {
      console.log('🎉 App instalado com sucesso!', e)
      setIsInstalled(true)
      setShowInstallPrompt(false)
      setShowInstallSuccess(true)
      setDeferredPrompt(null)
      
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])


const handleInstall = async () => {
  if (!deferredPrompt) {
    console.log('❌ Prompt não disponível')
    return
  }

  deferredPrompt.prompt()

  const choiceResult = await deferredPrompt.userChoice

  if (choiceResult.outcome === 'accepted') {
    console.log('✅ Usuário aceitou instalar')
  } else {
    console.log('❌ Usuário recusou')
  }

  setDeferredPrompt(null)
}

  return (
          <>
            {/* Prompt de instalação */}
            {showInstallPrompt && !isInstalled && (
              <InstallPrompt 
                onInstall={handleInstall}
                onClose={() => setShowInstallPrompt(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
                hasPrompt={!!deferredPrompt}
              />
            )}

            {/* Mensagem de sucesso após instalação */}
            {showInstallSuccess && (
              <InstallSuccess 
                onClose={() => setShowInstallSuccess(false)}
                isIOS={isIOS}
                isAndroid={isAndroid}
              />
            )}
            
            <Routes location={location}>
              <Route path="/" element={<Intro />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<CadastroCompleto />} />
              <Route path="/cadastrar-fazenda" element={<CadastrarFazenda />} />
              <Route path="/home" element={<Home />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/equipe" element={<TeamRoute />} />
              <Route path="/admin/team" element={<TeamRoute />} />
            </Routes>
            {quickLoading && (
              <div className="route-quick-loader" role="status" aria-label="Abrindo página">
                <div>
                  <span className="material-symbols-outlined">eco</span>
                  <i aria-hidden="true" />
                </div>
                <strong>Zenith</strong>
              </div>
            )}
          </>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}

export default App
