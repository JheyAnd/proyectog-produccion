import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import apiClient from '@/services/api/client';

import { Download, TrendingDown, AlertTriangle, Clock, ShieldCheck, Briefcase, DollarSign, ChevronDown, ChevronRight, Upload, Calendar, Users, TrendingUp, Calculator, X, CheckCircle, Package, FolderOpen, Loader2, RefreshCw, Database, FileSpreadsheet } from 'lucide-react';
import HelpButton from '@/components/common/HelpButton';
import { entregablesApi, type EntregableMeta } from '@/services/api/entregables';
import { cronogramaApi } from '@/services/api/cronograma';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import ChapterBreakdownChart from '@/components/dashboard/ChapterBreakdownChart';
import { useDocuments, CATEGORIES_MAP, type DocumentItem } from '@/data/documentsData';
import EmptyProjectState from '@/components/common/EmptyProjectState';
import { FileText, Eye, Trash2, Lock, Rocket } from 'lucide-react';
import clsx from 'clsx';
import { businessCaseAPI, type FullBusinessCaseResponse } from '@/services/api/businessCase';
import { projectsApi } from '@/services/api/projects';
import EntregablesUploadView from '@/components/business-case/EntregablesUploadView';
import { useToastStore } from '@/components/common/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { cashFlowV2API } from '@/services/api/cashFlowV2';
import { INITIAL_EGRESOS_CATEGORIAS } from '@/data/excelCategoriasEgresos';

// ── Entregables ──────────────────────────────────────────────────────────────
interface EntregableDocDef {
  id: string;
  label: string;
  icon: React.ElementType;
  accept: string;
  group: string;
}

const ENTREGABLES_DOCS: EntregableDocDef[] = [
  { id: 'presupuesto_venta',  label: 'Presupuesto de Venta',  icon: DollarSign, accept: '.xlsx,.xls,.pdf,.docx', group: 'Presupuesto' },
  { id: 'presupuesto_costo',  label: 'Presupuesto de Costo',  icon: Calculator, accept: '.xlsx,.xls,.pdf,.docx', group: 'Presupuesto' },
  { id: 'cronograma_obra',    label: 'Cronograma de Obra',    icon: Calendar,   accept: '.xlsx,.xls,.pdf,.mpp',  group: 'Planificación' },
  { id: 'equipo_ejecucion',   label: 'Equipo de Ejecución',   icon: Users,      accept: '.xlsx,.xls,.pdf,.docx', group: 'Planificación' },
  { id: 'flujo_caja',         label: 'Flujo de Caja',         icon: TrendingUp, accept: '.xlsx,.xls,.pdf',       group: 'Planificación' },
];

const ENTREGABLE_GROUPS = [
  { id: 'Presupuesto',   color: 'blue',    icon: DollarSign },
  { id: 'Planificación', color: 'purple',  icon: Calendar },
] as const;

const GROUP_COLORS: Record<string, { header: string; headerText: string; iconBg: string; iconText: string; badge: string; btn: string }> = {
  blue:    { header: 'bg-blue-50 border-blue-200 dark:border-blue-900/50 dark:bg-blue-950/20',      headerText: 'text-blue-800 dark:text-blue-300',    iconBg: 'bg-blue-100 dark:bg-blue-900/30',    iconText: 'text-blue-600 dark:text-blue-400',    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',     btn: 'bg-blue-600 hover:bg-blue-700' },
  purple:  { header: 'bg-purple-50 border-purple-200 dark:border-purple-900/50 dark:bg-purple-950/20',  headerText: 'text-purple-800 dark:text-purple-300',iconBg: 'bg-purple-100 dark:bg-purple-900/30',iconText: 'text-purple-600 dark:text-purple-400',badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',btn: 'bg-purple-600 hover:bg-purple-700' },
};

function fmtFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const entregablesHelp = {
  pageTitle: 'Ayuda — Entregables del Proyecto',
  description: 'Repositorio central de documentos clave del proyecto. Aquí puedes cargar y descargar los archivos oficiales de cada entregable.',
  sections: [
    {
      title: 'Documentos disponibles',
      items: [
        { color: '#1B5EAB', label: 'Presupuesto de Venta',  description: 'Archivo con la oferta económica oficial enviada al cliente. Formatos admitidos: Excel, PDF, Word.' },
        { color: '#4338CA', label: 'Presupuesto de Costo',  description: 'Detalle de costos directos e indirectos del proyecto. Formatos admitidos: Excel, PDF, Word.' },
        { color: '#7C3AED', label: 'Cronograma',            description: 'Línea de tiempo y planificación de actividades. Formatos admitidos: Excel, PDF, MS Project.' },
        { color: '#0D9488', label: 'Equipo de Ejecución',   description: 'Organigrama, roles, responsabilidades y asignación del personal de obra.' },
        { color: '#16A34A', label: 'Flujo de Caja',         description: 'Proyección mensual de ingresos y egresos. Base para el control financiero del proyecto.' },
      ],
    },
    {
      title: 'Cómo usar',
      items: [
        { color: '#1B5EAB', label: 'Cargar archivo', description: 'Haz clic en "Cargar archivo" o arrastra el archivo directamente sobre la tarjeta.' },
        { color: '#16A34A', label: 'Descargar',       description: 'Una vez cargado, usa el botón "Descargar" para obtener el archivo guardado.' },
        { color: '#D97706', label: 'Reemplazar',      description: 'Para actualizar un documento, elimina el actual con el botón "✕" y carga la nueva versión.' },
      ],
    },
  ],
};

// ── Fin Entregables ───────────────────────────────────────────────────────────

const businessCaseHelp = {
  pageTitle: 'Ayuda — Caso de Negocio',
  description:
    'Esta pagina presenta el analisis financiero detallado del proyecto basado en el archivo ' +
    '"Detallado caso de negocio_220126.xlsx". Muestra la estructura de costos vs venta, ' +
    'el estado de la gestion de compra y los indicadores de rentabilidad por capitulo.',
  sections: [
    {
      title: 'KPIs Macro Financieros',
      items: [
        { color: '#1B5EAB', label: 'Valor Oferta Total: $41.0B', description: 'Precio global fijo con financiacion. Fuente: hoja "Costo vs Venta" y "RESUMEN VENTA" del Excel.' },
        { color: '#4A4D56', label: 'Costo Total Estimado: $29.5B', description: 'Costo directo + AIU + financiacion. Fuente: suma de costos de "Costo vs Venta" + "Admon Patios".' },
        { color: '#16A34A', label: 'Margen Bruto: 28.2% ($11.6B)', description: 'Diferencia entre venta y costo: $41B - $29.5B. Incluye AIU (17%) y financiacion.' },
        { color: '#1B5EAB', label: 'Ahorro en Compras: $3.7B (15.3%)', description: 'Diferencia entre caso de negocio ($24.3B) y costo proyectado ($20.6B). Fuente: hoja "Ejecucion vs CN".' },
        { color: '#8B8E96', label: 'Financiacion: $3.1B', description: 'Costo financiero por 9 meses sin ingresos ($1.375B interes). Fuente: hoja "Admon Patios".' },
      ],
    },
    {
      title: 'Estado de Procura',
      items: [
        { color: '#4A4D56', label: 'Costo Directo (Caso Negocio): $24.3B', description: 'Presupuesto base de los 15 capitulos. Fuente: hoja "Ejecucion vs Caso de Negocio".' },
        { color: '#16A34A', label: 'Negociado: $13.2B (54.2%)', description: 'Ordenes de compra firmadas. Proveedores: Starcharge, WEG, Taesmet, R2F.' },
        { color: '#D97706', label: 'Pendiente: $7.4B (30.5%)', description: 'Sin contrato firmado. Criticos: Conexion Red, Comp. Reactiva, SPE/SPT.' },
        { color: '#1B5EAB', label: 'Costo Proyectado: $20.6B', description: 'Negociado + Pendiente. $3.7B por debajo del caso de negocio.' },
      ],
    },
    {
      title: 'Grafico: Venta vs Costo',
      items: [
        { color: '#1b5eab', label: 'Barra Azul — Venta (Oferta)', description: 'Precio cobrado al cliente por capitulo. Fuente: columna VENTA de "Costo vs Venta".' },
        { color: '#8b8e96', label: 'Barra Gris — Costo (Caso Negocio)', description: 'Costo estimado por capitulo. Fuente: columna COSTO de "Costo vs Venta".' },
      ],
    },
    {
      title: 'Grafico: Gestion de Compra',
      items: [
        { color: '#b5b8be', label: 'Barra Gris — Caso de Negocio', description: 'Presupuesto original estimado por capitulo.' },
        { color: '#16a34a', label: 'Barra Verde — Negociado', description: 'Monto con contrato/OC firmada con proveedor.' },
        { color: '#d97706', label: 'Barra Amarilla — Pendiente', description: 'Monto sin proveedor definido, riesgo de precio.' },
      ],
    },
    {
      title: 'Estructura de Costos (Pie)',
      items: [
        { color: '#1b5eab', label: 'Costo Directo: $24.3B', description: 'Materiales, equipos, mano de obra de los 15 capitulos.' },
        { color: '#d97706', label: 'Administracion (11%): $2.4B', description: 'Personal indirecto, oficinas, vehiculos, seguros.' },
        { color: '#f59e0b', label: 'Imprevistos (2%): $485M', description: 'Reserva para contingencias del proyecto.' },
        { color: '#8b8e96', label: 'Financiacion: $1.4B', description: 'Costo financiero (intereses) por 9 meses.' },
      ],
    },
    {
      title: 'Tabla: Indicadores de Riesgo',
      items: [
        { color: '#16A34A', label: 'OK (Verde) — Margen >= 10%', description: 'Capitulo con margen saludable. Sin riesgo financiero.' },
        { color: '#D97706', label: 'Bajo (Amarillo) — Margen 0%-10%', description: 'Margen ajustado, requiere monitoreo. Ej: Transformadores (9.5%), SPE/SPT (1.9%).' },
        { color: '#DC2626', label: 'Perdida (Rojo) — Margen < 0%', description: 'El costo supera la venta. Ej: Comp. Reactiva (-37.4%).' },
      ],
    },
    {
      title: 'Tabla: Estado de Negociacion',
      items: [
        { color: '#16A34A', label: 'Cerrado (>= 80%)', description: 'Capitulo con mayoria del presupuesto en contratos firmados.' },
        { color: '#D97706', label: 'Parcial (> 0% y < 80%)', description: 'Negociacion en curso, parcialmente comprometido.' },
        { color: '#DC2626', label: 'Pendiente (0%)', description: 'Sin proveedor definido. Riesgo alto de variacion de precio.' },
      ],
    },
  ],
};

const documentsFolderHelp = {
  pageTitle: 'Ayuda — Carpeta de Documentos',
  description: 'Vista sincronizada de los documentos de la carpeta 01 Caso de Negocio. Aquí puedes ver, descargar y subir archivos relacionados con la justificación financiera del proyecto.',
  sections: [
    {
      title: 'Sincronización',
      items: [
        { color: '#1B5EAB', label: 'Carpeta 01', description: 'Todos los archivos cargados aquí se reflejan automáticamente en la pestaña global de Documentos.' },
      ],
    },
  ],
};

import { formatCOPFull } from '@/utils/formatNumbers';

// Use full currency format for detailed business case display
const formatCOPDisplay = formatCOPFull;

// ==================== REAL DATA FROM EXCEL ====================


const getLS_CV_Key = (projectId: string) => `project_${projectId}_cv_table_v1`;
const getLS_EAC_Key = (projectId: string) => `project_${projectId}_eac_caso_negocio`;

type RowValues = Record<string, { venta: number; costo: number }>;

function loadCVValues(projectId: string): RowValues {
  try {
    const key = getLS_CV_Key(projectId);
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as RowValues;
  } catch { /* ignore */ }
  return {};
}

// Removed detalleCosto array

function ImportLyraModal({ onConfirm, onCancel }: { onConfirm: (trm: number) => void, onCancel: () => void }) {
  const [trm, setTrm] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px]">
        <h3 className="font-bold text-gray-900 text-lg">Importar Presupuesto LYRA</h3>
        <p className="text-sm text-gray-500 mt-1">
          LYRA usa valores en USD. Ingresa la TRM para convertir a COP.
        </p>
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700 block mb-1">TRM (USD → COP)</label>
          <input
            type="number"
            value={trm}
            onChange={e => setTrm(e.target.value)}
            placeholder="Ej: 4200"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition"
          />
        </div>
        <div className="flex gap-3 mt-6 justify-end">
          <button onClick={onCancel}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 transition">
            Cancelar
          </button>
          <button
            onClick={() => trm && onConfirm(parseFloat(trm))}
            disabled={!trm}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition">
            Confirmar e Importar
          </button>
        </div>
      </div>
    </div>
  );
}

export default function BusinessCasePage() {
  const { projectId: _projectId } = useParams();
  const projectId = _projectId || 'patio-sur-oe1035';
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'entregables';
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  // ── Datos desde API (BD) ──
  // Si la BD tiene datos del Caso de Negocio, los usamos como fuente de verdad.
  // Si la BD no responde o no tiene datos, mostramos EMPTY STATE (sin fallback a hardcoded).
  const [bcData, setBcData] = useState<FullBusinessCaseResponse | null>(null);
  const [bcLoading, setBcLoading] = useState(true);
  const [bcSource, setBcSource] = useState<'bd' | 'local' | 'empty' | 'error'>('empty');
  const [bcError, setBcError] = useState<string | null>(null);
  const [projectInfo, setProjectInfo] = useState<{ name?: string; code?: string; client?: string; company_id?: number | null; currency?: string } | null>(null);

  // ── Estado de Entregables (NUEVO) ──
  const [bcStatus, setBcStatus] = useState<{
    venta_cargado: boolean;
    costo_cargado: boolean;
    valor_oferta_total: number;
    costo_total: number;
    valores_manuales_completos: boolean;
    venta_monto_manual?: number;
    costo_monto_manual?: number;
    venta_excel_validado: boolean;
    costo_excel_validado: boolean;
    moneda?: string;
  }>({
    venta_cargado: false,
    costo_cargado: false,
    valor_oferta_total: 0,
    costo_total: 0,
    valores_manuales_completos: false,
    venta_monto_manual: 0,
    costo_monto_manual: 0,
    venta_excel_validado: false,
    costo_excel_validado: false
  });
  const ventaOK = !!bcStatus.venta_excel_validado;
  const costoOK = !!bcStatus.costo_excel_validado;

  const [statusLoading, setStatusLoading] = useState(true);
  const [isUploadingVenta, setIsUploadingVenta] = useState(false);
  const [isUploadingCosto, setIsUploadingCosto] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  // ── Estados para Clasificación con IA ──
  const [aiDetails, setAiDetails] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isParsingVenta, setIsParsingVenta] = useState(false);
  const [isParsingCosto, setIsParsingCosto] = useState(false);
  const [aiTab, setAiTab] = useState<'venta' | 'costo'>('venta');
  const [expandedAiGroups, setExpandedAiGroups] = useState<Set<string>>(new Set(['Suministro', 'Mano de Obra', 'Administración', 'Otros']));


  const loadStatus = useCallback(async () => {
    try {
      const status = await businessCaseAPI.getStatus(projectId);
      setBcStatus(status);
      // Invalida cache de query para que MainLayout y ProjectGuard se enteren
      queryClient.invalidateQueries({ queryKey: ['businessCaseStatus', projectId] });
    } catch (err) {
      console.error('Error cargando estado de presupuestos:', err);
    } finally {
      setStatusLoading(false);
    }
  }, [projectId, queryClient]);

  const loadAiDetails = useCallback(async () => {

    setLoadingDetails(true);
    try {
      const details = await businessCaseAPI.getDetails(projectId);
      setAiDetails(details);
    } catch (err) {
      console.error('Error al cargar los detalles de IA:', err);
    } finally {
      setLoadingDetails(false);
    }
  }, [projectId]);

  const handleParseDetail = async (tipo: 'venta' | 'costo') => {
    if (tipo === 'venta') setIsParsingVenta(true);
    else setIsParsingCosto(true);

    try {
      const result = await businessCaseAPI.parseDetail(projectId, tipo);
      if (result.status === 'success') {
        showToast(result.message || `Análisis de ${tipo} completado con éxito.`, 'success');
        await loadAiDetails();
      } else if (result.status === 'warning') {
        showToast(result.message || `Advertencia en el análisis de ${tipo}.`, 'warning');
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail || `Error al analizar el detalle de ${tipo} con IA.`;
      showToast(detail, 'error');
    } finally {
      if (tipo === 'venta') setIsParsingVenta(false);
      else setIsParsingCosto(false);
    }
  };

  useEffect(() => {
    setBcLoading(true);
    // Cargar metadata del proyecto para el EmptyState
    projectsApi.getById(projectId)
      .then(p => setProjectInfo({ name: p.name, code: p.code, client: p.client_name, company_id: p.company_id ?? undefined, currency: p.currency }))
      .catch(() => {});

    businessCaseAPI.getFull(projectId)
      .then((data) => {
        setBcData(data);
        setBcSource('bd');
        setBcError(null);
      })
      .catch((err) => {
        if (!err.response && (err.message === 'Network Error' || err.code === 'ERR_NETWORK')) {
          console.error('[BusinessCase] Microservicio inaccesible:', err);
          setBcData(null);
          setBcSource('error');
          setBcError('network_error');
        } else {
          console.warn('[BusinessCase] No hay datos en BD para el proyecto:', projectId);
          setBcData(null);
          setBcSource('empty');
          setBcError(err?.response?.data?.detail || null);
        }
      })
      .finally(() => setBcLoading(false));

    loadStatus();
    loadAiDetails();
  }, [projectId, loadStatus, loadAiDetails]);

  const [showImportLyraModal, setShowImportLyraModal] = useState(false);
  const [pendingFileLyra, setPendingFileLyra] = useState<{ type: 'venta' | 'costo', file: File } | null>(null);
  
  const esLYRA = projectId === 'lyra-carsan-oe2000';

  const handleSubirVenta = async (file: File) => {
    if (esLYRA) {
      setPendingFileLyra({ type: 'venta', file });
      setShowImportLyraModal(true);
      return;
    }

    setIsUploadingVenta(true);
    try {
      const result = await businessCaseAPI.uploadVenta(projectId, file);
      showToast(`✅ Presupuesto de Venta validado correctamente. Total Excel: ${formatCOPDisplay(result.total_venta)}`, 'success');
      await loadStatus();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Error al procesar el archivo.';
      showToast(detail, 'error');
    } finally {
      setIsUploadingVenta(false);
    }
  };

  const handleSubirCosto = async (file: File) => {
    if (esLYRA) {
      setPendingFileLyra({ type: 'costo', file });
      setShowImportLyraModal(true);
      return;
    }

    setIsUploadingCosto(true);
    try {
      const result = await businessCaseAPI.uploadCosto(projectId, file);
      showToast(`✅ Presupuesto de Costo validado correctamente. Total Excel: ${formatCOPDisplay(result.total_costo)}`, 'success');
      await loadStatus();
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Error al procesar el archivo.';
      showToast(detail, 'error');
    } finally {
      setIsUploadingCosto(false);
    }
  };

  const handleConfirmLyraImport = async (trm: number) => {
    if (!pendingFileLyra) return;
    
    setShowImportLyraModal(false);
    const { type, file } = pendingFileLyra;
    
    if (type === 'venta') setIsUploadingVenta(true);
    else setIsUploadingCosto(true);

    try {
      const result = await businessCaseAPI.importLyraCarsan(projectId, file, trm, type);
      showToast(`Excel LYRA procesado correctamente.`, 'success');
      
      // Auto-validar
      if (type === 'venta') {
        const diff = Math.abs(result.total_venta - (bcStatus.venta_monto_manual || 0)) / (bcStatus.venta_monto_manual || 1);
        if (diff <= 0.05) await businessCaseAPI.validateVenta(projectId);
      } else {
        const diff = Math.abs(result.total_costo - (bcStatus.costo_monto_manual || 0)) / (bcStatus.costo_monto_manual || 1);
        if (diff <= 0.05) await businessCaseAPI.validateCosto(projectId);
      }
      
      setTimeout(() => loadStatus(), 1000);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || 'Error al procesar el archivo LYRA.';
      showToast(detail, 'error');
    } finally {
      if (type === 'venta') setIsUploadingVenta(false);
      else setIsUploadingCosto(false);
      setPendingFileLyra(null);
    }
  };

  const handleSaveManualValues = async (values: any) => {
    try {
      await businessCaseAPI.saveManualValues(projectId, values);
      showToast('Valores manuales guardados. Proceda a cargar los archivos Excel.', 'success');
      await loadStatus();
    } catch (err) {
      showToast('Error al guardar valores manuales.', 'error');
      throw err;
    }
  };

  const handleConfirmVenta = async () => {
    try {
      await businessCaseAPI.validateVenta(projectId);
      showToast('Presupuesto de Venta validado manualmente.', 'success');
      await loadStatus();
    } catch (err) {
      showToast('Error al validar.', 'error');
    }
  };

  const handleConfirmCosto = async () => {
    try {
      await businessCaseAPI.validateCosto(projectId);
      showToast('Presupuesto de Costo validado manualmente.', 'success');
      await loadStatus();
    } catch (err) {
      showToast('Error al validar.', 'error');
    }
  };

  // Efecto para transición automática al Caso de Negocio completo
  useEffect(() => {
    if (ventaOK && costoOK && bcSource === 'empty') {
      const timer = setTimeout(() => {
        // Recargar todo el Caso de Negocio
        setBcLoading(true);
        businessCaseAPI.getFull(projectId)
          .then((data) => {
            setBcData(data);
            setBcSource('bd');
          })
          .catch(() => {})
          .finally(() => setBcLoading(false));
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [ventaOK, costoOK, bcSource, projectId]);

  // Importar Excel (REEMPLAZA datos de BD)
  const importInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {

    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const projectId = _projectId || 'patio-sur-oe1035';
      const result = await businessCaseAPI.importExcel(projectId, file);
      alert(`Importación exitosa: ${result.summary.chapters} capítulos, ${result.summary.aiu_items} items AIU`);
      // Recargar datos
      const data = await businessCaseAPI.getFull(projectId);
      setBcData(data);
      setBcSource('bd');
      if (user) logEdit(user, 'Caso de Negocio', `Importó Excel "${file.name}" (REEMPLAZÓ datos)`);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message;
      alert(`Error al importar: ${detail}`);
    } finally {
      setImporting(false);
      if (importInputRef.current) importInputRef.current.value = '';
    }
  };

  // Persistencia local se mantiene pero sin fallbacks de Patio Sur
  const [cvValues, setCVValues] = useState<RowValues>(() => loadCVValues(projectId));

  // Cuando llegan datos desde BD, hidratamos cvValues con los valores reales
  useEffect(() => {
    if (!bcData) return;
    const newValues: RowValues = {};
    bcData.chapters.forEach((ch) => {
      newValues[ch.chapter_id] = { venta: Number(ch.venta), costo: Number(ch.costo) };
    });
    bcData.aiu.forEach((a) => {
      newValues[a.tipo] = { venta: Number(a.venta), costo: Number(a.costo) };
    });
    setCVValues(newValues);
  }, [bcData]);

  // Recargar cvValues cuando cambia el projectId (para aislar datos por proyecto)
  useEffect(() => {
    setCVValues(loadCVValues(projectId));
  }, [projectId]);
  const [focusedCell, setFocusedCell] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showAdmModal, setShowAdmModal] = useState(false);
  const [costoFilter, setCostoFilter] = useState<'todo' | 'negociado' | 'pendiente'>('todo');
  const [expandedCaps, setExpandedCaps] = useState<Set<string>>(new Set());
  const toggleCap = (ref: string) => setExpandedCaps(prev => { const n = new Set(prev); n.has(ref) ? n.delete(ref) : n.add(ref); return n; });
  const toggleGroup = (id: string) => setCollapsedGroups(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  // Calcular EAC dinámico desde los valores editables y sincronizar con Dashboard
  const eacCasoNegocio = useMemo(() => {
    if (!bcData) return { sinFin: 0, conFin: 0 };
    
    const chapters = bcData.chapters || [];
    const aiu = bcData.aiu || [];

    const cdTotC = chapters.reduce((s, it) => s + Number(it.costo || 0), 0);
    const admC = Number(aiu.find(a => a.tipo === 'adm-11')?.costo || 0);
    const imprC = Number(aiu.find(a => a.tipo === 'imprev-2')?.costo || 0);
    const ivauC = Number(aiu.find(a => a.tipo === 'ivau-19')?.costo || 0);
    const finC = Number(aiu.find(a => a.tipo === 'financiacion')?.costo || 0);

    const sinFinC = cdTotC + admC + imprC + ivauC;
    return { sinFin: sinFinC, conFin: sinFinC + finC };
  }, [bcData]);

  // Persistir EAC en base de datos (y caché local) — ahora con projectId aislado
  useEffect(() => {
    const eacKey = getLS_EAC_Key(projectId);
    localStorage.setItem(eacKey, JSON.stringify(eacCasoNegocio));
    apiClient.put(`/preferences/${eacKey}`, eacCasoNegocio, { baseURL: '/api/v1' }).catch(() => {});
  }, [eacCasoNegocio, projectId]);

  // Persistir Costo vs Venta (cvValues) en base de datos — ahora con projectId aislado
  useEffect(() => {
    const cvKey = getLS_CV_Key(projectId);
    try { localStorage.setItem(cvKey, JSON.stringify(cvValues)); } catch { /* ignore */ }
    apiClient.put(`/preferences/${cvKey}`, cvValues, { baseURL: '/api/v1' }).catch(() => {});
  }, [cvValues, projectId]);

  // Carga inicial desde base de datos — ahora con projectId aislado
  useEffect(() => {
    const cvKey = getLS_CV_Key(projectId);
    apiClient.get<RowValues>(`/preferences/${cvKey}`, { baseURL: '/api/v1' })
      .then(res => {
        if (res.data && Object.keys(res.data).length > 0) {
          setCVValues(res.data);
          localStorage.setItem(cvKey, JSON.stringify(res.data));
        }
      })
      .catch(() => {});
  }, [projectId]);

  const updateCV = (id: string, key: 'venta' | 'costo', raw: string) => {

    const num = parseFloat(raw.replace(/[^\d.-]/g, '')) || 0;
    setCVValues(prev => ({ ...prev, [id]: { ...prev[id], [key]: num } }));
  };

  // ── Entregables state ──
  const [entregablesMeta, setEntregablesMeta] = useState<Record<string, EntregableMeta>>({});
  const [entregablesLoading, setEntregablesLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const lastUpload = useMemo(() => {
    const metas = Object.values(entregablesMeta);
    if (metas.length === 0) return null;
    return metas.reduce((latest, m) => {
      const d = new Date(m.uploaded_at);
      return d > latest ? d : latest;
    }, new Date(0));
  }, [entregablesMeta]);

  const todosEntregados = useMemo(() => {
    const ids = ['presupuesto_venta', 'presupuesto_costo', 'cronograma_obra', 'equipo_ejecucion', 'flujo_caja'];
    return ids.every(id => entregablesMeta[id]);
  }, [entregablesMeta]);

  const loadEntregables = useCallback(async () => {
    if (!_projectId) return;
    setEntregablesLoading(true);
    try {
      const list = await entregablesApi.list(_projectId);
      const map: Record<string, EntregableMeta> = {};
      list.forEach(e => { map[e.doc_type] = e; });
      
      setEntregablesMeta(map);
    } finally {
      setEntregablesLoading(false);
    }
  }, [_projectId, bcStatus, bcData]);

  useEffect(() => {
    if (activeTab === 'entregables') loadEntregables();
  }, [activeTab, loadEntregables]);

  const handleEntregableUpload = async (docId: string, file: File) => {
    if (!_projectId) return;
    if (file.size > 30 * 1024 * 1024) { alert('El archivo supera el límite de 30 MB.'); return; }
    setUploadingDoc(docId);
    try {
      const meta = await entregablesApi.upload(_projectId, docId, file, user?.full_name || user?.email || 'Usuario');
      setEntregablesMeta(prev => ({ ...prev, [docId]: meta }));
      if (user) logEdit(user, 'Caso de Negocio › Entregables', `Subió documento "${file.name}" (${docId})`);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al cargar el archivo.';
      alert(msg);
    } finally {
      setUploadingDoc(null);
    }

    // Si el archivo cargado es el cronograma y el proyecto NO es Patio Sur,
    // lanzar automáticamente el parser para poblar cronograma_proyectado.
    if (docId === 'cronograma_obra' && _projectId && _projectId !== 'patio-sur-oe1035') {
      handleImportarCronograma(_projectId, file);
    }
    
    // Si el archivo cargado es flujo de caja,
    // lanzar automáticamente el parser para poblar el flujo de caja.
    if (docId === 'flujo_caja' && _projectId) {
      handleImportarFlujoCaja(_projectId, file);
    }
  };

  const [importandoCronograma, setImportandoCronograma] = useState(false);
  const [importandoFC, setImportandoFC] = useState(false);

  const handleImportarFlujoCaja = async (pid: string, file: File) => {
    if (!pid) return;
    console.log("Iniciando importación a Flujo Caja:", pid, file.name);
    setImportandoFC(true);
    try {
      const res = await cashFlowV2API.importExcel(pid, file);
      showToast(
        `Flujo de caja importado: ${res.total_valores} valores en ${res.total_categorias} categorías.`,
        'success'
      );
      if (user) logEdit(user, 'Entregables › Flujo Caja', `Importó FC Excel: ${res.total_valores} valores leídos`);
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al importar el flujo de caja.';
      
      // Fallback a categorías por defecto si falla el parseo del Excel
      try {
        await cashFlowV2API.seedCategorias(pid, INITIAL_EGRESOS_CATEGORIAS);
        showToast(
          `Excel con formato desconocido. Se cargaron las actividades por defecto en Flujo de Caja.`,
          'success'
        );
        if (user) logEdit(user, 'Entregables › Flujo Caja', `Subió archivo pero se usaron categorías por defecto`);
      } catch (seedErr) {
        showToast(detail + " (Fallo al cargar categorías por defecto)", 'error');
      }
    } finally {
      setImportandoFC(false);
    }
  };

  const handleImportarCronograma = async (pid: string, file: File) => {
    if (!pid || pid === 'patio-sur-oe1035') return;
    setImportandoCronograma(true);
    try {
      const res = await cronogramaApi.importExcel(pid, file);
      if (res.ok) {
        showToast(
          `Cronograma importado: ${res.actividades_cargadas} actividades · ${res.semanas_proyectadas} semanas proyectadas`,
          'success'
        );
        queryClient.invalidateQueries({ queryKey: ['cronogramaProyectado', pid] });
        queryClient.invalidateQueries({ queryKey: ['cronogramaActividades', pid] });
        if (user) logEdit(user, 'Entregables › Cronograma', `Importó cronograma Excel: ${res.actividades_cargadas} actividades`);
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Error al importar el cronograma.';
      showToast(detail, 'error');
    } finally {
      setImportandoCronograma(false);
    }
  };

  const handleEntregableDownload = async (docId: string) => {
    if (!_projectId) return;
    const meta = entregablesMeta[docId]; if (!meta) return;
    
    if (meta.id.startsWith('dummy_')) {
      alert('Este presupuesto fue importado directamente a la base de datos. Para ver los detalles, revise la pestaña "Flujo de Trabajo". No hay un archivo físico adjunto descargable.');
      return;
    }

    try {
      await entregablesApi.download(_projectId, docId, meta.filename);
      if (user) logEdit(user, 'Caso de Negocio › Entregables', `Descargó documento "${meta.filename}"`);
    } catch { alert('Error al descargar el archivo.'); }
  };

  const handleEntregableRemove = async (docId: string) => {
    if (!_projectId || !confirm('¿Eliminar este documento?')) return;
    const meta = entregablesMeta[docId];
    
    if (meta?.id?.startsWith('dummy_')) {
      alert('Este presupuesto está vinculado a la base de datos. Para eliminarlo debes borrar los datos importados.');
      return;
    }

    try {
      await entregablesApi.remove(_projectId, docId);
      setEntregablesMeta(prev => { const n = { ...prev }; delete n[docId]; return n; });
      if (user) logEdit(user, 'Caso de Negocio › Entregables', `Eliminó documento "${meta?.filename ?? docId}"`);
    } catch { alert('Error al eliminar el documento.'); }
  };

  const tabs = [
    { id: 'entregables',  label: 'Entregables',     icon: FolderOpen },
    { id: 'caso-negocio', label: 'Caso de Negocio', icon: Briefcase },
  ];

  const [showFolder01Modal, setShowFolder01Modal] = useState(false);

  const { documents, addDocument: addDocGlobal, deleteDocument: deleteDocGlobal, loading: docsLoading } = useDocuments();
  const docsFolder01 = useMemo(() => documents.filter(d => d.category === '01 Caso de Negocio'), [documents]);

  const handleFolder01Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addDocGlobal(file, '01 Caso de Negocio');
      if (user) logEdit(user, 'Caso de Negocio › Carpeta 01', `Subió documento "${file.name}"`);
    }
  };

  const handleDocDownload = (doc: DocumentItem) => {
    const cat = CATEGORIES_MAP[doc.category] || 'otros';
    const link = document.createElement('a');
    link.href = `/api/v1/documents/${cat}/${doc.docId}/download`;
    link.download = doc.name;
    link.click();
    if (user) logEdit(user, 'Caso de Negocio › Carpeta 01', `Descargó documento "${doc.name}"`);
  };

  const handleDocView = (doc: DocumentItem) => {
    if (doc.sharepoint_url) {
      window.open(doc.sharepoint_url, '_blank');
      return;
    }
    const cat = CATEGORIES_MAP[doc.category] || 'otros';
    window.open(`/api/v1/documents/${cat}/${doc.docId}/preview`, '_blank');
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    approved: { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    pending: { label: 'Pendiente', color: 'bg-amber-50 text-amber-700 border border-amber-200' },
    revision: { label: 'En Revision', color: 'bg-primary-50 text-primary-700 border border-primary-200' },
  };

  // ── Cálculos Dinámicos para KPIs ──

  const currentTotalOferta = bcData ? Number(bcData.business_case?.valor_oferta_total || 0) : 0;
  const currentCostoFinal = bcData ? Number(bcData.business_case?.costo_total_con_fin || 0) : 0;
  const currentCostoSinFin = bcData ? Number(bcData.business_case?.costo_total_sin_fin || 0) : 0;
  const currentAdministracion = bcData ? Number(bcData.aiu?.find((a: any) => a.tipo === 'adm-11')?.costo || 0) : 0;
  const currentMargenBruto = currentTotalOferta - currentCostoFinal;
  const currentMargenPct = currentTotalOferta > 0 ? (currentMargenBruto / currentTotalOferta * 100).toFixed(1) : '0';
  const totalAdministracion = currentAdministracion;

  // Group details by category for the active tab (aiTab)
  const groupedDetails = useMemo(() => {
    const filtered = aiDetails.filter(d => d.tipo === aiTab);
    const groups: Record<string, typeof aiDetails> = {
      'Suministro': [],
      'Mano de Obra': [],
      'Administración': [],
      'Otros': []
    };
    filtered.forEach(d => {
      let cat = d.categoria;
      if (cat === 'Mano de Obra' || cat === 'ManoObra' || cat === 'mano_obra' || cat === 'Mano de obra') {
        cat = 'Mano de Obra';
      } else if (cat === 'Administración' || cat === 'Administracion' || cat === 'administracion') {
        cat = 'Administración';
      } else if (cat === 'Suministro' || cat === 'suministro') {
        cat = 'Suministro';
      } else {
        cat = 'Otros';
      }
      if (groups[cat]) {
        groups[cat].push(d);
      }
    });
    return groups;
  }, [aiDetails, aiTab]);

  const aiDetailsSum = useMemo(() => {
    return aiDetails
      .filter(d => d.tipo === aiTab)
      .reduce((sum, d) => sum + Number(d.valor || 0), 0);
  }, [aiDetails, aiTab]);

  const macroRefValue = useMemo(() => {
    if (aiTab === 'venta') {
      return bcStatus.venta_monto_manual || bcStatus.valor_oferta_total || 0;
    } else {
      return bcStatus.costo_monto_manual || bcStatus.costo_total || 0;
    }
  }, [bcStatus, aiTab]);

  const diffPct = useMemo(() => {
    if (macroRefValue === 0) return 0;
    return (Math.abs(aiDetailsSum - macroRefValue) / macroRefValue) * 100;
  }, [aiDetailsSum, macroRefValue]);

  // ✅ LOADING GUARD: Evitar renderizado de componentes que dependan de bcData mientras se carga
  if (bcLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary-600" />
          <p className="text-sm text-steel-500 font-medium animate-pulse tracking-wide">
            Cargando Caso de Negocio...
          </p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE: Si el microservicio está apagado o inaccesible
  if (bcSource === 'error' && bcError === 'network_error') {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px] p-8 text-center bg-white rounded-xl shadow-sm border border-red-100 m-6">
        <AlertTriangle className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Lo siento, no podemos mostrarte esta información.
        </h2>
        <p className="text-gray-600 max-w-md">
          El servidor del módulo de <strong>Caso de Negocio</strong> parece estar apagado o inaccesible en este momento.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-4 py-2 bg-red-50 text-red-600 font-medium rounded-lg hover:bg-red-100 transition-colors"
        >
          Reintentar conexión
        </button>
      </div>
    );
  }

  // ✅ EMPTY STATE: Proyecto en configuración si no tiene ambos presupuestos VALIDADOS
  const isEmptyProject = !esLYRA && (!ventaOK || !costoOK);

  const esProyectoUSD = projectInfo?.currency === 'USD';

  if (isEmptyProject) {
    return (
      <EntregablesUploadView
        ventaCargado={bcStatus.venta_cargado}
        costoCargado={bcStatus.costo_cargado}
        totalVenta={bcStatus.valor_oferta_total}
        totalCosto={bcStatus.costo_total}
        onSubirVenta={handleSubirVenta}
        onSubirCosto={handleSubirCosto}
        isLoadingVenta={isUploadingVenta}
        isLoadingCosto={isUploadingCosto}
        // Paso 1
        valoresManualesCompletos={bcStatus.valores_manuales_completos}
        initialValues={bcStatus}
        onSaveManualValues={handleSaveManualValues}
        // Validación
        ventaValidada={bcStatus.venta_excel_validado}
        costoValidada={bcStatus.costo_excel_validado}
        onConfirmVenta={handleConfirmVenta}
        onConfirmCosto={handleConfirmCosto}
        montoManualVenta={bcStatus.venta_monto_manual}
        montoManualCosto={bcStatus.costo_monto_manual}
        esProyectoUSD={esProyectoUSD}
        projectId={projectId}
        refetchBusinessCase={loadStatus}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-steel-900">
            {activeTab === 'caso-negocio' ? 'Caso de Negocio' : 'Entregables'}
          </h2>
          <p className="text-xs text-steel-400">
            {activeTab === 'caso-negocio'
              ? `Analisis financiero detallado — ${projectInfo?.name || 'Proyecto'} | Fuente: Detallado caso de negocio`
              : 'Documentos clave del proyecto — carga y descarga de archivos oficiales'}
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFolder01Modal(true)}
            className="flex items-center gap-2 rounded-lg border border-steel-300 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50 transition shadow-sm"
          >
            <FolderOpen className="h-4 w-4 text-primary-500" />
            01 Caso de Negocio
          </button>
          <HelpButton {...(activeTab === 'entregables' ? entregablesHelp : businessCaseHelp)} />
          {activeTab === 'caso-negocio' && (user?.role === 'controller' || user?.role === 'gerente' || user?.role === 'administrador') && (
            <>
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportExcel}
                className="hidden"
              />
              <button
                onClick={() => importInputRef.current?.click()}
                disabled={importing}
                className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition shadow-sm disabled:opacity-50 border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                title={"Importar Excel del Caso de Negocio (REEMPLAZA datos existentes)"}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                {importing ? 'Importando...' : 'Importar Excel'}
              </button>
            </>
          )}
          {activeTab === 'caso-negocio' && (
            <button className="flex items-center gap-2 rounded-lg border border-steel-300 bg-white px-4 py-2 text-sm font-medium text-steel-600 hover:bg-steel-50 transition shadow-sm">
              <Download className="h-4 w-4" /> Exportar
            </button>
          )}
        </div>
      </div>

      {/* Banner: Fuente de datos */}
      {activeTab === 'caso-negocio' && (
        <div className={clsx(
          "flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5 text-xs",
          bcSource === 'bd'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
            : 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
        )}>
          <div className="flex items-center gap-2">
            {bcLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : bcSource === 'bd' ? (
              <Database className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <span className="font-semibold">
              {bcLoading
                ? 'Cargando datos del Caso de Negocio...'
                : bcSource === 'bd'
                  ? `Fuente: Base de Datos`
                  : `Fuente: Datos locales`}
            </span>
            {bcSource === 'bd' && bcData?.business_case.source_excel_filename && (
              <span className="text-[11px] opacity-80">
                · Excel: {bcData.business_case.source_excel_filename}
                {bcData.business_case.last_imported_by_name && ` · Importado por ${bcData.business_case.last_imported_by_name}`}
              </span>
            )}
          </div>
          {bcSource === 'bd' && bcData?.business_case.scenario_active && (
            <span className="rounded-full bg-white/60 dark:bg-black/20 px-2 py-0.5 font-mono text-[10px] font-bold">
              Escenario: {bcData.business_case.scenario_active} (TRM ${Number(bcData.business_case.usd_rate).toFixed(0)})
            </span>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-steel-200 dark:border-steel-700 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchParams({ tab: tab.id })}
            className={`flex flex-shrink-0 items-center gap-2 px-4 sm:px-5 py-2.5 min-h-[44px] text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? 'border-primary-600 text-primary-700'
                : 'border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Caso de Negocio */}
      {activeTab === 'caso-negocio' && <>

      {/* KPI Row 1 - Macro Financial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Valor Oferta */}
        <div className="rounded-xl border border-steel-200 bg-white p-4 shadow-card">
          <p className="text-[10px] text-steel-400 uppercase tracking-wide font-medium">Valor Oferta Total</p>
          <p className="text-lg font-bold text-primary-700 mt-1">{formatCOPDisplay(currentTotalOferta)}</p>
          <p className="text-[10px] text-steel-400">Precio global fijo con financiación</p>
        </div>

        {/* Costo — sin y con financiación */}
        <div
          className="rounded-xl border border-steel-200 bg-white p-4 shadow-card cursor-pointer hover:brightness-95 transition"
          onClick={() => document.getElementById('tabla-gestion-compra')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
        >
          <p className="text-[10px] text-steel-400 uppercase tracking-wide font-medium">Costo Total "Caso de Negocio"</p>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-steel-400">Sin financiación</span>
              <span className="text-sm font-bold text-steel-700">{formatCOPDisplay(currentCostoSinFin)}</span>
            </div>
            <div className="h-px bg-steel-100" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-steel-400">Con financiación</span>
              <span className="text-sm font-black text-steel-900">{formatCOPDisplay(currentCostoFinal)}</span>
            </div>
          </div>
          <p className="text-[10px] text-steel-300 mt-2">Toca para ver Gestión de Compra →</p>
        </div>

        {/* Margen Bruto */}
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 shadow-card">
          <p className="text-[10px] text-steel-400 uppercase tracking-wide font-medium">Margen Bruto</p>
          <p className="text-lg font-bold text-emerald-600 mt-1">{formatCOPDisplay(currentMargenBruto)}</p>
          <p className="text-[10px] text-emerald-600 font-semibold">{currentMargenPct}% de rentabilidad</p>
        </div>

        {/* Administración — abre modal */}
        <div
          className="rounded-xl border border-violet-200 bg-violet-50 p-4 shadow-card cursor-pointer hover:brightness-95 transition"
          onClick={() => setShowAdmModal(true)}
        >
          <p className="text-[10px] text-violet-500 uppercase tracking-wide font-medium">Administración</p>
          <p className="text-lg font-bold text-violet-700 mt-1">{formatCOPDisplay(currentAdministracion)}</p>
        </div>
      </div>

      {/* Modal Detalle Administración */}
      {showAdmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowAdmModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 max-h-[85vh] flex flex-col"
            onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="px-6 pt-6 pb-4 border-b border-steel-100 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-steel-800">Discriminación de los Costos de Administración</h3>
                  <p className="text-[11px] text-steel-400 mt-0.5">Fuente: Detallado caso de negocio — Admon Patios · Duración: 12 meses</p>
                </div>
                <button onClick={() => setShowAdmModal(false)}
                  className="text-steel-400 hover:text-steel-700 transition text-xl font-bold leading-none ml-4">✕</button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg bg-violet-50 border border-violet-100 px-3 py-2">
                  <p className="text-[9px] text-violet-500 uppercase font-semibold">Total Administración</p>
                  <p className="text-sm font-black text-violet-700">{formatCOPDisplay(totalAdministracion)}</p>
                </div>
                <div className="rounded-lg bg-steel-50 border border-steel-100 px-3 py-2">
                  <p className="text-[9px] text-steel-400 uppercase font-semibold">Costo Directo</p>
                  <p className="text-sm font-bold text-steel-700">{formatCOPDisplay(32203423966)}</p>
                </div>
                <div className="rounded-lg bg-steel-50 border border-steel-100 px-3 py-2">
                  <p className="text-[9px] text-steel-400 uppercase font-semibold">Relación CI/CD</p>
                  <p className="text-sm font-bold text-steel-700">7.59%</p>
                </div>
                <div className="rounded-lg bg-steel-50 border border-steel-100 px-3 py-2">
                  <p className="text-[9px] text-steel-400 uppercase font-semibold">AIU Calculado</p>
                  <p className="text-sm font-bold text-steel-700">17%</p>
                </div>
              </div>
            </div>
            {/* Table body — scrollable */}
            <div className="overflow-y-auto flex-1 px-6 py-4">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="bg-violet-900 text-white">
                    <th className="px-3 py-2 text-left font-semibold w-[8%]">Item</th>
                    <th className="px-3 py-2 text-left font-semibold w-[42%]">Descripción</th>
                    <th className="px-3 py-2 text-center font-semibold w-[10%]">Unidad</th>
                    <th className="px-3 py-2 text-center font-semibold w-[8%]">Cant.</th>
                    <th className="px-3 py-2 text-right font-semibold w-[16%]">Vr. Unitario</th>
                    <th className="px-3 py-2 text-right font-semibold w-[16%]">Vr. Parcial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {/* ── 1. PRESENTACIÓN DE OFERTA ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">1.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>COSTO DE PRESENTACIÓN DE LA OFERTA</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(23662693)}</td>
                  </tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">1.1</td><td className="px-3 py-1.5 text-steel-700">Costo de elaboración de la oferta</td><td className="px-3 py-1.5 text-center text-steel-400">Sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(494700)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(494700)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">1.2</td><td className="px-3 py-1.5 text-steel-700">Garantía de Seriedad de la oferta</td><td className="px-3 py-1.5 text-center text-steel-400">Sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(23167993)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(23167993)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">1.3</td><td className="px-3 py-1.5 text-steel-700">Papelería</td><td className="px-3 py-1.5 text-center text-steel-400">Sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">—</td><td className="px-3 py-1.5 text-right font-semibold text-steel-300">—</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">1.4</td><td className="px-3 py-1.5 text-steel-700">Envío</td><td className="px-3 py-1.5 text-center text-steel-400">Sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">—</td><td className="px-3 py-1.5 text-right font-semibold text-steel-300">—</td></tr>

                  {/* ── 2. PÓLIZAS ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">2.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>PÓLIZAS</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(296582052)}</td>
                  </tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.1</td><td className="px-3 py-1.5 text-steel-700">Póliza de Garantía de Cumplimiento</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(13329530)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(13329530)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.2</td><td className="px-3 py-1.5 text-steel-700">Póliza de Garantía del Anticipo</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(15233749)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(15233749)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.3</td><td className="px-3 py-1.5 text-steel-700">Póliza de pago de salarios</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(46177302)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(46177302)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.4</td><td className="px-3 py-1.5 text-steel-700">Póliza calidad de los bienes</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(69186610)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(69186610)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.6</td><td className="px-3 py-1.5 text-steel-700">Póliza calidad y correcto funcionamiento</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(69186610)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(69186610)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.8</td><td className="px-3 py-1.5 text-steel-700">Póliza estabilidad de obra</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(69186610)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(69186610)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">2.9</td><td className="px-3 py-1.5 text-steel-700">Póliza de RC PLO</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(14281640)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(14281640)}</td></tr>

                  {/* ── 3. PERSONAL DE OBRA ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">3.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>PERSONAL DE OBRA</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(1337888838)}</td>
                  </tr>
                  {/* 3.1 Salarios */}
                  <tr className="bg-steel-50"><td className="px-3 py-1.5 text-steel-500 font-semibold">3.1</td><td className="px-3 py-1.5 text-steel-600 font-semibold" colSpan={3}>Personal (Salarios + Prestaciones)</td><td /><td className="px-3 py-1.5 text-right font-semibold text-steel-600">{formatCOPDisplay(1327988838)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.1</td><td className="px-3 py-1.5 text-steel-700">Coordinador de obra</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(22950000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(275400000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.2</td><td className="px-3 py-1.5 text-steel-700">Director de obra (×4)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">4</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(11615535)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(557545670)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.3</td><td className="px-3 py-1.5 text-steel-700">Residente (×2)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">2</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(7004144)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(168099451)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.4</td><td className="px-3 py-1.5 text-steel-700">Residente Administrativo</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(6962724)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(83552688)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.5</td><td className="px-3 py-1.5 text-steel-700">Supervisor (×2)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">2</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(3603150)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(86475600)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.6</td><td className="px-3 py-1.5 text-steel-700">Seguridad Industrial</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(3615918)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(43391014)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.7</td><td className="px-3 py-1.5 text-steel-700">Almacenista</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(2648956)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(31787476)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.8</td><td className="px-3 py-1.5 text-steel-700">Auxiliar Almacén</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(2596353)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(31156241)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">3.1.9</td><td className="px-3 py-1.5 text-steel-700">BIM Manager</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(4215058)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(50580698)}</td></tr>
                  {/* 3.5 Otros */}
                  <tr className="bg-steel-50"><td className="px-3 py-1.5 text-steel-500 font-semibold">3.5</td><td className="px-3 py-1.5 text-steel-600 font-semibold" colSpan={3}>Otros (Hidratación)</td><td /><td className="px-3 py-1.5 text-right font-semibold text-steel-600">{formatCOPDisplay(9900000)}</td></tr>

                  {/* ── 4. EQUIPOS ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">4.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>EQUIPOS</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(277213880)}</td>
                  </tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.2</td><td className="px-3 py-1.5 text-steel-700">Andamios colgantes</td><td className="px-3 py-1.5 text-center text-steel-400">día</td><td className="px-3 py-1.5 text-center">360</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(95000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(34200000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.3</td><td className="px-3 py-1.5 text-steel-700">Andamios tubulares</td><td className="px-3 py-1.5 text-center text-steel-400">mes</td><td className="px-3 py-1.5 text-center">12</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(2550000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(30600000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.5</td><td className="px-3 py-1.5 text-steel-700">Taladro lámina (×44.5)</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">44.5</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(528360)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(23512020)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.6</td><td className="px-3 py-1.5 text-steel-700">Escaleras 4-7 peldaños</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">44.5</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(327250)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(14562625)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.7</td><td className="px-3 py-1.5 text-steel-700">Escaleras 8-12 peldaños</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">44.5</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(755650)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(33626425)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.8</td><td className="px-3 py-1.5 text-steel-700">Montacarga</td><td className="px-3 py-1.5 text-center text-steel-400">hora</td><td className="px-3 py-1.5 text-center">180</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(150000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(27000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.9</td><td className="px-3 py-1.5 text-steel-700">Estibadora</td><td className="px-3 py-1.5 text-center text-steel-400">día</td><td className="px-3 py-1.5 text-center">200</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(25000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(5000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.10</td><td className="px-3 py-1.5 text-steel-700">Elevador</td><td className="px-3 py-1.5 text-center text-steel-400">día</td><td className="px-3 py-1.5 text-center">360</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(300000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(108000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">4.4</td><td className="px-3 py-1.5 text-steel-700">Taladro percutor</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(712810)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(712810)}</td></tr>

                  {/* ── 5. SALUD OCUPACIONAL / SST ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">5.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>COSTOS DE SALUD OCUPACIONAL (SST)</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(84668214)}</td>
                  </tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">5.1</td><td className="px-3 py-1.5 text-steel-700">Exámenes médicos de ingreso</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">33</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(129948)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(4288284)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">5.2</td><td className="px-3 py-1.5 text-steel-700">Exámenes médicos de retiro</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">33</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(41650)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(1374450)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">5.3</td><td className="px-3 py-1.5 text-steel-700">Certificación trabajos en altura</td><td className="px-3 py-1.5 text-center text-steel-400">un</td><td className="px-3 py-1.5 text-center">20</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(339150)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(6783000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">5.4–5.21</td><td className="px-3 py-1.5 text-steel-700">EPP, dotación, botiquín y señalización</td><td className="px-3 py-1.5 text-center text-steel-400">vr</td><td className="px-3 py-1.5 text-center">—</td><td className="px-3 py-1.5 text-right text-steel-500">—</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(72222480)}</td></tr>

                  {/* ── 6. OTROS COSTOS GENERALES ── */}
                  <tr className="bg-violet-50 border-t-2 border-violet-200">
                    <td className="px-3 py-2 font-black text-violet-700">6.</td>
                    <td className="px-3 py-2 font-black text-violet-700" colSpan={3}>OTROS COSTOS GENERALES</td>
                    <td />
                    <td className="px-3 py-2 text-right font-bold text-violet-700">{formatCOPDisplay(424713220)}</td>
                  </tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.1</td><td className="px-3 py-1.5 text-steel-700">Montaje y desmonte campamentos</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(1000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(1000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.2</td><td className="px-3 py-1.5 text-steel-700">Dotación de oficinas y campamentos</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(10000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(10000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.3</td><td className="px-3 py-1.5 text-steel-700">Construcción y desmontaje almacén</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(10000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(10000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.4</td><td className="px-3 py-1.5 text-steel-700">Vigilancia almacén obra (×5)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">5</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(2500000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(150000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.5</td><td className="px-3 py-1.5 text-steel-700">Servicios públicos (agua, energía, internet)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">14</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(50000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(8400000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.6–6.7</td><td className="px-3 py-1.5 text-steel-700">Baños portátiles (alquiler + mantenimiento)</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">—</td><td className="px-3 py-1.5 text-right text-steel-500">—</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(11112220)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.8</td><td className="px-3 py-1.5 text-steel-700">Alquiler de contenedores (×6)</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">6</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(1800000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(129600000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.9</td><td className="px-3 py-1.5 text-steel-700">Transporte del contenedor</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">6</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(1563000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(9378000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.11</td><td className="px-3 py-1.5 text-steel-700">Caja menor</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(1000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(12000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.12</td><td className="px-3 py-1.5 text-steel-700">Equipo de cómputo (×2)</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">2</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(15000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(30000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.14</td><td className="px-3 py-1.5 text-steel-700">Equipo REVIT</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(6000000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(6000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.16</td><td className="px-3 py-1.5 text-steel-700">Licencias Software Revit</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(7973000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(7973000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.18</td><td className="px-3 py-1.5 text-steel-700">Logística, envíos de paquetes</td><td className="px-3 py-1.5 text-center text-steel-400">12m</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(2500000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(30000000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.19–6.21</td><td className="px-3 py-1.5 text-steel-700">Aseo, certificaciones, planos as-built</td><td className="px-3 py-1.5 text-center text-steel-400">vr</td><td className="px-3 py-1.5 text-center">—</td><td className="px-3 py-1.5 text-right text-steel-500">—</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(8500000)}</td></tr>
                  <tr className="hover:bg-steel-50/50"><td className="px-3 py-1.5 text-steel-400">6.13</td><td className="px-3 py-1.5 text-steel-700">Impresora</td><td className="px-3 py-1.5 text-center text-steel-400">sg</td><td className="px-3 py-1.5 text-center">1</td><td className="px-3 py-1.5 text-right text-steel-500">{formatCOPDisplay(750000)}</td><td className="px-3 py-1.5 text-right font-semibold">{formatCOPDisplay(750000)}</td></tr>

                  {/* ── TOTAL COSTOS INDIRECTOS ── */}
                  <tr className="bg-violet-900 text-white border-t-2 border-violet-700">
                    <td className="px-3 py-2.5 font-black" colSpan={4}>TOTAL COSTOS INDIRECTOS</td>
                    <td />
                    <td className="px-3 py-2.5 text-right font-black">{formatCOPDisplay(currentAdministracion)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}



      {/* ── Gráfica Estructura General ── */}
      <ChapterBreakdownChart projectId={projectId} />

      {/* ── Clasificación Detallada con IA (Generic Projects) ── */}
        <div className="space-y-6 mt-6">
          {/* AI Parsing Controls Card */}
          <div className="rounded-xl border border-steel-200 bg-white shadow-card p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-steel-800 flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-indigo-500" />
                  Clasificación Detallada con IA
                </h3>
                <p className="text-xs text-steel-400 mt-1">
                  Extrae hasta 200 líneas del presupuesto Excel y las clasifica automáticamente en 4 categorías estándar usando IA.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleParseDetail('venta')}
                  disabled={isParsingVenta || !ventaOK}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                    ventaOK
                      ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] cursor-pointer"
                      : "bg-steel-300 cursor-not-allowed opacity-60"
                  )}
                >
                  {isParsingVenta ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Analizando Venta...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Analizar detalle de Venta con IA
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleParseDetail('costo')}
                  disabled={isParsingCosto || !costoOK}
                  className={clsx(
                    "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition",
                    costoOK
                      ? "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] cursor-pointer"
                      : "bg-steel-300 cursor-not-allowed opacity-60"
                  )}
                >
                  {isParsingCosto ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                      Analizando Costo...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1.5" />
                      Analizar detalle de Costo con IA
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Warning if excels are not validated */}
            {(!ventaOK || !costoOK) && (
              <div className="mt-4 rounded-lg bg-amber-50 border border-amber-200 p-3 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-700">
                  Debes validar primero el Excel de Venta y Costo en la pestaña de <strong>Entregables</strong> para poder ejecutar el análisis de detalle con IA.
                </p>
              </div>
            )}
          </div>

          {/* AI Details Table / Accordion */}
          {aiDetails.length > 0 ? (
            <div className="rounded-xl border border-steel-200 bg-white shadow-card overflow-hidden">
              {/* Tab Selector */}
              <div className="px-6 py-4 border-b border-steel-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-steel-50/50">
                <div>
                  <h3 className="text-base font-bold text-steel-800">Detalle de Líneas Clasificadas</h3>
                  <p className="text-xs text-steel-400 mt-0.5">Muestra el desglose de cada línea original del Excel mapeado por categoría.</p>
                </div>
                <div className="flex bg-steel-100 rounded-lg p-0.5">
                  <button
                    onClick={() => setAiTab('venta')}
                    className={clsx(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition",
                      aiTab === 'venta'
                        ? "bg-white text-indigo-700 shadow-sm"
                        : "text-steel-500 hover:text-steel-700"
                    )}
                  >
                    Venta (Oferta)
                  </button>
                  <button
                    onClick={() => setAiTab('costo')}
                    className={clsx(
                      "px-4 py-1.5 text-xs font-semibold rounded-md transition",
                      aiTab === 'costo'
                        ? "bg-white text-emerald-700 shadow-sm"
                        : "text-steel-500 hover:text-steel-700"
                    )}
                  >
                    Costo
                  </button>
                </div>
              </div>

              {/* Loading indicator */}
              {loadingDetails ? (
                <div className="flex items-center justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary-600 mr-2" />
                  <span className="text-sm text-steel-500 font-medium animate-pulse">Cargando detalles de IA...</span>
                </div>
              ) : (
                <div className="divide-y divide-steel-100">
                  {/* Categorized Sections */}
                  {(['Suministro', 'Mano de Obra', 'Administración', 'Otros'] as const).map(catName => {
                    const items = groupedDetails[catName] || [];
                    const subtotal = items.reduce((s, it) => s + Number(it.valor || 0), 0);
                    const isExpanded = expandedAiGroups.has(catName);
                    
                    // Style config per category
                    const catStyle = {
                      'Suministro': { icon: Package, bg: 'bg-blue-50 text-blue-700', border: 'border-blue-100' },
                      'Mano de Obra': { icon: Users, bg: 'bg-emerald-50 text-emerald-700', border: 'border-emerald-100' },
                      'Administración': { icon: Briefcase, bg: 'bg-purple-50 text-purple-700', border: 'border-purple-100' },
                      'Otros': { icon: FolderOpen, bg: 'bg-amber-50 text-amber-700', border: 'border-amber-100' }
                    }[catName];
                    const IconComponent = catStyle.icon;

                    return (
                      <div key={catName} className="overflow-hidden">
                        {/* Accordion Header */}
                        <button
                          onClick={() => {
                            setExpandedAiGroups(prev => {
                              const next = new Set(prev);
                              if (next.has(catName)) next.delete(catName);
                              else next.add(catName);
                              return next;
                            });
                          }}
                          className="w-full flex items-center justify-between px-6 py-4 hover:bg-steel-50/30 transition text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className={clsx("p-2 rounded-lg", catStyle.bg)}>
                              <IconComponent className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-steel-800">{catName}</h4>
                              <p className="text-[11px] text-steel-400 mt-0.5">{items.length} {items.length === 1 ? 'línea' : 'líneas'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm font-bold text-steel-800 font-mono">
                              {formatCOPDisplay(subtotal)}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-steel-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-steel-400" />
                            )}
                          </div>
                        </button>

                        {/* Accordion Content */}
                        {isExpanded && (
                          <div className="bg-steel-50/20 border-t border-steel-100/50 px-6 py-2">
                            {items.length === 0 ? (
                              <p className="text-xs text-steel-400 italic py-3 pl-10">Ninguna línea clasificada en esta categoría.</p>
                            ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left mb-3">
                                  <thead>
                                    <tr className="border-b border-steel-200/50 text-steel-400 font-semibold uppercase tracking-wider text-[10px]">
                                      <th className="py-2 pl-2 w-[12%]">Fuente Excel</th>
                                      <th className="py-2 w-[65%]">Concepto / Línea original</th>
                                      <th className="py-2 pr-2 text-right w-[23%]">Monto</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-steel-100/30">
                                    {items.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-steel-100/20">
                                        <td className="py-2 pl-2 font-mono text-[10px] text-steel-500 font-semibold">
                                          {item.fuente_excel || '—'}
                                        </td>
                                        <td className="py-2 text-steel-700 pr-4">
                                          {item.concepto}
                                        </td>
                                        <td className="py-2 pr-2 text-right font-semibold text-steel-800 font-mono">
                                          {formatCOPDisplay(Number(item.valor))}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Summary/Validation Status Banner */}
                  <div className="bg-steel-50 px-6 py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-steel-200">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div>
                        <p className="text-[10px] text-steel-400 font-semibold uppercase tracking-wider">Suma Total Detalle IA</p>
                        <p className="text-sm font-bold text-steel-800 font-mono mt-0.5">{formatCOPDisplay(aiDetailsSum)}</p>
                      </div>
                      <div className="hidden sm:block border-l border-steel-200 h-8"></div>
                      <div>
                        <p className="text-[10px] text-steel-400 font-semibold uppercase tracking-wider">Valor Macro de Referencia</p>
                        <p className="text-sm font-bold text-steel-800 font-mono mt-0.5">{formatCOPDisplay(macroRefValue)}</p>
                      </div>
                      <div className="hidden sm:block border-l border-steel-200 h-8"></div>
                      <div>
                        <p className="text-[10px] text-steel-400 font-semibold uppercase tracking-wider">Diferencia</p>
                        <p className={clsx(
                          "text-sm font-bold font-mono mt-0.5",
                          diffPct <= 10 ? "text-emerald-600" : "text-amber-600"
                        )}>
                          {formatCOPDisplay(Math.abs(aiDetailsSum - macroRefValue))} ({diffPct.toFixed(2)}%)
                        </p>
                      </div>
                    </div>

                    <div>
                      {diffPct <= 10 ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700">
                          <CheckCircle className="h-4 w-4" />
                          Validado IA (±10% tolerancia)
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-bold text-amber-700">
                          <AlertTriangle className="h-4 w-4" />
                          Desviado (Supera ±10%)
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-steel-200 bg-steel-50/30 p-12 text-center flex flex-col items-center justify-center">
              <Database className="h-10 w-10 text-steel-400 mb-3" />
              <h4 className="text-sm font-bold text-steel-700">Sin líneas de detalle clasificadas con IA</h4>
              <p className="text-xs text-steel-400 max-w-sm mt-1">
                Haz clic en los botones de arriba para que Claude analice, extraiga y clasifique el detalle del presupuesto Excel por categorías.
              </p>
            </div>
          )}
        </div>

      {/* Tabla Costo vs Venta — agrupada, editable, persistente */}
      <div className="rounded-xl border border-steel-200 bg-white shadow-card overflow-hidden">
        <div className="px-6 py-4 border-b border-steel-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-steel-800">Costo vs Venta</h3>
            <p className="text-[11px] text-steel-400 mt-0.5">Valores editables — los cambios se guardan automáticamente</p>
          </div>
          </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="px-4 py-3 text-left font-semibold text-xs w-[34%]">Capítulo</th>
                <th className="px-4 py-3 text-right font-semibold text-xs w-[22%]">Venta (Oferta)</th>
                <th className="px-4 py-3 text-right font-semibold text-xs w-[22%]">Costo</th>
                <th className="px-4 py-3 text-right font-semibold text-xs w-[14%]">Diferencia</th>
                <th className="px-4 py-3 text-right font-semibold text-xs w-[8%]">Margen %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100">
              {(() => {
                // ── helpers to get current value from state ──
                const allItems = bcData ? bcData.chapters : [];
                const V = (id: string) => cvValues[id]?.venta ?? (allItems.find(i => i.chapter_id === id)?.venta ?? (bcData?.aiu.find(a => a.tipo === id)?.venta ?? 0));
                const C = (id: string) => cvValues[id]?.costo ?? (allItems.find(i => i.chapter_id === id)?.costo ?? (bcData?.aiu.find(a => a.tipo === id)?.costo ?? 0));
                const gv = (id: string) => (bcData?.chapters.filter(g => g.group_id === id) || []).reduce((s, it) => s + V(it.chapter_id), 0);
                const gc = (id: string) => (bcData?.chapters.filter(g => g.group_id === id) || []).reduce((s, it) => s + C(it.chapter_id), 0);

                // ── chapter-level (COSTO DIRECTO PC) ──
                const cdPcV = allItems.reduce((s, it) => s + V(it.id), 0);
                const cdPcC = allItems.reduce((s, it) => s + C(it.id), 0);

                // ── extra items ──
                const ivaCarV = V('iva-cargadores'), ivaCarC = C('iva-cargadores');
                const itsV    = V('its'),             itsC    = C('its');
                const finV    = V('financiacion'),    finC    = C('financiacion');

                // ── AIU chain ──
                const cdTotV = cdPcV + ivaCarV + itsV;
                const cdTotC = cdPcC + ivaCarC + itsC;
                const admV   = V('adm-11'),   admC  = C('adm-11');
                const imprV  = V('imprev-2'), imprC = C('imprev-2');
                const subAIV = cdTotV + admV + imprV;
                const subAIC = cdTotC + admC + imprC;
                const utilV  = V('utilidad-4');
                const ivaUV  = V('ivau-19');

                // ── group totals ──
                const sumV_s = gv('suministro'), sumC_s = gc('suministro');
                const sumV_m = gv('mano-obra'),  sumC_m = gc('mano-obra');
                const tramV  = V('tramites'),    tramC  = C('tramites');
                const compV  = V('comp-reactiva'), compC = C('comp-reactiva');

                // TOTAL SIN FINANCIACIÓN
                const sinFinV = subAIV + utilV + ivaUV;
                const sinFinC = subAIC + C('ivau-19'); // IVA-U aplica igual en ambos lados

                // TOTAL CON FINANCIACIÓN
                const totalV = sinFinV + finV;
                const totalC = sinFinC + finC;

                // ── render helpers ──
                const inp = (id: string, key: 'venta' | 'costo', val: number, tip: string) => {
                  const fkId = id + (key === 'venta' ? '-v' : '-c');
                  return (
                    <input title={tip} type="text"
                      className="w-full text-right text-xs bg-transparent border-b border-dashed border-steel-200 focus:border-primary-400 focus:outline-none py-1 px-1 text-steel-600 focus:text-steel-900"
                      value={focusedCell === fkId ? String(val) : formatCOPDisplay(val)}
                      onFocus={e => { setFocusedCell(fkId); e.target.select(); }}
                      onBlur={() => setFocusedCell(null)}
                      onChange={e => updateCV(id, key, e.target.value)}
                    />
                  );
                };

                const chapRow = (item: { id: string; cap: string }, v: number, c: number) => {
                  const dif = v - c, mgn = v > 0 ? dif / v * 100 : 0;
                  return (
                    <tr key={item.id} className="hover:bg-steel-50/50 transition">
                      <td className="px-4 py-2 pl-8 text-xs text-steel-700">{item.cap}</td>
                      <td className="px-2 py-1">{inp(item.id, 'venta', v, 'Valor de venta — editable')}</td>
                      <td className="px-2 py-1">{inp(item.id, 'costo', c, 'Valor de costo — editable')}</td>
                      <td className={`px-4 py-2 text-right text-xs font-bold ${dif >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        title={`Diferencia = ${formatCOPDisplay(v)} − ${formatCOPDisplay(c)}`}>{formatCOPDisplay(dif)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-bold ${mgn < 0 ? 'text-red-600' : mgn < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{mgn.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                };

                const extraRow = (id: string, label: string, v: number, c: number) => {
                  const dif = v - c, mgn = v > 0 ? dif / v * 100 : 0;
                  return (
                    <tr key={id} className="hover:bg-steel-50/50 transition">
                      <td className="px-4 py-2 pl-8 text-xs text-steel-700">{label}</td>
                      <td className="px-2 py-1">{inp(id, 'venta', v, `${label} — editable`)}</td>
                      <td className="px-2 py-1">{inp(id, 'costo', c, `${label} costo — editable`)}</td>
                      <td className={`px-4 py-2 text-right text-xs font-bold ${dif >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
                        title={`Diferencia = ${formatCOPDisplay(dif)}`}>{formatCOPDisplay(dif)}</td>
                      <td className="px-4 py-2 text-right">
                        <span className={`text-xs font-bold ${mgn < 0 ? 'text-red-600' : mgn < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{mgn.toFixed(1)}%</span>
                      </td>
                    </tr>
                  );
                };

                const grpHdr = (grpId: string, nombre: string, color: string, gV: number, gC: number, tip: string) => {
                  const dif = gV - gC, mgn = gV > 0 ? dif / gV * 100 : 0;
                  const collapsed = collapsedGroups.has(grpId);
                  return (
                    <tr className="border-t-2 cursor-pointer select-none" style={{ borderColor: color + '40', backgroundColor: color + '15' }}
                      onClick={() => toggleGroup(grpId)}>
                      <td className="px-4 py-2.5 text-xs font-black" style={{ color }} title={tip}>
                        <span className="inline-flex items-center gap-1.5">
                          {collapsed
                            ? <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            : <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />}
                          {nombre}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-steel-700">{formatCOPDisplay(gV)}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-steel-700">{formatCOPDisplay(gC)}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${dif >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCOPDisplay(dif)}</td>
                      <td className={`px-4 py-2.5 text-right text-xs font-bold ${mgn < 0 ? 'text-red-600' : mgn < 10 ? 'text-amber-600' : 'text-emerald-600'}`}>{mgn.toFixed(1)}%</td>
                    </tr>
                  );
                };

                const subtotRow = (label: string, v: number, c: number, tipV: string, tipC: string, cls = 'bg-steel-700 text-white') => {
                  const dif = v - c, mgn = v > 0 ? dif / v * 100 : 0;
                  return (
                    <tr className={`${cls} border-t border-opacity-30`}>
                      <td className="px-4 py-2.5 text-xs font-black">{label}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-black" title={tipV}>{formatCOPDisplay(v)}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-black" title={tipC}>{formatCOPDisplay(c)}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-black" style={{ color: dif >= 0 ? '#6ee7b7' : '#fca5a5' }}>{formatCOPDisplay(dif)}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-black" style={{ color: mgn >= 0 ? '#6ee7b7' : '#fca5a5' }}>{mgn.toFixed(1)}%</td>
                    </tr>
                  );
                };

                const suministroGrupoItems = bcData?.chapters.filter(g => g.group_id === 'suministro') || [];
                const manoObraGrupoItems   = bcData?.chapters.filter(g => g.group_id === 'mano-obra') || [];
                const admGrupoItems        = bcData?.chapters.filter(g => g.group_id === 'administracion') || [];
                const interesesGrupoItems  = bcData?.chapters.filter(g => g.group_id === 'intereses') || [];

                return (
                  <>
                    {/* ── SUMINISTRO ── */}
                    {grpHdr('suministro', 'Suministro', '#1b5eab', sumV_s, sumC_s,
                      `= ${suministroGrupoItems.map(i => i.chapter_name).join(' + ')}\n= ${formatCOPDisplay(sumV_s)}`)}
                    {!collapsedGroups.has('suministro') && suministroGrupoItems.map(item => chapRow({ id: item.chapter_id, cap: item.chapter_name }, V(item.chapter_id), C(item.chapter_id)))}

                    {/* ── MANO DE OBRA ── */}
                    {grpHdr('mano-obra', 'Mano de Obra', '#16a34a', sumV_m, sumC_m,
                      `= ${manoObraGrupoItems.map(i => i.chapter_name).join(' + ')}\n= ${formatCOPDisplay(sumV_m)}`)}
                    {!collapsedGroups.has('mano-obra') && manoObraGrupoItems.map(item => chapRow({ id: item.chapter_id, cap: item.chapter_name }, V(item.chapter_id), C(item.chapter_id)))}

                    {/* Trámites y Certificaciones — capítulo independiente */}
                    {admGrupoItems.length > 0 && chapRow({ id: admGrupoItems[0].chapter_id, cap: admGrupoItems[0].chapter_name }, tramV, tramC)}

                    {/* Compensación Reactiva — capítulo independiente */}
                    {interesesGrupoItems.length > 0 && chapRow({ id: interesesGrupoItems[0].chapter_id, cap: interesesGrupoItems[0].chapter_name }, compV, compC)}

                    {/* ── COSTO DIRECTO PC ── */}
                    {subtotRow('COSTO DIRECTO PC', cdPcV, cdPcC,
                      `= Suministro + Mano de Obra + Trámites + Comp. Reactiva\n= ${formatCOPDisplay(sumV_s)} + ${formatCOPDisplay(sumV_m)} + ${formatCOPDisplay(tramV)} + ${formatCOPDisplay(compV)}\n= ${formatCOPDisplay(cdPcV)}`,
                      `= ${formatCOPDisplay(sumC_s)} + ${formatCOPDisplay(sumC_m)} + ${formatCOPDisplay(tramC)} + ${formatCOPDisplay(compC)}\n= ${formatCOPDisplay(cdPcC)}`)}

                    {/* IVA Cargadores — editable */}
                    {extraRow('iva-cargadores', 'IVA Cargadores', ivaCarV, ivaCarC)}

                    {/* ITS — editable */}
                    {extraRow('its', 'ITS', itsV, itsC)}

                    {/* ── COSTO DIRECTO TOTAL ── */}
                    {subtotRow('COSTO DIRECTO TOTAL', cdTotV, cdTotC,
                      `= COSTO DIRECTO PC + IVA Cargadores + ITS\n= ${formatCOPDisplay(cdPcV)} + ${formatCOPDisplay(ivaCarV)} + ${formatCOPDisplay(itsV)}\n= ${formatCOPDisplay(cdTotV)}`,
                      `= ${formatCOPDisplay(cdPcC)} + ${formatCOPDisplay(ivaCarC)} + ${formatCOPDisplay(itsC)}\n= ${formatCOPDisplay(cdTotC)}`)}

                    {/* Administración 11% — editable */}
                    {extraRow('adm-11', 'Administración (11%)', admV, admC)}

                    {/* Imprevistos 2% — editable */}
                    {extraRow('imprev-2', 'Imprevistos (2%)', imprV, imprC)}

                    {/* ── TOTAL CD + ADM + IMPREV ── */}
                    {subtotRow('TOTAL CD + ADM + IMPREV', subAIV, subAIC,
                      `= COSTO DIRECTO TOTAL + Adm 11% + Imprev 2%\n= ${formatCOPDisplay(cdTotV)} + ${formatCOPDisplay(admV)} + ${formatCOPDisplay(imprV)}\n= ${formatCOPDisplay(subAIV)}`,
                      `= ${formatCOPDisplay(cdTotC)} + ${formatCOPDisplay(admC)} + ${formatCOPDisplay(imprC)}\n= ${formatCOPDisplay(subAIC)}`)}

                    {/* Utilidad 4% — editable */}
                    {extraRow('utilidad-4', 'Utilidad (4%)', utilV, 0)}

                    {/* IVA sobre Utilidad 19% — editable */}
                    {extraRow('ivau-19', 'IVA sobre Utilidad (19%)', ivaUV, V('ivau-19'))}

                    {/* ── TOTAL SIN FINANCIACIÓN ── */}
                    {subtotRow('TOTAL SIN FINANCIACIÓN', sinFinV, sinFinC,
                      `= TOTAL CD+ADM+IMPREV + Utilidad + IVA-U\n= ${formatCOPDisplay(subAIV)} + ${formatCOPDisplay(utilV)} + ${formatCOPDisplay(ivaUV)}\n= ${formatCOPDisplay(sinFinV)}`,
                      `= ${formatCOPDisplay(subAIC)} + IVA-U ${formatCOPDisplay(ivaUV)}\n= ${formatCOPDisplay(sinFinC)}`)}

                    {/* Financiación 9 meses — editable */}
                    {extraRow('financiacion', 'Financiación 9 meses', finV, finC)}

                    {/* ── TOTAL CON FINANCIACIÓN ── */}
                    <tr className="bg-primary-900 text-white border-t-2 border-primary-700">
                      <td className="px-4 py-3 text-xs font-black"
                        title={`= TOTAL SIN FINANCIACIÓN + Financiación\n= ${formatCOPDisplay(sinFinV)} + ${formatCOPDisplay(finV)}\n= ${formatCOPDisplay(totalV)}`}>
                        TOTAL CON FINANCIACIÓN
                      </td>
                      <td className="px-4 py-3 text-right text-xs font-black"
                        title={`Total Venta = ${formatCOPDisplay(totalV)}`}>{formatCOPDisplay(totalV)}</td>
                      <td className="px-4 py-3 text-right text-xs font-black"
                        title={`Total Costo = ${formatCOPDisplay(totalC)}`}>{formatCOPDisplay(totalC)}</td>
                      <td className="px-4 py-3 text-right text-xs font-black text-emerald-300"
                        title={`Diferencia = ${formatCOPDisplay(totalV)} − ${formatCOPDisplay(totalC)}`}>{formatCOPDisplay(totalV - totalC)}</td>
                      <td className="px-4 py-3 text-right text-xs font-black text-emerald-300"
                        title={`Margen = ${formatCOPDisplay(totalV - totalC)} ÷ ${formatCOPDisplay(totalV)} × 100`}>
                        {totalV > 0 ? ((totalV - totalC) / totalV * 100).toFixed(1) : '0.0'}%
                      </td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>

      </>}

      {/* ── Tab: Entregables ─────────────────────────────────────────────── */}
      {activeTab === 'entregables' && (
        <div className="space-y-5">

          {/* Banner Kick Off del Proyecto - Se muestra si los 5 entregables están cargados */}
          {todosEntregados && lastUpload && (
            <div className="flex items-start gap-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 dark:bg-emerald-950/20 px-5 py-4 shadow-sm animate-fade-in">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <Rocket className="h-5.5 w-5.5" />
              </div>
              <div className="min-w-0 flex-1">
                <h4 className="text-sm font-black text-emerald-800 dark:text-emerald-300">
                  🚀 Estamos listos para el Kick Off del Proyecto
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1 font-medium leading-relaxed">
                  Todos los entregables obligatorios han sido cargados <span className="font-bold">{lastUpload.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' })}</span> exitosamente.
                </p>
              </div>
            </div>
          )}

          {/* Barra de resumen + botón refrescar */}
            <div className="flex items-center gap-3 rounded-xl border border-steel-200 bg-white px-5 py-3 shadow-card">
              <Package className="h-5 w-5 text-primary-600 flex-shrink-0" />
                <div>
                  <p className="text-sm text-steel-600">
                    <span className="font-semibold text-steel-800">{ENTREGABLES_DOCS.filter(d => entregablesMeta[d.id]).length} de {ENTREGABLES_DOCS.length}</span>{' '}
                    documentos cargados en la base de datos
                  </p>
                {lastUpload && (
                  <p className="text-[10px] text-steel-400 mt-0.5">
                    Última carga: {lastUpload.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', timeZone: 'America/Bogota' })} · {lastUpload.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })}
                  </p>
                )}
              </div>
            <div className="ml-auto flex items-center gap-3">
              <div className="flex gap-1">
                {ENTREGABLES_DOCS.map(doc => (
                  <div key={doc.id} title={doc.label}
                    className={`h-2 w-7 rounded-full transition-colors ${entregablesMeta[doc.id] ? 'bg-emerald-400' : 'bg-steel-200'}`}
                  />
                ))}
              </div>
              <div className="h-4 w-px bg-steel-200 mx-1" />
              <button 
                onClick={() => {
                  const event = new CustomEvent('openActivitySidebar', { detail: { module: 'Entregables' } });
                  window.dispatchEvent(event);
                }}
                className="flex items-center gap-1.5 px-2 py-1 text-[10px] font-bold text-primary-600 hover:bg-primary-50 rounded transition"
              >
                <Clock className="h-3 w-3" />
                Historial
              </button>
              <button onClick={loadEntregables} disabled={entregablesLoading}
                className="flex items-center gap-1.5 rounded-lg border border-steel-200 bg-white px-3 py-1.5 text-xs text-steel-500 hover:bg-steel-50 transition disabled:opacity-50">
                <RefreshCw className={`h-3.5 w-3.5 ${entregablesLoading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>

          {/* Lista agrupada */}
          <div className="space-y-4">
            {ENTREGABLE_GROUPS.map((group) => {
              const gc = GROUP_COLORS[group.color];
              const GroupIcon = group.icon;
              const docsInGroup = ENTREGABLES_DOCS.filter(d => d.group === group.id);

              return (
                <div key={group.id} className="overflow-hidden rounded-xl border border-steel-200 bg-white shadow-card">
                  {/* Cabecera del grupo */}
                  <div className={`flex items-center gap-3 border-b px-5 py-3 ${gc.header}`}>
                    <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${gc.iconBg}`}>
                      <GroupIcon className={`h-4 w-4 ${gc.iconText}`} />
                    </div>
                    <span className={`text-sm font-semibold ${gc.headerText}`}>{group.id}</span>
                    <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold ${gc.badge}`}>
                      {docsInGroup.filter(d => entregablesMeta[d.id]).length}/{docsInGroup.length}
                    </span>
                  </div>

                  {/* Filas de documentos */}
                  <div className="divide-y divide-steel-100 dark:divide-steel-800">
                    {docsInGroup.map((doc) => {
                      const meta = entregablesMeta[doc.id];
                      const Icon = doc.icon;
                      const isOver = dragOver === doc.id;
                      const isUploading = uploadingDoc === doc.id;
                      const puedeEditar = ['administrador', 'gerente', 'controller'].includes(user?.role || '');

                      return (
                        <div
                          key={doc.id}
                          onDragOver={(e) => {
                            if (!puedeEditar) return;
                            e.preventDefault();
                            setDragOver(doc.id);
                          }}
                          onDragLeave={() => setDragOver(null)}
                          onDrop={(e) => {
                            if (!puedeEditar) return;
                            e.preventDefault();
                            setDragOver(null);
                            const f = e.dataTransfer.files[0];
                            if (f) handleEntregableUpload(doc.id, f);
                          }}
                          className={clsx(
                            "flex items-center gap-4 px-5 py-4 transition-colors relative",
                            isOver ? "bg-primary-50 dark:bg-primary-950/20" : "hover:bg-steel-50/50 dark:hover:bg-steel-800/10"
                          )}
                        >
                          {/* Ícono del documento: Verde si cargado, Gris si pendiente */}
                          <div className={clsx(
                            "flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl transition-all",
                            meta
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400"
                              : "bg-steel-100 dark:bg-steel-800 text-steel-400 dark:text-steel-500"
                          )}>
                            <Icon className="h-4.5 w-4.5" />
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-steel-800 dark:text-white">{doc.label}</p>
                              {meta && (
                                <span className="inline-flex items-center gap-1 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-bold px-1.5 py-0.5 border border-emerald-200 dark:border-emerald-900/50">
                                  Cargado
                                </span>
                              )}
                            </div>
                            {meta ? (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="text-[11px] text-steel-500 dark:text-steel-400 font-semibold truncate max-w-[250px]" title={meta.filename}>
                                  {meta.filename}
                                </p>
                                <span className="text-[10px] text-steel-400 flex-shrink-0">
                                  · {fmtFileSize(meta.file_size)}
                                  {meta.uploaded_by && (
                                    <span className="ml-1.5 text-steel-500 dark:text-steel-400 font-bold">
                                      · {meta.uploaded_by}
                                    </span>
                                  )}
                                  <span className="ml-1 text-[9px] opacity-70 font-semibold">
                                    ({new Date(meta.uploaded_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Bogota' })})
                                  </span>
                                </span>
                              </div>
                            ) : (
                              <p className="text-[11px] text-steel-400 mt-1 font-medium">
                                Formatos admitidos: <span className="font-mono text-[10px] bg-steel-50 dark:bg-steel-950 border border-steel-200/50 dark:border-steel-800 rounded px-1.5 py-0.5 ml-1 text-steel-500 dark:text-steel-400">{doc.accept.split(',').join(' ')}</span>
                              </p>
                            )}
                          </div>

                          {/* Acciones */}
                          <div className="flex flex-shrink-0 items-center gap-2.5">
                            {isUploading ? (
                              <span className="flex items-center gap-1.5 text-xs text-steel-400 font-semibold">
                                <Loader2 className="h-4 w-4 animate-spin text-primary-500" /> Cargando…
                              </span>
                            ) : meta ? (
                              <>
                                {/* Ver/Descargar archivo - Disponible para todos */}
                                <button
                                  onClick={() => handleEntregableDownload(doc.id)}
                                  className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-primary-700 transition shadow-sm"
                                  title="Descargar y ver archivo entregable"
                                >
                                  <Download className="h-3.5 w-3.5" /> Ver archivo
                                </button>

                                {puedeEditar ? (
                                  <>
                                    {/* Botón especial para importar cronograma al módulo */}
                                    {doc.id === 'cronograma_obra' && _projectId && _projectId !== 'patio-sur-oe1035' && meta && (
                                      <button
                                        onClick={async () => {
                                          // Descargar el archivo existente y re-importar
                                          try {
                                            const res = await apiClient.get(
                                              `/projects/${_projectId}/entregables/cronograma_obra/download`,
                                              { responseType: 'blob' }
                                            );
                                            const file = new File([res.data], meta.filename, { type: res.data.type });
                                            await handleImportarCronograma(_projectId, file);
                                          } catch {
                                            showToast('Error al procesar el cronograma.', 'error');
                                          }
                                        }}
                                        disabled={importandoCronograma}
                                        className="flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-sm disabled:opacity-50"
                                        title="Parsear y cargar el cronograma en el módulo de Cronograma"
                                      >
                                        {importandoCronograma ? (
                                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Importando…</>
                                        ) : (
                                          <><Database className="h-3.5 w-3.5" /> Importar Cronograma</>
                                        )}
                                      </button>
                                    )}
                                    <button
                                      onClick={() => fileInputRefs.current[doc.id]?.click()}
                                      className="flex items-center gap-1.5 rounded-lg border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 px-3 py-1.5 text-xs font-bold text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700 transition shadow-sm"
                                      title="Reemplazar archivo"
                                    >
                                      <Upload className="h-3.5 w-3.5" /> Reemplazar
                                    </button>
                                    <button
                                      onClick={() => handleEntregableRemove(doc.id)}
                                      className="flex items-center gap-1.5 rounded-lg border border-red-200 dark:border-red-900/50 bg-white dark:bg-steel-800 px-2.5 py-1.5 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition shadow-sm"
                                      title="Eliminar entregable"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-800 rounded-lg text-steel-400 dark:text-steel-500 text-xs font-bold select-none">
                                    <Lock className="h-3.5 w-3.5 text-steel-400" />
                                    <span>
                                      Cargado el: {new Date(meta.uploaded_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Bogota' })}
                                    </span>
                                  </div>
                                )}
                              </>
                            ) : (
                              <>
                                {puedeEditar ? (
                                  <button
                                    onClick={() => fileInputRefs.current[doc.id]?.click()}
                                    className={clsx(
                                      "flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold text-white transition shadow-sm",
                                      gc.btn
                                    )}
                                  >
                                    <Upload className="h-3.5 w-3.5" /> Cargar
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-800 rounded-lg text-steel-400 dark:text-steel-500 text-xs font-bold select-none">
                                    <Lock className="h-3.5 w-3.5 text-steel-400" />
                                    <span>Pendiente</span>
                                  </div>
                                )}
                              </>
                            )}
                          </div>

                          {/* Overlay drag */}
                          {puedeEditar && isOver && (
                            <div className="pointer-events-none absolute inset-0 rounded-none border-2 border-dashed border-primary-400 bg-primary-50/60" />
                          )}

                          {/* Input oculto */}
                          <input
                            ref={el => { fileInputRefs.current[doc.id] = el; }}
                            type="file" accept={doc.accept} className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleEntregableUpload(doc.id, f);
                              e.target.value = '';
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota: almacenamiento en BD */}
          <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-3">
            <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-emerald-800">
              <span className="font-semibold">Base de datos MySQL: </span>
              los archivos se almacenan directamente en la BD <span className="font-mono">proyectog</span>, disponibles para todos los usuarios del proyecto.
            </p>
          </div>
        </div>
      )}

      {/* Modal: Carpeta 01 Sincronizada */}
      {showFolder01Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFolder01Modal(false)}>
          <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col overflow-hidden border border-steel-200 dark:border-steel-800"
            onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between bg-steel-50/50 dark:bg-steel-900">
              <div className="flex items-center gap-3">
                <div className="bg-primary-100 dark:bg-primary-900/30 p-2 rounded-xl">
                  <FolderOpen className="h-6 w-6 text-primary-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-steel-900 dark:text-white">Carpeta 01: Caso de Negocio</h3>
                  <p className="text-xs text-steel-400">Documentos sincronizados con el repositorio central</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => document.getElementById('folder-01-upload-modal')?.click()}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
                >
                  <Upload className="h-4 w-4" /> Subir Archivo
                </button>
                <input id="folder-01-upload-modal" type="file" className="hidden" onChange={handleFolder01Upload} />
                <button onClick={() => setShowFolder01Modal(false)} className="text-steel-400 hover:text-steel-600 text-xl font-bold">✕</button>
              </div>
            </div>

            {/* Content Table */}
            <div className="flex-1 overflow-y-auto scrollbar-pcm p-6">
              <div className="rounded-xl border border-steel-200 dark:border-steel-800 bg-white dark:bg-steel-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-steel-50 dark:bg-steel-800/50 text-steel-600 dark:text-steel-400">
                      <th className="px-4 py-3 text-left font-semibold text-xs">Documento</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs">Tipo</th>
                      <th className="px-4 py-3 text-left font-semibold text-xs">Fecha</th>
                      <th className="px-4 py-3 text-center font-semibold text-xs">Estado</th>
                      <th className="px-4 py-3 text-center font-semibold text-xs w-[120px]">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-steel-100 dark:divide-steel-800">
                    {docsFolder01.length > 0 ? (
                      docsFolder01.map((doc) => {
                        const status = statusConfig[doc.status] || statusConfig.approved;
                        return (
                          <tr key={doc.id} className="hover:bg-steel-50/50 dark:hover:bg-steel-800/30 transition-colors">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={clsx(
                                  "p-1.5 rounded-lg",
                                  doc.type === 'PDF' ? "bg-red-50 text-red-500" : "bg-primary-50 text-primary-500"
                                )}>
                                  <FileText className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-steel-800 dark:text-steel-200 text-xs truncate max-w-[300px]">
                                  {doc.name}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-steel-400">{doc.type}</td>
                            <td className="px-4 py-3 text-steel-400 text-[11px]">{doc.uploadDate}</td>
                            <td className="px-4 py-3 text-center">
                              <span className={clsx('rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider', status.color)}>
                                {status.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button onClick={() => handleDocView(doc)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-steel-400 hover:text-primary-600 transition" title="Ver">
                                  <Eye className="h-4 w-4" />
                                </button>
                                <button onClick={() => handleDocDownload(doc)} className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-900/30 text-steel-400 hover:text-primary-600 transition" title="Descargar">
                                  <Download className="h-4 w-4" />
                                </button>
                                <button onClick={() => { if(confirm('¿Eliminar?')) deleteDocGlobal(doc.id, doc.category); }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-steel-400 hover:text-red-600 transition" title="Eliminar">
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-4 py-20 text-center">
                          <div className="flex flex-col items-center gap-3 text-steel-300 dark:text-steel-600">
                            <FolderOpen className="h-16 w-16 opacity-10" />
                            <p className="text-sm font-medium">Esta carpeta está vacía</p>
                            <p className="text-xs max-w-[240px]">Sube el caso de negocio oficial para que esté disponible para todo el equipo.</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-6 py-4 bg-steel-50 dark:bg-steel-900 border-t border-steel-100 dark:border-steel-800 flex items-center gap-3">
              <RefreshCw className="h-4 w-4 text-primary-500 animate-spin-slow" />
              <p className="text-[11px] text-steel-500 dark:text-steel-400">
                <span className="font-bold">Sincronizado:</span> Cualquier cambio aquí se refleja instantáneamente en el módulo global de Documentos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import LYRA */}
      {showImportLyraModal && (
        <ImportLyraModal 
          onConfirm={handleConfirmLyraImport} 
          onCancel={() => {
            setShowImportLyraModal(false);
            setPendingFileLyra(null);
          }} 
        />
      )}

    </div>
  );
}
