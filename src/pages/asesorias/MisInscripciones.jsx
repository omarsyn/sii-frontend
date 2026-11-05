import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAsync } from '../../hooks/useAsync'
import { EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui'
import { loadAsesorias } from '../../api/asesorias'
import { AsesoriaCard, AsesoriasTabs, isPast } from './shared'

const CRUMBS = [
  { to: '/', label: 'Inicio' },
  { to: '/asesorias', label: 'Asesorías' },
  { label: 'Mis inscripciones' },
]

export default function MisInscripciones() {
  const { data, status, error, reload } = useAsync(async () => (await loadAsesorias()).filter((a) => a.ya_inscrito), [])

  const { proximas, pasadas } = useMemo(() => {
    const all = data ?? []
    return {
      proximas: all.filter((a) => a.estatus === 'activa' && !isPast(a)),
      pasadas: all.filter((a) => !(a.estatus === 'activa' && !isPast(a))),
    }
  }, [data])

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
        <>
          {proximas.length ? (
            <section aria-labelledby="h-prox">
              <h2 id="h-prox" className="section-title">Próximas</h2>
              <div className="ases-grid">
                {proximas.map((a) => (
                  <AsesoriaCard key={a.id} a={a} footer={<span className="label label-success">Ya estás inscrito</span>} />
                ))}
              </div>
            </section>
          ) : null}

          {pasadas.length ? (
            <section aria-labelledby="h-pas">
              <h2 id="h-pas" className="section-title">Anteriores</h2>
              <div className="ases-grid is-muted">
                {pasadas.map((a) => <AsesoriaCard key={a.id} a={a} />)}
              </div>
            </section>
          ) : null}
        </>
      )}
    </>
  )
}
