import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Plus } from 'lucide-react'
import { api } from '../../api'
import { useToast } from '../../context/ToastContext'
import { useAsync } from '../../hooks/useAsync'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'
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

  async function publicar(payload) {
    await api.createAsesoria(payload)
    toast.success('Asesoría publicada')
    setFormOpen(false)
    reload()
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
          {lista.map((a) => <AsesoriaCard key={a.id} a={a} footer={<span className="label label-info">Es tu asesoría</span>} />)}
        </div>
      )}

      {formOpen ? <AsesoriaFormModal onSubmit={publicar} onClose={() => setFormOpen(false)} /> : null}
    </>
  )
}
