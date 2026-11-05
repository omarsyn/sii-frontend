import { useMemo } from 'react'
import { CalendarDays, MapPin, UserRound } from 'lucide-react'
import { api } from '../api'
import { useAsync } from '../hooks/useAsync'
import { EmptyState, ErrorState, PageHeader, Panel, Skeleton } from '../components/ui'
import GenericTable from '../components/GenericTable'
import { DIAS, normalizeHorario, sessionLabel } from '../utils/normalize'
import { minutesToHHMM, titleCase } from '../utils/format'

const STEP = 30 // minutos por fila de la cuadrícula

function layout(sessions) {
  const days = [0, 1, 2, 3, 4]
  if (sessions.some((s) => s.dia === 5)) days.push(5)
  const start = Math.floor(Math.min(...sessions.map((s) => s.inicio)) / 60) * 60
  const end = Math.ceil(Math.max(...sessions.map((s) => s.fin)) / 60) * 60
  const hours = []
  for (let m = start; m < end; m += 60) hours.push(m)
  return { days, start, end, hours }
}

export default function Horario() {
  const { data, status, error, reload } = useAsync(async () => normalizeHorario(await api.getHorarios()), [])
  const sessions = data?.sessions ?? []

  const colorOf = useMemo(() => {
    const map = new Map()
    ;(data?.materias ?? []).forEach((m, i) => map.set(m, i % 6))
    return (materia) => map.get(materia) ?? 0
  }, [data])

  const grid = useMemo(() => (sessions.length ? layout(sessions) : null), [sessions])

  const porDia = useMemo(() => {
    const out = DIAS.map((nombre, i) => ({
      nombre,
      items: sessions.filter((s) => s.dia === i).sort((a, b) => a.inicio - b.inicio),
    }))
    return out.filter((d) => d.items.length)
  }, [sessions])

  return (
    <>
      <PageHeader title="Horario" subtitle="Tus clases de la semana, por día y hora." />

      {status === 'loading' && !data ? (
        <Panel title="Horario del semestre" icon={CalendarDays}>
          <div aria-busy="true" aria-label="Cargando horario">
            {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} h={44} style={{ marginBottom: 8 }} />)}
          </div>
        </Panel>
      ) : status === 'error' ? (
        <ErrorState title="No pudimos cargar tu horario" error={error} onRetry={reload} />
      ) : sessions.length === 0 ? (
        data?.raw && (Array.isArray(data.raw) ? data.raw.length : Object.keys(data.raw || {}).length) ? (
          <GenericTable raw={data.raw} />
        ) : (
          <EmptyState title="No tienes clases en tu horario">Cuando se te asigne un grupo, tu horario aparecerá aquí.</EmptyState>
        )
      ) : (
        <>
          {/* Vista de semana (pantallas anchas) */}
          <Panel title="Horario del semestre" icon={CalendarDays} flush className="week-panel">
            <div className="week-scroll">
              <div
                className="week"
                style={{
                  gridTemplateColumns: `56px repeat(${grid.days.length}, minmax(130px, 1fr))`,
                  gridTemplateRows: `36px repeat(${(grid.end - grid.start) / STEP}, 30px)`,
                }}
                role="table"
                aria-label="Horario semanal"
              >
                <div className="week-corner" style={{ gridRow: 1, gridColumn: 1 }} />
                {grid.days.map((d, i) => (
                  <div key={d} className="week-day" style={{ gridRow: 1, gridColumn: i + 2 }} role="columnheader">
                    {DIAS[d]}
                  </div>
                ))}
                {grid.hours.map((h) => {
                  const row = (h - grid.start) / STEP + 2
                  return (
                    <div key={h} className="week-hour" style={{ gridRow: `${row} / span 2`, gridColumn: '1 / -1' }}>
                      <span>{minutesToHHMM(h)}</span>
                    </div>
                  )
                })}
                {sessions.map((s) => {
                  const col = grid.days.indexOf(s.dia)
                  if (col === -1) return null
                  const r1 = (s.inicio - grid.start) / STEP + 2
                  const r2 = Math.max(r1 + 1, (s.fin - grid.start) / STEP + 2)
                  return (
                    <div
                      key={s.id}
                      className={`block c${colorOf(s.materia)}`}
                      style={{ gridColumn: col + 2, gridRow: `${r1} / ${r2}` }}
                      title={`${s.materia}\n${sessionLabel(s)}${s.docente ? `\n${s.docente}` : ''}`}
                      role="cell"
                    >
                      <strong>{s.materia}</strong>
                      <span>{sessionLabel(s)}</span>
                      {s.aula ? <span>{s.aula}</span> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          </Panel>

          {/* Agenda por día (celulares) */}
          <div className="agenda">
            {porDia.map((d) => (
              <Panel key={d.nombre} title={d.nombre} icon={CalendarDays}>
                <ul className="agenda-list">
                  {d.items.map((s) => (
                    <li key={s.id} className={`c${colorOf(s.materia)}`}>
                      <span className="agenda-time">{minutesToHHMM(s.inicio)}<small>{minutesToHHMM(s.fin)}</small></span>
                      <div>
                        <strong>{s.materia}</strong>
                        {s.aula ? <span><MapPin size={13} aria-hidden="true" /> {s.aula}</span> : null}
                        {s.docente ? <span><UserRound size={13} aria-hidden="true" /> {titleCase(s.docente)}</span> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
            ))}
          </div>
        </>
      )}
    </>
  )
}
