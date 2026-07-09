/**
 * AlertsPage.tsx — Sistema de alertas segmentado por área gerencial.
 * Las alertas son dinámicas: se recalculan con Cronograma + Caso de Negocio.
 * Organización: 5 segmentos ordenados por prioridad de impacto.
 */
import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertTriangle, AlertCircle, ArrowLeft, Info,
  CheckCircle, ChevronDown, ChevronRight, Zap,
  TrendingDown, Clock, DollarSign, Landmark, Truck,
  Plus, Trash2, X, Send,
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore } from '@/stores/authStore';

import HelpButton from '@/components/common/HelpButton';
import {
  generateAlerts, groupBySegment, ALL_SEGMENTS,
  SEGMENT_META, type ProjectAlert, type AlertSegment, type AlertSeverity,
} from '@/utils/generateAlerts';
import apiClient from '@/services/api/client';
import { cronogramaApi, CronogramaCorte } from '@/services/api/cronograma';


// ── Help config ───────────────────────────────────────────────
const alertsHelp = {
  pageTitle: 'Alertas del Proyecto — Guía',
  description: 'Sistema de alertas por segmento gerencial para el proyecto Patio Sur OE1035. Cada alerta incluye el indicador, su importancia estratégica, impacto concreto y recomendación de acción.',
  sections: [
    {
      title: 'Niveles de severidad',
      items: [
        { color: '#DC2626', label: 'Crítica', description: 'Requiere acción inmediata. Impacto alto en costo, plazo o cumplimiento contractual.' },
        { color: '#D97706', label: 'Advertencia', description: 'Riesgo identificado que debe monitorearse. Puede escalar si no se atiende oportunamente.' },
        { color: '#3B82F6', label: 'Informativa', description: 'Datos de contexto relevantes. No requieren acción inmediata pero apoyan la toma de decisiones.' },
      ],
    },
    {
      title: 'Segmentos por prioridad gerencial',
      items: [
        { icon: '🕐', label: 'CRONOGRAMA', description: 'Desviaciones de plazo. Afectan cumplimiento contractual y penalidades.' },
        { icon: '💰', label: 'COSTOS', description: 'EVM: CPI, VAC, ejecución presupuestal. Determinan la utilidad final.' },
        { icon: '🏦', label: 'FLUJO DE CAJA', description: 'Liquidez y financiación. Causa raíz de problemas operacionales.' },
        { icon: '📋', label: 'CONTRATO', description: 'Cumplimiento legal y exposición contractual con Transmilenio S.A.' },
        { icon: '🚚', label: 'PROCURA', description: 'Compras pendientes y riesgo de variación de precios en materiales.' },
      ],
    },
  ],
};

// ── Shared utilities ──────────────────────────────────────────
function loadEAC(projectId: string) {
  // Los valores reales vendrán del businessCaseAPI
  return { sinFin: 0, conFin: 0 };
}


// ── Severity config ───────────────────────────────────────────
const SEV = {
  critical: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    badgeLabel: 'CRÍTICA',
    border: 'border-l-4 border-l-red-500',
    icon: 'bg-red-100 text-red-600',
    metric: 'text-red-600',
    dot: 'bg-red-500',
    pulse: true,
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    badgeLabel: 'ADVERTENCIA',
    border: 'border-l-4 border-l-amber-500',
    icon: 'bg-amber-100 text-amber-600',
    metric: 'text-amber-600',
    dot: 'bg-amber-500',
    pulse: false,
  },
  info: {
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    badgeLabel: 'INFORMATIVA',
    border: 'border-l-4 border-l-blue-400',
    icon: 'bg-blue-100 text-blue-600',
    metric: 'text-blue-600',
    dot: 'bg-blue-400',
    pulse: false,
  },
};

const SEGMENT_ICON_MAP: Record<AlertSegment, React.ComponentType<any>> = {
  CRONOGRAMA: Clock,
  COSTOS: DollarSign,
  'FLUJO DE CAJA': Landmark,
  CONTRATO: AlertTriangle,
  PROCURA: Truck,
};

// ── Alert Card ────────────────────────────────────────────────
function AlertCard({ alert: alertData, projectId, onUpdate }: { alert: ProjectAlert; projectId: string; onUpdate?: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const user = useAuthStore(s => s.user);
  const canManage = user?.role === 'administrador' || user?.role === 'gerente';

  const sev = SEV[alertData.severity] || SEV.info;
  const SegIcon = SEGMENT_ICON_MAP[alertData.segment] || Info;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!alertData.id || alertData.isDynamic) return;
    if (!window.confirm('¿Estás seguro de eliminar esta alerta manual?')) return;

    setIsDeleting(true);
    try {
      await apiClient.delete(`/projects/${projectId}/alerts/${alertData.id}`);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Error al eliminar alerta:', err);
      window.alert('Error al eliminar la alerta');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={clsx(
      'rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm overflow-hidden transition-all hover:shadow-md relative', 
      sev.border,
      isDeleting && 'opacity-50 pointer-events-none'
    )}>
      {/* Delete Button (Only for manual alerts & authorized users) */}
      {!alertData.isDynamic && canManage && (
        <button
          onClick={handleDelete}
          className="absolute top-2 right-10 p-1.5 text-steel-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors z-10"
          title="Eliminar alerta manual"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}

      {/* Main row */}
      <button
        type="button"
        className="w-full text-left px-5 py-4 flex items-start gap-4"
        onClick={() => setExpanded(v => !v)}
      >
        <div className={clsx('rounded-xl p-2.5 flex-shrink-0 mt-0.5', sev.icon)}>
          <SegIcon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span className={clsx('text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border', sev.badge)}>
              {sev.badgeLabel}
            </span>
            {alertData.isDynamic && (
              <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                <Zap className="h-2.5 w-2.5" /> DINÁMICA
              </span>
            )}
            <span className="text-[9px] text-steel-400 dark:text-steel-500 ml-auto">Fuente: {alertData.source}</span>
          </div>
          <h3 className="text-[13px] font-bold text-steel-900 dark:text-white leading-snug pr-4">{alertData.title}</h3>
          <p className="text-[11px] text-steel-500 dark:text-steel-400 mt-1 leading-relaxed line-clamp-2">{alertData.description}</p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-3 ml-2">
          {alertData.metric && (
            <div className="text-right hidden sm:block">
              <p className={clsx('text-lg font-black', sev.metric)}>{alertData.metric}</p>
              <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">{alertData.metric_label}</p>
            </div>
          )}
          <div className="text-steel-400 dark:text-steel-500">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-3 border-t border-steel-100 dark:border-steel-700/50 pt-4">
          <p className="text-[11px] text-steel-600 dark:text-steel-300 leading-relaxed">{alertData.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Por qué importa */}
            <div className="md:col-span-3 rounded-lg bg-primary-50/60 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-800 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Info className="h-3.5 w-3.5 text-primary-500" />
                <p className="text-[10px] font-bold text-primary-700 dark:text-primary-300 uppercase tracking-wide">¿Por qué importa?</p>
              </div>
              <p className="text-[11px] text-primary-900 dark:text-primary-200 leading-relaxed">{alertData.whyItMatters}</p>
            </div>

            {/* Impacto */}
            <div className="rounded-lg bg-red-50/60 dark:bg-red-950/30 border border-red-100 dark:border-red-800 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertCircle className="h-3.5 w-3.5 text-red-500" />
                <p className="text-[10px] font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wide">Impacto</p>
              </div>
              <p className="text-[11px] text-steel-700 dark:text-steel-200 leading-relaxed">{alertData.impact}</p>
            </div>

            {/* Recomendación */}
            <div className="md:col-span-2 rounded-lg bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-800 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                <p className="text-[10px] font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wide">Recomendación</p>
              </div>
              <p className="text-[11px] text-steel-700 dark:text-steel-200 leading-relaxed">{alertData.recommendation}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Segment Section ───────────────────────────────────────────
function SegmentSection({ segment, alerts, projectId, onUpdate }: { segment: AlertSegment; alerts: ProjectAlert[]; projectId: string; onUpdate?: () => void }) {
  const [open, setOpen] = useState(true);
  const meta = SEGMENT_META[segment];
  const SegIcon = SEGMENT_ICON_MAP[segment];
  const criticals = alerts.filter(a => a.severity === 'critical').length;
  const warnings = alerts.filter(a => a.severity === 'warning').length;

  const segmentIdMap: Record<string, string> = {
    'CRONOGRAMA': 'alertas-cronograma',
    'COSTOS': 'alertas-costos',
    'FLUJO DE CAJA': 'alertas-flujo-caja',
    'CONTRATO': 'alertas-contrato',
    'PROCURA': 'alertas-procura',
  };

  return (
    <div id={segmentIdMap[segment]} className={clsx('rounded-2xl border-2 overflow-hidden', meta.borderColor)}>
      {/* Segment header */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={clsx('w-full text-left flex items-start gap-4 px-6 py-4', meta.bgColor, 'hover:brightness-95 transition')}
      >
        <div className={clsx('rounded-xl p-2.5 flex-shrink-0', meta.bgColor, 'border', meta.borderColor)}>
          <SegIcon className={clsx('h-5 w-5', meta.color)} />
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-base font-black text-steel-900 dark:text-white">{meta.icon} {segment}</span>
            <span className={clsx('text-[10px] font-bold border rounded-full px-2 py-0.5', meta.badgeClass)}>
              {alerts.length} alerta{alerts.length !== 1 ? 's' : ''}
            </span>
            {criticals > 0 && (
              <span className="flex items-center gap-1 text-[9px] font-bold text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                {criticals} crítica{criticals !== 1 ? 's' : ''}
              </span>
            )}
            {warnings > 0 && (
              <span className="text-[9px] font-bold text-amber-700 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-full">
                {warnings} advert.
              </span>
            )}
          </div>
          <p className="text-[11px] text-steel-500 dark:text-steel-400">{meta.description}</p>
        </div>

        <div className="text-steel-400 dark:text-steel-500 flex-shrink-0 mt-1">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {/* Why it matters banner */}
      {open && (
        <div className="px-6 py-3 bg-white dark:bg-steel-800 border-t border-b border-steel-200 dark:border-steel-700">
          <div className="flex items-start gap-2">
            <TrendingDown className={clsx('h-3.5 w-3.5 flex-shrink-0 mt-0.5', meta.color)} />
            <p className="text-[11px] text-steel-600 dark:text-steel-300 leading-relaxed">
              <span className={clsx('font-bold', meta.color)}>¿Por qué este segmento es prioritario?</span>{' '}
              {meta.whyItMatters}
            </p>
          </div>
        </div>
      )}

      {/* Alert list */}
      {open && (
        <div className="px-5 py-4 space-y-3 bg-white dark:bg-steel-900">
          {alerts.length === 0 ? (
            <div className="py-8 text-center border-2 border-dashed border-steel-100 dark:border-steel-800 rounded-xl">
              <Info className="h-8 w-8 text-steel-200 dark:text-steel-700 mx-auto mb-2" />
              <p className="text-xs text-steel-400">No hay alertas en este segmento.</p>
            </div>
          ) : (
            alerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} projectId={projectId} onUpdate={onUpdate} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function AlertsPage() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const { projectId = '' } = useParams<{ projectId: string }>();

  const segmentIdMap: Record<string, string> = {
    'CRONOGRAMA': 'alertas-cronograma',
    'COSTOS': 'alertas-costos',
    'FLUJO DE CAJA': 'alertas-flujo-caja',
    'CONTRATO': 'alertas-contrato',
    'PROCURA': 'alertas-procura',
  };

  const scrollToSeccion = (id: string) => {
    const elemento = document.getElementById(id);
    if (elemento) {
      elemento.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  const [cortesDashboard, setCortesDashboard] = useState<CronogramaCorte[]>([]);
  const [eacData, setEacData] = useState(() => loadEAC(projectId));
  const [manualAlerts, setManualAlerts] = useState<ProjectAlert[]>([]);
  const [isLoadingManual, setIsLoadingManual] = useState(false);

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newAlert, setNewAlert] = useState({
    title: '',
    description: '',
    severity: 'warning' as AlertSeverity,
    segment: 'CRONOGRAMA' as AlertSegment,
    why_it_matters: '',
    impact: '',
    recommendation: '',
    metric: '',
    metric_label: ''
  });

  const fetchManualAlerts = async () => {
    setIsLoadingManual(true);
    try {
      const res = await apiClient.get(`/projects/${projectId}/alerts`);
      const data = res.data.map((a: any) => ({
        id: a.id,
        segment: a.segment,
        severity: a.severity,
        title: a.title,
        description: a.description,
        whyItMatters: a.why_it_matters || '',
        impact: a.impact || '',
        recommendation: a.recommendation || '',
        metric: a.metric,
        metric_label: a.metric_label,
        source: a.source || 'Manual',
        priority: 10, // Manual alerts have lower priority than system ones by default
        isDynamic: false
      }));
      setManualAlerts(data);
    } catch (err) {
      console.error('Error al cargar alertas manuales:', err);
    } finally {
      setIsLoadingManual(false);
    }
  };

  useEffect(() => {
    setEacData(loadEAC(projectId));
    fetchManualAlerts();

    cronogramaApi.listCortes(projectId)
      .then(data => setCortesDashboard(data))
      .catch(() => {});

    apiClient.get(`/preferences/${projectId}_eac_caso_negocio`)
      .then(res => {
        if (res.data && Object.keys(res.data).length > 0) {
          setEacData(res.data);
        }
      }).catch(() => {});
  }, [projectId]);

  const dynamicSPI = useMemo(() => {
    const withEjecutado = cortesDashboard
      .filter(c => c.avance_ejecutado !== null)
      .sort((a, b) => b.semana - a.semana);

    if (withEjecutado.length === 0) {
      return {
        weekLabel: 'S-00',
        weekDate: 'Sin iniciar',
        weekNum: 0,
        prog: 0,
        real: 0,
        spi: 0,
        desviacion: 0,
      };
    }

    const ultimo = withEjecutado[0];
    const latestProg = Number(ultimo.avance_planeado);
    let latestReal = Number(ultimo.avance_ejecutado);



    const spi = latestProg > 0 ? latestReal / latestProg : 0;
    const dateStr = ultimo.fecha_corte
      ? new Date(ultimo.fecha_corte).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' })
      : '—';
    return {
      weekLabel: `S-${ultimo.semana.toString().padStart(2, '0')}`,
      weekDate: dateStr,
      weekNum: ultimo.semana,
      prog: latestProg,
      real: latestReal,
      spi: Math.round(spi * 100) / 100,
      desviacion: Math.round((latestReal - latestProg) * 10) / 10,
    };
  }, [cortesDashboard]);

  // CPI dinámico
  const dynamicCPI = useMemo(() => {
    // ✅ CORREGIDO: No hardcodear BAC ni AC
    // Estos valores deben venir desde businessCaseAPI o projectsAPI
    // Fallback: retornar 0 si no hay datos
    const bac = 0;  // Cargar dinámicamente desde businessCaseAPI.getFull(projectId)
    const ac = 0;   // Cargar dinámicamente desde projectsAPI
    const ev = bac * dynamicSPI.real / 100;
    const cpi = ac > 0 ? ev / ac : 0;
    const eacConFin = eacData.conFin || bac;
    return { cpi: Math.round(cpi * 100) / 100, ev, ac, eacConFin };
  }, [dynamicSPI, eacData]);

  // Generar alertas
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

  const alerts = useMemo(() => [...dynamicAlerts, ...manualAlerts], [dynamicAlerts, manualAlerts]);

  const grouped = useMemo(() => groupBySegment(alerts), [alerts]);

  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  const infoCount = alerts.filter(a => a.severity === 'info').length;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(`/projects/${projectId}/dashboard`)}
        className="flex items-center gap-2 text-sm text-steel-500 dark:text-steel-400 hover:text-primary-600 transition group"
      >
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" />
        Dashboard
      </button>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-steel-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            Alertas del Proyecto
          </h1>
          <p className="text-sm text-steel-500 dark:text-steel-400 mt-1">
            {projectId} ·{' '}
            <span className="font-semibold">{alerts.length} alertas activas</span> ·{' '}
            5 segmentos gerenciales ·{' '}
            Semana {dynamicSPI.weekLabel} ({dynamicSPI.weekDate})
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <HelpButton {...alertsHelp} />
          
          {/* Add Alert Button (Admin/Gerente only) */}
          {(user?.role === 'administrador' || user?.role === 'gerente') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
            >
              <Plus className="h-4 w-4" />
              Nueva Alerta
            </button>
          )}

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-50 border border-red-200">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
            </span>
            <span className="text-sm font-bold text-red-700">{criticalCount}</span>
            <span className="text-xs text-red-600">Críticas</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-sm font-bold text-amber-700">{warningCount}</span>
            <span className="text-xs text-amber-600">Advert.</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200">
            <span className="h-2 w-2 rounded-full bg-blue-400" />
            <span className="text-sm font-bold text-blue-700">{infoCount}</span>
            <span className="text-xs text-blue-600">Inform.</span>
          </div>
        </div>
      </div>

      {/* Resumen ejecutivo por segmento */}
      <div className="grid grid-cols-5 gap-2">
        {ALL_SEGMENTS.map(seg => {
          const segAlerts = grouped[seg] ?? [];
          const hasCritical = segAlerts.some(a => a.severity === 'critical');
          const hasWarning = segAlerts.some(a => a.severity === 'warning');
          const meta = SEGMENT_META[seg];
          const SegIcon = SEGMENT_ICON_MAP[seg];
          return (
            <div
              key={seg}
              onClick={() => scrollToSeccion(segmentIdMap[seg])}
              className={clsx(
                'rounded-xl border-2 p-3 text-center cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] active:scale-95',
                hasCritical ? 'border-red-400 bg-red-50' : hasWarning ? 'border-amber-300 bg-amber-50' : `${meta.borderColor} ${meta.bgColor}`,
              )}
            >
              <SegIcon className={clsx('h-5 w-5 mx-auto mb-1.5', hasCritical ? 'text-red-600' : hasWarning ? 'text-amber-600' : meta.color)} />
              <p className={clsx('text-[9px] font-bold uppercase tracking-wide leading-tight', hasCritical ? 'text-red-700' : hasWarning ? 'text-amber-700' : meta.color)}>
                {seg}
              </p>
              <p className="text-xl font-black mt-1 text-steel-900 dark:text-white">{segAlerts.length}</p>
              <p className={clsx('text-[9px] font-semibold mt-0.5', hasCritical ? 'text-red-600' : hasWarning ? 'text-amber-600' : 'text-steel-400')}>
                {hasCritical ? `${segAlerts.filter(a => a.severity === 'critical').length} crítica(s)` : hasWarning ? 'advertencia' : 'al día'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Segmentos */}
      <div className="space-y-5">
        {ALL_SEGMENTS.map(seg => (
          <SegmentSection key={seg} segment={seg} alerts={grouped[seg] ?? []} projectId={projectId} onUpdate={fetchManualAlerts} />
        ))}
      </div>

      {/* Modal Nueva Alerta */}
      {showAddModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-steel-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-steel-900 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden border border-steel-200 dark:border-steel-700 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between bg-steel-50/50 dark:bg-steel-950/50">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary-100 dark:bg-primary-900/40 rounded-xl text-primary-600">
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-steel-900 dark:text-white">Nueva Alerta Manual</h2>
                  <p className="text-[11px] text-steel-500">Cree una alerta estratégica para el equipo gerencial.</p>
                </div>
              </div>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-steel-100 dark:hover:bg-steel-800 rounded-full transition-colors">
                <X className="h-5 w-5 text-steel-400" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Título de la Alerta *</label>
                  <input
                    type="text"
                    value={newAlert.title}
                    onChange={e => setNewAlert({ ...newAlert, title: e.target.value })}
                    placeholder="Ej: Retraso en entrega de transformadores..."
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Segmento Gerencial *</label>
                  <select
                    value={newAlert.segment}
                    onChange={e => setNewAlert({ ...newAlert, segment: e.target.value as AlertSegment })}
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm outline-none"
                  >
                    {ALL_SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Severidad *</label>
                  <select
                    value={newAlert.severity}
                    onChange={e => setNewAlert({ ...newAlert, severity: e.target.value as AlertSeverity })}
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm outline-none"
                  >
                    <option value="critical">CRÍTICA (Rojo)</option>
                    <option value="warning">ADVERTENCIA (Ámbar)</option>
                    <option value="info">INFORMATIVA (Azul)</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Descripción Detallada *</label>
                  <textarea
                    rows={3}
                    value={newAlert.description}
                    onChange={e => setNewAlert({ ...newAlert, description: e.target.value })}
                    placeholder="Explique el contexto de la alerta..."
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Valor Indicador (Opcional)</label>
                  <input
                    type="text"
                    value={newAlert.metric}
                    onChange={e => setNewAlert({ ...newAlert, metric: e.target.value })}
                    placeholder="Ej: 0.85 o +15d"
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Etiqueta Valor</label>
                  <input
                    type="text"
                    value={newAlert.metric_label}
                    onChange={e => setNewAlert({ ...newAlert, metric_label: e.target.value })}
                    placeholder="Ej: SPI o Retraso"
                    className="w-full px-4 py-2.5 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-sm outline-none"
                  />
                </div>

                <div className="col-span-2 border-t border-steel-100 dark:border-steel-800 pt-4 mt-2">
                  <p className="text-[10px] font-bold text-primary-600 uppercase mb-3 ml-1 tracking-wider">Detalles Estratégicos (Para el Gerente)</p>
                </div>

                <div className="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">¿Por qué importa?</label>
                    <textarea
                      rows={2}
                      value={newAlert.why_it_matters}
                      onChange={e => setNewAlert({ ...newAlert, why_it_matters: e.target.value })}
                      className="w-full px-4 py-2 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Impacto Proyectado</label>
                    <textarea
                      rows={2}
                      value={newAlert.impact}
                      onChange={e => setNewAlert({ ...newAlert, impact: e.target.value })}
                      className="w-full px-4 py-2 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-steel-500 uppercase mb-1.5 ml-1">Recomendación de Acción</label>
                    <textarea
                      rows={2}
                      value={newAlert.recommendation}
                      onChange={e => setNewAlert({ ...newAlert, recommendation: e.target.value })}
                      className="w-full px-4 py-2 bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-steel-100 dark:border-steel-800 bg-steel-50 dark:bg-steel-950/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-bold text-steel-500 hover:text-steel-700 transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={!newAlert.title || !newAlert.description || isSubmitting}
                onClick={async () => {
                  setIsSubmitting(true);
                  try {
                    await apiClient.post(`/projects/${projectId}/alerts`, newAlert);
                    await fetchManualAlerts();
                    setShowAddModal(false);
                    setNewAlert({
                      title: '', description: '', severity: 'warning', segment: 'CRONOGRAMA',
                      why_it_matters: '', impact: '', recommendation: '', metric: '', metric_label: ''
                    });
                  } catch (err) {
                    console.error('Error al crear alerta:', err);
                    alert('Error al crear la alerta');
                  } finally {
                    setIsSubmitting(false);
                  }
                }}
                className="flex items-center gap-2 px-6 py-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:grayscale text-white rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
              >
                {isSubmitting ? 'Guardando...' : (
                  <>
                    <Send className="h-4 w-4" />
                    Publicar Alerta
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pie de página */}
      <div className="rounded-xl bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 p-4 space-y-1">
        <p className="text-[11px] text-steel-600 dark:text-steel-300 font-semibold">Fuentes de datos:</p>
        <p className="text-[11px] text-steel-500 dark:text-steel-400 leading-relaxed">
          Cronograma (Curva S Base Revisada 19 mar 2026) · Caso de Negocio (Detallado caso de negocio_220126.xlsx) ·
          Flujo de Caja (FC X OBRAS + Proyección de Pagos.xlsx) · Reporte de seguimiento semanal (7 mar 2026) ·
          Contrato OE 1035 — Otrosí No. 23. Las alertas de SPI y CPI se recalculan automáticamente con cada
          actualización del Cronograma. Las alertas marcadas <strong>DINÁMICA</strong> se actualizan en tiempo real.
        </p>
      </div>
    </div>
  );
}
