import { useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Info, Loader2, RefreshCw, Search, X } from 'lucide-react'
import { gradeLevel, fmtGrade } from '../utils/grades'

export const TONE = { ok: 'success', warn: 'warning', bad: 'danger', none: 'default' }

export function Spinner({ size = 16, label }) {
  return (
    <span className="spinner" role={label ? 'status' : undefined} aria-label={label}>
      <Loader2 size={size} aria-hidden="true" />
    </span>
  )
}

export function Skeleton({ h = 16, w = '100%', r = 3, style }) {
  return <span className="skeleton" style={{ height: h, width: w, borderRadius: r, ...style }} aria-hidden="true" />
}

/** Ruta de migas + título centrado con doble línea, como el SII clásico. */
export function PageHeader({ title, subtitle, actions, crumbs }) {
  const items = crumbs ?? [{ to: '/', label: 'Inicio' }, { label: title }]
  return (
    <>
      <nav className="breadcrumb" aria-label="Ruta de navegación">
        <ol>
          {items.map((c, i) => (
            <li key={i}>
              {c.to ? <Link to={c.to}>{c.label}</Link> : <span aria-current="page">{c.label}</span>}
            </li>
          ))}
        </ol>
      </nav>
      <header className="page-header">
        <h1 className="page-title">
          <span>{title}</span>
        </h1>
        {subtitle ? <p className="page-sub">{subtitle}</p> : null}
        {actions ? <div className="page-actions">{actions}</div> : null}
      </header>
    </>
  )
}

/** Panel con encabezado de color. variant: primary (azul) | success | danger | info | default */
export function Panel({ title, icon: Icon, variant = 'primary', right, children, flush = false, footer, className = '' }) {
  return (
    <section className={`panel panel-${variant} ${className}`}>
      <div className="panel-heading">
        <h2 className="panel-title">
          {Icon ? <Icon size={16} aria-hidden="true" /> : null}
          {title}
        </h2>
        {right}
      </div>
      <div className={`panel-body ${flush ? 'flush' : ''}`}>{children}</div>
      {footer ? <div className="panel-footer">{footer}</div> : null}
    </section>
  )
}

/** Caja rosa de indicadores (como "Indicadores académicos"). */
export function Indicators({ title = 'Indicadores académicos', children }) {
  return (
    <section className="panel panel-danger indicators">
      <div className="panel-heading">
        <h3 className="panel-title">{title}</h3>
      </div>
      <div className="panel-body">{children}</div>
    </section>
  )
}

export function Line({ label, children }) {
  return (
    <p className="ind-line">
      <strong>{label}:</strong> {children}
    </p>
  )
}

export function ProgressBar({ value, tone = 'success', label, ariaLabel, small = false }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0))
  return (
    <div
      className={`progress ${small ? 'progress-sm' : ''}`}
      role="progressbar"
      aria-valuenow={Math.round(v)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={ariaLabel || label}
    >
      <div className={`progress-bar progress-bar-${tone}`} style={{ width: `${v}%` }}>
        {label}
      </div>
    </div>
  )
}

/** Gráfica de pastel en SVG (sin dependencias). slices: [{label, value, color}] */
export function Pie({ slices, title }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const R = 80
  const C = 90
  let acc = 0
  const parts = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const frac = s.value / total
      const a0 = acc * 2 * Math.PI - Math.PI / 2
      acc += frac
      const a1 = acc * 2 * Math.PI - Math.PI / 2
      const mid = (a0 + a1) / 2
      const large = frac > 0.5 ? 1 : 0
      const p = (a) => `${C + R * Math.cos(a)} ${C + R * Math.sin(a)}`
      return {
        ...s,
        frac,
        d: frac >= 0.9999 ? null : `M ${C} ${C} L ${p(a0)} A ${R} ${R} 0 ${large} 1 ${p(a1)} Z`,
        lx: C + R * 0.62 * Math.cos(mid),
        ly: C + R * 0.62 * Math.sin(mid),
      }
    })
  if (!total) return <p className="muted">Todavía no hay datos para la gráfica.</p>
  return (
    <div className="pie-wrap">
      {title ? <p className="pie-title">{title}</p> : null}
      <svg width="180" height="180" viewBox="0 0 180 180" role="img" aria-label={slices.map((s) => `${s.label}: ${s.value}`).join(', ')}>
        {parts.map((s) =>
          s.d ? <path key={s.label} d={s.d} fill={s.color} stroke="#fff" strokeWidth="1" /> : <circle key={s.label} cx={C} cy={C} r={R} fill={s.color} />
        )}
        {parts.map((s) => (
          <text key={`t-${s.label}`} x={s.lx} y={s.ly} fill="#fff" fontSize="12" fontWeight="700" textAnchor="middle" dominantBaseline="middle">
            {Math.round(s.frac * 100)}%
          </text>
        ))}
      </svg>
      <ul className="pie-legend">
        {slices.map((s) => (
          <li key={s.label}>
            <i style={{ background: s.color }} /> {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ErrorState({ title = 'No se pudo cargar', error, onRetry }) {
  const msg = typeof error === 'string' ? error : error?.message
  return (
    <div className="state state-error" role="alert">
      <AlertTriangle size={24} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        <p>{msg || 'Ocurrió un problema inesperado.'}</p>
        {onRetry ? (
          <button type="button" className="btn btn-default" onClick={onRetry}>
            <RefreshCw size={15} aria-hidden="true" /> Reintentar
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="state">
      <Info size={24} aria-hidden="true" />
      <div>
        <h2>{title}</h2>
        {children ? <p>{children}</p> : null}
        {action}
      </div>
    </div>
  )
}

export function SearchField({ value, onChange, placeholder, label }) {
  return (
    <label className="input-group">
      <span className="sr-only">{label || placeholder}</span>
      <span className="input-group-addon" aria-hidden="true">
        <Search size={16} />
      </span>
      <input className="form-control" type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoComplete="off" />
    </label>
  )
}

/** Calificación como etiqueta de color; el texto evita depender solo del color. */
export function GradeChip({ value, text, showLabel = true }) {
  const lvl = gradeLevel(value)
  return (
    <span className="grade">
      <span className={`label label-${TONE[lvl.key]}`}>{value === null || value === undefined ? text || '—' : fmtGrade(value)}</span>
      {showLabel && lvl.key !== 'none' ? <small className="grade-text">{lvl.label}</small> : null}
    </span>
  )
}

export function GradeLegend() {
  return (
    <ul className="legend" aria-label="Significado de los colores">
      <li><span className="dot dot-ok" /> 80 o más: bien</li>
      <li><span className="dot dot-warn" /> 70 a 79: justo</li>
      <li><span className="dot dot-bad" /> Menos de 70: no aprobada</li>
    </ul>
  )
}

/** Diálogo accesible: cierra con Esc o clic fuera, mantiene el foco dentro y lo devuelve al cerrar. */
export function Modal({ title, onClose, children, footer, size = 'md' }) {
  const ref = useRef(null)

  useEffect(() => {
    const prev = document.activeElement
    const node = ref.current
    const focusable = () =>
      node.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
    const first = node.querySelector('[data-autofocus]') || focusable()[0]
    first?.focus()
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'Tab') {
        const items = [...focusable()].filter((el) => !el.disabled)
        if (!items.length) return
        const a = items[0]
        const z = items[items.length - 1]
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault()
          z.focus()
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault()
          a.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    document.body.classList.add('modal-open')
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.classList.remove('modal-open')
      prev?.focus?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="modal-head">
          <h2>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer ? <div className="modal-foot">{footer}</div> : null}
      </div>
    </div>
  )
}
