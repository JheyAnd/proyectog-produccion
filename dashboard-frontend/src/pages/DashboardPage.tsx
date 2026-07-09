import { useParams, useNavigate } from 'react-router-dom';
import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  TrendingDown,
  AlertTriangle,
  Clock,
  Target,
  X,
  Loader,
  BarChart2,
  CalendarClock,
  Upload,
  FileText,
  Eye,
  Trash2,
  Database,
  LayoutDashboard,
} from 'lucide-react';
import clsx from 'clsx';
import { useRef } from 'react';
import KPICard from '@/components/common/KPICard';
import CashFlowChart from '@/components/dashboard/CashFlowChart';
import HelpButton from '@/components/common/HelpButton';
import { ProjectProvider } from '@/contexts/ProjectContext';
import EmptyProjectState from '@/components/common/EmptyProjectState';
import { dashboardApi } from '@/services/api/dashboard';
import apiClient from '@/services/api/client';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { loadCustomWeeks, fetchCustomWeeksFromDB, type CustomWeekData } from '@/utils/reportData';
import { formatCOP } from '@/utils/formatNumbers';
import { useCashFlowSync } from '@/hooks/dashboard/useCashFlowSync';
import { usePageContext } from '@/hooks/usePageContext';
import { LYRA_PROJECT_ID, formatLyraBAC } from '@/constants/lyra';
import { LyraFinancialService, useLyraFinancials } from '@/services/financial/lyraFinancials';
import { generateAlerts } from '@/utils/generateAlerts';
import { useDocuments } from '@/data/documentsData';
import { businessCaseAPI } from '@/services/api/businessCase';

const dashboardHelp = {
  pageTitle: 'Ayuda — Dashboard',
  description:
    'Vista ejecutiva del estado del proyecto. ' +
    'Incluye indicadores financieros EVM, avance físico vs planificado (Curva S), resumen presupuestario, ' +
    'alertas de riesgo, flujo de caja y datos contractuales.',

  pdfUrl: '/docs/Informe_Dashboard_Metricas.pdf',
  pdfName: 'Informe_Dashboard_Metricas.pdf',
  sections: [
    {
      title: 'KPIs Principales (Fila 1)',
      items: [
        { color: '#1B5EAB', label: 'Valor Total Oferta (BAC) = $41,012,884,481', description: 'Precio global fijo de la Oferta Mercantil. Valor contractual inamovible. Fuente: Detallado caso de negocio_220126.xlsx, hoja "Costo vs Venta".' },
        { color: '#4A4D56', label: 'Costo Real (ACWP) = $9,943M', description: 'Materiales + Administración ejecutados. Fuente: Patio Sur_.xlsx. Representa ~21.3% del BAC. Click para ver desglose.' },
        { color: '#16A34A', label: 'SPI (Índice de Cronograma) — dinámico', description: 'Calculado automáticamente desde la última semana del Cronograma. SPI vs base revisada (19 mar): ~1.01. SPI vs base contractual (27 nov): 0.73. Re-baseline de +48 días.' },
        { color: '#DC2626', label: 'Alertas Activas — dinámico', description: 'Número total de alertas activas. Incluye alertas dinámicas (SPI, CPI calculados) + alertas fijas del proyecto. Ver página Alertas para detalle.' },
      ],
    },
    {
      title: 'KPIs Secundarios (Fila 2)',
      items: [
        { color: '#1B5EAB', label: 'Valor Ganado (EV/BCWP) — dinámico', description: 'BAC × % avance físico de la última semana del Cronograma. Se actualiza automáticamente al ingresar nuevas semanas.' },
        { color: '#16A34A', label: 'EAC — Estimado a la Conclusión', description: 'Proyección bottom-up del equipo financiero ($25,157M con financiación). VAC = $15,855M. Utilidad proyectada: 38.7%. Fuente: Proyeccion de Pagos.xlsx.' },
      ],
    },
    {
      title: 'Curva S — Avance Acumulado',
      items: [
        { color: '#1B5EAB', label: 'Línea Azul — Planificado (Base Revisada 19 mar)', description: '67 semanas (S-00 a S-66). Duración: 453 días (20 Jun 2025 – 16 Sep 2026). 515 actividades ponderadas. Fuente: Curva S (19 mar) Pablo.xlsx.' },
        { color: '#16A34A', label: 'Línea Verde — Avance Real (dinámico)', description: 'Se actualiza con cada semana registrada en el Cronograma. La desviación muestra si el proyecto va adelantado (+) o atrasado (-).' },
        { color: '#DC2626', label: 'Línea Roja — Fecha Contractual (3 Jul 2026)', description: 'Fecha de entrega original del contrato. El proyecto ya tiene re-baseline a 16 Sep 2026 (+48 días). SPI contractual = 0.73.' },
      ],
    },
    {
      title: 'Cómo se Actualizan los Datos',
      items: [
        { icon: '🔄', label: 'Datos dinámicos del Cronograma', description: 'SPI, EV, CPI y avance real se calculan automáticamente con la semana más reciente registrada en la página Cronograma.' },
        { icon: '📅', label: 'Agregar nuevas semanas', description: 'Ve a Cronograma → haz clic en "+ S-XX" → edita los avances reales de cada actividad → guarda. El Dashboard se actualizará automáticamente.' },
        { icon: '📊', label: 'Datos fijos (fuentes externas)', description: 'Costo Real (AC), EAC, presupuesto comprometido y flujo de caja provienen de archivos Excel del equipo de control de proyectos.' },
      ],
    },
  ],
};
import SCurveChart from '@/components/dashboard/SCurveChart';
import ChapterBreakdownChart from '@/components/dashboard/ChapterBreakdownChart';
import { generateProjectStatusPDF } from '@/utils/generatePDF';
import { generateProjectStatusExcel } from '@/utils/generateExcel';
// @ts-ignore
import { cronogramaApi, CronogramaCorte } from '@/services/api/cronograma';
import ContractSummary from '@/components/dashboard/ContractSummary';

// ============================================================
// Helpers para SPI dinámico — lee semanas del Cronograma
// ============================================================
function getWeeklyProgMap(projectId: string): Map<number, number> {
  return new Map();
}

function getInitialDashboardData(projectId: string) {
  return {
    bac: 0,
    actualCost: 0,
    eacSinFin: 0,
    eacConFin: 0,
    comprometido: 0,
    ahorroCompras: 0,
  };
}


function loadEAC(projectId: string): { sinFin: number; conFin: number } {
  const lsKey = `${projectId}_eac_caso_negocio`;
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sinFin: 0, conFin: 0 };
}

function getDashboardData(projectId: string) {
    return {
      project: {
        name: 'Nuevo Proyecto',
        code: projectId.toUpperCase(),
        status: 'planning',
        client_name: 'Pendiente',
        contractor_name: 'PC Mejia S.A.',
        total_budget: 0,
        total_cost: 0,
        currency: 'COP',
        start_date: undefined as string | undefined,
        estimated_end_date: undefined as string | undefined,
      },
      budget_summary: {
        total_original_budget: 0,
        total_approved_changes: 0,
        total_current_budget: 0,
        total_committed: 0,
        total_actual: 0,
        total_available: 0,
        consumption_percentage: 0,
      },
      cash_flow_entries: [],
      alerts_static: [],
      counts: { recent_transactions: 0, pending_invoices: 0, overdue_invoices: 0 },
      earned_value: { bac: 0, actual_cost: 0, earned_value_amount: 0, planned_value_amount: 0, cpi: 0, cpi_contractual: 0, spi: 0, spi_contractual: 0, eac: 0 },
    };
}

function checkIsLyra(id?: string): boolean { return false; }

export default function DashboardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  if (!projectId) return null;
  const isLyra = useMemo(() => checkIsLyra(projectId), [projectId]);
  const dashboardData = useMemo(() => getDashboardData(projectId), [projectId]);
  const weeklyProgMap = useMemo(() => getWeeklyProgMap(projectId), [projectId]);

  const navigate = useNavigate();
  const { chartData } = useCashFlowSync(projectId);

  const [showCostoDetail, setShowCostoDetail] = useState(false);
  const [showSPIDetail, setShowSPIDetail] = useState(false);

  const { data: cortesDashboard = [] } = useQuery<any[]>({
    queryKey: ['cronogramaCortes', projectId],
    queryFn: () => cronogramaApi.listCortes(projectId),
    enabled: !!projectId,
    staleTime: 0,
    refetchOnWindowFocus: true,
  });

  const { data: proyectadoDashboard = [] } = useQuery<any[]>({
    queryKey: ['cronogramaProyectado', projectId],
    queryFn: () => cronogramaApi.getProyectado(projectId),
    enabled: !!projectId,
  });

  const [eacData, setEacData] = useState({ sinFin: 0, conFin: 0 });

  const [actualCostOverride, setActualCostOverride] = useState<number | null>(() => {
    try {
      const s = localStorage.getItem(`${projectId}_total_pagado`);
      return s ? parseFloat(s) : null;
    } catch { return null; }
  });
  const { documents, addDocument, deleteDocument: removeDocument } = useDocuments();
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    apiClient.get(`/preferences/${projectId}_total_pagado`)
      .then(res => {
        if (res.data !== null && typeof res.data === 'number') {
          setActualCostOverride(res.data);
          localStorage.setItem(`${projectId}_total_pagado`, String(res.data));
        }
      }).catch(() => {});
  }, [projectId]);

  const { data: apiData, isLoading } = useQuery({
    queryKey: ['dashboard', projectId],
    queryFn: () => (projectId ? dashboardApi.get(projectId) : Promise.reject('No project ID')),
    enabled: !!projectId,
  });

  const { data: bcStatus } = useQuery({
    queryKey: ['businessCaseStatus', projectId],
    queryFn: () => (projectId ? businessCaseAPI.getStatus(projectId) : null),
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });

  const proyectoConfigurado = useMemo(() => {
    if (isLyra) return true;
    if (!bcStatus) return false;
    const statusObj = (bcStatus as any).data || bcStatus;
    const ventaOK = statusObj.venta_excel_validado === true || statusObj.venta_excel_validado === 1;
    const costoOK = statusObj.costo_excel_validado === true || statusObj.costo_excel_validado === 1;
    return ventaOK && costoOK;
  }, [bcStatus, isLyra]);

  const valorOferta = useMemo(() => {
    const apiBac = apiData?.earned_value?.bac;
    const statusObj = (bcStatus as any)?.data || bcStatus;
    const finalBac = apiBac && apiBac > 0
      ? apiBac
      : statusObj?.valor_oferta_total ?? statusObj?.venta_monto_manual ?? 0;
    return finalBac;
  }, [apiData, bcStatus]);

  const dynamicSPI = useMemo(() => {
    const bac = valorOferta;
    
    const cortesList = Array.isArray(cortesDashboard) ? cortesDashboard : [];
    const proyectadoList = Array.isArray(proyectadoDashboard) ? proyectadoDashboard : [];

    if (cortesList.length > 0) {
      // Find the last valid cut that has an executed value > 0, or just use the last one if all are 0
      const sorted = [...cortesList].sort((a, b) => a.semana - b.semana);
      const validCortes = sorted.filter(c => Number(c.avance_ejecutado) > 0);
      const last = validCortes.length > 0 ? validCortes[validCortes.length - 1] : sorted[sorted.length - 1];
      
      const latestWeekNum = last.semana;
      let latestProg = 0;
      
      if (proyectadoList.length > 0) {
        const proj = proyectadoList.find(p => p.semana === latestWeekNum);
        if (proj) latestProg = Number(proj.avance_planeado);
      } else {
        latestProg = weeklyProgMap.get(latestWeekNum) || 0;
      }
      
      const latestReal = Number(last.avance_ejecutado) || 0;
      const spi = latestProg > 0 ? latestReal / latestProg : 0;
      
      const dateStr = typeof last.fecha_corte === 'string' ? last.fecha_corte : String(last.fecha_corte || '');
      const dObj = new Date(dateStr);
      const mNames = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
      const weekDate = !isNaN(dObj.getTime()) ? `${dObj.getUTCDate().toString().padStart(2,'0')} ${mNames[dObj.getUTCMonth()]}` : '—';

      return {
        weekLabel: `S-${latestWeekNum.toString().padStart(2, '0')}`,
        weekDate: weekDate,
        weekNum: latestWeekNum,
        prog: latestProg,
        real: latestReal,
        spi: Math.round(spi * 100) / 100,
        evAmount: bac * latestReal / 100,
        pvAmount: bac * latestProg / 100,
        desviacion: Math.round((latestReal - latestProg) * 10) / 10,
      };
    }

    return {
      weekLabel: 'S-00',
      weekDate: '—',
      weekNum: 0,
      prog: 0,
      real: 0,
      spi: 0,
      evAmount: 0,
      pvAmount: 0,
      desviacion: 0,
    };
  }, [valorOferta, cortesDashboard, proyectadoDashboard, weeklyProgMap]);

  const dynamicCPI = useMemo(() => {
    const ev = valorOferta * dynamicSPI.real / 100;
    const acFromApi = apiData?.earned_value?.actual_cost ? Number(apiData.earned_value.actual_cost) : 0;
    const ac = acFromApi > 0 ? acFromApi : (actualCostOverride !== null ? actualCostOverride : 0);
    const cpi = ac > 0 ? ev / ac : 0;
    const eacConFinFromApi = apiData?.earned_value?.eac_con_fin;
    const eacSinFinFromApi = apiData?.earned_value?.eac_sin_fin;

    return {
      cpi: Math.round(cpi * 100) / 100,
      ev,
      ac,
      bac: valorOferta,
      eacConFin: eacConFinFromApi || eacData.conFin || 1,
      eacSinFin: eacSinFinFromApi || eacData.sinFin || 1,
    };
  }, [dynamicSPI, eacData, apiData, actualCostOverride, valorOferta]);

  const data = useMemo(() => {
    const base = dashboardData;
      if (!apiData) return base;
      return {
        ...base,
        project: { ...base.project, ...apiData.project },
        budget_summary: {
          ...base.budget_summary,
          ...apiData.budget_summary,
          total_current_budget: valorOferta,
        },
        cash_flow_summary: apiData.cash_flow_summary,
        counts: { ...base.counts, ...apiData.counts },
        earned_value: {
          ...base.earned_value,
          ...apiData.earned_value,
          bac: valorOferta,
          actual_cost: apiData.earned_value?.actual_cost || apiData.project?.costo_pagado || 0,
        },
      };
  }, [apiData, dashboardData, valorOferta]);

  const dynamicAlerts = useMemo(() => generateAlerts({
    spiReal: dynamicSPI.real,
    spiProg: dynamicSPI.prog,
    spiLabel: dynamicSPI.weekLabel,
    spiDate: dynamicSPI.weekDate,
    spiDesviacion: dynamicSPI.desviacion,
    cpi: dynamicCPI.cpi,
    ev: dynamicCPI.ev,
    ac: dynamicCPI.ac,
    eacConFin: dynamicCPI.eacConFin,
    projectId,
  }), [dynamicSPI, dynamicCPI, projectId]);

  usePageContext({
    title: `Dashboard — ${data.project.name || 'Proyecto'}`,
    description: 'KPIs ejecutivos del proyecto.',
    keyMetrics: {
      cpi: dynamicCPI.cpi,
      spi: dynamicSPI.spi,
      avance_real_pct: dynamicSPI.real,
      avance_planeado_pct: dynamicSPI.prog,
      semana_ref: dynamicSPI.weekLabel,
      ev: dynamicCPI.ev,
      ac: dynamicCPI.ac,
      bac: dynamicCPI.bac,
    },
    dataSummary: `Semana de referencia ${dynamicSPI.weekLabel}.`,
  });

  const eacConFin = dynamicCPI.eacConFin;
  const eacSinFin = dynamicCPI.eacSinFin;
  const utilidadProyectada = (data.earned_value?.bac || 0) - eacConFin;
  const margenProyectado = data.earned_value?.bac ? ((data.earned_value.bac - eacConFin) / data.earned_value.bac * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!proyectoConfigurado) {
    return (
      <ProjectProvider projectId={projectId}>
        <EmptyProjectState
          module="Dashboard de Control"
          projectName={data.project.name}
          projectCode={data.project.code}
          clientName={data.project.client_name}
          description="Este proyecto aún no tiene información registrada. Comienza configurando el Caso de Negocio para establecer el presupuesto y métricas base."
          actionLabel="Ir a Caso de Negocio"
          onAction={() => navigate(`/projects/${projectId}/business-case`)}
          icon={LayoutDashboard}
        />
      </ProjectProvider>
    );
  }

  return (
    <ProjectProvider projectId={projectId}>
      <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-steel-900 dark:text-white">
              Dashboard — {data.project.name}
            </h2>
          </div>
          <p className="text-xs text-steel-400 dark:text-steel-500 mt-1 flex flex-wrap items-center gap-x-1 gap-y-0.5">
            <span>Codigo: {data.project.code}</span>
            <span className="hidden sm:inline">|</span>
            <span>Contratista: {data.project.contractor_name || 'PC Mejia S.A.'}</span>
            <span className="text-steel-300 dark:text-steel-600">|</span>
            <span>Cliente: {data.project.client_name || 'Sin Cliente'}</span>
            <span className="hidden sm:inline">|</span>
            <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
              En Progreso
            </span>
            {proyectoConfigurado 
              ? <span className="flex items-center gap-1.5 ml-2"><Target className="h-3.5 w-3.5" /> Caso de Negocio Activo</span>
              : <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800 ml-2"><AlertTriangle className="h-3.5 w-3.5" /> Caso de Negocio Pendiente</span>
            }
          </p>
          <p className="text-[11px] text-steel-400 dark:text-steel-500 mt-0.5 break-words">
            Inicio: {data.project.start_date || '—'} | Fin Estimado: {data.project.estimated_end_date || '—'}
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0 flex-wrap items-center">

          <HelpButton {...dashboardHelp} />
          <button
            onClick={() => void generateProjectStatusPDF()}
            aria-label="Exportar Dashboard como PDF"
            className="rounded-lg bg-primary-600 px-3 py-1.5 min-h-[32px] text-xs font-medium text-white hover:bg-primary-700 transition shadow-sm"
          >
            Exportar PDF
          </button>
          <button
            onClick={() => generateProjectStatusExcel()}
            aria-label="Exportar Dashboard como Excel"
            className="rounded-lg border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-800 px-3 py-1.5 min-h-[32px] text-xs font-medium text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700 transition"
          >
            Exportar Excel
          </button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Valor Total Oferta"
          value={formatCOP(valorOferta)}
          subtitle="BAC - Precio Global Fijo (inc. IVA, AIU)"
          icon={DollarSign}
          variant="default"
        />
        <ErrorBoundary fallbackTitle="Error al cargar Costo Real">
          <KPICard
            title="COSTO REAL"
            value={dynamicCPI.ac > 0 ? formatCOP(dynamicCPI.ac) : "$ 0"}
            subtitle={dynamicCPI.ac > 0 
              ? `${(dynamicCPI.ac / eacConFin * 100).toFixed(1)}% del EAC · Egresos efectivos realizados`
              : "Pendiente de ingreso"
            }
            icon={TrendingDown}
            trend={(dynamicCPI.ac / eacConFin * 100) > 90 ? 'down' : 'neutral'}
            trendValue={dynamicCPI.ac > 0 ? `${(dynamicCPI.ac / eacConFin * 100).toFixed(1)}%` : ""}
            variant={dynamicCPI.ac === 0 ? 'default' : (dynamicCPI.ac / eacConFin * 100) > 95 ? 'danger' : 'primary'}
            onClick={() => navigate(`/projects/${projectId}/cash-flow`)}
          />
        </ErrorBoundary>
        <KPICard
          title="SPI (Indice Cronograma)"
          value={dynamicSPI.spi.toFixed(2)}
          subtitle={`${dynamicSPI.weekLabel}: ${dynamicSPI.spi >= 1 ? 'en tiempo' : `${Math.abs(dynamicSPI.desviacion).toFixed(1)}% atrasado`} · Ver detalle`}
          icon={Clock}
          trend={dynamicSPI.spi >= 1 ? 'up' : 'down'}
          variant={dynamicSPI.spi >= 1 ? 'warning' : 'danger'}
          onClick={() => setShowSPIDetail(true)}
        />
        <KPICard
          title="ALERTAS ACTIVAS"
          value={Array.isArray(dynamicAlerts) ? dynamicAlerts.length : 0}
          subtitle={`${Array.isArray(dynamicAlerts) ? dynamicAlerts.filter(a => a.severity === 'critical').length : 0} críticas · ${Array.isArray(dynamicAlerts) ? dynamicAlerts.filter(a => a.severity === 'warning').length : 0} advert. · ${Array.isArray(dynamicAlerts) ? dynamicAlerts.filter(a => a.severity === 'info').length : 0} inform.`}
          icon={AlertTriangle}
          variant={Array.isArray(dynamicAlerts) && dynamicAlerts.some(a => a.severity === 'critical') ? 'danger' : 'warning'}
          onClick={() => navigate(`/projects/${projectId}/alerts`)}
        />
      </div>

      {/* S-Curve Chart */}
      {(!Array.isArray(proyectadoDashboard) || proyectadoDashboard.length === 0) && (!Array.isArray(cortesDashboard) || cortesDashboard.length === 0) ? (
        <div className="h-[420px] flex flex-col items-center justify-center bg-white dark:bg-steel-800 rounded-xl border border-steel-200">
          <p className="text-steel-400 text-sm">No hay datos de cronograma para este proyecto.</p>
          <p className="text-steel-400 text-[10px] mt-1">Carga el cronograma desde Entregables.</p>
        </div>
      ) : (
        <SCurveChart
          projectId={projectId}
          proyectado={Array.isArray(proyectadoDashboard) ? proyectadoDashboard : []}
          cortes={Array.isArray(cortesDashboard) ? cortesDashboard : []}
        />
      )}

      {/* Chapter Breakdown Chart */}
      <ChapterBreakdownChart projectId={projectId} />

      {/* Cash Flow Chart */}
      <CashFlowChart data={chartData} />

      {/* Resumen del Contrato (Inline Editable) */}
      <ContractSummary projectId={projectId} />


      {/* Costo Real Detail Modal */}
      {showCostoDetail && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowCostoDetail(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCostoDetail(false)}>
            <div role="dialog" aria-modal="true" aria-labelledby="modal-costo-title" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-steel-800 to-steel-700 rounded-t-2xl">
                <div>
                  <h3 id="modal-costo-title" className="text-base font-bold text-white">Costo Real vs Costo Estimado a Terminacion</h3>
                  <p className="text-xs text-steel-300 mt-0.5">Fuente: Patio Sur_.xlsx + Caso de Negocio (Pagos Proyeccion)</p>
                </div>
                <button onClick={() => setShowCostoDetail(false)} aria-label="Cerrar modal" className="p-1.5 rounded-lg hover:bg-white/10 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Content */}
              <div className="p-6 space-y-5">
                {/* Main comparison cards */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border-2 border-steel-300 bg-steel-50 p-4 text-center">
                    <p className="text-[10px] font-semibold text-steel-500 uppercase tracking-wider">Costo Real (ACWP)</p>
                    <p className="text-[10px] text-steel-400 mb-1">Lo que se ha gastado hoy</p>
                    <p className="text-3xl font-black text-steel-800">{formatCOP(dynamicCPI.ac)}</p>
                    <p className="text-xs text-steel-500 mt-1 font-medium">{data.budget_summary.consumption_percentage}% del presupuesto</p>
                  </div>
                  <div className="rounded-xl border-2 border-primary-300 bg-primary-50 p-4 text-center">
                    <p className="text-[10px] font-semibold text-primary-600 uppercase tracking-wider">Costo Estimado Final (EAC)</p>
                    <p className="text-[10px] text-primary-400 mb-1">Proyeccion bottom-up al cierre</p>
                    <p className="text-3xl font-black text-primary-800">{formatCOP(eacConFin)}</p>
                    <p className="text-xs text-primary-600 mt-1 font-medium">Fuente: Caso de Negocio</p>
                  </div>
                </div>

                {/* Desglose Costo Real */}
                {(() => {
                  const bd = apiData?.earned_value?.breakdown || {};
                  const matAmt  = bd.ac_materiales || 0;  
                  const admAmt  = bd.ac_administrativo || 0;     
                  const otroAmt = bd.ac_otros || 0;     
                  const clasificadoAmt = matAmt + admAmt + otroAmt;
                  const sinClasAmt = dynamicCPI.ac - clasificadoAmt;   
                  const pct = (v: number) => dynamicCPI.ac > 0 ? (v / dynamicCPI.ac * 100).toFixed(1) + '%' : '—';

                  return (
                    <div>
                      <p className="text-xs font-bold text-steel-700 mb-2 flex items-center gap-1.5">
                        <BarChart2 className="h-3.5 w-3.5 text-steel-500" /> Desglose del Costo Real Acumulado
                      </p>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-steel-100">
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Materiales (compras OC)</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(matAmt)}</td>
                            <td className="py-2 text-right text-steel-400">{pct(matAmt)}</td>
                          </tr>
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Administrativos y generales</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(admAmt)}</td>
                            <td className="py-2 text-right text-steel-400">{pct(admAmt)}</td>
                          </tr>
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Otros pagos realizados</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(otroAmt)}</td>
                            <td className="py-2 text-right text-steel-400">{pct(otroAmt)}</td>
                          </tr>
                          {sinClasAmt > 0 && (
                            <tr className="hover:bg-amber-50/50">
                              <td className="py-2 text-amber-700 italic">⚠ Por conciliar con fuente</td>
                              <td className="py-2 text-right font-semibold text-amber-700">{formatCOP(sinClasAmt)}</td>
                              <td className="py-2 text-right text-amber-500">{pct(sinClasAmt)}</td>
                            </tr>
                          )}
                          <tr className="bg-steel-50 font-semibold border-t-2 border-steel-300">
                            <td className="py-2 text-steel-700">Total Ejecutado (ACWP)</td>
                            <td className="py-2 text-right text-steel-900">{formatCOP(dynamicCPI.ac)}</td>
                            <td className="py-2 text-right text-steel-600">100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Proyeccion de costo total */}
                {(() => {
                  const bd = apiData?.earned_value?.breakdown || {};
                  const eacMat = bd.eac_materiales || 0;
                  const eacMo = bd.eac_mano_obra || 0;
                  const eacAdm = bd.eac_administrativo || 0;
                  const eacInt = bd.eac_intereses || 0;
                  const totalEac = eacConFin > 0 ? eacConFin : 1;
                  return (
                    <div>
                      <p className="text-xs font-bold text-steel-700 mb-2 flex items-center gap-1.5">
                        <BarChart2 className="h-3.5 w-3.5 text-primary-500" /> Proyeccion Costo Total a Terminacion (EAC)
                      </p>
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-steel-100">
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Materiales</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(eacMat)}</td>
                            <td className="py-2 text-right text-steel-400">{(eacMat / totalEac * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Mano de Obra</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(eacMo)}</td>
                            <td className="py-2 text-right text-steel-400">{(eacMo / totalEac * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600">Administrativos</td>
                            <td className="py-2 text-right font-semibold text-steel-800">{formatCOP(eacAdm)}</td>
                            <td className="py-2 text-right text-steel-400">{(eacAdm / totalEac * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="hover:bg-steel-50">
                            <td className="py-2 text-steel-600 text-red-500">Intereses credito puente</td>
                            <td className="py-2 text-right font-semibold text-red-600">{formatCOP(eacInt)}</td>
                            <td className="py-2 text-right text-steel-400">{(eacInt / totalEac * 100).toFixed(1)}%</td>
                          </tr>
                          <tr className="border-t-2 border-primary-200 bg-primary-50 font-bold">
                            <td className="py-2.5 text-primary-800">EAC Total (Caso de Negocio)</td>
                            <td className="py-2.5 text-right text-primary-900">{formatCOP(eacConFin)}</td>
                            <td className="py-2.5 text-right text-primary-700">100%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  );
                })()}

                {/* Vs presupuesto */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-steel-50 border border-steel-200 p-3 text-center">
                    <p className="text-[10px] text-steel-400 font-medium uppercase">Presupuesto Directo</p>
                    <p className="text-lg font-bold text-steel-700 mt-1">{formatCOP(eacSinFin)}</p>
                    <p className="text-[10px] text-steel-400">Caso de Negocio</p>
                  </div>
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-center">
                    <p className="text-[10px] text-emerald-600 font-medium uppercase">Ahorro Proyectado</p>
                    <p className="text-lg font-bold text-emerald-700 mt-1">{formatCOP(utilidadProyectada)}</p>
                    <p className="text-[10px] text-emerald-500">vs presupuesto</p>
                  </div>
                  <div className="rounded-xl bg-primary-50 border border-primary-200 p-3 text-center">
                    <p className="text-[10px] text-primary-600 font-medium uppercase">Utilidad Proyectada</p>
                    <p className="text-lg font-bold text-primary-800 mt-1">{margenProyectado.toFixed(1)}%</p>
                    <p className="text-[10px] text-primary-400">vs 28.2% original</p>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 border border-amber-200 p-3">
                  <p className="text-[11px] text-amber-800 font-semibold">Nota Gerencial</p>
                  <p className="text-[11px] text-amber-700 mt-1 leading-relaxed">
                    Los valores proyectados del <strong>Costo Estimado Final (EAC)</strong> provienen del Caso de Negocio (Pagos Proyeccion Patio Sur). El costo real actual representa solo el <strong>{data.budget_summary.consumption_percentage}%</strong> del total proyectado — el grueso de los pagos de materiales esta programado entre Abr–Sep 2026.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* SPI Detail Modal */}
      {showSPIDetail && (
        <>
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowSPIDetail(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowSPIDetail(false)}>
            <div role="dialog" aria-modal="true" aria-labelledby="modal-spi-title" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-steel-200 bg-gradient-to-r from-amber-700 to-amber-600 rounded-t-2xl">
                <div>
                  <h3 id="modal-spi-title" className="text-base font-bold text-white">SPI — Indice de Rendimiento del Cronograma</h3>
                  <p className="text-xs text-amber-200 mt-0.5">Real vs Proyectado (Caso de Negocio · Curva S 19 mar)</p>
                </div>
                <button onClick={() => setShowSPIDetail(false)} aria-label="Cerrar modal" className="p-1.5 rounded-lg hover:bg-white/10 text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <X className="h-5 w-5" />
                </button>
              </div>
              {/* Content */}
              <div className="p-6 space-y-5">
                {/* SPI Real Card */}
                <div className={`rounded-xl border-2 p-5 text-center ${dynamicSPI.spi >= 1 ? 'border-emerald-300 bg-emerald-50' : 'border-amber-300 bg-amber-50'}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-wider ${dynamicSPI.spi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>SPI Real ({dynamicSPI.weekLabel})</p>
                  <p className={`text-[10px] mb-1 ${dynamicSPI.spi >= 1 ? 'text-emerald-500' : 'text-amber-500'}`}>vs Linea Base Revisada (19 Mar)</p>
                  <p className={`text-5xl font-black ${dynamicSPI.spi >= 1 ? 'text-emerald-700' : 'text-amber-700'}`}>{dynamicSPI.spi.toFixed(2)}</p>
                  <p className={`text-xs mt-2 font-bold rounded-lg px-2 py-1 inline-block ${dynamicSPI.spi >= 1 ? 'text-emerald-600 bg-emerald-100' : 'text-amber-600 bg-amber-100'}`}>
                    {dynamicSPI.spi >= 1 ? '✓ En Tiempo' : `⚠ ${Math.abs(dynamicSPI.desviacion).toFixed(1)}% Atrasado`}
                  </p>
                  <p className={`text-[10px] mt-2 ${dynamicSPI.spi >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    EV ${(dynamicSPI.evAmount / 1e6).toFixed(0)}M / PV ${(dynamicSPI.pvAmount / 1e6).toFixed(0)}M
                  </p>
                </div>

                {/* Detalle del cronograma */}
                <div>
                  <p className="text-xs font-bold text-steel-700 mb-3 flex items-center gap-1.5">
                    <CalendarClock className="h-3.5 w-3.5 text-steel-500" /> Detalle del Cronograma
                  </p>
                  <div className={`rounded-lg border p-3 ${dynamicSPI.spi >= 1 ? 'border-emerald-200 bg-emerald-50/60' : 'border-amber-200 bg-amber-50/60'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className={`text-xs font-bold ${dynamicSPI.spi >= 1 ? 'text-emerald-700' : 'text-amber-700'}`}>Linea Base Revisada (Re-Baseline)</p>
                      <span className={`text-[10px] font-semibold rounded px-2 py-0.5 ${dynamicSPI.spi >= 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>SPI = {dynamicSPI.spi.toFixed(2)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <p className="text-steel-400">Inicio</p>
                        <p className="font-semibold text-steel-700">20 Jun 2025</p>
                      </div>
                      <div>
                        <p className="text-steel-400">Duracion</p>
                        <p className="font-semibold text-steel-700">453 dias</p>
                      </div>
                      <div>
                        <p className="text-steel-400">Fin Revisado</p>
                        <p className={`font-semibold ${dynamicSPI.spi >= 1 ? 'text-emerald-700' : 'text-amber-700'}`}>16 Sep 2026</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[10px] text-steel-500 mb-1">
                        <span>Avance planificado ({dynamicSPI.weekLabel})</span>
                        <span className="font-semibold">{dynamicSPI.prog.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-steel-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-primary-500 h-full rounded-full" style={{ width: `${dynamicSPI.prog}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-steel-500 mt-1 mb-1">
                        <span>Avance real ({dynamicSPI.weekLabel}, {dynamicSPI.weekDate})</span>
                        <span className={`font-semibold ${dynamicSPI.spi >= 1 ? 'text-emerald-700' : 'text-amber-700'}`}>{dynamicSPI.real.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-steel-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-full rounded-full ${dynamicSPI.spi >= 1 ? 'bg-emerald-600' : 'bg-amber-500'}`} style={{ width: `${dynamicSPI.real}%` }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Nota */}
                <div className="rounded-xl bg-steel-50 border border-steel-200 p-4">
                  <p className="text-[11px] text-steel-600 leading-relaxed">
                    El SPI se calcula como <strong>Avance Real / Avance Programado</strong> de la Curva S (Linea Base Revisada 19 Mar). Los valores se actualizan automaticamente con los cortes semanales registrados en el Cronograma.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      </div>
    </ProjectProvider>
  );
}
