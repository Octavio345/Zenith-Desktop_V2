import { useEffect, useRef, useState } from "react"
import "@arcgis/core/assets/esri/themes/light/main.css"

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)
const SCENE_TILT = 58
const SCENE_HEADING = -18

const hexWithOpacity = (hex, opacity) => {
  const normalized = String(hex || "#22c55e").replace("#", "")
  const value = Number.parseInt(normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized, 16)

  return [
    (value >> 16) & 255,
    (value >> 8) & 255,
    value & 255,
    opacity,
  ]
}

const getValidCoordinates = (area) => (area.coordinates || [])
  .map(([latitude, longitude]) => [Number(longitude), Number(latitude)])
  .filter(([longitude, latitude]) => Number.isFinite(longitude) && Number.isFinite(latitude))

const closeRing = (coordinates) => {
  if (coordinates.length < 3) return coordinates
  const [firstLongitude, firstLatitude] = coordinates[0]
  const [lastLongitude, lastLatitude] = coordinates[coordinates.length - 1]

  return firstLongitude === lastLongitude && firstLatitude === lastLatitude
    ? coordinates
    : [...coordinates, coordinates[0]]
}

const getFocusExtent = (areas, selectedAreaId, Extent) => {
  const selectedArea = areas.find((area) => area.id === selectedAreaId)
  const focusAreas = selectedArea ? [selectedArea] : areas
  const coordinates = focusAreas.flatMap(getValidCoordinates)

  if (coordinates.length < 3) return null

  const longitudes = coordinates.map(([longitude]) => longitude)
  const latitudes = coordinates.map(([, latitude]) => latitude)
  const xmin = Math.min(...longitudes)
  const xmax = Math.max(...longitudes)
  const ymin = Math.min(...latitudes)
  const ymax = Math.max(...latitudes)
  const padding = Math.max(Math.max(xmax - xmin, ymax - ymin) * 0.3, 0.0015)

  return new Extent({
    xmin: xmin - padding,
    ymin: ymin - padding,
    xmax: xmax + padding,
    ymax: ymax + padding,
    spatialReference: { wkid: 4326 },
  })
}

const renderAreaGraphics = (runtime, areas, selectedAreaId) => {
  const { graphicsLayer, Graphic, Polygon, SimpleFillSymbol } = runtime
  graphicsLayer.removeAll()

  areas.forEach((area) => {
    const ring = closeRing(getValidCoordinates(area))

    if (ring.length < 3) return

    const isSelected = area.id === selectedAreaId
    graphicsLayer.add(new Graphic({
      geometry: new Polygon({
        rings: [ring],
        spatialReference: { wkid: 4326 },
      }),
      attributes: { farmAreaId: area.id },
      symbol: new SimpleFillSymbol({
        color: hexWithOpacity(area.color, isSelected ? 0.42 : 0.24),
        outline: {
          color: isSelected ? "#facc15" : area.color,
          width: isSelected ? 2.5 : 1.5,
        },
      }),
    }))
  })
}

export default function FarmMap3D({
  areas,
  selectedAreaId,
  initialView,
  apiKey,
  onAreaSelect,
  onCameraChange,
  activationToken,
}) {
  const containerRef = useRef(null)
  const runtimeRef = useRef(null)
  const initialViewRef = useRef(initialView)
  const areasRef = useRef(areas)
  const selectedAreaIdRef = useRef(selectedAreaId)
  const onAreaSelectRef = useRef(onAreaSelect)
  const onCameraChangeRef = useRef(onCameraChange)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => { onAreaSelectRef.current = onAreaSelect }, [onAreaSelect])
  useEffect(() => { onCameraChangeRef.current = onCameraChange }, [onCameraChange])
  useEffect(() => {
    initialViewRef.current = initialView
    const view = runtimeRef.current?.view
    const center = initialView?.center
    if (!view || !Array.isArray(center)) return

    view.goTo({
      center,
      zoom: clamp(Number(initialView.zoom) || 15, 14, 19),
      tilt: SCENE_TILT,
      heading: SCENE_HEADING,
    }, { duration: 650 }).catch(() => {})
  }, [initialView])

  useEffect(() => {
    let cancelled = false
    let view = null

    const startScene = async () => {
      if (!apiKey) {
        setErrorMessage("Visualização 3D indisponível: configure a credencial ArcGIS existente para usar este modo.")
        return
      }

      try {
        const [
          { default: esriConfig },
          { default: ArcGISMap },
          { default: SceneView },
          { default: GraphicsLayer },
          { default: Graphic },
          { default: Polygon },
          { default: Extent },
          { default: SimpleFillSymbol },
        ] = await Promise.all([
          import("@arcgis/core/config.js"),
          import("@arcgis/core/Map.js"),
          import("@arcgis/core/views/SceneView.js"),
          import("@arcgis/core/layers/GraphicsLayer.js"),
          import("@arcgis/core/Graphic.js"),
          import("@arcgis/core/geometry/Polygon.js"),
          import("@arcgis/core/geometry/Extent.js"),
          import("@arcgis/core/symbols/SimpleFillSymbol.js"),
        ])

        if (cancelled || !containerRef.current) return

        esriConfig.apiKey = apiKey

        const graphicsLayer = new GraphicsLayer({
          title: "Talhões",
          elevationInfo: { mode: "on-the-ground" },
        })

        const center = initialViewRef.current?.center || [-47.9292, -15.7801]
        const zoom = clamp(Number(initialViewRef.current?.zoom) || 15, 14, 19)
        const map = new ArcGISMap({
          basemap: "satellite",
          ground: "world-elevation",
          layers: [graphicsLayer],
        })

        view = new SceneView({
          container: containerRef.current,
          map,
          center,
          zoom,
          qualityProfile: window.matchMedia("(max-width: 760px)").matches ? "medium" : "high",
          environment: {
            atmosphere: { quality: "high" },
            lighting: { directShadowsEnabled: true },
          },
          ui: { components: [] },
        })

        runtimeRef.current = { view, graphicsLayer, Graphic, Polygon, SimpleFillSymbol, Extent }
        await view.when()

        if (cancelled) return

        renderAreaGraphics(runtimeRef.current, areasRef.current, selectedAreaIdRef.current)

        const focusExtent = getFocusExtent(areasRef.current, selectedAreaIdRef.current, Extent)
        await view.goTo(focusExtent
          ? { target: focusExtent, tilt: SCENE_TILT, heading: SCENE_HEADING }
          : { center, zoom, tilt: SCENE_TILT, heading: SCENE_HEADING },
        { duration: 0 })

        view.on("click", async (event) => {
          const result = await view.hitTest(event)
          const graphic = result.results.find((item) => item.graphic?.attributes?.farmAreaId)?.graphic
          if (graphic?.attributes?.farmAreaId !== undefined) onAreaSelectRef.current?.(graphic.attributes.farmAreaId)
        })
      } catch {
        if (!cancelled) setErrorMessage("Visualização 3D não disponível neste dispositivo.")
      }
    }

    startScene()

    return () => {
      cancelled = true
      if (view) {
        const center = view.center
        onCameraChangeRef.current?.({
          center: center ? [center.longitude, center.latitude] : null,
          zoom: clamp(Number(view.zoom) || 15, 3, 20),
        })
        view.destroy()
      }
      runtimeRef.current = null
    }
  }, [apiKey])

  useEffect(() => {
    areasRef.current = areas
    selectedAreaIdRef.current = selectedAreaId
    const runtime = runtimeRef.current
    if (!runtime) return

    renderAreaGraphics(runtime, areas, selectedAreaId)
    const focusExtent = getFocusExtent(areas, selectedAreaId, runtime.Extent)
    if (focusExtent) {
      runtime.view.goTo({ target: focusExtent, tilt: SCENE_TILT, heading: SCENE_HEADING }, { duration: 420 }).catch(() => {})
    }
  }, [areas, selectedAreaId])

  useEffect(() => {
    const view = runtimeRef.current?.view
    if (!view) return

    const frame = window.requestAnimationFrame(() => {
      view.resize()
      view.focus?.()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [activationToken])

  const focusScene = () => {
    const view = runtimeRef.current?.view
    view?.resize()
    view?.focus?.()
  }

  return (
    <div className="farm-map-3d" aria-label="Visualização tridimensional da propriedade" onPointerDown={focusScene}>
      <div ref={containerRef} className="farm-map-3d__scene" />
      {errorMessage && <p className="farm-map-3d__error" role="status">{errorMessage}</p>}
    </div>
  )
}
