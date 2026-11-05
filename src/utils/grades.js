import { NOTA_APROBATORIA, NOTA_BUENA } from '../config'

export function toNumber(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

// Semáforo: verde >= 80, amarillo 70-79, rojo < 70.
export function gradeLevel(n) {
  if (n === null || n === undefined) return { key: 'none', label: 'Sin calificar' }
  if (n >= NOTA_BUENA) return { key: 'ok', label: 'Bien' }
  if (n >= NOTA_APROBATORIA) return { key: 'warn', label: 'Justo' }
  return { key: 'bad', label: 'No aprobada' }
}

export function average(nums) {
  const valid = nums.filter((n) => typeof n === 'number' && Number.isFinite(n))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

export function fmtGrade(n) {
  if (n === null || n === undefined) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}
