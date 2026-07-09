import { useState, useMemo, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import { formatCOP } from '@/utils/formatNumbers';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import {
  Download, AlertTriangle, Wallet,
  ArrowDownRight, ArrowUpRight, Landmark,
  ChevronDown, ChevronRight, Plus, DollarSign,
  Bell, Edit3, Check, X, Users, Briefcase, Package,
  Zap, Target, Calendar,
  Paperclip, FileText, Save, ShieldAlert,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import { ProjectProvider } from '@/contexts/ProjectContext';

import CashFlowChart from '@/components/dashboard/CashFlowChart';
import EgresosMatrixTable from '@/components/dashboard/EgresosMatrixTable';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import {
  useEgresosCategorias,
  totalCategoria,
  REAL_PAGOS_MENSUALES,
  monthLabelToKey,
  formatMonthKey,
} from '@/data/excelCategoriasEgresos';
import HelpButton from '@/components/common/HelpButton';
import { TOTAL_PAGADO_PATIO_SUR, BAC_PATIO_SUR } from '@/constants/patioSur';
import { useDocuments, CATEGORIES_MAP, type DocumentItem } from '@/data/documentsData';
import { FolderOpen, Eye, RefreshCw, Upload, Trash2 } from 'lucide-react';
import clsx from 'clsx';

// ============================================================
// TYPES
// ============================================================
type GroupId = 'materiales' | 'mano_obra' | 'administracion' | 'intereses';

interface PaymentItem {
  id: string;
  proveedor: string;
  concepto: string;
  contratoTotal: number;
  pagado: number;
  porPagar: number;
  grupo: GroupId;
  estado: 'pagado' | 'parcial' | 'pendiente' | 'por_negociar';
  observacion?: string;
  isNominaExterna?: boolean; // items from nomina in observations — toggleable
  incluido: boolean; // whether it's included in the totals
}

interface IncomeEntry {
  id: string;
  label: string;
  monto: number;
  editable: boolean;
  isScenario?: boolean;
  scenarioDate?: string; // Formato: "DD/MM/YYYY"
  incomeMonth?: string;  // Mes donde se aplica el ingreso, ej: "Feb 2026"
}

interface MonthlyPaymentDetail {
  proveedor: string;
  concepto: string;
  categoria: string;
  grupo: GroupId;
  monto: number;
}

interface LoanScenario {
  id: string;
  nombre: string;
  entidad: string;
  desembolso: number;
  tasaIbr: number;
  spreadPorcentaje: number;
  gmfPorcentaje: number;
  comisionPorcentaje: number;
  mesesCredito: number;
  fechaDesembolso: string;
  fechaRepago: string;
  isSaved?: boolean;
  es_proyectado?: boolean;
}

// ============================================================
// REAL DATA — Extracted from "Proyeccion de Pagos Patio Sur (1).xlsx"
// Sheet: "Hoja2" (main projection), "Pagos Patio Sur" (status/payments)
// ============================================================

const INITIAL_ITEMS_PATIO_SUR: PaymentItem[] = [
  // ── MATERIALES ──────────────────────────────────────────────
  { id: 'M01', proveedor: 'Starcharge', concepto: 'Cargadores electricos (importacion)', contratoTotal: 4232468750, pagado: 4231800000, porPagar: 668750, grupo: 'materiales', estado: 'pagado', incluido: true },
  { id: 'M02', proveedor: 'WEG', concepto: 'Transformadores', contratoTotal: 1004389650, pagado: 351500000, porPagar: 652889650, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M03', proveedor: 'MTG', concepto: 'Celdas MT/BT', contratoTotal: 1473080000, pagado: 368300000, porPagar: 1104780000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M04', proveedor: 'IVA Cargadores', concepto: 'IVA importacion cargadores', contratoTotal: 211623438, pagado: 211623438, porPagar: 0, grupo: 'materiales', estado: 'pagado', incluido: true },
  { id: 'M05', proveedor: 'R2F', concepto: 'Obras civiles (contrato final)', contratoTotal: 3100000000, pagado: 491700000, porPagar: 2608300000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M06', proveedor: 'Taesmet', concepto: 'Estructura metalica', contratoTotal: 2043000000, pagado: 810200000, porPagar: 1232800000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M07', proveedor: 'Building Panel', concepto: 'Cubierta', contratoTotal: 502000000, pagado: 0, porPagar: 502000000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M08', proveedor: 'IDC', concepto: 'Perforacion pilotes', contratoTotal: 346600000, pagado: 254200000, porPagar: 92400000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M09', proveedor: 'Prowinch', concepto: 'Brazo movil', contratoTotal: 119800000, pagado: 0, porPagar: 119800000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M10', proveedor: 'P&C Pinturas', concepto: 'Pintura y acabados', contratoTotal: 139000000, pagado: 0, porPagar: 139000000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M11', proveedor: 'Cablecol', concepto: 'Cable MT', contratoTotal: 193800000, pagado: 0, porPagar: 193800000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M12', proveedor: 'Cable BT AC', concepto: 'Cable BT corriente alterna', contratoTotal: 665000000, pagado: 288500000, porPagar: 376500000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M13', proveedor: 'Cablecol', concepto: 'Cable BT DC', contratoTotal: 938200000, pagado: 0, porPagar: 938200000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M14', proveedor: 'Alpa', concepto: 'Bus barras', contratoTotal: 281700000, pagado: 200000000, porPagar: 81700000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M15', proveedor: 'Bandejas', concepto: 'Bandejas portacables', contratoTotal: 250000000, pagado: 0, porPagar: 250000000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M16', proveedor: 'Hidrocol', concepto: 'Pozos capacitivos (sum. + inst.)', contratoTotal: 71400000, pagado: 0, porPagar: 71400000, grupo: 'materiales', estado: 'por_negociar', observacion: 'Pendiente por negociacion', incluido: true },
  { id: 'M17', proveedor: 'LG ITS', concepto: 'Sistema ITS', contratoTotal: 407800000, pagado: 0, porPagar: 407800000, grupo: 'materiales', estado: 'pendiente', incluido: true },
  { id: 'M18', proveedor: 'Det. Incendios', concepto: 'Sistema deteccion incendios', contratoTotal: 227900000, pagado: 0, porPagar: 227900000, grupo: 'materiales', estado: 'pendiente', incluido: true },
  { id: 'M19', proveedor: 'Comunicaciones', concepto: 'Sistema de comunicaciones', contratoTotal: 264800000, pagado: 0, porPagar: 264800000, grupo: 'materiales', estado: 'pendiente', incluido: true },
  { id: 'M20', proveedor: 'Apantallamiento', concepto: 'Sistema apantallamiento', contratoTotal: 186400000, pagado: 0, porPagar: 186400000, grupo: 'materiales', estado: 'pendiente', incluido: true },
  { id: 'M21', proveedor: 'Magnum', concepto: 'Flete + seguro importacion', contratoTotal: 39400000, pagado: 39400000, porPagar: 0, grupo: 'materiales', estado: 'pagado', incluido: true },
  { id: 'M22', proveedor: 'OTM / ZF / Aduana', concepto: 'Logistica aduanera y transporte', contratoTotal: 72700000, pagado: 72700000, porPagar: 0, grupo: 'materiales', estado: 'pagado', incluido: true },
  { id: 'M23', proveedor: 'R2F / Mobile / SICE', concepto: 'Estudios y disenos (paquete)', contratoTotal: 184600000, pagado: 184600000, porPagar: 0, grupo: 'materiales', estado: 'pagado', incluido: true },
  { id: 'M24', proveedor: 'RETIE / PMT / Otros', concepto: 'Tramites y certificaciones', contratoTotal: 40000000, pagado: 5400000, porPagar: 34600000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'M25', proveedor: 'Jesus A. Lozano', concepto: 'Trabajos electricos adicionales', contratoTotal: 40000000, pagado: 20000000, porPagar: 20000000, grupo: 'materiales', estado: 'parcial', incluido: true },
  { id: 'MO01', proveedor: 'PC Mejia', concepto: 'Operativos obra (Mar-Sep 2026)', contratoTotal: 589400000, pagado: 84200000, porPagar: 505200000, grupo: 'mano_obra', estado: 'parcial', observacion: 'Proyeccion $84.2M/mes x 7 meses restantes', incluido: true },
  { id: 'A01', proveedor: 'GIR', concepto: 'Polizas y seguros', contratoTotal: 235100000, pagado: 235100000, porPagar: 0, grupo: 'administracion', estado: 'pagado', incluido: true },
  { id: 'A02', proveedor: 'PC Mejia', concepto: 'Nomina administrativa (Mar-Sep)', contratoTotal: 169400000, pagado: 24200000, porPagar: 145200000, grupo: 'administracion', estado: 'parcial', observacion: 'Proyeccion $24.2M/mes x 7 meses', incluido: true },
  { id: 'A03', proveedor: 'Tecnigrafic', concepto: 'Impresion planos y documentos', contratoTotal: 15000000, pagado: 5000000, porPagar: 10000000, grupo: 'administracion', estado: 'parcial', incluido: true },
  { id: 'A04', proveedor: 'Varios', concepto: 'EPPs y dotacion', contratoTotal: 25000000, pagado: 8000000, porPagar: 17000000, grupo: 'administracion', estado: 'parcial', incluido: true },
  { id: 'A05', proveedor: 'Le Catering', concepto: 'Evento primera piedra', contratoTotal: 12000000, pagado: 12000000, porPagar: 0, grupo: 'administracion', estado: 'pagado', incluido: true },
  { id: 'A06', proveedor: 'Caja Menor', concepto: 'Gastos menores operativos', contratoTotal: 30000000, pagado: 10000000, porPagar: 20000000, grupo: 'administracion', estado: 'parcial', incluido: true },
  { id: 'NE01', proveedor: 'Nomina Externa', concepto: 'Nomina operativa otros proyectos (REPONER)', contratoTotal: 860000000, pagado: 0, porPagar: 860000000, grupo: 'administracion', estado: 'pendiente', observacion: 'Nomina que se pago desde Patio Sur para otros proyectos. Pendiente reposicion.', isNominaExterna: true, incluido: false },
  { id: 'NE02', proveedor: 'Factoring', concepto: 'Factoring pagado desde Patio Sur (REPONER)', contratoTotal: 640000000, pagado: 0, porPagar: 640000000, grupo: 'administracion', estado: 'pendiente', observacion: 'Factoring de otros proyectos cargado a Patio Sur. Pendiente reposicion.', isNominaExterna: true, incluido: false },
];

const cashFlowEntries_PATIO_SUR = [
  { id: '1', project_id: '', year: 2025, month: 10, period_label: 'Oct 2025', projected_income: 0, projected_expense: 0, projected_net: 0, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: false },
  { id: '2', project_id: '', year: 2025, month: 11, period_label: 'Nov 2025', projected_income: 0, projected_expense: 0, projected_net: 0, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: false },
  { id: '3', project_id: '', year: 2025, month: 12, period_label: 'Dic 2025', projected_income: 0, projected_expense: 117756762, projected_net: -117756762, actual_income: 0, actual_expense: 117756762, actual_net: -117756762, is_negative_cash_flow: true },
  { id: '4', project_id: '', year: 2026, month: 1, period_label: 'Ene 2026', projected_income: 0, projected_expense: 0, projected_net: 0, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: false },
  { id: '5', project_id: '', year: 2026, month: 2, period_label: 'Feb 2026', projected_income: 16745324700, projected_expense: 7551845375, projected_net: 9193479325, actual_income: 16745324700, actual_expense: 7551845375, actual_net: 9193479325, is_negative_cash_flow: false },
  { id: '6', project_id: '', year: 2026, month: 3, period_label: 'Mar 2026', projected_income: 0, projected_expense: 1654214247, projected_net: -1654214247, actual_income: 0, actual_expense: 1654214247, actual_net: -1654214247, is_negative_cash_flow: true },
  { id: '7', project_id: '', year: 2026, month: 4, period_label: 'Abr 2026', projected_income: 0, projected_expense: 2089492704, projected_net: -2089492704, actual_income: 0, actual_expense: 393226447, actual_net: -393226447, is_negative_cash_flow: true },
  { id: '8', project_id: '', year: 2026, month: 5, period_label: 'May 2026', projected_income: 0, projected_expense: 2291365898, projected_net: -2291365898, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: true },
  { id: '9', project_id: '', year: 2026, month: 6, period_label: 'Jun 2026', projected_income: 0, projected_expense: 2255074670, projected_net: -2255074670, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: true },
  { id: '10', project_id: '', year: 2026, month: 7, period_label: 'Jul 2026', projected_income: 0, projected_expense: 1653312805, projected_net: -1653312805, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: true },
  { id: '11', project_id: '', year: 2026, month: 8, period_label: 'Ago 2026', projected_income: 0, projected_expense: 1718048404, projected_net: -1718048404, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: true },
  { id: '12', project_id: '', year: 2026, month: 9, period_label: 'Sep 2026', projected_income: 41012884481, projected_expense: 25030151475, projected_net: 15982733006, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: false },
  { id: '13', project_id: '', year: 2026, month: 10, period_label: 'Oct 2026', projected_income: 0, projected_expense: 0, projected_net: 0, actual_income: 0, actual_expense: 0, actual_net: 0, is_negative_cash_flow: false },
];

// ============================================================
// HELPERS
// ============================================================


// Alert logic is now handled after the "months" memo to use the same source of truth



// ============================================================
// GROUP CONFIG
// ============================================================
const GROUP_CONFIG: Record<GroupId, { label: string; icon: typeof Package; color: string; bgColor: string; borderColor: string }> = {
  materiales: { label: 'Materiales, Equipos y Obras', icon: Package, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-50 dark:bg-blue-950/30', borderColor: 'border-blue-200 dark:border-blue-800' },
  mano_obra: { label: 'Mano de Obra', icon: Users, color: 'text-emerald-700 dark:text-emerald-300', bgColor: 'bg-emerald-50 dark:bg-emerald-950/30', borderColor: 'border-emerald-200 dark:border-emerald-800' },
  administracion: { label: 'Administracion y Gastos Indirectos', icon: Briefcase, color: 'text-violet-700 dark:text-violet-300', bgColor: 'bg-violet-50 dark:bg-violet-950/30', borderColor: 'border-violet-200 dark:border-violet-800' },
  intereses: { label: 'Intereses y Costos Financieros', icon: Landmark, color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-50 dark:bg-amber-950/30', borderColor: 'border-amber-200 dark:border-amber-800' },
};

// ============================================================
// HELP CONFIG
// ============================================================
const cashFlowHelp = {
  pageTitle: 'Ayuda — Flujo de Caja',
  description:
    'Proyeccion mensual de movimientos de efectivo del proyecto Patio de Operacion Sur. ' +
    'Permite visualizar ingresos vs egresos, simular escenarios de liquidez, gestionar credito puente y controlar pagos por categoria.',
  sections: [
    {
      title: 'Grupos de Pago',
      items: [
        { icon: '📦', label: 'Materiales, Equipos y Obras', description: 'Cargadores 450 kW, transformadores, celdas MT/BT, obra civil, redes electricas, software SCADA y demas suministros fisicos del proyecto.' },
        { icon: '👷', label: 'Mano de Obra', description: 'Ingenieros residentes, personal tecnico, interventoria y cuadrillas de instalacion y montaje electrico.' },
        { icon: '🗂️', label: 'Administracion y Gastos Indirectos', description: 'Polizas, seguros, tramites ante Codensa/IDU/Alcaldia, gastos de oficina, transporte y honorarios de gerencia.' },
        { icon: '↔️', label: 'Mover entre grupos', description: 'Cada item tiene un selector de grupo. Cambie la asignacion para reclasificar un costo sin eliminarlo.' },
      ],
    },
    {
      title: 'Estados de Pago',
      items: [
        { color: '#16A34A', label: 'Pagado', description: 'El pago fue procesado y registrado. El monto "Por Pagar" es cero.' },
        { color: '#D97706', label: 'Parcial', description: 'Se realizo un pago parcial. Quedan saldos pendientes reflejados en amarillo.' },
        { color: '#DC2626', label: 'Pendiente', description: 'Sin ningun pago realizado aun.' },
        { color: '#CA8A04', label: 'Por negociar', description: 'Contrato o monto en proceso de negociacion. Los valores pueden cambiar.' },
      ],
    },
    {
      title: 'Inyecciones de Capital (Deuda Interna)',
      items: [
        { icon: '💰', label: 'Ingreso inicial', description: 'Primer ingreso real del proyecto. Este valor es editable para reflejar ajustes o retenciones.' },
        { icon: '📅', label: 'Periodo de inyeccion', description: 'Al agregar una inyección de capital (deuda interna), seleccione el mes en el que se espera recibir el flujo.' },
        { icon: '➕', label: 'Agregar inyección', description: 'Simule una inyección de capital futura: defina el monto y el periodo. El sistema recalcula automaticamente el flujo de caja y las alertas.' },
        { icon: '🗑️', label: 'Eliminar inyección', description: 'Borre registros de deuda interna que ya no applyiquen.' },
      ],
    },
    {
      title: 'Credito Puente',
      items: [
        { icon: '🏦', label: 'Desembolso', description: 'Monto del credito bancario solicitado para cubrir el desfase entre pagos a proveedores e ingresos del cliente. Por defecto $17.000M.' },
        { icon: '📈', label: 'Tasa de interes', description: 'Tasa efectiva anual del credito. Actualmente 13.66% EA. Modifique para comparar escenarios financieros.' },
        { icon: '🧾', label: 'GMF y Comision', description: 'Gravamen al Movimiento Financiero (0.395%) y comision de desembolso (1.1%) aplicadas al credito.' },
        { icon: '🗓️', label: 'Meses de credito', description: 'Plazo del credito en meses. Afecta el calculo del costo financiero total y el impacto sobre el margen del proyecto.' },
      ],
    },
    {
      title: 'Graficas y Alertas',
      items: [
        { icon: '📊', label: 'Grafica de flujo', description: 'Barras agrupadas de Ingresos vs Egresos por mes, con linea de saldo acumulado. Los meses con ingreso de capital se resaltan en verde.' },
        { icon: '👷', label: 'Nomina Externa', description: 'Items de nomina/factoring de otros proyectos cargados a Patio Sur. Use el boton +/- para incluirlos o excluirlos del total de egresos.' },
        { icon: '🔔', label: 'Alertas de liquidez', description: 'El sistema detecta automaticamente cuando los fondos disponibles no cubren los pagos pendientes y genera una alerta con la brecha de liquidez.' },
        { icon: '📋', label: 'Detalle mensual', description: 'Haga clic en cualquier barra de la grafica para ver el desglose de pagos programados para ese mes por proveedor y concepto.' },
      ],
    },
  ],
};

// ============================================================
// FORMAT HELPERS — Using centralized utilities
// ============================================================
// Use centralized formatting utilities from @/utils/formatNumbers

const SHORT_MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// ============================================================
// COMPONENT
// ============================================================
export default function CashFlowPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate(); // ✅ Declarado al nivel del componente — cumple Rules of Hooks

  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    const monthsAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return `${monthsAbbr[now.getMonth()]} ${now.getFullYear()}`;
  }, []);

  const [viewMode, setViewMode] = useState<'csn' | 'sandbox'>('csn');
  const isReadOnly = viewMode === 'csn';

  // ── Server-side persistence helpers ──
  const savePref = (key: string, data: unknown) => {
    if (viewMode === 'csn') return; // NUNCA guardamos en modo CSN, es oficial y solo lectura
    // En modo sandbox, nos aseguramos de que la key termine en _sandbox
    const baseKey = key.startsWith(projectId) ? key : `${projectId}_${key}`;
    const prefKey = baseKey.endsWith('_sandbox') ? baseKey : `${baseKey}_sandbox`;
    fetch(`/api/v1/preferences/${prefKey}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(() => {});
  };

  const DEFAULT_INCOMES: IncomeEntry[] = [];
  // ✅ CORREGIDO: desembolso=0 por defecto. Para Patio Sur se restaura en useEffect.
  const DEFAULT_CREDIT = {
    desembolso: 0,
    tasaIbr: 10.531,
    spreadPorcentaje: 2.85,
    gmfPorcentaje: 0.395,
    comisionPorcentaje: 1.1,
    mesesCredito: 12,
    es_proyectado: false,
  };
  const PATIO_SUR_CREDIT = {
    desembolso: 17000000000,
    tasaIbr: 10.531,
    spreadPorcentaje: 2.85,
    gmfPorcentaje: 0.395,
    comisionPorcentaje: 1.1,
    mesesCredito: 12,
    es_proyectado: false,
  };

  // ── Payment items state ──
  const [items, setItems] = useState<PaymentItem[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>(DEFAULT_INCOMES);
  const [creditParams, setCreditParams] = useState(DEFAULT_CREDIT);
  const [totalPagado, setTotalPagado] = useState<number>(0); // ✅ CORREGIDO: 0 por defecto; se carga desde API/prefs o constante PS si isPatioSur
  const [costoFacturado, setCostoFacturado] = useState<number>(0);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // ── Persistencia: servidor + localStorage como respaldo ──
  const LS_ITEMS_KEY = viewMode === 'csn' ? `${projectId}_cashflow_items` : `${projectId}_cashflow_items_sandbox`;
  const LS_INCOMES_KEY = viewMode === 'csn' ? `${projectId}_cashflow_incomes` : `${projectId}_cashflow_incomes_sandbox`;
  const LS_CREDIT_KEY = viewMode === 'csn' ? `${projectId}_cashflow_credit` : `${projectId}_cashflow_credit_sandbox`;
  const LS_LOAN_SCENARIOS_KEY = viewMode === 'csn' ? `${projectId}_loan_scenarios` : `${projectId}_loan_scenarios_sandbox`;

  const isPatioSur = useMemo(() => {
    const norm = projectId.toLowerCase().replace(/[\s-]/g, '');
    return norm === 'patiosuroe1035' || norm === 'oe1035' || projectId === 'patio-sur-oe1035';
  }, [projectId]);
  const initialItemsBase = isPatioSur ? INITIAL_ITEMS_PATIO_SUR : [];

  // Load preferences: intenta servidor primero, luego localStorage
  useEffect(() => {
    const suffix = viewMode === 'csn' ? '' : '_sandbox';
    Promise.all([
      fetch(`/api/v1/preferences/${projectId}_payment_items${suffix}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/preferences/${projectId}_incomes${suffix}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/preferences/${projectId}_credit_params${suffix}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/v1/preferences/${projectId}_loan_scenarios${suffix}`).then(r => r.ok ? r.json() : null).catch(() => null),
      // Legacy legacy (solo sirve para cargar fallback del CSN, en sandbox no importa)
      fetch('/api/v1/preferences/payment_items').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/preferences/incomes').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/preferences/credit_params').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/api/v1/preferences/loan_scenarios').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([savedItems, savedIncomes, savedCredit, savedLoanScenarios, legacyItems, legacyIncomes, legacyCredit, legacyLoanScenarios]) => {
      // Items: prefijo > legacy (solo PS) > localStorage > default
      const itemsData = savedItems || (isPatioSur ? legacyItems : null) || (() => { 
        try { 
          const s = localStorage.getItem(LS_ITEMS_KEY); 
          // Migración para Patio Sur
          if (!s && isPatioSur) {
            const old = localStorage.getItem('patio_sur_cashflow_items');
            if (old) { localStorage.setItem(LS_ITEMS_KEY, old); return JSON.parse(old); }
          }
          return s ? JSON.parse(s) : null; 
        } catch { return null; } 
      })();
      
      if (itemsData && Array.isArray(itemsData) && itemsData.length > 0) {
        setItems(initialItemsBase.map(base => {
          const s = itemsData.find((p: { id: string }) => p.id === base.id);
          return s ? { ...base, grupo: s.grupo, incluido: s.incluido } : base;
        }));
      } else {
        setItems(initialItemsBase);
      }

      // Incomes: prefijo > legacy (solo PS) > localStorage > default
      const incomesData = savedIncomes || (isPatioSur ? legacyIncomes : null) || (() => { 
        try { 
          const s = localStorage.getItem(LS_INCOMES_KEY); 
          if (!s && isPatioSur) {
            const old = localStorage.getItem('patio_sur_cashflow_incomes');
            if (old) { localStorage.setItem(LS_INCOMES_KEY, old); return JSON.parse(old); }
          }
          return s ? JSON.parse(s) : null; 
        } catch { return null; } 
      })();
      
      if (incomesData && Array.isArray(incomesData)) {
        setIncomes(incomesData);
      } else {
        setIncomes(DEFAULT_INCOMES);
      }

      // Credit: prefijo > legacy (solo PS) > localStorage > default
      const creditData = savedCredit || (isPatioSur ? legacyCredit : null) || (() => { 
        try { 
          const s = localStorage.getItem(LS_CREDIT_KEY); 
          if (!s && isPatioSur) {
            const old = localStorage.getItem('patio_sur_cashflow_credit');
            if (old) { localStorage.setItem(LS_CREDIT_KEY, old); return JSON.parse(old); }
          }
          return s ? JSON.parse(s) : null; 
        } catch { return null; } 
      })();
      
      if (creditData && typeof creditData === 'object' && creditData.desembolso !== undefined) {
        // If it's Patio Sur and the loaded disbursement is 0, it's likely a bug from a failed ID check. Fallback to default.
        if (isPatioSur && creditData.desembolso === 0) {
          setCreditParams(DEFAULT_CREDIT);
        } else {
          setCreditParams({ ...DEFAULT_CREDIT, ...creditData });
        }
      } else {
        // ✅ CORREGIDO: solo Patio Sur usa el crédito puente por defecto
        setCreditParams(isPatioSur ? PATIO_SUR_CREDIT : DEFAULT_CREDIT);
      }

      // Loan Scenarios: prefijo > legacy (solo PS) > localStorage
      const loanScenariosData = savedLoanScenarios || (isPatioSur ? legacyLoanScenarios : null) || (() => { 
        try { 
          const s = localStorage.getItem(LS_LOAN_SCENARIOS_KEY);
          if (!s && isPatioSur) {
            const old = localStorage.getItem('patio_sur_cashflow_loan_scenarios');
            if (old) { localStorage.setItem(LS_LOAN_SCENARIOS_KEY, old); return JSON.parse(old); }
          }
           return s ? JSON.parse(s) : null; 
        } catch { return null; } 
      })();
      
      if (loanScenariosData && Array.isArray(loanScenariosData)) {
        setLoanScenarios(loanScenariosData);
      }

      // Total Pagado Override: servidor > localStorage > constant
      const totalPagadoData = (() => {
        try {
          const s = localStorage.getItem(`${projectId}_total_pagado`);
          return s ? parseFloat(s) : null;
        } catch { return null; }
      })();
      
      fetch(`/api/v1/preferences/${projectId}_total_pagado`)
        .then(r => r.ok ? r.json() : null)
        .then(saved => {
          if (saved !== null && typeof saved === 'number') {
            setTotalPagado(saved);
          } else if (totalPagadoData !== null) {
            setTotalPagado(totalPagadoData);
          }
        }).catch(() => {
          if (totalPagadoData !== null) setTotalPagado(totalPagadoData);
          // ✅ CORREGIDO: si no hay dato guardado y es Patio Sur, usar constante oficial
          else if (isPatioSur) setTotalPagado(TOTAL_PAGADO_PATIO_SUR);
        });

      // Cargar costos reales desde MySQL (Fuente de verdad definitiva)
      projectsApi.getById(projectId)
        .then(p => {
          if (p) {
            if (Number(p.costo_pagado) > 0) setTotalPagado(Number(p.costo_pagado));
            setCostoFacturado(Number(p.costo_facturado) || 0);
          }
        }).catch(() => {});

      setPrefsLoaded(true);
    });
  }, [projectId, viewMode]); // Dependemos de viewMode para recargar

  // Save to server + localStorage whenever state changes (skip initial load)
  useEffect(() => {
    if (!prefsLoaded || viewMode === 'csn') return;
    const data = items.map(i => ({ id: i.id, grupo: i.grupo, incluido: i.incluido }));
    savePref('payment_items_sandbox', data);
    localStorage.setItem(LS_ITEMS_KEY, JSON.stringify(data));
  }, [items, prefsLoaded, viewMode]);

  useEffect(() => {
    if (!prefsLoaded || viewMode === 'csn') return;
    savePref('incomes_sandbox', incomes);
    localStorage.setItem(LS_INCOMES_KEY, JSON.stringify(incomes));
  }, [incomes, prefsLoaded, viewMode]);

  useEffect(() => {
    if (!prefsLoaded || viewMode === 'csn') return;
    savePref('credit_params_sandbox', creditParams);
    localStorage.setItem(LS_CREDIT_KEY, JSON.stringify(creditParams));
  }, [creditParams, prefsLoaded, viewMode]);

  const [isEditingTotalPagado, setIsEditingTotalPagado] = useState(false);
  const [tempTotalPagado, setTempTotalPagado] = useState('');

  const handleUpdateTotalPagado = () => {
    const val = parseFloat(tempTotalPagado.replace(/[^0-9.]/g, ''));
    if (isNaN(val)) return;
    
    setTotalPagado(val);
    savePref(`${projectId}_total_pagado`, val);
    localStorage.setItem(`${projectId}_total_pagado`, String(val));
    setIsEditingTotalPagado(false);
    
    // Notificar al Dashboard
    window.dispatchEvent(new Event('total_pagado_updated'));
    
    if (user) logEdit(user, 'Flujo de Caja › KPIs', `Actualizó Total Pagado → ${formatCOP(val)}`);
  };

  const [showRealCostsModal, setShowRealCostsModal] = useState(false);
  const [editRealCosts, setEditRealCosts] = useState({ facturado: 0, pagado: 0 });

  const handleSaveRealCosts = async () => {
    if (editRealCosts.facturado < 0 || editRealCosts.pagado < 0) {
      alert("Los valores no pueden ser negativos.");
      return;
    }
    try {
      // @ts-ignore - actualizando API
      await projectsApi.updateRealCosts(projectId, {
        costo_facturado: editRealCosts.facturado,
        costo_pagado: editRealCosts.pagado
      });
      
      setTotalPagado(editRealCosts.pagado);
      setCostoFacturado(editRealCosts.facturado);
      setShowRealCostsModal(false);

      // Notificar al Dashboard
      window.dispatchEvent(new Event('total_pagado_updated'));
      
      if (user) logEdit(user, 'Flujo de Caja › Costos Reales', `Actualizó Costos: Facturado=${formatCOP(editRealCosts.facturado)}, Pagado=${formatCOP(editRealCosts.pagado)}`);
    } catch (error) {
      alert("Error al guardar los costos reales.");
    }
  };

  const [editingIncome, setEditingIncome] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const [showCreditModal, setShowCreditModal] = useState(false);

  // ── Bank documents state ──
  const [bankDocs, setBankDocs] = useState<{ docId: string; name: string; size: number; uploadedAt: string; type: string; previewable: boolean; objectUrl?: string; sharepoint_url?: string }[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [showFolder03Modal, setShowFolder03Modal] = useState(false);

  const { documents, addDocument: addDocGlobal, deleteDocument: deleteDocGlobal } = useDocuments();
  const docsFolder03 = useMemo(() => documents.filter(d => d.category === '03 Aspectos Financieros'), [documents]);

  const handleFolder03Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await addDocGlobal(file, '03 Aspectos Financieros');
      if (user) logEdit(user, 'Flujo de Caja › Carpeta 03', `Subió documento "${file.name}"`);
    }
  };

  const handleDocDownload = (doc: DocumentItem) => {
    const cat = CATEGORIES_MAP[doc.category] || 'otros';
    const link = document.createElement('a');
    link.href = `/api/v1/documents/${cat}/${doc.docId}/download`;
    link.download = doc.name;
    link.click();
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

  const statusColors: Record<string, string> = { };
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ name: string; type: string; objectUrl: string } | null>(null);

  // Scroll lock when previewDoc is active
  useEffect(() => {
    if (previewDoc) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.paddingRight = '';
      document.body.style.overflow = '';
    };
  }, [previewDoc]);

  // ── Loan scenarios array (unlimited) ──
  const [loanScenarios, setLoanScenarios] = useState<LoanScenario[]>([]);

  const calcScenario = (s: LoanScenario) => {
    const tasaFinal = (s.tasaIbr !== undefined ? s.tasaIbr : 10.531) + (s.spreadPorcentaje !== undefined ? s.spreadPorcentaje : 2.85);
    const gmf = s.desembolso * (s.gmfPorcentaje / 100);
    const comision = s.desembolso * (s.comisionPorcentaje / 100);
    const ingresoNeto = s.desembolso - gmf - comision;
    const tasaMensual = Math.pow(1 + tasaFinal / 100, 1 / 12) - 1;
    const interesesTrimestral = s.desembolso * (Math.pow(1 + tasaMensual, 3) - 1);
    const totalIntereses = interesesTrimestral * Math.floor(s.mesesCredito / 3);
    const tasaNominalMensual = tasaMensual * 100;
    return { gmf, comision, ingresoNeto, interesesTrimestral, totalIntereses, tasaNominalMensual };
  };

  const addLoanScenario = () => {
    const n = loanScenarios.length + 2;
    setLoanScenarios(prev => [...prev, {
      id: `esc-${Date.now()}`,
      nombre: `BANCO ${n}`,
      entidad: '',
      desembolso: 10000000000,
      tasaIbr: 10.531,
      spreadPorcentaje: 2.85,
      gmfPorcentaje: 0.395,
      comisionPorcentaje: 1.0,
      mesesCredito: 12,
      fechaDesembolso: 'Feb 2026',
      fechaRepago: 'Feb 2027',
      isSaved: false,
    }]);
  };

  const removeLoanScenario = (id: string) => {
    const updated = loanScenarios.filter(s => s.id !== id);
    setLoanScenarios(updated);
    saveLoanScenarios(updated, true);
  };

  const updateLoanScenario = (id: string, field: string, value: string | number) =>
    setLoanScenarios(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s));

  const saveLoanScenarios = (dataToSave?: LoanScenario[], silent: boolean = false) => {
    const data = dataToSave || loanScenarios;
    savePref('loan_scenarios', data);
    localStorage.setItem(LS_LOAN_SCENARIOS_KEY, JSON.stringify(data));
    if (!silent) {
      alert('Escenarios guardados correctamente ✔️');
    }
  };

  const loadBankDocs = useCallback(async () => {
    if (!projectId) {
      setBankDocs([]);
      return;
    }
    try {
      const res = await fetch(`/api/v1/documents/reportes?project_id=${projectId}`);

      if (!res.ok) throw new Error('list failed');
      const data = await res.json() as Record<string, { filename: string; previewable: boolean; sharepoint_url?: string }>;
      const safeProjectId = projectId.replace(/\//g, '_');
      const prefix = `bank_${safeProjectId}_`;
      const docs = Object.entries(data)
        .filter(([docId]) => docId.startsWith(prefix))
        .map(([docId, meta]) => {
          const ext = (meta.filename.split('.').pop() ?? '').toLowerCase();
          const type = ext === 'pdf'
            ? 'application/pdf'
            : ['png', 'jpg', 'jpeg'].includes(ext)
              ? `image/${ext === 'jpg' ? 'jpeg' : ext}`
              : 'application/octet-stream';
          return {
            docId,
            name: meta.filename,
            size: 0,
            uploadedAt: 'Guardado en servidor',
            type,
            previewable: meta.previewable,
            sharepoint_url: meta.sharepoint_url,
          };
        })
        .sort((a, b) => b.docId.localeCompare(a.docId));
      setBankDocs(docs);
    } catch {
      setUploadError('No se pudieron cargar documentos guardados.');
    }
  }, [projectId]);

  useEffect(() => {
    void loadBankDocs();
  }, [loadBankDocs]);

  // Upload bank document handler
  const handleBankDocUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingDoc(true);
    setUploadError(null);
    if (!projectId) return;
    const results: { docId: string; name: string; size: number; uploadedAt: string; type: string; previewable: boolean; objectUrl?: string; sharepoint_url?: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const objectUrl = URL.createObjectURL(file);
      const safeProjectId = projectId.replace(/\//g, '_');
      const docId = `bank_${safeProjectId}_${Date.now()}_${i}`;
      try {
        const form = new FormData();
        form.append('doc_id', docId);
        form.append('file', file);
        form.append('project_id', projectId);
        const resp = await fetch(`/api/v1/documents/upload/reportes?project_id=${projectId}`, { method: 'POST', body: form });

        if (!resp.ok) throw new Error('upload failed');
        const saved = await resp.json() as { original_name: string; previewable: boolean; sharepoint_url?: string };
        results.push({
          docId,
          name: saved.original_name || file.name,
          size: file.size,
          uploadedAt: new Date().toLocaleString('es-CO'),
          type: file.type || 'application/octet-stream',
          previewable: saved.previewable,
          objectUrl,
          sharepoint_url: saved.sharepoint_url,
        });
      } catch {
        URL.revokeObjectURL(objectUrl);
        setUploadError('No se pudo guardar el archivo en el servidor.');
      }
    }
    setBankDocs(prev => [...results, ...prev]);
    setUploadingDoc(false);
    if (results.length > 0 && user) {
      logEdit(user, 'Flujo de Caja › Documentos Bancarios', `Subió ${results.length} documento(s): ${results.map(r => r.name).join(', ')}`);
    }
    await loadBankDocs();
  }, [projectId, loadBankDocs, user]);

  const removeBankDoc = useCallback(async (docId: string) => {
    if (!window.confirm('¿Seguro que quieres eliminar este documento bancario?')) return;
    const docName = bankDocs.find(d => d.docId === docId)?.name ?? docId;
    try {
      const resp = await fetch(`/api/v1/documents/reportes/${encodeURIComponent(docId)}?project_id=${projectId}`, { method: 'DELETE' });

      if (!resp.ok) throw new Error('delete failed');
      await loadBankDocs();
      if (user) logEdit(user, 'Flujo de Caja › Documentos Bancarios', `Eliminó documento "${docName}"`);
    } catch {
      alert('No se pudo eliminar el documento.');
    }
  }, [loadBankDocs, bankDocs, user]);

  // Modal para crear nuevo escenario
  const [showScenarioModal, setShowScenarioModal] = useState(false);

  // Parámetros del escenario que se está creando (copia de creditParams)
  const [scenarioParams] = useState({
    desembolso: 17000000000,
    tasaIbr: 10.531,
    spreadPorcentaje: 2.85,
    gmfPorcentaje: 0.395,
    comisionPorcentaje: 1.1,
    mesesCredito: 12,
  });

  // Tipo de escenario seleccionado: "inversion" | "capital"
  const [scenarioType, setScenarioType] = useState<"inversion" | "capital">("capital");

  // Monto de capital para escenarios tipo "capital"
  const [scenarioCapitalAmount, setScenarioCapitalAmount] = useState(0);

  // Periodo del escenario (mes/año como "MM/YYYY")
  const [scenarioPeriod, setScenarioPeriod] = useState(() => {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    return `${mm}/${now.getFullYear()}`;
  }); 

  // Action plan expansion state
  const [expandedActions, setExpandedActions] = useState<Record<string, boolean>>({
    prestamo: false,
    estrategias: false,
    monitoreo: false,
  });

  const ingresoRealCalculado = useMemo(() => {
    const gmf = creditParams.desembolso * (creditParams.gmfPorcentaje / 100);
    const comision = creditParams.desembolso * (creditParams.comisionPorcentaje / 100);
    const ingresoNeto = creditParams.desembolso - gmf - comision;

    // Dinamic calculation for the base loan interest (same logic as scenarios)
    const tasaFinal = (creditParams.tasaIbr || 10.531) + (creditParams.spreadPorcentaje || 2.85);
    const tasaMensual = Math.pow(1 + tasaFinal / 100, 1 / 12) - 1;
    const interesesTrimestral = creditParams.desembolso * (Math.pow(1 + tasaMensual, 3) - 1);
    const totalIntereses = interesesTrimestral * Math.floor((creditParams.mesesCredito || 12) / 3);

    return { gmf, comision, ingresoReal: ingresoNeto, interesesTrimestral, totalIntereses };
  }, [creditParams]);

  // ── Cálculo dinámico para escenarios de inversión ──
  const scenarioIngresoCalculado = useMemo(() => {
    const gmf = scenarioParams.desembolso * (scenarioParams.gmfPorcentaje / 100);
    const comision = scenarioParams.desembolso * (scenarioParams.comisionPorcentaje / 100);
    const ingresoReal = scenarioParams.desembolso - gmf - comision;
    return { gmf, comision, ingresoReal };
  }, [scenarioParams]);
  // Mes seleccionado para el ingreso principal (ING-FEB)
  const mainIncomeMonth = useMemo(() => {
    const feb = incomes.find(i => i.id === 'ING-FEB');
    return feb?.incomeMonth || 'Feb 2026';
  }, [incomes]);

  const [egresosCategorias] = useEgresosCategorias(projectId);

  // ── Unified Monthly Data (Single Source of Truth) ──
  const months = useMemo(() => {
    let balance = 0;
    
    // Dynamically build entries based on available data from backend/excel
    const uniqueKeys = new Set<string>();
    egresosCategorias.forEach(c => {
      if (c.valores) Object.keys(c.valores).forEach(k => uniqueKeys.add(k));
    });
    const sortedKeys = Array.from(uniqueKeys).sort();

    const dynamicEntries = sortedKeys.map(key => {
      const period_label = formatMonthKey(key);
      const existing = isPatioSur ? cashFlowEntries_PATIO_SUR.find(e => monthLabelToKey(e.period_label) === key) : null;
      return existing || {
        id: key,
        period_label,
        projected_income: 0,
        projected_expense: 0,
        actual_income: 0,
        actual_expense: 0
      };
    });

    const currentCashFlowEntries = dynamicEntries.length > 0 
      ? dynamicEntries 
      : (isPatioSur ? cashFlowEntries_PATIO_SUR : []);

    const MONTHS = currentCashFlowEntries.map((e) => {
      const key = monthLabelToKey(e.period_label);
      const expenseMaterials = egresosCategorias
        .filter(c => c.grupo === 'materiales')
        .reduce((s, c) => s + (c.valores[key] || 0), 0);

      const expenseLabor = egresosCategorias
        .filter(c => c.grupo === 'mano_obra')
        .reduce((s, c) => s + (c.valores[key] || 0), 0);

      const expenseAdmin = egresosCategorias
        .filter(c => c.grupo === 'administracion')
        .reduce((s, c) => s + (c.valores[key] || 0), 0);

      const expenseIntereses = egresosCategorias
        .filter(c => c.grupo === 'intereses')
        .reduce((s, c) => s + (c.valores[key] || 0), 0);

      const projExpense = expenseMaterials + expenseLabor + expenseAdmin + expenseIntereses;
        
      const tableIncome = egresosCategorias
        .filter(c => ((c.grupo as string) === 'ingreso' || (c.grupo as string) === 'INGRESO'))
        .reduce((s, c) => s + (c.valores[key] || 0), 0);

      const isMatrixIncomeActive = egresosCategorias
        .filter(c => (c.grupo as string) === 'ingreso' || (c.grupo as string) === 'INGRESO')
        .some(c => Object.values(c.valores).some(v => v > 0));

      const realExpense = REAL_PAGOS_MENSUALES[key] || 0;

      // Income Logic (Unified)
      // Prioritize Matrix Table for operational client income as shown in the INGRESO table
      const clientIncome = isMatrixIncomeActive 
        ? tableIncome 
        : (e.actual_income > 0 ? e.actual_income : (e.projected_income || 0));

      const isMainBankMonth = e.period_label === mainIncomeMonth;
      const bankIncomeBase = (isMainBankMonth && !creditParams.es_proyectado) ? ingresoRealCalculado.ingresoReal : 0;
      const bankIncomeScenarios = loanScenarios
        .filter((sc) => sc.fechaDesembolso === e.period_label && !sc.es_proyectado)
        .reduce((s, sc) => s + calcScenario(sc).ingresoNeto, 0);
      const bankIncome = bankIncomeBase + bankIncomeScenarios;

      const capitalIncome = incomes
        .filter(inc => {
          if (!inc.scenarioDate || inc.monto <= 0) return false;
          const [, mm, yyyy] = inc.scenarioDate.split('/').map(Number);
          const abbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          return `${abbr[mm - 1]} ${yyyy}` === e.period_label;
        })
        .reduce((s, inc) => s + inc.monto, 0);

      const baseInterest = (['Mar 2026', 'Jun 2026', 'Sep 2026'].includes(e.period_label) && !creditParams.es_proyectado)
        ? ingresoRealCalculado.totalIntereses / 3
        : 0;

      const scenarioInterests = loanScenarios.reduce((sum, sc) => {
        // Distribuir intereses del escenario en los mismos meses (Mar, Jun, Sep) para mantener consistencia
        if (sc.es_proyectado) return sum;
        const calc = calcScenario(sc);
        const isPaymentMonth = ['Mar 2026', 'Jun 2026', 'Sep 2026'].includes(e.period_label);
        return sum + (isPaymentMonth ? (calc.totalIntereses / 3) : 0);
      }, 0);
      
      const totalBankInterests = baseInterest + scenarioInterests;
      const projectedTotalExpense = (projExpense || e.projected_expense) + totalBankInterests;
      const effectiveExpense = projectedTotalExpense;
      const effectiveIncome = clientIncome + bankIncome + capitalIncome;

      return {
        label: e.period_label,
        expense: effectiveExpense,
        projectedExpense: projectedTotalExpense,
        expenseMaterials,
        expenseLabor,
        expenseAdmin,
        expenseIntereses,
        realExpense,
        bankIncome,
        capitalIncome,
        clientIncome,
        bankInterests: totalBankInterests,
        income: effectiveIncome,
        isReal: realExpense > 0,
      };
    });

    return MONTHS.map((m) => {
      balance = balance + m.income - m.expense;
      const balanceBefore = balance + m.expense - m.income;
      const needsInjection = balance < -0.1;
      const isTight = balance >= 0 && balance < m.expense * 0.5;
      return {
        ...m,
        balanceBefore,
        balanceAfter: balance,
        needsInjection,
        isTight,
        hasIncome: m.bankIncome > 0 || m.capitalIncome > 0,
        hasBankIncome: m.bankIncome > 0,
        hasCapitalIncome: m.capitalIncome > 0,
      };
    });
  }, [isPatioSur, egresosCategorias, incomes, loanScenarios, ingresoRealCalculado, mainIncomeMonth]);

  const chartData = useMemo(() => {
    let cumulativeOperational = 0;
    return months.map(m => {
      // Unfiltered operational values for ALL chart elements (Bars and Lines)
      // This ensures the "Flujo de Caja" chart always shows the full reality.
      const opIncome = m.clientIncome;
      const opExpense = m.expenseMaterials + m.expenseLabor + m.expenseAdmin + (m.expenseIntereses || 0);
      const opNet = opIncome - opExpense;
      cumulativeOperational += opNet;

      return {
        period: m.label,
        income: opIncome,
        expense: opExpense,
        net: opNet,
        accumulated: cumulativeOperational
      };
    });
  }, [months]);

  const fcnCurrentMonth = useMemo(() => {
    const m = months.find(m => m.label === currentMonthLabel);
    return m ? (m.income - m.expense) : 0;
  }, [months, currentMonthLabel]);

  // ── Publicar chartData al Dashboard vía localStorage (fuente única de verdad) ──
  useEffect(() => {
    try {
      const key = `${projectId}_cashflow_chartdata`;
      localStorage.setItem(key, JSON.stringify(chartData));
      // Notificar a otras partes de la app (mismo contexto) que el dato cambió
      window.dispatchEvent(new Event('cashflow_chartdata_updated'));
    } catch { /* ignore */ }
  }, [chartData, projectId]);

  // Detect months needing injection for alerts (Consistent with grid)
  const MONTHS_NEEDING_INJECTION = useMemo(() => 
    months.filter(m => m.needsInjection).map(m => ({
      period: m.label,
      deficit: Math.abs(m.balanceAfter)
    }))
  , [months]);

  // ── Unified Indicators (Derived from months) ──
  // totalPagado ya está declarado como state arriba (línea 261)
  // y se hidrata desde el backend en el useEffect.

  const totalIngresosGlobal = useMemo(() => {
    return months.reduce((s, m) => s + m.income, 0);
  }, [months]);

  const totalContrato = useMemo(
    () => egresosCategorias.reduce((s, c) => s + totalCategoria(c), 0),
    [egresosCategorias],
  );
  
  const totalPorPagar = useMemo(() => Math.max(totalContrato - totalPagado, 0), [totalContrato, totalPagado]);
  const totalIngresosCliente = isPatioSur ? BAC_PATIO_SUR : 0; // ✅ CORREGIDO: solo Patio Sur tiene BAC hardcodeado

  const totalCreditosBancarios = useMemo(() => {
    return months.reduce((s, m) => s + m.bankIncome, 0);
  }, [months]);

  const totalInyeccionesCapital = useMemo(() => {
    return months.reduce((s, m) => s + m.capitalIncome, 0);
  }, [months]);

  const totalDesembolsoGross = useMemo(() => {
    const base = !creditParams.es_proyectado ? creditParams.desembolso : 0;
    const scenarios = loanScenarios.filter(sc => !sc.es_proyectado).reduce((s, sc) => s + (sc.desembolso || 0), 0);
    return base + scenarios;
  }, [creditParams, loanScenarios]);

  const totalInteresesBancarios = useMemo(() => {
    return months.reduce((s, m) => s + m.bankInterests, 0);
  }, [months]);

  const saldoDisponible = useMemo(() => {
    const targetMonth = months.find(m => m.label === currentMonthLabel);
    return targetMonth ? targetMonth.balanceAfter : (totalIngresosGlobal - totalPagado);
  }, [totalIngresosGlobal, totalPagado, months, currentMonthLabel]);
  const brechaFinanciamiento = useMemo(() => totalPorPagar - saldoDisponible, [totalPorPagar, saldoDisponible]);
  const interesesCredito = totalInteresesBancarios;
  const gastosAdicionales = 1500000000;
  void (totalContrato + interesesCredito + gastosAdicionales); // reservado

  // Préstamo interno (ítem A07) — usado en panel de acciones rápidas del render
  const prestamoInterno = items.find(i => i.id === 'A07');

  // ── Publicar costo financiero neto para el gráfico del Dashboard ──
  // Clave FIJA (sin projectId) para evitar desajustes de claves entre páginas
  useEffect(() => {
    try {
      const costoFinancieroNeto = (totalDesembolsoGross + totalInteresesBancarios) - totalCreditosBancarios;
      // Clave fija que ChapterBreakdownChart siempre lee
      localStorage.setItem('patio_sur_intereses_grafico', JSON.stringify(costoFinancieroNeto));
      // Claves legacy (por compatibilidad)
      localStorage.setItem(`${projectId}_costo_financiero_neto`, JSON.stringify(costoFinancieroNeto));
      localStorage.setItem(`${projectId}_costo_financiero_neto_session`, JSON.stringify(costoFinancieroNeto));
      window.dispatchEvent(new Event('cashflow_chartdata_updated'));
    } catch { /* ignore */ }
  }, [projectId, totalDesembolsoGross, totalInteresesBancarios, totalCreditosBancarios]);

  // ── Alerts ──
  const alerts = useMemo(() => {
    const list: { type: 'critical' | 'warning' | 'info'; message: string }[] = [];

    // ALERTA CRITICA: Meses con flujo de caja negativo que requieren inyeccion de capital
    if (MONTHS_NEEDING_INJECTION.length > 0) {
      const firstNeg = MONTHS_NEEDING_INJECTION[0];
      const worstMonth = MONTHS_NEEDING_INJECTION.reduce((max, m) => m.deficit > max.deficit ? m : max);
      list.push({
        type: 'critical',
        message: `FLUJO DE CAJA NEGATIVO desde ${firstNeg.period}. Se requiere inyeccion de capital. Deficit maximo: ${formatCOP(worstMonth.deficit)} en ${worstMonth.period}. Meses afectados: ${MONTHS_NEEDING_INJECTION.map(m => m.period.split(' ')[0]).join(', ')}.`,
      });
    }

    // ALERTA: Prestamo interno pendiente de reintegro
    const prestamoInterno = items.find(i => i.id === 'A07');
    if (prestamoInterno && prestamoInterno.incluido) {
      list.push({
        type: 'warning',
        message: `Prestamo interno de ${formatCOP(prestamoInterno.contratoTotal)} registrado en Feb 2026 (Banco de Occidente). Este egreso impacta significativamente el flujo. Intereses trimestrales de ${formatCOP(552797500)} en Mar, Jun y Sep.`,
      });
    }


    const porNegociar = items.filter((i) => i.incluido && i.estado === 'por_negociar');
    if (porNegociar.length > 0) {
      const totalNeg = porNegociar.reduce((s, i) => s + i.porPagar, 0);
      list.push({
        type: 'warning',
        message: `${porNegociar.length} contratos pendientes por negociacion por ${formatCOP(totalNeg)}. Estos valores pueden cambiar.`,
      });
    }
    const nominaExterna = items.filter((i) => i.isNominaExterna);
    const nominaExcluidaTotal = nominaExterna.filter((i) => !i.incluido).reduce((s, i) => s + i.porPagar, 0);
    if (nominaExcluidaTotal > 0) {
      list.push({
        type: 'info',
        message: `Hay ${formatCOP(nominaExcluidaTotal)} en nomina/factoring externa excluida del calculo. Activelos si la reposicion no se concreta.`,
      });
    }
    if (totalPorPagar > totalIngresosGlobal * 0.6) {
      list.push({
        type: 'warning',
        message: `Los pagos pendientes (${formatCOP(totalPorPagar)}) representan mas del 60% de los ingresos totales. Considere inyecciones de deuda interna adicional.`,
      });
    }
    return list;
  }, [brechaFinanciamiento, items, totalPorPagar, totalIngresosGlobal, MONTHS_NEEDING_INJECTION]);

  const [showAlerts, setShowAlerts] = useState(false);
  const [selectedMonthDetail, setSelectedMonthDetail] = useState<string | null>(null);

  const startEditIncome = (id: string, currentMonto: number) => {
    setEditingIncome(id);
    setEditValue(String(currentMonto));
  };

  const saveIncome = (id: string) => {
    const val = parseFloat(editValue) || 0;
    const income = incomes.find(i => i.id === id);
    setIncomes((prev) => prev.map((i) => (i.id === id ? { ...i, monto: val } : i)));
    setEditingIncome(null);
    if (user && income) logEdit(user, 'Flujo de Caja › Ingresos', `Editó "${income.label}" → ${formatCOP(val)}`);
  };

  const addScenario = () => {
    // Abrir modal en lugar de agregar directamente
    setScenarioType("capital"); // Default a capital
    setScenarioCapitalAmount(0);
    setShowScenarioModal(true);
  };

  const saveScenario = () => {
    const idx = incomes.filter((i) => i.isScenario).length + 1;

    // Determinar el monto según el tipo de escenario
    let scenarioMonto = 0;
    if (scenarioType === "inversion") {
      scenarioMonto = scenarioIngresoCalculado.ingresoReal;
    } else if (scenarioType === "capital") {
      scenarioMonto = scenarioCapitalAmount;
    }

    // Construir fecha "01/MM/YYYY" desde el periodo seleccionado
    const [mm, yyyy] = scenarioPeriod.split('/');
    const dateStr = `01/${mm}/${yyyy}`;

    // Crear nuevo escenario
    const newScenario: IncomeEntry = {
      id: `ING-ESC${Date.now()}`,
      label: `Inyección capital (Deuda interna) ${idx} (${mm}/${yyyy})`,
      monto: scenarioMonto,
      editable: true,
      isScenario: true,
      scenarioDate: dateStr,
    };

    // Agregar a la lista de ingresos
    setIncomes((prev) => [...prev, newScenario]);
    if (user) logEdit(user, 'Flujo de Caja', `Agregó escenario de ingreso (${mm}/${yyyy}) por ${formatCOP(scenarioMonto)}`);

    // Cerrar modal
    setShowScenarioModal(false);
  };

  const removeScenario = (id: string) => {
    const scenario = incomes.find((i) => i.id === id);
    setIncomes((prev) => prev.filter((i) => i.id !== id));
    if (user && scenario) logEdit(user, 'Flujo de Caja', `Eliminó escenario "${scenario.label}"`);
  };


  // ── Dynamic Project Data ──
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
  });

  return (
    <ProjectProvider projectId={projectId}>
      <div className="space-y-6">
      
      {/* ── View Mode Toggle ── */}
      <div className="flex gap-2 p-1 bg-steel-100 dark:bg-steel-800 rounded-lg w-max shadow-inner">
        <button
          onClick={() => setViewMode('csn')}
          className={clsx(
            "px-4 py-2 text-sm font-semibold rounded-md transition",
            viewMode === 'csn' 
              ? "bg-white dark:bg-steel-700 text-steel-900 dark:text-white shadow-sm ring-1 ring-steel-200 dark:ring-steel-600" 
              : "text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-200"
          )}
        >
          Flujo de Caja (CSN)
        </button>
        <button
          onClick={() => setViewMode('sandbox')}
          className={clsx(
            "px-4 py-2 text-sm font-semibold rounded-md transition",
            viewMode === 'sandbox' 
              ? "bg-white dark:bg-steel-700 text-steel-900 dark:text-white shadow-sm ring-1 ring-steel-200 dark:ring-steel-600" 
              : "text-steel-500 hover:text-steel-700 dark:text-steel-400 dark:hover:text-steel-200"
          )}
        >
          Flujo de Caja (Modificable)
        </button>
      </div>

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white">
            Flujo de Caja {viewMode === 'csn' ? '(CSN Oficial)' : '(Simulador)'}
          </h2>
          <p className="text-xs text-steel-400 dark:text-steel-500 mt-1">
            {project?.name || 'Proyecto'} — Proyeccion de pagos, ingresos y escenarios de liquidez
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => setShowFolder03Modal(true)}
            className="flex items-center gap-2 rounded-lg border border-steel-300 bg-white dark:bg-steel-800 px-4 py-2 text-sm font-medium text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700 transition shadow-sm"
          >
            <FolderOpen className="h-4 w-4 text-primary-500" />
            03 Aspectos Financieros
          </button>
          <HelpButton {...cashFlowHelp} />
          <button
            onClick={() => {
              const fn = (window as any).__exportEgresosExcel;
              if (typeof fn === 'function') fn();
              else alert('La tabla de egresos aún no está lista. Intenta de nuevo en un momento.');
            }}
            className="flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:hover:bg-emerald-900/40 px-4 py-2 text-sm font-semibold text-emerald-700 dark:text-emerald-300 transition"
            title="Exporta el flujo de caja con el mismo formato del template FC X Obras"
          >
            <Download className="h-4 w-4" /> Exportar Excel
          </button>
        </div>
      </div>

      {/* ── Cash Flow Chart (Sync with grid) ── */}
      <div id="seccion-grafico-flujo" className="w-full pb-8">
        <CashFlowChart 
          data={chartData} 
          onMonthClick={(month) => {
            // Solo abrir el detalle si hay registros de ingresos o egresos ese mes
            const monthData = months.find(m => m.label === month);
            if (monthData && (monthData.expense > 0 || monthData.income > 0)) {
              setSelectedMonthDetail(month);
            }
          }}
        />
      </div>

      {/* ── Proyección de Egresos por Categoría (Template FC X Obras) ── */}
      <div id="seccion-tabla-egresos" className="pb-8">
        <EgresosMatrixTable projectId={projectId} isReadOnly={isReadOnly} />
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Row 1: Revenue & Capital */}
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Ingresos Cliente (Oferta)</p>
          </div>
          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{formatCOP(totalIngresosCliente)}</p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Valor total de la oferta (BAC)</p>
        </div>

        <div className="rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Landmark className="h-4 w-4 text-blue-500" />
            <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Créditos Bancarios (Neto)</p>
          </div>
          <p className="text-lg font-bold text-blue-700 dark:text-blue-300">{formatCOP(totalCreditosBancarios)}</p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Base + Escenarios bancarios</p>
        </div>

        <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-rose-500" />
            <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Intereses Bancarios</p>
          </div>
          <p className="text-lg font-bold text-rose-700 dark:text-rose-300">{formatCOP(totalInteresesBancarios)}</p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Costo total de créditos</p>
        </div>

        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/30 p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <ShieldAlert className="h-4 w-4 text-indigo-500" />
            <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Total Deuda Bancaria</p>
          </div>
          <p className="text-lg font-bold text-indigo-700 dark:text-indigo-300">{formatCOP(totalDesembolsoGross + totalInteresesBancarios)}</p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Desembolso Bruto + Intereses totales</p>
        </div>

        {/* Row 2: Status & Costs */}
        <div 
          className={clsx("rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 shadow-card group", !isReadOnly && "cursor-pointer")}
          onDoubleClick={() => {
            if (!isReadOnly && (user?.role === 'administrador' || user?.role === 'gerente')) {
              setEditRealCosts({ facturado: costoFacturado, pagado: totalPagado });
              setShowRealCostsModal(true);
            }
          }}
          title={!isReadOnly ? "Doble clic para editar detalle de costos reales" : ""}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4 text-red-500" />
              <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Total Pagado</p>
            </div>
            {(!isReadOnly && (user?.role === 'administrador' || user?.role === 'gerente')) && (
              <Edit3 className="h-3 w-3 text-red-400 opacity-0 group-hover:opacity-100 transition" />
            )}
          </div>
          
          <p className="text-lg font-bold text-red-600 dark:text-red-400">{formatCOP(totalPagado)}</p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Egresos efectivos realizados</p>
        </div>

        <div className={clsx(
          'rounded-xl p-4 shadow-card border-2 transition-all',
          fcnCurrentMonth >= 0 
            ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30' 
            : 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30',
        )}>
          <div className="flex items-center gap-2 mb-1">
            {fcnCurrentMonth >= 0 
              ? <TrendingUp className="h-4 w-4 text-emerald-600" />
              : <TrendingDown className="h-4 w-4 text-red-600" />
            }
            <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-bold">
              FCN ({currentMonthLabel.toUpperCase()})
            </p>
          </div>
          <p className={clsx('text-lg font-black', fcnCurrentMonth >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-400')}>
            {formatCOP(fcnCurrentMonth)}
          </p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">Flujo de Caja Neto del mes actual</p>
        </div>


      </div>

      {/* ── Alerts Button ── */}
      {alerts.length > 0 && (
        <div className="rounded-xl border overflow-hidden shadow-card"
          style={{ borderColor: alerts.some(a => a.type === 'critical') ? '#fca5a5' : '#fcd34d' }}
        >
          {/* Trigger button */}
          <button
            onClick={() => setShowAlerts((v) => !v)}
            className={clsx(
              'w-full flex items-center justify-between px-5 py-3 transition',
              alerts.some(a => a.type === 'critical') ? 'bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/40' : 'bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 dark:hover:bg-amber-900/40',
            )}
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                'flex items-center justify-center w-7 h-7 rounded-full text-xs font-black',
                alerts.some(a => a.type === 'critical') ? 'bg-red-500 text-white' : 'bg-amber-400 text-white',
              )}>
                {alerts.length}
              </div>
              <div className="text-left">
                <p className={clsx(
                  'text-sm font-bold',
                  alerts.some(a => a.type === 'critical') ? 'text-red-700 dark:text-red-300' : 'text-amber-700 dark:text-amber-300',
                )}>
                  {alerts.some(a => a.type === 'critical') ? 'Alertas criticas activas' : 'Alertas activas'}
                </p>
                <p className="text-[10px] text-steel-400 dark:text-steel-500 mt-0.5">
                  {alerts.filter(a => a.type === 'critical').length} critica(s) ·{' '}
                  {alerts.filter(a => a.type === 'warning').length} advertencia(s) ·{' '}
                  {alerts.filter(a => a.type === 'info').length} info
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-steel-400 dark:text-steel-500">{showAlerts ? 'Ocultar' : 'Ver detalle'}</span>
              {showAlerts
                ? <ChevronDown className="h-4 w-4 text-steel-400 dark:text-steel-500" />
                : <ChevronRight className="h-4 w-4 text-steel-400 dark:text-steel-500" />}
            </div>
          </button>

          {/* Alert detail list */}
          {showAlerts && (
            <div className="divide-y divide-steel-100 dark:divide-steel-700 bg-white dark:bg-steel-800">
              {alerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    'flex items-start gap-3 px-5 py-3',
                    alert.type === 'critical' && 'bg-red-50/60 dark:bg-red-950/20',
                    alert.type === 'warning' && 'bg-amber-50/60 dark:bg-amber-950/20',
                    alert.type === 'info' && 'bg-blue-50/60 dark:bg-blue-950/20',
                  )}
                >
                  <div className={clsx(
                    'mt-0.5 flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center',
                    alert.type === 'critical' && 'bg-red-100',
                    alert.type === 'warning' && 'bg-amber-100',
                    alert.type === 'info' && 'bg-blue-100',
                  )}>
                    {alert.type === 'critical'
                      ? <AlertTriangle className="h-3 w-3 text-red-600" />
                      : <Bell className={clsx('h-3 w-3', alert.type === 'warning' ? 'text-amber-600' : 'text-blue-600')} />
                    }
                  </div>
                  <p className={clsx(
                    'text-xs font-medium leading-relaxed',
                    alert.type === 'critical' && 'text-red-700 dark:text-red-300',
                    alert.type === 'warning' && 'text-amber-700 dark:text-amber-300',
                    alert.type === 'info' && 'text-blue-700 dark:text-blue-300',
                  )}>
                    {alert.message}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── BANK CREDIT MANAGEMENT SECTION ── */}
      <div id="seccion-creditos" className="rounded-lg border border-blue-200 dark:border-blue-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-2.5 border-b border-blue-700 bg-gradient-to-r from-blue-600 to-blue-500 dark:from-blue-800 dark:to-blue-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Landmark className="h-4 w-4 text-white flex-shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-white">Gestión de Créditos Bancarios</h3>
              <p className="text-[9px] text-blue-100">
                Banco de Occidente (activo){loanScenarios.length > 0 ? ` + ${loanScenarios.length} escenario(s)` : ' · Agrega escenarios para comparar'}
              </p>
            </div>
          </div>
          {!isReadOnly && (
            <button
              onClick={addLoanScenario}
              className="flex items-center gap-1 text-[9px] font-bold bg-white/20 hover:bg-white/30 text-white rounded px-2 py-1 transition"
            >
              <Plus className="h-3 w-3" />
              Agregar Escenario
            </button>
          )}
        </div>

        {/* Scrollable multi-panel row */}
        <div className="overflow-x-auto bg-blue-50/20 dark:bg-blue-950/10">
          <div className="flex flex-nowrap items-start divide-x divide-blue-100 dark:divide-blue-800 w-full min-w-max">
            {/* ── Banco de Occidente (fixed panel) ── */}
            <div className={clsx(
              "p-4 space-y-3 flex-1 min-w-[300px] max-w-[600px] flex-shrink-0 transition-all duration-300",
              creditParams.es_proyectado ? "border-2 border-dashed border-amber-400 bg-amber-50/10 dark:bg-amber-950/5 opacity-80" : ""
            )}>
              <div className="flex items-center gap-1.5">
                <span className={clsx("w-2.5 h-2.5 rounded-full flex-shrink-0", creditParams.es_proyectado ? "bg-amber-400" : "bg-blue-500")} />
                <p className={clsx(
                  "text-[10px] font-bold uppercase tracking-wide",
                  creditParams.es_proyectado ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-200"
                )}>
                  Banco de Occidente
                </p>
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (isReadOnly) return;
                      const newVal = !creditParams.es_proyectado;
                      setCreditParams(prev => ({ ...prev, es_proyectado: newVal }));
                    }}
                    disabled={isReadOnly}
                    className={clsx(
                      "text-[8px] px-2 py-0.5 rounded font-bold transition",
                      creditParams.es_proyectado 
                        ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                        : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                      isReadOnly && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {creditParams.es_proyectado ? '🟡 PROYECTADO' : '🟢 REAL'}
                  </button>
                  {!isReadOnly && (
                    <button 
                      onClick={() => setShowCreditModal(true)}
                      className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/40 rounded transition text-blue-600 dark:text-blue-300"
                      title="Editar Banco Principal"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {/* KPIs */}
              <div className={clsx("grid grid-cols-2 gap-1.5", creditParams.es_proyectado && "grayscale-[0.5]")}>
                {[
                  { label: 'Desembolsado', val: formatCOP(creditParams.desembolso), sub: 'Bruto', c: 'blue' },
                  { label: 'Neto Recibido', val: formatCOP(ingresoRealCalculado.ingresoReal), sub: '-GMF -COM', c: 'emerald' },
                  { label: 'Intereses Totales', val: formatCOP(ingresoRealCalculado.totalIntereses), sub: 'Periodo completo', c: 'red' },
                  { label: 'Tasa EA', val: `${((creditParams.tasaIbr !== undefined ? creditParams.tasaIbr : 10.531) + (creditParams.spreadPorcentaje !== undefined ? creditParams.spreadPorcentaje : 2.85)).toFixed(3)}%`, sub: `IBR + ${creditParams.spreadPorcentaje !== undefined ? creditParams.spreadPorcentaje : 2.85}%`, c: 'blue' },
                ].map(({ label, val, sub, c }) => (
                  <div key={label} className={`rounded bg-white dark:bg-steel-700 border border-${c}-100 dark:border-steel-600 p-2`}>
                    <p className={`text-[8px] text-${c}-500 font-semibold uppercase`}>{label}</p>
                    <p className={`text-sm font-bold text-${c}-900 dark:text-white`}>{val}</p>
                    <p className={`text-[8px] text-${c}-400`}>{sub}</p>
                  </div>
                ))}
              </div>
              {/* Deductions */}
              <div className="rounded bg-white dark:bg-steel-700 border border-blue-100 dark:border-steel-600 p-2 space-y-1 text-[9px]">
                <div className="flex justify-between"><span className="text-blue-500">Desembolso:</span><span className="font-bold text-blue-900 dark:text-blue-200">{formatCOP(creditParams.desembolso)}</span></div>
                <div className="flex justify-between"><span className="text-blue-500">GMF ({creditParams.gmfPorcentaje}%):</span><span className="font-bold text-red-600 dark:text-red-400">-{formatCOP(ingresoRealCalculado.gmf)}</span></div>
                <div className="flex justify-between"><span className="text-blue-500">Comisión ({creditParams.comisionPorcentaje}%):</span><span className="font-bold text-red-600 dark:text-red-400">-{formatCOP(ingresoRealCalculado.comision)}</span></div>
                <div className="border-t border-blue-100 dark:border-steel-600 pt-1 flex justify-between font-bold text-[10px]">
                  <span className="text-blue-800 dark:text-blue-300">Neto:</span><span className="text-emerald-700 dark:text-emerald-300">{formatCOP(ingresoRealCalculado.ingresoReal)} ✓</span>
                </div>
              </div>
              {/* Interest schedule */}
              <div className="rounded bg-white dark:bg-steel-700 border border-blue-100 dark:border-steel-600 p-2">
                <p className="text-[9px] font-bold text-blue-800 dark:text-blue-300 mb-1.5">📅 Intereses · Total: {formatCOP(ingresoRealCalculado.totalIntereses)}</p>
                <div className="grid grid-cols-3 gap-1">
                  {['Mar 26', 'Jun 26', 'Sep 26'].map(m => (
                    <div key={m} className="text-center bg-blue-50 dark:bg-blue-950/30 rounded p-1.5 border border-blue-100 dark:border-blue-800">
                      <p className="text-[9px] font-bold text-blue-700 dark:text-blue-300">{formatCOP(ingresoRealCalculado.interesesTrimestral)}</p>
                      <p className="text-[7px] text-blue-400 dark:text-blue-500">{m}</p>
                    </div>
                  ))}
                </div>
                <p className="text-[8px] text-blue-600 dark:text-blue-400 mt-1.5 font-semibold">Repago capital: Feb 2027</p>
              </div>
              {/* Status */}
              <div className="rounded bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 px-2 py-1.5">
                <p className="text-[8px] text-emerald-800 dark:text-emerald-300 font-bold">✓ Feb 2026 → Feb 2027 · 3 pagos trimest.</p>
              </div>
            </div>

            {/* ── Dynamic Loan Scenarios ── */}
            {loanScenarios.map((sc, idx) => {
              const calc = calcScenario(sc);
              const colors = ['violet', 'amber', 'teal', 'rose', 'indigo'];
              const c = colors[idx % colors.length];
              return (
                <div key={sc.id} className={clsx(
                  "p-4 space-y-3 flex-1 min-w-[300px] max-w-[600px] flex-shrink-0 transition-all duration-300",
                  sc.es_proyectado ? "border-2 border-dashed border-amber-400 bg-amber-50/10 dark:bg-amber-950/5 opacity-80" : ""
                )}>
                  {/* Header row */}
                  <div className="flex items-center gap-1.5">
                    <span className={clsx("w-2.5 h-2.5 rounded-full flex-shrink-0", sc.es_proyectado ? "bg-amber-400" : `bg-${c}-500`)} />
                    <input
                      className={clsx(
                        "text-[10px] font-bold uppercase tracking-wide bg-transparent border-none focus:outline-none w-full",
                        sc.es_proyectado ? "text-amber-800 dark:text-amber-300" : `text-${c}-800`,
                        sc.isSaved ? "cursor-default pointer-events-none" : ""
                      )}
                      value={sc.nombre}
                      placeholder="NOMBRE DEL BANCO"
                      readOnly={sc.isSaved}
                      onChange={e => updateLoanScenario(sc.id, 'nombre', e.target.value)}
                    />
                    <div className="ml-auto flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          if (isReadOnly) return;
                          const updated = loanScenarios.map(s => s.id === sc.id ? { ...s, es_proyectado: !s.es_proyectado } : s);
                          setLoanScenarios(updated);
                          saveLoanScenarios(updated, true);
                        }}
                        disabled={isReadOnly}
                        className={clsx(
                          "text-[8px] px-2 py-0.5 rounded font-bold transition",
                          sc.es_proyectado 
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200" 
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200",
                          isReadOnly && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        {sc.es_proyectado ? '🟡 PROYECTADO' : '🟢 REAL'}
                      </button>
                      {!isReadOnly && (
                        <>
                          {sc.isSaved ? (
                            <button onClick={() => {
                              const updated = loanScenarios.map(s => s.id === sc.id ? { ...s, isSaved: false } : s);
                              setLoanScenarios(updated);
                              saveLoanScenarios(updated);
                            }} title="Editar escenario" className="text-blue-500 hover:text-blue-700 flex-shrink-0">
                              <Edit3 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button onClick={() => {
                              const updated = loanScenarios.map(s => s.id === sc.id ? { ...s, isSaved: true } : s);
                              setLoanScenarios(updated);
                              saveLoanScenarios(updated);
                            }} title="Guardar modificaciones" className="text-emerald-500 hover:text-emerald-700 flex-shrink-0">
                              <Save className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => removeLoanScenario(sc.id)} title="Eliminar escenario" className="text-red-400 hover:text-red-600 flex-shrink-0">
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Editable inputs */}
                  {!sc.isSaved && (
                    <div className={`rounded bg-white border border-${c}-100 p-2 space-y-1.5`}>
                      <div className="flex justify-between items-center mb-1">
                        <p className={`text-[8px] font-bold text-${c}-700 uppercase`}>Variables del Préstamo</p>
                        <a href="https://www.banrep.gov.co/es/glosario/indicador-bancario-referencia-ibr" target="_blank" rel="noreferrer" className="text-[7px] text-blue-600 hover:text-blue-800 underline font-bold flex items-center">Consultar IBR ↗</a>
                      </div>
                      {[
                        { label: 'Desembolso ($):', field: 'desembolso', type: 'number' },
                        { label: 'IBR (%):', field: 'tasaIbr', type: 'number', step: '0.001' },
                        { label: 'Spread (%):', field: 'spreadPorcentaje', type: 'number', step: '0.01' },
                        { label: 'GMF (%):', field: 'gmfPorcentaje', type: 'number', step: '0.001' },
                        { label: 'Comisión (%):', field: 'comisionPorcentaje', type: 'number', step: '0.01' },
                        { label: 'Plazo (meses):', field: 'mesesCredito', type: 'number' },
                        { label: 'F. Desembolso:', field: 'fechaDesembolso', type: 'month-year', placeholder: '2026' },
                        { label: 'F. Repago:', field: 'fechaRepago', type: 'month-year', placeholder: '2027' },
                      ].map(({ label, field, type, step, placeholder }) => (
                        <div key={field} className="flex items-center gap-1.5">
                          <label className={`text-[8px] text-${c}-600 w-24 flex-shrink-0`}>{label}</label>
                          {type === 'month-year' ? (() => {
                            const valStr = ((sc as any)[field] || 'Feb 2026').toString();
                            const parts = valStr.split(' ');
                            const mes = parts[0] || 'Feb';
                            const anio = parts[1] || '';
                            return (
                              <div className="flex flex-1 gap-1 min-w-0">
                                <select
                                  value={mes}
                                  onChange={e => updateLoanScenario(sc.id, field, `${e.target.value} ${anio}`)}
                                  className={`flex-[2] text-[9px] text-right font-semibold bg-${c}-50 border border-${c}-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-${c}-400 cursor-pointer appearance-none min-w-0`}
                                  style={{ textAlignLast: 'center' }}
                                >
                                  {SHORT_MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                                <input
                                  type="text"
                                  maxLength={4}
                                  placeholder={placeholder}
                                  value={anio}
                                  onChange={e => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    updateLoanScenario(sc.id, field, `${mes} ${val}`);
                                  }}
                                  className={`flex-[1.5] w-8 text-[9px] text-center font-semibold bg-${c}-50 border border-${c}-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-${c}-400 min-w-0`}
                                />
                              </div>
                            );
                          })() : (
                            <input
                              type={type}
                              step={step}
                              placeholder={placeholder}
                              value={(sc as any)[field]}
                              onChange={e => updateLoanScenario(sc.id, field, type === 'number' ? Number(e.target.value) : e.target.value)}
                              className={`flex-1 text-[9px] text-right font-semibold bg-${c}-50 border border-${c}-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-${c}-400 min-w-0`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Auto-calculated KPIs */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Desembolsado', val: formatCOP(sc.desembolso), sub: 'Bruto', co: c },
                      { label: 'Neto Recibido', val: formatCOP(calc.ingresoNeto), sub: '-GMF -COM', co: 'emerald' },
                      { label: 'Intereses Totales', val: formatCOP(calc.totalIntereses), sub: 'Periodo completo', co: 'red' },
                      { label: 'Tasa EA', val: `${((sc.tasaIbr !== undefined ? sc.tasaIbr : 10.531) + (sc.spreadPorcentaje !== undefined ? sc.spreadPorcentaje : 2.85)).toFixed(3)}%`, sub: 'IBR + Spread', co: c },
                    ].map(({ label, val, sub, co }) => (
                      <div key={label} className={clsx("rounded bg-white border p-2", `border-${co}-100`)}>
                        <p className={clsx("text-[8px] font-semibold uppercase", `text-${co}-500`)}>{label}</p>
                        <p className={clsx("text-sm font-bold", sc.es_proyectado ? "text-steel-400 italic" : `text-${co}-900`)}>{val}</p>
                        <p className={clsx("text-[8px]", `text-${co}-400`)}>{sub}</p>
                      </div>
                    ))}
                  </div>

                  {/* Auto-calculated deductions */}
                  <div className={`rounded bg-white border border-${c}-100 p-2 space-y-1 text-[9px]`}>
                    <div className="flex justify-between"><span className={`text-${c}-500`}>Desembolso:</span><span className="font-bold">{formatCOP(sc.desembolso)}</span></div>
                    <div className="flex justify-between"><span className={`text-${c}-500`}>GMF ({sc.gmfPorcentaje}%):</span><span className="font-bold text-red-600">-{formatCOP(calc.gmf)}</span></div>
                    <div className="flex justify-between"><span className={`text-${c}-500`}>Comisión ({sc.comisionPorcentaje}%):</span><span className="font-bold text-red-600">-{formatCOP(calc.comision)}</span></div>
                    <div className={`border-t border-${c}-100 pt-1 flex justify-between font-bold text-[10px]`}>
                      <span>Neto:</span><span className="text-emerald-700">{formatCOP(calc.ingresoNeto)}</span>
                    </div>
                  </div>

                  {/* Interest schedule */}
                  <div className={`rounded bg-white border border-${c}-100 p-2`}>
                    <p className={`text-[9px] font-bold text-${c}-800 mb-1.5`}>📅 Intereses · Total: {formatCOP(calc.totalIntereses)}</p>
                    <div className="grid grid-cols-3 gap-1">
                      {Array.from({ length: Math.min(3, Math.floor(sc.mesesCredito / 3)) }).map((_, i) => (
                        <div key={i} className={`text-center bg-${c}-50 rounded p-1.5 border border-${c}-100`}>
                          <p className={`text-[9px] font-bold text-${c}-700`}>{formatCOP(calc.interesesTrimestral)}</p>
                          <p className={`text-[7px] text-${c}-400`}>Q{i + 1}</p>
                        </div>
                      ))}
                    </div>
                    <p className={`text-[8px] text-${c}-600 mt-1.5 font-semibold`}>Repago: {sc.fechaRepago} · TNA: {calc.tasaNominalMensual.toFixed(3)}%/mes</p>
                  </div>

                  {/* Status */}
                  <div className={`rounded bg-${c}-50 border border-${c}-200 px-2 py-1.5`}>
                    <p className={`text-[8px] text-${c}-800 font-bold`}>📊 {sc.fechaDesembolso} → {sc.fechaRepago} · {sc.entidad || 'Entidad por definir'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Shared Documents Section (bottom, spans all scenarios) ── */}
        <div className="border-t border-blue-200 dark:border-blue-800 bg-white dark:bg-steel-800 p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-blue-600" />
              Documentos Bancarios
              {bankDocs.length > 0 && (
                <span className="ml-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full px-2 py-0.5 text-[8px] font-bold">{bankDocs.length} archivo(s)</span>
              )}
            </p>
            <div className="flex items-center gap-2">
              <span className="text-[8px] bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded px-1.5 py-0.5 font-bold">BD MySQL · proyectog/banco</span>
              <label className={clsx(
                'flex items-center gap-1 rounded border px-2.5 py-1 text-[9px] font-bold cursor-pointer transition',
                (uploadingDoc || isReadOnly) 
                  ? 'border-blue-200 text-blue-300 bg-blue-50 dark:bg-blue-950/20 cursor-not-allowed opacity-50' 
                  : 'border-blue-400 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-900/30',
              )}>
                <input type="file" multiple className="hidden" disabled={uploadingDoc || isReadOnly} onChange={e => handleBankDocUpload(e.target.files)} />
                <Paperclip className="h-3 w-3" />
                {uploadingDoc ? 'Cargando...' : 'Cargar Documentos'}
              </label>
            </div>
          </div>
          {uploadError && <p className="text-[8px] text-red-600 mb-2">⚠ {uploadError}</p>}
          {bankDocs.length === 0 ? (
            <div className="rounded border-2 border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20 py-4 text-center">
              <FileText className="h-6 w-6 text-blue-300 dark:text-blue-600 mx-auto mb-1" />
              <p className="text-[9px] text-blue-400 dark:text-blue-500">Sin documentos cargados · Haz clic en "Cargar Documentos" para agregar</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {bankDocs.map((d, i) => {
                const ext = d.name.split('.').pop()?.toUpperCase() ?? 'DOC';
                const isPdf = d.type === 'application/pdf' || ext === 'PDF';
                const isImg = d.type.startsWith('image/');
                const isXls = ext === 'XLSX' || ext === 'XLS';
                const iconColor = isPdf ? 'text-red-500' : isImg ? 'text-emerald-500' : isXls ? 'text-green-600' : 'text-blue-500';
                const bgColor = isPdf ? 'bg-red-50 border-red-100' : isImg ? 'bg-emerald-50 border-emerald-100' : isXls ? 'bg-green-50 border-green-100' : 'bg-blue-50 border-blue-100';
                const sizeKB = d.size < 1024 * 1024 ? `${(d.size / 1024).toFixed(0)} KB` : `${(d.size / (1024 * 1024)).toFixed(1)} MB`;
                const canPreview = d.previewable || isPdf || isImg;
                return (
                  <div key={i} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        if (d.sharepoint_url) {
                          // Abre directamente en la bóveda de OneDrive
                          window.open(d.sharepoint_url, '_blank');
                        } else if (d.objectUrl && canPreview) {
                          setPreviewDoc({ name: d.name, type: d.type, objectUrl: d.objectUrl });
                        } else if (canPreview) {
                          const ext = d.name.split('.').pop()?.toLowerCase() ?? '';
                          const type = ext === 'pdf' ? 'application/pdf' : (['png', 'jpg', 'jpeg'].includes(ext) ? `image/${ext === 'jpg' ? 'jpeg' : ext}` : d.type);
                          setPreviewDoc({
                            name: d.name,
                            type,
                            objectUrl: `/api/v1/documents/reportes/${encodeURIComponent(d.docId)}/preview?project_id=${projectId}`,
                          });

                        } else {
                          const a = document.createElement('a');
                          a.href = `/api/v1/documents/reportes/${encodeURIComponent(d.docId)}/download?project_id=${projectId}`;

                          a.download = d.name;
                          a.click();
                        }
                      }}
                      className={`rounded border p-2 flex items-start gap-2 text-left w-full transition ${bgColor} cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-100`}
                      title={canPreview ? `Clic para ver ${d.name}` : `Clic para descargar ${d.name}`}
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center bg-white dark:bg-steel-700 border ${iconColor.replace('text-', 'border-').replace('-500', '-200').replace('-600', '-200')}`}>
                        <FileText className={`h-4 w-4 ${iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <p className="text-[9px] font-semibold text-steel-800 dark:text-steel-100 truncate leading-tight">{d.name}</p>
                        <p className="text-[7px] text-steel-400 dark:text-steel-500 mt-0.5">{sizeKB} · {ext}</p>
                        <p className="text-[7px] text-steel-400 dark:text-steel-500">{d.uploadedAt}</p>
                        <p className={`text-[7px] mt-0.5 font-semibold ${canPreview && d.objectUrl ? 'text-blue-500' : 'text-amber-500'}`}>
                          {canPreview && d.objectUrl ? '👁 Ver' : '⬇ Descargar'}
                        </p>
                      </div>
                    </button>
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); void removeBankDoc(d.docId); }}
                        className="absolute top-1 right-1 p-1 bg-white dark:bg-steel-700 border border-red-200 dark:border-red-800 text-red-500 rounded hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Eliminar documento"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
      {/* fin bank section */}


        {/* Modal: Desglose del Crédito */}
        {showCreditModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-steel-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 px-6 py-4 border-b border-steel-200 dark:border-steel-700 bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/40 dark:to-emerald-900/30 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Desglose del Ingreso por Crédito</h2>
                  <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">Presupuesto puente - Desembolso - GMF - Comisión = Ingreso Real</p>
                </div>
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="p-2 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/40 text-emerald-600 dark:text-emerald-300 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 space-y-6">
                {/* Parámetros del Crédito */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-steel-800 dark:text-steel-100">Parámetros del Crédito</h3>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Desembolso */}
                    <div className="rounded-lg border border-steel-200 dark:border-steel-600 p-4">
                      <label className="text-xs font-semibold text-steel-600 dark:text-steel-300 uppercase">Desembolso (Monto del Crédito)</label>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-steel-400 dark:text-steel-500">$</span>
                        <input
                          type="number"
                          value={creditParams.desembolso}
                          onChange={(e) => setCreditParams({...creditParams, desembolso: parseFloat(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                      </div>
                      <p className="text-xs text-steel-400 dark:text-steel-500 mt-2">{formatCOP(creditParams.desembolso)}</p>
                    </div>

                    {/* GMF % */}
                    <div className="rounded-lg border border-steel-200 dark:border-steel-600 p-4">
                      <label className="text-xs font-semibold text-steel-600 dark:text-steel-300 uppercase">GMF (%)</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          step="0.001"
                          value={creditParams.gmfPorcentaje}
                          onChange={(e) => setCreditParams({...creditParams, gmfPorcentaje: parseFloat(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                        <span className="text-xs text-steel-400 dark:text-steel-500">%</span>
                      </div>
                      <p className="text-xs text-steel-400 dark:text-steel-500 mt-2">{formatCOP(ingresoRealCalculado.gmf)}</p>
                    </div>

                    {/* Comisión % */}
                    <div className="rounded-lg border border-steel-200 dark:border-steel-600 p-4">
                      <label className="text-xs font-semibold text-steel-600 dark:text-steel-300 uppercase">Comisión (%)</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          step="0.01"
                          value={creditParams.comisionPorcentaje}
                          onChange={(e) => setCreditParams({...creditParams, comisionPorcentaje: parseFloat(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                        <span className="text-xs text-steel-400 dark:text-steel-500">%</span>
                      </div>
                      <p className="text-xs text-steel-400 dark:text-steel-500 mt-2">{formatCOP(ingresoRealCalculado.comision)}</p>
                    </div>

                    {/* Tasa de Interés */}
                    <div className="rounded-lg border border-steel-200 dark:border-steel-600 p-4">
                      <label className="text-xs font-semibold text-steel-600 dark:text-steel-300 uppercase">Tasa IBR + Spread (%)</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          step="0.01"
                          value={creditParams.tasaIbr}
                          onChange={(e) => setCreditParams({...creditParams, tasaIbr: parseFloat(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                        <span className="text-xs text-steel-400 dark:text-steel-500">IBR</span>
                        <input
                          type="number"
                          step="0.01"
                          value={creditParams.spreadPorcentaje}
                          onChange={(e) => setCreditParams({...creditParams, spreadPorcentaje: parseFloat(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                        <span className="text-xs text-steel-400 dark:text-steel-500">Spread</span>
                      </div>
                      <p className="text-xs text-steel-400 dark:text-steel-500 mt-2">EA total: {(creditParams.tasaIbr + creditParams.spreadPorcentaje).toFixed(3)}% · {((creditParams.tasaIbr + creditParams.spreadPorcentaje) / 12).toFixed(2)}% mensual aprox.</p>
                    </div>

                    {/* Meses del Crédito */}
                    <div className="rounded-lg border border-steel-200 dark:border-steel-600 p-4">
                      <label className="text-xs font-semibold text-steel-600 dark:text-steel-300 uppercase">Plazo (Meses)</label>
                      <div className="flex items-center gap-2 mt-2">
                        <input
                          type="number"
                          value={creditParams.mesesCredito}
                          onChange={(e) => setCreditParams({...creditParams, mesesCredito: parseInt(e.target.value) || 0})}
                          className="flex-1 rounded border border-primary-300 dark:border-steel-600 bg-white dark:bg-steel-700 text-steel-900 dark:text-white px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary-400"
                        />
                        <span className="text-xs text-steel-400 dark:text-steel-500">meses</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cálculo Formulado */}
                <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-800 p-5 space-y-3">
                  <h3 className="text-sm font-bold text-emerald-900 dark:text-emerald-200">Cálculo del Ingreso Real</h3>

                  <div className="space-y-2 font-mono text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-emerald-700 dark:text-emerald-300">Desembolso</span>
                      <span className="font-bold text-emerald-800 dark:text-emerald-200">{formatCOP(creditParams.desembolso)}</span>
                    </div>
                    <div className="border-t border-emerald-300"></div>
                    <div className="flex justify-between items-center text-red-600">
                      <span>(-) GMF ({creditParams.gmfPorcentaje}%)</span>
                      <span className="font-bold">- {formatCOP(ingresoRealCalculado.gmf)}</span>
                    </div>
                    <div className="flex justify-between items-center text-red-600">
                      <span>(-) Comisión ({creditParams.comisionPorcentaje}%)</span>
                      <span className="font-bold">- {formatCOP(ingresoRealCalculado.comision)}</span>
                    </div>
                    <div className="border-t-2 border-emerald-400 pt-2 flex justify-between items-center">
                      <span className="text-emerald-900 dark:text-emerald-200 font-bold">= Ingreso Real</span>
                      <span className="font-black text-lg text-emerald-700 dark:text-emerald-300">{formatCOP(ingresoRealCalculado.ingresoReal)}</span>
                    </div>
                  </div>
                </div>

                {/* Información Adicional */}
                <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-xs text-blue-700 dark:text-blue-300">
                  <p className="font-semibold mb-2">💡 Información del Crédito Puente:</p>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>GMF (Gravamen Movimiento Financiero): Impuesto bancario en Colombia (~0.395%)</li>
                    <li>Comisión: Cargo del banco por gestión y desembolso (~1.1%)</li>
                    <li>Tasa Efectiva Anual: IBR + 2.85% spread según contrato</li>
                    <li>Plazo: {creditParams.mesesCredito} meses (vencimiento con pago final)</li>
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-steel-200 dark:border-steel-700 px-6 py-4 bg-steel-50 dark:bg-steel-900 flex justify-end gap-3">
                <button
                  onClick={() => setShowCreditModal(false)}
                  className="px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-200 hover:bg-steel-100 dark:hover:bg-steel-700 transition text-sm font-semibold"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    // Actualizar el monto de ingreso Feb
                    setIncomes((prev) =>
                      prev.map((i) =>
                        i.id === 'ING-FEB' ? { ...i, monto: ingresoRealCalculado.ingresoReal } : i
                      )
                    );
                    setShowCreditModal(false);
                  }}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition text-sm font-semibold"
                >
                  Aplicar Cambios
                </button>
              </div>
            </div>
          </div>
        )}


      {/* ── Plan de Acción Recomendado ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary-600" />
          <h3 className="text-lg font-bold text-steel-900 dark:text-white">Plan de Acción Recomendado</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Paso 1: Evaluar Préstamo Interno */}
          <div className="rounded-xl border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 overflow-hidden">
            <button
              onClick={() => setExpandedActions(prev => ({ ...prev, prestamo: !prev.prestamo }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-blue-700 dark:text-blue-300">1</span>
                </div>
                <h4 className="font-bold text-blue-900 dark:text-blue-200">Evaluar Préstamo Interno</h4>
              </div>
              <ChevronDown className={clsx('h-4 w-4 text-blue-600 transition', expandedActions.prestamo && 'rotate-180')} />
            </button>

            {expandedActions.prestamo && (
              <div className="px-4 pb-4 pt-2 border-t border-blue-200 dark:border-blue-800 space-y-2">
                <ul className="space-y-2 text-xs text-blue-900 dark:text-blue-200">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Monto Actual:</strong> {prestamoInterno && prestamoInterno.incluido ? formatCOP(prestamoInterno.contratoTotal) : '$0'} registrado</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Impacto:</strong> {prestamoInterno && prestamoInterno.incluido ? `Reduce saldo disponible en ${formatCOP(prestamoInterno.contratoTotal)}` : 'Sin préstamo interno activo actualmente'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span><strong>Estado:</strong> {prestamoInterno && prestamoInterno.incluido ? 'Incluido en cálculos de flujo' : 'Disponible para evaluación si se requiere liquidez'}</span>
                  </li>
                </ul>
                <div className="pt-3 border-t border-blue-200 dark:border-blue-800 flex gap-2">
                  <button 
                    onClick={() => document.getElementById('seccion-tabla-egresos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white text-xs font-semibold rounded hover:bg-blue-700 transition"
                  >
                    Ver Detalles
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Paso 2: Estrategias de Financiamiento */}
          <div className="rounded-xl border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 overflow-hidden">
            <button
              onClick={() => setExpandedActions(prev => ({ ...prev, estrategias: !prev.estrategias }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-purple-700 dark:text-purple-300">2</span>
                </div>
                <h4 className="font-bold text-purple-900 dark:text-purple-200">Estrategias Financiamiento</h4>
              </div>
              <ChevronDown className={clsx('h-4 w-4 text-purple-600 dark:text-purple-400 transition', expandedActions.estrategias && 'rotate-180')} />
            </button>

            {expandedActions.estrategias && (
              <div className="px-4 pb-4 pt-2 border-t border-purple-200 dark:border-purple-800 space-y-2">
                <ul className="space-y-2 text-xs text-purple-900 dark:text-purple-200">
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                    <span><strong>Brecha {brechaFinanciamiento > 0 ? 'Crítica' : 'Estimada'}:</strong> {formatCOP(Math.abs(brechaFinanciamiento))} {brechaFinanciamiento > 0 ? 'adicionales necesarios' : 'de margen positivo'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                    <span><strong>Recomendación:</strong> {brechaFinanciamiento > 0 ? 'Solicitar crédito puente o inyección de capital' : 'Mantener control estricto de egresos operativos'}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-purple-600 dark:text-purple-400 font-bold mt-0.5">•</span>
                    <span><strong>Exposición:</strong> Basado en {items.filter(i => i.incluido).length} contratos activos incluidos.</span>
                  </li>
                </ul>
                <div className="pt-3 border-t border-purple-200 dark:border-purple-800 flex gap-2">
                  <button 
                    onClick={() => document.getElementById('seccion-creditos')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white text-xs font-semibold rounded hover:bg-purple-700 transition"
                  >
                    Simulador
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Paso 3: Monitoreo Mensual */}
          <div className="rounded-xl border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 overflow-hidden">
            <button
              onClick={() => setExpandedActions(prev => ({ ...prev, monitoreo: !prev.monitoreo }))}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-100 dark:hover:bg-orange-900/40 transition"
            >
              <div className="flex items-center gap-2">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-700 dark:text-orange-300">3</span>
                </div>
                <h4 className="font-bold text-orange-900 dark:text-orange-200">Monitoreo Mensual</h4>
              </div>
              <ChevronDown className={clsx('h-4 w-4 text-orange-600 dark:text-orange-400 transition', expandedActions.monitoreo && 'rotate-180')} />
            </button>

            {expandedActions.monitoreo && (
              <div className="px-4 pb-4 pt-2 border-t border-orange-200 dark:border-orange-800 space-y-2">
                <ul className="space-y-2 text-xs text-orange-900 dark:text-orange-200">
                  {MONTHS_NEEDING_INJECTION.length > 0 ? (
                    <>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold mt-0.5">•</span>
                        <span><strong>Próximo déficit:</strong> {MONTHS_NEEDING_INJECTION[0].period} (Defecto: {formatCOP(MONTHS_NEEDING_INJECTION[0].deficit)})</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold mt-0.5">•</span>
                        <span><strong>Punto crítico:</strong> {MONTHS_NEEDING_INJECTION.reduce((max, m) => m.deficit > max.deficit ? m : max).period} con {formatCOP(MONTHS_NEEDING_INJECTION.reduce((max, m) => m.deficit > max.deficit ? m : max).deficit)}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="text-orange-600 dark:text-orange-400 font-bold mt-0.5">•</span>
                        <span><strong>Meses afectados:</strong> {MONTHS_NEEDING_INJECTION.length} meses proyectados con flujo negativo</span>
                      </li>
                    </>
                  ) : (
                    <li className="flex items-start gap-2">
                      <span className="text-orange-600 dark:text-orange-400 font-bold mt-0.5">•</span>
                      <span><strong>Estado:</strong> Sin déficits proyectados en el horizonte actual de {months.length} meses.</span>
                    </li>
                  )}
                </ul>
                <div className="pt-3 border-t border-orange-200 dark:border-orange-800 flex gap-2">
                  <button 
                    onClick={() => document.getElementById('seccion-grafico-flujo')?.scrollIntoView({ behavior: 'smooth' })}
                    className="flex-1 px-3 py-2 bg-orange-600 text-white text-xs font-semibold rounded hover:bg-orange-700 transition"
                  >
                    Ver Gráfico Detallado
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── Modal: Detalle de pagos por mes ── */}
      {selectedMonthDetail && (() => {
        const monthKey = monthLabelToKey(selectedMonthDetail);
        
        // 1. Datos de categorías (Excel)
        const categoryDetails: MonthlyPaymentDetail[] = egresosCategorias
          .filter(c => (c.valores[monthKey] || 0) > 0)
          .map(c => ({
            proveedor: 'Varios / Por definir',
            concepto: c.nombre,
            categoria: c.nombre,
            grupo: c.grupo as GroupId,
            monto: c.valores[monthKey] || 0
          }));

        // 2. Intereses bancarios (si aplica)
        const bankInterests = ['Mar 2026', 'Jun 2026', 'Sep 2026'].includes(selectedMonthDetail)
          ? ingresoRealCalculado.totalIntereses / 3
          : 0;
        
        const interestDetails: MonthlyPaymentDetail[] = bankInterests > 0 ? [{
          proveedor: 'Banco de Occidente / Otros',
          concepto: 'Intereses Crédito Puente',
          categoria: 'INTERESES',
          grupo: 'intereses',
          monto: bankInterests
        }] : [];

        const details = [...categoryDetails, ...interestDetails];
        const totalMes = details.reduce((s, d) => s + d.monto, 0);

        // Agrupar por grupo
        const byGroup: Record<string, MonthlyPaymentDetail[]> = {};
        for (const d of details) {
          if (!byGroup[d.grupo]) byGroup[d.grupo] = [];
          byGroup[d.grupo].push(d);
        }

        // Agrupar por categoria dentro de cada grupo
        const isRealMonth = (() => {
          if (!selectedMonthDetail) return false;
          const [mStr, yStr] = selectedMonthDetail.split(' ');
          const monthsAbbr = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
          const mIdx = monthsAbbr.indexOf(mStr);
          if (mIdx === -1) return false;
          const yNum = parseInt(yStr);
          const now = new Date();
          const currentY = now.getFullYear();
          const currentM = now.getMonth();
          return yNum < currentY || (yNum === currentY && mIdx <= currentM);
        })();

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedMonthDetail(null)}>
            <div className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="px-6 py-4 border-b border-steel-200 dark:border-steel-700 bg-gradient-to-r from-primary-900 to-primary-800 rounded-t-xl flex items-center justify-between flex-shrink-0">
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary-300" />
                    <h2 className="text-lg font-bold text-white">Detalle de Pagos — {selectedMonthDetail}</h2>
                    {isRealMonth && (
                      <span className="text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">Real</span>
                    )}
                    {!isRealMonth && (
                      <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-2 py-0.5 rounded-full">Proyectado</span>
                    )}
                  </div>
                  <p className="text-xs text-primary-300 mt-0.5">
                    {details.length} conceptos · Total: <span className="font-bold text-white">{formatCOP(totalMes)}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedMonthDetail(null)} className="p-2 rounded-lg hover:bg-primary-700 text-primary-300 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Body — scrollable */}
              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {(['materiales', 'mano_obra', 'administracion', 'intereses'] as GroupId[]).map(grupoId => {
                  const grupoItems = byGroup[grupoId];
                  if (!grupoItems || grupoItems.length === 0) return null;
                  const config = GROUP_CONFIG[grupoId];
                  const Icon = config.icon;
                  const grupoTotal = grupoItems.reduce((s, d) => s + d.monto, 0);
                  const pct = totalMes > 0 ? (grupoTotal / totalMes * 100).toFixed(1) : '0';

                  // Agrupar por categoria
                  const byCat: Record<string, MonthlyPaymentDetail[]> = {};
                  for (const d of grupoItems) {
                    if (!byCat[d.categoria]) byCat[d.categoria] = [];
                    byCat[d.categoria].push(d);
                  }

                  return (
                    <div key={grupoId} className={clsx('rounded-xl border', config.borderColor, config.bgColor)}>
                      {/* Grupo header */}
                      <div className={clsx('px-4 py-3 flex items-center justify-between rounded-t-xl border-b', config.borderColor)}>
                        <div className="flex items-center gap-2">
                          <Icon className={clsx('h-4 w-4', config.color)} />
                          <span className={clsx('text-sm font-bold', config.color)}>{config.label}</span>
                          <span className="text-[10px] text-steel-500 dark:text-steel-400 bg-white dark:bg-steel-700 rounded-full px-2 py-0.5 border border-steel-200 dark:border-steel-600">{pct}% del total</span>
                        </div>
                        <span className={clsx('text-sm font-black font-mono', config.color)}>{formatCOP(grupoTotal)}</span>
                      </div>

                      {/* Items por categoria */}
                      <div className="divide-y divide-white/60 dark:divide-white/10">
                        {Object.entries(byCat).map(([cat, catItems]) => (
                          <div key={cat}>
                            {/* Subcategoria label */}
                            <div className="px-4 py-1.5 bg-white/40 dark:bg-black/20">
                              <span className="text-[10px] font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wide">{cat}</span>
                            </div>
                            {/* Items */}
                            {catItems.map((item, i) => (
                              <div key={i} className="px-4 py-2.5 flex items-center justify-between hover:bg-white/60 dark:hover:bg-white/5 transition">
                                <div className="flex-1 min-w-0 mr-4">
                                  <p className="text-sm font-semibold text-steel-800 dark:text-steel-100 truncate">{item.proveedor || '—'}</p>
                                  <p className="text-[11px] text-steel-500 dark:text-steel-400 truncate">{item.concepto}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-bold font-mono text-steel-800 dark:text-steel-100">{formatCOP(item.monto)}</p>
                                  <p className="text-[10px] text-steel-400 dark:text-steel-500">{(item.monto / totalMes * 100).toFixed(1)}%</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Footer — totals */}
              <div className="px-6 py-4 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900 rounded-b-xl flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-xs">
                    {(['materiales', 'mano_obra', 'administracion', 'intereses'] as GroupId[]).map(g => {
                      const items = byGroup[g];
                      if (!items) return null;
                      const tot = items.reduce((s, d) => s + d.monto, 0);
                      const config = GROUP_CONFIG[g];
                      return (
                        <div key={g}>
                          <p className="text-steel-400 dark:text-steel-500">{config.label.split(' ')[0]}</p>
                          <p className={clsx('font-bold', config.color)}>{formatCOP(tot)}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-steel-400 dark:text-steel-500">TOTAL {selectedMonthDetail.toUpperCase()}</p>
                    <p className="text-xl font-black font-mono text-steel-900 dark:text-white">{formatCOP(totalMes)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal visor de documentos bancarios ── */}
      {previewDoc && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0, left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.65)',
            zIndex: 99999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '62vw',
              height: '78vh',
              maxWidth: '900px',
              background: '#FFFFFF',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div style={{
              height: '48px', flexShrink: 0,
              display: 'flex', alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              borderBottom: '1px solid #E5E7EB',
              background: '#F9FAFB',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileText style={{ height: '16px', width: '16px', color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewDoc.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {/* Botón descargar */}
                <a
                  href={previewDoc.objectUrl}
                  download={previewDoc.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '6px 10px', background: '#FFFFFF',
                    color: '#4B5563', borderRadius: '8px',
                    fontSize: '10px', fontWeight: 'bold',
                    border: '1px solid #E5E7EB',
                    textDecoration: 'none'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <Download style={{ height: '14px', width: '14px' }} />
                  Descargar
                </a>
                {/* Botón cerrar */}
                <button
                  onClick={() => setPreviewDoc(null)}
                  style={{
                    padding: '6px',
                    color: '#9CA3AF',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    background: 'none',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#9CA3AF'}
                >
                  <Plus style={{ height: '20px', width: '20px', transform: 'rotate(45deg)' }} />
                </button>
              </div>
            </div>

            {/* Contenido del visor */}
            <div style={{ flex: 1, background: '#FFFFFF', position: 'relative' }}>
              {previewDoc.type.startsWith('image/') ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'auto' }}>
                  <img
                    src={previewDoc.objectUrl}
                    alt={previewDoc.name}
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '4px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                  />
                </div>
              ) : previewDoc.type === 'application/pdf' || previewDoc.name.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  src={previewDoc.objectUrl}
                  title={previewDoc.name}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    background: '#FFFFFF',
                    display: 'block'
                  }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', color: '#6B7280' }}>
                  <FileText style={{ height: '64px', width: '64px', color: '#D1D5DB' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600 }}>Vista previa no disponible para este tipo de archivo</p>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Modal: Carpeta 03 Aspectos Financieros */}
      {showFolder03Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFolder03Modal(false)}>
          <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col overflow-hidden border border-steel-200 dark:border-steel-800"
            onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between bg-steel-50/50 dark:bg-steel-900">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-100 dark:bg-emerald-900/30 p-2 rounded-xl">
                  <FolderOpen className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-steel-900 dark:text-white">Carpeta 03: Aspectos Financieros</h3>
                  <p className="text-xs text-steel-400">Documentos de soporte financiero, bancos y facturación</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => document.getElementById('folder-03-upload-modal')?.click()}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
                >
                  <Upload className="h-4 w-4" /> Subir Archivo
                </button>
                <input id="folder-03-upload-modal" type="file" className="hidden" onChange={handleFolder03Upload} />
                <button onClick={() => setShowFolder03Modal(false)} className="text-steel-400 hover:text-steel-600 text-xl font-bold">✕</button>
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
                    {docsFolder03.length > 0 ? (
                      docsFolder03.map((doc) => {
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
                            <p className="text-sm font-medium">No hay documentos en esta carpeta</p>
                            <p className="text-xs max-w-[240px]">Sube extractos bancarios, facturas o soportes de pago aquí.</p>
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
              <RefreshCw className="h-4 w-4 text-emerald-500 animate-spin-slow" />
              <p className="text-[11px] text-steel-500 dark:text-steel-400">
                <span className="font-bold">Sincronizado:</span> Los documentos financieros se sincronizan con la carpeta global 03.
              </p>
            </div>
          </div>
        </div>
      )}

      </div>
      {/* Modal Detalle de Costos Reales */}
      {showRealCostsModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-md border border-steel-200 dark:border-steel-800 overflow-hidden transform animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between bg-steel-50 dark:bg-steel-950/50">
              <div>
                <h3 className="text-base font-bold text-steel-900 dark:text-white">Detalle de Costos Reales</h3>
                <p className="text-[10px] text-steel-500 dark:text-steel-400 mt-0.5">Gestión manual de facturación y egresos efectivos</p>
              </div>
              <button onClick={() => setShowRealCostsModal(false)} className="p-2 hover:bg-steel-200 dark:hover:bg-steel-800 rounded-xl transition text-steel-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-steel-500 uppercase tracking-wider">Costo Facturado</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 font-medium text-sm">$</div>
                  <input
                    type="number"
                    value={editRealCosts.facturado}
                    onChange={(e) => setEditRealCosts(prev => ({ ...prev, facturado: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-7 pr-4 py-3 bg-steel-50 dark:bg-steel-800/50 border border-steel-200 dark:border-steel-700 rounded-xl text-lg font-bold text-steel-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-steel-400">Monto total de facturas recibidas y aprobadas</p>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-steel-500 uppercase tracking-wider">Costo Pagado</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-steel-400 font-medium text-sm">$</div>
                  <input
                    type="number"
                    value={editRealCosts.pagado}
                    onChange={(e) => setEditRealCosts(prev => ({ ...prev, pagado: parseFloat(e.target.value) || 0 }))}
                    className="w-full pl-7 pr-4 py-3 bg-steel-50 dark:bg-steel-800/50 border border-steel-200 dark:border-steel-700 rounded-xl text-lg font-bold text-red-600 dark:text-red-400 focus:ring-2 focus:ring-red-500 focus:border-transparent outline-none transition"
                    placeholder="0.00"
                  />
                </div>
                <p className="text-[10px] text-steel-400">Egresos efectivos realizados (Fuente: Tesorería)</p>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowRealCostsModal(false)}
                  className="flex-1 py-3 px-4 border border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-300 font-bold text-sm rounded-xl hover:bg-steel-50 dark:hover:bg-steel-800 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveRealCosts}
                  className="flex-1 py-3 px-4 bg-primary-600 text-white font-bold text-sm rounded-xl hover:bg-primary-700 transition shadow-lg shadow-primary-500/20 active:scale-95"
                >
                  Guardar Cambios
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ProjectProvider>
  );
}
