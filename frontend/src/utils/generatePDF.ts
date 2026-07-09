import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  projectInfo,
  budgetData,
  budgetTotals,
  cashFlowData,
  procurementData,
  procurementTotals,
  getLiveEarnedValueData,
  fmtNum,
  fmtPct,
} from './reportData';

// Brand colors
const PRIMARY = [27, 94, 171] as const;
const STEEL   = [139, 142, 150] as const;
const DARK    = [26, 28, 33] as const;
const WHITE   = [255, 255, 255] as const;
const LIGHT   = [240, 244, 250] as const;

// ── Logo loader (cached) ────────────────────────────────────────
let _logoCache: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (_logoCache) return _logoCache;
  try {
    const res = await fetch('/images/pcmejia-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        _logoCache = reader.result as string;
        resolve(_logoCache);
      };
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Header with corporate branding ─────────────────────────────
async function addHeader(doc: jsPDF, title: string, subtitle: string): Promise<number> {
  const logo = await loadLogo();
  const pw = doc.internal.pageSize.getWidth();

  // --- Blue band ---
  doc.setFillColor(...PRIMARY);
  doc.rect(0, 0, pw, 38, 'F');

  // --- Logo block (white rounded bg) ---
  if (logo) {
    doc.setFillColor(...WHITE);
    doc.roundedRect(8, 4, 44, 30, 3, 3, 'F');
    doc.addImage(logo, 'PNG', 9, 5, 42, 28);
  }

  // --- Title & subtitle ---
  const tx = logo ? 58 : 14;
  doc.setTextColor(...WHITE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, tx, 17);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(subtitle, tx, 27);

  // --- Company name top-right ---
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text('PCMejia SA', pw - 10, 12, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text('NIT: 811.025.231-5 | Itagui, Antioquia', pw - 10, 19, { align: 'right' });

  // --- Info bar ---
  doc.setFillColor(...LIGHT);
  doc.rect(0, 38, pw, 16, 'F');
  doc.setTextColor(...DARK);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');

  const col2 = pw / 2 + 5;
  doc.text(`Proyecto:  ${projectInfo.name}`, 12, 45);
  doc.text(`Contratista:  ${projectInfo.contractor}`, 12, 51);
  doc.text(`Codigo:  ${projectInfo.code}`, col2, 45);
  doc.text(`Cliente:  ${projectInfo.client}`, col2, 51);

  doc.setTextColor(...STEEL);
  doc.setFontSize(6.5);
  doc.text(`Generado:  ${projectInfo.date}`, pw - 10, 51, { align: 'right' });

  // --- Separator line ---
  doc.setDrawColor(...PRIMARY);
  doc.setLineWidth(0.8);
  doc.line(0, 54, pw, 54);

  return 60; // Y start for content
}

// ── Footer ─────────────────────────────────────────────────────
function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  const pw = doc.internal.pageSize.getWidth();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFillColor(...LIGHT);
    doc.rect(0, 284, pw, 13, 'F');
    doc.setDrawColor(...PRIMARY);
    doc.setLineWidth(0.5);
    doc.line(0, 284, pw, 284);
    doc.setFontSize(6.5);
    doc.setTextColor(...STEEL);
    doc.text(`CONFIDENCIAL — PCMejia SA  |  ${projectInfo.name}  ${projectInfo.code}`, 12, 291);
    doc.text(`Pag. ${i} / ${pages}`, pw - 10, 291, { align: 'right' });
  }
}

// ── Helper: add page with header ───────────────────────────────
async function addPage(doc: jsPDF, title: string, subtitle: string): Promise<number> {
  doc.addPage();
  return addHeader(doc, title, subtitle);
}

// ============================================================
// REPORT 1 — Estado General
// ============================================================
export async function generateProjectStatusPDF(projectId: string = '') {
  const doc = new jsPDF();
  let y = await addHeader(doc, 'Estado General del Proyecto', 'Resumen ejecutivo con indicadores clave de desempeno');

  const ev = getLiveEarnedValueData(projectId);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Indicadores Clave de Desempeno (KPIs)', 14, y);
  y += 8;

  const kpis = [
    ['Valor Oferta Total (BAC)', `$ ${fmtNum(budgetTotals.totalOferta)}`],
    ['Costo Total Estimado (EAC)', `$ ${fmtNum(ev.EAC)}`],
    ['Margen Global', fmtPct(budgetTotals.margenGlobal)],
    ['Avance Fisico (' + ev.weekLabel + ')', fmtPct(ev.avanceFisico)],
    ['Avance Planificado (' + ev.weekLabel + ')', fmtPct(ev.avancePlanificado)],
    ['Avance Financiero', fmtPct(ev.avanceFinanciero)],
    ['CPI (Indice Costo)', ev.CPI.toFixed(2)],
    ['SPI (Indice Cronograma)', ev.SPI.toFixed(2)],
    ['Costo Real (AC)', `$ ${fmtNum(ev.AC)}`],
    ['EAC (Estimado a Terminacion)', `$ ${fmtNum(ev.EAC)}`],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Indicador', 'Valor']],
    body: kpis,
    theme: 'grid',
    headStyles: { fillColor: [...PRIMARY], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 }, 1: { halign: 'right', cellWidth: 35 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Resumen Presupuestal por Capitulo', 14, y);
  y += 6;

  const budgetBody = budgetData.map((r) => [
    r.capitulo,
    `$ ${fmtNum(r.venta)}`,
    `$ ${fmtNum(r.costo)}`,
    `$ ${fmtNum(r.venta - r.costo)}`,
    fmtPct(r.margen),
  ]);
  budgetBody.push([
    'TOTAL COSTO DIRECTO',
    `$ ${fmtNum(budgetData.reduce((s, r) => s + r.venta, 0))}`,
    `$ ${fmtNum(budgetTotals.costoDirecto)}`,
    `$ ${fmtNum(budgetData.reduce((s, r) => s + r.venta, 0) - budgetTotals.costoDirecto)}`,
    '',
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Capitulo', 'Venta', 'Costo', 'Margen $', 'Margen %']],
    body: budgetBody,
    theme: 'striped',
    headStyles: { fillColor: [...PRIMARY], fontSize: 7.5, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { cellWidth: 52 },
      1: { halign: 'right' }, 2: { halign: 'right' },
      3: { halign: 'right' }, 4: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === budgetBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 232, 247];
      }
      if (data.column.index === 4 && data.section === 'body') {
        const v = parseFloat(String(data.cell.raw).replace('%', ''));
        if (v < 0) data.cell.styles.textColor = [220, 38, 38];
        else if (v < 10) data.cell.styles.textColor = [217, 119, 6];
      }
    },
  });

  // Page 2 — EVM
  y = await addPage(doc, 'Estado General del Proyecto', 'Analisis de Valor Ganado (EVM)');

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`Analisis de Valor Ganado (EVM) — ${ev.weekLabel} (${ev.weekDate})`, 14, y);
  y += 8;

  const evRows = [
    ['BAC — Presupuesto a la Terminacion', `$ ${fmtNum(ev.BAC)}`],
    ['PV — Valor Planificado (' + ev.weekLabel + ')', `$ ${fmtNum(ev.PV)}`],
    ['EV — Valor Ganado (' + ev.weekLabel + ')', `$ ${fmtNum(ev.EV)}`],
    ['AC — Costo Real', `$ ${fmtNum(ev.AC)}`],
    ['CPI — Indice de Rendimiento de Costo', ev.CPI.toFixed(2) + (ev.CPI < 1 ? '  ⚠ Sobrecosto' : '  ✓ Eficiente')],
    ['SPI — Indice de Rendimiento de Cronograma', ev.SPI.toFixed(2) + (ev.SPI < 1 ? '  ⚠ Atraso' : '  ✓ En tiempo')],
    ['EAC — Estimacion a la Terminacion', `$ ${fmtNum(ev.EAC)}`],
    ['ETC — Estimado para Completar', `$ ${fmtNum(ev.ETC)}`],
    ['VAC — Variacion a la Terminacion', `$ ${fmtNum(ev.VAC)}`],
    ['TCPI — Indice de Desempeno Requerido', ev.TCPI.toFixed(2)],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metrica EVM', 'Valor']],
    body: evRows,
    theme: 'grid',
    headStyles: { fillColor: [...PRIMARY], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8.5 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 75 }, 1: { halign: 'right', cellWidth: 35 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 1) {
        const text = String(data.cell.raw);
        if (text.includes('Sobrecosto') || text.includes('Atraso')) data.cell.styles.textColor = [220, 38, 38];
        else if (text.includes('Eficiente') || text.includes('tiempo')) data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  addFooter(doc);
  doc.save('Estado_General_Proyecto.pdf');
}

// ============================================================
// REPORT 2 — Flujo de Caja
// ============================================================
export async function generateCashFlowPDF(projectId: string = '') {
  const doc = new jsPDF('landscape');
  let y = await addHeader(doc, 'Flujo de Caja Mensual', 'Ingresos vs Egresos con acumulados y proyeccion');

  const body = cashFlowData.map((r) => [
    r.periodo,
    `$ ${fmtNum(r.ingresoProyectado)}`,
    `$ ${fmtNum(r.ingresoReal)}`,
    `$ ${fmtNum(r.egresoProyectado)}`,
    `$ ${fmtNum(r.egresoReal)}`,
    `$ ${fmtNum(r.netoProyectado)}`,
    r.netoReal !== 0 ? `$ ${fmtNum(r.netoReal)}` : '—',
  ]);

  const acumIngProy = cashFlowData.reduce((s, r) => s + r.ingresoProyectado, 0);
  const acumIngReal = cashFlowData.reduce((s, r) => s + r.ingresoReal, 0);
  const acumEgrProy = cashFlowData.reduce((s, r) => s + r.egresoProyectado, 0);
  const acumEgrReal = cashFlowData.reduce((s, r) => s + r.egresoReal, 0);

  body.push([
    'ACUMULADO',
    `$ ${fmtNum(acumIngProy)}`, `$ ${fmtNum(acumIngReal)}`,
    `$ ${fmtNum(acumEgrProy)}`, `$ ${fmtNum(acumEgrReal)}`,
    `$ ${fmtNum(acumIngProy - acumEgrProy)}`, `$ ${fmtNum(acumIngReal - acumEgrReal)}`,
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Periodo', 'Ingreso Proy.', 'Ingreso Real', 'Egreso Proy.', 'Egreso Real', 'Neto Proy.', 'Neto Real']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [...PRIMARY], fontSize: 8, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 8, halign: 'right' },
    columnStyles: { 0: { halign: 'left', fontStyle: 'bold', cellWidth: 28 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === body.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 232, 247];
      }
      if ((data.column.index === 5 || data.column.index === 6) && data.section === 'body') {
        if (String(data.cell.raw).startsWith('$ -')) data.cell.styles.textColor = [220, 38, 38];
      }
    },
  });

  addFooter(doc);
  doc.save('Flujo_Caja_Mensual.pdf');
}

// ============================================================
// REPORT 3 — Variacion Presupuestaria
// ============================================================
export async function generateBudgetVariancePDF(projectId: string = '') {
  const doc = new jsPDF('landscape');
  let y = await addHeader(doc, 'Cuadro de Variacion Presupuestaria', 'Presupuesto Original vs Vigente vs Real por partida');

  const body = budgetData.map((r) => {
    const comprometido = Math.round(r.costo * 0.54);
    const real        = Math.round(comprometido * 0.65);
    const disponible  = r.costo - comprometido;
    const pctConsumo  = (comprometido / r.costo) * 100;
    return [
      r.capitulo,
      `$ ${fmtNum(r.venta)}`,
      `$ ${fmtNum(r.costo)}`,
      `$ ${fmtNum(comprometido)}`,
      `$ ${fmtNum(real)}`,
      `$ ${fmtNum(disponible)}`,
      fmtPct(pctConsumo),
    ];
  });

  autoTable(doc, {
    startY: y,
    head: [['Capitulo', 'Ppto Venta', 'Ppto Costo', 'Comprometido', 'Ejecutado Real', 'Disponible', '% Consumo']],
    body,
    theme: 'striped',
    headStyles: { fillColor: [...PRIMARY], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7.5, halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 48 } },
    margin: { left: 10, right: 10 },
    didParseCell: (data) => {
      if (data.column.index === 6 && data.section === 'body') {
        const v = parseFloat(String(data.cell.raw).replace('%', ''));
        if (v > 80) data.cell.styles.textColor = [220, 38, 38];
        else if (v > 60) data.cell.styles.textColor = [217, 119, 6];
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Estructura AIU y Financiacion', 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    head: [['Concepto', 'Valor', '% sobre CD']],
    body: [
      ['Costo Directo', `$ ${fmtNum(budgetTotals.costoDirecto)}`, '100%'],
      ['Administracion (11%)', `$ ${fmtNum(budgetTotals.administracion)}`, '11.0%'],
      ['Imprevistos (2%)', `$ ${fmtNum(budgetTotals.imprevistos)}`, '2.0%'],
      ['Utilidad (4%)', `$ ${fmtNum(budgetTotals.utilidad)}`, '4.0%'],
      ['IVA sobre Utilidad', `$ ${fmtNum(budgetTotals.ivaUtilidad)}`, ''],
      ['Financiacion Real ($17B a IBR+2.85)', `$ ${fmtNum(budgetTotals.financiacion)}`, ''],
      ['TOTAL OFERTA', `$ ${fmtNum(budgetTotals.totalOferta)}`, ''],
    ],
    theme: 'grid',
    headStyles: { fillColor: [...PRIMARY], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 72 }, 1: { halign: 'right' }, 2: { halign: 'center' } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === 6) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 232, 247];
      }
    },
  });

  addFooter(doc);
  doc.save('Variacion_Presupuestaria.pdf');
}

// ============================================================
// REPORT 4 — EAC / Valor Ganado
// ============================================================
export async function generateEACReportPDF(projectId: string = '') {
  const doc = new jsPDF();
  let y = await addHeader(doc, 'Reporte de Costos a Terminacion (EAC)', 'Analisis de Valor Ganado — Earned Value Management');

  const ev4 = getLiveEarnedValueData(projectId);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text(`Metricas de Valor Ganado — ${ev4.weekLabel} (${ev4.weekDate})`, 14, y);
  y += 8;

  const evmRows = [
    ['BAC — Budget At Completion',       `$ ${fmtNum(ev4.BAC)}`,       'Presupuesto total del proyecto'],
    ['PV — Planned Value (' + ev4.weekLabel + ')',  `$ ${fmtNum(ev4.PV)}`,  'Valor planificado a la fecha'],
    ['EV — Earned Value (' + ev4.weekLabel + ')',   `$ ${fmtNum(ev4.EV)}`,  'Valor ganado por trabajo completado'],
    ['AC — Actual Cost',                 `$ ${fmtNum(ev4.AC)}`,        'Costo real incurrido a la fecha'],
    ['CV — Cost Variance',               `$ ${fmtNum(ev4.EV - ev4.AC)}`, ev4.EV - ev4.AC < 0 ? 'SOBRECOSTO' : 'Bajo presupuesto'],
    ['SV — Schedule Variance',           `$ ${fmtNum(ev4.EV - ev4.PV)}`, ev4.EV - ev4.PV < 0 ? 'ATRASO' : 'Adelanto'],
    ['CPI — Cost Performance Index',     ev4.CPI.toFixed(2),            ev4.CPI < 1 ? 'Gastando mas de lo planeado' : 'Eficiente en costos'],
    ['SPI — Schedule Performance Index', ev4.SPI.toFixed(2),            ev4.SPI < 1 ? 'Atrasado vs cronograma' : 'Adelantado'],
    ['EAC — Estimate At Completion',     `$ ${fmtNum(ev4.EAC)}`,       'Costo estimado total al finalizar'],
    ['ETC — Estimate To Complete',       `$ ${fmtNum(ev4.ETC)}`,       'Costo estimado para completar'],
    ['VAC — Variance At Completion',     `$ ${fmtNum(ev4.VAC)}`,       ev4.VAC < 0 ? 'Sobrecosto proyectado' : 'Ahorro proyectado'],
    ['TCPI — To-Complete Performance',   ev4.TCPI.toFixed(2),           ev4.TCPI > 1 ? 'Requiere mejorar eficiencia' : 'Alcanzable'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Metrica', 'Valor', 'Interpretacion']],
    body: evmRows,
    theme: 'grid',
    headStyles: { fillColor: [...PRIMARY], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5 },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { halign: 'right', cellWidth: 30 },
      2: { cellWidth: 50, fontSize: 7 },
    },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 2) {
        const t = String(data.cell.raw);
        if (['SOBRECOSTO','ATRASO','Sobrecosto','Gastando','Atrasado','mejorar'].some(s => t.includes(s)))
          data.cell.styles.textColor = [220, 38, 38];
        else if (['Eficiente','Adelantado','Ahorro','Alcanzable','Bajo presupuesto'].some(s => t.includes(s)))
          data.cell.styles.textColor = [22, 163, 74];
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 12;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...DARK);
  doc.text('Gestion de Compras vs Caso de Negocio', 14, y);
  y += 6;

  const procBody = procurementData.map((r) => [
    r.capitulo,
    `$ ${fmtNum(r.casoNegocio)}`,
    `$ ${fmtNum(r.negociado)}`,
    `$ ${fmtNum(r.pendiente)}`,
    `$ ${fmtNum(r.ahorro)}`,
    r.casoNegocio > 0 ? fmtPct((r.negociado / r.casoNegocio) * 100) : '0%',
  ]);
  procBody.push([
    'TOTAL',
    `$ ${fmtNum(procurementTotals.totalCasoNegocio)}`,
    `$ ${fmtNum(procurementTotals.totalNegociado)}`,
    `$ ${fmtNum(procurementTotals.totalPendiente)}`,
    `$ ${fmtNum(procurementTotals.ahorroCompra)}`,
    fmtPct(procurementTotals.pctNegociado),
  ]);

  autoTable(doc, {
    startY: y,
    head: [['Capitulo', 'Caso Negocio', 'Negociado', 'Pendiente', 'Ahorro', '% Avance']],
    body: procBody,
    theme: 'striped',
    headStyles: { fillColor: [...PRIMARY], fontSize: 7.5, fontStyle: 'bold', halign: 'center' },
    bodyStyles: { fontSize: 7.5, halign: 'right' },
    columnStyles: { 0: { halign: 'left', cellWidth: 42 } },
    margin: { left: 14, right: 14 },
    didParseCell: (data) => {
      if (data.row.index === procBody.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [220, 232, 247];
      }
    },
  });

  addFooter(doc);
  doc.save('Reporte_EAC_Valor_Ganado.pdf');
}
