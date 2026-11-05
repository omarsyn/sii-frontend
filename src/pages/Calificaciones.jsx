import { useMemo, useState } from 'react'
import { Table2 } from 'lucide-react'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'
import { EmptyState, ErrorState, GradeChip, GradeLegend, PageHeader, Panel, SearchField, Skeleton } from '../components/ui'
import GenericTable from '../components/GenericTable'
import { average, fmtGrade } from '../utils/grades'
import { norm } from '../utils/format'
import { normalizeCalificaciones } from '../utils/normalize'

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export default function Calificaciones() {
  const { data, status, error, reload } = useAsync(async () => normalizeCalificaciones(await api.getCalificaciones()), [])
  const [q, setQ] = useState('')

  const rows = data?.rows ?? []
  const filtered = useMemo(() => {
    const n = norm(q)
    if (!n) return rows
    return rows.filter((r) => norm(r.materia).includes(n) || norm(r.periodo).includes(n))
  }, [rows, q])

  const periodos = useMemo(() => [...new Set(rows.map((r) => r.periodo).filter(Boolean))], [rows])
  const unaSolaVez = periodos.length === 1
  const variosPeriodos = periodos.length > 1
  const nUnits = Math.max(0, ...rows.map((r) => r.unidades.length))
  const hayClave = rows.some((r) => r.clave)
  const hayGrupo = rows.some((r) => r.grupo)
  const hayDocente = rows.some((r) => r.docente)
  const creditos = rows.reduce((s, r) => s + (r.creditos || 0), 0)
  const prom = average(filtered.map((r) => r.calificacion))
  const enRojo = filtered.filter((r) => r.calificacion !== null && r.calificacion < 70).length

  return (
    <>
      <PageHeader title="Calificaciones" subtitle="Tus materias del periodo y su calificación final." />

      {status === 'loading' && !data ? (
        <Panel title="Calificaciones de semestre" icon={Table2}>
          <div aria-busy="true" aria-label="Cargando calificaciones">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} h={36} style={{ marginBottom: 8 }} />
            ))}
          </div>
        </Panel>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar tus calificaciones" error={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        data?.raw && (Array.isArray(data.raw) ? data.raw.length : Object.keys(data.raw || {}).length) ? (
          <GenericTable raw={data.raw} />
        ) : (
          <EmptyState title="Aún no hay calificaciones">Cuando tus docentes las capturen, aparecerán aquí.</EmptyState>
        )
      ) : (
        <>
          <div className="well toolbar">
            <SearchField value={q} onChange={setQ} placeholder={variosPeriodos ? 'Buscar por materia o periodo' : 'Buscar por materia'} />
            <GradeLegend />
          </div>

          <Panel
            title="Calificaciones de semestre"
            icon={Table2}
            flush
            right={
              <span>
                {unaSolaVez ? <span className="label-badge">Periodo: {periodos[0]}</span> : null}{' '}
                {creditos ? <span className="label-badge">Créditos del semestre: {creditos}</span> : null}
              </span>
            }
          >
            <p className="table-foot" style={{ justifyContent: 'flex-end', borderTop: 0, margin: 0 }} aria-live="polite">
              <span>
                Viendo {filtered.length ? `1-${filtered.length}` : '0'} de {rows.length} resultados.
                {filtered.length ? ` Promedio: ${fmtGrade(prom)}.` : ''}
                {enRojo ? ` ${enRojo} sin aprobar.` : ''}
              </span>
            </p>

            {filtered.length === 0 ? (
              <div className="panel-body">
                <EmptyState title="Sin resultados">Ninguna materia o periodo coincide con “{q}”. Prueba con otra palabra.</EmptyState>
              </div>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      {hayClave ? <th scope="col">Clave</th> : null}
                      {hayGrupo ? <th scope="col">Grupo</th> : null}
                      <th scope="col">Materia</th>
                      {variosPeriodos ? <th scope="col">Periodo</th> : null}
                      {hayDocente ? <th scope="col">Profesor</th> : null}
                      {Array.from({ length: nUnits }, (_, i) => (
                        <th key={i} scope="col">Cal. {ROMAN[i] ?? i + 1}</th>
                      ))}
                      <th scope="col">Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((r) => (
                      <tr key={r.id}>
                        {hayClave ? <td>{r.clave ?? ''}</td> : null}
                        {hayGrupo ? <td>{r.grupo ?? ''}</td> : null}
                        <th scope="row" className="materia">{r.materia}</th>
                        {variosPeriodos ? <td>{r.periodo ?? '—'}</td> : null}
                        {hayDocente ? <td className="docente">{r.docente ?? ''}</td> : null}
                        {Array.from({ length: nUnits }, (_, i) => (
                          <td key={i} className="cal">{r.unidades[i] ?? ''}</td>
                        ))}
                        <td>
                          <GradeChip value={r.calificacion} text={r.enCurso ? 'En curso' : r.calificacionTexto} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="table-foot">
              <span className="label-badge">Las calificaciones se actualizan conforme el profesor las actualiza en el sistema.</span>
            </div>
          </Panel>
        </>
      )}
    </>
  )
}
