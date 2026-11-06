import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { loadAsesorias } from '../../api/asesorias'
import { AsesoriaCard, AsesoriasTabs } from './shared'

const CRUMBS = [
  { to: '/', label: 'Inicio' },
  { to: '/asesorias', label: 'Asesorías' },
  { label: 'Mis inscripciones' },
]

export default function MisInscripciones() {
  // loadAsesorias ya deja fuera las asesorías que pasaron.
  const { data, status, error, reload } = useAsync(async () => (await loadAsesorias()).filter((a) => a.ya_inscrito), [])

  return (
    <>
      <PageHeader title="Mis inscripciones" subtitle="Las asesorías a las que te apuntaste desde este navegador." crumbs={CRUMBS} />
      <AsesoriasTabs />

      {status === 'loading' && !data ? (
        <div className="ases-grid" aria-busy="true" aria-label="Cargando inscripciones">
          {[0, 1].map((i) => <Skeleton key={i} h={200} r={4} />)}
        </div>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar tus inscripciones" error={error} onRetry={reload} />
      ) : (data ?? []).length === 0 ? (
        <EmptyState
          title="Aún no te inscribes a ninguna asesoría"
          action={<Link to="/asesorias" className="btn btn-primary">Explorar asesorías</Link>}
        >
          Encuentra una materia que quieras reforzar y reserva tu lugar.
        </EmptyState>
      ) : (
        <div className="ases-grid">
          {data.map((a) => (
            <AsesoriaCard key={a.id} a={a} footer={<span className="label label-success">Ya estás inscrito</span>} />
          ))}
        </div>
      )}
    </>
  )
}
