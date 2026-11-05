// El contrato del backend no expone "mis inscripciones": GET /asesorias solo trae los datos
// públicos de cada asesoría. Para saber en cuáles te apuntaste desde este navegador se guarda
// el id de cada inscripción exitosa (por número de control). Si el backend agrega un endpoint
// de inscripciones, basta con reemplazar esto en src/api/real.js.
const key = (nc) => `sii.inscripciones.${nc}`

export function getInscritas(numeroControl) {
  try {
    const raw = JSON.parse(localStorage.getItem(key(numeroControl)) || '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function addInscrita(numeroControl, asesoriaId, comentarios = '') {
  try {
    const list = getInscritas(numeroControl).filter((i) => i.id !== asesoriaId)
    list.push({ id: asesoriaId, comentarios })
    localStorage.setItem(key(numeroControl), JSON.stringify(list))
  } catch {
    /* almacenamiento no disponible: la inscripción en el servidor sí quedó */
  }
}
