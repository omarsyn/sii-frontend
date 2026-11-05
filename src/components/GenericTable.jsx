import { genericRows } from '../utils/normalize'
import { humanize } from '../utils/format'

/**
 * Respaldo: si el JSON del SII llega con una forma que los normalizadores no reconocen,
 * se muestra tal cual en una tabla para que nunca quede la pantalla vacía.
 */
export default function GenericTable({ raw }) {
  const rows = genericRows(raw)
  if (!rows.length) return null
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))].slice(0, 10)
  return (
    <>
      <p className="muted">Mostramos los datos tal como los devolvió el servidor.</p>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>{cols.map((c) => <th key={c} scope="col">{humanize(c)}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{cols.map((c) => <td key={c}>{r[c] ?? '—'}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
