import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { CustomWeekData } from '@/types';
import HelpButton from '@/components/common/HelpButton';
import { useDocuments, CATEGORIES_MAP, type DocumentItem } from '@/data/documentsData';
import {
  FolderOpen, FileText, Eye, Download, Trash2, Upload, RefreshCw,
  TrendingUp, Minimize2, Maximize2, MessageSquare, Save, ChevronDown, ChevronRight,
  Calendar, Plus, Clock, AlertTriangle, CheckCircle2, X, Database, Activity as ActivityIcon, Zap,
  Lock, Unlock, Play,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import { ProjectProvider } from '@/contexts/ProjectContext';
import EmptyProjectState from '@/components/common/EmptyProjectState';
import clsx from 'clsx';
import {
  Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Area, ComposedChart, Dot,
} from 'recharts';
import { useAuthStore } from '@/stores/authStore';
import { logEdit } from '@/utils/activityTracker';
import { cronogramaApi, type CronogramaCorte, type CronogramaProyectado, type CronogramaSimulacion } from '@/services/api/cronograma';
import * as XLSX from 'xlsx';


// ============================================================
// TYPES & HELPERS — Data Isolation & Dynamic Loading
// ============================================================
export interface Activity {
  code: string;
  name: string;
  peso: number;
  inicio: string;
  fin: string;
  duracion: string;
  avanceProg: number;
  avanceReal: number;
  children?: Activity[];
}

function checkIsPatioSur(id?: string): boolean {
  return false; // Disable special case: Patio Sur now behaves dynamically from DB
}

/** 
 * Returns the base S-Curve data. 
 */
function getInitialSCurveData(projectId: string) {
  return [{ w: 'S-00', d: 'Base', p: 0.00, e: 0.00 as number | null }];
}

/** Returns the programmed % lookup table. */
function getInitialWeeklyProg(projectId: string): { w: string; d: string; p: number }[] {
  return [];
}

/** Returns the WBS base structure. */
function getCronogramaBase(projectId: string): Activity[] {
  return [];
}




// ============================================================
// HELPERS — Semanas personalizadas
// ============================================================
import { loadCustomWeeks, saveCustomWeeksToDB, fetchCustomWeeksFromDB, loadActivityNotes, fetchActivityNotesFromDB, saveActivityNotesToDB } from '@/utils/reportData';

/** Extract all leaf avanceReal values from the WBS tree */
function getLeafValues(acts: Activity[]): Record<string, number> {
  const vals: Record<string, number> = {};
  for (const a of acts) {
    if (a.children && a.children.length > 0) {
      Object.assign(vals, getLeafValues(a.children));
    } else {
      vals[a.code] = a.avanceReal;
    }
  }
  return vals;
}

/** Apply avanceReal overrides to leaf nodes, recompute parents bottom-up */
function applyOverrides(acts: Activity[], overrides: Record<string, number>): Activity[] {
  return acts.map(a => {
    if (a.children && a.children.length > 0) {
      const newChildren = applyOverrides(a.children, overrides);
      const totalPeso = newChildren.reduce((s, c) => s + c.peso, 0);
      const wReal = newChildren.reduce((s, c) => s + c.avanceReal * c.peso, 0);
      return {
        ...a,
        children: newChildren,
        avanceReal: totalPeso > 0 ? (wReal / totalPeso) : 0,
      };
    }
    return {
      ...a,
      avanceReal: overrides[a.code] !== undefined ? overrides[a.code] : a.avanceReal,
    };
  });
}

/** Compute date label from week number — uses exact Excel lookup, falls back to calculation */
function computeWeekDate(weekNum: number, weeklyProgMap: Map<number, { d: string; p: number }>): string {
  const entry = weeklyProgMap.get(weekNum);
  if (entry) return entry.d;
  // Fallback for weeks beyond the table
  const start = new Date(2025, 5, 18); // 18 Jun 2025
  const date = new Date(start.getTime() + weekNum * 7 * 24 * 60 * 60 * 1000);
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  return `${date.getDate().toString().padStart(2, '0')} ${months[date.getMonth()]}`;
}

/** Get exact programmed % for a week number from the weekly lookup table */
function interpolateProgrammed(weekNum: number, weeklyProgMap: Map<number, { d: string; p: number }>): number {
  const entry = weeklyProgMap.get(weekNum);
  if (entry) return entry.p;
  return 0;
}


// ============================================================
// Help
// ============================================================
// ============================================================
// Help
// ============================================================
function getCronogramaHelp(projectId: string) {
  const isPatioSur = checkIsPatioSur(projectId);
  return {
    pageTitle: 'Ayuda — Cronograma',
    description: isPatioSur 
      ? 'Cronograma WBS del proyecto Patio de Operacion Sur con 515 actividades ponderadas. ' +
        'Muestra avance programado vs real por semana. La semana activa determina los KPIs del Dashboard (SPI, EV, CPI). ' +
        'Fuente base: "Curva S (19 mar) Pablo.xlsx". Semanas S-41 en adelante se ingresan manualmente.'
      : 'Cronograma WBS del proyecto. Permite gestionar el avance físico de las actividades y visualizar la Curva S.',
    pdfUrl: '/docs/Informe_Dashboard_Metricas.pdf',
    pdfName: 'Informe_Dashboard_Metricas.pdf',
    sections: [
      {
        title: 'Semanas de Corte',
        items: [
          { color: '#1B5EAB', label: 'Semanas base (azul)', description: 'Datos historicos cargados desde el cronograma inicial. No editables.' },
          { color: '#16A34A', label: 'Semanas personalizadas (verde)', description: 'Semanas ingresadas manualmente por el equipo.' },
          { icon: '✏️', label: 'Como agregar una semana nueva', description: '1) Click en "+ S-XX" para crear la semana. 2) Seleccionar la semana verde creada. 3) Expandir los capitulos en la tabla. 4) Editar el % de avance real de cada actividad hoja. 5) Presionar Enter o hacer click fuera del campo para guardar.' },
        ],
      },
      {
        title: 'Curva S — Avance Acumulado',
        items: [
          { color: '#1B5EAB', label: 'Linea Azul — Avance Planificado', description: 'Progreso acumulado segun cronograma base.' },
          { color: '#16A34A', label: 'Linea Verde — Avance Real', description: 'Progreso real acumulado al corte de cada semana.' },
        ],
      },
    ],
  };
}


// ============================================================
// Sub-components
// ============================================================
function GanttBar({ prog, real }: { prog: number; real: number }) {
  const diff = real - prog;
  return (
    <div className="flex items-center gap-2 min-w-[180px]">
      <div className="flex-1 h-4 bg-steel-100 dark:bg-steel-700 rounded-full overflow-hidden relative">
        <div className="absolute inset-y-0 left-0 bg-primary-200 rounded-full" style={{ width: `${Math.min(prog, 100)}%` }} />
        <div className={clsx('absolute inset-y-0 left-0 rounded-full', real >= prog ? 'bg-emerald-500' : 'bg-red-400')} style={{ width: `${Math.min(real, 100)}%` }} />
      </div>
      <span className={clsx('text-[10px] font-bold w-12 text-right', diff >= 0 ? 'text-emerald-600' : diff > -10 ? 'text-amber-600' : 'text-red-600')}>
        {real.toFixed(0)}%
      </span>
    </div>
  );
}

function StatusBadge({ prog, real }: { prog: number; real: number }) {
  const diff = real - prog;
  if (real >= 100) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700">Completado</span>;
  if (diff >= 0) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-600">En tiempo</span>;
  if (diff > -10) return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700">Leve atraso</span>;
  return <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-50 text-red-600">Critico</span>;
}

function ObservationModal({
  isOpen,
  onClose,
  task,
  initialNote,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Activity | null;
  initialNote: string;
  onSave: (note: string) => void;
}) {
  const [note, setNote] = useState(initialNote);

  useEffect(() => {
    setNote(initialNote);
  }, [initialNote, isOpen]);

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-steel-900/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-700/50 flex items-center justify-between bg-steel-50/50 dark:bg-steel-900/50">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary-600" />
            <h3 className="text-sm font-bold text-steel-800 dark:text-steel-100">Notas de Actividad</h3>
          </div>
          <button onClick={onClose} className="text-steel-400 dark:text-steel-500 hover:text-steel-600 transition p-1 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-[10px] uppercase tracking-wider font-bold text-steel-400 dark:text-steel-500 mb-1">Actividad</p>
            <p className="text-xs font-semibold text-steel-700 dark:text-steel-200 bg-steel-50 dark:bg-steel-900 p-2 rounded-lg border border-steel-100 dark:border-steel-700/50">
              <span className="text-primary-600 mr-2">{task.code}</span>
              {task.name}
            </p>
          </div>
          <div>
            <label className="text-[10px] uppercase tracking-wider font-bold text-steel-400 dark:text-steel-500 block mb-2">Notas / Observaciones</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Escribe aquí las observaciones del progreso..."
              className="w-full h-32 p-3 text-xs text-steel-700 dark:text-steel-200 bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none transition resize-none placeholder:text-steel-300 dark:placeholder:text-steel-600"
              autoFocus
            />
          </div>
        </div>
        <div className="px-6 py-4 bg-steel-50/50 dark:bg-steel-900/50 border-t border-steel-100 dark:border-steel-700/50 flex items-center justify-end gap-3">
          {initialNote && (
            <button
              onClick={() => { onSave(''); onClose(); }}
              className="mr-auto px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition flex items-center gap-1.5"
              title="Eliminar nota"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Borrar
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-700 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => { onSave(note); onClose(); }}
            className="px-6 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-200 transition active:scale-95 flex items-center gap-2"
          >
            <Save className="h-3.5 w-3.5" />
            Guardar Notas
          </button>
        </div>
      </div>
    </div>
  );
}

function ActivityRow({
  act, level = 0, editable = false, onChangeReal,
  onDoubleClickRow,
  allNotes,
  forceOpen,
  unlockedActivities,
  onToggleLock,
  isSimulationMode = false,
}: {
  act: Activity;
  level?: number;
  editable?: boolean;
  onChangeReal?: (code: string, value: number) => void;
  onDoubleClickRow?: (act: Activity) => void;
  allNotes?: Record<string, string>;
  forceOpen?: boolean;
  unlockedActivities?: Record<string, boolean>;
  onToggleLock?: (code: string) => void;
  isSimulationMode?: boolean;
}) {
  const [manualOpen, setManualOpen] = useState<boolean | null>(null);
  const isExpanded = manualOpen !== null ? manualOpen : (forceOpen || level === 0);


  // Estado local del input — evita re-renders por cada tecla y permite escribir multi-dígito
  const [localVal, setLocalVal] = useState<string>(String(act.avanceReal));
  const hasChildren = act.children && act.children.length > 0;
  const isLeaf = !hasChildren;
  const fmtDate = (d: string) => { const [, m, day] = d.split('-'); return `${day}/${m}`; };
  const diff = act.avanceReal - act.avanceProg;
  const isLevel0 = level === 0;

  const showLock = isSimulationMode && (act.avanceReal >= 100 || unlockedActivities?.[act.code] !== undefined);
  const isLocked = showLock && !unlockedActivities?.[act.code];

  // Sincronizar localVal cuando el valor externo cambia (ej: recalculo de otro campo)
  useEffect(() => {
    setLocalVal(String(act.avanceReal));
  }, [act.avanceReal]);

  // Confirmar y guardar al salir del campo (onBlur)
  const handleBlur = () => {
    const v = Math.min(100, Math.max(0, parseFloat(localVal) || 0));
    setLocalVal(String(v));
    onChangeReal?.(act.code, v);
  };

  return (
    <>
      <tr
        onDoubleClick={() => onDoubleClickRow?.(act)}
        className={clsx(
          'hover:bg-steel-50/50 dark:hover:bg-steel-700/30 transition cursor-pointer select-none',
          isLevel0 ? 'border-b border-steel-200 dark:border-steel-700' : 'border-b border-steel-100 dark:border-steel-700/50',
          diff < -10 && 'bg-red-50/30',
        )}
      >
        {/* Code + expand */}
        <td className={clsx('px-3 py-2.5 whitespace-nowrap', isLevel0 ? 'font-bold text-steel-800 dark:text-steel-100' : 'text-steel-500 dark:text-steel-400')} style={{ paddingLeft: `${12 + level * 20}px` }}>
          <div className="flex items-center gap-1">
            {hasChildren ? (
              <button onClick={() => setManualOpen(!isExpanded)} className="p-0.5 hover:bg-steel-200 rounded">
                {isExpanded ? <ChevronDown className="h-3 w-3 text-steel-400" /> : <ChevronRight className="h-3 w-3 text-steel-400" />}
              </button>
            ) : (
              <span className="w-4" />
            )}
            <span className="text-xs">{act.code}</span>
          </div>
        </td>
        {/* Name */}
        <td className={clsx('px-3 py-2.5 text-xs', isLevel0 ? 'font-semibold text-steel-800 dark:text-steel-100' : 'text-steel-600 dark:text-steel-300')}>
          <div className="flex items-center gap-2 group/name">
            <span>{act.name}</span>
            {allNotes?.[act.code] && (
              <span 
                className="inline-flex items-center justify-center bg-amber-100 text-amber-600 px-1.5 border border-amber-200 rounded text-[9px] font-bold cursor-help shrink-0" 
                title={allNotes[act.code]} 
              >
                Nota
              </span>
            )}
          </div>
        </td>
        {/* Peso */}
        <td className="px-3 py-2.5 text-xs text-center font-medium text-steel-600 dark:text-steel-300">
          {(act.peso * 100).toFixed(0)}%
        </td>
        {/* Fechas */}
        <td className="px-3 py-2.5 text-[10px] text-steel-500 dark:text-steel-400 whitespace-nowrap">
          {fmtDate(act.inicio)} — {fmtDate(act.fin)}
        </td>
        {/* Duracion */}
        <td className="px-3 py-2.5 text-[10px] text-steel-400 dark:text-steel-500 text-center whitespace-nowrap">
          {act.duracion}
        </td>
        {/* Gantt bar / Editable */}
        <td className="px-3 py-2.5">
          {editable && isLeaf ? (
            <div className="flex items-center gap-2 min-w-[210px]">
              <div className="flex-1 h-4 bg-steel-100 dark:bg-steel-700 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 bg-primary-200 rounded-full" style={{ width: `${Math.min(act.avanceProg, 100)}%` }} />
                <div className={clsx('absolute inset-y-0 left-0 rounded-full', act.avanceReal >= act.avanceProg ? 'bg-emerald-500' : 'bg-red-400')} style={{ width: `${Math.min(act.avanceReal, 100)}%` }} />
              </div>
              
              {showLock && (
                <button
                  type="button"
                  onClick={() => onToggleLock?.(act.code)}
                  className={clsx(
                    "p-1 rounded transition-colors shrink-0",
                    isLocked ? "text-amber-600 hover:text-amber-700 bg-amber-50 dark:bg-amber-950/20" : "text-emerald-600 hover:text-emerald-700 bg-emerald-50 dark:bg-emerald-950/20"
                  )}
                  title={isLocked ? "Haga clic para desbloquear y permitir modificaciones" : "Haga clic para volver a bloquear (restablece al 100%)"}
                >
                  {isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                </button>
              )}

              <input
                type="number"
                min={0}
                max={100}
                step={1}
                value={localVal}
                disabled={isLocked}
                onChange={(e) => setLocalVal(e.target.value)}
                onBlur={handleBlur}
                onKeyDown={(e) => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                className={clsx(
                  "w-14 px-1 py-0.5 text-[10px] font-bold text-right border rounded focus:outline-none focus:ring-1",
                  isLocked 
                    ? "bg-steel-100 text-steel-400 border-steel-200 dark:bg-steel-800 dark:border-steel-700 cursor-not-allowed" 
                    : "bg-primary-50 text-primary-700 border-primary-300 focus:ring-primary-400"
                )}
              />
            </div>
          ) : (
            <GanttBar prog={act.avanceProg} real={act.avanceReal} />
          )}
        </td>
        {/* Status */}
        <td className="px-3 py-2.5">
          <StatusBadge prog={act.avanceProg} real={act.avanceReal} />
        </td>
      </tr>
      {hasChildren && isExpanded && act.children!.map((c) => (
        <ActivityRow
          key={c.code}
          act={c}
          level={level + 1}
          editable={editable}
          onChangeReal={onChangeReal}
          onDoubleClickRow={onDoubleClickRow}
          allNotes={allNotes}
          forceOpen={forceOpen}
          unlockedActivities={unlockedActivities}
          onToggleLock={onToggleLock}
          isSimulationMode={isSimulationMode}
        />
      ))}
    </>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SCurveTooltip = ({ active, payload }: { active?: boolean, payload?: any[] }) => {

  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-steel-800 rounded-lg border border-steel-200 dark:border-steel-700 shadow-lg px-3 py-2 text-xs">
      <p className="font-bold text-steel-800 dark:text-steel-100">{d.w} — {d.d}</p>
      <p className="text-primary-600">Plan: {d.p.toFixed(1)}%</p>
      {d.e !== null && <p className="text-emerald-600">Real: {d.e.toFixed(1)}%</p>}
      {d.s !== null && d.s !== undefined && <p className="text-orange-600 font-bold">Simulado: {d.s.toFixed(1)}%</p>}
    </div>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function CronogramaPage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = urlProjectId || 'patio-sur-oe1035';
  const isPatioSur = checkIsPatioSur(projectId);

  const sCurveBase = useMemo(() => getInitialSCurveData(projectId), [projectId]);
  const weeklyProgrammed = useMemo(() => getInitialWeeklyProg(projectId), [projectId]);
  const weeklyProgMap = useMemo(() => new Map<number, { d: string; p: number }>(
    weeklyProgrammed.map(wp => [parseInt(wp.w.replace('S-', '')), { d: wp.d, p: wp.p }])
  ), [weeklyProgrammed]);

  // ── Dynamic Activities Data ──
  const { data: dbActividadesRaw } = useQuery({
    queryKey: ['cronogramaActividades', projectId],
    queryFn: () => (projectId && !isPatioSur ? cronogramaApi.getActividades(projectId) : []),
    enabled: !!projectId && !isPatioSur,
  });

  const currentCronogramaBase = useMemo(() => {
    if (isPatioSur) {
      return getCronogramaBase(projectId);
    }
    if (!dbActividadesRaw || dbActividadesRaw.length === 0) return [];
    
    const root: Activity[] = [];
    const map = new Map<string, Activity>();

    const sorted = [...dbActividadesRaw].sort((a, b) => {
      return String(a.cod).localeCompare(String(b.cod), undefined, { numeric: true, sensitivity: 'base' });
    });

    for (const item of sorted) {
      const act: Activity = {
        code: String(item.cod),
        name: String(item.actividad),
        peso: Number(item.peso) / 100, // Convert percentage (e.g. 50.0) to ratio (e.g. 0.5)
        inicio: String(item.fecha_inicio),
        fin: String(item.fecha_fin),
        duracion: String(item.duracion),
        avanceProg: 0,
        avanceReal: Number(item.avance_real ?? 0),
        children: []
      };
      map.set(act.code, act);

      const codeParts = act.code.split('.');
      if (codeParts.length === 1) {
        root.push(act);
      } else {
        const parentCode = codeParts.slice(0, -1).join('.');
        const parent = map.get(parentCode);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(act);
        } else {
          root.push(act);
        }
      }
    }
    return root;
  }, [projectId, isPatioSur, dbActividadesRaw]);

  const cronogramaHelp = useMemo(() => getCronogramaHelp(projectId), [projectId]);

  const queryClient = useQueryClient();
  const invalidarModulos = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['cronogramaCortes', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['cronogramaProyectado', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['cronogramaActividades', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard', projectId] }),
      queryClient.invalidateQueries({ queryKey: ['projects'] }),
      queryClient.invalidateQueries({ queryKey: ['project', projectId] }),
    ]);
  }, [queryClient, projectId]);

  const [selectedWeek, setSelectedWeek] = useState<string>(isPatioSur ? 'S-40' : 'S-00');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  // ── Dynamic Project Data ──
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoadingDB, setIsLoadingDB] = useState<boolean>(true);
  const [showFolder07Modal, setShowFolder07Modal] = useState(false);

  // ── Para proyectos distintos de Patio Sur: datos de BD ──
  const { data: cortesDB = [] } = useQuery<CronogramaCorte[]>({
    queryKey: ['cronogramaCortes', projectId],
    queryFn: () => cronogramaApi.listCortes(projectId),
    enabled: !!projectId,
  });

  const { data: proyectadoDB = [] } = useQuery<CronogramaProyectado[]>({
    queryKey: ['cronogramaProyectado', projectId],
    queryFn: () => cronogramaApi.getProyectado(projectId),
    enabled: !!projectId,
  });

  const { documents, addDocument: addDocGlobal, deleteDocument: deleteDocGlobal } = useDocuments();
  const docsFolder07 = useMemo(() => documents.filter(d => d.category === '07 Cronogramas'), [documents]);

  const handleFolder07Upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoadingDB(true);
      try {
        await cronogramaApi.importExcel(projectId, file);
        if (user) logEdit(user, 'Cronograma › Carpeta 07', `Subió cronograma "${file.name}"`);
        await invalidarModulos();
      } catch (err) {
        console.error(err);
        alert('Error al subir cronograma.');
      } finally {
        setIsLoadingDB(false);
      }
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

  const chartRef = useRef<HTMLDivElement>(null);

  // States for Notes
  const [globalNotes, setGlobalNotes] = useState<Record<string, string>>(() => loadActivityNotes(projectId));
  const [selectedTaskForNote, setSelectedTaskForNote] = useState<Activity | null>(null);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [customWeeks, setCustomWeeks] = useState<CustomWeekData[]>(() => loadCustomWeeks(projectId));

  // Filtros de tabla
  const [filterStatus, setFilterStatus] = useState<'all' | 'completada' | 'en_tiempo' | 'atrasada'>('all');
  const [filterNotesOnly, setFilterNotesOnly] = useState<boolean>(false);
  const [isChartExpanded, setIsChartExpanded] = useState(false);

  // Estados para el menú de exportación
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportType, setExportType] = useState<'resumen' | 'completo'>('resumen');
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Estados de Simulaciones
  const [activeMode, setActiveMode] = useState<'en_vivo' | 'simulaciones'>('en_vivo');
  const [simulaciones, setSimulaciones] = useState<CronogramaSimulacion[]>([]);
  const [currentSimulation, setCurrentSimulation] = useState<CronogramaSimulacion | null>(null);
  const [simulationOverrides, setSimulationOverrides] = useState<Record<string, number>>({});
  const [apiSimulatedData, setApiSimulatedData] = useState<any | null>(null);
  const [isSimulatingLoading, setIsSimulatingLoading] = useState<boolean>(false);
  const [unlockedActivities, setUnlockedActivities] = useState<Record<string, boolean>>({});

  // Cargar simulaciones
  useEffect(() => {
    if (activeMode === 'simulaciones' && projectId) {
      cronogramaApi.listSimulaciones(projectId).then(setSimulaciones).catch(console.error);
    }
  }, [activeMode, projectId]);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Al cambiar de proyecto, recargar semanas y notas
  useEffect(() => {
    let isMounted = true;
    setIsLoadingDB(true);
    
    // Sincónico rápido
    setGlobalNotes(loadActivityNotes(projectId));
    setCustomWeeks(loadCustomWeeks(projectId));

    // Asíncrono desde backend MySQL
    const promises: Promise<any>[] = [
      fetchActivityNotesFromDB(projectId),
      fetchCustomWeeksFromDB(projectId),
    ];

    Promise.all(promises).then(([loadedNotes, loadedWeeks]) => {
      if (!isMounted) return;
      if (Object.keys(loadedNotes).length > 0) setGlobalNotes(loadedNotes);
      setCustomWeeks(loadedWeeks);
      if (isPatioSur) {
        setSelectedWeek(loadedWeeks.length > 0 ? loadedWeeks[loadedWeeks.length - 1].label : 'S-40');
      } else {
        setSelectedWeek('S-00');
      }
      setIsLoadingDB(false);
    });

    return () => { isMounted = false; };
  }, [projectId]);

  // Cargar selectedWeek inicial para otros proyectos
  useEffect(() => {
    if (!isPatioSur && cortesDB.length > 0 && selectedWeek === 'S-00') {
      const lastWeekWithReal = cortesDB.filter((c: CronogramaCorte) => c.avance_ejecutado !== null);
      if (lastWeekWithReal.length > 0) {
        const lastSemana = lastWeekWithReal[lastWeekWithReal.length - 1].semana;
        setSelectedWeek(`S-${lastSemana.toString().padStart(2, '0')}`);
      } else {
        const lastSemana = cortesDB[cortesDB.length - 1].semana;
        setSelectedWeek(`S-${lastSemana.toString().padStart(2, '0')}`);
      }
    }
  }, [cortesDB, isPatioSur, selectedWeek]);

  // Ref para acceder al valor más reciente en el cleanup de desmontaje
  const customWeeksRef = useRef(customWeeks);
  useEffect(() => { customWeeksRef.current = customWeeks; });

  // ---- Persist custom weeks (primary: in updater, backup: useEffect) ----
  const updateCustomWeeks = useCallback((updater: (prev: CustomWeekData[]) => CustomWeekData[]) => {
    setCustomWeeks(prev => {
      const next = updater(prev);
      // We'll handle persistence via a dedicated useEffect to avoid side-effects in updaters
      return next;
    });
  }, []);

  // Persist custom weeks when they change
  useEffect(() => {
    if (!isLoadingDB) {
      saveCustomWeeksToDB(projectId, customWeeks).then(success => {
        if(success) setLastSaved(new Date());
      });
    }
  }, [customWeeks, projectId, isLoadingDB]);


  // ---- Determine which week is "custom" ----
  const isCustomWeek = useMemo(
    () => customWeeks.some(cw => cw.label === selectedWeek),
    [customWeeks, selectedWeek]
  );

  const selectedCustom = useMemo(
    () => customWeeks.find(cw => cw.label === selectedWeek),
    [customWeeks, selectedWeek]
  );

  // Auto-sync simulationOverrides to selectedWeek values when no simulation is selected
  useEffect(() => {
    if (activeMode === 'simulaciones' && !currentSimulation) {
      const baseVals = isCustomWeek && selectedCustom ? selectedCustom.values : getLeafValues(currentCronogramaBase);
      setSimulationOverrides(baseVals);
    }
  }, [selectedWeek, currentSimulation, activeMode, isCustomWeek, selectedCustom, currentCronogramaBase]);

  // ---- Build the display cronograma (with overrides for custom weeks) ----
  const displayCronograma = useMemo(() => {
    if (activeMode === 'simulaciones') {
      return applyOverrides(currentCronogramaBase, simulationOverrides);
    }
    if (!isCustomWeek || !selectedCustom) return currentCronogramaBase;
    return applyOverrides(currentCronogramaBase, selectedCustom.values);
  }, [activeMode, simulationOverrides, isCustomWeek, selectedCustom, currentCronogramaBase]);

  // ---- Compute project-level avance for custom weeks ----
  const computeProjectReal = useCallback((values: Record<string, number>) => {
    const tree = applyOverrides(currentCronogramaBase, values);
    const totalPeso = tree.reduce((s, a) => s + a.peso, 0);
    const weighted = tree.reduce((s, a) => s + a.avanceReal * a.peso, 0);
    return totalPeso > 0 ? Math.round(weighted / totalPeso * 100) / 100 : 0;
  }, [currentCronogramaBase]);

  // ---- Dynamic Simulation calculations via FastAPI Backend ----
  const triggerApiSimulation = useCallback(async () => {
    if (!projectId || !dbActividadesRaw?.length || !proyectadoDB?.length) return;

    setIsSimulatingLoading(true);
    try {
      // 1. Mapear periodos desde proyectadoDB
      const periods = proyectadoDB.map((p) => ({
        index: p.semana,
        label: `Semana ${p.semana}`,
        date: p.fecha_semana,
      }));

      // Obtener los valores base de la semana seleccionada para rellenar las actividades no modificadas
      const baseVals = isCustomWeek && selectedCustom ? selectedCustom.values : getLeafValues(currentCronogramaBase);

      // Identificar cuáles códigos son padres para excluirlos de la simulación
      const isParentMap = new Map<string, boolean>();
      dbActividadesRaw.forEach(act => {
        const parts = act.cod.split('.');
        if (parts.length > 1) {
          for (let i = 1; i < parts.length; i++) {
            const parentCod = parts.slice(0, i).join('.');
            isParentMap.set(parentCod, true);
          }
        }
      });

      const actMap = new Map<string, typeof dbActividadesRaw[0]>();
      dbActividadesRaw.forEach(act => actMap.set(act.cod, act));

      // Calcular peso absoluto de la actividad recorriendo los padres recursivamente
      const getAbsoluteWeight = (act: typeof dbActividadesRaw[0]): number => {
        const parts = act.cod.split('.');
        let absWeight = act.peso / 100;
        for (let i = parts.length - 1; i > 0; i--) {
          const parentCod = parts.slice(0, i).join('.');
          const parent = actMap.get(parentCod);
          if (parent) {
            absWeight *= parent.peso / 100;
          }
        }
        return absWeight;
      };

      // Filtrar solo las actividades hoja
      const leafActivities = dbActividadesRaw.filter(act => !isParentMap.has(act.cod));

      // 2. Mapear actividades y generar su baseline lineal
      const activities = leafActivities.map((act) => {
        const start = new Date(act.fecha_inicio);
        const end = new Date(act.fecha_fin);
        
        const distribution = periods.map((p) => {
          const pDate = new Date(p.date);
          let planned = 0.0;
          if (pDate >= end) {
            planned = 1.0;
          } else if (pDate > start) {
            const totalDuration = end.getTime() - start.getTime();
            const currentDuration = pDate.getTime() - start.getTime();
            planned = totalDuration > 0 ? currentDuration / totalDuration : 1.0;
          }
          
          return {
            period_index: p.index,
            planned_progress: parseFloat(planned.toFixed(4)),
          };
        });

        // Aplicamos el override si existe, o el valor base de la semana seleccionada
        const actualVal = simulationOverrides[act.cod] !== undefined 
          ? simulationOverrides[act.cod] 
          : (baseVals[act.cod] ?? 0);

        return {
          activity_id: act.cod,
          name: act.actividad,
          weight: getAbsoluteWeight(act),
          start_date: act.fecha_inicio,
          end_date: act.fecha_fin,
          actual_progress: actualVal / 100, // De % a ratio
          baseline_progress_distribution: distribution,
        };
      });

      // 3. Preparar payload
      const payload = {
        schedule_data: {
          project_metadata: {
            project_id: projectId,
            name: project?.name || "Proyecto",
            start_date: project?.start_date || (activities.length > 0 ? activities[0].start_date : new Date().toISOString().split('T')[0]),
            end_date: project?.estimated_end_date || (activities.length > 0 ? activities[activities.length - 1].end_date : new Date().toISOString().split('T')[0]),
            control_unit: "WEEKLY",
          },
          periods,
          activities,
        },
        current_period_index: parseInt(selectedWeek.replace("S-", "")) || 0,
        custom_progress: null
      };

      // 4. Invocar API de backend
      const result = await cronogramaApi.runSimulation(payload);
      setApiSimulatedData(result);
    } catch (error) {
      console.error("Error al calcular simulación:", error);
    } finally {
      setIsSimulatingLoading(false);
    }
  }, [projectId, dbActividadesRaw, proyectadoDB, project, selectedWeek, simulationOverrides, isCustomWeek, selectedCustom, currentCronogramaBase]);

  // Limpiar datos simulados al cambiar el modo de la página
  useEffect(() => {
    if (activeMode !== "simulaciones") {
      setApiSimulatedData(null);
    }
  }, [activeMode]);

  // ---- Merged S-Curve data (base + custom weeks) ----
  // Para Patio Sur: usa datos hardcoded + cortes manuales
  // Para proyectos nuevos: usa cronograma_proyectado + cronograma_cortes de BD + Proyecciones del Motor
  const sCurveData = useMemo(() => {
    const appendSimPoint = (data: any[]) => {
      // Inicializar `s` en null para todos
      data.forEach(d => { d.s = null; });
      if (activeMode === 'simulaciones' && data.length > 0) {
        // Encontrar el último punto con datos reales
        let lastRealIndex = -1;
        for (let i = data.length - 1; i >= 0; i--) {
          if (data[i].e !== null && data[i].w !== 'SIM') {
            lastRealIndex = i;
            break;
          }
        }
        
        if (lastRealIndex !== -1) {
          data[lastRealIndex].s = data[lastRealIndex].e; // Conectar la línea simulada desde el último real
        }

        const eVal = computeProjectReal(simulationOverrides);
        const lastP = data[data.length - 1].p;
        
        // Remove existing SIM point if any
        const filtered = data.filter(d => d.w !== 'SIM');
        
        // Find the index to insert the SIM point (right after the last real point)
        const insertIndex = lastRealIndex !== -1 ? lastRealIndex + 1 : filtered.length;
        
        // Calculate the planned 'p' for the simulated week. 
        const simP = (insertIndex < filtered.length) ? filtered[insertIndex].p : (filtered[filtered.length - 1]?.p || 100);
        
        const simPoint = { w: 'SIM', d: 'Simulación', p: simP, e: null, s: eVal };
        filtered.splice(insertIndex, 0, simPoint);
        
        return filtered;
      }
      return data;
    };

    // CASO: proyecto nuevo con datos de BD + Simulación Backend
    if (!isPatioSur && proyectadoDB.length > 0) {
      // Construir mapa de cortes por semana
      const cortesMap = new Map<number, CronogramaCorte>();
      cortesDB.forEach(c => cortesMap.set(c.semana, c));

      // Mapa de periodos simulados calculados por el motor en backend
      const apiSimByPeriod = new Map<number, any>();
      if (activeMode === 'simulaciones' && apiSimulatedData) {
        apiSimulatedData.periods.forEach((p: any) => apiSimByPeriod.set(p.period_index, p));
      }

      const currentCutoff = parseInt(selectedWeek.replace('S-', '')) || 0;

      return proyectadoDB.map(p => {
        const corte = cortesMap.get(p.semana);
        const fechaStr = typeof p.fecha_semana === 'string' ? p.fecha_semana : String(p.fecha_semana);
        const dateObj = new Date(fechaStr);
        const months = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
        const dLabel = isNaN(dateObj.getTime())
          ? fechaStr
          : `${dateObj.getUTCDate().toString().padStart(2,'0')} ${months[dateObj.getUTCMonth()]}`;
        
        const apiPoint = apiSimByPeriod.get(p.semana);

        return {
          w: `S-${p.semana.toString().padStart(2, '0')}`,
          d: dLabel,
          p: Number(p.avance_planeado),
          // Si estamos en simulación y tenemos datos de la API:
          // - Hasta la semana de corte: real histórico (real_progress_cum de la API).
          // - Después de la semana de corte: proyección simulada (real_progress_cum en 's').
          e: activeMode === 'simulaciones' && apiPoint
            ? (p.semana <= currentCutoff ? apiPoint.real_progress_cum * 100 : null)
            : (corte && corte.avance_ejecutado !== null ? Number(corte.avance_ejecutado) : null),
          s: activeMode === 'simulaciones' && apiPoint && p.semana >= currentCutoff
            ? apiPoint.real_progress_cum * 100
            : null,
        };
      });
    }

    // CASO: Patio Sur o sin datos de BD
    if (customWeeks.length === 0) return appendSimPoint([...sCurveBase]);

    // Build map of custom week data points
    const customPoints = new Map<number, { w: string; d: string; p: number; e: number }>();
    for (const cw of customWeeks) {
      const pVal = interpolateProgrammed(cw.weekNum, weeklyProgMap);
      const eVal = computeProjectReal(cw.values);
      customPoints.set(cw.weekNum, { w: cw.label, d: cw.dateLabel, p: pVal, e: eVal });
    }

    // Merge: insert custom points into the base array at the right position
    const merged: { w: string; d: string; p: number; e: number | null }[] = [];
    const baseNums = sCurveBase.map(d => parseInt(d.w.replace('S-', '')));

    let ci = 0;
    const sortedCustomNums = Array.from(customPoints.keys()).sort((a, b) => a - b);

    for (let i = 0; i < sCurveBase.length; i++) {
      const baseNum = baseNums[i];

      // Insert custom points before this base point
      while (ci < sortedCustomNums.length && sortedCustomNums[ci] < baseNum) {
        const cp = customPoints.get(sortedCustomNums[ci])!;
        merged.push(cp);
        ci++;
      }

      // If custom point has the same number as a base point, replace `e`
      if (ci < sortedCustomNums.length && sortedCustomNums[ci] === baseNum) {
        const cp = customPoints.get(sortedCustomNums[ci])!;
        merged.push({ ...sCurveBase[i], e: cp.e });
        ci++;
      } else {
        merged.push(sCurveBase[i]);
      }
    }

    // Append remaining custom points after all base points
    while (ci < sortedCustomNums.length) {
      const cp = customPoints.get(sortedCustomNums[ci])!;
      merged.push(cp);
      ci++;
    }

    return appendSimPoint(merged);
  }, [isPatioSur, proyectadoDB, cortesDB, customWeeks, computeProjectReal, sCurveBase, activeMode, currentSimulation, simulationOverrides, apiSimulatedData, selectedWeek]);

  // ---- Available weeks for selection (those with actual data) ----
  const availableWeeks = useMemo(() =>
    sCurveData.filter(d => d.e !== null),
    [sCurveData]
  );

  const weeksWithRealData = useMemo(() => {
    if (!isPatioSur && cortesDB.length > 0) {
      return cortesDB
        .filter((c: CronogramaCorte) => c.avance_ejecutado !== null)
        .map((c: CronogramaCorte) => ({
          w: `S-${c.semana.toString().padStart(2, '0')}`,
          label: `S-${c.semana.toString().padStart(2, '0')}`,
          fecha: c.fecha_corte || ''
        }));
    }
    const baseWeeks = sCurveBase
      .filter(d => d.e !== null && !customWeeks.some(cw => cw.label === d.w))
      .map(d => ({ w: d.w, label: d.w, fecha: d.d }));
    const custWeeks = customWeeks.map(cw => ({ w: cw.label, label: cw.label, fecha: cw.dateLabel }));
    return [...baseWeeks, ...custWeeks];
  }, [isPatioSur, cortesDB, sCurveBase, customWeeks]);

  // ---- Selected week data ----
  const weekData = useMemo(() => {
    if (activeMode === 'simulaciones' && currentSimulation) {
      const simPoint = sCurveData.find(d => d.w === 'SIM');
      // Pass 's' as 'e' so the KPI cards display the simulated value as the "Real" value to compare against 'p'
      return { 
        w: 'SIM', 
        d: 'Simulación', 
        p: simPoint ? simPoint.p : 100, 
        e: simPoint ? simPoint.s : 0 
      };
    }
    return sCurveData.find(d => d.w === selectedWeek) || sCurveData[sCurveData.length - 1] || { w: '', d: '', p: 0, e: 0 };
  }, [sCurveData, selectedWeek, activeMode, currentSimulation]);

  // ---- Dynamic KPIs ----
  const prog = weekData.p;
  const real = weekData.e ?? 0;
  const kpiDiff = real - prog;
  const spi = prog > 0 ? (real / prog) : 1;

  // ---- Export Handlers ----
  const handleExport = (type: 'resumen' | 'completo') => {
    setExportType(type);
    setShowExportMenu(false);
    // Timeout para asegurar que el estado se aplique y el DOM se renderice antes de imprimir
    setTimeout(() => {
      window.print();
      if (user) logEdit(user, 'Cronograma', `Generó reporte PDF ${type} (${selectedWeek})`);
    }, 150);
  };

  // ---- Summary stats from display cronograma ----
  const completadas = displayCronograma.filter(a => a.avanceReal >= 100).length;
  const enTiempo = displayCronograma.filter(a => a.avanceReal < 100 && a.avanceReal >= a.avanceProg).length;
  const atrasadas = displayCronograma.filter(a => a.avanceReal < 100 && a.avanceReal < a.avanceProg).length;

  const displayFiltered = useMemo(() => {
    if (filterStatus === 'all' && !filterNotesOnly) return displayCronograma;
    const filterFn = (acts: Activity[]): Activity[] => {
      return acts.reduce((acc: Activity[], act) => {
        
        const matchesStatus = 
          filterStatus === 'all' ||
          (filterStatus === 'completada' && act.avanceReal >= 100) ||
          (filterStatus === 'en_tiempo' && act.avanceReal < 100 && act.avanceReal >= act.avanceProg) ||
          (filterStatus === 'atrasada' && act.avanceReal < 100 && act.avanceReal < act.avanceProg);

        const hasNote = globalNotes[act.code] && globalNotes[act.code].trim() !== '';
        const matchesNoteFilter = filterNotesOnly ? hasNote : true;

        const matchesSelf = matchesStatus && matchesNoteFilter;

        let filteredChildren: Activity[] | undefined = undefined;
        if (act.children && act.children.length > 0) {
          filteredChildren = filterFn(act.children);
        }
        
        const hasMatchingChildren = filteredChildren && filteredChildren.length > 0;
        
        if (matchesSelf || hasMatchingChildren) {
          acc.push({ ...act, children: filteredChildren });
        }
        return acc;
      }, []);
    };
    return filterFn(displayCronograma);
  }, [displayCronograma, filterStatus, filterNotesOnly, globalNotes]);

  // ---- Add new week handler ----
  const handleAddWeek = useCallback(() => {
    // Determine next week number dynamically from all sources
    const baseNums = sCurveBase.filter(d => d.e !== null).map(d => parseInt(d.w.replace('S-', '')));
    const customNums = customWeeks.map(cw => cw.weekNum);
    const maxAny = Math.max(...baseNums, ...customNums, 0);
    const nextNum = maxAny + 1;

    // Get leaf values to copy from: the week we are currently on or the maximum one
    // to ensure the real progress doesn't change initially.
    let seedValues: Record<string, number> = {};
    const currentWeekNum = parseInt(selectedWeek.replace('S-', ''));
    const currentCustom = customWeeks.find(cw => cw.weekNum === currentWeekNum);
    
    if (currentCustom) {
      seedValues = { ...currentCustom.values };
    } else {
      // If it's a base week with no custom data yet, extraction is needed
      // Currently, updated_weeks.json should provide values for 41-44.
      // If still missing (historical < 40), we use the current WBS tree base
      seedValues = getLeafValues(currentCronogramaBase);
    }

    const newWeek: CustomWeekData = {
      weekNum: nextNum,
      label: `S-${nextNum}`,
      dateLabel: computeWeekDate(nextNum, weeklyProgMap),
      values: seedValues,
    };

    // For DB-driven projects, compute programmed advance from proyectadoDB
    const matchedProyectado = proyectadoDB.find(p => p.semana === nextNum);
    const progVal = matchedProyectado ? Number(matchedProyectado.avance_planeado) : 0.0;
    
    const lastCorte = cortesDB.length > 0 ? [...cortesDB].sort((a, b) => b.semana - a.semana)[0] : null;
    const seedExec = lastCorte ? (lastCorte.avance_ejecutado !== null ? Number(lastCorte.avance_ejecutado) : 0.0) : 0.0;
    const seedDetail = lastCorte ? lastCorte.detalle_json : '{}';

    cronogramaApi.createCorte(projectId, {
      semana: nextNum,
      fecha_corte: computeWeekDate(nextNum, weeklyProgMap),
      avance_planeado: progVal,
      avance_ejecutado: seedExec,
      origen: 'snapshot_usuario',
      detalle_json: seedDetail || '{}',
    }).then(() => {
      invalidarModulos();
      setSelectedWeek(`S-${nextNum.toString().padStart(2, '0')}`);
    });

    updateCustomWeeks(prev => [...prev, newWeek]);
    setSelectedWeek(newWeek.label);
    invalidarModulos();
    if (user) logEdit(user, 'Cronograma', `Agregó semana de corte ${newWeek.label} (${newWeek.dateLabel})`);
  }, [customWeeks, updateCustomWeeks, user, isPatioSur, proyectadoDB, cortesDB, projectId, selectedWeek, weeklyProgMap, invalidarModulos]);

  // ---- Delete custom week handler ----
  const handleDeleteWeek = useCallback((label: string) => {
    const weekNum = parseInt(label.replace('S-', ''));
    const targetCorte = cortesDB.find(c => c.semana === weekNum);
    if (targetCorte) {
      cronogramaApi.deleteCorte(targetCorte.id).then(() => {
        invalidarModulos();
        setSelectedWeek('S-00');
      });
    }

    updateCustomWeeks(prev => prev.filter(cw => cw.label !== label));
    setSelectedWeek('S-40');
    invalidarModulos();
    if (user) logEdit(user, 'Cronograma', `Eliminó semana de corte ${label}`);
  }, [updateCustomWeeks, user, isPatioSur, cortesDB, invalidarModulos]);

  // ---- Update leaf avanceReal in custom week ----
  const handleChangeReal = useCallback((code: string, value: number) => {
    if (activeMode === 'simulaciones') {
      if (!currentSimulation) {
         const name = "Simulación Rápida " + new Date().toLocaleTimeString();
         cronogramaApi.createSimulacion(projectId!, name, JSON.stringify(simulationOverrides)).then(res => {
            setCurrentSimulation({ id: res.id, nombre: name, project_id: projectId!, estado_json: simulationOverrides, created_at: new Date().toISOString() } as any);
         });
      }
      const newOverrides = { ...simulationOverrides, [code]: value };
      setSimulationOverrides(newOverrides);
      return;
    }

    if (!selectedCustom) return;
    
    const newValues = { ...selectedCustom.values, [code]: value };
    
    updateCustomWeeks(prev =>
      prev.map(cw =>
        cw.label === selectedCustom.label
          ? { ...cw, values: newValues }
          : cw
      )
    );

    const weekNum = parseInt(selectedWeek.replace('S-', ''));
    const targetCorte = cortesDB.find(c => c.semana === weekNum);
    if (targetCorte) {
      const newReal = computeProjectReal(newValues);
      cronogramaApi.updateCorte(targetCorte.id, {
        avance_ejecutado: newReal,
        detalle_json: JSON.stringify(newValues)
      }).then(() => {
        invalidarModulos();
      });
    }
  }, [activeMode, currentSimulation, simulationOverrides, selectedCustom, updateCustomWeeks, selectedWeek, cortesDB, computeProjectReal, invalidarModulos, projectId]);

  const handleToggleLock = useCallback((code: string) => {
    setUnlockedActivities(prev => {
      const nextVal = !prev[code];
      if (!nextVal) {
        // Al bloquear de nuevo, se restablece a 100
        handleChangeReal(code, 100);
      }
      return {
        ...prev,
        [code]: nextVal
      };
    });
  }, [handleChangeReal]);

  const handleSaveSimulation = useCallback(async () => {
    if (!projectId) return;

    if (currentSimulation) {
      try {
        await cronogramaApi.updateSimulacion(
          currentSimulation.id,
          currentSimulation.nombre,
          JSON.stringify(simulationOverrides)
        );
        setSimulaciones(prev => prev.map(s => s.id === currentSimulation.id ? { ...s, estado_json: simulationOverrides } : s));
        alert(`Simulación "${currentSimulation.nombre}" guardada con éxito.`);
      } catch (err) {
        console.error("Error al guardar la simulación", err);
        alert("Ocurrió un error al guardar la simulación.");
      }
    } else {
      const name = prompt("Ingrese un nombre para la nueva simulación:", "Simulación " + new Date().toLocaleTimeString());
      if (!name) return;
      
      try {
        const res = await cronogramaApi.createSimulacion(projectId, name, JSON.stringify(simulationOverrides));
        const newSim = {
          id: res.id,
          project_id: projectId,
          nombre: name,
          estado_json: simulationOverrides,
          created_at: new Date().toISOString()
        } as any;
        setSimulaciones(prev => [newSim, ...prev]);
        setCurrentSimulation(newSim);
        alert(`Simulación "${name}" creada y guardada con éxito.`);
      } catch (err) {
        console.error("Error al crear la simulación", err);
        alert("Ocurrió un error al crear la simulación.");
      }
    }
  }, [projectId, currentSimulation, simulationOverrides]);

  const handleSaveSimulationAs = useCallback(async () => {
    if (!projectId) return;
    
    const name = prompt("Ingrese un nombre para guardar como nueva simulación:", currentSimulation ? `${currentSimulation.nombre} (Copia)` : "Simulación " + new Date().toLocaleTimeString());
    if (!name) return;
    
    try {
      const res = await cronogramaApi.createSimulacion(projectId, name, JSON.stringify(simulationOverrides));
      const newSim = {
        id: res.id,
        project_id: projectId,
        nombre: name,
        estado_json: simulationOverrides,
        created_at: new Date().toISOString()
      } as any;
      setSimulaciones(prev => [newSim, ...prev]);
      setCurrentSimulation(newSim);
      alert(`Simulación "${name}" guardada como nueva con éxito.`);
    } catch (err) {
      console.error("Error al guardar como nueva simulación", err);
      alert("Ocurrió un error al guardar la simulación.");
    }
  }, [projectId, currentSimulation, simulationOverrides]);

  const handleDeleteSimulation = useCallback(async () => {
    if (!currentSimulation) return;
    
    if (!confirm(`¿Está seguro de que desea eliminar la simulación "${currentSimulation.nombre}" permanentemente?`)) return;
    
    try {
      await cronogramaApi.deleteSimulacion(currentSimulation.id);
      setSimulaciones(prev => prev.filter(s => s.id !== currentSimulation.id));
      setCurrentSimulation(null);
      const baseVals = isCustomWeek && selectedCustom ? selectedCustom.values : getLeafValues(currentCronogramaBase);
      setSimulationOverrides(baseVals);
      alert("Simulación eliminada con éxito.");
    } catch (err) {
      console.error("Error al eliminar la simulación", err);
      alert("Ocurrió un error al intentar eliminar la simulación.");
    }
  }, [currentSimulation, isCustomWeek, selectedCustom, currentCronogramaBase]);

  const handleExportSimulationExcel = useCallback(() => {
    if (!apiSimulatedData) return;
    
    const sCurveSheetData = sCurveData.map(d => ({
      'Semana': d.w,
      'Fecha': d.d,
      'Avance Planeado (%)': d.p,
      'Avance Real (%)': d.e,
      'Avance Simulado (%)': d.s
    }));
    
    const flatActs = flattenActivities(displayCronograma);
    const activitiesSheetData = flatActs.map(act => {
      const currentVal = simulationOverrides[act.code] !== undefined 
        ? simulationOverrides[act.code] 
        : act.avanceReal;
      return {
        'Código WBS': act.code,
        'Actividad': act.name,
        'Peso (%)': act.peso * 100,
        'Duración': act.duracion,
        'Inicio': act.inicio,
        'Fin': act.fin,
        'Avance Planeado (%)': act.avanceProg,
        'Avance Simulado (%)': currentVal
      };
    });

    const wb = XLSX.utils.book_new();
    const wsCurve = XLSX.utils.json_to_sheet(sCurveSheetData);
    const wsActs = XLSX.utils.json_to_sheet(activitiesSheetData);
    
    XLSX.utils.book_append_sheet(wb, wsCurve, 'Curva S Simulada');
    XLSX.utils.book_append_sheet(wb, wsActs, 'Actividades');
    
    XLSX.writeFile(wb, `Simulacion_${currentSimulation?.nombre || 'Escenario'}_${projectId}.xlsx`);
    if (user) logEdit(user, 'Cronograma', `Exportó simulación a Excel`);
  }, [apiSimulatedData, sCurveData, displayCronograma, simulationOverrides, currentSimulation, projectId, user]);



  // ---- Note Handlers ----
  const handleOpenNote = useCallback((act: Activity) => {
    setSelectedTaskForNote(act);
    setIsNoteModalOpen(true);
  }, []);

  const handleSaveNote = useCallback((note: string) => {
    if (!selectedTaskForNote) return;
    const newNotes = { ...globalNotes, [selectedTaskForNote.code]: note };
    if (!note.trim()) {
      delete newNotes[selectedTaskForNote.code]; // Clean up empty notes
    }
    setGlobalNotes(newNotes);
    saveActivityNotesToDB(projectId, newNotes);
    if (user) logEdit(user, 'Cronograma', `Actualizó nota para ${selectedTaskForNote.code}`);
  }, [globalNotes, selectedTaskForNote, projectId, user]);

  // ---- Export Handlers ----
  const flattenActivities = (acts: Activity[], level = 0): any[] => {
    let result: any[] = [];
    for (const a of acts) {
      result.push({ ...a, level });
      if (a.children) {
        result = result.concat(flattenActivities(a.children, level + 1));
      }
    }
    return result;
  };





  // ---- Custom dots for chart ----
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectedDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.w !== selectedWeek || cy === undefined || cy === null) return null;
    return <Dot cx={cx} cy={cy} r={6} fill="#1b5eab" stroke="#fff" strokeWidth={2} />;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const SelectedDotReal = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.w !== selectedWeek || cy === undefined || cy === null || payload.e === null) return null;
    return <Dot cx={cx} cy={cy} r={6} fill="#16a34a" stroke="#fff" strokeWidth={2} />;
  };

  // ---- Next week number for the add button label ----
  const nextWeekNum = useMemo(() => {
    const baseNums = sCurveBase.filter(d => d.e !== null).map(d => parseInt(d.w.replace('S-', '')));
    const customNums = customWeeks.map(cw => cw.weekNum);
    const maxAny = Math.max(...baseNums, ...customNums, 0);
    return maxAny + 1;
  }, [customWeeks]);

  // ── 1. RENDER CONSOLIDADO (UNIFICADO Y SIN RETORNOS ANTICIPADOS) ──
  return (
    <ProjectProvider projectId={projectId}>
      {isLoadingDB ? (
        <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-8 shadow-card flex flex-col items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4 animate-spin-slow"></div>
          <p className="text-sm text-steel-500 dark:text-steel-400 font-medium italic animate-pulse">
            Cargando cronograma del proyecto...
          </p>
        </div>
      ) : !isPatioSur && (!dbActividadesRaw || dbActividadesRaw.length === 0) ? (
        <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-12 shadow-card flex flex-col items-center justify-center min-h-[440px] text-center">
          <Calendar size={48} className="mb-4 text-steel-400 dark:text-steel-500 opacity-50" />
          <p className="text-lg font-bold text-steel-800 dark:text-steel-100">Sin cronograma cargado</p>
          <p className="text-sm text-steel-500 dark:text-steel-400 mt-2 max-w-sm">
            Carga el archivo Excel de Cronograma desde el módulo de Entregables y usa el botón <strong>"Importar Cronograma"</strong> para poblar la curva S proyectada.
          </p>
          <button
            onClick={() => navigate(`/projects/${projectId}/business-case?tab=entregables`)}
            className="mt-6 px-6 py-2.5 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl shadow-lg transition active:scale-95 text-sm"
          >
            Ir a Entregables
          </button>
        </div>
      ) : (
        <div className="space-y-6">
      
      {/* Expanded Chart Overlay */}
      {isChartExpanded && (
        <div className="fixed inset-0 z-[150] bg-white dark:bg-steel-900 p-8 flex flex-col animate-in fade-in zoom-in duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-6 w-6 text-primary-600" />
              <h2 className="text-xl font-bold text-steel-800 dark:text-steel-100">Visualización Detallada — Curva S</h2>
            </div>
            <button 
              onClick={() => setIsChartExpanded(false)}
              className="flex items-center gap-2 px-4 py-2 bg-steel-100 dark:bg-steel-700 hover:bg-steel-200 dark:hover:bg-steel-600 text-steel-700 dark:text-steel-200 rounded-xl font-bold transition shadow-sm"
            >
              <Minimize2 className="h-5 w-5" />
              CERRAR VISTA
            </button>
          </div>
          <div className="flex-1 bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-8 right-8 text-right">
              <p className="text-xs text-steel-400 dark:text-steel-500 font-medium">Proyecto: Patio de Operación Sur</p>
              <p className="text-xs text-steel-400 dark:text-steel-500 font-medium tracking-tight">Semana de Corte: {selectedWeek}</p>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={sCurveData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <defs>
                  <linearGradient id="gp_expand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#1b5eab" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1b5eab" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="ge_expand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ecedef" vertical={false} />
                <XAxis 
                  dataKey="d" 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                  tickLine={false} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  dy={10}
                />
                <YAxis 
                  domain={[0, 100]} 
                  tickFormatter={(v) => `${v}%`} 
                  tick={{ fontSize: 11, fill: '#64748b', fontWeight: 500 }} 
                  tickLine={false} 
                  axisLine={false}
                />
                <Tooltip 
                  content={<SCurveTooltip />} 
                  cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }}
                />

                <ReferenceLine 
                  x={weekData.d} 
                  stroke="#8b5cf6" 
                  strokeDasharray="4 4" 
                  strokeWidth={2} 
                  label={{ value: `CORTE: ${selectedWeek}`, fontSize: 12, fontWeight: 800, fill: '#8b5cf6', position: 'insideTopLeft' }} 
                />
                <Area type="monotone" dataKey="p" fill="url(#gp_expand)" stroke="none" />
                <Area type="monotone" dataKey="e" fill="url(#ge_expand)" stroke="none" connectNulls={false} />
                <Line type="monotone" dataKey="p" stroke="#1b5eab" strokeWidth={4} dot={<SelectedDot />} name="Planeado" />
                <Line type="monotone" dataKey="e" stroke="#10b981" strokeWidth={4} dot={<SelectedDotReal />} name="Ejecutado Real" connectNulls={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
      {/* Header wrap to hide in print */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white">Cronograma del Proyecto</h2>
          <p className="text-xs text-steel-400 dark:text-steel-500 mt-0.5">
            {project?.name || 'Proyecto'} {project?.code ? `— ${project.code}` : ''} | {isPatioSur ? "Jun 2025 - Sep 2026 | 515 actividades" : `${dbActividadesRaw?.length || 0} actividades`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFolder07Modal(true)}
            className="flex items-center gap-2 rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 px-4 py-2 text-xs font-bold text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700 transition shadow-sm"
          >
            <FolderOpen className="h-4 w-4 text-primary-500" />
            07 Cronogramas
          </button>
          <div className="relative" ref={exportMenuRef}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="px-4 py-2 text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 rounded-xl shadow-lg shadow-primary-100 transition active:scale-95 flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Exportar PDF
              <ChevronDown className={clsx("h-4 w-4 transition-transform", showExportMenu && "rotate-180")} />
            </button>

            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-steel-800 rounded-xl shadow-2xl border border-steel-100 dark:border-steel-700 py-2 z-[200] animate-in fade-in slide-in-from-top-2 duration-200">
                <button
                  onClick={() => handleExport('resumen')}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-steel-700 dark:text-steel-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 flex items-center gap-3 transition"
                >
                  <TrendingUp className="h-4 w-4 text-primary-500" />
                  📊 Resumen
                </button>
                <button
                  onClick={() => handleExport('completo')}
                  className="w-full px-4 py-2.5 text-left text-xs font-bold text-steel-700 dark:text-steel-200 hover:bg-primary-50 dark:hover:bg-primary-900/30 flex items-center gap-3 transition"
                >
                  <Calendar className="h-4 w-4 text-emerald-500" />
                  📋 Completo
                </button>
              </div>
            )}
          </div>
          <HelpButton {...cronogramaHelp} />
        </div>
      </div>

      {/* TABS DE MODO */}
      <div className="flex bg-steel-100 dark:bg-steel-800 p-1 rounded-xl w-max shadow-inner mb-4">
        <button
          onClick={() => setActiveMode('en_vivo')}
          className={clsx(
            "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            activeMode === 'en_vivo' 
              ? "bg-white dark:bg-steel-700 text-primary-600 shadow-md scale-105" 
              : "text-steel-500 hover:text-steel-700"
          )}
        >
          <ActivityIcon className="h-4 w-4" />
          En Vivo
        </button>
        <button
          onClick={() => setActiveMode('simulaciones')}
          className={clsx(
            "px-6 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
            activeMode === 'simulaciones'
              ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20 scale-105"
              : "text-steel-500 hover:text-orange-500"
          )}
        >
          <Zap className="h-4 w-4" />
          Simulaciones
        </button>
      </div>

      {activeMode === 'simulaciones' && (
        <div className="rounded-xl border border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/30 p-5 shadow-card print:hidden mb-4 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-orange-100 dark:border-orange-900/50 pb-3">
             <div className="flex items-center gap-2">
               <div className="p-1.5 bg-orange-200 text-orange-600 rounded-lg shadow-inner">
                 <Zap className="h-4 w-4" />
               </div>
               <div>
                 <h3 className="text-sm font-bold text-orange-800 dark:text-orange-100">Panel de Simulaciones</h3>
                 <p className="text-[10px] text-orange-600/80">Analiza escenarios y mira el impacto en tiempo real.</p>
               </div>
             </div>
             <div className="flex flex-wrap items-center gap-2">
               <button 
                 onClick={triggerApiSimulation}
                 className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95 shrink-0"
                 title="Calcular simulación y actualizar Curva S"
               >
                 <Play className="h-3.5 w-3.5" /> Calcular Simulación
               </button>

               <button 
                 onClick={handleSaveSimulation}
                 className="px-3 py-1.5 bg-white dark:bg-steel-800 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95 shrink-0"
                 title="Guardar cambios de la simulación actual en el servidor"
               >
                 <Save className="h-3.5 w-3.5" /> Guardar
               </button>

               {currentSimulation && (
                 <button 
                   onClick={handleSaveSimulationAs}
                   className="px-3 py-1.5 bg-white dark:bg-steel-800 border border-orange-300 dark:border-orange-700 text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg text-xs font-bold shadow-sm transition flex items-center gap-1.5 active:scale-95 shrink-0"
                   title="Guardar este escenario como una nueva simulación"
                 >
                   <Plus className="h-3.5 w-3.5" /> Guardar Como...
                 </button>
               )}

               {apiSimulatedData && (
                 <button 
                   onClick={handleExportSimulationExcel}
                   className="px-3 py-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1.5 active:scale-95 shrink-0"
                   title="Exportar curva S simulada y tabla de actividades a Excel"
                 >
                   <Download className="h-3.5 w-3.5" /> Exportar Excel
                 </button>
               )}
               
               <button onClick={() => {
                 const name = "Nueva Simulación " + new Date().toLocaleTimeString();
                 const baseVals = isCustomWeek && selectedCustom ? selectedCustom.values : getLeafValues(currentCronogramaBase);
                 if(projectId) {
                   const tempId = Date.now();
                   const optimisticSim = { id: tempId, nombre: name, project_id: projectId, estado_json: baseVals, created_at: new Date().toISOString() } as any;
                   
                   // Optimistic update
                   setSimulaciones(prev => [optimisticSim, ...prev]);
                   setCurrentSimulation(optimisticSim);
                   setSimulationOverrides(baseVals);
                   
                   cronogramaApi.createSimulacion(projectId, name, JSON.stringify(baseVals)).then(res => {
                     // Optional: update with real ID later if needed, though mostly fine
                   }).catch(err => {
                     console.error("Error creating manual simulation", err);
                   });
                 }
               }} className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg text-xs font-bold shadow-md hover:shadow-lg transition flex items-center gap-1 active:scale-95 shrink-0">
                 <Plus className="h-3.5 w-3.5" /> Nueva Simulación
               </button>
             </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] uppercase tracking-wider font-bold text-orange-800 dark:text-orange-200">
                  1. Simulación Activa (Opcional)
                </label>
                <div className="flex gap-2">
                  <select 
                    className="border border-orange-200 dark:border-orange-700/50 rounded-lg p-2 text-sm font-medium bg-white dark:bg-steel-800 text-orange-900 dark:text-orange-100 flex-1 focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                    value={currentSimulation?.id || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setCurrentSimulation(null);
                        const baseVals = isCustomWeek && selectedCustom ? selectedCustom.values : getLeafValues(currentCronogramaBase);
                        setSimulationOverrides(baseVals);
                      } else {
                        const s = simulaciones.find(x => x.id === Number(val));
                        if (s) {
                          setCurrentSimulation(s);
                          setSimulationOverrides(s.estado_json);
                        }
                      }
                    }}
                  >
                    <option value="">-- Sin simulación (Usar avance real) --</option>
                    {simulaciones.map(s => <option key={s.id} value={s.id}>{s.nombre} ({new Date(s.created_at).toLocaleDateString()})</option>)}
                  </select>

                  {currentSimulation && (
                    <button
                      onClick={handleDeleteSimulation}
                      className="px-3 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:hover:bg-red-950/40 rounded-lg border border-red-200 dark:border-red-800 transition flex items-center justify-center shrink-0"
                      title="Eliminar esta simulación permanentemente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

             <div className="flex flex-col gap-1.5">
               <label className="text-[10px] uppercase tracking-wider font-bold text-orange-800 dark:text-orange-200">
                 2. Semana de Corte
               </label>
               <select 
                 className="border border-orange-200 dark:border-orange-700/50 rounded-lg p-2 text-sm font-medium bg-white dark:bg-steel-800 text-orange-900 dark:text-orange-100 w-full focus:outline-none focus:ring-2 focus:ring-orange-500 transition"
                 value={selectedWeek}
                 onChange={(e) => {
                   setSelectedWeek(e.target.value);
                 }}
               >
                 {weeksWithRealData.map(wk => (
                   <option key={wk.w} value={wk.w}>
                     {wk.w} {wk.fecha ? `(${wk.fecha})` : ''}
                   </option>
                 ))}
               </select>
             </div>
          </div>
        </div>
      )}

      {/* Week Selector */}
      {activeMode === 'en_vivo' && (
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-4 shadow-card print:hidden mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-bold text-steel-800 dark:text-steel-100">Seleccionar Semana de Corte</h3>
          <span className="ml-auto text-[10px] text-steel-400 dark:text-steel-500 bg-steel-50 dark:bg-steel-900 px-2 py-1 rounded-full border border-steel-200 dark:border-steel-700">
            {availableWeeks.length} semanas con datos reales
          </span>
        </div>

        {/* Base weeks */}
        <div className="flex flex-wrap gap-1.5">
          {sCurveBase.filter(d => d.e !== null && !customWeeks.some(cw => cw.label === d.w)).map((wk) => (
            <button
              key={wk.w}
              onClick={() => setSelectedWeek(wk.w)}
              className={clsx(
                'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                selectedWeek === wk.w
                  ? 'bg-primary-600 text-white border-primary-600 shadow-md scale-105'
                  : 'bg-steel-50 dark:bg-steel-900 text-steel-600 dark:text-steel-300 border-steel-200 dark:border-steel-700 hover:bg-primary-50 hover:border-primary-300 hover:text-primary-700'
              )}
            >
              <span className="font-bold">{wk.w}</span>
              <span className="hidden sm:inline text-[9px] ml-1 opacity-75">({wk.d})</span>
            </button>
          ))}

          {/* Custom week buttons */}
          {customWeeks.map((cw) => (
            <div key={cw.label} className="relative group">
              <button
                onClick={() => setSelectedWeek(cw.label)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-xs font-medium transition-all border',
                  selectedWeek === cw.label
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
                )}
              >
                <span className="font-bold">{cw.label}</span>
                <span className="hidden sm:inline text-[9px] ml-1 opacity-75">({cw.dateLabel})</span>
              </button>
              {/* Delete button on hover */}
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteWeek(cw.label); }}
                className="absolute -top-1.5 -right-1.5 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white shadow-md hover:bg-red-600 transition"
                title={`Eliminar ${cw.label}`}
              >
                <Trash2 className="h-2.5 w-2.5" />
              </button>
            </div>
          ))}

          {/* Add week button */}
          <button
            onClick={handleAddWeek}
            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all border border-dashed border-emerald-400 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 flex items-center gap-1"
            title={`Agregar semana S-${nextWeekNum}`}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="font-bold">S-{nextWeekNum}</span>
          </button>
        </div>
      </div>
      )}

      {/* Editing banner for custom weeks */}
      {isCustomWeek && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 flex items-center justify-between text-xs print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-emerald-800">Modo edicion — {selectedWeek}</span>
            <span className="text-emerald-600">Edita el % de avance real en las actividades hoja para recalcular indicadores y Curva S.</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-600 shrink-0">
            <Save className="h-3 w-3" />
            <span className="font-medium">
              {lastSaved ? `Guardado ${lastSaved.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/Bogota' })}` : 'Guardado automaticamente'}
            </span>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 print:hidden">
        <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30 p-3 shadow-card">
          <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Avance Proyectado</p>
          <p className="text-xl font-bold text-primary-700 dark:text-primary-300 mt-1">{prog.toFixed(1)}%</p>
          <p className="text-[9px] text-steel-400 dark:text-steel-500">Semana {selectedWeek}</p>
        </div>
        <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-3 shadow-card">
          <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Ejecutado Real</p>
          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">{real.toFixed(1)}%</p>
          <p className={clsx('text-[9px]', kpiDiff >= 0 ? 'text-emerald-500' : 'text-red-500')}>
            {kpiDiff >= 0 ? '+' : ''}{kpiDiff.toFixed(1)}% {kpiDiff >= 0 ? 'adelantado' : 'atrasado'}
          </p>
        </div>
        <div className="rounded-xl border border-teal-200 dark:border-teal-800 bg-teal-50 dark:bg-teal-950/30 p-3 shadow-card">
          <p className="text-[9px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">SPI</p>
          <p className={clsx('text-xl font-bold mt-1', spi >= 1 ? 'text-teal-700 dark:text-teal-300' : 'text-red-600 dark:text-red-400')}>
            {spi.toFixed(2)}
          </p>
          <p className="text-[9px] text-steel-400 dark:text-steel-500">Real / Planeado</p>
        </div>
        <button
          onClick={() => setFilterStatus(prev => prev === 'completada' ? 'all' : 'completada')}
          className={clsx("rounded-xl border p-3 shadow-card text-center transition hover:bg-emerald-50 dark:hover:bg-emerald-950/30 relative", filterStatus === 'completada' ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500 ring-2 ring-emerald-500/50' : 'bg-white dark:bg-steel-800 border-emerald-200 dark:border-emerald-800')}
        >
          {filterStatus === 'completada' && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-emerald-500" />}
          <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">{completadas}</p>
          <p className="text-[9px] text-steel-400 dark:text-steel-500">Completadas</p>
        </button>
        <button
          onClick={() => setFilterStatus(prev => prev === 'en_tiempo' ? 'all' : 'en_tiempo')}
          className={clsx("rounded-xl border p-3 shadow-card text-center transition hover:bg-amber-50 dark:hover:bg-amber-950/30 relative", filterStatus === 'en_tiempo' ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/50' : 'bg-white dark:bg-steel-800 border-amber-200 dark:border-amber-800')}
        >
          {filterStatus === 'en_tiempo' && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-amber-500" />}
          <Clock className="h-4 w-4 text-amber-500 mx-auto" />
          <p className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-1">{enTiempo}</p>
          <p className="text-[9px] text-steel-400 dark:text-steel-500">En Tiempo</p>
        </button>
        <button
          onClick={() => setFilterStatus(prev => prev === 'atrasada' ? 'all' : 'atrasada')}
          className={clsx("rounded-xl border p-3 shadow-card text-center transition hover:bg-red-50 dark:hover:bg-red-950/30 relative", filterStatus === 'atrasada' ? 'bg-red-50 dark:bg-red-950/30 border-red-500 ring-2 ring-red-500/50' : 'bg-white dark:bg-steel-800 border-red-200 dark:border-red-800')}
        >
          {filterStatus === 'atrasada' && <span className="absolute top-2 right-2 flex h-2 w-2 rounded-full bg-red-500" />}
          <AlertTriangle className="h-4 w-4 text-red-500 mx-auto" />
          <p className="text-lg font-bold text-red-600 dark:text-red-400 mt-1">{atrasadas}</p>
          <p className="text-[9px] text-steel-400 dark:text-steel-500">Con Atraso</p>
        </button>
      </div>

      {/* S-Curve Chart */}
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-5 shadow-card print:border-none print:shadow-none print:absolute print:top-40 print:w-full print:left-0 print:m-0" ref={chartRef}>
        <div className="flex items-center gap-2 mb-3 print:hidden">
          <TrendingUp className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-bold text-steel-800 dark:text-steel-100">Curva S — Avance Acumulado Semanal</h3>
          <button 
            onClick={() => setIsChartExpanded(true)}
            className="ml-auto flex items-center gap-1 text-[10px] font-bold text-primary-700 bg-primary-50 px-2 py-1 rounded-md hover:bg-primary-100 transition"
          >
            <Maximize2 className="h-3 w-3" />
            Expandir
          </button>
          <span className="text-[10px] text-steel-400 dark:text-steel-500">Corte: {weekData.d} ({selectedWeek})</span>
          {isLoadingDB && <span className="text-[10px] bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full flex items-center animate-pulse">Sincronizando BD...</span>}
        </div>
        <div ref={chartRef}>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={sCurveData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="gp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#1b5eab" stopOpacity={0.08} />
                <stop offset="95%" stopColor="#1b5eab" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="ge" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.20} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ecedef" />
            <XAxis dataKey="d" tick={{ fontSize: 8, fill: '#6e7179' }} tickLine={false} angle={-30} textAnchor="end" height={40} />
            <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{ fontSize: 10, fill: '#6e7179' }} tickLine={false} />
            <Tooltip content={<SCurveTooltip />} />

            <ReferenceLine 
              x={weekData.d} 
              stroke="#7c3aed" 
              strokeDasharray="3 3" 
              strokeWidth={2} 
              label={{ value: `CORTE EN: ${selectedWeek}`, fontSize: 11, fontWeight: 'bold', fill: '#7c3aed', position: 'insideTopLeft' }} 
            />
            <Area type="monotone" dataKey="p" fill="url(#gp)" stroke="none" />
            <Area type="monotone" dataKey="e" fill="url(#ge)" stroke="none" connectNulls={false} />
            {activeMode === 'simulaciones' && <Area type="monotone" dataKey="s" fill="url(#gs)" stroke="none" connectNulls={false} />}
            <Line type="monotone" dataKey="p" stroke="#1b5eab" strokeWidth={2} dot={<SelectedDot />} name="Planeado" />
            <Line type="monotone" dataKey="e" stroke="#16a34a" strokeWidth={2} dot={<SelectedDotReal />} name="Ejecutado Real" connectNulls={false} />
            {activeMode === 'simulaciones' && <Line type="monotone" dataKey="s" stroke="#f97316" strokeDasharray="5 5" strokeWidth={3} dot={{ r: 5, fill: '#f97316', strokeWidth: 0 }} name="Simulado" connectNulls={false} />}
          </ComposedChart>
        </ResponsiveContainer>
        </div>
      </div>

      {/* Schedule Table */}
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-card overflow-hidden print:hidden">
        <div className="px-5 py-4 border-b border-steel-200 dark:border-steel-700 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary-600" />
          <h3 className="text-sm font-bold text-steel-800 dark:text-steel-100">Estructura de Actividades (WBS)</h3>

          <button
            onClick={() => setFilterNotesOnly(!filterNotesOnly)}
            className={`ml-2 px-2.5 py-1 flex items-center gap-1.5 text-[10px] font-bold rounded-md border transition ${filterNotesOnly ? 'bg-amber-100 dark:bg-amber-950/30 border-amber-400 dark:border-amber-700 text-amber-800 dark:text-amber-300 shadow-sm' : 'bg-white dark:bg-steel-800 border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700'}`}
          >
            <MessageSquare className="h-3 w-3" />
            Notas
          </button>

          {isCustomWeek && (
            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Editable
            </span>
          )}
          <span className="ml-auto text-[10px] text-steel-400 dark:text-steel-500 bg-steel-50 dark:bg-steel-900 px-2 py-1 rounded-full border border-steel-200 dark:border-steel-700">
            {isPatioSur ? "12 capitulos | 515 actividades" : `${displayCronograma.length} capítulos | ${dbActividadesRaw?.length || 0} actividades`} | Semana {selectedWeek}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700">
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[80px]">Cod.</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide">Actividad</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[60px]">Peso</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[110px]">Fechas</th>
                <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[80px]">Duracion</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[220px]">Avance (Prog / Real)</th>
                <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-steel-500 dark:text-steel-400 uppercase tracking-wide w-[100px]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {displayFiltered.map((act) => (
                <ActivityRow
                  key={act.code}
                  act={act}
                  editable={isCustomWeek || activeMode === 'simulaciones'}
                  onChangeReal={handleChangeReal}
                  onDoubleClickRow={handleOpenNote}
                  allNotes={globalNotes}
                  forceOpen={filterStatus !== 'all' || filterNotesOnly}
                  unlockedActivities={unlockedActivities}
                  onToggleLock={handleToggleLock}
                  isSimulationMode={activeMode === 'simulaciones'}
                />
              ))}
              {displayFiltered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-steel-400 dark:text-steel-500 text-sm">
                    No hay actividades que coincidan con el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Observation Modal */}
      <ObservationModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        task={selectedTaskForNote}
        initialNote={selectedTaskForNote ? (globalNotes[selectedTaskForNote.code] || '') : ''}
        onSave={handleSaveNote}
      />

      {/* VERSION PARA IMPRESION (PDF) */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-report, #print-report * { visibility: visible; }
          #print-report {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px;
            background: white;
          }
          .no-print { display: none !important; }
          .break-before-page { break-before: page; }
        }
      `}</style>
      
      <div id="print-report" className="hidden print:block bg-white min-h-screen">
        <div className="max-w-4xl mx-auto space-y-10">
          <div className="flex justify-between items-center border-b-2 pb-4 border-steel-900">
            <div>
              <h1 className="text-2xl font-bold text-steel-900 leading-tight">REPORTE DE AVANCE</h1>
              <h2 className="text-xl font-semibold text-steel-500">{project?.name?.toUpperCase() || 'PROYECTO'} - {selectedWeek}</h2>
            </div>
            <img src="/images/pcmejia-logo.png" alt="PC Mejia" className="h-16 object-contain" />
          </div>
          
          {/* Tabla KPI solicitada */}
          <div className="flex justify-center mt-6">
            <table className="w-full max-w-4xl border-2 border-black border-collapse shadow-sm">
              <thead>
                <tr className="bg-steel-50">
                  <th className="text-steel-600 p-2 border-2 border-black text-[10px] uppercase font-bold tracking-wide">AVANCE PROYECTADO</th>
                  <th className="text-steel-600 p-2 border-2 border-black text-[10px] uppercase font-bold tracking-wide">EJECUTADO REAL</th>
                  <th className="text-steel-600 p-2 border-2 border-black text-[10px] uppercase font-bold tracking-wide">SPI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-center h-16">
                  <td className="p-2 border-2 border-black text-3xl font-black text-primary-800">{prog.toFixed(2)}%</td>
                  <td className="p-2 border-2 border-black text-3xl font-black text-emerald-700">{real.toFixed(2)}%</td>
                  <td className="p-2 border-2 border-black text-3xl font-black text-steel-900">{spi.toFixed(3)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-4 pt-4">
            <h2 className="text-xl font-bold text-steel-800 text-center uppercase tracking-widest">Curva S de Avance — ({selectedWeek})</h2>
            <div className="border border-steel-300 rounded-xl p-4 bg-white shadow-sm flex items-center justify-center">
              {/* Re-render del chart para impresión con fixed width para Evitar w-0 bug en Window Print */}
                <ComposedChart width={900} height={400} data={sCurveData} margin={{ top: 25, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="d" tick={{ fontSize: 11, fontWeight: 'bold' }} interval={3} />
                  <YAxis tick={{ fontSize: 11, fontWeight: 'bold' }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  
                  <ReferenceLine 
                    x={weekData.d} 
                    stroke="#7c3aed" 
                    strokeDasharray="3 3" 
                    strokeWidth={4} 
                    label={{ value: `→ INDICADOR DE CORTE: ${selectedWeek} ←`, fontSize: 14, fontWeight: '900', fill: '#7c3aed', position: 'insideTopLeft' }} 
                  />
                  
                  <Area type="monotone" dataKey="p" fill="#1b5eab15" stroke="none" />
                  <Line type="monotone" dataKey="p" stroke="#1b5eab" strokeWidth={4} dot={false} name="Planeado" />
                  <Line type="monotone" dataKey="e" stroke="#16a34a" strokeWidth={4} dot={<SelectedDotReal />} name="Ejecutado Real" connectNulls={false} />
                </ComposedChart>
            </div>
            
            {/* Tabla Matriz Ventana de Tiempo (Semana Actual +/- 7 semanas para asegurar ajuste en A4) */}
            {(() => {
              const currentIndex = sCurveData.findIndex(d => d.w === selectedWeek);
              const startIdx = Math.max(0, currentIndex - 7);
              const endIdx = Math.min(sCurveData.length - 1, currentIndex + 7);
              const pdfTableData = sCurveData.slice(startIdx, endIdx + 1);

              return (
                <div className="w-full max-w-[750px] mx-auto border-2 border-steel-800 mt-[40px] shadow-sm rounded overflow-hidden">
                  <table className="w-full border-collapse bg-white font-sans break-inside-avoid">
                    <thead>
                      <tr className="bg-primary-900 text-white font-bold h-10">
                        <th className="w-24 border-r border-b border-primary-700 p-1 text-center text-[9px] uppercase tracking-wider bg-primary-950">SEMANA</th>
                        {pdfTableData.map((d, i) => (
                          <th key={i} className={clsx(
                            "border-r border-b border-primary-700 p-1 text-center text-[9px]",
                            d.w === selectedWeek ? "bg-orange-500 text-white font-black" : ""
                          )}>
                            {d.w}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="h-10">
                        <td className="w-24 border-r border-b border-steel-300 bg-steel-100 font-bold p-1 text-center text-[8px] uppercase text-steel-800">DÍA CORTE</td>
                        {pdfTableData.map((d, i) => (
                          <td key={i} className={clsx(
                            "border-r border-b border-steel-300 p-1 text-center text-[8px] font-medium",
                            d.w === selectedWeek ? "bg-orange-50" : "text-steel-600"
                          )}>
                            {d.d}
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-primary-50/30 h-12">
                        <td className="w-24 border-r border-b border-steel-300 font-bold text-primary-900 p-1 text-center text-[8px] uppercase leading-tight">AVANCE<br/>PROYECTADO</td>
                        {pdfTableData.map((d, i) => (
                          <td key={i} className={clsx(
                            "border-r border-b border-steel-200 text-primary-900 p-1 text-center text-[10px] font-bold",
                            d.w === selectedWeek ? "bg-primary-100/50" : ""
                          )}>
                            {d.p.toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr className="bg-emerald-50/20 h-12">
                        <td className="w-24 border-r border-steel-300 font-bold text-emerald-900 p-1 text-center text-[8px] uppercase leading-tight">EJECUTADO<br/>REAL</td>
                        {pdfTableData.map((d, i) => (
                          <td key={i} className={clsx(
                            "border-r border-steel-200 font-bold p-1 text-center text-[10px]",
                            d.w === selectedWeek ? "bg-orange-400 text-white font-black scale-105 shadow-inner" : "text-emerald-700"
                          )}>
                            {d.e !== null ? d.e.toFixed(2) + '%' : '-'}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                  <div className="flex justify-between items-center bg-steel-50 p-2 border-t border-steel-200">
                    <p className="text-[7px] text-steel-500 font-bold uppercase">
                      Reporte de Estado Operativo — Patio de Operación Sur
                    </p>
                    <p className="text-[7px] text-steel-400 italic font-medium">
                      * Ventana de control: {pdfTableData[0].w} a {pdfTableData[pdfTableData.length-1].w} (Corte: {selectedWeek})
                    </p>
                  </div>
                </div>
              );
            })()}

          </div>

          {/* Sección de Tabla WBS Completa (Solo para exportación Completa) */}
          {exportType === 'completo' && (
            <div className="pt-8 space-y-4 break-before-page">
              <h2 className="text-xl font-bold text-steel-800 text-center uppercase tracking-widest border-b-2 border-steel-900 pb-2">
                Estructura de Actividades (WBS) Completa
              </h2>
              <table className="w-full text-[9px] border-collapse border border-steel-300">
                <thead>
                  <tr className="bg-steel-100 border-b border-steel-300">
                    <th className="px-2 py-1.5 text-left border-r border-steel-300 w-[60px] font-bold">COD.</th>
                    <th className="px-2 py-1.5 text-left border-r border-steel-300 font-bold">ACTIVIDAD</th>
                    <th className="px-2 py-1.5 text-center border-r border-steel-300 w-[50px] font-bold">PESO</th>
                    <th className="px-2 py-1.5 text-left border-r border-steel-300 w-[90px] font-bold">FECHAS</th>
                    <th className="px-2 py-1.5 text-center border-r border-steel-300 w-[60px] font-bold">DÍAS</th>
                    <th className="px-2 py-1.5 text-left border-r border-steel-300 w-[140px] font-bold">AVANCE (P/R)</th>
                    <th className="px-2 py-1.5 text-left font-bold">ESTADO</th>
                  </tr>
                </thead>
                <tbody>
                  {flattenActivities(displayCronograma).map((act) => (
                    <tr key={act.code} className={clsx(
                      "border-b border-steel-200", 
                      act.level === 0 ? "font-bold bg-steel-50" : "text-steel-600"
                    )}>
                      <td className="px-2 py-1 border-r border-steel-300" style={{ paddingLeft: `${act.level * 8 + 8}px` }}>
                        {act.code}
                      </td>
                      <td className="px-2 py-1 border-r border-steel-300">
                        {act.name}
                      </td>
                      <td className="px-2 py-1 text-center border-r border-steel-300">
                        {(act.peso * 100).toFixed(0)}%
                      </td>
                      <td className="px-2 py-1 border-r border-steel-300 whitespace-nowrap text-[8px]">
                        {act.inicio} / {act.fin}
                      </td>
                      <td className="px-2 py-1 text-center border-r border-steel-300">
                        {act.duracion}
                      </td>
                      <td className="px-2 py-1 border-r border-steel-300">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-2.5 bg-steel-100 rounded-full overflow-hidden relative border border-steel-200">
                            <div className="absolute inset-y-0 left-0 bg-primary-200" style={{ width: `${act.avanceProg}%` }} />
                            <div className={clsx(
                              "absolute inset-y-0 left-0", 
                              act.avanceReal >= act.avanceProg ? "bg-emerald-500" : "bg-red-400"
                            )} style={{ width: `${act.avanceReal}%` }} />
                          </div>
                          <span className="w-8 text-right font-black">
                            {act.avanceReal.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-1 text-[7px] font-bold">
                        {act.avanceReal >= 100 ? 'COMPLETADO' : (act.avanceReal >= act.avanceProg ? 'EN TIEMPO' : 'ATRASADO')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-[8px] text-steel-400 text-right italic pt-2">
                * Este reporte excluye notas y observaciones privadas de las actividades.
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Modal: Carpeta 07 Cronogramas */}
      {showFolder07Modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={() => setShowFolder07Modal(false)}>
          <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl w-full max-w-5xl mx-4 max-h-[85vh] flex flex-col overflow-hidden border border-steel-200 dark:border-steel-800"
            onClick={e => e.stopPropagation()}>
            
            {/* Header Modal */}
            <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-800 flex items-center justify-between bg-steel-50/50 dark:bg-steel-900">
              <div className="flex items-center gap-3">
                <div className="bg-amber-100 dark:bg-amber-900/30 p-2 rounded-xl">
                  <FolderOpen className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-steel-900 dark:text-white">Carpeta 07: Cronogramas</h3>
                  <p className="text-xs text-steel-400">Archivos oficiales de programación y seguimiento</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => document.getElementById('folder-07-upload-modal')?.click()}
                  className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 transition"
                >
                  <Upload className="h-4 w-4" /> Subir Archivo
                </button>
                <input id="folder-07-upload-modal" type="file" className="hidden" onChange={handleFolder07Upload} />
                <button onClick={() => setShowFolder07Modal(false)} className="text-steel-400 hover:text-steel-600 text-xl font-bold">✕</button>
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
                    {docsFolder07.length > 0 ? (
                      docsFolder07.map((doc) => {
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
                            <p className="text-sm font-medium">No hay cronogramas en esta carpeta</p>
                            <p className="text-xs max-w-[240px]">Sube los archivos .mpp o .xlsx de programación aquí.</p>
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
              <RefreshCw className="h-4 w-4 text-amber-500 animate-spin-slow" />
              <p className="text-[11px] text-steel-500 dark:text-steel-400">
                <span className="font-bold">Sincronizado:</span> Los documentos de cronograma se almacenan en la carpeta global 07.
              </p>
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </ProjectProvider>
  );
}
