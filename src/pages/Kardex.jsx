import { useState } from 'react'
import { Download, ScrollText, Table2 } from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useAsync } from '../hooks/useAsync'
import { EmptyState, ErrorState, GradeChip, GradeLegend, Indicators, Line, PageHeader, Panel, ProgressBar, Skeleton, Spinner } from '../components/ui'
import GenericTable from '../components/GenericTable'
import { fmtGrade } from '../utils/grades'
import { normalizeKardex } from '../utils/normalize'
import { descargarKardexPdf } from '../utils/kardexPdf'

export default function Kardex() {
  const { data, status, error, reload } = useAsync(async () => normalizeKardex(await api.getKardex()), [])
  const grupos = data?.grupos ?? []
  const r = data?.resumen
  const hayTipo = (data?.rows ?? []).some((m) => m.tipo)
  const { profile } = useAuth()
  const toast = useToast()
  const [generando, setGenerando] = useState(false)

  async function descargar() {
    setGenerando(true)
    try {
      await descargarKardexPdf(data, profile ?? {})
      toast.success('Kardex descargado')
    } catch {
      toast.error('No se pudo generar el PDF. Intenta de nuevo.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <>
      <PageHeader
        title="Kardex"
        subtitle="Tu historial académico completo, ordenado por periodo."
        actions={
          grupos.length ? (
            <button type="button" className="btn btn-primary" onClick={descargar} disabled={generando}>
              {generando ? <><Spinner size={16} /> Generando…</> : <><Download size={16} aria-hidden="true" /> Descargar PDF</>}
            </button>
          ) : null
        }
      />

      {status === 'loading' && !data ? (
        <div aria-busy="true" aria-label="Cargando kardex">
          <Panel title="Historial académico" icon={ScrollText}>
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={34} style={{ marginBottom: 8 }} />)}
          </Panel>
        </div>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar tu kardex" error={error} onRetry={reload} />
      ) : grupos.length === 0 ? (
        data?.raw && (Array.isArray(data.raw) ? data.raw.length : Object.keys(data.raw || {}).length) ? (
          <GenericTable raw={data.raw} />
        ) : (
          <EmptyState title="Tu kardex está vacío">Cuando cierres tu primer periodo, tus materias aparecerán aquí.</EmptyState>
        )
      ) : (
        <>
          <Indicators title="Resumen del historial">
            {data.avance != null ? (
              <div className="ind-line">
                <strong>Avance de la carrera:</strong> {data.avance.toFixed(2)}%
                <div className="ind-pct">
                  <ProgressBar value={data.avance} tone="success" label={`${data.avance.toFixed(2)}% de avance`} />
                </div>
              </div>
            ) : null}
            <Line label="Materias aprobadas">{r.aprobadas} de {r.materias}</Line>
            <Line label="Promedio aritmético">{fmtGrade(r.promedio)}</Line>
            {r.creditos ? <Line label="Créditos de materias aprobadas">{r.creditos}</Line> : null}
            <p className="note muted" style={{ margin: 0 }}>Se calcula con las materias que aparecen en tu historial.</p>
          </Indicators>

          <div className="well">
            <GradeLegend />
          </div>

          {grupos.map((g) => (
            <Panel
              key={g.titulo}
              title={g.titulo}
              icon={Table2}
              flush
              right={<span className="label-badge">Promedio {fmtGrade(g.promedio)}</span>}
            >
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th scope="col">Clave</th>
                      <th scope="col">Materia</th>
                      <th scope="col">Créditos</th>
                      {hayTipo ? <th scope="col">Evaluación</th> : null}
                      <th scope="col">Calificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.materias.map((m) => (
                      <tr key={m.id}>
                        <td>{m.clave ?? '—'}</td>
                        <th scope="row" className="materia">{m.materia}</th>
                        <td>{m.creditos ?? '—'}</td>
                        {hayTipo ? <td>{m.tipo ?? '—'}</td> : null}
                        <td><GradeChip value={m.calificacion} text={m.enCurso ? 'En curso' : m.calificacionTexto} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          ))}
        </>
      )}
    </>
  )
}
