// Normalizadores tolerantes.
//
// La forma exacta del JSON del SII ITC no está documentada en el examen, así que estos
// normalizadores buscan cada dato por varios nombres posibles y aceptan datos anidados.
// Cuando tengas una respuesta real, ajusta las listas de ALIASES de abajo si hace falta.
import { toNumber, average } from './grades'
import { norm, minutesToHHMM } from './format'

export const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)
const isEmpty = (v) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const squash = (s) => norm(s).replace(/[^a-z0-9]/g, '')

/** Desenvuelve { data: ... } / { message: ... } hasta llegar al contenido. */
export function unwrap(payload) {
  let cur = payload
  for (let i = 0; i < 4; i++) {
    if (!isObj(cur)) break
    if (cur.data !== null && typeof cur.data === 'object') cur = cur.data
    else if (cur.message !== null && typeof cur.message === 'object') cur = cur.message
    else break
  }
  return cur
}

/** Devuelve [clave, valor] del primer alias presente con valor escalar. "~x" = contiene "x". */
export function pickEntry(obj, aliases) {
  if (!isObj(obj)) return [undefined, undefined]
  const map = new Map()
  for (const k of Object.keys(obj)) map.set(squash(k), k)
  const ok = (k) => k !== undefined && !isEmpty(obj[k]) && typeof obj[k] !== 'object'
  for (const a of aliases) {
    if (a.startsWith('~')) continue
    const k = map.get(squash(a))
    if (ok(k)) return [k, obj[k]]
  }
  for (const a of aliases) {
    if (!a.startsWith('~')) continue
    const needle = squash(a.slice(1))
    for (const [sk, k] of map) if (sk.includes(needle) && ok(k)) return [k, obj[k]]
  }
  return [undefined, undefined]
}
export const pick = (obj, aliases) => pickEntry(obj, aliases)[1]

const ALIASES = {
  materia: ['materia', 'nombreMateria', 'asignatura', 'nombreAsignatura', 'descripcionMateria', 'nombre', '~materia', '~asignatura'],
  periodo: ['periodo', 'nombrePeriodo', 'periodoEscolar', 'descripcionPeriodo', 'clavePeriodo', 'ciclo', '~periodo'],
  calificacion: ['calificacionFinal', 'calFinal', 'final', 'calificacion', 'cal', 'promedioFinal', 'nota', 'promedio', '~calif'],
  creditos: ['creditos', 'credito', 'valorCreditos', '~credit'],
  clave: ['clave', 'claveMateria', 'cveMateria', 'codigo'],
  grupo: ['grupo', 'claveGrupo', 'nombreGrupo'],
  docente: ['docente', 'profesor', 'maestro', 'nombreDocente', 'nombreProfesor', '~docente', '~profesor'],
  tipo: ['tipoEvaluacion', 'evaluacion', 'oportunidad', 'acreditacion', 'tipoCurso', 'tipo'],
  semestre: ['semestre', 'numSemestre', 'semestreCursado', 'nivel'],
  aula: ['aula', 'salon', 'ubicacion', '~aula', '~salon'],
}

const isMateriaRow = (o) => pick(o, ALIASES.materia) !== undefined

/** Aplana listas anidadas (p. ej. periodos -> materias) heredando campos escalares del padre. */
export function flattenRows(data, isLeaf = isMateriaRow, ctx = {}) {
  if (Array.isArray(data)) return data.flatMap((it) => (isObj(it) ? flattenItem(it, isLeaf, ctx) : []))
  if (isObj(data)) return flattenItem(data, isLeaf, ctx)
  return []
}
function flattenItem(item, isLeaf, ctx) {
  const merged = { ...ctx, ...item }
  if (isLeaf(merged)) return [merged]
  const childKey = Object.keys(item).find((k) => Array.isArray(item[k]) && item[k].some(isObj))
  if (!childKey) return []
  const scalars = Object.fromEntries(
    Object.entries(item).filter(([, v]) => v === null || typeof v !== 'object')
  )
  return item[childKey].flatMap((c) => (isObj(c) ? flattenItem(c, isLeaf, { ...ctx, ...scalars }) : []))
}

// ---------- Perfil ----------

const P = {
  nombreCompleto: ['persona', 'nombreCompleto', 'nombreEstudiante', 'estudiante', 'nombreAlumno', 'alumno', '~nombrecompleto'],
  nombre: ['nombre', 'nombres', 'name'],
  apPaterno: ['apellidoPaterno', 'primerApellido', 'paterno', 'apellidos'],
  apMaterno: ['apellidoMaterno', 'segundoApellido', 'materno'],
  numeroControl: ['numeroControl', 'numControl', 'noControl', 'numeroDeControl', 'matricula', 'control', '~control', '~matricula'],
  carrera: ['carrera', 'nombreCarrera', 'programaEducativo', 'programa', '~carrera'],
  especialidad: ['especialidad'],
  moduloEspecialidad: ['moduloEspecialidad', '~moduloesp'],
  inscrito: ['inscrito', 'estaInscrito'],
  sede: ['sede', 'campus'],
  semestre: ['semestre', 'semestreActual', 'numSemestre', '~semestreactual'],
  promedio: ['promedioGeneral', 'promedio', 'promedioAcumulado'],
  promedioFuzzy: ['~promedio'],
  promedioPonderado: ['promedioPonderado', '~ponderado'],
  promedioAritmetico: ['promedioAritmetico', '~aritmetico'],
  creditosAcademicos: ['creditosAcademicos', '~creditosacad'],
  creditosComplementarios: ['creditosComplementarios', '~creditoscompl'],
  creditosAprobados: ['creditosAcumulados', 'creditosAprobados', '~creditosacum', '~creditosaprob'],
  creditosTotales: ['creditosTotales', 'totalCreditos', 'creditosPlan', '~creditostot', '~totalcred'],
  semestresAcumulados: ['semestresAcumulados', 'semestresCursados', '~semestresacum'],
  semestresTotales: ['semestresTotales', 'totalSemestres', '~semestrestot', '~totalsemestres'],
  indiceReprobacion: ['indiceReprobacion', '~indicereprob'],
  promMateriasSem: ['promedioMateriasAcreditadasSemestre', '~acreditadasporsemestre', '~materiasacreditadassem'],
  materiasReprobadas: ['materiasReprobadasAcumuladas', 'materiasReprobadas', '~reprobadasacum'],
  materiasAcreditadas: ['materiasAcreditadas', '~materiasacreditadas'],
  especialesAcumulados: ['especialesAcumulados', '~especialesacum'],
  estatus: ['estatus', 'estatusEstudiante', 'situacion', 'situacionAcademica', 'estado', '~estatus', '~situacion'],
  correo: ['correo', 'email', 'correoInstitucional', '~correo', '~email'],
  plan: ['planEstudios', 'plan', '~plan'],
  foto: ['foto', 'fotografia', 'imagen', 'avatar'],
  avance: ['porcentajeAvance', 'avance', 'porcentajeDeAvance'],
}

function collectScalars(obj, prefix = '', out = {}, depth = 0) {
  if (!isObj(obj) || depth > 3) return out
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}_${k}` : k
    if (v !== null && typeof v === 'object') {
      if (isObj(v)) collectScalars(v, key, out, depth + 1)
    } else if (!isEmpty(v) && !(key in out)) out[key] = v
  }
  return out
}

/** La foto llega en base64 sin prefijo ("/9j/..." = JPEG, "iVBOR..." = PNG): se convierte a data URL. */
function fotoSrc(v) {
  if (typeof v !== 'string' || v.length < 20) return undefined
  if (/^(data:|https?:\/\/|\/)/.test(v) && !v.startsWith('/9j/')) return v
  const mime = v.startsWith('iVBOR') ? 'image/png' : 'image/jpeg'
  return `data:${mime};base64,${v}`
}

const HIDDEN_KEYS = /token|password|contrasena|secret|hash|^id$|_id$|^id_/i

export function normalizePerfil(payload) {
  const raw = unwrap(payload)
  const flat = collectScalars(isObj(raw) ? raw : {})
  const used = new Set()
  const get = (aliases) => {
    const [k, v] = pickEntry(flat, aliases)
    if (k !== undefined) used.add(k)
    return v
  }

  let nombre = get(P.nombreCompleto)
  let nombrePila
  if (!nombre) {
    const n = get(P.nombre)
    const ap = get(P.apPaterno)
    const am = get(P.apMaterno)
    nombrePila = n
    nombre = [n, ap, am].filter(Boolean).join(' ') || undefined
  } else {
    // si existe un campo "nombre" aparte, se usa para saludar
    const [k, v] = pickEntry(flat, P.nombre)
    if (k !== undefined && String(nombre).includes(String(v))) nombrePila = v
  }

  const promedioPonderado = toNumber(get(P.promedioPonderado))
  const promedioAritmetico = toNumber(get(P.promedioAritmetico))
  let promedio = toNumber(get(P.promedio))
  if (promedio === null && promedioPonderado === null && promedioAritmetico === null) promedio = toNumber(get(P.promedioFuzzy))

  const creditosAcademicos = toNumber(get(P.creditosAcademicos))
  const creditosComplementarios = toNumber(get(P.creditosComplementarios))
  let creditosAprobados = toNumber(get(P.creditosAprobados))
  if (creditosAprobados === null && creditosAcademicos !== null) creditosAprobados = creditosAcademicos + (creditosComplementarios || 0)

  const perfil = {
    nombre,
    nombrePila,
    numeroControl: get(P.numeroControl),
    carrera: get(P.carrera),
    especialidad: get(P.especialidad),
    moduloEspecialidad: get(P.moduloEspecialidad),
    inscrito: get(P.inscrito),
    sede: get(P.sede),
    semestre: get(P.semestre),
    promedio,
    promedioPonderado,
    promedioAritmetico,
    creditosAcademicos,
    creditosComplementarios,
    creditosAprobados,
    creditosTotales: toNumber(get(P.creditosTotales)),
    semestresAcumulados: toNumber(get(P.semestresAcumulados)),
    semestresTotales: toNumber(get(P.semestresTotales)),
    indiceReprobacion: get(P.indiceReprobacion),
    promMateriasSem: get(P.promMateriasSem),
    materiasReprobadas: get(P.materiasReprobadas),
    materiasAcreditadas: get(P.materiasAcreditadas),
    especialesAcumulados: get(P.especialesAcumulados),
    estatus: get(P.estatus),
    correo: get(P.correo),
    plan: get(P.plan),
    foto: fotoSrc(get(P.foto)),
    porcentajeAvance: toNumber(get(P.avance)),
  }
  perfil.otros = Object.entries(flat)
    .filter(([k, v]) => !used.has(k) && !HIDDEN_KEYS.test(k) && String(v).length < 120)
    .slice(0, 14)
    .map(([k, v]) => ({ clave: k, valor: String(v) }))
  perfil.vacio = Object.keys(flat).length === 0
  return perfil
}

// ---------- Calificaciones y kardex ----------

const ROMAN = { i: 1, ii: 2, iii: 3, iv: 4, v: 5, vi: 6, vii: 7, viii: 8, ix: 9, x: 10 }
const UNIT_KEY = /^(cal|calificacion|unidad|parcial|u)(\d+|i{1,3}|iv|vi{0,3}|ix|x)$/

/** Calificaciones por unidad (Cal. I, II, III…): arreglo `unidades` o campos cal1, cal_2, calI… */
export function extractUnits(r) {
  for (const k of Object.keys(r)) {
    if (/unidad|parcial/i.test(k) && Array.isArray(r[k])) {
      return r[k].map((u) => (isObj(u) ? toNumber(pick(u, ['calificacion', 'cal', 'valor', 'nota'])) : toNumber(u)))
    }
  }
  const found = []
  for (const [k, v] of Object.entries(r)) {
    const m = squash(k).match(UNIT_KEY)
    if (!m) continue
    const idx = /^\d+$/.test(m[2]) ? Number(m[2]) : ROMAN[m[2]]
    if (idx >= 1 && idx <= 12) found[idx - 1] = toNumber(v)
  }
  return Array.from(found, (x) => (x === undefined ? null : x))
}

function withoutUnitKeys(r) {
  return Object.fromEntries(Object.entries(r).filter(([k]) => !UNIT_KEY.test(squash(k))))
}

function mapMateriaRow(r, i) {
  const unidades = extractUnits(r)
  const base = withoutUnitKeys(r)
  const calRaw = pick(base, ALIASES.calificacion)
  let cal = toNumber(calRaw)
  // Con unidades capturadas, un promedio de 0 significa "aún sin promedio", no reprobado.
  const enCurso = cal === 0 && unidades.some((u) => u !== null)
  if (enCurso) cal = null
  const sem = pick(r, ALIASES.semestre)
  return {
    id: `${i}-${pick(r, ALIASES.clave) ?? ''}`,
    materia: String(pick(r, ALIASES.materia) ?? 'Materia sin nombre'),
    clave: pick(r, ALIASES.clave),
    periodo: pick(r, ALIASES.periodo),
    semestre: sem,
    calificacion: cal,
    calificacionTexto: cal === null && calRaw !== undefined && !enCurso ? String(calRaw) : null,
    enCurso,
    unidades,
    creditos: toNumber(pick(r, ALIASES.creditos)),
    grupo: pick(r, ALIASES.grupo),
    docente: pick(r, ALIASES.docente),
    tipo: pick(r, ALIASES.tipo),
  }
}

/**
 * Contrato: [{ materia: { id_grupo, nombre_materia, clave_materia }, calificaiones: [{ numero_calificacion, calificacion }] }]
 * (el campo viene escrito "calificaiones", se acepta también "calificaciones").
 * No trae calificación final: es el promedio de las unidades, solo cuando todas ya están capturadas;
 * mientras falte alguna, la materia se muestra "En curso".
 */
function fromContractRow(item, totalUnidades = 0) {
  const m = item.materia
  const list = item.calificaiones ?? item.calificaciones
  const unidades = [...list]
    .filter(isObj)
    .sort((a, b) => (toNumber(a.numero_calificacion) ?? 0) - (toNumber(b.numero_calificacion) ?? 0))
    .map((u) => toNumber(u.calificacion))
  const capturadas = unidades.filter((u) => u !== null)
  // "Completo" = todas las unidades que tiene la materia (o el máximo de la lista, si el backend omite las vacías) están capturadas.
  const completo = capturadas.length > 0 && capturadas.length === unidades.length && unidades.length >= totalUnidades
  const cal = completo ? Math.round(capturadas.reduce((a, b) => a + b, 0) / capturadas.length) : null
  return {
    id: `${m.id_grupo ?? ''}-${m.clave_materia ?? ''}`,
    materia: String(m.nombre_materia ?? 'Materia sin nombre'),
    clave: m.clave_materia,
    periodo: undefined,
    semestre: undefined,
    calificacion: cal,
    calificacionTexto: null,
    enCurso: !completo,
    unidades,
    creditos: null,
    grupo: undefined,
    docente: undefined,
    tipo: undefined,
  }
}

const isContractRow = (it) => isObj(it) && isObj(it.materia) && Array.isArray(it.calificaiones ?? it.calificaciones)

export function normalizeCalificaciones(payload) {
  const raw = unwrap(payload)
  const list = Array.isArray(raw) ? raw : []
  if (list.length && list.every(isContractRow)) {
    const total = Math.max(...list.map((it) => (it.calificaiones ?? it.calificaciones).length))
    return { rows: list.map((it) => fromContractRow(it, total)), raw }
  }
  const rows = flattenRows(raw).map(mapMateriaRow)
  return { rows, raw }
}

export function normalizeKardex(payload) {
  const raw = unwrap(payload)
  const rows = flattenRows(raw).map(mapMateriaRow)
  const groups = new Map()
  for (const r of rows) {
    const label = r.periodo ?? (r.semestre ? `Semestre ${r.semestre}` : 'Sin periodo')
    if (!groups.has(label)) groups.set(label, [])
    groups.get(label).push(r)
  }
  const grupos = [...groups.entries()].map(([titulo, materias]) => ({
    titulo: String(titulo),
    materias,
    promedio: average(materias.map((m) => m.calificacion)),
  }))
  const aprobadas = rows.filter((r) => r.calificacion !== null && r.calificacion >= 70)
  const resumen = {
    materias: rows.length,
    aprobadas: aprobadas.length,
    promedio: average(rows.map((r) => r.calificacion)),
    creditos: aprobadas.reduce((s, r) => s + (r.creditos || 0), 0),
  }
  const avance = isObj(raw) ? toNumber(pick(raw, ['porcentajeAvance', 'avance'])) : null
  return { rows, grupos, resumen, avance, raw }
}

// ---------- Horario ----------

export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']

function dayIndex(v) {
  if (v === null || v === undefined || typeof v === 'object') return -1
  const n = Number(v)
  if (Number.isInteger(n) && n >= 1 && n <= 6) return n - 1
  const s = squash(v)
  const pref = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab']
  return pref.findIndex((p) => s.startsWith(p))
}

const TIME_RE = /(\d{1,2})[:.](\d{2})\s*(?:-|–|—|a|al|hasta)\s*(\d{1,2})[:.](\d{2})/i
const HOUR_RE = /^\s*(\d{1,2})\s*(?:-|–|a)\s*(\d{1,2})\s*$/

function parseRange(text) {
  const s = String(text)
  let m = s.match(TIME_RE)
  if (m) {
    return { inicio: +m[1] * 60 + +m[2], fin: +m[3] * 60 + +m[4], resto: s.replace(m[0], '').replace(/^[\s/|,\-–]+|[\s/|,\-–]+$/g, '') }
  }
  m = s.match(HOUR_RE)
  if (m) return { inicio: +m[1] * 60, fin: +m[2] * 60, resto: '' }
  return null
}

function parseHHMM(v) {
  if (isEmpty(v)) return null
  const m = String(v).match(/(\d{1,2})[:.](\d{2})/)
  if (m) return +m[1] * 60 + +m[2]
  const n = Number(v)
  if (Number.isFinite(n) && n >= 0 && n <= 24) return n * 60
  return null
}

function sessionsFromObject(o, base) {
  const out = []
  // 1) columnas por día: { lunes: "07:00-09:00 / A-12", ... }
  for (const [k, v] of Object.entries(o)) {
    const di = dayIndex(k)
    if (di === -1 || isEmpty(v)) continue
    const val = isObj(v) ? pick(v, ['hora', 'horario']) ?? '' : v
    const range = parseRange(val)
    if (range) out.push({ ...base, dia: di, inicio: range.inicio, fin: range.fin, aula: range.resto || pick(isObj(v) ? v : o, ALIASES.aula) })
  }
  // 2) campos propios: dia + horaInicio/horaFin (o "hora": "07:00-09:00")
  const dia = dayIndex(pick(o, ['dia', 'diaSemana', 'day', 'nombreDia', '~dia']))
  if (dia !== -1) {
    let inicio = parseHHMM(pick(o, ['horaInicio', 'horaInicial', 'inicio', 'hrInicio', 'horaEntrada', '~inicio']))
    let fin = parseHHMM(pick(o, ['horaFin', 'horaFinal', 'fin', 'hrFin', 'horaSalida', '~fin']))
    if (inicio === null) {
      const r = parseRange(pick(o, ['hora', 'horario', '~hora']) ?? '')
      if (r) {
        inicio = r.inicio
        fin = r.fin
      }
    }
    if (inicio !== null) out.push({ ...base, dia, inicio, fin: fin ?? inicio + 60, aula: pick(o, ALIASES.aula) ?? base.aula })
  }
  return out
}

export function normalizeHorario(payload) {
  const raw = unwrap(payload)
  const rows = flattenRows(raw)
  const sessions = []
  rows.forEach((r, i) => {
    const base = {
      materia: String(pick(r, ALIASES.materia) ?? 'Clase'),
      grupo: pick(r, ALIASES.grupo),
      docente: pick(r, ALIASES.docente),
      aula: pick(r, ALIASES.aula),
    }
    const before = sessions.length
    sessions.push(...sessionsFromObject(r, base))
    // 3) sesiones en listas anidadas dentro de la fila
    for (const v of Object.values(r)) {
      if (Array.isArray(v)) for (const c of v) if (isObj(c)) sessions.push(...sessionsFromObject(c, base))
    }
    sessions.slice(before).forEach((s, j) => (s.id = `${i}-${j}`))
  })
  const valid = sessions.filter((s) => s.fin > s.inicio)
  return {
    sessions: valid,
    materias: [...new Set(rows.map((r) => pick(r, ALIASES.materia)).filter(Boolean))],
    rows,
    raw,
  }
}

export function sessionLabel(s) {
  return `${minutesToHHMM(s.inicio)} - ${minutesToHHMM(s.fin)}`
}

// ---------- Utilidades para tablas genéricas (respaldo cuando no se reconoce la forma) ----------

export function genericRows(raw) {
  const rows = flattenRows(raw, () => true)
  return rows.map((r) => collectScalars(r))
}

// ---------- Asesorías ----------

export function toArray(payload) {
  const raw = unwrap(payload)
  if (Array.isArray(raw)) return raw
  if (isObj(raw)) {
    const k = Object.keys(raw).find((x) => Array.isArray(raw[x]))
    if (k) return raw[k]
  }
  return []
}

export function normalizeAsesoria(a) {
  // El listado del contrato no trae inscritos ni cupo disponible: quedan en null (= desconocido).
  const inscritos = a.inscritos ?? a.total_inscritos ?? a.inscripciones?.length ?? null
  const cupo = Number(a.cupo_maximo ?? 5) || 0
  const ins = inscritos === null ? null : Number(inscritos) || 0
  return {
    ...a,
    inscritos: ins,
    cupo_maximo: cupo,
    cupo_disponible: a.cupo_disponible ?? (ins === null ? null : Math.max(0, cupo - ins)),
    estatus: a.estatus || 'activa',
  }
}
