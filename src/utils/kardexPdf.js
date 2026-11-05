// Genera el reporte del kardex en PDF dentro del navegador (jsPDF), con los datos ya cargados.
// jsPDF y autotable se cargan solo al pulsar "Descargar PDF", así no pesan en la carga inicial.
import { titleCase } from './format'
import { fmtGrade, gradeLevel } from './grades'

const VERDE = [46, 125, 50]
const AMARILLO = [176, 112, 0]
const ROJO = [198, 40, 40]
const AZUL = [34, 82, 128]

const colorNota = (n) => {
  const k = gradeLevel(n).key
  return k === 'ok' ? VERDE : k === 'warn' ? AMARILLO : k === 'bad' ? ROJO : [90, 90, 90]
}

/**
 * @param {{ grupos: Array, resumen: object, avance: number|null }} kardex  resultado de normalizeKardex
 * @param {{ nombre?: string, numeroControl?: string, semestre?: number|string, correo?: string }} perfil
 */
export async function descargarKardexPdf(kardex, perfil = {}) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')])
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const W = doc.internal.pageSize.getWidth()
  const M = 14
  const hayTipo = kardex.grupos.some((g) => g.materias.some((m) => m.tipo))

  // Encabezado
  doc.setFillColor(...AZUL)
  doc.rect(0, 0, W, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold').setFontSize(18).text('Kardex', M, 12)
  doc.setFont('helvetica', 'normal').setFontSize(10).text('Historial académico', M, 19)
  doc.setFontSize(9).text(`Generado el ${new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}`, W - M, 19, { align: 'right' })

  // Datos del estudiante
  doc.setTextColor(30, 30, 30)
  let y = 36
  const datos = [
    ['Nombre', perfil.nombre ? titleCase(perfil.nombre) : null],
    ['No. de control', perfil.numeroControl],
    ['Correo', perfil.correo],
    ['Semestre', perfil.semestre],
  ].filter(([, v]) => v !== null && v !== undefined && v !== '')
  doc.setFontSize(10)
  for (const [k, v] of datos) {
    doc.setFont('helvetica', 'bold').text(`${k}:`, M, y)
    doc.setFont('helvetica', 'normal').text(String(v), M + 32, y)
    y += 6
  }

  // Resumen
  y += 2
  const r = kardex.resumen
  const resumen = [
    ['Avance de la carrera', kardex.avance != null ? `${kardex.avance.toFixed(2)}%` : null],
    ['Materias aprobadas', `${r.aprobadas} de ${r.materias}`],
    ['Promedio aritmético', fmtGrade(r.promedio)],
    ['Créditos aprobados', r.creditos ? String(r.creditos) : null],
  ].filter(([, v]) => v)
  const boxW = (W - M * 2 - 3 * (resumen.length - 1)) / resumen.length
  resumen.forEach(([k, v], i) => {
    const x = M + i * (boxW + 3)
    doc.setDrawColor(210, 210, 210).setFillColor(246, 248, 250).roundedRect(x, y, boxW, 16, 1.5, 1.5, 'FD')
    doc.setTextColor(100, 100, 100).setFont('helvetica', 'normal').setFontSize(8).text(k, x + 3, y + 6)
    doc.setTextColor(30, 30, 30).setFont('helvetica', 'bold').setFontSize(12).text(v, x + 3, y + 13)
  })
  y += 22

  // Tabla: una fila de título por periodo, y sus materias
  const head = [['Clave', 'Materia', 'Créditos', ...(hayTipo ? ['Evaluación'] : []), 'Calificación']]
  const nCols = head[0].length
  const body = []
  for (const g of kardex.grupos) {
    body.push([
      {
        content: `${g.titulo}${g.promedio != null ? `   ·   Promedio ${fmtGrade(g.promedio)}` : ''}`,
        colSpan: nCols,
        styles: { fillColor: [221, 232, 243], textColor: AZUL, fontStyle: 'bold', halign: 'left' },
      },
    ])
    for (const m of g.materias) {
      const nota = m.enCurso ? 'En curso' : m.calificacion !== null ? fmtGrade(m.calificacion) : m.calificacionTexto || '—'
      body.push([
        m.clave ?? '—',
        titleCase(m.materia),
        m.creditos ?? '—',
        ...(hayTipo ? [m.tipo ?? '—'] : []),
        { content: nota, _nota: m.calificacion },
      ])
    }
  }

  autoTable(doc, {
    startY: y,
    head,
    body,
    margin: { left: M, right: M, bottom: 16 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 9, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.2, textColor: [30, 30, 30] },
    headStyles: { fillColor: AZUL, textColor: 255, halign: 'center' },
    columnStyles: {
      0: { halign: 'center', cellWidth: 24 },
      2: { halign: 'center', cellWidth: 20 },
      [nCols - 1]: { halign: 'center', cellWidth: 28, fontStyle: 'bold' },
      ...(hayTipo ? { 3: { halign: 'center', cellWidth: 28 } } : {}),
    },
    didParseCell(h) {
      if (h.section === 'body' && h.column.index === nCols - 1 && h.cell.raw && typeof h.cell.raw === 'object' && '_nota' in h.cell.raw) {
        h.cell.styles.textColor = colorNota(h.cell.raw._nota)
      }
    },
  })

  // Pie de página con número de página
  const total = doc.getNumberOfPages()
  for (let i = 1; i <= total; i++) {
    doc.setPage(i)
    const H = doc.internal.pageSize.getHeight()
    doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(120, 120, 120)
    doc.text('Documento informativo generado desde el portal estudiantil. No sustituye al kardex oficial.', M, H - 8)
    doc.text(`Página ${i} de ${total}`, W - M, H - 8, { align: 'right' })
  }

  const nombreArchivo = `kardex${perfil.numeroControl ? `-${perfil.numeroControl}` : ''}.pdf`
  doc.save(nombreArchivo)
}
