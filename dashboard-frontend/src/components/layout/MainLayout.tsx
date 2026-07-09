import { Outlet, NavLink, useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderTree,
  DollarSign,
  TrendingUp,
  BarChart3,
  Menu,
  Files,
  ChevronLeft,
  Building2,
  Briefcase,
  LogOut,
  CalendarClock,
  Settings,
  Moon,
  Sun,
  Sparkles,
  Users,
  Shield,
  ClipboardList,
  User,
  Lock,
  type LucideIcon,
} from 'lucide-react';
import { businessCaseAPI } from '@/services/api/businessCase';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import { usePageContextStore } from '@/stores/pageContextStore';
import { useState, useEffect, useRef, useMemo } from 'react';
import clsx from 'clsx';
import { useAuthStore, hasAccess, getUserModuleAccess, ROLE_CONFIG } from '../../stores/authStore';
import { useThemeStore } from '@/stores/themeStore';
import { updatePresence, clearPresence } from '../../utils/activityTracker';
import ActivityPanel from '../common/ActivityPanel';
import { ToastContainer } from '../common/Toast';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  module: string; // for role-based filtering
}

const projectNavItems: NavItem[] = [
  { to: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, module: 'dashboard' },
  { to: 'business-case', label: 'Caso de Negocio', icon: Briefcase, module: 'business-case' },
  { to: 'cronograma', label: 'Cronograma', icon: CalendarClock, module: 'cronograma' },
  { to: 'cash-flow', label: 'Flujo de Caja', icon: TrendingUp, module: 'cash-flow' },
  { to: 'reports', label: 'Reportes', icon: BarChart3, module: 'reports' },
  { to: 'documents', label: 'Documentos', icon: Files, module: 'documents' },
  { to: 'tracking', label: 'Seguimiento', icon: ClipboardList, module: 'tracking' },
];



function checkIsLyra(id?: string): boolean {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/[\s-]/g, '');
  return normalized === 'lyracarsanoe2000' || normalized === 'lyracarsan' || normalized === 'oe2000';
}

export default function MainLayout() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const mainRef = useRef<HTMLElement>(null);

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { mode, toggleMode } = useThemeStore();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  // ── Dynamic Project Data Fetching ──
  const setProjectNameStore = usePageContextStore((s) => s.setProjectName);
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });


  const isLyra = checkIsLyra(projectId);

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

  useEffect(() => {
    if (project?.name) {
      setProjectNameStore(project.name);
    } else if (!projectId) {
      setProjectNameStore(null);
    }
  }, [project, projectId, setProjectNameStore]);

  const displayProjectName = project?.name || (projectLoading ? 'Cargando...' : 'Proyecto');

  // ── Presence tracking: update every 30 s and on route change ──
  useEffect(() => {
    if (!user) return;
    updatePresence(user, location.pathname);
    const t = setInterval(() => updatePresence(user, location.pathname), 30_000);
    return () => clearInterval(t);
  }, [user, location.pathname]);

  // Reset scroll position and close sidebar on route change
  useEffect(() => {
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
    setSidebarOpen(false);
  }, [location.pathname]);

  // Listen for global collapse event
  useEffect(() => {
    const handleCollapse = () => setSidebarOpen(false);
    window.addEventListener('collapseSidebar', handleCollapse);
    return () => window.removeEventListener('collapseSidebar', handleCollapse);
  }, []);

  let userRole = user?.role ?? 'visitante';

  const roleConfig = ROLE_CONFIG[userRole];

  // Filter nav items: respeta configuración individual de módulos del admin (module_features)
  // Si el admin configuró módulos para este usuario, solo muestra los indicados.
  // Si no hay configuración individual, cae al rol base.
  const visibleNavItems = projectNavItems.filter((item) => getUserModuleAccess(user, item.module));

  // ✅ DEBUG: Log rol y accesos
  useEffect(() => {
    // Console logs removed to keep browser console clean
  }, [user, userRole]);

  const handleLogout = () => {
    if (user) clearPresence(user.id);
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-steel-50 dark:bg-steel-950">
      {/* Sidebar - PC Mejia branded (hidden on mobile, fixed position overlay) */}
      <aside
        className={clsx(
          'hidden md:flex flex-col transition-all duration-300 border-r border-steel-200 dark:border-steel-800',
          'bg-gradient-to-b from-primary-900 via-primary-800 to-primary-950',
          sidebarOpen ? 'w-64' : 'w-16',
        )}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-primary-700/50">
          {sidebarOpen && (
            <div className="flex items-center">
              <img
                src="/images/pcmejia-logo.png"
                alt="PCMejia SA"
                className="h-10 w-auto brightness-0 invert"
              />
            </div>
          )}
          {!sidebarOpen && (
            <div className="flex items-center justify-center w-full">
              <Building2 className="h-6 w-6 text-primary-300" />
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label={sidebarOpen ? 'Colapsar menú lateral' : 'Expandir menú lateral'}
            aria-expanded={sidebarOpen}
            className="p-1.5 rounded-lg hover:bg-primary-700/50 text-primary-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            {sidebarOpen ? <ChevronLeft className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-pcm">
          
          {/* Main Portfolio Navigation */}
          <div className="px-4 pt-2 pb-2">
            {sidebarOpen && (
              <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                Portafolio Corporativo
              </p>
            )}
          </div>

          <NavLink
            to="/global-dashboard"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <DollarSign className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Dashboard General</span>}
          </NavLink>

          <NavLink
            to="/global-summary"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Proyectos</span>}
          </NavLink>

          <NavLink
            to="/projects"
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-2.5 text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <FolderTree className="h-5 w-5 flex-shrink-0" />
            {sidebarOpen && <span>Portafolio Corporativo</span>}
          </NavLink>



          {/* Project-specific navigation (filtered by role) */}
          {projectId && (
            <>
              <div className="px-4 pt-4 pb-2">
                {sidebarOpen && (
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                    Proyecto Actual
                  </p>
                )}
              </div>
              {visibleNavItems.map((item) => {
                const isDisabled = !proyectoConfigurado && item.to !== 'business-case';
                return (
                  <NavLink
                    key={item.to}
                    to={isDisabled ? '#' : `/projects/${projectId}/${item.to}`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    }}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-4 py-2.5 text-sm transition-all mx-2 rounded-lg relative',
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed text-primary-200'
                          : isActive
                          ? 'bg-white/15 text-white font-medium shadow-sm backdrop-blur-sm'
                          : 'text-primary-100 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {sidebarOpen && <span className="flex-1 truncate">{item.label}</span>}
                    {sidebarOpen && isDisabled && <Lock className="h-3 w-3 text-primary-300 opacity-60 ml-auto" />}
                  </NavLink>
                );
              })}
            </>
          )}
        </nav>

        {/* Administración: ahora se accede desde Configuración (tabs internas) */}

        {/* User section at bottom */}
        {sidebarOpen ? (
          <div className="border-t border-primary-700/50">
            {/* User info */}
            <div className="px-4 py-3">
              <div className="flex items-center gap-3">
                {user?.profile_image ? (
                  <img src={user.profile_image} alt={user.full_name} className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
                  <p className="text-[10px] text-primary-400 truncate">{roleConfig?.label}</p>
                </div>
              </div>
            </div>
            {/* Settings link */}
            {hasAccess(userRole, 'settings') && (
              <NavLink
                to="/settings"
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-4 py-2.5 text-sm transition-all mx-2 rounded-lg mb-1',
                    isActive
                      ? 'bg-white/15 text-white font-medium shadow-sm'
                      : 'text-primary-100 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Settings className="h-4 w-4 flex-shrink-0" />
                <span>Configuración</span>
              </NavLink>
            )}
            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-primary-300 hover:bg-white/10 hover:text-white transition"
            >
              <LogOut className="h-4 w-4 flex-shrink-0" />
              <span>Cerrar Sesion</span>
            </button>
            <div className="px-4 py-2">
              <p className="text-[10px] text-primary-500">
                PCMejia SA — v1.0
              </p>
            </div>
          </div>
        ) : (
          <div className="border-t border-primary-700/50 py-3 flex flex-col items-center gap-2">
            {user?.profile_image ? (
              <img src={user.profile_image} alt={user.full_name} className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-[10px] font-bold">
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </div>
            )}
            {hasAccess(userRole, 'settings') && (
              <NavLink
                to="/settings"
                aria-label="Configuración"
                className={({ isActive }) =>
                  clsx(
                    'p-1.5 rounded-lg transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                    isActive
                      ? 'bg-white/15 text-white shadow-sm'
                      : 'text-primary-300 hover:bg-white/10 hover:text-white',
                  )
                }
              >
                <Settings className="h-4 w-4" />
              </NavLink>
            )}
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="p-1.5 rounded-lg hover:bg-white/10 text-primary-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div aria-hidden="true" className="fixed inset-0 z-40 md:hidden bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 h-screen w-64 md:hidden transition-transform duration-300 border-r border-steel-200 dark:border-steel-800',
          'bg-gradient-to-b from-primary-900 via-primary-800 to-primary-950 flex flex-col',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Logo Header */}
        <div className="flex h-16 items-center justify-between px-4 border-b border-primary-700/50">
          <div className="flex items-center">
            <img
              src="/images/pcmejia-logo.png"
              alt="PCMejia SA"
              className="h-10 w-auto brightness-0 invert"
            />
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú de navegación"
            className="p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-primary-700/50 text-primary-300 hover:text-white transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 space-y-0.5 overflow-y-auto scrollbar-pcm">
          {/* Main Portfolio Navigation */}
          <div className="px-4 pt-2 pb-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400">
              Portafolio Corporativo
            </p>
          </div>

            <NavLink
            to="/global-dashboard"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <DollarSign className="h-5 w-5 flex-shrink-0" />
            <span>Dashboard General</span>
          </NavLink>

            <NavLink
            to="/global-summary"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <LayoutDashboard className="h-5 w-5 flex-shrink-0" />
            <span>Proyectos</span>
          </NavLink>

            <NavLink
            to="/projects"
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg',
                isActive
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-primary-100 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <FolderTree className="h-5 w-5 flex-shrink-0" />
            <span>Portafolio Corporativo</span>
          </NavLink>



          {/* Project-specific navigation */}
          {projectId && (
            <>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                  Proyecto Actual
                </p>
              </div>
              {visibleNavItems.map((item) => {
                const isDisabled = !proyectoConfigurado && item.to !== 'business-case';
                return (
                  <NavLink
                    key={item.to}
                    to={isDisabled ? '#' : `/projects/${projectId}/${item.to}`}
                    onClick={(e) => {
                      if (isDisabled) {
                        e.preventDefault();
                        e.stopPropagation();
                      } else {
                        setSidebarOpen(false);
                      }
                    }}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg relative',
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed text-primary-200'
                          : isActive
                          ? 'bg-white/15 text-white font-medium shadow-sm backdrop-blur-sm'
                          : 'text-primary-100 hover:bg-white/10 hover:text-white',
                      )
                    }
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isDisabled && <Lock className="h-3 w-3 text-primary-300 opacity-60 ml-auto" />}
                  </NavLink>
                );
              })}
            </>
          )}

          {/* Administration section (mobile) */}
          {(userRole === 'administrador' || userRole === 'gerente') && (
            <>
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-primary-400">
                  Administración
                </p>
              </div>
              {hasAccess(userRole, 'users') && (
                <NavLink
                  to="/admin/users"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg',
                      isActive
                        ? 'bg-white/15 text-white font-medium shadow-sm'
                        : 'text-primary-100 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Users className="h-5 w-5 flex-shrink-0" />
                  <span>Gestión de Usuarios</span>
                </NavLink>
              )}
              {hasAccess(userRole, 'audit-log') && (
                <NavLink
                  to="/admin/audit-log"
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg',
                      isActive
                        ? 'bg-white/15 text-white font-medium shadow-sm'
                        : 'text-primary-100 hover:bg-white/10 hover:text-white',
                    )
                  }
                >
                  <Shield className="h-5 w-5 flex-shrink-0" />
                  <span>Auditoría</span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* User section at bottom */}
        <div className="border-t border-primary-700/50">
          <div className="px-4 py-3">
            <div className="flex items-center gap-3">
              {user?.profile_image ? (
                <img src={user.profile_image} alt={user.full_name} className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-600 text-white text-xs font-bold">
                  {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user?.full_name}</p>
                <p className="text-[10px] text-primary-400 truncate">{roleConfig?.label}</p>
              </div>
            </div>
          </div>
          {hasAccess(userRole, 'settings') && (
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm transition-all mx-2 rounded-lg mb-1',
                  isActive
                    ? 'bg-white/15 text-white font-medium shadow-sm'
                    : 'text-primary-100 hover:bg-white/10 hover:text-white',
                )
              }
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Configuración</span>
            </NavLink>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-3.5 min-h-[44px] text-sm text-primary-300 hover:bg-white/10 hover:text-white transition"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span>Cerrar Sesion</span>
          </button>
          <div className="px-4 py-2">
            <p className="text-[10px] text-primary-500">
              PCMejia SA — v1.0
            </p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        ref={mainRef}
        className="flex-1 overflow-y-auto scrollbar-pcm"
      >
        {/* Top Bar */}
        <header className="sticky top-0 z-[60] flex h-14 items-center justify-between bg-white dark:bg-steel-900 px-4 sm:px-6 border-b border-steel-200 dark:border-steel-800 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Hamburger button - Mobile only */}
            <button
              onClick={() => setSidebarOpen(true)}
              aria-label="Abrir menú de navegación"
              aria-expanded={sidebarOpen}
              className="md:hidden p-2.5 min-h-[44px] min-w-[44px] rounded-lg hover:bg-steel-100 dark:hover:bg-steel-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              <Menu className="h-5 w-5 text-steel-700 dark:text-steel-300" />
            </button>
            <div className="hidden sm:block h-2 w-2 rounded-full bg-primary-600" />
            <h1 className="text-xs sm:text-sm font-semibold text-steel-700 dark:text-steel-200 line-clamp-1">
              Gestion de Proyectos {projectId ? `— ${displayProjectName}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={toggleMode}
              aria-label={`Cambiar a modo ${mode === 'light' ? 'oscuro' : 'claro'}`}
              className="p-2 rounded-full hover:bg-steel-100 dark:hover:bg-steel-800 transition text-steel-500 dark:text-steel-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {mode === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </button>
            <ActivityPanel />
            <span className="hidden sm:inline text-xs font-medium text-steel-400 dark:text-steel-300 bg-steel-50 dark:bg-steel-800 px-3 py-1.5 rounded-full border border-steel-200 dark:border-steel-700">
              {roleConfig?.label}
            </span>
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                aria-haspopup="menu"
                aria-expanded={showUserMenu}
                aria-label={`Menú de usuario: ${user?.full_name ?? 'Usuario'}`}
                className="flex items-center gap-2 px-2 py-2 min-h-[44px] rounded-lg hover:bg-steel-50 dark:hover:bg-steel-800 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
              >
                {user?.profile_image ? (
                  <img src={user.profile_image} alt={user.full_name} className="h-7 w-7 rounded-full object-cover" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 text-[10px] font-bold">
                    {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
                  </div>
                )}
                <span className="text-xs font-medium text-steel-600 dark:text-steel-300 hidden sm:inline">
                  {user?.full_name?.split(' ')[0]}
                </span>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  <div aria-hidden="true" className="fixed inset-0 z-20" onClick={() => setShowUserMenu(false)} />
                  <div role="menu" aria-label="Opciones de usuario" className="absolute right-0 top-full mt-1 z-30 w-56 rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-lg py-2">
                    <div className="px-4 py-2 border-b border-steel-100 dark:border-steel-700" aria-hidden="true">
                      <p className="text-xs font-semibold text-steel-800 dark:text-white">{user?.full_name}</p>
                      <p className="text-[10px] text-steel-400 dark:text-steel-400">{user?.email}</p>
                      <p className="text-[10px] text-primary-600 dark:text-primary-400 font-medium mt-0.5">{roleConfig?.label}</p>
                    </div>
                    <div className="py-1">
                      <button
                        role="menuitem"
                        onClick={() => {
                          setShowUserMenu(false);
                          navigate('/profile');
                        }}
                        className="flex w-full items-center gap-2 px-4 py-2 text-xs text-steel-700 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-900/50 transition"
                      >
                        <User className="h-3.5 w-3.5" />
                        Mi Perfil
                      </button>
                    </div>

                    <button
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-4 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition focus-visible:outline-none focus-visible:bg-red-50 dark:focus-visible:bg-red-950/30"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Cerrar Sesion
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-3 sm:p-6">
          <Outlet />
        </div>

        {/* Global Notifications */}
        <ToastContainer />
      </main>

    </div>
  );
}
