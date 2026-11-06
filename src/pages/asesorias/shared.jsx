import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { AlertCircle, CalendarClock, MapPin } from 'lucide-react'
import { Modal, ProgressBar, Spinner } from '../../components/ui'
import { formatFechaHora, initials, isoToLocalInput, localInputToIso, titleCase } from '../../utils/format'

export const isPast = (a) => new Date(a.fecha_hora).getTime() < Date.now()

export function AsesoriasTabs() {
  const items = [
    { to: '/asesorias', label: 'Explorar', end: true },
    { to: '/asesorias/mis-inscripciones', label: 'Mis inscripciones' },
    { to: '/asesorias/mis-publicaciones', label: 'Mis publicaciones' },
  ]
  return (
    <nav aria-label="Asesorías">
      <ul className="nav-tabs">
        {items.map((i) => (
          <li key={i.to}>
            <NavLink to={i.to} end={i.end} className={({ isActive }) => (isActive ? 'active' : undefined)}>
              {i.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function CupoMeter({ inscritos, cupo }) {
  // El listado del backend no informa cuántos hay inscritos: se muestra solo el cupo máximo.
  if (inscritos === null || inscritos === undefined) {
    return (
      <div className="cupo">
        <small>Cupo máximo: {cupo} {cupo === 1 ? 'lugar' : 'lugares'}</small>
      </div>
    )
  }
  const libres = Math.max(0, cupo - inscritos)
  const lleno = libres === 0
  const pct = cupo ? (inscritos / cupo) * 100 : 0
  return (
    <div className="cupo">
      <ProgressBar small value={pct} tone={lleno ? 'danger' : 'success'} ariaLabel={`${inscritos} de ${cupo} lugares ocupados`} />
      <small className={lleno ? 'cupo-full' : undefined}>
        {lleno ? 'Cupo lleno' : `${libres} ${libres === 1 ? 'lugar libre' : 'lugares libres'} de ${cupo}`}
      </small>
    </div>
  )
}

export function EstadoTag({ a }) {
  if (a.estatus === 'cancelada') return <span className="label label-danger">Cancelada</span>
  if (a.estatus === 'completada') return <span className="label label-default">Realizada</span>
  if (isPast(a)) return <span className="label label-default">Ya pasó</span>
  return null
}

export function AsesoriaCard({ a, footer, children }) {
  return (
    <article className="panel panel-primary ases-card">
      <div className="panel-heading">
        <h3 className="panel-title">{a.materia_asesoria}</h3>
        <EstadoTag a={a} />
      </div>
      <div className="panel-body">
        {a.descripcion_tema ? <p className="ases-tema">{a.descripcion_tema}</p> : null}
        <ul className="ases-meta">
          <li><CalendarClock size={15} aria-hidden="true" /> {formatFechaHora(a.fecha_hora)}</li>
          <li><MapPin size={15} aria-hidden="true" /> {a.ubicacion}</li>
        </ul>
        <div className="ases-tutor">
          <span className="avatar" aria-hidden="true">{initials(a.nombre_tutor)}</span>
          <span>Con {titleCase(a.nombre_tutor)}</span>
        </div>
        <CupoMeter inscritos={a.inscritos} cupo={a.cupo_maximo} />
        {children}
      </div>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </article>
  )
}

function Field({ id, label, hint, error, children }) {
  return (
    <div className={`form-group ${error ? 'has-error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && !error ? <span className="help-block">{hint}</span> : null}
      {error ? <span className="help-block">{error}</span> : null}
    </div>
  )
}

/**
 * Formulario para publicar o editar una asesoría.
 * Con `initial` funciona como edición; `minCupo` impide bajar el cupo por debajo de los ya inscritos.
 */
export function AsesoriaFormModal({ onSubmit, onClose, initial = null, minCupo = 0 }) {
  const editando = Boolean(initial)
  const [form, setForm] = useState({
    materia_asesoria: initial?.materia_asesoria ?? '',
    descripcion_tema: initial?.descripcion_tema ?? '',
    ubicacion: initial?.ubicacion ?? '',
    fecha_hora: initial ? isoToLocalInput(initial.fecha_hora) : '',
    cupo_maximo: initial?.cupo_maximo ?? 5,
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const nowLocal = isoToLocalInput(new Date().toISOString())

  function validate() {
    const e = {}
    if (!form.materia_asesoria.trim()) e.materia_asesoria = 'Escribe la materia.'
    if (!form.descripcion_tema.trim()) e.descripcion_tema = 'Describe el tema que vas a explicar.'
    if (!form.ubicacion.trim()) e.ubicacion = 'Indica dónde será.'
    if (!form.fecha_hora) e.fecha_hora = 'Elige fecha y hora.'
    else if (new Date(form.fecha_hora).getTime() <= Date.now()) e.fecha_hora = 'Elige una fecha futura.'
    const cupo = Number(form.cupo_maximo)
    if (!Number.isInteger(cupo) || cupo < 1 || cupo > 50) e.cupo_maximo = 'El cupo debe ser un número entre 1 y 50.'
    else if (cupo < minCupo) e.cupo_maximo = `Ya hay ${minCupo} ${minCupo === 1 ? 'alumno inscrito' : 'alumnos inscritos'}: el cupo no puede ser menor.`
    return e
  }

  async function submit(ev) {
    ev.preventDefault()
    const e = validate()
    setErrors(e)
    setServerError(null)
    if (Object.keys(e).length) return
    setSaving(true)
    try {
      await onSubmit({
        materia_asesoria: form.materia_asesoria.trim(),
        descripcion_tema: form.descripcion_tema.trim(),
        ubicacion: form.ubicacion.trim(),
        fecha_hora: localInputToIso(form.fecha_hora),
        cupo_maximo: Number(form.cupo_maximo),
      })
    } catch (err) {
      setServerError(err.message)
      setSaving(false)
    }
  }

  return (
    <Modal
      title={editando ? 'Editar asesoría' : 'Publicar asesoría'}
      onClose={saving ? () => {} : onClose}
      footer={
        <>
          <button type="button" className="btn btn-default" onClick={onClose} disabled={saving}>Volver</button>
          <button type="submit" form="asesoria-form" className="btn btn-primary" disabled={saving}>
            {saving
              ? <><Spinner size={16} /> {editando ? 'Guardando…' : 'Publicando…'}</>
              : editando ? 'Guardar cambios' : 'Publicar asesoría'}
          </button>
        </>
      }
    >
      <form id="asesoria-form" onSubmit={submit} noValidate>
        {serverError ? (
          <div className="alert alert-danger" role="alert">
            <AlertCircle size={18} aria-hidden="true" />
            <span>{serverError}</span>
          </div>
        ) : null}
        <Field id="materia_asesoria" error={errors.materia_asesoria} label="Materia">
          <input id="materia_asesoria" className="form-control" data-autofocus maxLength={100} value={form.materia_asesoria} onChange={set('materia_asesoria')} placeholder="Ej. Cálculo Diferencial" />
        </Field>
        <Field id="descripcion_tema" error={errors.descripcion_tema} label="Tema que vas a explicar" hint="Sé específico: así los demás saben si les sirve.">
          <input id="descripcion_tema" className="form-control" maxLength={200} value={form.descripcion_tema} onChange={set('descripcion_tema')} placeholder="Ej. Límites y derivadas para el segundo parcial" />
        </Field>
        <Field id="ubicacion" error={errors.ubicacion} label="Lugar">
          <input id="ubicacion" className="form-control" maxLength={100} value={form.ubicacion} onChange={set('ubicacion')} placeholder="Ej. Biblioteca, mesa 4" />
        </Field>
        <div className="form-row">
          <Field id="fecha_hora" error={errors.fecha_hora} label="Fecha y hora">
            <input id="fecha_hora" className="form-control" type="datetime-local" min={nowLocal} value={form.fecha_hora} onChange={set('fecha_hora')} />
          </Field>
          <Field id="cupo_maximo" error={errors.cupo_maximo} label="Cupo máximo">
            <input id="cupo_maximo" className="form-control" type="number" inputMode="numeric" min={Math.max(1, minCupo)} max={50} value={form.cupo_maximo} onChange={set('cupo_maximo')} />
          </Field>
        </div>
      </form>
    </Modal>
  )
}
