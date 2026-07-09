import { useMemo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Building2,
  ChevronRight,
  Filter,
  CheckCircle2,
  AlertCircle,
  Activity,
  Zap,
  Users,
  DollarSign,
  CalendarDays,
  Paperclip,
  FileText,
  FileSpreadsheet,
  File,
  Image,
  Download,
  Check,
  Eye,
  Trash2,
  Plus,
  RotateCcw,
} from 'lucide-react';
import clsx from 'clsx';
import { useProjectsTracking, projectStatus } from '@/data/projectsTracking';
import NewProjectModal from '@/components/projects/NewProjectModal';
import { CATEGORIES_MAP, useDocuments } from '@/data/documentsData';
import { useProjectFiles } from '@/hooks/useProjectFiles';
import { useAuthStore } from '@/stores/authStore';
import type { ProjectTracking } from '@/data/projectsTracking';
import { cronogramaApi, CronogramaCorte } from '@/services/api/cronograma';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/client';
import { useToastStore } from '@/components/common/Toast';
import Modal from '@/components/ui/Modal';

// ─── Helpers ──────────────────────────────────────────────────────────────────
function checkIsPatioSur(id?: string): boolean {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/[\s-]/g, '');
  return (
    normalized === 'patiosuroe1035' || 
    normalized === 'oe1035' || 
    normalized === 'patio-sur-oe1035' ||
    normalized === 'patiosur'
  );
}

function formatBudget(val: number | null): string {
  if (!val) return '—';
  return '$ ' + val.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

function computeSPI(prog: number | null, real: number | null): number | null {
  if (prog == null || real == null || prog === 0) return null;
  return Math.round((real / prog) * 100) / 100;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  completado:  { label: 'Completado',  bg: 'bg-emerald-50 dark:bg-emerald-950/30',  text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-700' },
  en_progreso: { label: 'En Progreso', bg: 'bg-primary-50 dark:bg-primary-950/30',  text: 'text-primary-700 dark:text-primary-300',  border: 'border-primary-200 dark:border-primary-700' },
  atrasado:    { label: 'Atrasado',    bg: 'bg-amber-50 dark:bg-amber-950/30',    text: 'text-amber-700 dark:text-amber-300',    border: 'border-amber-200 dark:border-amber-700' },
  sin_datos:   { label: 'Sin Datos',   bg: 'bg-steel-50 dark:bg-steel-700',    text: 'text-steel-500 dark:text-steel-400',    border: 'border-steel-200 dark:border-steel-600' },
  eliminado:   { label: 'Eliminado',   bg: 'bg-red-50 dark:bg-red-950/30',      text: 'text-red-700 dark:text-red-300',      border: 'border-red-200 dark:border-red-700' },
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ProjectsPage() {
  const navigate = useNavigate();
  const [projects, setProjects, , createProject, refresh] = useProjectsTracking();
  const user = useAuthStore((s) => s.user);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [companyFilter, setCompanyFilter] = useState<'todos' | 'PCM' | 'PCS' | 'CARSAN'>('todos');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Estados para eliminación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [proyectoAEliminar, setProyectoAEliminar] = useState<ProjectTracking | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const { showToast } = useToastStore();

  // ── Normalización para búsqueda robusta (quita acentos/eñes) ──
  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const userProjects = useMemo(() => {
    let list = [...projects];

    if (user) {
      // Filtro por Directores
      if (user.allowed_directors !== 'ALL') {
        if (Array.isArray(user.allowed_directors)) {
          const allowed = user.allowed_directors.map(d => normalize(d));
          list = list.filter(p => {
            const d = normalize(p.director_proyectos || '');
            const i = normalize(p.ingeniero_residente || '');
            return allowed.some(a => (d && d.includes(a)) || (i && i.includes(a)));
          });
        } else if (['director_proyectos', 'ingeniero_residente'].includes(user.role)) {
          const uName = normalize(user.full_name);
          list = list.filter(p => {
            const d = normalize(p.director_proyectos || '');
            const i = normalize(p.ingeniero_residente || '');
            return (d && d.includes(uName)) || (i && i.includes(uName));
          });
        }
      }

      // Filtro por Proyectos
      if (user.allowed_projects !== 'ALL') {
        if (Array.isArray(user.allowed_projects)) {
          list = list.filter(p => user.allowed_projects?.includes(p.id));
        }
      }
    }
    return list;
  }, [projects, user]);

  const filteredProjects = useMemo(() => {
    let list = [...userProjects];

    // 2. Filtro de estado
    if (statusFilter !== 'all') {
      list = list.filter(p => projectStatus(p) === statusFilter);
    } else {
      list = list.filter(p => projectStatus(p) !== 'eliminado');
    }

    // 3. Filtro por empresa (group)
    if (companyFilter !== 'todos') {
      list = list.filter(p => p.group === companyFilter);
    }

    // 4. Filtro de búsqueda
    if (searchTerm) {
      const s = normalize(searchTerm);
      list = list.filter(p =>
        normalize(p.nombre_proyecto || '').includes(s) ||
        normalize(p.codigo_proyecto || '').includes(s) ||
        normalize(p.cliente || '').includes(s)
      );
    }
    return list;
  }, [userProjects, searchTerm, statusFilter, companyFilter]);

  const stats = useMemo(() => ({
    total: userProjects.filter(p => projectStatus(p) !== 'eliminado').length,
    active: userProjects.filter(p => projectStatus(p) === 'en_progreso').length,
    completed: userProjects.filter(p => projectStatus(p) === 'completado').length,
    overdue: userProjects.filter(p => projectStatus(p) === 'atrasado').length,
    deleted: userProjects.filter(p => projectStatus(p) === 'eliminado').length,
  }), [userProjects]);

  // Tipos de eliminación
  const [deleteType, setDeleteType] = useState<'soft' | 'hard'>('soft');

  const handleActionProyecto = async () => {
    if (!proyectoAEliminar) return;
    setLoadingDelete(true);
    try {
      const targetId = proyectoAEliminar.project_id || proyectoAEliminar.id;
      
      if (deleteType === 'soft') {
        await apiClient.delete(`/projects/${targetId}`);
        showToast(`Proyecto "${proyectoAEliminar.nombre_proyecto}" enviado a papelera.`, 'success');
      } else {
        await apiClient.delete(`/projects/${targetId}/permanent`);
        try {
          await apiClient.delete(`/project-tracking/${proyectoAEliminar.id}`);
        } catch(e){}
        setProjects(prev => prev.filter(p => p.id !== proyectoAEliminar.id));
        showToast(`Proyecto "${proyectoAEliminar.nombre_proyecto}" eliminado permanentemente.`, 'success');
      }
      
      await refresh();
      setShowConfirmModal(false);
      setProyectoAEliminar(null);
    } catch (err: any) {
      console.error("Error en acción de proyecto:", err);
      showToast(err?.response?.data?.detail || 'Error en la operación del proyecto.', 'error');
    } finally {
      setLoadingDelete(false);
    }
  };

  const handleRestaurar = async (p: ProjectTracking) => {
    try {
      const targetId = p.project_id || p.id;
      await apiClient.post(`/projects/${targetId}/restore`);
      await refresh();
      showToast(`Proyecto restaurado exitosamente.`, 'success');
    } catch (err: any) {
      console.error("Error al restaurar proyecto:", err);
      showToast(err?.response?.data?.detail || 'Error al restaurar el proyecto.', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header & Stats Banner */}
      <div className="relative bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-4 sm:px-8 py-4 sm:py-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white drop-shadow-md">Portafolio Corporativo</h2>
              <p className="text-primary-100 mt-2 text-sm sm:text-base lg:text-lg drop-shadow">Seleccione un proyecto para gestionar su ejecución detallada.</p>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl text-white font-bold text-base transition-all active:scale-95 shadow-2xl group w-full md:w-auto justify-center"
              >
                <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <span>Nuevo Proyecto</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mt-6 sm:mt-8">
            <StatMini label="Total Proyectos" value={stats.total} />
            <StatMini label="En Progreso" value={stats.active} />
            <StatMini label="Atrasados" value={stats.overdue} color="text-amber-300" />
            <StatMini label="Completados" value={stats.completed} color="text-emerald-300" />
          </div>
        </div>
      </div>


      {/* Toolbar: Search and Filters */}
      <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white dark:bg-steel-800 p-4 rounded-2xl border border-steel-200 dark:border-steel-700 shadow-sm">
        <div className="relative w-full xl:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-steel-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por código, nombre o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-steel-300 dark:border-steel-600 rounded-xl leading-5 bg-steel-50 dark:bg-steel-700 placeholder-steel-400 dark:placeholder-steel-500 text-steel-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-steel-600 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors"
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
          <div className="flex gap-1 bg-steel-50 dark:bg-steel-900 p-1.5 rounded-lg border border-steel-200 dark:border-steel-700 w-max">
            <button onClick={() => setCompanyFilter('todos')} className={`px-3 py-1 text-xs rounded transition-colors font-medium ${companyFilter === 'todos' ? 'bg-primary-600 text-white' : 'text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-700'}`}>Todas</button>
            <button onClick={() => setCompanyFilter('PCM')} className={`px-3 py-1 text-xs rounded transition-colors font-medium ${companyFilter === 'PCM' ? 'bg-primary-600 text-white' : 'text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-700'}`}>PC Mejía</button>
            <button onClick={() => setCompanyFilter('PCS')} className={`px-3 py-1 text-xs rounded transition-colors font-medium ${companyFilter === 'PCS' ? 'bg-primary-600 text-white' : 'text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-700'}`}>PCM Solar</button>
            <button onClick={() => setCompanyFilter('CARSAN')} className={`px-3 py-1 text-xs rounded transition-colors font-medium ${companyFilter === 'CARSAN' ? 'bg-primary-600 text-white' : 'text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-700'}`}>Carsan</button>
          </div>
          <div className="flex gap-2 w-max">
            <FilterButton active={statusFilter === 'all'} onClick={() => setStatusFilter('all')} label="Todos" count={stats.total} icon={Filter} />
            <FilterButton active={statusFilter === 'en_progreso'} onClick={() => setStatusFilter('en_progreso')} label="Activos" count={stats.active} icon={Activity} colorClass="text-primary-600 bg-primary-50 border-primary-200" activeClass="bg-primary-600 text-white border-primary-600" />
            <FilterButton active={statusFilter === 'atrasado'} onClick={() => setStatusFilter('atrasado')} label="Atrasados" count={stats.overdue} icon={AlertCircle} colorClass="text-amber-600 bg-amber-50 border-amber-200" activeClass="bg-amber-500 text-white border-amber-500" />
            <FilterButton active={statusFilter === 'completado'} onClick={() => setStatusFilter('completado')} label="Completados" count={stats.completed} icon={CheckCircle2} colorClass="text-emerald-600 bg-emerald-50 border-emerald-200" activeClass="bg-emerald-600 text-white border-emerald-600" />
            <FilterButton active={statusFilter === 'eliminado'} onClick={() => setStatusFilter('eliminado')} label="Papelera" count={stats.deleted} icon={Trash2} colorClass="text-red-600 bg-red-50 border-red-200" activeClass="bg-red-600 text-white border-red-600" />
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredProjects.map((p) => (
          <ProjectCard 
            key={p.id} 
            project={p} 
            onNavigate={() => navigate(`/projects/${p.project_id || p.id}/dashboard`)}
            onSoftDelete={() => {
              setProyectoAEliminar(p);
              setDeleteType('soft');
              setShowConfirmModal(true);
            }}
            onHardDelete={() => {
              setProyectoAEliminar(p);
              setDeleteType('hard');
              setShowConfirmModal(true);
            }}
            onRestore={() => handleRestaurar(p)}
          />
        ))}
      </div>

      {filteredProjects.length === 0 && (
        <div className="text-center py-16 text-steel-400">
          <Search className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-semibold">No se encontraron proyectos</p>
          <p className="text-sm mt-1">Intenta ajustar los filtros o el término de búsqueda.</p>
        </div>
      )}

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (data) => {
          const newP = await createProject(data);
          if (newP && newP.id) {
            navigate(`/projects/${newP.id}/dashboard`);
          }
        }}
      />

      {/* Modal de confirmación */}
      <Modal open={showConfirmModal} onClose={() => { setShowConfirmModal(false); }}>
        <div className="p-8 text-center max-w-md">
          <div className="text-5xl mb-4">{deleteType === 'soft' ? '🗑️' : '⚠️'}</div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">
            {deleteType === 'soft' ? '¿Enviar proyecto a papelera?' : '¿Eliminar proyecto permanentemente?'}
          </h2>
          <p className="text-sm text-steel-500 dark:text-steel-400 mb-4">
            {deleteType === 'soft' 
              ? <>Vas a enviar <strong>{proyectoAEliminar?.nombre_proyecto}</strong> a la papelera. Podrás restaurarlo más tarde.</>
              : <>Vas a eliminar <strong>{proyectoAEliminar?.nombre_proyecto}</strong>. Esta acción eliminará todos sus datos y <u className="font-bold">no se puede deshacer</u>.</>
            }
          </p>
          
          {deleteType === 'hard' && (
            <div className="bg-red-50 dark:bg-red-950/20 p-3 rounded-xl border border-red-100 dark:border-red-900/50 mb-6">
              <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                Se eliminarán: cronograma, caso de negocio, flujo de caja, archivos y todos los registros relacionados.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-8">
            <button
              onClick={() => { setShowConfirmModal(false); }}
              className="flex-1 px-4 py-2.5 text-sm font-bold text-steel-600 dark:text-steel-400 hover:bg-steel-50 dark:hover:bg-steel-700 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleActionProyecto}
              disabled={loadingDelete}
              className={clsx(
                "flex-1 px-4 py-2.5 text-sm font-bold text-white rounded-xl shadow-lg transition-all active:scale-95",
                !loadingDelete
                  ? (deleteType === 'soft' ? "bg-amber-600 hover:bg-amber-700 shadow-amber-500/30" : "bg-red-600 hover:bg-red-700 shadow-red-500/30")
                  : "bg-steel-300 dark:bg-steel-600 cursor-not-allowed"
              )}
            >
              {loadingDelete ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Procesando...</span>
                </div>
              ) : (
                deleteType === 'soft' ? "Enviar a Papelera" : "Eliminar Permanentemente"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ─── Project Card ─────────────────────────────────────────────────────────────
function ProjectCard({ 
  project: p, 
  onNavigate,
  onSoftDelete,
  onHardDelete,
  onRestore
}: { 
  project: ProjectTracking; 
  onNavigate: () => void;
  onSoftDelete: () => void;
  onHardDelete: () => void;
  onRestore: () => void;
}) {
  const projectId = p.project_id || p.id;
  const isPS = checkIsPatioSur(projectId);

  const { data: cortes = [] } = useQuery<CronogramaCorte[]>({
    queryKey: ['cronogramaCortes', projectId],
    queryFn: () => cronogramaApi.listCortes(projectId),
    staleTime: 1000 * 10,
  });

  const latestCorte = useMemo(() => {
    if (!cortes || cortes.length === 0) return null;
    const validCortes = cortes.filter(c => c.avance_ejecutado !== null && c.avance_ejecutado !== undefined);
    if (validCortes.length > 0) {
      return [...validCortes].sort((a, b) => b.semana - a.semana)[0];
    }
    return [...cortes].sort((a, b) => b.semana - a.semana)[0];
  }, [cortes]);

  // PRIORIDAD: 1. Cronograma MySQL (Última semana ejecutada) | 2. Project Tracking (Fallback)
  const prog = latestCorte ? Number(latestCorte.avance_planeado) : (p.avance_programado != null ? p.avance_programado * 100 : null);
  const real = latestCorte ? (latestCorte.avance_ejecutado !== null ? Number(latestCorte.avance_ejecutado) : null) : (p.avance_real != null ? p.avance_real * 100 : null);

  // SPI Dinámico: Priorizar cálculo desde el corte si ambos existen
  const spi = (latestCorte && Number(latestCorte.avance_planeado) > 0 && latestCorte.avance_ejecutado !== null)
    ? Math.round((Number(latestCorte.avance_ejecutado) / Number(latestCorte.avance_planeado)) * 100) / 100
    : computeSPI(prog, real);
  
  // Visualización: 1 decimal para certificar origen Cronograma, entero para Fallback
  const progPct = prog != null ? (latestCorte ? Math.round(prog * 10) / 10 : Math.round(prog)) : null;
  const realPct = real != null ? (latestCorte ? Math.round(real * 10) / 10 : Math.round(real)) : null;
  
  // Re-calcular status basado en datos frescos si están disponibles
  const currentStatus = (prog != null && real != null) 
    ? (real >= 100 ? 'completado' : (real < prog - 2 ? 'atrasado' : 'en_progreso'))
    : projectStatus(p);

  const cfg = STATUS_CFG[currentStatus] || STATUS_CFG.sin_datos;
  const budget = p.valor_original_contrato;
  const { user } = useAuthStore();

  return (
    <div
      onClick={onNavigate}
      className={clsx(
        "group bg-white dark:bg-steel-800 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden",
        "hover:shadow-xl hover:-translate-y-1",
        isPS
          ? "border-primary-300 dark:border-primary-700 ring-2 ring-primary-500/30 dark:ring-primary-600/40 ring-offset-1 dark:ring-offset-steel-800"
          : "border-steel-200 dark:border-steel-700 hover:border-primary-300 dark:hover:border-primary-600"
      )}
    >
      {/* Card Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className={clsx(
              "flex-shrink-0 h-11 w-11 rounded-xl flex items-center justify-center",
              isPS ? "bg-gradient-to-br from-primary-500 to-primary-700" : "bg-steel-100 group-hover:bg-primary-50"
            )}>
              {isPS
                ? <Zap className="h-5 w-5 text-white" />
                : <Building2 className="h-5 w-5 text-steel-400 group-hover:text-primary-600 transition-colors" />
              }
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-steel-900 dark:text-white leading-tight line-clamp-2">
                {p.nombre_proyecto || p.sheet_name}
              </h3>
              <p className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-widest mt-0.5">
                {p.codigo_proyecto || 'S/C'}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={clsx("flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold border whitespace-nowrap", cfg.bg, cfg.text, cfg.border)}>
              {cfg.label}
            </span>
            
            {/* Botones de acción según estado y rol */}
            <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
              {projectStatus(p) === 'eliminado' ? (
                <>
                  {['administrador', 'gerente'].includes(user?.role || '') && (
                    <button onClick={onRestore} className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-all" title="Restaurar proyecto">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {user?.role === 'administrador' && (
                    <button onClick={onHardDelete} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all" title="Eliminar permanentemente">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </>
              ) : (
                ['administrador', 'gerente'].includes(user?.role || '') && (
                  <button onClick={onSoftDelete} className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-all" title="Enviar a papelera">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {p.alcance && (
          <p className="text-[11px] text-steel-500 dark:text-steel-400 mt-2 line-clamp-2 leading-relaxed">
            {p.alcance}
          </p>
        )}
      </div>

      {/* Details Section */}
      <div className="px-5 py-3 space-y-1.5 border-t border-steel-100 dark:border-steel-700">
        {p.cliente && (
          <div className="flex items-center gap-2 text-xs">
            <Users className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500 flex-shrink-0" />
            <span className="text-steel-500 dark:text-steel-400">Cliente:</span>
            <span className="font-semibold text-steel-800 dark:text-steel-200 truncate">{p.cliente}</span>
          </div>
        )}
        {budget != null && budget > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <DollarSign className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500 flex-shrink-0" />
            <span className="text-steel-500 dark:text-steel-400">Presupuesto:</span>
            <span className="font-bold text-steel-800 dark:text-steel-200">{formatBudget(budget)}</span>
          </div>
        )}
        {(p.fecha_inicio || p.fecha_finalizacion_contractual) && (
          <div className="flex items-center gap-2 text-xs">
            <CalendarDays className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500 flex-shrink-0" />
            <span className="text-steel-500 dark:text-steel-400 truncate">
              {p.fecha_inicio || '—'} al {p.fecha_finalizacion_contractual || '—'}
            </span>
          </div>
        )}
      </div>

      {/* Progress Bars */}
      {(progPct != null || realPct != null) && (
        <div className="px-5 py-3 space-y-2.5 border-t border-steel-100 dark:border-steel-700">
          {progPct != null && (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-steel-500 dark:text-steel-400 font-medium">Avance planificado</span>
                <span className="font-bold text-primary-700 dark:text-primary-400">{progPct}%</span>
              </div>
              <div className="w-full h-2 bg-steel-100 dark:bg-steel-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(progPct, 100)}%` }}
                />
              </div>
            </div>
          )}
          {realPct != null && (
            <div>
              <div className="flex justify-between text-[10px] mb-1">
                <span className="text-steel-500 dark:text-steel-400 font-medium">Avance real</span>
                <span className={clsx("font-bold", realPct >= (progPct || 0) ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
                  {realPct}%
                </span>
              </div>
              <div className="w-full h-2 bg-steel-100 dark:bg-steel-700 rounded-full overflow-hidden">
                <div
                  className={clsx("h-full rounded-full transition-all duration-500", realPct >= (progPct || 0) ? "bg-emerald-500" : "bg-amber-500")}
                  style={{ width: `${Math.min(realPct, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="px-5 py-3 border-t border-steel-100 dark:border-steel-700 flex items-center justify-between bg-steel-50/50 dark:bg-steel-900/30">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-steel-500 dark:text-steel-400">
            Estado: <span className={clsx("font-semibold", cfg.text)}>{cfg.label}</span>
          </span>
          {spi != null && (
            <span className={clsx(
              "font-bold px-2 py-0.5 rounded-md border",
              spi >= 1 ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-700" : spi >= 0.9 ? "text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700" : "text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-700"
            )}>
              SPI {spi.toFixed(2)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 text-primary-600 dark:text-primary-400 font-bold text-xs group-hover:translate-x-1 transition-transform">
          Gestionar
          <ChevronRight className="h-4 w-4" />
        </div>
      </div>

    </div>
  );
}

// ─── Filter Button ────────────────────────────────────────────────────────────
function FilterButton({
  active,
  onClick,
  label,
  count,
  icon: Icon,
  colorClass = "text-steel-600 dark:text-steel-300 bg-steel-50 dark:bg-steel-700 border-steel-200 dark:border-steel-600",
  activeClass = "bg-steel-800 dark:bg-steel-900 text-white border-steel-800 dark:border-steel-700"
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  icon: any;
  colorClass?: string;
  activeClass?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all whitespace-nowrap",
        active ? activeClass : `hover:opacity-80 scale-95 hover:scale-100 ${colorClass}`
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
      <span className={clsx(
        "ml-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold",
        active ? "bg-white/20" : "bg-white/50"
      )}>
        {count}
      </span>
    </button>
  );
}

// ─── Stat Mini ────────────────────────────────────────────────────────────────
function StatMini({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-widest text-primary-100 dark:text-primary-200">{label}</p>
      <p className={clsx("text-2xl font-black tabular-nums", color)}>{value}</p>
    </div>
  );
}
