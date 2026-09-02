import { useEffect, useState } from "react"
import { useRegisterSW } from "virtual:pwa-register/react"
import "../../../styles/Global/UpdatePrompt.css"

const UPDATE_INTERVAL_MS = 60 * 60 * 1000
const REMIND_LATER_MS = 5 * 60 * 60 * 1000
const UPDATE_APPLIED_KEY = "zenith:update-applied"
const UPDATE_SNOOZE_KEY = "zenith:update-snoozed-until"

export default function UpdatePrompt({ preview = null }) {
  const [registration, setRegistration] = useState(null)
  const [updating, setUpdating] = useState(false)
  const [snoozed, setSnoozed] = useState(
    () => Number(localStorage.getItem(UPDATE_SNOOZE_KEY)) > Date.now(),
  )
  const [errorMessage, setErrorMessage] = useState("")
  const [showUpdated, setShowUpdated] = useState(
    () => sessionStorage.getItem(UPDATE_APPLIED_KEY) === "true",
  )

  const {
    needRefresh: [needRefresh],
    offlineReady: [, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_serviceWorkerUrl, currentRegistration) {
      setRegistration(currentRegistration || null)
    },
    onRegisterError(error) {
      console.error("Não foi possível registrar as atualizações da Zenith:", error)
    },
  })

  useEffect(() => {
    if (!showUpdated) return undefined
    sessionStorage.removeItem(UPDATE_APPLIED_KEY)
    const closeTimer = window.setTimeout(() => setShowUpdated(false), 6000)
    return () => window.clearTimeout(closeTimer)
  }, [showUpdated])

  useEffect(() => {
    setOfflineReady(false)
  }, [setOfflineReady])

  useEffect(() => {
    if (!registration) return undefined

    const checkForUpdates = () => {
      if (navigator.onLine) registration.update().catch(() => {})
    }
    const checkWhenVisible = () => {
      if (document.visibilityState === "visible") checkForUpdates()
    }

    const interval = window.setInterval(checkForUpdates, UPDATE_INTERVAL_MS)
    window.addEventListener("focus", checkForUpdates)
    document.addEventListener("visibilitychange", checkWhenVisible)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", checkForUpdates)
      document.removeEventListener("visibilitychange", checkWhenVisible)
    }
  }, [registration])

  useEffect(() => {
    if (!snoozed) return undefined
    const snoozedUntil = Number(localStorage.getItem(UPDATE_SNOOZE_KEY))
    const remainingTime = Math.max(0, snoozedUntil - Date.now())
    const reminderTimer = window.setTimeout(() => {
      localStorage.removeItem(UPDATE_SNOOZE_KEY)
      setSnoozed(false)
    }, remainingTime)
    return () => window.clearTimeout(reminderTimer)
  }, [snoozed])

  const remindLater = () => {
    localStorage.setItem(UPDATE_SNOOZE_KEY, String(Date.now() + REMIND_LATER_MS))
    setSnoozed(true)
  }

  const installUpdate = async () => {
    if (updating) return
    setUpdating(true)
    setErrorMessage("")
    localStorage.removeItem(UPDATE_SNOOZE_KEY)
    sessionStorage.setItem(UPDATE_APPLIED_KEY, "true")

    try {
      await updateServiceWorker(true)
    } catch (error) {
      console.error("Não foi possível atualizar a Zenith:", error)
      sessionStorage.removeItem(UPDATE_APPLIED_KEY)
      setUpdating(false)
      setErrorMessage("Não foi possível atualizar agora. Verifique sua conexão e tente novamente.")
    }
  }

  return (
    <>
      {(needRefresh || preview === "update") && !snoozed && (
        <div className="update-prompt-overlay" role="presentation">
          <aside className="update-prompt" role="alertdialog" aria-modal="true" aria-labelledby="update-prompt-title" aria-describedby="update-prompt-description">
            <button className="update-prompt__close" type="button" onClick={remindLater} aria-label="Lembrar em cinco horas">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>

            <div className="update-prompt__brand" aria-hidden="true">
              <img src="/assets/image/Logo-192.png" alt="" />
              <span className="material-symbols-outlined">sync</span>
            </div>

            <div className="update-prompt__copy">
              <small>NOVA VERSÃO DISPONÍVEL</small>
              <h2 id="update-prompt-title">A Zenith ficou ainda melhor</h2>
              <p id="update-prompt-description">Há melhorias e correções prontas para instalar. A atualização leva apenas alguns segundos.</p>
            </div>

            {errorMessage && <p className="update-prompt__error">{errorMessage}</p>}

            <div className="update-prompt__actions">
              <button className="update-prompt__primary" type="button" onClick={installUpdate} disabled={updating}>
                {updating ? <><i aria-hidden="true" /> Atualizando...</> : <><span className="material-symbols-outlined" aria-hidden="true">system_update_alt</span> Atualizar agora</>}
              </button>
              <button className="update-prompt__secondary" type="button" onClick={remindLater} disabled={updating}>
                Lembrar em 5 horas
              </button>
            </div>
          </aside>
        </div>
      )}

      {(showUpdated || preview === "updated") && (
        <aside className="update-complete" role="status" aria-live="polite">
          <div className="update-complete__icon">
            <span className="material-symbols-outlined" aria-hidden="true">check</span>
          </div>
          <div><strong>Zenith atualizada</strong><p>Você já está usando a versão mais recente.</p></div>
          <button type="button" onClick={() => setShowUpdated(false)} aria-label="Fechar confirmação">
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </aside>
      )}
    </>
  )
}
