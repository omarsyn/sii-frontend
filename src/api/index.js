import { USE_MOCK } from '../config'
import * as real from './real'
import * as mock from './mock'
import { getIdentity } from './identity'
import { addInscrita } from '../utils/inscripciones'

// En producción VITE_USE_MOCK debe ser false: así todo pasa por tu backend y la API real del SII.
const transport = USE_MOCK ? mock : real

export const api = {
  ...transport,

  // El contrato pide en el cuerpo el número de control y el nombre; salen del perfil.
  async createAsesoria(data) {
    const who = await getIdentity()
    return transport.createAsesoria({ numero_control_tutor: who.numeroControl, nombre_tutor: who.nombre, ...data })
  },

  async inscribirse(asesoriaId) {
    const who = await getIdentity()
    try {
      const res = await transport.inscribirse({ asesoria_id: asesoriaId, numero_control_alumno: who.numeroControl, nombre_alumno: who.nombre })
      addInscrita(who.numeroControl, asesoriaId)
      return res
    } catch (err) {
      // 409: ya estaba inscrito (p. ej. desde otro dispositivo); se marca como inscrito en la interfaz.
      if (err.code === 'CONFLICT') addInscrita(who.numeroControl, asesoriaId)
      throw err
    }
  },
}
