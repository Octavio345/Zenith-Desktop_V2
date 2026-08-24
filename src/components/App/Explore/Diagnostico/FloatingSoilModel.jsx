import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

const MAX_SAMPLED_VERTICES = 24000

function seededRandom(seed = 9187) {
  let value = seed >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

function createSoilTexture(kind, renderer) {
  const canvas = document.createElement("canvas")
  canvas.width = 512
  canvas.height = kind === "top" ? 512 : 256
  const context = canvas.getContext("2d")
  const random = seededRandom(kind === "top" ? 7301 : 2719)

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height)
  if (kind === "top") {
    gradient.addColorStop(0, "#4b3320")
    gradient.addColorStop(1, "#302116")
  } else {
    gradient.addColorStop(0, "#3e2b1d")
    gradient.addColorStop(0.45, "#2f2117")
    gradient.addColorStop(1, "#1f1711")
  }
  context.fillStyle = gradient
  context.fillRect(0, 0, canvas.width, canvas.height)

  const grains = kind === "top" ? 1700 : 950
  for (let index = 0; index < grains; index += 1) {
    const light = random() > 0.72
    context.fillStyle = light
      ? `rgba(190, 139, 78, ${0.08 + random() * 0.14})`
      : `rgba(8, 6, 4, ${0.08 + random() * 0.18})`
    const radius = 0.35 + random() * (kind === "top" ? 1.7 : 1.25)
    context.beginPath()
    context.arc(random() * canvas.width, random() * canvas.height, radius, 0, Math.PI * 2)
    context.fill()
  }

  if (kind === "side") {
    for (let layer = 0; layer < 7; layer += 1) {
      const baseY = 28 + layer * 31 + random() * 12
      context.beginPath()
      context.moveTo(0, baseY)
      for (let x = 0; x <= canvas.width; x += 24) {
        context.lineTo(x, baseY + Math.sin(x * 0.035 + layer) * 3 + (random() - 0.5) * 3)
      }
      context.strokeStyle = layer % 2
        ? "rgba(159, 111, 61, 0.12)"
        : "rgba(8, 6, 4, 0.22)"
      context.lineWidth = 2
      context.stroke()
    }
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy())
  return texture
}

function sampledBaseHeight(root, fallback) {
  const meshes = []
  let vertexCount = 0

  root.updateMatrixWorld(true)
  root.traverse((object) => {
    const positions = object.isMesh ? object.geometry?.attributes?.position : null
    if (!positions) return
    meshes.push({ object, positions })
    vertexCount += positions.count
  })

  if (!vertexCount) return fallback
  const stride = Math.max(1, Math.ceil(vertexCount / MAX_SAMPLED_VERTICES))
  const heights = []
  const point = new THREE.Vector3()

  meshes.forEach(({ object, positions }) => {
    for (let index = 0; index < positions.count; index += stride) {
      point.fromBufferAttribute(positions, index).applyMatrix4(object.matrixWorld)
      if (Number.isFinite(point.y)) heights.push(point.y)
    }
  })

  if (!heights.length) return fallback
  heights.sort((a, b) => a - b)
  return heights[Math.floor((heights.length - 1) * 0.035)]
}

function preparePlantMaterials(root, clippingPlane) {
  root.traverse((object) => {
    if (!object.isMesh) return
    object.castShadow = true
    object.receiveShadow = true

    const prepare = (source) => {
      const material = source.clone()
      material.clippingPlanes = [clippingPlane]
      material.clipShadows = true
      material.needsUpdate = true
      return material
    }

    object.material = Array.isArray(object.material)
      ? object.material.map(prepare)
      : prepare(object.material)
  })
}

function disposeObject(root) {
  const textures = new Set()
  root.traverse((object) => {
    object.geometry?.dispose?.()
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value?.isTexture) textures.add(value)
      })
      material.dispose?.()
    })
  })
  textures.forEach((texture) => texture.dispose())
}

export default function FloatingSoilModel({ modelUrl, fallbackUrl }) {
  const mountRef = useRef(null)
  const shellRef = useRef(null)
  const controlsRef = useRef(null)
  const [loading, setLoading] = useState(0)
  const [status, setStatus] = useState("loading")

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return undefined

    let disposed = false
    let animationFrame = 0
    let sceneRoot = null

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.01, 10000)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.localClippingEnabled = true
    renderer.domElement.setAttribute("role", "img")
    renderer.domElement.setAttribute("aria-label", "Plantação reconstruída sobre um bloco flutuante de terra")
    mount.appendChild(renderer.domElement)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.07
    controls.enablePan = false
    controls.minPolarAngle = Math.PI * 0.08
    controls.maxPolarAngle = Math.PI * 0.92
    controlsRef.current = controls

    scene.add(new THREE.HemisphereLight(0xc8f5dd, 0x352315, 2.2))
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.4)
    keyLight.position.set(4, 7, 5)
    keyLight.castShadow = true
    keyLight.shadow.mapSize.set(2048, 2048)
    scene.add(keyLight)

    const rimLight = new THREE.DirectionalLight(0x36ffc0, 1.1)
    rimLight.position.set(-5, 2, -4)
    scene.add(rimLight)

    const resize = () => {
      const width = Math.max(1, mount.clientWidth)
      const height = Math.max(1, mount.clientHeight)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
      renderer.setSize(width, height, false)
    }
    const resizeObserver = new ResizeObserver(resize)
    resizeObserver.observe(mount)
    resize()

    const loader = new GLTFLoader()
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return
        const plant = gltf.scene
        const bounds = new THREE.Box3().setFromObject(plant)
        const size = bounds.getSize(new THREE.Vector3())
        const center = bounds.getCenter(new THREE.Vector3())

        if (![size.x, size.y, size.z].every((value) => Number.isFinite(value) && value > 0)) {
          setStatus("error")
          return
        }

        const baseHeight = sampledBaseHeight(plant, bounds.min.y)
        const footprint = Math.max(size.x, size.z)
        const canopyHeight = Math.max(size.y, footprint * 0.1)
        const blockHeight = THREE.MathUtils.clamp(canopyHeight * 0.12, footprint * 0.055, footprint * 0.16)
        const overlap = blockHeight * 0.12
        const clippingPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), overlap * 0.92)

        preparePlantMaterials(plant, clippingPlane)
        plant.position.set(-center.x, -baseHeight - overlap * 0.38, -center.z)

        const topTexture = createSoilTexture("top", renderer)
        const sideTexture = createSoilTexture("side", renderer)
        const topMaterial = new THREE.MeshStandardMaterial({ map: topTexture, color: 0xffffff, roughness: 0.96, metalness: 0 })
        const sideMaterial = new THREE.MeshStandardMaterial({ map: sideTexture, color: 0xf0dfcd, roughness: 1, metalness: 0 })
        const bottomMaterial = new THREE.MeshStandardMaterial({ color: 0x1a120d, roughness: 1, metalness: 0 })
        const blockGeometry = new THREE.BoxGeometry(size.x * 1.025, blockHeight, size.z * 1.025, 1, 1, 1)
        const block = new THREE.Mesh(blockGeometry, [sideMaterial, sideMaterial, topMaterial, bottomMaterial, sideMaterial, sideMaterial])
        block.position.y = -blockHeight / 2
        block.castShadow = true
        block.receiveShadow = true

        sceneRoot = new THREE.Group()
        sceneRoot.add(block, plant)
        scene.add(sceneRoot)

        const visibleHeight = Math.max(bounds.max.y - baseHeight, blockHeight)
        const radius = Math.max(size.x, size.z, visibleHeight) * 0.72
        camera.near = Math.max(radius / 500, 0.01)
        camera.far = radius * 80
        camera.position.set(radius * 1.38, radius * 0.92, radius * 1.5)
        camera.updateProjectionMatrix()
        controls.target.set(0, visibleHeight * 0.26, 0)
        controls.minDistance = radius * 0.58
        controls.maxDistance = radius * 5.2
        controls.autoRotate = !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        controls.autoRotateSpeed = 0.55
        const stopAutoRotate = () => {
          controls.autoRotate = false
          controls.removeEventListener("start", stopAutoRotate)
        }
        controls.addEventListener("start", stopAutoRotate)
        controls.update()
        controls.saveState()

        const shadowRange = radius * 1.7
        Object.assign(keyLight.shadow.camera, {
          left: -shadowRange,
          right: shadowRange,
          top: shadowRange,
          bottom: -shadowRange,
          near: 0.01,
          far: radius * 12
        })
        keyLight.shadow.camera.updateProjectionMatrix()

        setLoading(100)
        setStatus("ready")
      },
      (event) => {
        if (disposed || !event.total) return
        setLoading(Math.min(99, Math.round((event.loaded / event.total) * 100)))
      },
      () => {
        if (!disposed) setStatus("error")
      }
    )

    const animate = () => {
      controls.update()
      renderer.render(scene, camera)
      animationFrame = window.requestAnimationFrame(animate)
    }
    animate()

    return () => {
      disposed = true
      window.cancelAnimationFrame(animationFrame)
      resizeObserver.disconnect()
      controls.dispose()
      controlsRef.current = null
      if (sceneRoot) disposeObject(sceneRoot)
      renderer.dispose()
      renderer.forceContextLoss()
      renderer.domElement.remove()
    }
  }, [modelUrl])

  const toggleFullscreen = async () => {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await shellRef.current?.requestFullscreen?.()
  }

  return (
    <div className="zenith-soil-model" ref={shellRef}>
      <div className="zenith-soil-model__viewport" ref={mountRef} />

      {status === "loading" && (
        <div className="zenith-soil-model__state" aria-live="polite">
          <span className="material-symbols-outlined zenith-3d-spin">progress_activity</span>
          <strong>Preparando bloco 3D</strong>
          <p>Carregando plantação e ajustando o recorte de terra… {loading}%</p>
        </div>
      )}

      {status === "error" && (
        <div className="zenith-soil-model__state" role="alert">
          <span className="material-symbols-outlined">deployed_code_alert</span>
          <strong>Não foi possível montar o bloco 3D</strong>
          <a href={fallbackUrl} target="_blank" rel="noreferrer">Abrir visualizador original</a>
        </div>
      )}

      {status === "ready" && (
        <div className="zenith-soil-model__hint">
          <span className="material-symbols-outlined">3d_rotation</span>
          Arraste para girar · use o zoom para aproximar
        </div>
      )}

      <div className="zenith-soil-model__controls">
        <button type="button" onClick={() => controlsRef.current?.reset()} aria-label="Redefinir posição do modelo 3D">
          <span className="material-symbols-outlined">restart_alt</span>
          Redefinir
        </button>
        <button type="button" onClick={toggleFullscreen} aria-label="Alternar visualização em tela cheia">
          <span className="material-symbols-outlined">fullscreen</span>
          Tela cheia
        </button>
      </div>
    </div>
  )
}
