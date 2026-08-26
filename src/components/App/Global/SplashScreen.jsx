import { useEffect } from "react"
import "../../../styles/Global/SplashScreen.css"

export default function SplashScreen({ onComplete, message = "Carregando Zenith..." }) {
  useEffect(() => {
    const timeout = setTimeout(() => onComplete?.(), 180)

    return () => clearTimeout(timeout)
  }, [onComplete])

  return (
    <div className="splash">
      <div className="splash-mark" aria-hidden="true">
        <span className="material-symbols-outlined splash-icon">eco</span>
        <span className="splash-ring" />
      </div>

      <div className="splash-copy">
        <strong>Zenith</strong>
        <p>{message}</p>
      </div>

      <div className="splash-progress" aria-hidden="true"><span /></div>
    </div>
  )
}
