import { useEffect, useMemo, useRef, useState } from "react"
import {
  createModelo3DTask,
  getModelo3DModelUrl,
  getModelo3DTask
} from "../../../../services/modelo3dApi"
import "../../../../styles/App/ThreeDExperience.css"

const MAX_3D_IMAGES = 40
const POLLING_INTERVAL_MS = 5000
const RETRY_INTERVAL_MS = 10000

function defaultTaskName(conditionNames) {
  const condition = conditionNames[0] || "área monitorada"
  return `Zenith 3D — ${condition}`.slice(0, 120)
}

function taskStatusCopy(status) {
  if (status === "queued") return {
    title: "Preparando a plantação 3D",
    message: "A reconstrução começará assim que o ambiente de processamento estiver disponível."
  }
  if (status === "running") return {
    title: "Reconstruindo a área",
    message: "As imagens estão sendo alinhadas e transformadas em uma malha tridimensional."
  }
  if (status === "completed") return {
    title: "Modelo 3D disponível",
    message: "Gire, aproxime e explore a reconstrução diretamente no Zenith."
  }
  return {
    title: "Carregando plantação 3D",
    message: "Consultando o andamento da reconstrução."
  }
}

export default function ThreeDExperience({ images = [], conditionNames = [] }) {
  const initialSelection = useMemo(
    () => new Set(images.slice(0, MAX_3D_IMAGES).map((image) => image.id)),
    [images]
  )
  const uploadControllerRef = useRef(null)
  const pollingTimerRef = useRef(null)
  const viewerShellRef = useRef(null)

  const [decision, setDecision] = useState("prompt")
  const [selectedIds, setSelectedIds] = useState(initialSelection)
  const [taskName, setTaskName] = useState(() => defaultTaskName(conditionNames))
  const [qualityConfirmed, setQualityConfirmed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [task, setTask] = useState(null)
  const [error, setError] = useState("")

  const selectedImages = useMemo(
    () => images.filter((image) => selectedIds.has(image.id)),
    [images, selectedIds]
  )
  const progress = Math.max(0, Math.min(100, Math.round(Number(task?.progress) || 0)))
  const isCompleted = task?.status === "completed"
  const statusCopy = taskStatusCopy(task?.status)

  const toggleViewerFullscreen = async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await viewerShellRef.current?.requestFullscreen?.()
  }

  useEffect(() => {
    return () => {
      uploadControllerRef.current?.abort()
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (!task?.task_id || ["completed", "failed", "canceled"].includes(task.status)) return undefined

    let disposed = false
    const controller = new AbortController()

    const poll = async () => {
      try {
        const latest = await getModelo3DTask(task.task_id, { signal: controller.signal })
        if (disposed) return
        setError("")
        setTask(latest)

        if (!["completed", "failed", "canceled"].includes(latest.status)) {
          pollingTimerRef.current = window.setTimeout(poll, POLLING_INTERVAL_MS)
        }
      } catch (pollError) {
        if (disposed || pollError?.name === "AbortError") return
        setError(`Acompanhamento temporariamente indisponível: ${pollError.message}`)
        pollingTimerRef.current = window.setTimeout(poll, RETRY_INTERVAL_MS)
      }
    }

    pollingTimerRef.current = window.setTimeout(poll, POLLING_INTERVAL_MS)
    return () => {
      disposed = true
      controller.abort()
      if (pollingTimerRef.current) window.clearTimeout(pollingTimerRef.current)
    }
  }, [task?.task_id, task?.status])

  const toggleImage = (imageId) => {
    if (task) return
    setError("")
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(imageId)) next.delete(imageId)
      else if (next.size < MAX_3D_IMAGES) next.add(imageId)
      else setError("O limite para uma reconstrução 3D é de 40 fotografias.")
      return next
    })
  }

  const createTask = async () => {
    if (selectedImages.length < 2) {
      setError("Selecione pelo menos 2 fotografias do mesmo voo.")
      return
    }
    if (!qualityConfirmed) {
      setError("Confirme que as imagens são originais do mesmo voo antes de consumir créditos.")
      return
    }

    const controller = new AbortController()
    uploadControllerRef.current = controller
    setIsSubmitting(true)
    setError("")

    try {
      const createdTask = await createModelo3DTask(selectedImages, taskName, { signal: controller.signal })
      const taskState = {
        ...createdTask,
        progress: 0,
        status: createdTask.status || "queued"
      }
      setTask(taskState)
      localStorage.setItem("zenith:lastModelo3DTask", createdTask.task_id)
    } catch (submitError) {
      setError(submitError.message || "Não foi possível criar a reconstrução 3D.")
    } finally {
      if (uploadControllerRef.current === controller) uploadControllerRef.current = null
      setIsSubmitting(false)
    }
  }

  if (decision === "dismissed") {
    return (
      <section className="zenith-3d-dismissed">
        <span className="material-symbols-outlined">view_in_ar</span>
        <p>Visualização 3D não iniciada.</p>
        <button type="button" onClick={() => setDecision("configure")}>Preparar 3D</button>
      </section>
    )
  }

  if (decision === "prompt") {
    return (
      <section className="zenith-3d-invitation" aria-labelledby="zenith-3d-question">
        <div className="zenith-3d-visual" aria-hidden="true">
          <div className="zenith-3d-orbit zenith-3d-orbit-one" />
          <div className="zenith-3d-orbit zenith-3d-orbit-two" />
          <span className="material-symbols-outlined">view_in_ar</span>
        </div>
        <div className="zenith-3d-invitation-copy">
          <span className="zenith-3d-eyebrow">RECONSTRUÇÃO DO TALHÃO</span>
          <h2 id="zenith-3d-question">Quer visualizar esta área da lavoura em 3D?</h2>
          <p>
            Use as fotografias deste levantamento para reconstruir a área e explorar o terreno por outro ângulo.
            O processamento só começa depois da sua confirmação.
          </p>
          <div className="zenith-3d-quick-warning">
            <span className="material-symbols-outlined">photo_camera</span>
            <span>Resultado confiável exige fotos originais do mesmo voo, nítidas e com boa sobreposição.</span>
          </div>
        </div>
        <div className="zenith-3d-invitation-actions">
          <button type="button" className="zenith-3d-primary" onClick={() => setDecision("configure")}>
            <span className="material-symbols-outlined">deployed_code</span>
            Sim, preparar o 3D
          </button>
          <button type="button" className="zenith-3d-secondary" onClick={() => setDecision("dismissed")}>
            Agora não
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="zenith-3d-workspace" aria-labelledby="zenith-3d-title">
      <header className="zenith-3d-workspace-header">
        <div>
          <span className="zenith-3d-eyebrow">ZENITH · FOTOGRAMETRIA</span>
          <h2 id="zenith-3d-title">Reconstrução 3D da área analisada</h2>
          <p>Escolha as melhores imagens do mesmo voo. A análise da IA utilizou o lote completo; o 3D aceita até 40 fotos.</p>
        </div>
        {!task && (
          <button type="button" className="zenith-3d-close" onClick={() => setDecision("prompt")} aria-label="Fechar configuração 3D">
            <span className="material-symbols-outlined">close</span>
          </button>
        )}
      </header>

      {!task ? (
        <>
          <div className="zenith-3d-quality-grid">
            <article>
              <span className="material-symbols-outlined">flight_takeoff</span>
              <strong>Mesmo voo</strong>
              <p>Use uma sequência contínua, com altitude e câmera consistentes.</p>
            </article>
            <article>
              <span className="material-symbols-outlined">filter_center_focus</span>
              <strong>Nitidez real</strong>
              <p>Evite imagens tremidas, escuras, comprimidas ou capturas de tela.</p>
            </article>
            <article>
              <span className="material-symbols-outlined">join_inner</span>
              <strong>Boa sobreposição</strong>
              <p>Mantenha cerca de 70–80% de sobreposição entre fotos consecutivas.</p>
            </article>
          </div>

          <div className="zenith-3d-critical-note" role="note">
            <span className="material-symbols-outlined">warning</span>
            <div>
              <strong>Fotos de folhas isoladas não formam um talhão 3D.</strong>
              <p>Imagens de locais diferentes, sem continuidade visual ou com pouca sobreposição podem consumir créditos e falhar na reconstrução.</p>
            </div>
          </div>

          <div className="zenith-3d-form-row">
            <label>
              <span>Nome da reconstrução</span>
              <input
                value={taskName}
                maxLength={120}
                onChange={(event) => setTaskName(event.target.value)}
                placeholder="Ex.: Talhão norte — voo de agosto"
              />
            </label>
            <div className="zenith-3d-selection-counter">
              <span className="material-symbols-outlined">collections</span>
              <div><strong>{selectedImages.length}/40</strong><small>fotos selecionadas</small></div>
            </div>
          </div>

          {images.length < 2 ? (
            <div className="zenith-3d-insufficient">
              <span className="material-symbols-outlined">add_photo_alternate</span>
              <div><strong>São necessárias pelo menos 2 fotografias.</strong><p>Faça uma nova análise com imagens sequenciais do voo para liberar a reconstrução.</p></div>
            </div>
          ) : (
            <div className="zenith-3d-photo-grid" aria-label="Selecionar fotografias para o modelo 3D">
              {images.map((image, index) => {
                const selected = selectedIds.has(image.id)
                return (
                  <button
                    type="button"
                    className={`zenith-3d-photo ${selected ? "selected" : ""}`}
                    key={image.id}
                    onClick={() => toggleImage(image.id)}
                    aria-pressed={selected}
                  >
                    <img src={image.preview} alt={`Fotografia ${index + 1} do levantamento`} />
                    <span className="zenith-3d-photo-index">{String(index + 1).padStart(2, "0")}</span>
                    <span className="zenith-3d-photo-check material-symbols-outlined">{selected ? "check" : "add"}</span>
                  </button>
                )
              })}
            </div>
          )}

          {images.length > MAX_3D_IMAGES && (
            <p className="zenith-3d-limit-note">
              <span className="material-symbols-outlined">info</span>
              A IA analisou {images.length} fotos. Selecione aqui as 40 imagens com melhor continuidade espacial para o 3D.
            </p>
          )}

          <label className="zenith-3d-confirmation">
            <input type="checkbox" checked={qualityConfirmed} onChange={(event) => setQualityConfirmed(event.target.checked)} />
            <span className="zenith-3d-checkbox"><span className="material-symbols-outlined">check</span></span>
            <span>Confirmo que as imagens selecionadas são fotografias originais do mesmo voo e entendo que esta ação pode consumir créditos.</span>
          </label>

          {error && <div className="zenith-3d-error" role="alert"><span className="material-symbols-outlined">error</span>{error}</div>}

          <div className="zenith-3d-submit-row">
            <div>
              <span className="material-symbols-outlined">cloud_upload</span>
              <p><strong>Envio protegido</strong><small>As credenciais de processamento permanecem somente no servidor.</small></p>
            </div>
            <button
              type="button"
              className="zenith-3d-primary zenith-3d-create"
              disabled={isSubmitting || selectedImages.length < 2 || !qualityConfirmed}
              onClick={createTask}
            >
              <span className={`material-symbols-outlined ${isSubmitting ? "zenith-3d-spin" : ""}`}>
                {isSubmitting ? "progress_activity" : "deployed_code"}
              </span>
              {isSubmitting ? "Enviando imagens…" : "Criar reconstrução 3D"}
            </button>
          </div>
        </>
      ) : (
        <div className="zenith-3d-progress-area">
          <div className="zenith-3d-progress-copy">
            <div className="zenith-3d-progress-icon"><span className="material-symbols-outlined">deployed_code_update</span></div>
            <div>
              <span className="zenith-3d-eyebrow">TAREFA {task.task_id}</span>
              <h3>{statusCopy.title}</h3>
              <p>{statusCopy.message}</p>
            </div>
            <strong>{isCompleted ? "100" : progress}%</strong>
          </div>
          <div className="zenith-3d-progress-track"><span style={{ width: `${isCompleted ? 100 : progress}%` }} /></div>

          {error && <div className="zenith-3d-error" role="alert"><span className="material-symbols-outlined">wifi_off</span>{error}</div>}
          {task.status === "failed" && <div className="zenith-3d-error" role="alert">A reconstrução não pôde ser concluída. Revise a qualidade e a sobreposição das imagens.</div>}
          {task.status === "canceled" && <div className="zenith-3d-error" role="alert">A tarefa foi cancelada antes da conclusão.</div>}

          {isCompleted ? (
            <div className="zenith-3d-viewer-shell" ref={viewerShellRef}>
              <div className="zenith-3d-viewer-horizon" aria-hidden="true" />
              <div className="zenith-3d-soil-base" aria-hidden="true">
                <span>BASE VISUAL DO SOLO</span>
              </div>
              <model-viewer
                className="zenith-3d-model-viewer"
                src={getModelo3DModelUrl(task.task_id)}
                alt="Modelo 3D da área analisada"
                camera-controls
                auto-rotate
                shadow-intensity="1.4"
                shadow-softness="0.8"
                exposure="1"
                interaction-prompt="auto"
                camera-orbit="-25deg 65deg auto"
              />
              <button type="button" className="zenith-3d-viewer-fullscreen" onClick={toggleViewerFullscreen}>
                <span className="material-symbols-outlined">fullscreen</span>
                Tela cheia
              </button>
            </div>
          ) : (
            <div className="zenith-3d-processing-stage" aria-live="polite">
              <div className="zenith-3d-processing-grid" />
              <span className="material-symbols-outlined">view_in_ar</span>
              <strong>O processamento continua no servidor</strong>
              <p>Você pode permanecer nesta tela; o modelo aparecerá automaticamente quando estiver pronto.</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
