import { BACKEND_URL } from '../config'
import { session } from '../utils/session'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'ERROR', data = null } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.data = data
  }
}

let onUnauthorized = null
/** AuthContext registra aquí qué hacer cuando el servidor responde 401 en una ruta privada. */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

const TIMEOUT_MS = 30000

function messageFrom(data) {
  if (!data || typeof data !== 'object') return null
  for (const k of ['error', 'message', 'mensaje', 'msg']) {
    if (typeof data[k] === 'string' && data[k].trim()) return data[k]
  }
  return null
}

export async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  const headers = { Accept: 'application/json' }
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  // La sesión viaja en la cookie httpOnly; el Bearer solo se usa si el login devolvió un token en el cuerpo.
  if (auth) {
    const token = session.getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort('timeout'), TIMEOUT_MS)
  if (signal) signal.addEventListener('abort', () => ctrl.abort(signal.reason), { once: true })

  let res
  try {
    res = await fetch(`${BACKEND_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'include', // envía y recibe la cookie de sesión (sii_token)
      signal: ctrl.signal,
    })
  } catch (err) {
    if (ctrl.signal.aborted && ctrl.signal.reason === 'timeout') {
      throw new ApiError('El servidor tardó demasiado en responder. Intenta de nuevo.', { code: 'TIMEOUT' })
    }
    if (signal?.aborted) throw new ApiError('Solicitud cancelada.', { code: 'ABORTED' })
    throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión o intenta más tarde.', {
      code: 'NETWORK',
    })
  } finally {
    clearTimeout(timer)
  }

  let data = null
  const text = await res.text()
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = null
    }
  }

  if (res.ok) return data

  if (res.status === 401 && auth) {
    if (onUnauthorized) onUnauthorized()
    throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', { status: 401, code: 'UNAUTHORIZED', data })
  }
  if (res.status >= 500) {
    throw new ApiError(messageFrom(data) || 'El servidor no está disponible en este momento. Intenta de nuevo en unos minutos.', {
      status: res.status,
      code: 'SERVER',
      data,
    })
  }
  throw new ApiError(messageFrom(data) || `La solicitud falló (${res.status}).`, {
    status: res.status,
    code: res.status === 409 ? 'CONFLICT' : 'REQUEST',
    data,
  })
}
