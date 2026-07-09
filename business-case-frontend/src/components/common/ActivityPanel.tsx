import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Activity, X, Clock, Circle, ArrowRight } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  getActiveSessions,
  getActivityLog,
  getActivityLogFromServer,
  type ActiveSession,
  type ActivityEntry,
} from '../../utils/activityTracker';
import { ROLE_CONFIG, type UserRole } from '../../stores/authStore';
import clsx from 'clsx';

// ── Helpers ──────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  'business-case': 'Caso de Negocio',
  budget: 'Presupuesto',
  cronograma: 'Cronograma',
  'cash-flow': 'Flujo de Caja',
  reports: 'Reportes',
  documents: 'Documentos',
  alerts: 'Alertas',
  projects: 'Proyectos',
  'global-summary': 'Resumen Global',
  settings: 'Configuración',
};

function getPageLabel(path: string): string {
  const segment = path.split('/').filter(Boolean).pop() || '';
  return PAGE_LABELS[segment] || 'App';
}

function timeAgo(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return 'Ahora mismo';
  if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
  return `Hace ${Math.floor(diff / 86400)} d`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

const AVATAR_PALETTE = [
  'bg-primary-500',
  'bg-emerald-500',
  'bg-violet-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-cyan-500',
];

function avatarColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[h];
}

const ROLE_BADGE: Record<string, string> = {
  gerente: 'bg-violet-100 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
  controller: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
  ingeniero: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
  viewer: 'bg-steel-100 text-steel-500 dark:bg-steel-700 dark:text-steel-300',
};

// ── Component ────────────────────────────────────────────────

export default function ActivityPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [sessions, setSessions] = useState<ActiveSession[]>([]);
  const [log, setLog] = useState<ActivityEntry[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  const refresh = useCallback(() => {
    setSessions(getActiveSessions());
    // Load from server (async), fallback to localStorage cache while loading
    setLog(getActivityLog(40));
    getActivityLogFromServer(100).then((entries) => setLog(entries)).catch(() => {});
  }, []);

  // Filter log by current context
  const contextualLog = useMemo(() => {
    const path = location.pathname;
    const currentLabel = getPageLabel(path).toLowerCase();
    
    return log.filter(entry => {
      // Si no tiene modulo, lo mostramos si la pagina coincide
      if (!entry.module) return entry.page.toLowerCase().includes(currentLabel);
      // Si tiene modulo, filtramos por modulo o pagina
      return entry.module.toLowerCase().includes(currentLabel) || entry.page.toLowerCase().includes(currentLabel);
    });
  }, [log, location.pathname]);

  // Refresh on open
  useEffect(() => {
    if (isOpen) refresh();
  }, [isOpen, refresh]);

  // Refresh when other tabs write activity
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === 'pcm_active_sessions' || e.key === 'pcm_activity_log') refresh();
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [refresh]);

  // Listen for global event to open panel
  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener('openActivitySidebar', handleOpen);
    return () => window.removeEventListener('openActivitySidebar', handleOpen);
  }, []);

  // Also poll every 30s when panel is open to pick up same-tab changes
  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(refresh, 30_000);
    return () => clearInterval(t);
  }, [isOpen, refresh]);

  const closePanel = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function onMouseDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) closePanel();
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [isOpen, closePanel]);

  // Close on Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { closePanel(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, closePanel]);

  // Move focus into panel when it opens
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const firstFocusable = panelRef.current.querySelector<HTMLElement>(
      'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  const activeCount = sessions.length;

  return (
    <div className="relative">
      {/* Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen((o) => !o)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={activeCount > 0 ? `Actividad: ${activeCount} usuario${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''}` : 'Panel de actividad'}
        className={clsx(
          'flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all',
          isOpen
            ? 'bg-primary-600 text-white shadow'
            : 'border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700',
        )}
      >
        <span className="relative flex items-center">
          <Activity className="h-4 w-4" aria-hidden="true" />
          {activeCount > 0 && (
            <span
              aria-hidden="true"
              className={clsx(
                'absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold',
                isOpen ? 'bg-white text-primary-700' : 'bg-primary-600 text-white',
              )}
            >
              {activeCount}
            </span>
          )}
        </span>
        <span className="hidden sm:inline">Actividad</span>
      </button>

      {/* Mobile backdrop */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/15 z-[9998] xl:hidden" onClick={closePanel} aria-hidden="true" />
      )}

      {/* Slide-out panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Panel de actividad en tiempo real"
          className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white dark:bg-steel-800 shadow-2xl z-[9999] border-l border-steel-200 dark:border-steel-700 flex flex-col"
          style={{ animation: 'slideIn 0.22s ease-out' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-800 to-primary-900 text-white flex-shrink-0">
            <div>
              <h3 className="font-bold text-base text-white">Control de Actividad</h3>
              <p className="text-white/80 text-xs mt-0.5">
                {activeCount === 0
                  ? 'Sin usuarios activos ahora'
                  : `${activeCount} usuario${activeCount > 1 ? 's' : ''} activo${activeCount > 1 ? 's' : ''} ahora`}
              </p>
            </div>
            <button
              onClick={closePanel}
              aria-label="Cerrar panel de actividad"
              className="rounded-lg p-1.5 hover:bg-white/15 transition focus:outline-none focus:ring-2 focus:ring-white/50 text-white"
            >
              <X className="h-5 w-5 text-white" aria-hidden="true" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto scrollbar-pcm p-5 space-y-6">
            {/* ── En línea ahora ── */}
            <section>
              <h4 className="text-xs font-bold text-steel-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="h-1 w-5 bg-emerald-400 rounded-full" />
                En línea ahora
              </h4>

              {sessions.length === 0 ? (
                <div className="rounded-xl bg-steel-50 dark:bg-steel-700/50 border border-steel-100 dark:border-steel-700 p-5 text-center">
                  <Activity className="h-7 w-7 text-steel-300 dark:text-steel-500 mx-auto mb-2" />
                  <p className="text-xs text-steel-400 dark:text-steel-400">Ningún usuario activo recientemente</p>
                  <p className="text-[10px] text-steel-300 dark:text-steel-500 mt-1">Los usuarios aparecen aquí mientras navegan la app</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <div
                      key={s.userId}
                      className="flex items-center gap-3 p-3 rounded-xl bg-steel-50 dark:bg-steel-700/50 border border-steel-100 dark:border-steel-700"
                    >
                      <div
                        className={clsx(
                          'flex h-9 w-9 items-center justify-center rounded-full text-white text-xs font-bold flex-shrink-0',
                          avatarColor(s.userId),
                        )}
                      >
                        {getInitials(s.userName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <p className="text-xs font-semibold text-steel-800 dark:text-steel-100 truncate">{s.userName}</p>
                          <Circle className="h-1.5 w-1.5 text-emerald-500 fill-emerald-500 flex-shrink-0" />
                        </div>
                        <span
                          className={clsx(
                            'inline-block rounded-full px-2 py-0 text-[9px] font-semibold',
                            ROLE_BADGE[s.userRole] ?? 'bg-steel-100 dark:bg-steel-700 text-steel-500 dark:text-steel-300',
                          )}
                        >
                          {ROLE_CONFIG[s.userRole as UserRole]?.label ?? s.userRole}
                        </span>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[10px] font-medium text-steel-600 dark:text-steel-400">{getPageLabel(s.currentPage)}</p>
                        <p className="text-[9px] text-steel-400 dark:text-steel-500 mt-0.5" title={new Date(s.lastSeen).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}>{timeAgo(s.lastSeen)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* ── Historial de ediciones ── */}
            <section>
              <h4 className="text-xs font-bold text-steel-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <div className="h-1 w-5 bg-primary-400 rounded-full" />
                Actividad en {getPageLabel(location.pathname)}
              </h4>

              {contextualLog.length === 0 ? (
                <div className="rounded-xl bg-steel-50 dark:bg-steel-700/50 border border-steel-100 dark:border-steel-700 p-5 text-center">
                  <Clock className="h-7 w-7 text-steel-300 dark:text-steel-500 mx-auto mb-2" />
                  <p className="text-xs text-steel-400 dark:text-steel-400">Sin actividad reciente en este módulo</p>
                  <p className="text-[10px] text-steel-300 dark:text-steel-500 mt-1">Los cambios aparecerán aquí cuando se realicen ediciones</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {contextualLog.map((entry) => (
                    <div
                      key={entry.id}
                      onClick={() => entry.link && navigate(entry.link)}
                      className={clsx(
                        'flex flex-col gap-2 p-3 rounded-xl bg-steel-50 dark:bg-steel-700/50 border border-steel-100 dark:border-steel-700 transition group',
                        entry.link ? 'cursor-pointer hover:bg-steel-100 dark:hover:bg-steel-700 hover:border-primary-200 dark:hover:border-primary-800' : ''
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={clsx(
                            'flex h-7 w-7 items-center justify-center rounded-full text-white text-[9px] font-bold flex-shrink-0 mt-0.5',
                            avatarColor(entry.userId),
                          )}
                        >
                          {getInitials(entry.userName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] font-bold text-steel-800 dark:text-steel-100">{entry.userName}</p>
                            <span className="text-[9px] text-steel-400 dark:text-steel-500 flex items-center gap-0.5" title={new Date(entry.timestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}>
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(entry.timestamp)}
                            </span>
                          </div>
                          <p className="text-[11px] text-steel-600 dark:text-steel-400 leading-relaxed mt-0.5 font-medium">{entry.action}</p>
                          
                          {/* Detalle Antes/Después si existe */}
                          {(entry.before || entry.after) && (
                            <div className="mt-2 grid grid-cols-1 gap-1 text-[9px] font-mono p-1.5 rounded bg-white dark:bg-steel-900 border border-steel-100 dark:border-steel-800">
                              {entry.before && (
                                <div className="flex items-start gap-1">
                                  <span className="text-red-500 font-bold flex-shrink-0 w-3">-</span>
                                  <span className="text-steel-500 truncate">{entry.before}</span>
                                </div>
                              )}
                              {entry.after && (
                                <div className="flex items-start gap-1">
                                  <span className="text-emerald-500 font-bold flex-shrink-0 w-3">+</span>
                                  <span className="text-steel-700 dark:text-steel-300 truncate">{entry.after}</span>
                                </div>
                              )}
                            </div>
                          )}

                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                            <span className="text-[9px] text-primary-600 dark:text-primary-400 font-bold uppercase tracking-tight">
                              {entry.module || entry.page}
                            </span>
                            {entry.link && (
                              <span className="text-[9px] text-primary-500 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                Ver tarea <ArrowRight className="h-2 w-2" />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {log.length > contextualLog.length && (
                    <button 
                      onClick={() => navigate('/settings?tab=activity')}
                      className="w-full py-2 text-[10px] text-primary-600 dark:text-primary-400 font-bold hover:underline"
                    >
                      Ver todo el historial de la app ({log.length} registros)
                    </button>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-700/50 flex-shrink-0">
            <p className="text-[10px] text-steel-400 dark:text-steel-500 text-center">
              PCMejia SA — Sistema de Gestion de Proyectos v1.0
            </p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.6; }
          to   { transform: translateX(0);    opacity: 1;   }
        }
      `}</style>
    </div>
  );
}
