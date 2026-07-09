// ============================================================
// ProjectsTrackingTable — Resumen / Seguimiento de 25 proyectos
// Datos Generales = solo lectura · Seguimiento = editable
// Grupos: PCM (todos los proyectos actuales) | PCS (futuro)
// ============================================================
import { useState, useMemo, useRef, useEffect, Fragment } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  ChevronDown, ChevronRight, Search, Edit3, Check,
  TrendingUp, AlertTriangle, CheckCircle, HelpCircle,
  Layers, FolderOpen, ArrowUpDown, ArrowUp, ArrowDown,
  FileSpreadsheet, Download, Loader2, Calendar, Trash2, X
} from 'lucide-react';
import { exportProjectsToExcel } from '@/utils/exportProjectsExcel';
import Modal from '@/components/ui/Modal';
import { useQuery } from '@tanstack/react-query';
import apiClient from '@/services/api/client';
import clsx from 'clsx';
import { formatCOP } from '@/utils/formatNumbers';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import { useToastStore } from '@/components/common/Toast';
import {
  useProjectsTracking,
  DATOS_GENERALES_FIELDS,
  SEGUIMIENTO_FIELDS,
  formatCurrency,
  formatPercent,
  projectStatus,
  type ProjectTracking,
  type FieldDef,
} from '@/data/projectsTracking';

// ── Configuración de grupos ──
type GroupKey = 'PCM' | 'PCS' | 'CARSAN';
type GroupFilter = 'todos' | GroupKey;

const GROUP_CONFIG: Record<GroupKey, {
  label: string;
  sublabel: string;
  colorText: string;
  colorBg: string;
  colorBorder: string;
  colorPill: string;
  colorRow: string;
  colorCount: string;
}> = {
  PCM: {
    label: 'PCM',
    sublabel: 'PC Mejía',
    colorText: 'text-primary-700 dark:text-primary-300',
    colorBg: 'bg-primary-50 dark:bg-primary-950/30',
    colorBorder: 'border-primary-200 dark:border-primary-800',
    colorPill: 'bg-primary-600 text-white',
    colorRow: 'bg-primary-600',
    colorCount: 'text-primary-600 dark:text-primary-400',
  },
  PCS: {
    label: 'PCS',
    sublabel: 'PC Solar',
    colorText: 'text-violet-700 dark:text-violet-300',
    colorBg: 'bg-violet-50 dark:bg-violet-950/30',
    colorBorder: 'border-violet-200 dark:border-violet-800',
    colorPill: 'bg-violet-600 text-white',
    colorRow: 'bg-violet-600',
    colorCount: 'text-violet-600 dark:text-violet-400',
  },
  CARSAN: {
    label: 'CARSAN',
    sublabel: 'CARSAN Electric',
    colorText: 'text-indigo-700 dark:text-indigo-300',
    colorBg: 'bg-indigo-50 dark:bg-indigo-950/30',
    colorBorder: 'border-indigo-200 dark:border-indigo-800',
    colorPill: 'bg-indigo-600 text-white',
    colorRow: 'bg-indigo-600',
    colorCount: 'text-indigo-600 dark:text-indigo-400',
  },
};

function getGroup(p: ProjectTracking): GroupKey {
  return p.group || 'PCM';
}

const STATUS_CONFIG = {
  completado:  { label: 'Completado', icon: CheckCircle,  color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40',  border: 'border-emerald-200 dark:border-emerald-800' },
  en_progreso: { label: 'En Progreso', icon: TrendingUp,  color: 'text-primary-600 dark:text-primary-400', bg: 'bg-primary-50 dark:bg-primary-950/40',  border: 'border-primary-200 dark:border-primary-800' },
  atrasado:    { label: 'Atrasado',   icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400',   bg: 'bg-amber-50 dark:bg-amber-950/40',   border: 'border-amber-200 dark:border-amber-800' },
  sin_datos:   { label: 'Sin Datos',  icon: HelpCircle,   color: 'text-steel-400 dark:text-steel-500',   bg: 'bg-steel-50 dark:bg-steel-800',      border: 'border-steel-200 dark:border-steel-700' },
  eliminado:   { label: 'Eliminado',  icon: Trash2,       color: 'text-red-600 dark:text-red-400',       bg: 'bg-red-50 dark:bg-red-950/40',       border: 'border-red-200 dark:border-red-800' },
};

function displayFieldValue(p: ProjectTracking, f: FieldDef): string {
  const v = p[f.key] as any;
  if (v == null || v === '') return '—';
  if (f.type === 'currency') return formatCurrency(v);
  if (f.type === 'percent')  return formatPercent(v);
  if (f.type === 'date') {
    const str = String(v);
    if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(str)) {
      const [year, month, day] = str.split('T')[0].split('-');
      return `${day}/${month}/${year.slice(2)}`;
    }
    return str;
  }
  return String(v);
}

// ── Columnas ordenables ──
type SortCol = 'nombre' | 'codigo' | 'cliente' | 'director' | 'valor' | 'avance_prog' | 'avance_real' | 'facturado' | 'utilidad' | 'estado';
type SortDir = 'asc' | 'desc';

const cleanNum = (v: any): number => {
  if (v == null || v === '') return 0;
  if (typeof v === 'number') return v;
  return parseFloat(String(v).replace(/[^\d.-]/g, '')) || 0;
};

// ── Subtotales de un grupo ──
function groupKpis(ps: ProjectTracking[]) {
  return {
    count:       ps.length,
    valorTotal:  ps.reduce((s, p) => s + cleanNum(p.valor_actual_contrato), 0),
    facturado:   ps.reduce((s, p) => s + cleanNum(p.valor_facturado), 0),
    utilidad:    ps.reduce((s, p) => s + cleanNum(p.utilidad_actual), 0),
    enProgreso:  ps.filter(p => projectStatus(p) === 'en_progreso').length,
    completados: ps.filter(p => projectStatus(p) === 'completado').length,
    atrasados:   ps.filter(p => projectStatus(p) === 'atrasado').length,
  };
}

function getReportDateStatus(dateString: string | undefined | null): 'green' | 'yellow' | 'red' {
  if (!dateString) return 'red';
  
  const reportDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0,0,0,0);
  
  const diffTime = today.getTime() - reportDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays >= 14) return 'red';
  
  const lastFriday = new Date();
  const day = lastFriday.getDay();
  const diffToFriday = (day + 7 - 5) % 7;
  lastFriday.setDate(lastFriday.getDate() - diffToFriday);
  lastFriday.setHours(0,0,0,0);
  
  if (reportDate < lastFriday) return 'yellow';
  
  return 'green';
}

export default function ProjectsTrackingTable() {
  const user = useAuthStore((s) => s.user);
  const [projects, setProjects, updateProject] = useProjectsTracking();

  const [expandedId, setExpandedId]     = useState<string | null>(null);
  const [searchTerm, setSearchTerm]     = useState('');
  const [activeFilter, setActiveFilter] = useState<GroupFilter>('todos');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<GroupKey>>(new Set());
  const [sortCol, setSortCol]           = useState<SortCol | null>(null);
  const [sortDir, setSortDir]           = useState<SortDir>('desc');

  const [searchParams, setSearchParams] = useSearchParams();
  const initialStatus = searchParams.get('status') || 'todos';
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);

  useEffect(() => {
    const s = searchParams.get('status') || 'todos';
    if (s !== statusFilter) {
      setStatusFilter(s);
    }
  }, [searchParams]);

  const changeStatusFilter = (newStatus: string) => {
    setStatusFilter(newStatus);
    if (newStatus === 'todos') {
      searchParams.delete('status');
    } else {
      searchParams.set('status', newStatus);
    }
    setSearchParams(searchParams);
  };
  const [isExporting, setIsExporting] = useState(false);

  // "?"? Historial de Fecha de Corte "?"?
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedHistoryWeek, setSelectedHistoryWeek] = useState<string | null>(null);
  const [selectedHistoryProject, setSelectedHistoryProject] = useState<string>('ALL');
  const [pendingAutoExport, setPendingAutoExport] = useState(false);

  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const [projectSearchQuery, setProjectSearchQuery] = useState('');
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredHistoryDropdownProjects = useMemo(() => {
    if (!projectSearchQuery) return projects;
    const query = projectSearchQuery.toLowerCase();
    return projects.filter(p => 
      (p.nombre_proyecto && p.nombre_proyecto.toLowerCase().includes(query)) ||
      (p.codigo_proyecto && p.codigo_proyecto.toLowerCase().includes(query))
    );
  }, [projects, projectSearchQuery]);

  // Obtener semanas disponibles
  const { data: historyWeeks = [] } = useQuery<string[]>({
    queryKey: ['projectHistoryWeeks', selectedHistoryProject],
    queryFn: async () => {
      const url = selectedHistoryProject !== 'ALL' 
        ? `/project-tracking/history/weeks?tracking_id=${selectedHistoryProject}`
        : '/project-tracking/history/weeks';
      const res = await apiClient.get(url);
      return res.data?.data || [];
    },
    staleTime: 1000 * 60 * 5,
  });

  // Obtener proyectos del historial si hay una semana seleccionada
  const { data: historyProjects = [], isFetching: loadingHistory } = useQuery<ProjectTracking[]>({
    queryKey: ['projectHistoryData', selectedHistoryWeek],
    queryFn: async () => {
      if (!selectedHistoryWeek) return [];
      const res = await apiClient.get(`/project-tracking/history/${selectedHistoryWeek}`);
      return res.data?.data || [];
    },
    enabled: !!selectedHistoryWeek,
    staleTime: 1000 * 60 * 5,
  });

  const displayProjects = useMemo(() => {
    if (!selectedHistoryWeek) return projects;

    if (selectedHistoryProject !== 'ALL') {
      const project = projects.find(p => p.id === selectedHistoryProject);
      if (!project) return [];
      const historyItem = historyProjects.find(h => h.id === selectedHistoryProject);
      if (historyItem) return [historyItem];
      return [{
        ...project,
        fecha_terminacion_estimada: 'Fecha de corte no disponible',
        avance_programado: null,
        avance_real: null,
        _no_history_found: true
      } as any];
    }

    return projects.map(p => {
      const historyItem = historyProjects.find(h => h.id === p.id);
      if (historyItem) return historyItem;
      return {
        ...p,
        fecha_terminacion_estimada: 'Fecha de corte no disponible',
        avance_programado: null,
        avance_real: null,
        desviaciones_detectadas: null,
        justificacion_desviaciones: null,
        lecciones_aprendidas: null,
        _no_history_found: true
      } as any;
    });
  }, [projects, historyProjects, selectedHistoryWeek, selectedHistoryProject]);

  
  useEffect(() => {
    if (pendingAutoExport && !loadingHistory && selectedHistoryWeek) {
      setPendingAutoExport(false);
      if (!user) return;
      
      const projectName = selectedHistoryProject === 'ALL' 
        ? 'Todos_los_Proyectos' 
        : projects.find(p => p.id === selectedHistoryProject)?.codigo_proyecto || 'Proyecto';
      
      const dateStr = new Date().toLocaleDateString('es-ES', { month: '2-digit', year: 'numeric' }).replace('/', '-');
      const filename = `Corte-${selectedHistoryWeek}-${projectName}-${dateStr}.xlsx`;
      
      exportProjectsToExcel({
        projects: displayProjects,
        userName: user.email || 'Usuario',
        filtersUsed: `Corte Histórico: ${selectedHistoryWeek} | Proyecto: ${projectName}`,
        suggestedFilename: filename
      }).catch(err => console.error("Error exporting", err));
    }
  }, [pendingAutoExport, loadingHistory, selectedHistoryWeek, displayProjects, user, selectedHistoryProject, projects]);

const canExport = user && ['administrador', 'gerente', 'director_proyectos', 'director'].includes(user.role);
  const showToast = useToastStore(s => s.showToast);

  const canEditField = (f: FieldDef): boolean => {
    if (selectedHistoryWeek) return false;
    if (!user) return false;
    if (user.role === 'administrador' || user.role === 'gerente') return true;
    
    // Tracking fields can be edited by directors and residents
    if (f.section === 'seguimiento') {
      return ['director_proyectos', 'controller', 'ingeniero_residente', 'director'].includes(user.role);
    }
    
    return false;
  };

  const handleExportExcel = async () => {
    if (!user || isExporting) return;
    try {
      setIsExporting(true);
      
      const filtersText = [
        activeFilter !== 'todos' ? `Grupo: ${activeFilter}` : '',
        statusFilter !== 'todos' ? `Estado: ${statusFilter}` : '',
        searchTerm ? `Búsqueda: ${searchTerm}` : ''
      ].filter(Boolean).join(', ') || 'Ninguno';

      await exportProjectsToExcel({
        projects: filtered,
        userName: user.full_name,
        filtersUsed: filtersText
      });

      logEdit(user, 'Proyectos › Resumen', 'Exportó Resumen de Proyectos a Excel', {
        module: 'project_tracking',
        after: { 
          recordsCount: filtered.length,
          filters: filtersText
        }
      });

    } catch (error) {
      console.error('Error al exportar Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSort = (col: SortCol) => {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  };
  const [editingField, setEditingField] = useState<{ id: string; key: string } | null>(null);
  const [tempValue, setTempValue]       = useState('');
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField) setTimeout(() => inputRef.current?.focus(), 50);
  }, [editingField]);

  useEffect(() => {
    if (expandedId) {
      window.dispatchEvent(new CustomEvent('collapseSidebar'));
    }
  }, [expandedId]);

  const toggleGroup = (g: GroupKey) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(g) ? next.delete(g) : next.add(g);
      return next;
    });
  };

  // ── Normalización para búsqueda robusta (quita acentos/eñes) ──
  const normalize = (str: string) => 
    str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  // ── Filtro de búsqueda + ordenamiento ──
  const filtered = useMemo(() => {
    let list = [...displayProjects];

    // Filtro por rol de usuario (RLS segmentado: Directores y Proyectos)
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
        } 
        else if (['director_proyectos', 'ingeniero_residente'].includes(user.role)) {
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

    if (activeFilter !== 'todos') list = list.filter(p => getGroup(p) === activeFilter);
    if (statusFilter !== 'todos') {
      list = list.filter(p => projectStatus(p) === statusFilter);
    } else {
      list = list.filter(p => projectStatus(p) !== 'eliminado');
    }

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (p.nombre_proyecto || '').toLowerCase().includes(q) ||
        (p.codigo_proyecto || '').toLowerCase().includes(q) ||
        (p.cliente        || '').toLowerCase().includes(q) ||
        (p.localizacion   || '').toLowerCase().includes(q) ||
        (p.director_proyectos || '').toLowerCase().includes(q)
      );
    }
    if (sortCol) {
      const dir = sortDir === 'desc' ? -1 : 1;
      const strCmp = (a: string, b: string) => a.localeCompare(b, 'es') * dir;
      const numCmp = (a: number, b: number) => (a - b) * dir;
      list.sort((a, b) => {
        const num = (v: any) => parseFloat(String(v ?? 0).replace(/[^\d.-]/g, '')) || 0;
        switch (sortCol) {
          case 'nombre':      return strCmp(a.nombre_proyecto || '', b.nombre_proyecto || '');
          case 'codigo':      return strCmp(a.codigo_proyecto || '', b.codigo_proyecto || '');
          case 'cliente':     return strCmp(a.cliente || '', b.cliente || '');
          case 'director':    return strCmp(a.director_proyectos || '', b.director_proyectos || '');
          case 'valor':       return numCmp(num(a.valor_actual_contrato), num(b.valor_actual_contrato));
          case 'avance_prog': return numCmp(num(a.avance_programado), num(b.avance_programado));
          case 'avance_real': return numCmp(num(a.avance_real), num(b.avance_real));
          case 'facturado':   return numCmp(num(a.valor_facturado), num(b.valor_facturado));
          case 'utilidad':    return numCmp(num(a.utilidad_actual), num(b.utilidad_actual));
          case 'estado':      return strCmp(projectStatus(a), projectStatus(b));
          default:            return 0;
        }
      });
    }
    return list;
  }, [displayProjects, searchTerm, activeFilter, statusFilter, sortCol, sortDir, user]);

  // ── Agrupación ──
  const groups = useMemo<{ key: GroupKey; projects: ProjectTracking[] }[]>(() => {
    const pcm = filtered.filter(p => getGroup(p) === 'PCM');
    const pcs = filtered.filter(p => getGroup(p) === 'PCS');
    const carsan = filtered.filter(p => getGroup(p) === 'CARSAN');
    const result: { key: GroupKey; projects: ProjectTracking[] }[] = [];
    if (activeFilter === 'todos' || activeFilter === 'PCM') result.push({ key: 'PCM', projects: pcm });
    if (activeFilter === 'todos' || activeFilter === 'PCS') result.push({ key: 'PCS', projects: pcs });
    if (activeFilter === 'todos' || activeFilter === 'CARSAN') result.push({ key: 'CARSAN', projects: carsan });
    return result;
  }, [filtered, activeFilter]);

  // ── KPIs globales (Calculados sobre el total sin filtro de status para mantener los números de la cabecera) ──
  const kpis = useMemo(() => {
    let list = [...displayProjects];
    if (user) {
      if (user.allowed_directors !== 'ALL' && Array.isArray(user.allowed_directors)) {
        const allowed = user.allowed_directors.map(d => normalize(d));
        list = list.filter(p => {
          const d = normalize(p.director_proyectos || '');
          const i = normalize(p.ingeniero_residente || '');
          return allowed.some(a => (d && d.includes(a)) || (i && i.includes(a)));
        });
      }
      if (user.allowed_projects !== 'ALL' && Array.isArray(user.allowed_projects)) {
        list = list.filter(p => user.allowed_projects?.includes(p.id));
      }
    }
    if (activeFilter !== 'todos') list = list.filter(p => getGroup(p) === activeFilter);
    return groupKpis(list);
  }, [displayProjects, activeFilter, user]);

  // ── KPIs dinámicos (para las tarjetas superiores, responden al statusFilter) ──
  const displayKpis = useMemo(() => {
    let list = [...displayProjects];
    if (user) {
      if (user.allowed_directors !== 'ALL' && Array.isArray(user.allowed_directors)) {
        const allowed = user.allowed_directors.map(d => normalize(d));
        list = list.filter(p => {
          const d = normalize(p.director_proyectos || '');
          const i = normalize(p.ingeniero_residente || '');
          return allowed.some(a => (d && d.includes(a)) || (i && i.includes(a)));
        });
      }
      if (user.allowed_projects !== 'ALL' && Array.isArray(user.allowed_projects)) {
        list = list.filter(p => user.allowed_projects?.includes(p.id));
      }
    }
    if (activeFilter !== 'todos') list = list.filter(p => getGroup(p) === activeFilter);
    if (statusFilter !== 'todos') list = list.filter(p => projectStatus(p) === statusFilter);
    return groupKpis(list);
  }, [displayProjects, activeFilter, statusFilter, user]);

  // ── Edición inline ──
  const startEdit = (p: ProjectTracking, f: FieldDef) => {
    const raw = p[f.key] as any;
    let display = '';
    if (raw != null) {
      if (f.type === 'percent') {
        const numVal = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.-]/g, '')) || 0;
        const val = numVal <= 1 && numVal >= 0 ? numVal * 100 : numVal;
        display = String(parseFloat(val.toFixed(10))).replace('.', ',');
      } else if (f.type === 'currency' || f.type === 'number') {
        const numVal = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^\d.-]/g, '')) || 0;
        display = String(numVal).replace('.', ',');
      } else {
        display = String(raw);
      }
    }
    setEditingField({ id: p.id, key: f.key });
    setTempValue(display);
  };

  const commitEdit = async () => {
    if (!editingField) return;
    
    // Capturar valor previo para rollback en caso de fallo
    const prevProjects = [...projects];
    
    let f = SEGUIMIENTO_FIELDS.find(fd => fd.key === editingField.key);
    if (!f) f = DATOS_GENERALES_FIELDS.find(fd => fd.key === editingField.key);
    if (!f) { setEditingField(null); return; }
    
    const projectId = editingField.id;
    let raw = tempValue.trim();
    let parsed: any = raw;

    // Mejorar parsing de números: manejar separadores de miles y decimales
    if (f.type === 'currency' || f.type === 'number' || f.type === 'percent') {
      let clean = raw.replace(/[^\d.,-]/g, '');
      
      if (clean.includes(',') && clean.includes('.')) {
        clean = clean.replace(/\./g, '').replace(',', '.');
      } else if (clean.includes(',')) {
        clean = clean.replace(',', '.');
      } else if (clean.includes('.')) {
        const parts = clean.split('.');
        if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
          clean = clean.replace(/\./g, '');
        }
      }
      
      parsed = parseFloat(clean);
      if (isNaN(parsed)) parsed = 0;

      if (f.type === 'percent') {
        parsed = parsed / 100;
      }
    }
    
    if (parsed === '' || parsed === '—') parsed = null;

    const updatedDate = new Date().toISOString().split('T')[0];
    const patch = { [f.key]: parsed, fecha_informe: updatedDate };

    try {
      // Actualización optimista local
      setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...patch } : p));
      setEditingField(null);

      // Persistir en MySQL
      await updateProject(projectId, patch);

      showToast('Cambios guardados correctamente', 'success');

      if (user) {
        const proj = projects.find(p => p.id === editingField.id);
        logEdit(user, 'Proyectos › Seguimiento', `Editó "${f.label}" de "${proj?.nombre_proyecto}" → ${tempValue}`);
      }
    } catch (err: any) {
      console.error('[COMMIT_ERROR]', err);
      // Rollback
      setProjects(prevProjects);
      
      const errorMsg = err.response?.data?.detail || 'Error de conexión con el servidor';
      showToast(`No se pudo guardar: ${errorMsg}`, 'error');
    } finally {
      setTempValue('');
    }
  };

  const cancelEdit = () => { setEditingField(null); setTempValue(''); };

  // ── Renderizar campo ──
  const renderField = (p: ProjectTracking, f: FieldDef) => {
    const isEditing = editingField?.id === p.id && editingField?.key === f.key;
    const value = displayFieldValue(p, f);
    const canEdit = canEditField(f);

    if (isEditing) {
      const isTextarea = f.type === 'textarea';
      const isDate = f.type === 'date';
      const El = isTextarea ? 'textarea' : 'input';
      return (
        <div className="flex items-start gap-1">
          <El
            ref={inputRef as any}
            type={isDate ? 'date' : (isTextarea ? undefined : 'text')}
            value={tempValue}
            onChange={(e: any) => setTempValue(e.target.value)}
            onKeyDown={(e: any) => {
              if (e.key === 'Enter' && !isTextarea) commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            onBlur={commitEdit}
            rows={isTextarea ? 3 : undefined}
            className={clsx(
              'w-full border border-primary-400 rounded px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary-300',
              'bg-white dark:bg-steel-700 text-steel-900 dark:text-steel-100',
              isTextarea ? 'resize-y' : ''
            )}
          />
          <button onClick={commitEdit} className="text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 mt-0.5 shrink-0">
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      );
    }
    return (
      <div className={clsx('flex items-start gap-1 group min-h-[20px]', canEdit && 'cursor-pointer')}
        onClick={() => canEdit && startEdit(p, f)}>
        <span className={clsx(
          'text-xs',
          value === '—' ? 'text-steel-300 dark:text-steel-600 italic' : 'text-steel-700 dark:text-steel-300',
          f.type === 'currency' && value !== '—' && 'font-mono',
        )}>
          {f.type === 'textarea' && value !== '—' && value.length > 120 ? value.slice(0, 120) + '...' : value}
        </span>
        {canEdit && (
          <Edit3 className="h-3 w-3 text-steel-300 dark:text-steel-600 opacity-0 group-hover:opacity-100 transition shrink-0 mt-0.5" />
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* ── Resumen de KPIs Superiores ── */}
      <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 shadow-sm p-4 sm:p-6 mb-6">
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-6 items-center">
          <div className="text-center lg:border-r border-steel-100 dark:border-steel-700 pb-4 lg:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Proyectos</p>
            <p className="text-2xl font-black text-steel-900 dark:text-white">{displayKpis.count}</p>
          </div>
          
          <div className="text-center lg:border-r border-steel-100 dark:border-steel-700 pb-4 lg:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Cartera Total</p>
            <p className="text-lg font-black text-primary-700 dark:text-primary-400 font-mono">{formatCOP(displayKpis.valorTotal)}</p>
          </div>

          <div className="text-center lg:border-r border-steel-100 dark:border-steel-700 pb-4 lg:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Facturado</p>
            <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatCOP(displayKpis.facturado)}</p>
          </div>

          <div className="text-center lg:border-r border-steel-100 dark:border-steel-700 pb-4 lg:pb-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Utilidad</p>
            <p className="text-lg font-black text-violet-600 dark:text-violet-400 font-mono">{formatCOP(displayKpis.utilidad)}</p>
          </div>

          {/* Status Section - Styled like Portafolio banner mini-stats but on white background */}
          <div className="col-span-2 lg:col-span-2 flex justify-around items-center bg-steel-50/50 dark:bg-steel-900/50 rounded-xl p-3 border border-steel-100 dark:border-steel-800">
            <button 
              onClick={() => changeStatusFilter(statusFilter === 'en_progreso' ? 'todos' : 'en_progreso')}
              className={clsx(
                "text-center transition-all px-2 py-1 rounded-lg",
                statusFilter === 'en_progreso' ? "bg-primary-100 dark:bg-primary-900/40 ring-1 ring-primary-500 shadow-sm" : "hover:bg-steel-100 dark:hover:bg-steel-800"
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-primary-600 dark:text-primary-400 mb-0.5">En Progreso</p>
              <p className="text-2xl font-black text-primary-700 dark:text-primary-300 leading-none">{kpis.enProgreso}</p>
            </button>
            
            <div className="w-px h-8 bg-steel-200 dark:bg-steel-700" />
            
            <button 
              onClick={() => changeStatusFilter(statusFilter === 'atrasado' ? 'todos' : 'atrasado')}
              className={clsx(
                "text-center transition-all px-2 py-1 rounded-lg",
                statusFilter === 'atrasado' ? "bg-amber-100 dark:bg-amber-900/40 ring-1 ring-amber-500 shadow-sm" : "hover:bg-steel-100 dark:hover:bg-steel-800"
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500 dark:text-amber-400 mb-0.5">Atrasados</p>
              <p className="text-2xl font-black text-amber-500 dark:text-amber-400 leading-none">{kpis.atrasados}</p>
            </button>
            
            <div className="w-px h-8 bg-steel-200 dark:bg-steel-700" />
            
            <button 
              onClick={() => changeStatusFilter(statusFilter === 'completado' ? 'todos' : 'completado')}
              className={clsx(
                "text-center transition-all px-2 py-1 rounded-lg",
                statusFilter === 'completado' ? "bg-emerald-100 dark:bg-emerald-900/40 ring-1 ring-emerald-500 shadow-sm" : "hover:bg-steel-100 dark:hover:bg-steel-800"
              )}
            >
              <p className="text-[9px] font-bold uppercase tracking-widest text-emerald-500 dark:text-emerald-400 mb-0.5">Completados</p>
              <p className="text-2xl font-black text-emerald-500 dark:text-emerald-400 leading-none">{kpis.completados}</p>
            </button>
          </div>
        </div>
      </div>

      {/* ── Barra de búsqueda + filtros de grupo ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-steel-400 dark:text-steel-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código, cliente, ubicación..."
            className="w-full pl-9 pr-3 py-2 border border-steel-300 dark:border-steel-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white dark:bg-steel-800 text-steel-900 dark:text-steel-100 placeholder-steel-400 dark:placeholder-steel-500"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <Layers className="h-3.5 w-3.5 text-steel-400 dark:text-steel-500" />
          {(['todos', 'PCM', 'PCS', 'CARSAN'] as const).map(f => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-[11px] font-bold transition border',
                activeFilter === f
                  ? f === 'todos'
                    ? 'bg-steel-800 dark:bg-steel-200 text-white dark:text-steel-900 border-steel-800 dark:border-steel-200'
                    : f === 'PCM'
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-violet-600 text-white border-violet-600'
                  : 'bg-white dark:bg-steel-800 text-steel-600 dark:text-steel-300 border-steel-300 dark:border-steel-600 hover:border-steel-400 dark:hover:border-steel-500'
              )}
            >
              {f === 'todos' ? 'Todos' : f === 'PCM' ? 'PC Mejía' : f === 'PCS' ? 'PC Solar' : 'CARSAN'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className={clsx(
            "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition border",
            selectedHistoryWeek
              ? "bg-amber-100 hover:bg-amber-200 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300"
              : "bg-white hover:bg-steel-50 text-steel-700 border-steel-300 dark:bg-steel-800 dark:border-steel-600 dark:text-steel-300 dark:hover:bg-steel-700"
          )}
        >
          <Calendar className="h-3.5 w-3.5" />
          {selectedHistoryWeek ? `Corte: ${selectedHistoryWeek.includes('-') && selectedHistoryWeek.length >= 8 ? selectedHistoryWeek.split('-').reverse().join('/') : selectedHistoryWeek}` : 'Seleccionar Fecha de Corte'}
        </button>
        
        {selectedHistoryWeek && (
          <button
            onClick={() => setSelectedHistoryWeek(null)}
            className="text-[10px] text-amber-600 dark:text-amber-400 hover:underline font-medium"
          >
            Ver Actual
          </button>
        )}

        {canExport && (
          <button
            onClick={handleExportExcel}
            disabled={isExporting}
            className={clsx(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold transition border",
              "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600 disabled:opacity-50"
            )}
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            {isExporting ? 'Exportando...' : 'Exportar Excel'}
          </button>
        )}

        <span className="text-[10px] text-steel-400 dark:text-steel-500 ml-auto flex items-center gap-2">
          {loadingHistory && <Loader2 className="h-3 w-3 animate-spin text-primary-500" />}
          {filtered.length} de {displayProjects.length} proyectos
        </span>
      </div>

      {/* ── Tabla con grupos ── */}
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse table-layout-fixed">
            <thead>
              <tr className="bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700">
                <th className="px-2 py-2 text-left text-steel-500 dark:text-steel-400 font-semibold w-[36px] sticky left-0 bg-steel-50 dark:bg-steel-900 z-20">#</th>
                {(
                  [
                    { col: 'nombre' as SortCol,      label: 'Proyecto',              align: 'left',   cls: 'min-w-[180px] sticky left-[36px] bg-steel-50 dark:bg-steel-900 z-20 border-r border-steel-200 dark:border-steel-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]' },
                    { col: 'codigo' as SortCol,       label: 'Código',                align: 'left',   cls: 'min-w-[70px]' },
                    { col: 'cliente' as SortCol,      label: 'Cliente',               align: 'left',   cls: 'min-w-[120px]' },
                    { col: 'director' as SortCol,     label: 'Director',              align: 'left',   cls: 'min-w-[110px]' },
                    { col: 'valor' as SortCol,        label: 'Valor Contrato',        align: 'right',  cls: 'min-w-[95px]' },
                    { col: 'avance_prog' as SortCol,  label: 'Avance Prog.',          align: 'center', cls: 'min-w-[75px]' },
                    { col: 'avance_real' as SortCol,  label: 'Avance Real',           align: 'center', cls: 'min-w-[75px]' },
                    { col: 'facturado' as SortCol,    label: 'Facturado',             align: 'right',  cls: 'min-w-[95px]' },
                    { col: 'utilidad' as SortCol,     label: 'Utilidad',              align: 'right',  cls: 'min-w-[90px]' },
                    { col: 'estado' as SortCol,       label: 'Estado',                align: 'center', cls: 'min-w-[80px]' },
                  ] as const
                ).map(({ col, label, align, cls }) => {
                  const active = sortCol === col;
                  const Icon = active ? (sortDir === 'desc' ? ArrowDown : ArrowUp) : ArrowUpDown;
                  return (
                    <th key={col}
                      className={clsx('px-2 py-2 font-semibold', cls,
                        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left'
                      )}
                    >
                      <button
                        onClick={() => handleSort(col)}
                        className={clsx(
                          'inline-flex items-center gap-1 group transition rounded hover:text-primary-600 dark:hover:text-primary-400',
                          active ? 'text-primary-600 dark:text-primary-400' : 'text-steel-500 dark:text-steel-400',
                          align === 'right' ? 'flex-row-reverse' : ''
                        )}
                      >
                        <span className="text-[11px]">{label}</span>
                        <Icon className={clsx('h-3 w-3 shrink-0 transition',
                          active ? 'opacity-100' : 'opacity-30 group-hover:opacity-70'
                        )} />
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
              {groups.map(({ key: gKey, projects: gProjects }) => {
                const gcfg    = GROUP_CONFIG[gKey];
                const gkpis   = groupKpis(gProjects);
                const collapsed = collapsedGroups.has(gKey);

                return (
                  <Fragment key={gKey}>
                    {/* ── Encabezado de grupo ── */}
                    <tr
                      className={clsx('cursor-pointer select-none', gcfg.colorBg)}
                      onClick={() => toggleGroup(gKey)}
                    >
                      <td colSpan={11} className={clsx('px-3 py-2 border-y', gcfg.colorBorder)}>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className={gcfg.colorText}>
                            {collapsed
                              ? <ChevronRight className="h-4 w-4" />
                              : <ChevronDown className="h-4 w-4" />}
                          </span>
                          <span className={clsx('text-[11px] font-bold', gcfg.colorText)}>
                            {gcfg.sublabel}
                          </span>
                          <span className={clsx('text-[10px] font-semibold opacity-70', gcfg.colorText)}>
                            {gkpis.count} {gkpis.count === 1 ? 'proyecto' : 'proyectos'}
                          </span>
                          {gkpis.count > 0 && (
                            <div className="ml-auto flex items-center gap-4 flex-wrap">
                              <span className="text-[10px] text-steel-500 dark:text-steel-400">
                                Cartera: <strong className={clsx('font-mono', gcfg.colorText)}>{formatCOP(gkpis.valorTotal)}</strong>
                              </span>
                              <span className="text-[10px] text-steel-500 dark:text-steel-400">
                                Facturado: <strong className="font-mono text-emerald-700 dark:text-emerald-400">{formatCOP(gkpis.facturado)}</strong>
                              </span>
                              <span className="text-[10px] text-steel-500 dark:text-steel-400">
                                Utilidad: <strong className="font-mono text-violet-700 dark:text-violet-400">{formatCOP(gkpis.utilidad)}</strong>
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                ✓ {gkpis.completados} completados
                              </span>
                              {gkpis.atrasados > 0 && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                  ⚠ {gkpis.atrasados} atrasados
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Vacío ── */}
                    {!collapsed && gProjects.length === 0 && (
                      <tr>
                        <td colSpan={11} className="px-6 py-6 text-center">
                          <div className="flex flex-col items-center gap-2 text-steel-400 dark:text-steel-500">
                            <FolderOpen className="h-8 w-8 opacity-40" />
                            <p className="text-xs font-medium">No hay proyectos en el grupo {gcfg.label}</p>
                            <p className="text-[10px] opacity-70">Los proyectos asignados a este grupo aparecerán aquí</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* ── Filas ── */}
                    {!collapsed && gProjects.map((p, idx) => {
                      const isExp = expandedId === p.id;
                      const st    = projectStatus(p);
                      const stCfg = STATUS_CONFIG[st];
                      const StIcon = stCfg.icon;
                      const repStatus = getReportDateStatus(p.fecha_informe);

                      return (
                        <Fragment key={p.id}>
                          <tr
                            className={clsx(
                              'hover:bg-steel-50/60 dark:hover:bg-steel-700/40 transition cursor-pointer group',
                              isExp && 'bg-primary-50/30 dark:bg-primary-950/20'
                            )}
                            onClick={() => setExpandedId(prev => (prev === p.id ? null : p.id))}
                          >
                            <td className="px-2 py-2 sticky left-0 bg-white dark:bg-steel-800 group-hover:bg-steel-50 dark:group-hover:bg-steel-700 transition z-10">
                              <div className={clsx(
                                'mx-auto flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] font-bold text-[10px] text-steel-900 dark:text-steel-100',
                                repStatus === 'green' ? 'border-emerald-500 bg-emerald-50/30' :
                                repStatus === 'yellow' ? 'border-amber-500 bg-amber-50/30' :
                                'border-red-500 bg-red-50/30'
                              )}>
                                {idx + 1}
                              </div>
                            </td>
                            <td className="px-2 py-2 sticky left-[36px] bg-white dark:bg-steel-800 group-hover:bg-steel-50 dark:group-hover:bg-steel-700 transition z-10 border-r border-steel-100 dark:border-steel-700 shadow-[2px_0_5px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center gap-1.5">
                                {isExp
                                  ? <ChevronDown className="h-3 w-3 text-primary-500 shrink-0" />
                                  : <ChevronRight className="h-3 w-3 text-steel-400 dark:text-steel-500 shrink-0" />
                                }
                                <span className="font-semibold text-steel-800 dark:text-steel-100 truncate max-w-[170px]" title={p.nombre_proyecto || p.sheet_name}>
                                  {p.nombre_proyecto || p.sheet_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-2 py-2 font-mono text-steel-600 dark:text-steel-400">{p.codigo_proyecto || '—'}</td>
                            <td className="px-2 py-2 text-steel-600 dark:text-steel-400 truncate max-w-[120px]" title={p.cliente || '—'}>{p.cliente || '—'}</td>
                            <td className="px-2 py-2 text-steel-600 dark:text-steel-400 truncate max-w-[110px]" title={p.director_proyectos || '—'}>{p.director_proyectos || '—'}</td>
                            <td className="px-2 py-2 text-right font-mono text-steel-700 dark:text-steel-300">{formatCOP(p.valor_actual_contrato || 0)}</td>
                            <td className="px-2 py-2 text-center">
                              {p.avance_programado != null ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="font-bold text-primary-700 dark:text-primary-400 text-[10px]">{formatPercent(p.avance_programado)}</span>
                                  <div className="h-1 w-10 bg-steel-100 dark:bg-steel-700 rounded-full">
                                    <div className="h-full bg-primary-500 rounded-full"
                                      style={{ width: `${Math.min((p.avance_programado <= 1 ? p.avance_programado * 100 : p.avance_programado), 100)}%` }} />
                                  </div>
                                </div>
                              ) : <span className="text-steel-300 dark:text-steel-600">—</span>}
                            </td>
                            <td className="px-2 py-2 text-center">
                              {p.avance_real != null ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className={clsx('font-bold text-[10px]', st === 'atrasado' ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400')}>
                                    {formatPercent(p.avance_real)}
                                  </span>
                                  <div className="h-1 w-10 bg-steel-100 dark:bg-steel-700 rounded-full">
                                    <div className={clsx('h-full rounded-full', st === 'atrasado' ? 'bg-amber-400' : 'bg-emerald-500')}
                                      style={{ width: `${Math.min((p.avance_real <= 1 ? p.avance_real * 100 : p.avance_real), 100)}%` }} />
                                  </div>
                                </div>
                              ) : <span className="text-steel-300 dark:text-steel-600">—</span>}
                            </td>
                            <td className="px-2 py-2 text-right font-mono text-steel-700 dark:text-steel-300">{p.valor_facturado ? formatCOP(p.valor_facturado) : '—'}</td>
                            <td className="px-2 py-2 text-right font-mono text-steel-700 dark:text-steel-300">{p.utilidad_actual ? formatCOP(p.utilidad_actual) : '—'}</td>
                            <td className="px-2 py-2 text-center">
                              <span className={clsx('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[8.5px] font-semibold border', stCfg.bg, stCfg.border, stCfg.color)}>
                                <StIcon className="h-2.5 w-2.5" />
                                {stCfg.label}
                              </span>
                            </td>
                          </tr>

                          {/* Detalle expandido */}
                          {isExp && (
                            <tr>
                              <td colSpan={11} className="p-0">
                                <div className={clsx('border-t-2 bg-steel-50/50 dark:bg-steel-900/50 px-6 py-5', gcfg.colorBorder)}>
                                  <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-sm font-bold text-steel-800 dark:text-steel-100">
                                      {p.nombre_proyecto || p.sheet_name}
                                    </h4>
                                    {p.fecha_informe && (() => {
                                      const status = getReportDateStatus(p.fecha_informe);
                                      let formattedDate = p.fecha_informe;
                                      if (/^\d{4}-\d{2}-\d{2}(T.*)?$/.test(formattedDate)) {
                                        const [year, month, day] = formattedDate.split('T')[0].split('-');
                                        formattedDate = `${day}/${month}/${year.slice(2)}`;
                                      }

                                      const statusLabel = {
                                        green: 'Actualizado',
                                        yellow: 'Actualizar',
                                        red: 'Actualizar'
                                      }[status];

                                      return (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-steel-400 dark:text-steel-500">Fecha del informe:</span>
                                          <span className={clsx(
                                            'text-[10px] font-bold px-1.5 py-0.5 rounded border',
                                            status === 'green' && 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
                                            status === 'yellow' && 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
                                            status === 'red' && 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800'
                                          )}>
                                            {formattedDate} — {statusLabel}
                                          </span>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Datos Generales */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="h-1 w-4 bg-steel-400 dark:bg-steel-500 rounded" />
                                        <h5 className="text-[10px] font-bold uppercase tracking-wider text-steel-500 dark:text-steel-400">Datos Generales</h5>
                                        <span className="text-[9px] text-steel-400 dark:text-steel-500 ml-1">
                                          {(user?.role === 'administrador' || user?.role === 'gerente') ? '(editable)' : '(solo lectura)'}
                                        </span>
                                      </div>
                                      <div className="bg-steel-100/60 dark:bg-steel-800/60 rounded-xl border border-steel-200 dark:border-steel-700 p-4 space-y-2.5">
                                        {DATOS_GENERALES_FIELDS.map(f => {
                                          const isGeneralEditable = user?.role === 'administrador' || user?.role === 'gerente';
                                          return (
                                            <div key={f.key} className="flex gap-2">
                                              <span className="text-[10px] text-steel-400 dark:text-steel-500 font-semibold w-44 shrink-0 pt-0.5">{f.label}</span>
                                              <div className="flex-1">
                                                {renderField(p, f)}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                    {/* Seguimiento */}
                                    <div>
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className={clsx('h-1 w-4 rounded', gcfg.colorRow)} />
                                        <h5 className={clsx('text-[10px] font-bold uppercase tracking-wider', gcfg.colorText)}>Seguimiento</h5>
                                        <span className={clsx('text-[9px] ml-1 opacity-70', gcfg.colorText)}>(editable)</span>
                                      </div>
                                      <div className={clsx('bg-white dark:bg-steel-800 rounded-xl border p-4 space-y-2.5', gcfg.colorBorder)}>
                                        {SEGUIMIENTO_FIELDS.map(f => (
                                          <div key={f.key} className="flex gap-2">
                                            <span className="text-[10px] text-steel-400 dark:text-steel-500 font-semibold w-44 shrink-0 pt-0.5">{f.label}</span>
                                            <div className="flex-1">
                                              {renderField(p, f)}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

      <Modal open={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} showClose={false} className="p-0 w-full max-w-lg overflow-hidden bg-white dark:bg-steel-800">
        <div className="bg-primary-900 p-6 text-white relative">
          <button 
            onClick={() => setIsHistoryModalOpen(false)}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
            <Calendar className="h-5 w-5 text-white/90" />
            Máquina del Tiempo (Cortes Históricos)
          </h2>
          <p className="text-sm text-blue-100/90">
            Exporta y visualiza la fotografía exacta de tus proyectos en el pasado.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* PASO 1 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-steel-700 dark:text-steel-300 flex items-center gap-2 border-b border-steel-200 dark:border-steel-700 pb-2">
              <span className="flex items-center justify-center bg-primary-100 text-primary-700 w-5 h-5 rounded-full text-xs">1</span>
              Selecciona el Proyecto
            </h3>
            <div className="relative" ref={projectDropdownRef}>
              <button
                type="button"
                onClick={() => {
                  setIsProjectDropdownOpen(!isProjectDropdownOpen);
                  setProjectSearchQuery('');
                }}
                className="w-full text-left text-sm border border-steel-300 rounded-lg p-3 bg-steel-50 hover:bg-steel-100 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-steel-900 dark:border-steel-700 dark:text-white transition-all flex items-center justify-between shadow-sm"
              >
                <span>
                  {selectedHistoryProject === 'ALL'
                    ? '🏢 Todos los Proyectos'
                    : `📁 ${projects.find(p => p.id === selectedHistoryProject)?.nombre_proyecto || 'Proyecto'}`}
                </span>
                <ChevronDown className={clsx("h-4 w-4 text-steel-500 transition-transform", isProjectDropdownOpen && "rotate-180")} />
              </button>

              {isProjectDropdownOpen && (
                <div className="absolute z-[100] mt-1 w-full bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-lg shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                  <div className="p-2 border-b border-steel-100 dark:border-steel-750 flex items-center gap-2 bg-steel-50 dark:bg-steel-900/50">
                    <Search className="h-4 w-4 text-steel-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Buscar proyecto..."
                      value={projectSearchQuery}
                      onChange={(e) => setProjectSearchQuery(e.target.value)}
                      className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 p-1 dark:text-white"
                      autoFocus
                    />
                  </div>
                  <div className="max-h-56 overflow-y-auto p-1 divide-y divide-steel-50 dark:divide-steel-800/40">
                    {('todos los proyectos'.includes(projectSearchQuery.toLowerCase())) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedHistoryProject('ALL');
                          setSelectedHistoryWeek(null);
                          setIsProjectDropdownOpen(false);
                        }}
                        className={clsx(
                          "w-full text-left text-xs px-3 py-2 rounded-md transition-colors flex items-center gap-2",
                          selectedHistoryProject === 'ALL'
                            ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold"
                            : "text-steel-700 hover:bg-steel-50 dark:text-steel-300 dark:hover:bg-steel-850"
                        )}
                      >
                        🏢 Todos los Proyectos
                      </button>
                    )}
                    
                    {filteredHistoryDropdownProjects.length === 0 ? (
                      <div className="text-center text-xs text-steel-400 py-3 italic">
                        No se encontraron proyectos
                      </div>
                    ) : (
                      filteredHistoryDropdownProjects.map(p => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setSelectedHistoryProject(p.id);
                            setSelectedHistoryWeek(null);
                            setIsProjectDropdownOpen(false);
                          }}
                          className={clsx(
                            "w-full text-left text-xs px-3 py-2 rounded-md transition-colors flex items-center justify-between",
                            selectedHistoryProject === p.id
                              ? "bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400 font-bold"
                              : "text-steel-700 hover:bg-steel-50 dark:text-steel-300 dark:hover:bg-steel-850"
                          )}
                        >
                          <span className="truncate max-w-[85%]">📁 {p.nombre_proyecto || p.codigo_proyecto}</span>
                          <span className="text-[9px] font-mono text-steel-400 dark:text-steel-500">{p.codigo_proyecto}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* PASO 2 */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-steel-700 dark:text-steel-300 flex items-center gap-2 border-b border-steel-200 dark:border-steel-700 pb-2">
              <span className="flex items-center justify-center bg-primary-100 text-primary-700 w-5 h-5 rounded-full text-xs">2</span>
              Selecciona la Fecha de Corte
            </h3>
            
            {historyWeeks.length === 0 ? (
              <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 p-4 rounded-lg text-sm flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 flex-shrink-0" />
                <p>No hay historial de cortes disponible para el proyecto seleccionado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-48 overflow-y-auto p-1">
                {historyWeeks.map(week => (
                  <button
                    key={week}
                    onClick={() => {
                      setSelectedHistoryWeek(week);
                      setPendingAutoExport(true);
                      setIsHistoryModalOpen(false);
                    }}
                    className={clsx(
                      "flex flex-col items-center justify-center py-2 px-1 rounded-xl border-2 transition-all group",
                      selectedHistoryWeek === week
                        ? "border-primary-500 bg-primary-50 dark:bg-primary-900/20"
                        : "border-steel-200 hover:border-primary-300 dark:border-steel-700 dark:hover:border-primary-600 hover:shadow-sm"
                    )}
                  >
                    <span className={clsx(
                      "text-[10px] font-bold",
                      selectedHistoryWeek === week ? "text-primary-700 dark:text-primary-400" : "text-steel-700 dark:text-steel-300 group-hover:text-primary-600"
                    )}>
                      {week.includes('-') && week.length >= 8 ? week.split('-').reverse().join('/') : week}
                    </span>
                    <Download className={clsx(
                      "h-3 w-3 mt-1",
                      selectedHistoryWeek === week ? "text-primary-500 opacity-100" : "text-steel-400 opacity-0 group-hover:opacity-100 transition-opacity"
                    )} />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>
      </div>
    </div>
  );
}
