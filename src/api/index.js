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

  async updateAsesoria(id, data) {
    const who = await getIdentity()
    return transport.updateAsesoria(id, { ...data, numero_control_tutor: who.numeroControl })
  },

  async deleteAsesoria(id) {
    const who = await getIdentity()
    return transport.deleteAsesoria(id, who.numeroControl)
  },

  async inscribirse(asesoriaId) {
    const who = await getIdentity()
    try {
      // alumno_id: nombre del campo que el backend exige hoy (se envía el número de control); se conservan los campos del contrato.
      const res = await transport.inscribirse({
        asesoria_id: asesoriaId,
        alumno_id: who.numeroControl,
        numero_control_alumno: who.numeroControl,
        nombre_alumno: who.nombre,
      })
      addInscrita(who.numeroControl, asesoriaId)
      return res
    } catch (err) {
      // 409 puede significar "ya estaba inscrito" (p. ej. desde otro dispositivo) o "cupo lleno".
      // Solo en el primer caso se marca como inscrito en la interfaz.
      const yaInscrito = err.data?.codigo === 'YA_INSCRITO' || /ya est[aá]s? inscrit/i.test(err.message || '')
      if (err.code === 'CONFLICT' && yaInscrito) addInscrita(who.numeroControl, asesoriaId)
      throw err
    }
  },
}
