import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ProjectTracking, projectStatus } from '@/data/projectsTracking';
import { formatCOP } from './formatNumbers';

interface ExportOptions {
  projects: ProjectTracking[];
  userName: string;
  filtersUsed: string;
  suggestedFilename?: string;
}

export async function exportProjectsToExcel({ projects, userName, filtersUsed, suggestedFilename }: ExportOptions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumen de Proyectos');

  // 1. Configuración de Columnas
  worksheet.columns = [
    { header: '#', key: 'idx', width: 6 },
    { header: 'Proyecto', key: 'nombre', width: 35 },
    { header: 'Código', key: 'codigo', width: 15 },
    { header: 'Cliente', key: 'cliente', width: 25 },
    { header: 'Director', key: 'director', width: 25 },
    { header: 'Residente', key: 'residente', width: 25 },
    { header: 'Supervisor', key: 'supervisor_col', width: 25 },
    
    { header: 'Fecha Terminación Estimada', key: 'fecha_terminacion_estimada', width: 25 },
    { header: 'Avance Programado', key: 'avance_prog', width: 20 },
    { header: 'Avance Real', key: 'avance_real', width: 20 },
    { header: 'Modificación del Alcance', key: 'modificacion_alcance', width: 30 },
    { header: 'Órdenes de Compra (SI/NO)', key: 'ordenes_compra', width: 25 },
    { header: 'Alcance Órdenes', key: 'alcance_ordenes', width: 30 },
    { header: 'Tiempo Órdenes', key: 'tiempo_ordenes', width: 20 },
    { header: 'Valor Órdenes', key: 'valor_ordenes', width: 20 },
    { header: 'Estado Facturación Órdenes', key: 'estado_facturacion_ordenes', width: 25 },
    
    { header: 'Desviaciones Detectadas', key: 'desviaciones_detectadas', width: 40 },
    { header: 'Justificación Desviaciones', key: 'justificacion_desviaciones', width: 40 },
    { header: 'Adiciones y Reducciones', key: 'adiciones_reducciones', width: 25 },
    { header: 'Valor Actual del Contrato', key: 'valor_actual_contrato', width: 25 },
    { header: 'Anticipo Recibido', key: 'anticipo_recibido', width: 20 },
    { header: 'Valor Facturado', key: 'valor_facturado', width: 20 },
    { header: 'Retenido', key: 'retenido', width: 20 },
    { header: 'Amortización del Anticipo', key: 'amortizacion_anticipo', width: 25 },
    { header: 'Total Ingreso (Liquidez)', key: 'total_ingreso_liquidez', width: 25 },
    { header: 'Valor Descuentos', key: 'valor_descuentos', width: 20 },
    { header: 'Valor Pagado', key: 'valor_pagado', width: 20 },
    { header: 'Valor Por Amortizar', key: 'valor_por_amortizar', width: 25 },
    
    { header: 'Costos: Materiales', key: 'costos_materiales', width: 20 },
    { header: 'Costos: Mano de Obra', key: 'costos_mano_obra', width: 20 },
    { header: 'Costos: Administrativos', key: 'costos_administrativos', width: 25 },
    { header: 'Costos Ejecutados Total', key: 'costos_ejecutados_total', width: 25 },
    { header: 'Utilidad', key: 'utilidad', width: 20 },
    { header: 'Utilidad Proyectada FC', key: 'utilidad_proyectada_fc', width: 25 },
    
    { header: 'Necesidades de Apoyo', key: 'necesidades_apoyo', width: 40 },
    { header: 'Decisiones de Gerencia', key: 'decisiones_gerencia', width: 40 },
    { header: 'Observaciones del Cliente', key: 'observaciones_cliente', width: 40 },
    { header: 'Identificación de Riesgos', key: 'identificacion_riesgos', width: 40 },
    { header: 'Lecciones Aprendidas', key: 'lecciones_aprendidas', width: 40 },
    { header: 'Recomendaciones', key: 'recomendaciones', width: 40 },
    { header: 'Estado Global', key: 'estado', width: 15 },
  ];

  // 2. Cabecera Personalizada (Logo y Título)
  worksheet.spliceRows(1, 0, []);
  worksheet.spliceRows(2, 0, []);
  worksheet.spliceRows(3, 0, []);
  worksheet.spliceRows(4, 0, []);
  worksheet.spliceRows(5, 0, []);

  try {
    const response = await fetch('/images/pcmejia-logo.png');
    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const imageId = workbook.addImage({
      buffer: arrayBuffer,
      extension: 'png',
    });
    worksheet.addImage(imageId, {
      tl: { col: 0, row: 0 },
      ext: { width: 120, height: 50 }
    });
  } catch (e) {
    console.warn('No se pudo cargar el logo para el Excel', e);
  }

  const titleCell = worksheet.getCell('B2');
  titleCell.value = 'REPORTE DETALLADO DE SEGUIMIENTO DE PROYECTOS';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } };

  worksheet.getCell('B3').value = `Fecha de exportación: ${new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })} ${new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' })}`;
  worksheet.getCell('B4').value = `Exportado por: ${userName}`;
  worksheet.getCell('B5').value = `Filtros aplicados: ${filtersUsed}`;

  // 3. Estilo de Encabezados de Tabla (Fila 6)
  const headerRow = worksheet.getRow(6);
  headerRow.values = worksheet.columns.map(c => c.header) as any[];
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E40AF' },
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin' }, left: { style: 'thin' },
      bottom: { style: 'thin' }, right: { style: 'thin' },
    };
  });
  headerRow.height = 30;

  // 4. Datos
  projects.forEach((p, index) => {
    const status = projectStatus(p);
    
    // Función auxiliar para "Fecha de corte no disponible"
    
    const getVal = (val: any) => p.fecha_terminacion_estimada === "Fecha de corte no disponible" ? null : val;
    const getNumVal = (val: any) => {
        if (p.fecha_terminacion_estimada === "Fecha de corte no disponible") return null;
        if (val === null || val === undefined || val === '') return null;
        const num = Number(val);
        return isNaN(num) ? val : num;
    };

    const row = worksheet.addRow({
      idx: index + 1,
      nombre: p.nombre_proyecto || p.sheet_name,
      codigo: p.codigo_proyecto,
      cliente: p.cliente,
      director: p.director_proyectos || '—',
      residente: p.ingeniero_residente || '—',
      supervisor_col: p.supervisor || '—',
      
      fecha_terminacion_estimada: p.fecha_terminacion_estimada || '—',
      avance_prog: getNumVal(p.avance_programado),
      avance_real: getNumVal(p.avance_real),
      modificacion_alcance: getVal(p.modificacion_alcance) || '—',
      ordenes_compra: getVal(p.ordenes_compra) || '—',
      alcance_ordenes: getVal(p.alcance_ordenes) || '—',
      tiempo_ordenes: getVal(p.tiempo_ordenes) || '—',
      valor_ordenes: getNumVal(p.valor_ordenes),
      estado_facturacion_ordenes: getVal(p.estado_facturacion_ordenes) || '—',
      
      desviaciones_detectadas: getVal(p.desviaciones_detectadas) || '—',
      justificacion_desviaciones: getVal(p.justificacion_desviaciones) || '—',
      adiciones_reducciones: getNumVal(p.valor_otros_adiciones),
      valor_actual_contrato: getNumVal(p.valor_actual_contrato),
      anticipo_recibido: getNumVal(p.valor_anticipo_recibido),
      valor_facturado: getNumVal(p.valor_facturado),
      retenido: getNumVal(p.retenido),
      amortizacion_anticipo: getNumVal(p.amortizacion_anticipo),
      total_ingreso_liquidez: getNumVal(p.valor_total_ingreso),
      valor_descuentos: getNumVal(p.valor_descuentos),
      valor_pagado: getNumVal(p.valor_pagado),
      valor_por_amortizar: getNumVal(p.valor_por_amortizar),
      
      costos_materiales: getNumVal(p.costos_materiales),
      costos_mano_obra: getNumVal(p.costos_mano_obra),
      costos_administrativos: getNumVal(p.costos_administrativos),
      costos_ejecutados_total: getNumVal(p.costos_ejecutados_total),
      utilidad: getNumVal(p.utilidad_actual),
      utilidad_proyectada_fc: getNumVal(p.utilidad_proyectada_fc),
      
      necesidades_apoyo: getVal(p.necesidades_apoyo) || '—',
      decisiones_gerencia: getVal(p.decisiones_gerencia) || '—',
      observaciones_cliente: getVal(p.observaciones_cliente) || '—',
      identificacion_riesgos: getVal(p.identificacion_riesgos) || '—',
      lecciones_aprendidas: getVal(p.lecciones_aprendidas) || '—',
      recomendaciones: getVal(p.recomendaciones) || '—',
      estado: status.replace('_', ' ').toUpperCase(),
    });

    // Formateo de celdas
    const moneyCols = [
      'valor_ordenes', 'adiciones_reducciones', 'valor_actual_contrato', 
      'anticipo_recibido', 'valor_facturado', 'retenido', 'amortizacion_anticipo', 
      'total_ingreso_liquidez', 'valor_descuentos', 'valor_pagado', 'valor_por_amortizar', 
      'costos_materiales', 'costos_mano_obra', 'costos_administrativos', 
      'costos_ejecutados_total', 'utilidad', 'utilidad_proyectada_fc'
    ];
    moneyCols.forEach(col => {
      if (row.getCell(col).value !== null) {
        row.getCell(col).numFmt = '"$"#,##0';
      }
    });

    if (row.getCell('avance_prog').value !== null) row.getCell('avance_prog').numFmt = '0.0%';
    if (row.getCell('avance_real').value !== null) row.getCell('avance_real').numFmt = '0.0%';

    // Estilo de bordes y alineacion de textos largos
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
      if (typeof cell.value === 'string' && cell.value.length > 50) {
        cell.alignment = { wrapText: true, vertical: 'top' };
      }
    });

    // Colores por estado
    const statusCell = row.getCell('estado');
    if (status === 'completado') statusCell.font = { color: { argb: 'FF059669' }, bold: true };
    if (status === 'en_progreso') statusCell.font = { color: { argb: 'FF2563EB' }, bold: true };
    if (status === 'atrasado') statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
  });

  // 6. Autofilter
  worksheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: worksheet.columns.length },
  };

  // 7. Descarga
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = suggestedFilename || `Reporte_Detallado_Proyectos_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(new Blob([buffer]), filename);
}
