// Datos de demostración para desarrollar sin backend (VITE_USE_MOCK=true).
// Sirve para probar estados de carga/error. NO se usa en producción.
//
// Para probar errores en el login: contraseña "error" -> 401, contraseña "caido" -> servidor caído.
import { ApiError } from './client'
import { addInscrita } from '../utils/inscripciones'

const wait = (ms = 500) => new Promise((r) => setTimeout(r, ms))
const b64url = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

export async function logout() {
  await wait(100)
  return { ok: true }
}

export async function login(email, password) {
  await wait(700)
  if (password === 'caido') throw new ApiError('No se pudo conectar con el servidor. Revisa tu conexión o intenta más tarde.', { code: 'NETWORK' })
  if (password === 'error') throw new ApiError('Credenciales incorrectas.', { status: 401, code: 'REQUEST' })
  return `${b64url({ alg: 'HS256', typ: 'JWT' })}.${b64url({ sub: 'demo', exp: Math.floor(Date.now() / 1000) + 3600 })}.demo`
}

// Las respuestas imitan exactamente el contrato (openapi) del backend: mismos nombres de campos.
const PERFIL = {
  numero_control: 'L00000001',
  persona: 'MARÍA FERNANDA RAMÍREZ SOTO',
  email: 'l00000001@celaya.tecnm.mx',
  semestre: 8,
  promedio_ponderado: '88.42',
  porcentaje_avance: 75,
  foto: '',
}

const cal = (...v) => v.map((x, i) => ({ numero_calificacion: i + 1, calificacion: x === null ? null : String(x) }))
const mat = (id, nombre, clave, ...v) => ({ materia: { id_grupo: id, nombre_materia: nombre, clave_materia: clave }, calificaiones: cal(...v) })
const CALIFICACIONES = [
  mat(101, 'TECNOLOGIAS WEB', 'TW21', 92, 98, 96, 98),
  mat(102, 'CIBERSEGURIDAD', 'CS18', 85, 90, 88, 89),
  mat(103, 'LENGUAJES Y AUTOMATAS II', 'LA20', 80, 75, 82, 79),
  mat(104, 'PROGRAMACION DE DISPOSITIVOS MOVILES', 'PM19', 90, 94, 92, 92),
  mat(105, 'TALLER DE INVESTIGACION II', 'TI22', 72, 75, 75, null),
  mat(106, 'INTELIGENCIA ARTIFICIAL', 'IA17', 60, 65, 64, 63),
  mat(107, 'ADMINISTRACION DE REDES', 'AR16', 84, 86, 85, 85),
]

const k = (nombre, clave, periodo, calificacion, semestre) => ({ nombre_materia: nombre, clave_materia: clave, periodo, creditos: '5', calificacion: String(calificacion), semestre })
const KARDEX = {
  porcentaje_avance: 75,
  kardex: [
    k('ESTRUCTURA DE DATOS', 'AED-1026', 'AGOSTO - DICIEMBRE 2024', 91, 3),
    k('CALCULO DIFERENCIAL', 'ACF-0901', 'AGOSTO - DICIEMBRE 2024', 78, 3),
    k('MATEMATICAS DISCRETAS', 'AEF-1041', 'AGOSTO - DICIEMBRE 2024', 84, 3),
    k('BASES DE DATOS', 'AEC-1007', 'ENERO - JUNIO 2025', 95, 4),
    k('PROGRAMACION ORIENTADA A OBJETOS', 'AOC-1096', 'ENERO - JUNIO 2025', 89, 4),
    k('FISICA GENERAL', 'ACF-0903', 'ENERO - JUNIO 2025', 71, 4),
    k('REDES DE COMPUTADORAS', 'SCD-1003', 'AGOSTO - DICIEMBRE 2025', 86, 5),
    k('SISTEMAS OPERATIVOS', 'SCC-1019', 'AGOSTO - DICIEMBRE 2025', 82, 5),
  ],
}

const h = (nombre, clave, d) => ({
  nombre_materia: nombre,
  clave_materia: clave,
  lunes: null, lunes_clave_salon: null,
  martes: null, martes_clave_salon: null,
  miercoles: null, miercoles_clave_salon: null,
  jueves: null, jueves_clave_salon: null,
  viernes: null, viernes_clave_salon: null,
  ...Object.fromEntries(Object.entries(d).flatMap(([dia, [hora, salon]]) => [[dia, hora], [`${dia}_clave_salon`, salon]])),
})
const HORARIOS = [
  h('TECNOLOGIAS WEB', 'TW21', { lunes: ['07:00-09:00', 'LC-2'], miercoles: ['07:00-09:00', 'LC-2'], viernes: ['09:00-10:00', 'LC-2'] }),
  h('CIBERSEGURIDAD', 'CS18', { lunes: ['09:00-11:00', 'F-14'], martes: ['09:00-11:00', 'F-14'] }),
  h('LENGUAJES Y AUTOMATAS II', 'LA20', { martes: ['11:00-13:00', 'E-07'], miercoles: ['11:00-13:00', 'E-07'] }),
  h('PROGRAMACION DE DISPOSITIVOS MOVILES', 'PM19', { jueves: ['08:00-11:00', 'LC-1'] }),
  h('TALLER DE INVESTIGACION II', 'TI22', { lunes: ['13:00-14:00', 'D-03'], jueves: ['13:00-15:00', 'D-03'] }),
  h('INTELIGENCIA ARTIFICIAL', 'IA17', { martes: ['15:00-17:00', 'E-11'], viernes: ['11:00-13:00', 'E-11'] }),
]

export async function getPerfil() {
  await wait(600)
  return PERFIL
}
export async function getCalificaciones() {
  await wait(700)
  return CALIFICACIONES
}
export async function getKardex() {
  await wait(800)
  return KARDEX
}
export async function getHorarios() {
  await wait(600)
  return HORARIOS
}

// ---------- Asesorías (persisten en localStorage del navegador) ----------

const DB_KEY = 'mock.asesorias.v2'
const ME = { numero_control: 'L00000001', nombre: 'MARÍA FERNANDA RAMÍREZ SOTO' }

// Fecha a las `hora` en punto, dentro de `dias` días (negativo = pasado)
function at(dias, hora) {
  const d = new Date()
  d.setDate(d.getDate() + dias)
  d.setHours(hora, 0, 0, 0)
  return d.toISOString()
}

function seed() {
  const asesorias = [
    { id: 'a1', numero_control_tutor: 'L00000014', nombre_tutor: 'DIEGO ALVARADO PRIETO', materia_asesoria: 'Cálculo Diferencial', descripcion_tema: 'Límites y derivadas', ubicacion: 'Biblioteca, mesa 4', fecha_hora: at(1, 16), cupo_maximo: 5 },
    { id: 'a2', numero_control_tutor: 'L00000022', nombre_tutor: 'KARLA MENDOZA RUIZ', materia_asesoria: 'Bases de Datos', descripcion_tema: 'Normalización y JOIN', ubicacion: 'Laboratorio de cómputo 2', fecha_hora: at(2, 12), cupo_maximo: 4 },
    { id: 'a3', numero_control_tutor: 'L00000031', nombre_tutor: 'IVÁN TORRES LOZANO', materia_asesoria: 'Programación Orientada a Objetos', descripcion_tema: 'Herencia e interfaces', ubicacion: 'Edificio F, salón 14', fecha_hora: at(3, 17), cupo_maximo: 3 },
    { id: 'a4', numero_control_tutor: ME.numero_control, nombre_tutor: ME.nombre, materia_asesoria: 'Tecnologías Web', descripcion_tema: 'React y consumo de APIs', ubicacion: 'Laboratorio de cómputo 1', fecha_hora: at(4, 10), cupo_maximo: 6 },
    { id: 'a5', numero_control_tutor: 'L00000040', nombre_tutor: 'SOFÍA BARRERA NÚÑEZ', materia_asesoria: 'Física General', descripcion_tema: 'Cinemática', ubicacion: 'Cafetería central', fecha_hora: at(5, 15), cupo_maximo: 2 },
    { id: 'a6', numero_control_tutor: 'L00000014', nombre_tutor: 'DIEGO ALVARADO PRIETO', materia_asesoria: 'Matemáticas Discretas', descripcion_tema: 'Lógica proposicional', ubicacion: 'Biblioteca, mesa 2', fecha_hora: at(-2, 16), cupo_maximo: 5 },
  ]
  const inscripciones = [
    { asesoria_id: 'a3', numero_control_alumno: 'L00000099' },
    { asesoria_id: 'a3', numero_control_alumno: 'L00000100' },
    { asesoria_id: 'a3', numero_control_alumno: 'L00000101' },
    { asesoria_id: 'a2', numero_control_alumno: ME.numero_control },
  ]
  addInscrita(ME.numero_control, 'a2')
  return { asesorias, inscripciones }
}

function load() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    /* ignora y vuelve a sembrar */
  }
  const db = seed()
  save(db)
  return db
}
function save(db) {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    /* noop */
  }
}

const byFecha = (a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)

// GET /asesorias: igual que el backend real, devuelve la fila completa más inscritos y cupo_disponible.
// A propósito NO filtra las pasadas (la semilla trae una): así se comprueba que el portal las oculta
// aunque el servidor las envíe. El backend real sí las filtra.
export async function listAsesorias() {
  await wait(500)
  const db = load()
  return db.asesorias
    .map((a) => {
      const inscritos = db.inscripciones.filter((i) => i.asesoria_id === a.id).length
      return { ...a, inscritos, cupo_disponible: Math.max(0, a.cupo_maximo - inscritos) }
    })
    .sort(byFecha)
}

// POST /asesorias
export async function createAsesoria(body) {
  await wait(500)
  const required = ['numero_control_tutor', 'nombre_tutor', 'materia_asesoria', 'descripcion_tema', 'ubicacion', 'fecha_hora']
  const missing = required.filter((f) => !body?.[f])
  if (missing.length) throw new ApiError(`Faltan campos obligatorios: ${missing.join(', ')}.`, { status: 400 })
  const db = load()
  const a = { id: `a${Date.now()}`, cupo_maximo: 5, ...body }
  db.asesorias.push(a)
  save(db)
  return { id: a.id }
}

// POST /asesorias/inscripcion (409 si ya estaba inscrito, si el cupo está lleno o si ya pasó)
export async function inscribirse(body) {
  await wait(500)
  const missing = ['asesoria_id', 'numero_control_alumno', 'nombre_alumno'].filter((f) => !body?.[f])
  if (missing.length) throw new ApiError(`Faltan campos obligatorios: ${missing.join(', ')}.`, { status: 400 })
  const db = load()
  const a = db.asesorias.find((x) => x.id === body.asesoria_id)
  if (!a) throw new ApiError('Esta asesoría ya no está disponible.', { status: 404 })
  if (new Date(a.fecha_hora) < new Date()) {
    throw new ApiError('Esta asesoría ya ocurrió.', { status: 409, code: 'CONFLICT', data: { codigo: 'ASESORIA_PASADA' } })
  }
  if (db.inscripciones.some((i) => i.asesoria_id === body.asesoria_id && i.numero_control_alumno === body.numero_control_alumno)) {
    throw new ApiError('Ya estás inscrito en esta asesoría.', { status: 409, code: 'CONFLICT', data: { codigo: 'YA_INSCRITO' } })
  }
  if (db.inscripciones.filter((i) => i.asesoria_id === body.asesoria_id).length >= a.cupo_maximo) {
    throw new ApiError('Esta asesoría ya no tiene lugares disponibles.', { status: 409, code: 'CONFLICT', data: { codigo: 'CUPO_LLENO' } })
  }
  db.inscripciones.push({ asesoria_id: body.asesoria_id, numero_control_alumno: body.numero_control_alumno })
  save(db)
  return { ok: true }
}

// PUT /asesorias/:id (solo el tutor; no se puede bajar el cupo por debajo de los inscritos)
export async function updateAsesoria(id, body) {
  await wait(500)
  const db = load()
  const a = db.asesorias.find((x) => x.id === id)
  if (!a) throw new ApiError('La asesoría no existe.', { status: 404 })
  if (a.numero_control_tutor !== body?.numero_control_tutor) throw new ApiError('Solo el tutor puede modificar esta asesoría.', { status: 403 })
  const inscritos = db.inscripciones.filter((i) => i.asesoria_id === id).length
  if (body.cupo_maximo !== undefined && Number(body.cupo_maximo) < inscritos) {
    throw new ApiError(`No puedes bajar el cupo a menos de los ${inscritos} alumnos ya inscritos.`, { status: 409, code: 'CONFLICT' })
  }
  for (const k of ['materia_asesoria', 'descripcion_tema', 'ubicacion', 'fecha_hora', 'cupo_maximo']) {
    if (body[k] !== undefined) a[k] = body[k]
  }
  save(db)
  return { message: 'Asesoría actualizada', data: a }
}

// DELETE /asesorias/:id?numero_control_tutor=... (solo el tutor; borra también sus inscripciones)
export async function deleteAsesoria(id, numeroControlTutor) {
  await wait(500)
  const db = load()
  const a = db.asesorias.find((x) => x.id === id)
  if (!a) throw new ApiError('La asesoría no existe.', { status: 404 })
  if (a.numero_control_tutor !== numeroControlTutor) throw new ApiError('Solo el tutor puede eliminar esta asesoría.', { status: 403 })
  db.asesorias = db.asesorias.filter((x) => x.id !== id)
  db.inscripciones = db.inscripciones.filter((i) => i.asesoria_id !== id)
  save(db)
  return { message: 'Asesoría eliminada' }
}

