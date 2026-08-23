import { useMemo, useRef, useState } from "react"
import styles from "../../../../styles/App/MonitoramentoView.module.css"

const INITIAL_VIEW = { rotation: -8, tilt: 58, zoom: 0.88 }

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

function percentage(value) {
  const number = Number(value) || 0
  return Math.round(clamp(number, 0, 1) * 100)
}

function normalizeZones(zones, imageSize) {
  if (!imageSize.width || !imageSize.height) return []

  return Array.from(zones || [])
    .filter((zone) => Number(zone?.width) > 0 && Number(zone?.height) > 0)
    .map((zone, index) => {
      const areaRatio = clamp(Number(zone.area_ratio) || 0, 0, 1)
      const meanDensity = clamp(Number(zone.mean_density) || 0, 0, 1)
      const elevation = clamp(18 + areaRatio * 520 + (1 - meanDensity) * 14, 22, 52)

      return {
        id: `${zone.x}-${zone.y}-${index}`,
        index: index + 1,
        left: clamp((Number(zone.x) / imageSize.width) * 100, 0, 100),
        top: clamp((Number(zone.y) / imageSize.height) * 100, 0, 100),
        width: clamp((Number(zone.width) / imageSize.width) * 100, 1.5, 100),
        height: clamp((Number(zone.height) / imageSize.height) * 100, 1.5, 100),
        elevation,
        area: Math.max(0.1, areaRatio * 100)
      }
    })
}

export default function Monitoring3DMap({ imageSrc, result }) {
  const sceneRef = useRef(null)
  const dragRef = useRef(null)
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 })
  const [view, setView] = useState(INITIAL_VIEW)
  const [isDragging, setIsDragging] = useState(false)

  const zones = useMemo(
    () => normalizeZones(result?.failure_zones, imageSize),
    [result?.failure_zones, imageSize]
  )

  const coverage = percentage(result?.coverage)
  const failureScore = percentage(result?.failure_score)
  const pathCoverage = percentage(result?.path_coverage)

  const rotate = (amount) => {
    setView((current) => ({ ...current, rotation: current.rotation + amount }))
  }

  const zoom = (amount) => {
    setView((current) => ({ ...current, zoom: clamp(current.zoom + amount, 0.68, 1.28) }))
  }

  const handlePointerDown = (event) => {
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      rotation: view.rotation,
      tilt: view.tilt
    }
    setIsDragging(true)
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  const handlePointerMove = (event) => {
    if (!dragRef.current) return
    const deltaX = event.clientX - dragRef.current.x
    const deltaY = event.clientY - dragRef.current.y
    setView((current) => ({
      ...current,
      rotation: dragRef.current.rotation + deltaX * 0.28,
      tilt: clamp(dragRef.current.tilt - deltaY * 0.18, 38, 72)
    }))
  }

  const stopDragging = (event) => {
    dragRef.current = null
    setIsDragging(false)
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }

  const openFullscreen = async () => {
    if (!sceneRef.current?.requestFullscreen) return
    await sceneRef.current.requestFullscreen()
  }

  return (
    <div className={styles.mapa3dPainel} ref={sceneRef}>
      <div className={styles.mapa3dCabecalho}>
        <div>
          <span className={styles.mapa3dEyebrow}>VISUALIZAÇÃO ESPACIAL ESTIMADA</span>
          <strong>Mapa 3D de falhas</strong>
          <p>Arraste para girar e localizar as regiões críticas detectadas na imagem.</p>
        </div>
        <span className={styles.mapa3dBadge}>
          <span className="material-symbols-outlined">deployed_code</span>
          2.5D
        </span>
      </div>

      <div className={styles.mapa3dMetricas}>
        <div><span>Cobertura</span><strong>{coverage}%</strong></div>
        <div><span>Índice de falha</span><strong>{failureScore}%</strong></div>
        <div><span>Zonas críticas</span><strong>{zones.length}</strong></div>
        <div><span>Caminhos ignorados</span><strong>{pathCoverage}%</strong></div>
      </div>

      <div
        className={`${styles.mapa3dCena} ${isDragging ? styles.mapa3dCenaArrastando : ""}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
        onDoubleClick={() => setView(INITIAL_VIEW)}
        role="application"
        aria-label="Mapa tridimensional interativo das falhas da plantação"
      >
        <div className={styles.mapa3dHorizonte} />
        <div
          className={styles.mapa3dTerreno}
          style={{
            transform: `rotateX(${view.tilt}deg) rotateZ(${view.rotation}deg) scale(${view.zoom})`
          }}
        >
          <div className={styles.mapa3dBaseSolo} />
          <div className={styles.mapa3dSuperficie}>
            <img
              src={imageSrc}
              alt="Mapa de densidade utilizado na visualização 3D"
              draggable="false"
              onLoad={(event) => setImageSize({
                width: event.currentTarget.naturalWidth,
                height: event.currentTarget.naturalHeight
              })}
            />
            <div className={styles.mapa3dMalha} aria-hidden="true" />
            {zones.map((zone) => (
              <div
                className={styles.mapa3dZona}
                key={zone.id}
                style={{
                  left: `${zone.left}%`,
                  top: `${zone.top}%`,
                  width: `${zone.width}%`,
                  height: `${zone.height}%`,
                  "--zona-altura": `${zone.elevation}px`
                }}
                title={`Falha crítica ${zone.index} · aproximadamente ${zone.area.toFixed(1)}% da área analisável`}
              >
                <span className={styles.mapa3dZonaPilar} aria-hidden="true" />
                <strong>{zone.index}</strong>
              </div>
            ))}
          </div>
        </div>

        {zones.length === 0 && (
          <div className={styles.mapa3dSemZonas}>
            <span className="material-symbols-outlined">verified</span>
            Nenhuma zona crítica delimitada nesta imagem
          </div>
        )}

        <div className={styles.mapa3dDica}>
          <span className="material-symbols-outlined">swipe</span>
          Arraste para explorar · duplo clique redefine
        </div>
      </div>

      <div className={styles.mapa3dControles} aria-label="Controles do mapa 3D">
        <button type="button" onClick={() => rotate(-12)} aria-label="Girar para a esquerda">
          <span className="material-symbols-outlined">rotate_left</span>
        </button>
        <button type="button" onClick={() => rotate(12)} aria-label="Girar para a direita">
          <span className="material-symbols-outlined">rotate_right</span>
        </button>
        <button type="button" onClick={() => zoom(0.08)} aria-label="Aproximar mapa">
          <span className="material-symbols-outlined">zoom_in</span>
        </button>
        <button type="button" onClick={() => zoom(-0.08)} aria-label="Afastar mapa">
          <span className="material-symbols-outlined">zoom_out</span>
        </button>
        <button type="button" onClick={() => setView(INITIAL_VIEW)} aria-label="Redefinir visualização">
          <span className="material-symbols-outlined">center_focus_strong</span>
        </button>
        <button type="button" onClick={openFullscreen} aria-label="Abrir mapa em tela cheia">
          <span className="material-symbols-outlined">fullscreen</span>
        </button>
      </div>

      <p className={styles.mapa3dNota}>
        A altura dos marcadores destaca a relevância visual das falhas; ela não representa a altura física das plantas ou do terreno.
      </p>
    </div>
  )
}
