import { useNavigate } from "react-router-dom"
import { useEffect, useRef, useState } from "react"
import "../../styles/App/Intro.css"

import Logo from "/public/assets/image/Logo.png"

export default function Intro() {
  const navigate = useNavigate()
  const containerRef = useRef(null)
  const revealTimerRef = useRef(null)
  const fallbackTimerRef = useRef(null)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const [isVideoReady, setIsVideoReady] = useState(false)
  const [isIntroVisible, setIsIntroVisible] = useState(false)

  const revealAfterVideo = () => {
    if (isVideoReady) return
    setIsVideoReady(true)
    window.clearTimeout(fallbackTimerRef.current)
    revealTimerRef.current = window.setTimeout(() => setIsIntroVisible(true), 350)
  }

  useEffect(() => {
    const handleMouseMove = (event) => {
      if (window.innerWidth <= 768) return

      setMousePosition({
        x: (event.clientX / window.innerWidth - 0.5) * 16,
        y: (event.clientY / window.innerHeight - 0.5) * 16
      })
    }

    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  useEffect(() => {
    // Se a conexão estiver lenta ou o vídeo falhar, a pessoa ainda consegue entrar.
    fallbackTimerRef.current = window.setTimeout(() => setIsIntroVisible(true), 1200)

    return () => {
      window.clearTimeout(revealTimerRef.current)
      window.clearTimeout(fallbackTimerRef.current)
    }
  }, [])

  return (
    <div
    
      className={`intro-container intro-classic-refresh ${isVideoReady ? "is-video-ready" : ""}`}
      ref={containerRef}
      style={{
        "--mouse-x": `${mousePosition.x}px`,
        "--mouse-y": `${mousePosition.y}px`
        
      }}
    >
<video
  className="intro-video-bg"
  autoPlay
  muted
  loop
  playsInline
  preload="auto"
  disablePictureInPicture
  controls={false}
  controlsList="nodownload nofullscreen noremoteplayback"
  onLoadedData={revealAfterVideo}
>
  <source src="/assets/video/intro-bg.mp4" type="video/mp4" />
</video>
      <div className="background-layer background-layer-1"></div>
      <div className="background-layer background-layer-2"></div>
      <div className="background-overlay"></div>
      <div className="grid-pattern"></div>

      <section className={`intro-card ${isIntroVisible ? "is-visible" : ""}`}>
        <div className="card-glow"></div>
        <div className="card-pattern"></div>

        <div className="logo-section">
          <div className="logo-wrapper">
            <div className="logo-container">
              <img src={Logo} alt="Zenith" className="logo-image" />
              <div className="logo-ring"></div>
            </div>

            <h1 className="logo-title">
              <span className="title-line">Sua lavoura</span>
              <span className="title-line title-line-highlight">sob controle.</span>
            </h1>

            <p className="logo-description">
              Acompanhe a saúde da plantação, identifique sinais de doenças e transforme informações do campo em decisões mais seguras.
            </p>

            <div className="actions-section">
              <button className="btn btn-primary" onClick={() => navigate("/login")}>
                <span className="btn-text">Acessar Plataforma</span>
                <span className="btn-icon material-symbols-outlined">arrow_forward</span>
                <div className="btn-shine"></div>
              </button>

              <button className="btn btn-secondary" onClick={() => navigate("/register")}>
                <span className="btn-text">Começar agora</span>
                <span className="btn-icon material-symbols-outlined">add</span>
                <div className="btn-shine"></div>
              </button>
            </div>
          </div>
        </div>

        <div className="intro-overview">
          <header className="intro-overview__header">
            <span><i /> INFORMAÇÃO PARA DECIDIR MELHOR</span>
            <h2>Mais clareza, menos erros no manejo.</h2>
            <p>Entenda o que acontece na lavoura e tenha mais controle sobre cada decisão.</p>
          </header>

        <div className="features-grid">
          <div className="feature-card">
            <span className="feature-icon material-symbols-outlined">health_and_safety</span>
            <div className="feature-content">
              <h3 className="feature-title">Detecção antecipada</h3>
              <p className="feature-description">Identifique sinais de doenças antes que o problema avance pela plantação.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <span className="feature-icon material-symbols-outlined">fact_check</span>
            <div className="feature-content">
              <h3 className="feature-title">Análises mais consistentes</h3>
              <p className="feature-description">Reduza erros de avaliação com informações organizadas e fáceis de interpretar.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <span className="feature-icon material-symbols-outlined">dashboard</span>
            <div className="feature-content">
              <h3 className="feature-title">Controle da operação</h3>
              <p className="feature-description">Centralize equipe, atividades e informações importantes da fazenda.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>

          <div className="feature-card">
            <span className="feature-icon material-symbols-outlined">analytics</span>
            <div className="feature-content">
              <h3 className="feature-title">Decisões mais seguras</h3>
              <p className="feature-description">Use históricos e indicadores claros para orientar o próximo manejo.</p>
            </div>
            <div className="feature-hover-bg"></div>
          </div>
        </div>

        <div className="trust-section">
          <div className="trust-badge">
            <span className="material-symbols-outlined">shield</span>
            <span className="trust-text">Dados seguros</span>
          </div>
          <div className="trust-badge">
            <span className="material-symbols-outlined">notifications_active</span>
            <span className="trust-text">Alertas inteligentes</span>
          </div>
          <div className="trust-badge">
            <span className="material-symbols-outlined">support_agent</span>
            <span className="trust-text">Suporte dedicado</span>
          </div>
        </div>

        <div className="footer">
          <p className="footer-text">
            Ja e produtor rural?
            <a href="/login" className="footer-link">
              Entrar na plataforma
              <span className="link-arrow">→</span>
            </a>
          </p>
        </div>
        </div>
      </section>
    </div>
  )
}
