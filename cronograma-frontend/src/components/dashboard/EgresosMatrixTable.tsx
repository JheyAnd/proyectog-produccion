// ============================================================
// EgresosMatrixTable
// Tabla editable de egresos proyectados por categoría × mes
// Reemplaza "Proyeccion de Pagos por Grupo" en CashFlowPage
// Replica la estructura del template Excel "FC X Obras"
// ============================================================
import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import {
  ChevronDown, ChevronRight, Plus, X, Download, Edit3, Check,
  Package, Users, Briefcase, AlertTriangle, Calendar, Tag, Trash2, RefreshCw, Cloud, FileText, Landmark, BarChart3
} from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import clsx from 'clsx';
import { formatCOP } from '@/utils/formatNumbers';
import CellDetailModal from './CellDetailModal';
import CategoriaDetailModal from './CategoriaDetailModal';
import VistaFinanzas from '../cashflow/VistaFinanzas';
import {
  EXCEL_MONTHS,
  GRUPO_LABELS,
  formatMonthKey,
  totalCategoria,
  totalGrupo,
  totalMesGrupo,
  useEgresosCategorias,
  SAVE_STATUS_EVENT,
  type SaveStatus,
  type EgresoCategoria,
  type CategoriaGrupo as EgresoGrupo,
} from '@/data/excelCategoriasEgresos';

const GROUP_CONFIG: Record<EgresoGrupo, { label: string; icon: typeof Package; color: string; darkColor: string; bg: string; darkBg: string; border: string; darkBorder: string; headerBg: string; darkHeaderBg: string }> = {
  materiales: {
    label: 'MATERIALES',
    icon: Package,
    color: 'text-blue-700',
    darkColor: 'dark:text-blue-300',
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900/20',
    border: 'border-blue-200',
    darkBorder: 'dark:border-blue-700/50',
    headerBg: 'bg-blue-100/60',
    darkHeaderBg: 'dark:bg-blue-900/30',
  },
  mano_obra: {
    label: 'MANO DE OBRA',
    icon: Users,
    color: 'text-emerald-700',
    darkColor: 'dark:text-emerald-300',
    bg: 'bg-emerald-50',
    darkBg: 'dark:bg-emerald-900/20',
    border: 'border-emerald-200',
    darkBorder: 'dark:border-emerald-700/50',
    headerBg: 'bg-emerald-100/60',
    darkHeaderBg: 'dark:bg-emerald-900/30',
  },
  servicios: {
    label: 'SERVICIOS',
    icon: Package,
    color: 'text-cyan-700',
    darkColor: 'dark:text-cyan-300',
    bg: 'bg-cyan-50',
    darkBg: 'dark:bg-cyan-900/20',
    border: 'border-cyan-200',
    darkBorder: 'dark:border-cyan-700/50',
    headerBg: 'bg-cyan-100/60',
    darkHeaderBg: 'dark:bg-cyan-900/30',
  },
  administracion: {
    label: 'ADMINISTRATIVOS DIRECTIVOS',
    icon: Briefcase,
    color: 'text-violet-700',
    darkColor: 'dark:text-violet-300',
    bg: 'bg-violet-50',
    darkBg: 'dark:bg-violet-900/20',
    border: 'border-violet-200',
    darkBorder: 'dark:border-violet-700/50',
    headerBg: 'bg-violet-100/60',
    darkHeaderBg: 'dark:bg-violet-900/30',
  },
  intereses: {
    label: 'INTERESES',
    icon: Landmark,
    color: 'text-amber-700',
    darkColor: 'dark:text-amber-300',
    bg: 'bg-amber-50',
    darkBg: 'dark:bg-amber-950/20',
    border: 'border-amber-200',
    darkBorder: 'dark:border-amber-800/50',
    headerBg: 'bg-amber-100/60',
    darkHeaderBg: 'dark:bg-amber-900/30',
  },
  ingreso: {
    label: 'INGRESO',
    icon: Tag,
    color: 'text-blue-600',
    darkColor: 'dark:text-blue-300',
    bg: 'bg-blue-50',
    darkBg: 'dark:bg-blue-900/20',
    border: 'border-blue-200',
    darkBorder: 'dark:border-blue-700/50',
    headerBg: 'bg-blue-100/60',
    darkHeaderBg: 'dark:bg-blue-900/30',
  },
};

function monthKeyToDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0); // último día del mes (como el template)
}

interface Props {
  currentMonth?: string; // "YYYY-MM" para mostrar "pagado" vs "por pagar"
  projectId?: string;
}

export default function EgresosMatrixTable({ currentMonth = '2026-04', projectId = 'patio-sur-oe1035' }: Props) {
  const user = useAuthStore((s) => s.user);
  // ── Estado compartido entre componentes vía hook ──
  const [categorias, setCategorias, isLoaded, toggleCategoriaInclusion, toggleDetailInclusion] = useEgresosCategorias(projectId);

  const [showVistaFinanzas, setShowVistaFinanzas] = useState(false);

  const [expanded, setExpanded] = useState<Record<EgresoGrupo | 'ingreso', boolean>>({
    ingreso: true,
    materiales: true,
    servicios: true,
    mano_obra: true,
    administracion: true,
    intereses: true,
  });
  const toggleExpand = (g: EgresoGrupo) => setExpanded(prev => ({ ...prev, [g]: !prev[g] }));
  

  // ── Edición inline ──
  const [editingCell, setEditingCell] = useState<{ id: string; mes: string } | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);

  // Modal de detalle por celda (doble clic) — N° Factura, Proveedor, Valor, Nota
  const [detailModalCell, setDetailModalCell] = useState<{ catId: string; catNombre: string; mes: string } | null>(null);

  // Modal de detalle de categoría completa (clic en nombre)
  const [categoriaDetailModal, setCategoriaDetailModal] = useState<{ id: string; nombre: string; mesesConDetalle: string[] } | null>(null);

  const openCellDetailModal = useCallback((catId: string, catNombre: string, mes: string) => {
    setEditingCell(null); // cerrar inline edit si está abierto
    setDetailModalCell({ catId, catNombre, mes });
  }, []);

  // ── Indicador de estado de guardado (para feedback visual al usuario) ──
  const [saveStatus, setSaveStatus] = useState<{ status: SaveStatus; detail?: string }>({ status: 'idle' });
  useEffect(() => {
    const handler = (e: any) => {
      const { status, detail } = e.detail || {};
      setSaveStatus({ status, detail });
    };
    window.addEventListener(SAVE_STATUS_EVENT, handler as any);
    return () => window.removeEventListener(SAVE_STATUS_EVENT, handler as any);
  }, []);
  const [tempValue, setTempValue] = useState<string>('');

  const startEditCell = (id: string, mes: string, current: number) => {
    setEditingCell({ id, mes });
    setTempValue(current ? current.toString() : '');
  };

  const commitEditCell = () => {
    if (!editingCell) return;
    const n = Number(tempValue.replace(/[^\d.-]/g, '')) || 0;
    const cat = categorias.find(c => c.id === editingCell.id);
    setCategorias(prev => prev.map(c => {
      if (c.id !== editingCell.id) return c;
      const newVals = { ...c.valores };
      if (n === 0) delete newVals[editingCell.mes];
      else newVals[editingCell.mes] = n;
      return { ...c, valores: newVals };
    }));
    if (user && cat) {
      logEdit(user, 'Flujo de Caja › Tabla Egresos', `Editó "${cat.nombre}" en ${formatMonthKey(editingCell.mes)} → ${formatCOP(n)}`);
    }
    setEditingCell(null);
    setTempValue('');
  };

  const startEditName = (id: string, current: string) => {
    setEditingName(id);
    setTempValue(current);
  };

  const commitEditName = () => {
    if (!editingName) return;
    const cat = categorias.find(c => c.id === editingName);
    setCategorias(prev => prev.map(c => c.id === editingName ? { ...c, nombre: tempValue } : c));
    if (user && cat) {
      logEdit(user, 'Flujo de Caja › Tabla Egresos', `Renombró categoría "${cat.nombre}" → "${tempValue}"`);
    }
    setEditingName(null);
    setTempValue('');
  };

  const toggleInclusion = (id: string) => {
    toggleCategoriaInclusion(id);
  };


  // ── Dropdown "Agregar" por grupo ──
  const [openDropdown, setOpenDropdown] = useState<EgresoGrupo | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cierra el dropdown al hacer clic fuera
  useEffect(() => {
    if (!openDropdown) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node))
        setOpenDropdown(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openDropdown]);

  // ── Modal: Agregar Categoría (solo nombre) ──
  const [addCatModal, setAddCatModal] = useState<{ grupo: EgresoGrupo } | null>(null);
  const [addNombre, setAddNombre] = useState('');
  const addNombreRef = useRef<HTMLInputElement>(null);

  const openAddCatModal = (grupo: EgresoGrupo) => {
    setOpenDropdown(null);
    setAddCatModal({ grupo });
    setAddNombre('');
    setTimeout(() => addNombreRef.current?.focus(), 50);
  };

  const confirmAddCategoria = () => {
    if (!addCatModal) return;
    const nombre = addNombre.trim();
    if (!nombre) return;
    const id = `${addCatModal.grupo}-${Date.now()}`;
    const nueva: EgresoCategoria = { id, grupo: addCatModal.grupo, nombre, valores: {} };
    setCategorias(prev => [...prev, nueva]);
    if (user) logEdit(user, 'Flujo de Caja › Tabla Egresos', `Agregó categoría "${nombre}" en "${GRUPO_LABELS[addCatModal.grupo]}"`);
    setAddCatModal(null);
  };

  // ── Modal: Agregar Mes (seleccionar mes a mostrar) ──
  const [addMesModal, setAddMesModal] = useState<{ grupo: EgresoGrupo } | null>(null);
  const [selectedMes, setSelectedMes] = useState('');
  // Meses que aún no tienen valores en este grupo (candidatos a agregar)
  const mesesDisponibles = useMemo(() => {
    if (!addMesModal) return EXCEL_MONTHS;
    const conValor = new Set<string>();
    categorias.filter(c => c.grupo === addMesModal.grupo)
      .forEach(c => Object.keys(c.valores).forEach(m => { if ((c.valores[m] || 0) > 0) conValor.add(m); }));
    return EXCEL_MONTHS.filter(m => !conValor.has(m));
  }, [addMesModal, categorias]);

  const openAddMesModal = (grupo: EgresoGrupo) => {
    setOpenDropdown(null);
    setAddMesModal({ grupo });
    setSelectedMes('');
  };

  const confirmAddMes = () => {
    if (!addMesModal || !selectedMes) return;
    
    // Para que el mes persista en la BD, debemos forzar un valor (aunque sea 0)
    // en al menos una categoría de ese grupo.
    const firstCat = categorias.find(c => c.grupo === addMesModal.grupo);
    if (firstCat) {
      setCategorias(prev => prev.map(c => {
        if (c.id !== firstCat.id) return c;
        const newVals = { ...c.valores };
        newVals[selectedMes] = 0;
        return { ...c, valores: newVals };
      }));
    }

    setMostrarTodosMeses(true);
    if (user) logEdit(user, 'Flujo de Caja › Tabla Egresos', `Agregó mes "${formatMonthKey(selectedMes)}" en grupo "${GRUPO_LABELS[addMesModal.grupo]}"`);
    setAddMesModal(null);
  };

  // ── Modal: Eliminar Mes ──
  const [deleteMesModal, setDeleteMesModal] = useState<{ grupo: EgresoGrupo } | null>(null);
  const [selectedDeleteMes, setSelectedDeleteMes] = useState('');

  const mesesConValorEnGrupo = useMemo(() => {
    if (!deleteMesModal) return [];
    const conValor = new Set<string>();
    categorias.filter(c => c.grupo === deleteMesModal.grupo)
      .forEach(c => Object.keys(c.valores).forEach(m => { if ((c.valores[m] || 0) > 0) conValor.add(m); }));
    return EXCEL_MONTHS.filter(m => conValor.has(m));
  }, [deleteMesModal, categorias]);

  const openDeleteMesModal = (grupo: EgresoGrupo) => {
    setOpenDropdown(null);
    setDeleteMesModal({ grupo });
    setSelectedDeleteMes('');
  };

  const confirmDeleteMes = () => {
    if (!deleteMesModal || !selectedDeleteMes) return;
    const grupo = deleteMesModal.grupo;
    setCategorias(prev => prev.map(c => {
      if (c.grupo !== grupo) return c;
      const newVals = { ...c.valores };
      delete newVals[selectedDeleteMes];
      return { ...c, valores: newVals };
    }));
    if (user) logEdit(user, 'Flujo de Caja › Tabla Egresos', `Eliminó mes "${formatMonthKey(selectedDeleteMes)}" del grupo "${GRUPO_LABELS[grupo]}"`);
    setDeleteMesModal(null);
    setSelectedDeleteMes('');
  };

  // ── Modal: Eliminar categoría ──
  const [deleteModal, setDeleteModal] = useState<{ id: string } | null>(null);

  const openDeleteModal = (id: string) => setDeleteModal({ id });

  const confirmDeleteCategoria = () => {
    if (!deleteModal) return;
    const cat = categorias.find(c => c.id === deleteModal.id);
    setCategorias(prev => prev.filter(c => c.id !== deleteModal.id));
    if (user && cat) logEdit(user, 'Flujo de Caja › Tabla Egresos', `Eliminó categoría "${cat.nombre}"`);
    setDeleteModal(null);
  };

  // ── Totales ──
  const grupoData = useMemo(() => {
    const grupos: (EgresoGrupo | 'ingreso')[] = ['ingreso', 'materiales', 'servicios', 'mano_obra', 'administracion', 'intereses'];
    const filtered = categorias.filter(c => c.incluirEnGrafico !== false);
    return grupos.map(g => ({
      grupo: g,
      items: categorias.filter(c => c.grupo === g),
      total: totalGrupo(filtered, g as any),
    }));
  }, [categorias]);

  const totalIngresos = useMemo(() => totalGrupo(categorias, 'ingreso'), [categorias]);
  const totalEgresos = useMemo(() => 
    totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'materiales') + 
    totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'servicios') + 
    totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'mano_obra') + 
    totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'administracion') +
    totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'intereses'), 
  [categorias]);

  const saldoOperativo = useMemo(() => totalIngresos - totalEgresos, [totalIngresos, totalEgresos]);

  // ── Totales Contrato / Pagado / Por Pagar ──

  // Meses con al menos un valor (para mostrar solo los relevantes por default)
  const [mostrarTodosMeses, setMostrarTodosMeses] = useState(false);
  const mesesVisibles = useMemo(() => {
    if (mostrarTodosMeses) return EXCEL_MONTHS;
    const mesesConValor = new Set<string>();
    categorias.forEach(c => Object.keys(c.valores).forEach(m => {
      if ((c.valores[m] || 0) > 0) mesesConValor.add(m);
    }));
    return EXCEL_MONTHS.filter(m => mesesConValor.has(m));
  }, [categorias, mostrarTodosMeses]);

  // ── Exportación a Excel con formato del template FC X Obras ──
  const exportarExcel = useCallback(async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('FC X Obras');

    // 1. Configurar vista y congelamiento (congelar A-D y las primeras 5 filas)
    worksheet.views = [
      {
        state: 'frozen',
        xSplit: 4,
        ySplit: 5,
        activeCell: 'E6',
        showGridLines: true
      }
    ];

    // 2. Título corporativo superior
    // Fila 2: Título de la empresa
    const rowTitle = worksheet.getRow(2);
    rowTitle.getCell(2).value = 'PCMejia SA';
    rowTitle.getCell(2).font = {
      name: 'Segoe UI',
      size: 16,
      bold: true,
      color: { argb: 'FF1B3A5C' }
    };
    
    // Fila 3: Subtítulo
    const rowSubtitle = worksheet.getRow(3);
    rowSubtitle.getCell(2).value = 'Flujo de Caja - Proyecto Patio Sur';
    rowSubtitle.getCell(2).font = {
      name: 'Segoe UI',
      size: 11,
      bold: true,
      italic: true,
      color: { argb: 'FF555555' }
    };

    // 3. Encabezados de columnas de la tabla (Fila 5)
    const headerRowNumber = 5;
    const headerRow = worksheet.getRow(headerRowNumber);
    headerRow.height = 26;

    // Valores de header
    headerRow.getCell(2).value = 'Categorías';
    EXCEL_MONTHS.forEach((m, idx) => {
      // Usamos formatMonthKey para tener la fecha formateada en texto y evitar bugs de época Unix
      headerRow.getCell(5 + idx).value = formatMonthKey(m);
    });
    headerRow.getCell(5 + EXCEL_MONTHS.length).value = 'TOTAL PRESUPUESTO';

    // Estilos de los encabezados (Fila 5)
    const headerStyle = {
      font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
      fill: {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1B3A5C' } // Azul oscuro corporativo
      },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: true },
      border: {
        bottom: { style: 'medium', color: { argb: 'FF1B3A5C' } }
      }
    } as const;

    const totalColIdx = 5 + EXCEL_MONTHS.length;
    
    // Aplicar estilos a celda Categorías
    const cellEgresos = headerRow.getCell(2);
    cellEgresos.font = headerStyle.font;
    cellEgresos.fill = headerStyle.fill as any;
    cellEgresos.border = headerStyle.border as any;
    cellEgresos.alignment = { vertical: 'middle', horizontal: 'left' } as any;

    // Estilos de meses
    for (let i = 0; i < EXCEL_MONTHS.length; i++) {
      const cell = headerRow.getCell(5 + i);
      cell.font = headerStyle.font;
      cell.fill = headerStyle.fill as any;
      cell.border = headerStyle.border as any;
      cell.alignment = headerStyle.alignment as any;
    }

    // Columna TOTAL
    const cellTotal = headerRow.getCell(totalColIdx);
    cellTotal.font = headerStyle.font;
    cellTotal.fill = headerStyle.fill as any;
    cellTotal.border = headerStyle.border as any;
    cellTotal.alignment = headerStyle.alignment as any;

    let currentRowIdx = 6;
    const grupos: EgresoGrupo[] = ['ingreso', 'materiales', 'servicios', 'mano_obra', 'administracion', 'intereses'];

    // Estilos comunes para datos
    const doubleBottomBorder = {
      top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
      bottom: { style: 'double', color: { argb: 'FF1B3A5C' } }
    } as const;
    
    const thinBottomBorder = {
      bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } }
    } as const;

    const currencyFormat = '"$"#,##0;("$"#,##0);"-"';

    let dataRowCounter = 0;

    grupos.forEach(g => {
      const items = categorias.filter(c => c.grupo === g);
      if (items.length === 0) return;

      // ── Fila de Título del Grupo ──
      const titleRow = worksheet.getRow(currentRowIdx);
      titleRow.height = 22;
      
      titleRow.getCell(2).value = GRUPO_LABELS[g];
      titleRow.getCell(totalColIdx).value = 'TOTAL PRESUPUESTO';

      const groupHeaderStyle = {
        font: { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FFFFFFFF' } },
        fill: {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF2E5A88' } // Azul medio
        },
        alignment: { vertical: 'middle', horizontal: 'left' }
      } as const;

      const cellGroupB = titleRow.getCell(2);
      cellGroupB.font = groupHeaderStyle.font;
      cellGroupB.fill = groupHeaderStyle.fill as any;
      cellGroupB.alignment = groupHeaderStyle.alignment as any;

      const cellGroupTotal = titleRow.getCell(totalColIdx);
      cellGroupTotal.font = groupHeaderStyle.font;
      cellGroupTotal.fill = groupHeaderStyle.fill as any;
      cellGroupTotal.alignment = { vertical: 'middle', horizontal: 'center' } as any;

      // Rellenar fondo del grupo entre B y TOTAL
      for (let c = 5; c < totalColIdx; c++) {
        const cell = titleRow.getCell(c);
        cell.fill = groupHeaderStyle.fill as any;
      }

      currentRowIdx++;

      // ── Filas de Categorías ──
      items.forEach(cat => {
        const row = worksheet.getRow(currentRowIdx);
        row.height = 19;

        // Alternar fondo para un look súper moderno (zebra striping)
        const bgHex = (dataRowCounter % 2 === 0) ? 'FFFFFFFF' : 'FFF7F9FB';
        dataRowCounter++;

        const dataFill = {
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb: bgHex }
        };

        // Nombre
        const cellName = row.getCell(2);
        cellName.value = cat.nombre;
        cellName.font = { name: 'Segoe UI', size: 10, color: { argb: 'FF333333' } };
        cellName.alignment = { vertical: 'middle', horizontal: 'left' } as any;
        cellName.fill = dataFill as any;
        cellName.border = thinBottomBorder as any;

        // Valores de meses
        EXCEL_MONTHS.forEach((m, idx) => {
          const cell = row.getCell(5 + idx);
          cell.value = cat.valores[m] || 0;
          cell.font = { name: 'Segoe UI', size: 10 };
          cell.alignment = { vertical: 'middle', horizontal: 'right' } as any;
          cell.numFmt = currencyFormat;
          cell.fill = dataFill as any;
          cell.border = thinBottomBorder as any;
        });

        // Total categoría
        const cellCatTotal = row.getCell(totalColIdx);
        cellCatTotal.value = totalCategoria(cat);
        cellCatTotal.font = { name: 'Segoe UI', size: 10, bold: true };
        cellCatTotal.alignment = { vertical: 'middle', horizontal: 'right' } as any;
        cellCatTotal.numFmt = currencyFormat;
        cellCatTotal.fill = dataFill as any;
        cellCatTotal.border = thinBottomBorder as any;

        currentRowIdx++;
      });

      // ── Fila de Total de Grupo ──
      const grpTotalRow = worksheet.getRow(currentRowIdx);
      grpTotalRow.height = 21;

      const totalFill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFF8E1' } // Amarillo suave
      } as const;

      // Nombre total
      const cellGrpTotalName = grpTotalRow.getCell(2);
      cellGrpTotalName.value = `TOTAL ${GRUPO_LABELS[g]}`;
      cellGrpTotalName.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
      cellGrpTotalName.alignment = { vertical: 'middle', horizontal: 'left' } as any;
      cellGrpTotalName.fill = totalFill as any;
      cellGrpTotalName.border = doubleBottomBorder as any;

      // Valores mensuales
      EXCEL_MONTHS.forEach((m, idx) => {
        const cell = grpTotalRow.getCell(5 + idx);
        cell.value = totalMesGrupo(categorias, g, m);
        cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
        cell.alignment = { vertical: 'middle', horizontal: 'right' } as any;
        cell.numFmt = currencyFormat;
        cell.fill = totalFill as any;
        cell.border = doubleBottomBorder as any;
      });

      // Total de grupo
      const cellGrpTotalVal = grpTotalRow.getCell(totalColIdx);
      cellGrpTotalVal.value = totalGrupo(categorias, g);
      cellGrpTotalVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
      cellGrpTotalVal.alignment = { vertical: 'middle', horizontal: 'right' } as any;
      cellGrpTotalVal.numFmt = currencyFormat;
      cellGrpTotalVal.fill = totalFill as any;
      cellGrpTotalVal.border = doubleBottomBorder as any;

      currentRowIdx++;

      // Fila vacía
      worksheet.getRow(currentRowIdx).height = 12;
      currentRowIdx++;
    });

    // ── Fila de Utilidad (Saldo Operativo) ──
    const utilRow = worksheet.getRow(currentRowIdx);
    utilRow.height = 22;

    const utilFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE1F5FE' } // Celeste suave
    } as const;

    const utilDoubleBorder = {
      top: { style: 'thin', color: { argb: 'FF2E5A88' } },
      bottom: { style: 'medium', color: { argb: 'FF1B3A5C' } }
    } as const;

    const cellUtilName = utilRow.getCell(2);
    cellUtilName.value = 'UTILIDAD';
    cellUtilName.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
    cellUtilName.alignment = { vertical: 'middle', horizontal: 'left' } as any;
    cellUtilName.fill = utilFill as any;
    cellUtilName.border = utilDoubleBorder as any;

    EXCEL_MONTHS.forEach((m, idx) => {
      const cell = utilRow.getCell(5 + idx);
      const ing = totalMesGrupo(categorias, 'ingreso', m);
      const egr = totalMesGrupo(categorias, 'materiales', m) + 
                  totalMesGrupo(categorias, 'servicios', m) + 
                  totalMesGrupo(categorias, 'mano_obra', m) + 
                  totalMesGrupo(categorias, 'administracion', m);
      cell.value = ing - egr;
      cell.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
      cell.alignment = { vertical: 'middle', horizontal: 'right' } as any;
      cell.numFmt = currencyFormat;
      cell.fill = utilFill as any;
      cell.border = utilDoubleBorder as any;
    });

    const cellUtilVal = utilRow.getCell(totalColIdx);
    cellUtilVal.value = saldoOperativo;
    cellUtilVal.font = { name: 'Segoe UI', size: 10, bold: true, color: { argb: 'FF1B3A5C' } };
    cellUtilVal.alignment = { vertical: 'middle', horizontal: 'right' } as any;
    cellUtilVal.numFmt = currencyFormat;
    cellUtilVal.fill = utilFill as any;
    cellUtilVal.border = utilDoubleBorder as any;

    // 4. Configurar anchos de columnas
    worksheet.getColumn(1).width = 3;   // A
    worksheet.getColumn(2).width = 45;  // B — nombre de categoría
    worksheet.getColumn(3).width = 3;   // C
    worksheet.getColumn(4).width = 3;   // D
    for (let idx = 0; idx < EXCEL_MONTHS.length; idx++) {
      worksheet.getColumn(5 + idx).width = 15; // meses
    }
    worksheet.getColumn(totalColIdx).width = 22; // total presupuesto

    // 5. Descargar vía FileSaver
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const fecha = new Date().toISOString().slice(0, 10);
    saveAs(blob, `Flujo_Caja_Patio_Sur_${fecha}.xlsx`);
  }, [categorias, saldoOperativo]);

  // Exponer la función de export via window para que el botón "Exportar" del header la llame
  useEffect(() => {
    (window as any).__exportEgresosExcel = exportarExcel;
    return () => { delete (window as any).__exportEgresosExcel; };
  }, [exportarExcel]);

  return (
    <div className="space-y-4">
      {showVistaFinanzas && (
        <VistaFinanzas 
          projectId={projectId} 
          onClose={() => setShowVistaFinanzas(false)} 
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-steel-800">Egresos e Ingresos por Categoría</h3>
          <p className="text-[10px] text-steel-400 mt-0.5">
            Estructura basada en template Excel "FC X Obras" · Edita valores haciendo clic · Agrega/elimina categorías
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* ── BOTÓN NUEVO: Vista Finanzas ── */}
          <button
            onClick={() => setShowVistaFinanzas(true)}
            className="flex items-center gap-2 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:border-blue-800 dark:hover:bg-blue-900/40 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 transition"
          >
            <BarChart3 className="h-4 w-4" />
            Vista Finanzas
          </button>

          <label className="flex items-center gap-1.5 text-[10px] text-steel-500 cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={mostrarTodosMeses}
              onChange={e => setMostrarTodosMeses(e.target.checked)}
              className="rounded border-steel-300"
            />
            Mostrar todos los meses ({EXCEL_MONTHS.length})
          </label>
          {/* Indicador REAL de estado de guardado */}
          <div
            className={clsx(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shadow-sm transition',
              saveStatus.status === 'saving'
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                : saveStatus.status === 'error'
                ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                : saveStatus.status === 'saved'
                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                : 'bg-steel-50 dark:bg-steel-900 border-steel-200 dark:border-steel-700'
            )}
            title={saveStatus.detail || 'Estado de sincronización'}
          >
            {saveStatus.status === 'saving' ? (
              <RefreshCw className="h-3 w-3 text-amber-600 animate-spin" />
            ) : saveStatus.status === 'error' ? (
              <AlertTriangle className="h-3 w-3 text-red-600" />
            ) : (
              <div className="relative flex h-2 w-2">
                <span className={clsx(
                  'animate-ping absolute inline-flex h-full w-full rounded-full opacity-75',
                  saveStatus.status === 'saved' ? 'bg-emerald-400' : 'bg-steel-400'
                )}></span>
                <span className={clsx(
                  'relative inline-flex rounded-full h-2 w-2',
                  saveStatus.status === 'saved' ? 'bg-emerald-500' : 'bg-steel-400'
                )}></span>
              </div>
            )}
            <span className={clsx(
              'text-[10px] font-bold uppercase tracking-tight',
              saveStatus.status === 'saving' ? 'text-amber-700 dark:text-amber-400'
                : saveStatus.status === 'error' ? 'text-red-700 dark:text-red-400'
                : saveStatus.status === 'saved' ? 'text-emerald-700 dark:text-emerald-400'
                : 'text-steel-600 dark:text-steel-400'
            )}>
              {saveStatus.status === 'saving' ? 'Guardando...'
                : saveStatus.status === 'error' ? '⚠ Error al guardar'
                : saveStatus.status === 'saved' ? '✓ Guardado'
                : 'Sincronizado'}
            </span>
          </div>
          <button
            onClick={exportarExcel}
            className="flex items-center gap-1.5 rounded-lg border border-steel-300 bg-white dark:bg-steel-800 hover:bg-steel-50 dark:hover:bg-steel-700 px-3 py-1.5 text-xs font-bold text-steel-700 dark:text-steel-200 transition shadow-sm"
            title="Exportar con el mismo formato del template Excel"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </button>
        </div>
      </div>


      {/* Resumen por grupo */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {grupoData.map(({ grupo, items, total }) => {
          const cfg = GROUP_CONFIG[grupo];
          const Icon = cfg.icon;
          return (
            <div key={grupo} className={clsx('rounded-lg border p-3', cfg.border, cfg.darkBorder, cfg.bg, cfg.darkBg)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={clsx('h-3.5 w-3.5', cfg.color, cfg.darkColor)} />
                <p className={clsx('text-[9px] font-bold uppercase', cfg.color, cfg.darkColor)}>{cfg.label}</p>
              </div>
              <p className={clsx('text-sm font-bold', cfg.color, cfg.darkColor)}>{formatCOP(total)}</p>
              <p className="text-[9px] text-steel-500 dark:text-steel-400 mt-0.5">{items.length} categorías</p>
            </div>
          );
        })}

        {/* Modal de Detalle Completo de Categoría (clic en nombre) */}
        {categoriaDetailModal && (
          <CategoriaDetailModal
            open={!!categoriaDetailModal}
            onClose={() => setCategoriaDetailModal(null)}
            projectId={projectId}
            categoriaId={categoriaDetailModal.id}
            categoriaNombre={categoriaDetailModal.nombre}
            mesesConDetalle={categoriaDetailModal.mesesConDetalle}
          />
        )}
      </div>

      {/* Tablas por grupo */}
      {grupoData.map(({ grupo, items, total }) => {
        const cfg = GROUP_CONFIG[grupo];
        const Icon = cfg.icon;
        const isExp = expanded[grupo];
        
        // Calcular subtotales
        const isIntereses = grupo === 'intereses';
        const subtotalGlobal = saldoOperativo + totalGrupo(categorias.filter(c => c.incluirEnGrafico !== false), 'intereses');

        return (
          <div key={grupo} className="space-y-2">
            {isIntereses && (
              <div className="overflow-x-auto rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/20 mb-3 shadow-sm">
                <table className="w-full text-xs border-collapse">
                  <tbody>
                    <tr>
                      <td className="px-3 py-2.5 text-left font-bold text-steel-700 dark:text-steel-200 w-64 sticky left-0 bg-blue-50 dark:bg-blue-900/40 z-20 border-r border-blue-200 dark:border-blue-800 uppercase">
                        SUBTOTAL
                      </td>
                      {mesesVisibles.map(m => {
                        const tIngreso = totalMesGrupo(categorias, 'ingreso', m);
                        const tMat = totalMesGrupo(categorias, 'materiales', m);
                        const tServ = totalMesGrupo(categorias, 'servicios', m);
                        const tMano = totalMesGrupo(categorias, 'mano_obra', m);
                        const tAdmin = totalMesGrupo(categorias, 'administracion', m);
                        const subtotalMes = tIngreso - (tMat + tServ + tMano + tAdmin);
                        return (
                          <td key={m} className={clsx('px-2 py-2.5 text-right font-mono text-[11px] font-semibold min-w-[85px]', subtotalMes >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400')}>
                            {formatCOP(subtotalMes)}
                          </td>
                        );
                      })}
                      <td className={clsx('px-3 py-2.5 text-right font-bold text-sm min-w-[110px] sticky right-0 bg-blue-100 dark:bg-blue-800/40 z-20 border-l border-blue-200 dark:border-blue-800', subtotalGlobal >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                        {formatCOP(subtotalGlobal)}
                      </td>
                      <td className="px-2 py-2 w-10 sticky right-0 bg-blue-50 dark:bg-blue-900/40 z-20"></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
            <div className={clsx('rounded-xl border shadow-sm overflow-hidden bg-white dark:bg-steel-800', cfg.border, cfg.darkBorder)}>
            {/* Header del grupo */}
            <div className={clsx('flex items-center justify-between px-4 py-2.5', cfg.headerBg, cfg.darkHeaderBg)}>
              <button onClick={() => toggleExpand(grupo)} className="flex items-center gap-2 flex-1 text-left">
                {isExp ? <ChevronDown className={clsx('h-4 w-4', cfg.color, cfg.darkColor)} /> : <ChevronRight className={clsx('h-4 w-4', cfg.color, cfg.darkColor)} />}
                <Icon className={clsx('h-4 w-4', cfg.color, cfg.darkColor)} />
                <div>
                  <p className={clsx('text-sm font-bold', cfg.color, cfg.darkColor)}>{cfg.label}</p>
                  <p className="text-[10px] text-steel-500 dark:text-steel-400">{items.length} categorías · Total: {formatCOP(total)}</p>
                </div>
              </button>
              {/* Dropdown Agregar */}
              <div className="relative" ref={openDropdown === grupo ? dropdownRef : undefined}>
                <button
                  onClick={() => setOpenDropdown(prev => prev === grupo ? null : grupo)}
                  className={clsx('flex items-center gap-1 text-[10px] font-bold rounded px-2 py-1 border transition', cfg.border, 'bg-white dark:bg-steel-700 hover:bg-steel-50 dark:hover:bg-steel-600', cfg.color)}
                >
                  <Plus className="h-3 w-3" />
                  Agregar
                  <ChevronDown className="h-2.5 w-2.5 ml-0.5" />
                </button>
                {openDropdown === grupo && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 bg-white dark:bg-steel-800 rounded-xl border border-steel-200 dark:border-steel-700 shadow-lg py-1 overflow-hidden">
                    <button
                      onClick={() => openAddCatModal(grupo)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-steel-700 dark:text-steel-200 hover:bg-steel-50 dark:hover:bg-steel-700 transition text-left"
                    >
                      <Tag className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500" />
                      <span className="font-semibold">Categoría</span>
                    </button>
                    <button
                      onClick={() => openAddMesModal(grupo)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-steel-700 dark:text-steel-200 hover:bg-steel-50 dark:hover:bg-steel-700 transition text-left"
                    >
                      <Calendar className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500" />
                      <span className="font-semibold">Mes</span>
                    </button>
                    <div className="my-1 border-t border-steel-100 dark:border-steel-700" />
                    <button
                      onClick={() => openDeleteMesModal(grupo)}
                      className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition text-left"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      <span className="font-semibold">Eliminar Mes</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tabla */}
            {isExp && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-steel-50 dark:bg-steel-900 border-y border-steel-100 dark:border-steel-700 sticky top-0 z-10">
                      <th className="px-3 py-2 text-left text-steel-500 dark:text-steel-400 font-semibold w-64 sticky left-0 bg-steel-50 dark:bg-steel-900 z-20 border-r border-steel-200 dark:border-steel-700">
                        Categoría
                      </th>
                      {mesesVisibles.map(m => (
                        <th key={m} className="px-2 py-2 text-right text-[9px] text-steel-500 dark:text-steel-300 font-semibold whitespace-nowrap min-w-[85px]">
                          {formatMonthKey(m)}
                        </th>
                      ))}
                      <th className="px-3 py-2 text-right text-steel-700 dark:text-steel-200 font-bold whitespace-nowrap min-w-[110px] sticky right-0 bg-steel-100 dark:bg-steel-800 z-20 border-l border-steel-200 dark:border-steel-700">
                        TOTAL
                      </th>
                      <th className="px-2 py-2 w-10 sticky right-0 bg-steel-50 dark:bg-steel-900 z-20"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-50 dark:divide-steel-700">
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={mesesVisibles.length + 3} className="px-4 py-6 text-center text-xs text-steel-400 dark:text-steel-500">
                          Sin categorías · Haz clic en "Agregar" para crear una
                        </td>
                      </tr>
                    )}
                    {items.map(cat => {
                      const tot = totalCategoria(cat);
                      const isExcluido = cat.incluirEnGrafico === false;
                      return (
                        <tr key={cat.id} className={clsx(
                          "hover:bg-steel-50/50 dark:hover:bg-steel-700/30 transition",
                          isExcluido && "opacity-60 grayscale-[0.5]"
                        )}>
                          {/* Nombre */}
                          <td className="px-3 py-1.5 sticky left-0 bg-white dark:bg-steel-800 hover:bg-steel-50/50 dark:hover:bg-steel-700/30 z-10 border-r border-steel-100 dark:border-steel-700">
                            {editingName === cat.id ? (
                              <div className="flex items-center gap-1">
                                <input
                                  value={tempValue}
                                  onChange={e => setTempValue(e.target.value)}
                                  onBlur={commitEditName}
                                  onKeyDown={e => { if (e.key === 'Enter') commitEditName(); if (e.key === 'Escape') { setEditingName(null); setTempValue(''); } }}
                                  autoFocus
                                  className="flex-1 text-xs font-semibold border border-primary-400 dark:border-primary-500 dark:bg-steel-700 dark:text-white rounded px-1.5 py-0.5 focus:outline-none"
                                />
                                <button onClick={commitEditName} className="text-emerald-600 hover:text-emerald-700">
                                  <Check className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 group">
                                <button 
                                  onClick={() => toggleInclusion(cat.id)}
                                  className={clsx(
                                    "hidden items-center justify-center w-4 h-4 rounded transition-all border shrink-0",
                                    !isExcluido 
                                      ? "bg-primary-500 border-primary-600 shadow-sm" 
                                      : "bg-white dark:bg-steel-700 border-steel-300 dark:border-steel-600"
                                  )}
                                  title={!isExcluido ? "Incluido en gráfico (clic para excluir)" : "Excluido del gráfico (clic para incluir)"}
                                >
                                  {!isExcluido && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                                </button>
                                <span 
                                  className={clsx('text-xs font-semibold truncate max-w-[180px] cursor-pointer hover:underline text-blue-600 dark:text-blue-400', cfg.color, cfg.darkColor)}
                                  onClick={() => setCategoriaDetailModal({ id: cat.id, nombre: cat.nombre, mesesConDetalle: cat.mesesConDetalle || [] })}
                                  title="Ver detalle completo mes a mes"
                                >
                                  {cat.nombre}
                                </span>
                                <button onClick={() => startEditName(cat.id, cat.nombre)} className="opacity-0 group-hover:opacity-100 text-steel-400 hover:text-primary-600 transition">
                                  <Edit3 className="h-3 w-3" />
                                </button>
                              </div>
                            )}
                          </td>

                          {/* Valores mensuales */}
                          {mesesVisibles.map(m => {
                            const val = cat.valores[m] || 0;
                            const isEditing = editingCell?.id === cat.id && editingCell.mes === m;
                            const isPast = m < currentMonth;
                            const tieneDetalle = cat.mesesConDetalle?.includes(m);
                            return (
                              <td
                                key={m}
                                className={clsx(
                                  'px-1.5 py-1 text-right font-mono text-[11px] cursor-pointer transition-colors duration-150',
                                  tieneDetalle
                                    ? 'bg-blue-50/70 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800 text-blue-700 dark:text-blue-300 font-semibold'
                                    : (val > 0
                                        ? (isPast
                                            ? 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/40 dark:bg-emerald-900/20'
                                            : 'text-steel-700 dark:text-steel-200')
                                        : 'text-steel-300 dark:text-steel-600'),
                                )}
                                onClick={() => !tieneDetalle && !isEditing && startEditCell(cat.id, m, val)}
                                onDoubleClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openCellDetailModal(cat.id, cat.nombre, m);
                                }}
                                title={tieneDetalle ? "Doble clic para ver/editar detalles. (Valor calculado automáticamente)" : "Doble clic para detalle (facturas, proveedor, nota)"}
                              >
                                {isEditing ? (
                                  <input
                                    type="number"
                                    value={tempValue}
                                    onChange={e => setTempValue(e.target.value)}
                                    onBlur={commitEditCell}
                                    onKeyDown={e => { if (e.key === 'Enter') commitEditCell(); if (e.key === 'Escape') { setEditingCell(null); setTempValue(''); } }}
                                    autoFocus
                                    className="w-full text-right text-[11px] border border-primary-400 dark:border-primary-500 dark:bg-steel-700 dark:text-white rounded px-1 py-0.5 focus:outline-none font-mono"
                                  />
                                ) : (
                                  val > 0 ? (
                                    tieneDetalle ? (
                                      <span className="inline-flex items-center gap-1 justify-end w-full">
                                        {formatCOP(val)}
                                        <FileText className="h-3 w-3 text-blue-500 dark:text-blue-400 shrink-0" />
                                      </span>
                                    ) : formatCOP(val)
                                  ) : '—'
                                )}
                              </td>
                            );
                          })}

                          {/* Total de la fila */}
                          <td className={clsx('px-3 py-1.5 text-right font-mono text-xs font-bold sticky right-0 z-10 border-l border-steel-200 dark:border-steel-700', cfg.bg, cfg.darkBg, cfg.color, cfg.darkColor)}>
                            {formatCOP(tot)}
                          </td>

                          {/* Botón eliminar */}
                          <td className="px-1 py-1 text-center sticky right-0 z-10 bg-white dark:bg-steel-800">
                            <button
                              onClick={() => openDeleteModal(cat.id)}
                              className="text-steel-300 hover:text-red-500 transition"
                              title="Eliminar categoría"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* Fila de totales del grupo */}
                    {items.length > 0 && (
                      <tr className={clsx('font-bold border-t-2', cfg.border, cfg.darkBorder, cfg.headerBg, cfg.darkHeaderBg)}>
                        <td className={clsx('px-3 py-2 sticky left-0 z-10 border-r', cfg.border, cfg.darkBorder, cfg.headerBg, cfg.darkHeaderBg, cfg.color, cfg.darkColor)}>
                          TOTAL {cfg.label}
                        </td>
                        {mesesVisibles.map(m => {
                          const t = totalMesGrupo(categorias.filter(c => c.incluirEnGrafico !== false), grupo, m);
                          return (
                            <td key={m} className={clsx('px-1.5 py-2 text-right font-mono text-[11px]', cfg.color, cfg.darkColor)}>
                              {t > 0 ? formatCOP(t) : '—'}
                            </td>
                          );
                        })}
                        <td className={clsx('px-3 py-2 text-right font-mono text-xs sticky right-0 z-10 border-l-2', cfg.border, cfg.darkBorder, cfg.headerBg, cfg.darkHeaderBg, cfg.color, cfg.darkColor)}>
                          {formatCOP(total)}
                        </td>
                        <td className={clsx('sticky right-0 z-10', cfg.headerBg, cfg.darkHeaderBg)}></td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        );
      })}

      {/* Fila global de total */}
      <div className="overflow-x-auto rounded-xl border border-steel-300 dark:border-steel-600 bg-steel-100 dark:bg-steel-800 mt-2 shadow-sm">
        <table className="w-full text-xs border-collapse">
          <tbody>
            <tr>
              <td className="px-3 py-3 text-left font-black text-steel-800 dark:text-steel-100 w-64 sticky left-0 bg-steel-100 dark:bg-steel-800 z-20 border-r border-steel-300 dark:border-steel-600 uppercase">
                TOTAL
              </td>
              {mesesVisibles.map(m => {
                const tIngreso = totalMesGrupo(categorias, 'ingreso', m);
                const tMat = totalMesGrupo(categorias, 'materiales', m);
                const tServ = totalMesGrupo(categorias, 'servicios', m);
                const tMano = totalMesGrupo(categorias, 'mano_obra', m);
                const tAdmin = totalMesGrupo(categorias, 'administracion', m);
                const tInt = totalMesGrupo(categorias, 'intereses', m);
                const totalMes = tIngreso - (tMat + tServ + tMano + tAdmin + tInt);
                return (
                  <td key={m} className={clsx('px-2 py-3 text-right font-mono text-[11px] font-bold min-w-[85px]', totalMes >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-red-700 dark:text-red-400')}>
                    {formatCOP(totalMes)}
                  </td>
                );
              })}
              <td className={clsx('px-3 py-3 text-right font-black text-[15px] min-w-[110px] sticky right-0 bg-steel-200 dark:bg-steel-700 z-20 border-l border-steel-300 dark:border-steel-600', saldoOperativo >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300')}>
                {formatCOP(saldoOperativo)}
              </td>
              <td className="px-2 py-3 w-10 sticky right-0 bg-steel-100 dark:bg-steel-800 z-20"></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* ── Modal: Agregar Categoría ── */}
      {addCatModal && (() => {
        const cfg = GROUP_CONFIG[addCatModal.grupo];
        const Icon = cfg.icon;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-sm">
              <div className={clsx('flex items-center justify-between px-5 py-4 rounded-t-2xl', cfg.headerBg)}>
                <div className="flex items-center gap-2">
                  <Icon className={clsx('h-4 w-4', cfg.color)} />
                  <h3 className={clsx('text-sm font-bold', cfg.color)}>Nueva Categoría</h3>
                  <span className="text-[10px] text-steel-500 dark:text-steel-400">· {cfg.label}</span>
                </div>
                <button onClick={() => setAddCatModal(null)} className="text-steel-400 hover:text-steel-700 dark:hover:text-steel-200 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-5">
                <label className="text-xs font-semibold text-steel-700 dark:text-steel-300 block mb-1.5">Nombre *</label>
                <input
                  ref={addNombreRef}
                  value={addNombre}
                  onChange={e => setAddNombre(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirmAddCategoria(); if (e.key === 'Escape') setAddCatModal(null); }}
                  placeholder="Ej: Cable BT AC, Obras civiles..."
                  className="w-full border border-steel-300 dark:border-steel-600 dark:bg-steel-700 dark:text-white dark:placeholder-steel-400 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-2">Podrás ingresar valores haciendo clic en las celdas de la tabla.</p>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-steel-100 dark:border-steel-700">
                <button onClick={() => setAddCatModal(null)} className="px-4 py-2 text-sm text-steel-600 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition">
                  Cancelar
                </button>
                <button
                  onClick={confirmAddCategoria}
                  disabled={!addNombre.trim()}
                  className={clsx('px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-1.5',
                    addNombre.trim() ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-steel-200 text-steel-400 cursor-not-allowed'
                  )}
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Agregar Mes ── */}
      {addMesModal && (() => {
        const cfg = GROUP_CONFIG[addMesModal.grupo];
        const Icon = cfg.icon;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-sm">
              <div className={clsx('flex items-center justify-between px-5 py-4 rounded-t-2xl', cfg.headerBg)}>
                <div className="flex items-center gap-2">
                  <Icon className={clsx('h-4 w-4', cfg.color)} />
                  <h3 className={clsx('text-sm font-bold', cfg.color)}>Agregar Mes</h3>
                  <span className="text-[10px] text-steel-500 dark:text-steel-400">· {cfg.label}</span>
                </div>
                <button onClick={() => setAddMesModal(null)} className="text-steel-400 hover:text-steel-700 dark:hover:text-steel-200 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="px-5 py-5">
                <label className="text-xs font-semibold text-steel-700 dark:text-steel-300 block mb-1.5">Selecciona el mes a mostrar</label>
                {mesesDisponibles.length === 0 ? (
                  <p className="text-xs text-steel-400 dark:text-steel-500 py-3 text-center">Todos los meses ya tienen valores en este grupo.</p>
                ) : (
                  <select
                    value={selectedMes}
                    onChange={e => setSelectedMes(e.target.value)}
                    className="w-full border border-steel-300 dark:border-steel-600 dark:bg-steel-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                  >
                    <option value="">— Elige un mes —</option>
                    {mesesDisponibles.map(m => (
                      <option key={m} value={m}>{formatMonthKey(m)}</option>
                    ))}
                  </select>
                )}
                <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-2">El mes aparecerá en la tabla para que puedas ingresar valores.</p>
              </div>
              <div className="flex justify-end gap-2 px-5 py-4 border-t border-steel-100 dark:border-steel-700">
                <button onClick={() => setAddMesModal(null)} className="px-4 py-2 text-sm text-steel-600 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition">
                  Cancelar
                </button>
                <button
                  onClick={confirmAddMes}
                  disabled={!selectedMes}
                  className={clsx('px-4 py-2 text-sm font-bold rounded-lg transition flex items-center gap-1.5',
                    selectedMes ? 'bg-primary-600 hover:bg-primary-700 text-white' : 'bg-steel-200 text-steel-400 cursor-not-allowed'
                  )}
                >
                  <Calendar className="h-3.5 w-3.5" /> Agregar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Eliminar Mes ── */}
      {deleteMesModal && (() => {
        const cfg = GROUP_CONFIG[deleteMesModal.grupo];
        const Icon = cfg.icon;
        const totalMes = selectedDeleteMes
          ? categorias.filter(c => c.grupo === deleteMesModal.grupo).reduce((s, c) => s + (c.valores[selectedDeleteMes] || 0), 0)
          : 0;
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-sm">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-950/30 rounded-t-2xl border-b border-red-100 dark:border-red-900/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Eliminar Mes</h3>
                  <p className="text-[10px] text-red-500 dark:text-red-500">Esta acción no se puede deshacer</p>
                </div>
                <button onClick={() => setDeleteMesModal(null)} className="ml-auto text-steel-400 hover:text-steel-700 dark:hover:text-steel-200 transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className={clsx('flex items-center gap-2 rounded-lg px-3 py-2', cfg.bg, cfg.border, 'border')}>
                  <Icon className={clsx('h-3.5 w-3.5', cfg.color)} />
                  <span className={clsx('text-xs font-semibold', cfg.color)}>{cfg.label}</span>
                </div>
                <div>
                  <label className="text-xs font-semibold text-steel-700 dark:text-steel-300 block mb-1.5">Selecciona el mes a eliminar</label>
                  {mesesConValorEnGrupo.length === 0 ? (
                    <p className="text-xs text-steel-400 dark:text-steel-500 py-3 text-center">No hay meses con valores en este grupo.</p>
                  ) : (
                    <select
                      value={selectedDeleteMes}
                      onChange={e => setSelectedDeleteMes(e.target.value)}
                      className="w-full border border-steel-300 dark:border-steel-600 dark:bg-steel-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                    >
                      <option value="">— Elige un mes —</option>
                      {mesesConValorEnGrupo.map(m => (
                        <option key={m} value={m}>{formatMonthKey(m)}</option>
                      ))}
                    </select>
                  )}
                </div>
                {selectedDeleteMes && (
                  <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 px-4 py-3 space-y-1">
                    <p className="text-xs font-semibold text-red-700 dark:text-red-400">{formatMonthKey(selectedDeleteMes)}</p>
                    <p className="text-[10px] text-red-500">Total que se borrará: <span className="font-bold font-mono">{formatCOP(totalMes)}</span></p>
                    <p className="text-[10px] text-steel-500 dark:text-steel-400 mt-1">Se eliminarán los valores de todas las categorías de este grupo para ese mes.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-2 px-6 py-4 border-t border-steel-100 dark:border-steel-700">
                <button
                  onClick={() => setDeleteMesModal(null)}
                  className="px-4 py-2 text-sm text-steel-600 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteMes}
                  disabled={!selectedDeleteMes}
                  className={clsx('px-5 py-2 text-sm font-bold rounded-lg transition flex items-center gap-2',
                    selectedDeleteMes ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-steel-200 text-steel-400 cursor-not-allowed'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal: Confirmar Eliminación ── */}
      {deleteModal && (() => {
        const cat = categorias.find(c => c.id === deleteModal.id);
        if (!cat) return null;
        const cfg = GROUP_CONFIG[cat.grupo];
        const total = totalCategoria(cat);
        const mesesConValor = Object.keys(cat.valores).filter(m => (cat.valores[m] || 0) > 0);
        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-md">
              {/* Header */}
              <div className="flex items-center gap-3 px-6 py-4 bg-red-50 dark:bg-red-950/30 rounded-t-2xl border-b border-red-100 dark:border-red-900/50">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/40">
                  <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-red-700 dark:text-red-400">Eliminar categoría</h3>
                  <p className="text-[10px] text-red-500">Esta acción no se puede deshacer</p>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className={clsx('rounded-xl border p-4', cfg.border, cfg.bg)}>
                  <p className={clsx('text-sm font-bold', cfg.color)}>{cat.nombre}</p>
                  <p className="text-[10px] text-steel-500 dark:text-steel-400 mt-0.5">{cfg.label}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <div>
                      <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase font-semibold">Total</p>
                      <p className={clsx('text-sm font-bold font-mono', cfg.color)}>{formatCOP(total)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase font-semibold">Meses con datos</p>
                      <p className="text-sm font-bold text-steel-700 dark:text-steel-200">{mesesConValor.length}</p>
                    </div>
                  </div>
                  {mesesConValor.length > 0 && (
                    <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-2">
                      {mesesConValor.map(m => formatMonthKey(m)).join(' · ')}
                    </p>
                  )}
                </div>
                <p className="text-xs text-steel-600 dark:text-steel-300">
                  ¿Estás seguro de que quieres eliminar esta categoría y todos sus valores?
                </p>
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 px-6 py-4 border-t border-steel-100 dark:border-steel-700">
                <button
                  onClick={() => setDeleteModal(null)}
                  className="px-4 py-2 text-sm text-steel-600 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDeleteCategoria}
                  className="px-5 py-2 text-sm font-bold bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center gap-2"
                >
                  <X className="h-4 w-4" />
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal de Detalle por Celda (doble clic) */}
      {detailModalCell && (
        <CellDetailModal
          open={!!detailModalCell}
          onClose={() => setDetailModalCell(null)}
          projectId={projectId}
          categoriaId={detailModalCell.catId}
          categoriaNombre={detailModalCell.catNombre}
          mesKey={detailModalCell.mes}
          mesLabel={formatMonthKey(detailModalCell.mes)}
          onSaved={(totalCelda, tieneDetalles) => {
            // Actualizar la celda en memoria con el nuevo total y la lista de meses con detalle
            setCategorias(prev => prev.map(c => {
              if (c.id !== detailModalCell.catId) return c;
              const newVals = { ...c.valores };
              newVals[detailModalCell.mes] = totalCelda;

              const currentMeses = c.mesesConDetalle || [];
              let updatedMeses = [...currentMeses];
              if (tieneDetalles) {
                if (!updatedMeses.includes(detailModalCell.mes)) {
                  updatedMeses.push(detailModalCell.mes);
                }
              } else {
                updatedMeses = updatedMeses.filter(m => m !== detailModalCell.mes);
              }

              return { ...c, valores: newVals, mesesConDetalle: updatedMeses };
            }));
            if (user) {
              logEdit(user, 'Flujo de Caja › Detalle Celda',
                `Actualizó detalles de "${detailModalCell.catNombre}" en ${formatMonthKey(detailModalCell.mes)} → ${formatCOP(totalCelda)}`);
            }
          }}
        />
      )}
    </div>
  );
}
