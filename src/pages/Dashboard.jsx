import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BookOpenCheck,
  CalendarClock,
  CalendarDays,
  GraduationCap,
  MapPin,
  PieChart,
  ScrollText,
  Table2,
  User,
  Users,
} from 'lucide-react'
import { api } from '../api'
import { useAuth } from '../context/AuthContext'
import { useAsync } from '../hooks/useAsync'
import { ErrorState, GradeChip, Indicators, Line, PageHeader, Panel, Pie, ProgressBar, Skeleton, TONE } from '../components/ui'
import { average, fmtGrade, gradeLevel } from '../utils/grades'
import { formatFechaHora, humanize, titleCase } from '../utils/format'
import { normalizeCalificaciones } from '../utils/normalize'
import { loadAsesorias } from '../api/asesorias'

const pct = (a, b) => (b ? Math.min(100, (a / b) * 100) : null)
const fmtPct = (n) => `${n.toFixed(2)}%`

function InfoLine({ label, value }) {
  if (value === undefined || value === null || value === '') return null
  return <p>{label}: {value}</p>
}

const TILES = [
  { to: '/calificaciones', label: 'Calificaciones', icon: BookOpenCheck },
  { to: '/kardex', label: 'Kardex', icon: ScrollText },
  { to: '/horario', label: 'Horario', icon: CalendarDays },
  { to: '/asesorias', label: 'Asesorías', icon: Users },
]

export default function Dashboard() {
  const { profile, profileStatus, profileError, loadProfile } = useAuth()
  const cal = useAsync(async () => normalizeCalificaciones(await api.getCalificaciones()), [])
  const ases = useAsync(async () => (await loadAsesorias()).filter((a) => a.ya_inscrito), [])

  const rows = cal.data?.rows ?? []
  const promedioCalc = useMemo(() => average(rows.map((r) => r.calificacion)), [rows])
  const proximas = useMemo(
    () => (ases.data ?? []).filter((a) => a.estatus === 'activa' && new Date(a.fecha_hora) > new Date()).slice(0, 3),
    [ases.data]
  )

  const p = profile
  const nombre = p?.nombre ? titleCase(p.nombre) : null
  const saludo = p?.nombrePila || (p?.nombre ? p.nombre.split(/\s+/)[0] : null)

  const creditosPct = p ? pct(p.creditosAprobados, p.creditosTotales) : null
  const semestresPct = p ? pct(p.semestresAcumulados, p.semestresTotales) : null

  // Gráfica de pastel: créditos si el perfil los trae; si no, materias del periodo.
  const pie = useMemo(() => {
    if (p?.creditosAprobados != null && p?.creditosTotales) {
      return {
        title: 'Créditos',
        slices: [
          { label: 'Acreditados', value: p.creditosAprobados, color: '#3366cc' },
          { label: 'Pendientes', value: Math.max(0, p.creditosTotales - p.creditosAprobados), color: '#dc3912' },
        ],
      }
    }
    if (p?.porcentajeAvance != null) {
      const av = Math.max(0, Math.min(100, p.porcentajeAvance))
      return {
        title: 'Avance de la carrera',
        slices: [
          { label: 'Avance', value: av, color: '#3366cc' },
          { label: 'Pendiente', value: 100 - av, color: '#dc3912' },
        ],
      }
    }
    const conNota = rows.filter((r) => r.calificacion !== null)
    if (!conNota.length) return null
    return {
      title: 'Materias del periodo',
      slices: [
        { label: 'Aprobadas', value: conNota.filter((r) => r.calificacion >= 70).length, color: '#3366cc' },
        { label: 'No aprobadas', value: conNota.filter((r) => r.calificacion < 70).length, color: '#dc3912' },
      ],
    }
  }, [p, rows])

  const promedioGeneral = p?.promedio ?? (p?.promedioPonderado == null && p?.promedioAritmetico == null ? promedioCalc : null)
  const hayIndicadores =
    p &&
    [
      p.promedioPonderado,
      p.promedioAritmetico,
      p.porcentajeAvance,
      promedioGeneral,
      p.creditosAprobados,
      p.creditosAcademicos,
      p.semestresAcumulados,
      p.semestre,
      p.indiceReprobacion,
      p.promMateriasSem,
      p.materiasReprobadas,
      p.materiasAcreditadas,
      p.especialesAcumulados,
    ].some((v) => v !== undefined && v !== null)

  return (
    <>
      <PageHeader title={profileStatus === 'ready' && saludo ? `Hola, ${titleCase(saludo)}` : 'Inicio'} crumbs={[{ label: 'Inicio' }]} />

      {profileStatus === 'error' ? (
        <ErrorState title="No pudimos cargar tu perfil" error={profileError} onRetry={loadProfile} />
      ) : (
        <Panel title={nombre || 'Perfil del estudiante'} icon={User}>
          {profileStatus !== 'ready' ? (
            <div aria-busy="true" aria-label="Cargando perfil">
              <Skeleton h={18} w="55%" style={{ marginBottom: 12 }} />
              <Skeleton h={18} w="70%" style={{ marginBottom: 12 }} />
              <Skeleton h={18} w="40%" style={{ marginBottom: 12 }} />
              <Skeleton h={120} />
            </div>
          ) : (
            <div className="profile-grid">
              <div className="profile-main">
                <div className="profile-photo">
                  {p.foto ? <img src={p.foto} alt={`Foto de ${nombre || 'la persona estudiante'}`} /> : <User size={64} strokeWidth={1.4} aria-hidden="true" />}
                </div>
                <div className="profile-info">
                  <InfoLine label="No. control" value={p.numeroControl} />
                  <InfoLine label="Carrera" value={p.carrera && titleCase(p.carrera)} />
                  <InfoLine label="Especialidad" value={p.especialidad && titleCase(p.especialidad)} />
                  <InfoLine label="Módulo de especialidad" value={p.moduloEspecialidad} />
                  <InfoLine label="Inscrito" value={p.inscrito} />
                  <InfoLine label="Estatus" value={p.estatus && titleCase(p.estatus)} />
                  <InfoLine label="Sede" value={p.sede && titleCase(p.sede)} />
                  <InfoLine label="Correo" value={p.correo} />
                  <InfoLine label="Plan de estudios" value={p.plan} />
                  {p.otros.map((o) => (
                    <InfoLine key={o.clave} label={humanize(o.clave)} value={o.valor} />
                  ))}
                  {p.vacio ? <p className="muted">El servidor no devolvió datos del perfil.</p> : null}
                </div>
              </div>

              {hayIndicadores ? (
                <Indicators>
                  {p.promedioPonderado != null ? <Line label="Promedio ponderado">{fmtGrade(p.promedioPonderado)}</Line> : null}
                  {p.promedioAritmetico != null ? <Line label="Promedio aritmético">{fmtGrade(p.promedioAritmetico)}</Line> : null}
                  {promedioGeneral != null ? (
                    <Line label={p.promedio != null ? 'Promedio general' : 'Promedio del periodo'}>{fmtGrade(promedioGeneral)}</Line>
                  ) : null}

                  {p.creditosAprobados != null || p.creditosAcademicos != null ? (
                    <div className="ind-line">
                      <strong>Créditos cursados:</strong>
                      <ul className="ind-sub">
                        {p.creditosAcademicos != null ? <li>Académicos: {p.creditosAcademicos}</li> : null}
                        {p.creditosComplementarios != null ? <li>Complementarios: {p.creditosComplementarios}</li> : null}
                        {p.creditosAprobados != null ? (
                          <li>
                            Acumulados: {p.creditosAprobados}
                            {p.creditosTotales ? ` de ${p.creditosTotales}` : ''}
                            {creditosPct !== null ? <strong> {fmtPct(creditosPct)}</strong> : null}
                          </li>
                        ) : null}
                      </ul>
                      {creditosPct !== null ? <ProgressBar value={creditosPct} tone="success" label={`${fmtPct(creditosPct)} de avance`} /> : null}
                    </div>
                  ) : null}

                  {p.porcentajeAvance != null ? (
                    <div className="ind-line">
                      <strong>Avance de la carrera:</strong> {fmtPct(Math.min(100, p.porcentajeAvance))}
                      <div className="ind-pct">
                        <ProgressBar value={p.porcentajeAvance} tone="success" label={`${fmtPct(Math.min(100, p.porcentajeAvance))} de avance`} />
                      </div>
                    </div>
                  ) : null}

                  {p.semestresAcumulados != null ? (
                    <div className="ind-line">
                      <strong>Semestres acumulados:</strong> {p.semestresAcumulados}
                      {p.semestresTotales ? ` de ${p.semestresTotales}` : ''}
                      {semestresPct !== null ? <strong> {fmtPct(semestresPct)}</strong> : null}
                      {semestresPct !== null ? (
                        <div className="ind-pct">
                          <ProgressBar value={semestresPct} tone="danger" label={`${fmtPct(semestresPct)} de avance`} />
                        </div>
                      ) : null}
                    </div>
                  ) : p.semestre != null ? (
                    <Line label="Semestre actual">{p.semestre}</Line>
                  ) : null}

                  {p.indiceReprobacion != null ? <Line label="Índice de reprobación">{p.indiceReprobacion}</Line> : null}
                  {p.promMateriasSem != null ? <Line label="Promedio de materias acreditadas por semestre">{p.promMateriasSem}</Line> : null}
                  {p.materiasReprobadas != null ? <Line label="Materias reprobadas acumuladas">{p.materiasReprobadas}</Line> : null}
                  {p.materiasAcreditadas != null ? <Line label="Materias acreditadas">{p.materiasAcreditadas}</Line> : null}
                  {p.especialesAcumulados != null ? <Line label="Especiales acumulados">{p.especialesAcumulados}</Line> : null}
                </Indicators>
              ) : null}
            </div>
          )}
        </Panel>
      )}

      <div className="dash-grid">
        <Panel
          title="Calificaciones de semestre"
          icon={Table2}
          right={<Link to="/calificaciones" className="btn btn-default btn-sm">Ver todas</Link>}
        >
          {cal.loading && !cal.data ? (
            <div aria-hidden="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="bar-row">
                  <Skeleton h={14} w="70%" style={{ marginBottom: 6 }} />
                  <Skeleton h={10} />
                </div>
              ))}
            </div>
          ) : cal.status === 'error' ? (
            <ErrorState title="No pudimos cargar tus calificaciones" error={cal.error} onRetry={cal.reload} />
          ) : rows.length === 0 ? (
            <p className="muted">Todavía no hay calificaciones registradas.</p>
          ) : (
            <ul className="bars">
              {rows.slice(0, 8).map((r) => {
                const lvl = gradeLevel(r.calificacion)
                return (
                  <li key={r.id} className="bar-row">
                    <div className="bar-top">
                      <span>{r.materia}</span>
                      <GradeChip value={r.calificacion} text={r.enCurso ? 'En curso' : r.calificacionTexto} showLabel={false} />
                    </div>
                    <ProgressBar small value={r.calificacion ?? 0} tone={TONE[lvl.key]} ariaLabel={`${r.materia}: ${r.calificacion ?? 'sin calificar'}`} />
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <div>
          <Panel title="Avance" icon={PieChart} variant="success">
            {pie ? <Pie title={pie.title} slices={pie.slices} /> : cal.loading ? <Skeleton h={160} /> : <p className="muted">Todavía no hay datos para la gráfica.</p>}
          </Panel>

          <Panel title="Tus próximas asesorías" icon={GraduationCap} variant="info">
            {ases.loading && !ases.data ? (
              <div aria-hidden="true">
                <Skeleton h={44} style={{ marginBottom: 10 }} />
                <Skeleton h={44} />
              </div>
            ) : ases.status === 'error' ? (
              <p className="muted">
                No pudimos cargar tus asesorías. <button type="button" className="btn btn-link" onClick={ases.reload}>Reintentar</button>
              </p>
            ) : proximas.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Aún no estás inscrito en ninguna asesoría. <Link to="/asesorias">Explorar asesorías</Link>
              </p>
            ) : (
              <ul className="mini-list">
                {proximas.map((a) => (
                  <li key={a.id}>
                    <strong>{a.materia_asesoria}</strong>
                    <span><CalendarClock size={14} aria-hidden="true" /> {formatFechaHora(a.fecha_hora)}</span>
                    <span><MapPin size={14} aria-hidden="true" /> {a.ubicacion}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>

      <nav className="tiles" aria-label="Accesos rápidos">
        {TILES.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className="tile">
            <Icon size={44} strokeWidth={1.6} aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>
    </>
  )
}
