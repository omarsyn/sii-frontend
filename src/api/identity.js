// Identidad del estudiante (número de control y nombre) para los endpoints de asesorías.
// El contrato del backend (openapi) pide estos datos en el cuerpo de POST /asesorias y
// POST /asesorias/inscripcion; salen del perfil (GET /api/local/estudiante).
import { ApiError } from './client'

let current = null
let failure = null
let waiters = []

export function setIdentity(who) {
  current = who
  failure = null
  waiters.splice(0).forEach((w) => w.resolve(who))
}

export function failIdentity(err) {
  current = null
  failure = err
  waiters.splice(0).forEach((w) => w.reject(err))
}

export function resetIdentity() {
  current = null
  failure = null
}

/** Espera a que el perfil cargue; así las páginas no tienen que coordinarse con él. */
export function getIdentity() {
  if (current) return Promise.resolve(current)
  if (failure) {
    return Promise.reject(new ApiError('No pudimos identificar tu cuenta porque el perfil no cargó. Recarga la página.', { code: 'NO_IDENTITY' }))
  }
  return new Promise((resolve, reject) => waiters.push({ resolve, reject }))
}
