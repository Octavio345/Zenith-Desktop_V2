const DEFAULT_API_BASE_URL = "https://tccamsamericana-zenith-api-modelo-3d.hf.space"
const UPLOAD_TIMEOUT_MS = 30 * 60 * 1000

function normalizeApiBaseUrl(value) {
  return String(value || DEFAULT_API_BASE_URL)
    .trim()
    .replace(/\/+$/, "")
}

function formatApiDetail(detail) {
  if (typeof detail === "string") return detail

  if (Array.isArray(detail)) {
    return detail
      .map((item) => item?.msg || item?.message || String(item))
      .filter(Boolean)
      .join(" ")
  }

  if (detail && typeof detail === "object") {
    return detail.message || detail.msg || JSON.stringify(detail)
  }

  return "A API 3D não conseguiu concluir a solicitação."
}

async function readResponse(response) {
  const data = await response.json().catch(() => ({}))
  if (response.ok) return data

  const error = new Error(formatApiDetail(data?.detail || data?.message))
  error.status = response.status
  error.data = data
  throw error
}

const MODELO_3D_API_BASE_URL = normalizeApiBaseUrl(import.meta.env.VITE_MODELO_3D_API_URL)

export async function createModelo3DTask(images, name, options = {}) {
  const files = Array.from(images || [])
    .map((entry) => entry?.file instanceof File ? entry.file : entry)
    .filter((file) => file instanceof File)

  if (files.length < 2 || files.length > 40) {
    throw new Error("Selecione entre 2 e 40 fotografias para criar o modelo 3D.")
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS)
  const abortRequest = () => controller.abort()

  if (options.signal) {
    if (options.signal.aborted) controller.abort()
    else options.signal.addEventListener("abort", abortRequest, { once: true })
  }

  const body = new FormData()
  files.forEach((file) => body.append("images", file, file.name))
  if (name?.trim()) body.append("name", name.trim())

  try {
    const response = await fetch(`${MODELO_3D_API_BASE_URL}/webodm/tasks`, {
      method: "POST",
      body,
      signal: controller.signal
    })
    return await readResponse(response)
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("O envio demorou mais de 30 minutos e foi interrompido. Verifique a conexão e tente novamente.")
    }
    throw error
  } finally {
    window.clearTimeout(timeoutId)
    options.signal?.removeEventListener("abort", abortRequest)
  }
}

export async function getModelo3DTask(taskId, options = {}) {
  const response = await fetch(`${MODELO_3D_API_BASE_URL}/webodm/tasks/${encodeURIComponent(taskId)}`, {
    signal: options.signal
  })
  return readResponse(response)
}

export function getModelo3DViewerUrl(taskId) {
  return `${MODELO_3D_API_BASE_URL}/viewer/${encodeURIComponent(taskId)}`
}

export { MODELO_3D_API_BASE_URL }
