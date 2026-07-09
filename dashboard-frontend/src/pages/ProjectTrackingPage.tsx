import { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ClipboardList,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Calendar,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  X,
  Save,
  Loader,
  MessageSquare,
  Database,
} from 'lucide-react';
import clsx from 'clsx';
import { trackingApi, type ProjectPending } from '@/services/api/tracking';
import { projectsApi } from '@/services/api/projects';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import { ProjectProvider } from '@/contexts/ProjectContext';
import EmptyProjectState from '@/components/common/EmptyProjectState';

const PROCESS_TYPES = [
  { code: 'CL', label: 'Controller Admo', color: 'bg-blue-100 text-blue-700' },
  { code: 'DS', label: 'Diseño', color: 'bg-purple-100 text-purple-700' },
  { code: 'OI', label: 'Obra - Ingeniería', color: 'bg-cyan-100 text-cyan-700' },
  { code: 'OC', label: 'Obra - Civil', color: 'bg-orange-100 text-orange-700' },
  { code: 'CP', label: 'Compras - Presupuestos', color: 'bg-amber-100 text-amber-700' },
  { code: 'SG-GH', label: 'Seguridad - G. Humana', color: 'bg-green-100 text-green-700' },
  { code: 'CT', label: 'Contractual', color: 'bg-indigo-100 text-indigo-700' },
  { code: 'GA', label: 'Gestión Ambiental', color: 'bg-emerald-100 text-emerald-700' },
  { code: 'GT', label: 'Gerencia Técnica', color: 'bg-rose-100 text-rose-700' },
  { code: 'GF', label: 'Gerencia Financiero', color: 'bg-violet-100 text-violet-700' },
  { code: 'OE', label: 'Obra Eléctrica', color: 'bg-yellow-100 text-yellow-700' },
];

const ESTADOS = [
  { label: 'En curso', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { label: 'Cumplido', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { label: 'Atrasado', color: 'bg-red-100 text-red-700 border-red-200' },
  { label: 'Pendiente', color: 'bg-steel-100 text-steel-700 border-steel-200' },
];

export default function ProjectTrackingPage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = urlProjectId || '';
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPending, setEditingPending] = useState<ProjectPending | null>(null);

  // Form State
  const [formData, setFormData] = useState<ProjectPending>({
    tipo_proceso: '',
    pendiente: '',
    nota: '',
    fecha_inicio: '',
    fecha_fin: '',
    responsable: '',
    estado: 'En curso',
  });

  const { data: pendings = [], isLoading } = useQuery({
    queryKey: ['project-pendings', projectId],
    queryFn: () => trackingApi.getPendings(projectId),
  });

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
  });

  const createMutation = useMutation({
    mutationFn: (data: ProjectPending) => trackingApi.createPending(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pendings', projectId] });
      setIsModalOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProjectPending) => trackingApi.updatePending(projectId, data.id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pendings', projectId] });
      setIsModalOpen(false);
      setEditingPending(null);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => trackingApi.deletePending(projectId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-pendings', projectId] });
    },
  });

  const resetForm = () => {
    setFormData({
      tipo_proceso: '',
      pendiente: '',
      nota: '',
      fecha_inicio: '',
      fecha_fin: '',
      responsable: '',
      estado: 'En curso',
    });
  };

  const handleEdit = (pending: ProjectPending) => {
    setEditingPending(pending);
    setFormData({ ...pending });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar este pendiente?')) {
      deleteMutation.mutate(id);
      if (user) logEdit(user, 'Seguimiento', `Eliminó pendiente ${id}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingPending) {
      updateMutation.mutate(formData);
      if (user) logEdit(user, 'Seguimiento', `Actualizó pendiente: ${formData.pendiente}`);
    } else {
      createMutation.mutate(formData);
      if (user) logEdit(user, 'Seguimiento', `Creó nuevo pendiente: ${formData.pendiente}`);
    }
  };

  const filteredPendings = useMemo(() => {
    return pendings.filter((p) => {
      const matchesSearch = p.pendiente.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.responsable?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            p.tipo_proceso.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesProcess = filterProcess === 'all' || p.tipo_proceso.includes(filterProcess);
      return matchesSearch && matchesProcess;
    });
  }, [pendings, searchTerm, filterProcess]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  // Empty state for projects without tracking data
  if (pendings.length === 0) {
    return (
      <ProjectProvider projectId={projectId}>
        <EmptyProjectState
          module="Control de Pendientes"
          description="Este proyecto aún no tiene pendientes registrados. Comienza creando nuevos pendientes y asignando responsables."
          actionLabel="Ir a Dashboard"
          onAction={() => navigate(`/projects/${projectId}/dashboard`)}
          icon={Database}
        />
      </ProjectProvider>
    );
  }

  return (
    <ProjectProvider projectId={projectId}>
      <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary-600" />
            Control de Pendientes {project?.name ? `— ${project.name}` : ''}
          </h2>
          <p className="text-xs text-steel-500 dark:text-steel-400 mt-1">
            Gestión y seguimiento de compromisos, tareas y procesos del proyecto.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setEditingPending(null); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-primary-700 transition shadow-lg shadow-primary-200 dark:shadow-none active:scale-95"
        >
          <Plus className="h-4 w-4" />
          Nuevo Pendiente
        </button>
      </div>

      {/* Legend & Filters Card */}
      <div className="rounded-2xl border border-steel-200 bg-white dark:bg-steel-900 p-4 shadow-sm space-y-4">
        {/* Legend */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-steel-400 mb-3">Leyenda — Tipo Proceso</p>
          <div className="flex flex-wrap gap-2">
            {PROCESS_TYPES.map((type) => (
              <div key={type.code} className={clsx('px-2 py-1 rounded text-[10px] font-bold border border-transparent transition-colors', type.color)}>
                {type.code} = {type.label}
              </div>
            ))}
          </div>
        </div>

        <div className="h-px bg-steel-100 dark:bg-steel-800" />

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400" />
            <input
              type="text"
              placeholder="Buscar por pendiente, responsable o proceso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-steel-400" />
            <select
              value={filterProcess}
              onChange={(e) => setFilterProcess(e.target.value)}
              className="px-3 py-2 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
            >
              <option value="all">Todos los Procesos</option>
              {PROCESS_TYPES.map((t) => (
                <option key={t.code} value={t.code}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Section */}
      <div className="rounded-2xl border border-steel-200 bg-white dark:bg-steel-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center border-r border-primary-800 w-24">Tipo Proceso</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-r border-primary-800 min-w-[300px]">Pendiente</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center border-r border-primary-800 w-28">Fecha Inicio</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center border-r border-primary-800 w-28">Fecha Fin</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider border-r border-primary-800 min-w-[150px]">Responsable</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center border-r border-primary-800 w-28">Estado</th>
                <th className="px-4 py-3 font-bold text-xs uppercase tracking-wider text-center w-20">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 dark:divide-steel-800">
              {filteredPendings.length > 0 ? (
                filteredPendings.map((p) => (
                  <tr key={p.id} className="hover:bg-steel-50/50 dark:hover:bg-steel-800/50 transition-colors group">
                    <td className="px-4 py-4 text-center border-r border-steel-100 dark:border-steel-800">
                      <div className="flex flex-wrap justify-center gap-1">
                        {p.tipo_proceso.split('-').map(code => {
                          const type = PROCESS_TYPES.find(t => t.code === code);
                          return (
                            <span key={code} className={clsx("px-1.5 py-0.5 rounded text-[10px] font-bold", type?.color || 'bg-steel-100 text-steel-600')}>
                              {code}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                    <td className="px-4 py-4 border-r border-steel-100 dark:border-steel-800">
                      <div className="space-y-1">
                        <p className="text-steel-800 dark:text-steel-100 font-medium whitespace-pre-wrap leading-relaxed">{p.pendiente}</p>
                        {p.nota && (
                          <div className="flex items-start gap-1.5 mt-1 text-[11px] text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-1.5 rounded-lg border border-amber-100 dark:border-amber-900/30">
                            <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                            <span className="italic font-medium">Nota: {p.nota}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center border-r border-steel-100 dark:border-steel-800 font-mono text-xs text-steel-600 dark:text-steel-400">
                      {p.fecha_inicio || '—'}
                    </td>
                    <td className="px-4 py-4 text-center border-r border-steel-100 dark:border-steel-800 font-mono text-xs text-steel-600 dark:text-steel-400">
                      {p.fecha_fin || '—'}
                    </td>
                    <td className="px-4 py-4 border-r border-steel-100 dark:border-steel-800">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-steel-100 dark:bg-steel-800 flex items-center justify-center shrink-0">
                          <User className="h-3 w-3 text-steel-400" />
                        </div>
                        <span className="text-xs font-semibold text-steel-700 dark:text-steel-300">{p.responsable || 'Sin asignar'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center border-r border-steel-100 dark:border-steel-800">
                      <span className={clsx(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border",
                        ESTADOS.find(e => e.label === p.estado)?.color || 'bg-steel-50 text-steel-600'
                      )}>
                        {p.estado === 'Cumplido' && <CheckCircle2 className="h-3 w-3" />}
                        {p.estado === 'En curso' && <Clock className="h-3 w-3" />}
                        {p.estado === 'Atrasado' && <AlertCircle className="h-3 w-3" />}
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEdit(p)}
                          className="p-1.5 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg transition"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(p.id!)}
                          className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-steel-400 italic">
                    No se encontraron pendientes registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-steel-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in duration-200">
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-steel-900 dark:text-white">
                {editingPending ? 'Editar Pendiente' : 'Nuevo Pendiente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-steel-100 dark:hover:bg-steel-800 rounded-full transition">
                <X className="h-5 w-5 text-steel-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Tipo de Proceso (Códigos separados por guión, ej: DS-OC-OE)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: DS-OC-OE"
                    value={formData.tipo_proceso}
                    onChange={(e) => setFormData({ ...formData, tipo_proceso: e.target.value.toUpperCase() })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                  <div className="mt-2 flex flex-wrap gap-1">
                    {PROCESS_TYPES.map(t => (
                      <button
                        key={t.code}
                        type="button"
                        onClick={() => {
                          const current = formData.tipo_proceso.split('-').filter(c => c);
                          const next = current.includes(t.code) 
                            ? current.filter(c => c !== t.code)
                            : [...current, t.code];
                          setFormData({ ...formData, tipo_proceso: next.join('-') });
                        }}
                        className={clsx(
                          "px-2 py-0.5 rounded text-[10px] font-bold border transition",
                          formData.tipo_proceso.split('-').includes(t.code)
                            ? "bg-primary-600 text-white border-primary-700"
                            : "bg-steel-100 text-steel-600 border-steel-200 dark:bg-steel-800 dark:border-steel-700"
                        )}
                      >
                        {t.code}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Pendiente / Actividad</label>
                  <textarea
                    required
                    rows={3}
                    value={formData.pendiente}
                    onChange={(e) => setFormData({ ...formData, pendiente: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition resize-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Nota (Opcional)</label>
                  <input
                    type="text"
                    value={formData.nota || ''}
                    onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Fecha Inicio</label>
                  <input
                    type="date"
                    value={formData.fecha_inicio || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Fecha Fin</label>
                  <input
                    type="date"
                    value={formData.fecha_fin || ''}
                    onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Responsable</label>
                  <input
                    type="text"
                    value={formData.responsable || ''}
                    onChange={(e) => setFormData({ ...formData, responsable: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-2 block">Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-steel-50 dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none transition"
                  >
                    {ESTADOS.map(e => (
                      <option key={e.label} value={e.label}>{e.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-steel-600 dark:text-steel-400 hover:bg-steel-100 dark:hover:bg-steel-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-200 dark:shadow-none transition disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  {editingPending ? 'Guardar Cambios' : 'Crear Pendiente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </ProjectProvider>
  );
}
