// Normaliza texto para comparar sin acentos ni mayúsculas.
export const norm = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()

// "numeroControl" / "numero_control" -> "Numero control"
export function humanize(key) {
  const s = String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_\-.]+/g, ' ')
    .trim()
    .toLowerCase()
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// "JUAN PÉREZ LÓPEZ" -> "Juan Pérez López"
export function titleCase(str) {
  if (!str) return ''
  return String(str)
    .toLowerCase()
    .replace(/(^|\s|-)(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase())
    .replace(/\b(De|Del|La|Las|Los|Y|E|A|Al|O|U|En|Con|Para|Por|El)\b/g, (w, _m, offset) => (offset === 0 ? w : w.toLowerCase()))
    .replace(/\b(Ii|Iii|Iv|Vi|Vii|Viii|Ix)\b/g, (w) => w.toUpperCase()) // números romanos: "Taller De Investigacion Ii" -> "... II"
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return '?'
  return (parts[0][0] + (parts.length > 1 ? parts[1][0] : '')).toUpperCase()
}

const fechaFmt = new Intl.DateTimeFormat('es-MX', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatFechaHora(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Fecha por definir'
  return fechaFmt.format(d)
}

// ISO -> valor para <input type="datetime-local"> en hora local
export function isoToLocalInput(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// valor de datetime-local -> ISO (UTC)
export function localInputToIso(value) {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function minutesToHHMM(min) {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
