// Cliente del backend propio (BFF). Contrato: openapi del Integrante 2 (ver API_CONTRACT.md).
//
//   POST /api/local/login                  { email, password } -> 200 + cookie httpOnly `sii_token` (el cuerpo puede traer { token })
//   POST /api/local/logout                 -> borra la cookie (pendiente de confirmar con el Integrante 2)
//   GET  /api/local/estudiante             -> Estudiante
//   GET  /api/local/calificaciones         -> [ { materia{...}, calificaiones[...] } ]
//   GET  /api/local/kardex                 -> { porcentaje_avance, kardex: [...] }
//   GET  /api/local/horarios               -> [ { nombre_materia, lunes, lunes_clave_salon, ... } ]
//   GET  /api/local/asesorias              -> [ Asesoria ]
//   POST /api/local/asesorias              AsesoriaInput -> 201
//   POST /api/local/asesorias/inscripcion  InscripcionInput -> 201 | 409 (ya inscrito)
import { request } from './client'

const L = '/api/local'

function findToken(payload, depth = 0) {
  if (!payload || typeof payload !== 'object' || depth > 4) return null
  if (typeof payload.token === 'string' && payload.token) return payload.token
  for (const v of Object.values(payload)) {
    const t = findToken(v, depth + 1)
    if (t) return t
  }
  return null
}

/** Con cookie httpOnly el servidor no devuelve el token en el cuerpo: devuelve null y la sesión queda en la cookie. */
export async function login(email, password) {
  const payload = await request(`${L}/login`, { method: 'POST', body: { email, password }, auth: false })
  return findToken(payload)
}

/** Borra la cookie de sesión. Solo el servidor puede hacerlo (es httpOnly). */
export const logout = () => request(`${L}/logout`, { method: 'POST', auth: false })

// Datos académicos (proxy al SII ITC)
export const getPerfil = () => request(`${L}/estudiante`)
export const getCalificaciones = () => request(`${L}/calificaciones`)
export const getKardex = () => request(`${L}/kardex`)
export const getHorarios = () => request(`${L}/horarios`)

// Asesorías (Supabase)
export const listAsesorias = () => request(`${L}/asesorias`)

// Cuerpos exactamente como los define el contrato (AsesoriaInput / InscripcionInput).
export const createAsesoria = (body) => request(`${L}/asesorias`, { method: 'POST', body })
export const inscribirse = (body) => request(`${L}/asesorias/inscripcion`, { method: 'POST', body })
