import { useParams, Outlet } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import {
  HardHat,
  LayoutDashboard,
  CalendarClock,
  BarChart2,
  TrendingUp,
  FileText,
  FolderOpen,
  BrainCircuit,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { projectsApi, EXCEL_PROJECTS_SEED } from '@/services/api/projects';
import { useProjectsTracking } from '@/data/projectsTracking';
import type { Project } from '@/types';
import { businessCaseAPI } from '@/services/api/businessCase';

// ─── Módulos del proyecto (arquitectura visible) ──────────────────────────────
const PROJECT_MODULES = [
  { icon: LayoutDashboard, label: 'Dashboard', desc: 'KPIs, EVM y avance general' },
  { icon: CalendarClock,  label: 'Cronograma',  desc: 'Curva S y semanas de avance' },
  { icon: TrendingUp,     label: 'Flujo de Caja', desc: 'Ingresos y egresos proyectados' },
  { icon: BarChart2,      label: 'Presupuesto',  desc: 'Control de costos y capítulos' },
  { icon: Calculator,     label: 'Caso de Negocio', desc: 'EAC, utilidad y financiación' },
  { icon: AlertTriangle,  label: 'Alertas',      desc: 'Riesgos y alertas activas' },
  { icon: FileText,       label: 'Reportes',     desc: 'Informes ejecutivos' },
  { icon: FolderOpen,     label: 'Documentos',   desc: 'Archivos del proyecto' },
  { icon: BrainCircuit,   label: 'Analizador IA', desc: 'Análisis inteligente' },
];

// ─── Status badge config ──────────────────────────────────────────────────────
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  planning:    { label: 'Planificación', color: 'bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-300 border-primary-200 dark:border-primary-800' },
  in_progress: { label: 'En Progreso',   color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
  on_hold:     { label: 'En Pausa',      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
  completed:   { label: 'Completado',    color: 'bg-steel-50 dark:bg-steel-800 text-steel-700 dark:text-steel-300 border-steel-200 dark:border-steel-600' },
  cancelled:   { label: 'Cancelado',     color: 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800' },
};

// ─── Placeholder page ─────────────────────────────────────────────────────────
function ProjectUnderConstruction({ project, trackingName, trackingCode, trackingClient }: { project?: Project; trackingName?: string; trackingCode?: string; trackingClient?: string }) {
  const displayName = project?.name || trackingName || 'Proyecto';
  const displayCode = project?.code || trackingCode;
  const displayClient = project?.client_name || trackingClient;
  const statusConfig = STATUS_LABELS[project?.status ?? 'planning'] ?? {
    label: project?.status ?? 'Sin estado',
    color: 'bg-steel-100 dark:bg-steel-800 text-steel-500 dark:text-steel-400 border-steel-200 dark:border-steel-700'
  };

  return (
    <div className="min-h-full flex flex-col items-center justify-start py-12 px-6 gap-8">

      {/* Header */}
      <div className="text-center max-w-xl">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-950/50 dark:to-primary-900/50 border-2 border-primary-300 dark:border-primary-700 shadow-lg mb-4">
          <HardHat className="h-10 w-10 text-primary-600 dark:text-primary-400" />
        </div>

        <h1 className="text-2xl font-bold text-steel-900 dark:text-white mb-1">
          {displayName}
        </h1>

        {(displayCode || project?.status) && (
          <div className="flex items-center justify-center gap-2 mb-3">
            {displayCode && (
              <span className="text-xs font-mono text-steel-500 dark:text-steel-400 bg-steel-100 dark:bg-steel-800 rounded px-2 py-0.5">
                {displayCode}
              </span>
            )}
            {project?.status && (
              <span className={`text-[10px] font-semibold border rounded-full px-2 py-0.5 ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            )}
          </div>
        )}
        {displayClient && (
          <p className="text-sm text-steel-500 mb-2">Cliente: <span className="font-semibold text-steel-700">{displayClient}</span></p>
        )}

        <p className="text-steel-500 dark:text-steel-400 text-sm leading-relaxed">
          Este proyecto está en proceso de configuración. La arquitectura del sistema y todos los módulos
          ya están disponibles. Los datos se activarán progresivamente a medida que se complete la información.
        </p>
      </div>

      {/* Info cards */}
      {project && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
          {project.client_name && (
            <div className="rounded-xl bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 shadow-sm px-4 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Cliente</p>
              <p className="text-sm font-semibold text-steel-800 dark:text-steel-100 truncate">{project.client_name}</p>
            </div>
          )}
          {project.start_date && (
            <div className="rounded-xl bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 shadow-sm px-4 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Inicio</p>
              <p className="text-sm font-semibold text-steel-800 dark:text-steel-100">{project.start_date}</p>
            </div>
          )}
          {project.total_budget > 0 && (
            <div className="rounded-xl bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 shadow-sm px-4 py-3 text-center">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Presupuesto</p>
              <p className="text-sm font-semibold text-primary-700 dark:text-primary-300">
                ${(project.total_budget / 1_000_000_000).toFixed(1)} MM
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modules grid — ghost / skeleton */}
      <div className="w-full max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-3 text-center">
          Módulos disponibles — en configuración
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {PROJECT_MODULES.map(({ icon: Icon, label, desc }) => (
            <div
              key={label}
              className="rounded-xl border border-steel-100 dark:border-steel-700/50 bg-steel-50/60 dark:bg-steel-800/40 p-4 flex flex-col gap-2 opacity-50 select-none"
            >
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-steel-200/50 dark:bg-steel-700/50">
                  <Icon className="h-4 w-4 text-steel-400 dark:text-steel-500" />
                </div>
                <span className="text-xs font-semibold text-steel-500 dark:text-steel-400">{label}</span>
              </div>
              <p className="text-[10px] text-steel-400 dark:text-steel-500 leading-snug">{desc}</p>
              <div className="h-1.5 bg-steel-200 dark:bg-steel-700 rounded-full w-3/4" />
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-steel-400 dark:text-steel-500 text-center max-w-md">
        Para activar un proyecto, importa sus datos desde el módulo <strong>Resumen</strong> o contacta al administrador del sistema.
      </p>
    </div>
  );
}

// ─── Guard principal ──────────────────────────────────────────────────────────
export default function ProjectGuard() {
  const { projectId } = useParams<{ projectId: string }>();
  const [trackingProjects] = useProjectsTracking();

  // Query pero con fallback muy tolerante
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      try {
        return await projectsApi.list();
      } catch (err) {
        console.warn('[ProjectGuard] API failed, using static seed as fallback');
        // Retornar los datos estáticos si la API falla
        return EXCEL_PROJECTS_SEED;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: 0,
    throwOnError: false,
  });

  const { data: bcStatus } = useQuery({
    queryKey: ['businessCaseStatus', projectId],
    queryFn: () => (projectId ? businessCaseAPI.getStatus(projectId) : null),
    enabled: !!projectId,
    staleTime: 1000 * 30,
  });

  const checkIsLyra = (id?: string): boolean => {
    if (!id) return false;
    const normalized = id.toLowerCase().replace(/[\s-]/g, '');
    return normalized === 'lyracarsanoe2000' || normalized === 'lyracarsan' || normalized === 'oe2000';
  };

  const checkIsPatioSur = (id?: string): boolean => {
    if (!id) return false;
    const normalized = id.toLowerCase().replace(/[\s-]/g, '');
    return normalized === 'patiosuroe1035' || normalized === 'patiosur' || normalized === 'oe1035';
  };

  const proyectoConfigurado = useMemo(() => {
    if (checkIsLyra(projectId) || checkIsPatioSur(projectId)) return true;
    if (!bcStatus) return false;
    const statusObj = (bcStatus as any).data || bcStatus;
    const ventaOK = statusObj.venta_excel_validado === true || statusObj.venta_excel_validado === 1;
    const costoOK = statusObj.costo_excel_validado === true || statusObj.costo_excel_validado === 1;
    return ventaOK && costoOK;
  }, [bcStatus, projectId]);

  const isActiveProject = proyectoConfigurado;

  // ✅ NUEVO: Permitir acceso al Presupuesto y Dashboard para todos los proyectos
  // para que el usuario pueda empezar a configurar datos.
  const location = window.location.pathname;
  // Allow access to financial dashboard and business case for all projects
  const isDashboardOrBusinessCase = location.includes('/dashboard') || location.includes('/business-case');
  if (isActiveProject || isDashboardOrBusinessCase) {
    return <Outlet />;
  }

  // Para cualquier otro proyecto, mostrar el placeholder con la info disponible
  // Los datos pueden venir de API o del fallback estático
  const project = projects.find((p: Project) => p.id === projectId);
  const tracking = trackingProjects.find(p => p.id === projectId);

  return (
    <ProjectUnderConstruction
      project={project}
      trackingName={tracking?.nombre_proyecto || tracking?.sheet_name}
      trackingCode={tracking?.codigo_proyecto ?? undefined}
      trackingClient={tracking?.cliente ?? undefined}
    />
  );
}
