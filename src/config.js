// Única URL a la que habla el frontend: tu backend Node.js (nunca la API del SII).
export const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/+$/, '')

// Datos de demostración para desarrollar sin backend. Debe ser false en producción.
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'

// Calificaciones (escala 0-100). 70 es la aprobatoria.
export const NOTA_APROBATORIA = 70
export const NOTA_BUENA = 80
