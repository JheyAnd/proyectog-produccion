import * as XLSX from 'xlsx';
import {
  projectInfo,
  budgetData,
  budgetTotals,
  cashFlowData,
  getLiveEarnedValueData,
  procurementData,
  procurementTotals,
} from './reportData';

function createWorkbook() {
  return XLSX.utils.book_new();
}

function autoWidth(ws: XLSX.WorkSheet, data: unknown[][]) {
  const colWidths = data[0].map((_, i) => {
    const maxLen = data.reduce((max, row) => {
      const cell = row[i];
      const len = cell != null ? String(cell).length : 0;
      return Math.max(max, len);
    }, 0);
    return { wch: Math.min(maxLen + 3, 40) };
  });
  ws['!cols'] = colWidths;
}

// ==================== REPORT 1: Estado General ====================
export function generateProjectStatusExcel(projectId: string = '') {
  const wb = createWorkbook();

  const ev = getLiveEarnedValueData(projectId);

  // Sheet 1: KPIs
  const kpiData = [
    ['ESTADO GENERAL DEL PROYECTO'],
    [`Proyecto: ${projectInfo.name}`],
    [`Cliente: ${projectInfo.client} | Contratista: ${projectInfo.contractor}`],
    [`Fecha: ${projectInfo.date}`],
    [],
    ['Indicador', 'Valor'],
    ['Valor Oferta Total (BAC)', budgetTotals.totalOferta],
    ['Costo Total Estimado (EAC)', ev.EAC],
    ['Costo Real (AC)', ev.AC],
    ['Margen Global %', budgetTotals.margenGlobal / 100],
    [`Avance Fisico % (${ev.weekLabel})`, ev.avanceFisico / 100],
    [`Avance Planificado % (${ev.weekLabel})`, ev.avancePlanificado / 100],
    ['Avance Financiero %', ev.avanceFinanciero / 100],
    ['CPI', ev.CPI],
    ['SPI', ev.SPI],
    ['EAC', ev.EAC],
    ['ETC', ev.ETC],
    ['VAC', ev.VAC],
    ['TCPI', ev.TCPI],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(kpiData);
  autoWidth(ws1, kpiData);
  XLSX.utils.book_append_sheet(wb, ws1, 'KPIs');

  // Sheet 2: Budget detail
  const budgetHeader = ['Capitulo', 'Venta (Oferta)', 'Costo', 'Margen $', 'Margen %'];
  const budgetRows = budgetData.map((r) => [
    r.capitulo, r.venta, r.costo, r.venta - r.costo, r.margen / 100,
  ]);
  budgetRows.push([
    'TOTAL',
    budgetData.reduce((s, r) => s + r.venta, 0),
    budgetTotals.costoDirecto,
    budgetData.reduce((s, r) => s + r.venta, 0) - budgetTotals.costoDirecto,
    budgetTotals.margenGlobal / 100,
  ]);

  const budgetSheet = [budgetHeader, ...budgetRows];
  const ws2 = XLSX.utils.aoa_to_sheet(budgetSheet);
  autoWidth(ws2, budgetSheet);

  // Format currency columns
  const currencyFmt = '#,##0';
  const pctFmt = '0.0%';
  for (let r = 1; r <= budgetRows.length; r++) {
    for (let c = 1; c <= 3; c++) {
      const cell = ws2[XLSX.utils.encode_cell({ r, c })];
      if (cell) cell.z = currencyFmt;
    }
    const pctCell = ws2[XLSX.utils.encode_cell({ r, c: 4 })];
    if (pctCell) pctCell.z = pctFmt;
  }

  XLSX.utils.book_append_sheet(wb, ws2, 'Presupuesto');

  XLSX.writeFile(wb, 'Estado_General_Proyecto.xlsx');
}

// ==================== REPORT 2: Flujo de Caja ====================
export function generateCashFlowExcel(projectId: string = '') {
  const wb = createWorkbook();

  const header = ['Periodo', 'Ingreso Proy.', 'Ingreso Real', 'Egreso Proy.', 'Egreso Real', 'Neto Proy.', 'Neto Real'];
  const rows = cashFlowData.map((r) => [
    r.periodo, r.ingresoProyectado, r.ingresoReal, r.egresoProyectado, r.egresoReal, r.netoProyectado, r.netoReal,
  ]);

  // Accumulated
  rows.push([
    'ACUMULADO',
    cashFlowData.reduce((s, r) => s + r.ingresoProyectado, 0),
    cashFlowData.reduce((s, r) => s + r.ingresoReal, 0),
    cashFlowData.reduce((s, r) => s + r.egresoProyectado, 0),
    cashFlowData.reduce((s, r) => s + r.egresoReal, 0),
    cashFlowData.reduce((s, r) => s + r.netoProyectado, 0),
    cashFlowData.reduce((s, r) => s + r.netoReal, 0),
  ]);

  const sheetData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  autoWidth(ws, sheetData);

  const currencyFmt = '#,##0';
  for (let r = 1; r <= rows.length; r++) {
    for (let c = 1; c <= 6; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell) cell.z = currencyFmt;
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Flujo de Caja');

  // Variance sheet
  const varHeader = ['Periodo', 'Var. Ingreso', 'Var. Ingreso %', 'Var. Egreso', 'Var. Egreso %', 'Var. Neto'];
  const varRows = cashFlowData.filter(r => r.ingresoReal > 0).map((r) => [
    r.periodo,
    r.ingresoReal - r.ingresoProyectado,
    (r.ingresoReal - r.ingresoProyectado) / r.ingresoProyectado,
    r.egresoReal - r.egresoProyectado,
    (r.egresoReal - r.egresoProyectado) / r.egresoProyectado,
    r.netoReal - r.netoProyectado,
  ]);

  const varSheet = [varHeader, ...varRows];
  const ws2 = XLSX.utils.aoa_to_sheet(varSheet);
  autoWidth(ws2, varSheet);
  XLSX.utils.book_append_sheet(wb, ws2, 'Variaciones');

  XLSX.writeFile(wb, 'Flujo_Caja_Mensual.xlsx');
}

// ==================== REPORT 3: Variacion Presupuestaria ====================
export function generateBudgetVarianceExcel(projectId: string = '') {
  const wb = createWorkbook();

  const header = ['Capitulo', 'Ppto Venta', 'Ppto Costo', 'Comprometido', 'Ejecutado Real', 'Disponible', '% Consumo'];
  const rows = budgetData.map((r) => {
    const comprometido = Math.round(r.costo * (0.4 + Math.random() * 0.35));
    const real = Math.round(comprometido * (0.5 + Math.random() * 0.4));
    const disponible = r.costo - comprometido;
    const pctConsumo = comprometido / r.costo;
    return [r.capitulo, r.venta, r.costo, comprometido, real, disponible, pctConsumo];
  });

  const sheetData = [header, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  autoWidth(ws, sheetData);

  XLSX.utils.book_append_sheet(wb, ws, 'Variacion Presupuestal');

  // AIU sheet
  const aiuHeader = ['Concepto', 'Valor', '% sobre CD'];
  const aiuRows = [
    ['Costo Directo', budgetTotals.costoDirecto, 1],
    ['Administracion (11%)', budgetTotals.administracion, 0.11],
    ['Imprevistos (2%)', budgetTotals.imprevistos, 0.02],
    ['Utilidad (4%)', budgetTotals.utilidad, 0.04],
    ['IVA sobre Utilidad', budgetTotals.ivaUtilidad, ''],
    ['Financiacion', budgetTotals.financiacion, ''],
    ['TOTAL OFERTA', budgetTotals.totalOferta, ''],
  ];

  const aiuSheet = [aiuHeader, ...aiuRows];
  const ws2 = XLSX.utils.aoa_to_sheet(aiuSheet);
  autoWidth(ws2, aiuSheet);
  XLSX.utils.book_append_sheet(wb, ws2, 'AIU');

  XLSX.writeFile(wb, 'Variacion_Presupuestaria.xlsx');
}

// ==================== REPORT 4: EAC Report ====================
export function generateEACReportExcel(projectId: string = '') {
  const wb = createWorkbook();

  // EVM Sheet
  const ev4 = getLiveEarnedValueData(projectId);
  const evmHeader = ['Metrica', 'Valor', 'Interpretacion'];
  const evmRows = [
    ['BAC', ev4.BAC, 'Presupuesto total del proyecto'],
    [`PV (${ev4.weekLabel})`, ev4.PV, 'Valor planificado a la fecha'],
    [`EV (${ev4.weekLabel})`, ev4.EV, 'Valor ganado por trabajo completado'],
    ['AC', ev4.AC, 'Costo real incurrido a la fecha'],
    ['CV (Cost Variance)', ev4.EV - ev4.AC, ev4.EV - ev4.AC < 0 ? 'Sobrecosto' : 'Bajo presupuesto'],
    ['SV (Schedule Variance)', ev4.EV - ev4.PV, ev4.EV - ev4.PV < 0 ? 'Atraso' : 'Adelanto'],
    ['CPI', ev4.CPI, ev4.CPI < 1 ? 'Gastando mas de lo planeado' : 'Eficiente'],
    ['SPI', ev4.SPI, ev4.SPI < 1 ? 'Atrasado' : 'Adelantado'],
    ['EAC', ev4.EAC, 'Costo estimado total al finalizar'],
    ['ETC', ev4.ETC, 'Costo estimado para completar'],
    ['VAC', ev4.VAC, ev4.VAC < 0 ? 'Sobrecosto proyectado' : 'Ahorro proyectado'],
    ['TCPI', ev4.TCPI, ev4.TCPI > 1 ? 'Requiere mejorar eficiencia' : 'Alcanzable'],
  ];

  const evmSheet = [evmHeader, ...evmRows];
  const ws1 = XLSX.utils.aoa_to_sheet(evmSheet);
  autoWidth(ws1, evmSheet);
  XLSX.utils.book_append_sheet(wb, ws1, 'Valor Ganado');

  // Procurement sheet
  const procHeader = ['Capitulo', 'Caso Negocio', 'Negociado', 'Pendiente', 'Ahorro', '% Avance'];
  const procRows = procurementData.map((r) => [
    r.capitulo, r.casoNegocio, r.negociado, r.pendiente, r.ahorro,
    r.casoNegocio > 0 ? r.negociado / r.casoNegocio : 0,
  ]);
  procRows.push([
    'TOTAL',
    procurementTotals.totalCasoNegocio,
    procurementTotals.totalNegociado,
    procurementTotals.totalPendiente,
    procurementTotals.ahorroCompra,
    procurementTotals.pctNegociado / 100,
  ]);

  const procSheet = [procHeader, ...procRows];
  const ws2 = XLSX.utils.aoa_to_sheet(procSheet);
  autoWidth(ws2, procSheet);
  XLSX.utils.book_append_sheet(wb, ws2, 'Gestion Compra');

  XLSX.writeFile(wb, 'Reporte_EAC_Valor_Ganado.xlsx');
}
