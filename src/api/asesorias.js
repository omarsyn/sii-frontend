// Arma las vistas de asesorías a partir de GET /asesorias (único listado del contrato).
// El listado no dice cuáles son tuyas ni en cuáles estás inscrito, así que se deduce aquí:
//  - tuyas: coincide el número de control del tutor (si viene) o el nombre del tutor;
//  - inscrito: ids guardados al inscribirte desde este navegador (utils/inscripciones.js).
import { api } from './index'
import { getIdentity } from './identity'
import { getInscritas } from '../utils/inscripciones'
import { norm } from '../utils/format'
import { normalizeAsesoria, toArray } from '../utils/normalize'

// Una asesoría cuya fecha y hora ya pasaron no se muestra en ninguna vista del portal.
const yaOcurrio = (a) => !(new Date(a.fecha_hora).getTime() >= Date.now())

export async function loadAsesorias() {
  const [payload, who] = await Promise.all([api.listAsesorias(), getIdentity().catch(() => null)])
  const inscritas = who ? getInscritas(who.numeroControl) : []
  const byId = new Map(inscritas.map((i) => [i.id, i]))
  return toArray(payload)
    .map(normalizeAsesoria)
    .filter((a) => !yaOcurrio(a))
    .map((a) => {
      const es_mia = Boolean(
        who &&
          ((a.numero_control_tutor && a.numero_control_tutor === who.numeroControl) ||
            (a.nombre_tutor && who.nombre && norm(a.nombre_tutor) === norm(who.nombre)))
      )
      const ins = byId.get(a.id)
      return { ...a, es_mia, ya_inscrito: Boolean(ins), mis_comentarios: ins?.comentarios || '' }
    })
}
