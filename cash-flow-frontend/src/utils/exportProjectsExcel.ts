import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { ProjectTracking, projectStatus } from '@/data/projectsTracking';
import { formatCOP } from './formatNumbers';

interface ExportOptions {
  projects: ProjectTracking[];
  userName: string;
  filtersUsed: string;
}

export async function exportProjectsToExcel({ projects, userName, filtersUsed }: ExportOptions) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Resumen de Proyectos');

  // 1. Configuración de Columnas
  worksheet.columns = [
    { header: '#',                    key: 'idx',            width: 6  },
    { header: 'Proyecto',             key: 'nombre',         width: 35 },
    { header: 'Código',               key: 'codigo',         width: 12 },
    { header: 'Cliente',              key: 'cliente',        width: 25 },
    { header: 'Director de Proyectos',key: 'director',       width: 25 },
    { header: 'Ingeniero Residente',  key: 'residente',      width: 25 }, // NUEVA
    { header: 'Supervisor',           key: 'supervisor_col', width: 25 }, // NUEVA
    { header: 'Valor Contrato',       key: 'valor',          width: 20 },
    { header: 'Avance Prog.',         key: 'avance_prog',    width: 15 },
    { header: 'Avance Real',          key: 'avance_real',    width: 15 },
    { header: 'Facturado',            key: 'facturado',      width: 20 },
    { header: 'Utilidad',             key: 'utilidad',       width: 20 },
    { header: 'Estado',               key: 'estado',         width: 15 },
    { header: 'Empresa',              key: 'empresa',        width: 15 },
  ];

  // 2. Cabecera Personalizada (Logo y Título)
  // Dejamos las primeras 5 filas para el encabezado decorativo
  worksheet.spliceRows(1, 0, []);
  worksheet.spliceRows(2, 0, []);
  worksheet.spliceRows(3, 0, []);
  worksheet.spliceRows(4, 0, []);
  worksheet.spliceRows(5, 0, []);

  // Intentar agregar el logo
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

  // Título y Metadatos
  const titleCell = worksheet.getCell('B2');
  titleCell.value = 'RESUMEN DE PROYECTOS';
  titleCell.font = { size: 16, bold: true, color: { argb: 'FF1E40AF' } }; // Azul primario

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
      fgColor: { argb: 'FF1E40AF' }, // Azul corporativo
    };
    cell.font = {
      color: { argb: 'FFFFFFFF' },
      bold: true,
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });

  // 4. Datos
  projects.forEach((p, index) => {
    const status = projectStatus(p);
    const row = worksheet.addRow({
      idx: index + 1,
      nombre: p.nombre_proyecto || p.sheet_name,
      codigo: p.codigo_proyecto,
      cliente: p.cliente,
      director: p.director_proyectos || '—',
      residente: p.ingeniero_residente || '—',
      supervisor_col: p.supervisor || '—',
      valor: p.valor_original_contrato || 0,
      avance_prog: p.avance_programado || 0,
      avance_real: p.avance_real || 0,
      facturado: p.valor_facturado || 0,
      utilidad: p.utilidad_actual || 0,
      estado: status.replace('_', ' ').toUpperCase(),
      empresa: p.group || 'PCM',
    });

    // Formateo de celdas
    row.getCell('valor').numFmt = '"$"#,##0';
    row.getCell('facturado').numFmt = '"$"#,##0';
    row.getCell('utilidad').numFmt = '"$"#,##0';
    row.getCell('avance_prog').numFmt = '0.0%';
    row.getCell('avance_real').numFmt = '0.0%';

    // Estilo de bordes
    row.eachCell(cell => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });

    // Colores por estado
    const statusCell = row.getCell('estado');
    if (status === 'completado') statusCell.font = { color: { argb: 'FF059669' }, bold: true };
    if (status === 'en_progreso') statusCell.font = { color: { argb: 'FF2563EB' }, bold: true };
    if (status === 'atrasado') statusCell.font = { color: { argb: 'FFD97706' }, bold: true };
  });

  // 5. Fila de Totales
  const totalRow = worksheet.addRow({
    nombre: 'TOTALES',
    valor: projects.reduce((s, p) => s + (p.valor_original_contrato || 0), 0),
    facturado: projects.reduce((s, p) => s + (p.valor_facturado || 0), 0),
    utilidad: projects.reduce((s, p) => s + (p.utilidad_actual || 0), 0),
  });
  
  totalRow.font = { bold: true };
  totalRow.getCell('nombre').alignment = { horizontal: 'right' };
  totalRow.getCell('valor').numFmt = '"$"#,##0';
  totalRow.getCell('facturado').numFmt = '"$"#,##0';
  totalRow.getCell('utilidad').numFmt = '"$"#,##0';
  
  // Colorear fila de totales
  totalRow.eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF1F5F9' },
    };
  });

  // Resumen final debajo de la tabla
  const statsStartRow = worksheet.rowCount + 2;
  worksheet.getCell(`A${statsStartRow}`).value = 'RESUMEN DE ESTADOS';
  worksheet.getCell(`A${statsStartRow}`).font = { bold: true };
  
  const stats = {
    progreso: projects.filter(p => projectStatus(p) === 'en_progreso').length,
    atrasados: projects.filter(p => projectStatus(p) === 'atrasado').length,
    completados: projects.filter(p => projectStatus(p) === 'completado').length,
  };

  worksheet.getCell(`A${statsStartRow + 1}`).value = `EN PROGRESO: ${stats.progreso}`;
  worksheet.getCell(`A${statsStartRow + 2}`).value = `ATRASADOS: ${stats.atrasados}`;
  worksheet.getCell(`A${statsStartRow + 3}`).value = `COMPLETADOS: ${stats.completados}`;

  // 6. Autofilter y Ajustes
  worksheet.autoFilter = {
    from: { row: 6, column: 1 },
    to: { row: 6, column: 14 },
  };

  // 7. Descarga
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = `Resumen_Proyectos_${new Date().toISOString().split('T')[0]}.xlsx`;
  saveAs(new Blob([buffer]), filename);
}
