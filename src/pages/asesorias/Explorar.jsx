import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, Plus } from 'lucide-react'
import { api } from '../../api'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { EmptyState, ErrorState, Modal, PageHeader, SearchField, Skeleton, Spinner } from '../../components/ui'
import { norm } from '../../utils/format'
import { loadAsesorias } from '../../api/asesorias'
import { AsesoriaCard, AsesoriasTabs, isPast } from './shared'

export default function Explorar() {
  const toast = useToast()
  const { data, status, error, reload } = useAsync(loadAsesorias, [])
  const [q, setQ] = useState('')
  const [materia, setMateria] = useState('')
  const [soloCupo, setSoloCupo] = useState(false)
  const [target, setTarget] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modalError, setModalError] = useState(null)

  const vigentes = useMemo(() => (data ?? []).filter((a) => a.estatus === 'activa' && !isPast(a)), [data])
  const materias = useMemo(() => [...new Set(vigentes.map((a) => a.materia_asesoria))].sort((a, b) => a.localeCompare(b, 'es')), [vigentes])

  const lista = useMemo(() => {
    const n = norm(q)
    return vigentes.filter((a) => {
      if (materia && a.materia_asesoria !== materia) return false
      if (soloCupo && a.cupo_disponible !== null && a.cupo_disponible <= 0) return false
      if (!n) return true
      return [a.materia_asesoria, a.descripcion_tema, a.nombre_tutor, a.ubicacion].some((t) => norm(t).includes(n))
    })
  }, [vigentes, q, materia, soloCupo])

  function abrir(a) {
    setTarget(a)
    setModalError(null)
  }

  async function confirmar() {
    setSaving(true)
    setModalError(null)
    try {
      await api.inscribirse(target.id)
      toast.success(`Te inscribiste a ${target.materia_asesoria}`)
      setTarget(null)
      reload()
    } catch (err) {
      setModalError(err.message)
      if (err.code === 'CONFLICT') reload()
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Asesorías"
        subtitle="Estudiantes que explican una materia a otros. Apúntate a una o publica la tuya."
        actions={
          <Link to="/asesorias/mis-publicaciones" state={{ nueva: true }} className="btn btn-primary">
            <Plus size={16} aria-hidden="true" /> Publicar asesoría
          </Link>
        }
      />
      <AsesoriasTabs />

      {status === 'loading' && !data ? (
        <div className="ases-grid" aria-busy="true" aria-label="Cargando asesorías">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} h={230} r={4} />)}
        </div>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar las asesorías" error={error} onRetry={reload} />
      ) : vigentes.length === 0 ? (
        <EmptyState
          title="Todavía no hay asesorías publicadas"
          action={<Link to="/asesorias/mis-publicaciones" state={{ nueva: true }} className="btn btn-primary">Publicar la primera</Link>}
        >
          Si dominas una materia, publica una asesoría y ayuda a otros estudiantes.
        </EmptyState>
      ) : (
        <>
          <div className="well toolbar">
            <SearchField value={q} onChange={setQ} placeholder="Buscar por materia o tutor" />
            <select className="form-control select" value={materia} onChange={(e) => setMateria(e.target.value)} aria-label="Filtrar por materia">
              <option value="">Todas las materias</option>
              {materias.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            {vigentes.some((a) => a.cupo_disponible !== null) ? (
              <label className="check">
                <input type="checkbox" checked={soloCupo} onChange={(e) => setSoloCupo(e.target.checked)} />
                Solo con lugares libres
              </label>
            ) : null}
          </div>

          <p className="muted" aria-live="polite">
            Viendo {lista.length} de {vigentes.length} {vigentes.length === 1 ? 'asesoría' : 'asesorías'}.
          </p>

          {lista.length === 0 ? (
            <EmptyState title="Ninguna asesoría coincide">Cambia la búsqueda o quita los filtros para ver más.</EmptyState>
          ) : (
            <div className="ases-grid">
              {lista.map((a) => (
                <AsesoriaCard
                  key={a.id}
                  a={a}
                  footer={
                    a.es_mia ? (
                      <Link to="/asesorias/mis-publicaciones" className="label label-link">Es tu asesoría</Link>
                    ) : a.ya_inscrito ? (
                      <span className="label label-success">Ya estás inscrito</span>
                    ) : a.cupo_disponible !== null && a.cupo_disponible <= 0 ? (
                      <button type="button" className="btn btn-default" disabled>Cupo lleno</button>
                    ) : (
                      <button type="button" className="btn btn-primary" onClick={() => abrir(a)}>Inscribirme</button>
                    )
                  }
                />
              ))}
            </div>
          )}
        </>
      )}

      {target ? (
        <Modal
          title="Inscribirme a la asesoría"
          onClose={saving ? () => {} : () => setTarget(null)}
          footer={
            <>
              <button type="button" className="btn btn-default" onClick={() => setTarget(null)} disabled={saving}>Volver</button>
              <button type="button" className="btn btn-primary" onClick={confirmar} disabled={saving}>
                {saving ? <><Spinner size={16} /> Inscribiendo…</> : 'Inscribirme'}
              </button>
            </>
          }
        >
          <p className="modal-lead">
            <strong>{target.materia_asesoria}</strong>{target.descripcion_tema ? `: ${target.descripcion_tema}` : ''}
          </p>
          {modalError ? (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{modalError}</span>
            </div>
          ) : null}
          <p className="muted" style={{ marginBottom: 0 }}>
            Te inscribiremos con tu número de control y tu nombre.
          </p>
        </Modal>
      ) : null}
    </>
  )
}
