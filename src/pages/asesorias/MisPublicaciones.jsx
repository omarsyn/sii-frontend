import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { api } from '../../api'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { EmptyState, ErrorState, Modal, PageHeader, Skeleton, Spinner } from '../../components/ui'
import { loadAsesorias } from '../../api/asesorias'
import { AsesoriaCard, AsesoriaFormModal, AsesoriasTabs } from './shared'

const CRUMBS = [
  { to: '/', label: 'Inicio' },
  { to: '/asesorias', label: 'Asesorías' },
  { label: 'Mis publicaciones' },
]

export default function MisPublicaciones() {
  const toast = useToast()
  const location = useLocation()
  const { data, status, error, reload } = useAsync(async () => (await loadAsesorias()).filter((a) => a.es_mia), [])
  const [formOpen, setFormOpen] = useState(() => Boolean(location.state?.nueva))
  const [editando, setEditando] = useState(null)
  const [borrando, setBorrando] = useState(null)
  const [borrandoBusy, setBorrandoBusy] = useState(false)
  const [borrarError, setBorrarError] = useState(null)

  async function publicar(payload) {
    await api.createAsesoria(payload)
    toast.success('Asesoría publicada')
    setFormOpen(false)
    reload()
  }

  async function guardarCambios(payload) {
    await api.updateAsesoria(editando.id, payload)
    toast.success('Asesoría actualizada')
    setEditando(null)
    reload()
  }

  async function confirmarBorrado() {
    setBorrandoBusy(true)
    setBorrarError(null)
    try {
      await api.deleteAsesoria(borrando.id)
      toast.success('Asesoría eliminada')
      setBorrando(null)
      reload()
    } catch (err) {
      setBorrarError(err.message)
    } finally {
      setBorrandoBusy(false)
    }
  }

  const lista = data ?? []

  return (
    <>
      <PageHeader
        title="Mis publicaciones"
        subtitle="Las asesorías que ofreces."
        crumbs={CRUMBS}
        actions={
          <button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>
            <Plus size={16} aria-hidden="true" /> Publicar asesoría
          </button>
        }
      />
      <AsesoriasTabs />

      {status === 'loading' && !data ? (
        <div className="ases-grid" aria-busy="true" aria-label="Cargando tus publicaciones">
          {[0, 1].map((i) => <Skeleton key={i} h={200} r={4} />)}
        </div>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar tus publicaciones" error={error} onRetry={reload} />
      ) : lista.length === 0 ? (
        <EmptyState
          title="Todavía no has publicado ninguna asesoría"
          action={<button type="button" className="btn btn-primary" onClick={() => setFormOpen(true)}>Publicar asesoría</button>}
        >
          Elige una materia que domines, un lugar y un horario. Los demás estudiantes podrán inscribirse.
        </EmptyState>
      ) : (
        <div className="ases-grid is-top">
          {lista.map((a) => (
            <AsesoriaCard
              key={a.id}
              a={a}
              footer={
                <div className="ases-actions">
                  <button type="button" className="btn btn-default" onClick={() => setEditando(a)}>
                    <Pencil size={15} aria-hidden="true" /> Editar
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => { setBorrarError(null); setBorrando(a) }}>
                    <Trash2 size={15} aria-hidden="true" /> Eliminar
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {formOpen ? <AsesoriaFormModal onSubmit={publicar} onClose={() => setFormOpen(false)} /> : null}

      {editando ? (
        <AsesoriaFormModal
          initial={editando}
          minCupo={editando.inscritos ?? 0}
          onSubmit={guardarCambios}
          onClose={() => setEditando(null)}
        />
      ) : null}

      {borrando ? (
        <Modal
          title="Eliminar asesoría"
          onClose={borrandoBusy ? () => {} : () => setBorrando(null)}
          footer={
            <>
              <button type="button" className="btn btn-default" onClick={() => setBorrando(null)} disabled={borrandoBusy}>Volver</button>
              <button type="button" className="btn btn-danger" onClick={confirmarBorrado} disabled={borrandoBusy}>
                {borrandoBusy ? <><Spinner size={16} /> Eliminando…</> : 'Eliminar asesoría'}
              </button>
            </>
          }
        >
          <p className="modal-lead">
            <strong>{borrando.materia_asesoria}</strong>{borrando.descripcion_tema ? `: ${borrando.descripcion_tema}` : ''}
          </p>
          {borrarError ? (
            <div className="alert alert-danger" role="alert">
              <AlertCircle size={18} aria-hidden="true" />
              <span>{borrarError}</span>
            </div>
          ) : null}
          <p className="muted" style={{ marginBottom: 0 }}>
            {borrando.inscritos
              ? `Se cancelará también la inscripción de ${borrando.inscritos} ${borrando.inscritos === 1 ? 'alumno' : 'alumnos'}. `
              : ''}
            Esta acción no se puede deshacer.
          </p>
        </Modal>
      ) : null}
    </>
  )
}
