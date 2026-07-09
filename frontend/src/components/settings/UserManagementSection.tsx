import { useState, useMemo, useEffect } from 'react';
import { 
  Users, Shield, Mail, UserCheck, UserX, Edit2, Trash2, 
  Plus, X, Check, ChevronUp, ChevronDown, Lock, Globe, Search, LayoutDashboard, Building2,
  Eye, EyeOff
} from 'lucide-react';
import clsx from 'clsx';
import { useAuthStore, ROLE_CONFIG, type UserRole } from '@/stores/authStore';
import { useProjectsTracking } from '@/data/projectsTracking';
import { listUsersAPI, updateUserAPI, deleteUserAPI, createUserAPI, resetPasswordAPI, searchTenantUsersAPI } from '@/services/api/auth';
import { useToastStore } from '@/components/common/Toast';
import { Loader2, KeyRound, AlertCircle } from 'lucide-react';

interface ModuleFeature {
  id: string;
  label: string;
  description: string;
}

interface Module {
  id: string;
  label: string;
  description: string;
  features: ModuleFeature[];
}

interface RegisteredUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  modules: string[];
  moduleFeatures: Record<string, string[]>; // { moduleId: [featureId1, featureId2, ...] }
  allowed_directors?: string[] | 'ALL';
  allowed_projects?: string[] | 'ALL';
}

const AVAILABLE_MODULES: Module[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Ver KPIs y métricas principales',
    features: [
      { id: 'overview', label: 'Resumen General', description: 'Vista general de métricas clave' },
      { id: 'kpis', label: 'KPIs', description: 'Indicadores de desempeño (CPI, SPI, Avance)' },
      { id: 'charts', label: 'Gráficos', description: 'Visualización de curva S y tendencias' },
      { id: 'alerts', label: 'Alertas', description: 'Notificaciones de desviaciones críticas' },
    ],
  },
  {
    id: 'business-case',
    label: 'Caso de Negocio',
    description: 'Análisis financiero y escenarios',
    features: [
      { id: 'summary', label: 'Resumen Ejecutivo', description: 'Síntesis del caso de negocio' },
      { id: 'financial', label: 'Análisis Financiero', description: 'Evaluación de rentabilidad y VPN' },
      { id: 'scenarios', label: 'Escenarios', description: 'Análisis de múltiples escenarios' },
      { id: 'sensitivity', label: 'Análisis de Sensibilidad', description: 'Impacto de variables críticas' },
    ],
  },
  {
    id: 'cronograma',
    label: 'Cronograma',
    description: 'Seguimiento de hitos y actividades',
    features: [
      { id: 'timeline', label: 'Línea de Tiempo', description: 'Vista general del cronograma' },
      { id: 'milestones', label: 'Hitos', description: 'Fechas clave y puntos de control' },
      { id: 'gantt', label: 'Diagrama de Gantt', description: 'Visualización de actividades' },
      { id: 'critical-path', label: 'Ruta Crítica', description: 'Actividades que afectan el plazo' },
    ],
  },
  {
    id: 'cash-flow',
    label: 'Flujo de Caja',
    description: 'Proyecciones de flujo de efectivo',
    features: [
      { id: 'projections', label: 'Proyecciones', description: 'Flujo de caja estimado' },
      { id: 'historical', label: 'Histórico', description: 'Flujo realizado vs presupuestado' },
      { id: 'analysis', label: 'Análisis', description: 'Tendencias y desviaciones' },
      { id: 'forecast', label: 'Previsión', description: 'Proyección de caja al final de obra' },
    ],
  },
  {
    id: 'reports',
    label: 'Reportes',
    description: 'Generación de reportes PDF/Excel',
    features: [
      { id: 'generation', label: 'Generación', description: 'Crear reportes personalizados' },
      { id: 'pdf', label: 'Exportar PDF', description: 'Descargar en formato PDF' },
      { id: 'excel', label: 'Exportar Excel', description: 'Descargar en formato Excel' },
      { id: 'scheduled', label: 'Reportes Programados', description: 'Envíos automáticos periódicos' },
    ],
  },
  {
    id: 'documents',
    label: 'Documentos',
    description: 'Gestión de archivos del proyecto',
    features: [
      { id: 'management', label: 'Gestión de Archivos', description: 'Subir, descargar y organizar' },
      { id: 'versions', label: 'Versionado', description: 'Control de versiones de documentos' },
      { id: 'sharing', label: 'Compartir', description: 'Distribuir documentos a usuarios' },
      { id: 'comments', label: 'Comentarios', description: 'Anotaciones y feedback en documentos' },
    ],
  },
  {
    id: 'tracking',
    label: 'Seguimiento',
    description: 'Control de pendientes y procesos',
    features: [
      { id: 'view', label: 'Ver Pendientes', description: 'Consultar la lista de pendientes' },
      { id: 'create', label: 'Crear', description: 'Agregar nuevos pendientes' },
      { id: 'edit', label: 'Editar', description: 'Modificar pendientes existentes' },
      { id: 'delete', label: 'Eliminar', description: 'Borrar registros de seguimiento' },
    ],
  },
];

const ROLE_COLORS: Record<UserRole, { bg: string; text: string }> = {
  administrador: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  gerente: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300' },
  director_proyectos: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  director: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300' },
  ingeniero_residente: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-300' },
  controller: { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300' },
  visitante: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300' },
};

export default function UserManagementSection() {
  const [users, setUsers] = useState<RegisteredUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<RegisteredUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const [tempModules, setTempModules] = useState<string[]>([]);
  const [tempModuleFeatures, setTempModuleFeatures] = useState<Record<string, string[]>>({});
  const [tempAllowedDirectors, setTempAllowedDirectors] = useState<string[] | 'ALL'>('ALL');
  const [tempAllowedProjects, setTempAllowedProjects] = useState<string[] | 'ALL'>('ALL');
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [directorSearch, setDirectorSearch] = useState('');
  const showToast = useToastStore((s) => s.showToast);

  // ── Password Reset State ──
  const [resetPasswords, setResetPasswords] = useState({ new: '', confirm: '' });
  const [showPasswords, setShowPasswords] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // ── Modal "Nuevo Usuario" ──
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    full_name: '',
    role: 'visitante' as UserRole,
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // ── Búsqueda en Tenant ──
  const [tenantUsers, setTenantUsers] = useState<any[]>([]);
  const [isSearchingTenant, setIsSearchingTenant] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');

  // Cargar lista inicial de usuarios del tenant al abrir el modal
  useEffect(() => {
    if (showCreateModal && tenantUsers.length === 0) {
      const fetchTenantUsers = async () => {
        setIsSearchingTenant(true);
        try {
          const res = await searchTenantUsersAPI();
          if (res?.success && Array.isArray(res.users)) {
            setTenantUsers(res.users);
          }
        } catch (e) {
          console.error("Error fetching tenant users:", e);
        } finally {
          setIsSearchingTenant(false);
        }
      };
      fetchTenantUsers();
    }
  }, [showCreateModal]);

  // Buscar según escribe el usuario (con debounce)
  useEffect(() => {
    const trimmed = userSearchTerm.trim();
    if (!trimmed || trimmed.length < 2) return;

    // Si ya seleccionamos un usuario y el término de búsqueda coincide con su formato de selección, no buscamos
    if (newUser.email && (trimmed === newUser.full_name || trimmed.includes(newUser.email))) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingTenant(true);
      try {
        const res = await searchTenantUsersAPI(trimmed);
        if (res?.success && Array.isArray(res.users)) {
          setTenantUsers(res.users);
        }
      } catch (e) {
        console.error("Error searching tenant users:", e);
      } finally {
        setIsSearchingTenant(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [userSearchTerm, newUser.email, newUser.full_name]);

  const handleCreateUser = async () => {
    setCreateError(null);

    // Validaciones
    if (!newUser.email || !newUser.email.includes('@')) {
      setCreateError('Debes seleccionar un usuario válido del directorio');
      return;
    }
    if (!newUser.full_name.trim()) {
      setCreateError('El nombre completo es requerido');
      return;
    }

    setIsCreating(true);
    try {
      await createUserAPI({
        email: newUser.email.trim().toLowerCase(),
        full_name: newUser.full_name.trim(),
        role: newUser.role,
      });
      // Recargar lista
      await fetchUsers();
      // Cerrar modal y limpiar
      setShowCreateModal(false);
      setNewUser({ email: '', full_name: '', role: 'visitante' });
      setUserSearchTerm('');
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
      setCreateError(`No se pudo crear el usuario: ${detail}`);
    } finally {
      setIsCreating(false);
    }
  };

  const [projects] = useProjectsTracking();

  // Helper para parsear JSON de forma segura
  const safeJsonParse = (value: any, fallback: any = {}) => {
    if (!value) return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  };

  const getDefaultModuleFeatures = (role: UserRole): Record<string, string[]> => {
    const defaultModules = ROLE_CONFIG[role]?.modules || [];
    const features: Record<string, string[]> = {};
    defaultModules.forEach(modId => {
      const modObj = AVAILABLE_MODULES.find(m => m.id === modId);
      if (modObj) {
        features[modId] = modObj.features.map(f => f.id);
      }
    });
    return features;
  };

  // Load users from API
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const apiUsers = await listUsersAPI();
      // Map API User to RegisteredUser
      const mappedUsers: RegisteredUser[] = apiUsers.map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: u.full_name,
        role: u.role,
        is_active: u.is_active,
        last_login: u.last_login,
        created_at: (u as any).created_at || new Date().toISOString(),
        modules: (() => {
          const mf = safeJsonParse((u as any).module_features, null);
          if (mf && typeof mf === 'object' && !Array.isArray(mf) && Object.keys(mf).length > 0) {
            // Las claves de module_features SON los módulos activos configurados por el admin
            return Object.keys(mf);
          }
          // Fallback: módulos por defecto del rol
          return ROLE_CONFIG[u.role as UserRole]?.modules || [];
        })(),
        moduleFeatures: (() => {
          const mf = safeJsonParse((u as any).module_features, null);
          if (mf && typeof mf === 'object' && !Array.isArray(mf) && Object.keys(mf).length > 0) {
            return mf;
          }
          return getDefaultModuleFeatures(u.role as UserRole);
        })(),
        allowed_directors: u.allowed_directors
          ? (u.allowed_directors === 'ALL' ? 'ALL' : safeJsonParse(u.allowed_directors, 'ALL'))
          : 'ALL',
        allowed_projects: u.allowed_projects
          ? (u.allowed_projects === 'ALL' ? 'ALL' : safeJsonParse(u.allowed_projects, 'ALL'))
          : 'ALL'
      }));
      setUsers(mappedUsers);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('No se pudieron cargar los usuarios.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);
  const allDirectors = useMemo(() => {
    // Función para limpiar y normalizar nombres
    const clean = (name: string) => {
      if (!name) return '';
      // 1. Quitar acentos y eñes para la llave de comparación
      const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
      // 2. Intentar quitar notas comunes (celulares, extensiones)
      // Ej: "Alfredo Hernandez cl 3168..." -> "alfredo hernandez"
      return normalized.split(/\s(cl|cel|tel|\d{7,})/i)[0].trim();
    };

    // Función para poner en Capital Case (Ej: ALFREDO -> Alfredo)
    const toTitleCase = (str: string) => {
      return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const uniqueMap = new Map<string, string>(); // key: normalized, value: display name

    projects.forEach(p => {
      const rawName = p.director_proyectos;
      if (!rawName) return;
      const key = clean(rawName);
      if (!key) return;

      // Si ya existe, preferimos el nombre que NO sea todo mayúsculas o que sea más corto (sin notas)
      const current = uniqueMap.get(key);
      const candidate = toTitleCase(key);
      
      if (!current || (rawName.length < current.length && !rawName.includes(' '))) {
        uniqueMap.set(key, candidate);
      }
    });

    return Array.from(uniqueMap.values()).sort();
  }, [projects]);

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' });
  };

  const handleToggleActive = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    try {
      await updateUserAPI(userId, { is_active: !user.is_active });
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !user.is_active } : u));
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
      alert(`Error al actualizar estado: ${detail}`);
    }
  };

  const handleDelete = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (!user) return;

    if (confirm(`¿Eliminar permanentemente al usuario "${user.full_name}" (${user.email})?\n\nEsta acción no se puede deshacer.`)) {
      try {
        await deleteUserAPI(userId);
        setUsers(users.filter(u => u.id !== userId));
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
        alert(`Error al eliminar: ${detail}`);
      }
    }
  };

  const handleEditClick = (user: RegisteredUser) => {
    setEditingUser(user);
    setTempModules([...user.modules]);
    
    // Safety check: ensure all active modules have features populated
    const initialFeatures = JSON.parse(JSON.stringify(user.moduleFeatures || {}));
    user.modules.forEach(modId => {
      if (!initialFeatures[modId] || initialFeatures[modId].length === 0) {
        const modObj = AVAILABLE_MODULES.find(m => m.id === modId);
        if (modObj) {
          initialFeatures[modId] = modObj.features.map(f => f.id);
        }
      }
    });
    setTempModuleFeatures(initialFeatures);
    
    setTempAllowedDirectors(user.allowed_directors || 'ALL');
    setTempAllowedProjects(user.allowed_projects || 'ALL');
    setExpandedModule(null);
  };

  const handleToggleModule = (moduleId: string) => {
    const newModules = tempModules.includes(moduleId)
      ? tempModules.filter(m => m !== moduleId)
      : [...tempModules, moduleId];

    setTempModules(newModules);

    // Si se desactiva un módulo, limpiar sus features
    if (!newModules.includes(moduleId)) {
      setTempModuleFeatures(prev => {
        const updated = { ...prev };
        delete updated[moduleId];
        return updated;
      });
    } else {
      // Si se activa un módulo, inicializar con todas sus features
      const module = AVAILABLE_MODULES.find(m => m.id === moduleId);
      if (module && !tempModuleFeatures[moduleId]) {
        setTempModuleFeatures(prev => ({
          ...prev,
          [moduleId]: module.features.map(f => f.id),
        }));
      }
    }
  };

  const handleToggleFeature = (moduleId: string, featureId: string) => {
    setTempModuleFeatures(prev => {
      const features = prev[moduleId] || [];
      const updated = features.includes(featureId)
        ? features.filter(f => f !== featureId)
        : [...features, featureId];

      return {
        ...prev,
        [moduleId]: updated,
      };
    });
  };

  const handleSaveModules = async () => {
    if (editingUser) {
      setIsSaving(true);
      try {
        // Si hay contraseñas, resetear primero
        if (resetPasswords.new || resetPasswords.confirm) {
          if (resetPasswords.new !== resetPasswords.confirm) {
            alert('Las contraseñas no coinciden');
            setIsSaving(false);
            return;
          }
          if (resetPasswords.new.length < 8) {
            alert('La contraseña debe tener al menos 8 caracteres');
            setIsSaving(false);
            return;
          }
          await resetPasswordAPI(editingUser.id, { 
            password: resetPasswords.new, 
            confirm_password: resetPasswords.confirm 
          });
          showToast(`Contraseña actualizada para ${editingUser.full_name}`, 'success');
        }

        const allowedDirectorsStr = tempAllowedDirectors === 'ALL' 
          ? 'ALL' 
          : JSON.stringify(tempAllowedDirectors);
        
        const allowedProjectsStr = tempAllowedProjects === 'ALL'
          ? 'ALL'
          : JSON.stringify(tempAllowedProjects);
        
        const moduleFeaturesStr = JSON.stringify(tempModuleFeatures);

        await updateUserAPI(editingUser.id, {
          allowed_directors: allowedDirectorsStr,
          allowed_projects: allowedProjectsStr,
          module_features: moduleFeaturesStr
        });

        setUsers(users.map(u =>
          u.id === editingUser.id
            ? { 
                ...u, 
                modules: tempModules, 
                moduleFeatures: tempModuleFeatures,
                allowed_directors: tempAllowedDirectors,
                allowed_projects: tempAllowedProjects 
              }
            : u
        ));
        setEditingUser(null);
        setTempModules([]);
        setTempModuleFeatures({});
        setTempAllowedDirectors('ALL');
        setTempAllowedProjects('ALL');
        setExpandedModule(null);
        setResetPasswords({ new: '', confirm: '' });
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
        alert(`Error al guardar cambios: ${detail}`);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleResetPasswordDedicated = async () => {
    if (!editingUser) return;
    
    if (!resetPasswords.new || !resetPasswords.confirm) {
      alert('Ambos campos de contraseña son requeridos');
      return;
    }

    if (resetPasswords.new !== resetPasswords.confirm) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (resetPasswords.new.length < 8) {
      alert('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!/[A-Z]/.test(resetPasswords.new) || !/\d/.test(resetPasswords.new)) {
      alert('La contraseña debe incluir al menos una mayúscula y un número');
      return;
    }

    setIsResetting(true);
    try {
      await resetPasswordAPI(editingUser.id, { 
        password: resetPasswords.new, 
        confirm_password: resetPasswords.confirm 
      });
      showToast(`Contraseña actualizada para ${editingUser.full_name}`, 'success');
      setResetPasswords({ new: '', confirm: '' });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Error desconocido';
      alert(`Error al resetear contraseña: ${detail}`);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
            <Users className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-steel-900 dark:text-white">Gestión de Usuarios</h2>
            <p className="text-sm text-steel-600 dark:text-steel-400">{users.length} usuarios registrados</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          Nuevo Usuario
        </button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-800 text-steel-900 dark:text-white placeholder-steel-500 dark:placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-800 dark:text-red-300 font-semibold">⚠️ {error}</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">
            Verifica que el backend esté corriendo en puerto 3000.
          </p>
          <button
            onClick={() => fetchUsers()}
            className="mt-2 px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Users Table */}
      <div className="overflow-x-auto rounded-xl border border-steel-200 dark:border-steel-700">
        <table className="w-full">
          <thead>
            <tr className="bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700">
              <th className="px-6 py-3 text-left text-sm font-semibold text-steel-900 dark:text-white">Usuario</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-steel-900 dark:text-white">Rol</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-steel-900 dark:text-white">Último acceso</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-steel-900 dark:text-white">Estado</th>
              <th className="px-6 py-3 text-center text-sm font-semibold text-steel-900 dark:text-white">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
                    <p className="text-sm text-steel-500 font-medium">Cargando usuarios...</p>
                  </div>
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-steel-500">
                  {searchTerm ? 'No se encontraron usuarios que coincidan con la búsqueda.' : 'No hay usuarios registrados.'}
                </td>
              </tr>
            ) : filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-steel-200 dark:border-steel-700 hover:bg-steel-50 dark:hover:bg-steel-800/50 transition"
              >
                <td className="px-6 py-4">
                  <div>
                    <p className="font-semibold text-steel-900 dark:text-white">{user.full_name}</p>
                    <p className="text-sm text-steel-600 dark:text-steel-400 flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold',
                      ROLE_COLORS[user.role]?.bg || 'bg-gray-100',
                      ROLE_COLORS[user.role]?.text || 'text-gray-700'
                    )}
                  >
                    <Shield className="w-3 h-3" />
                    {ROLE_CONFIG[user.role]?.label || user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-steel-600 dark:text-steel-400">{formatDate(user.last_login)}</p>
                </td>
                <td className="px-6 py-4">
                  <button
                    onClick={() => handleToggleActive(user.id)}
                    className={clsx(
                      'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition',
                      user.is_active
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                    )}
                  >
                    {user.is_active ? (
                      <>
                        <UserCheck className="w-3 h-3" />
                        Activo
                      </>
                    ) : (
                      <>
                        <UserX className="w-3 h-3" />
                        Inactivo
                      </>
                    )}
                  </button>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => handleEditClick(user)}
                      title="Editar módulos"
                      className="p-2 text-steel-600 dark:text-steel-400 hover:bg-steel-100 dark:hover:bg-steel-800 rounded-lg transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      title="Eliminar"
                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Info Card */}
      <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-semibold">ℹ️ Nota:</span> Los usuarios pueden ser asignados a diferentes roles para controlar el acceso a módulos específicos de la aplicación.
        </p>
      </div>

      {/* Modal de Edición de Módulos */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-steel-200 dark:border-steel-700 sticky top-0 bg-white dark:bg-steel-800">
              <div>
                <h2 className="text-xl font-bold text-steel-900 dark:text-white">{editingUser.full_name}</h2>
                <p className="text-sm text-steel-600 dark:text-steel-400">{editingUser.email}</p>
              </div>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setTempModules([]);
                  setTempModuleFeatures({});
                  setTempAllowedDirectors('ALL');
                  setTempAllowedProjects('ALL');
                  setExpandedModule(null);
                }}
                className="p-2 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-steel-600 dark:text-steel-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
              {/* Info Básica */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-widest mb-2">Rol Asignado</label>
                  <div className="p-3.5 rounded-xl bg-steel-50 dark:bg-steel-900/50 border border-steel-200 dark:border-steel-700 flex items-center gap-3">
                    <div className={clsx("p-2 rounded-lg", ROLE_COLORS[editingUser.role].bg)}>
                      <Shield className={clsx("w-4 h-4", ROLE_COLORS[editingUser.role].text)} />
                    </div>
                    <span className="text-sm font-bold text-steel-800 dark:text-steel-200">
                      {ROLE_CONFIG[editingUser.role]?.label}
                    </span>
                  </div>
                </div>
                {/* Reset Password Section */}
                <div className="flex flex-col gap-4 p-4 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/30">
                  <div className="flex items-center gap-2 mb-1">
                    <KeyRound className="w-4 h-4 text-red-600 dark:text-red-400" />
                    <label className="text-xs font-bold text-red-800 dark:text-red-300 uppercase tracking-widest">Establecer nueva contraseña</label>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="relative">
                      <input 
                        type={showPasswords ? "text" : "password"}
                        placeholder="Nueva contraseña"
                        value={resetPasswords.new}
                        onChange={(e) => setResetPasswords({ ...resetPasswords, new: e.target.value })}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 focus:ring-2 focus:ring-red-500 outline-none transition pr-8"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(!showPasswords)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-steel-400 hover:text-steel-600 transition"
                      >
                        {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input 
                          type={showPasswords ? "text" : "password"}
                          placeholder="Confirmar"
                          value={resetPasswords.confirm}
                          onChange={(e) => setResetPasswords({ ...resetPasswords, confirm: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 focus:ring-2 focus:ring-red-500 outline-none transition pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPasswords(!showPasswords)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-steel-400 hover:text-steel-600 transition"
                        >
                          {showPasswords ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button
                        onClick={handleResetPasswordDedicated}
                        disabled={isResetting || !resetPasswords.new || !resetPasswords.confirm}
                        className="px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-900/50 text-white rounded-lg text-xs font-bold transition flex items-center justify-center min-w-[80px]"
                      >
                        {isResetting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Establecer'}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-3 h-3 text-steel-400" />
                    <p className="text-[10px] text-steel-500">
                      Mínimo 8 caracteres, 1 mayúscula y 1 número. 
                      {editingUser.id === useAuthStore.getState().user?.id && (
                        <span className="text-red-600 font-bold ml-1">No puedes resetear tu propia contraseña aquí.</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* ── SECCIÓN ÚNICA: CONFIGURACIÓN DE ACCESO ── */}
              <div className="pt-8 border-t border-steel-100 dark:border-steel-700">
                <div className="flex items-center gap-2 mb-6">
                  <Lock className="w-5 h-5 text-primary-600" />
                  <h3 className="text-lg font-bold text-steel-900 dark:text-white">Configuración de Acceso y Permisos</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Columna Izquierda: Visibilidad de Proyectos */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Globe className="w-4 h-4 text-steel-400" />
                      <h4 className="text-sm font-bold text-steel-700 dark:text-steel-300">Visibilidad de Proyectos</h4>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setTempAllowedDirectors('ALL');
                          setTempAllowedProjects('ALL');
                        }}
                        className={clsx(
                          "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition",
                          (tempAllowedDirectors === 'ALL' && tempAllowedProjects === 'ALL')
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                            : "border-steel-100 dark:border-steel-800 bg-white dark:bg-steel-900 text-steel-500 dark:text-steel-500 hover:border-steel-200"
                        )}
                      >
                        <Globe className="w-5 h-5" />
                        <span className="text-xs font-bold">Todos los Proyectos</span>
                      </button>
                      <button
                        onClick={() => {
                          setTempAllowedDirectors(Array.isArray(tempAllowedDirectors) ? tempAllowedDirectors : []);
                          setTempAllowedProjects('ALL');
                        }}
                        className={clsx(
                          "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition",
                          Array.isArray(tempAllowedDirectors)
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                            : "border-steel-100 dark:border-steel-800 bg-white dark:bg-steel-900 text-steel-500 dark:text-steel-500 hover:border-steel-200"
                        )}
                      >
                        <Search className="w-5 h-5" />
                        <span className="text-xs font-bold">Filtrar por Director</span>
                      </button>
                      <button
                        onClick={() => {
                          setTempAllowedProjects(Array.isArray(tempAllowedProjects) ? tempAllowedProjects : []);
                          setTempAllowedDirectors('ALL');
                        }}
                        className={clsx(
                          "flex-1 flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 transition",
                          Array.isArray(tempAllowedProjects)
                            ? "border-primary-500 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300"
                            : "border-steel-100 dark:border-steel-800 bg-white dark:bg-steel-900 text-steel-500 dark:text-steel-500 hover:border-steel-200"
                        )}
                      >
                        <Building2 className="w-5 h-5" />
                        <span className="text-xs font-bold">Filtrar por Proyecto</span>
                      </button>
                    </div>

                    {/* Lista de Directores (si no es 'ALL') */}
                    {tempAllowedDirectors !== 'ALL' && Array.isArray(tempAllowedDirectors) && (
                      <div className="p-4 rounded-xl bg-steel-50 dark:bg-steel-950/30 border border-steel-200 dark:border-steel-700 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-steel-400 uppercase tracking-tighter">Directores permitidos:</p>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-steel-400" />
                            <input
                              type="text"
                              placeholder="Buscar director..."
                              value={directorSearch}
                              onChange={(e) => setDirectorSearch(e.target.value)}
                              className="pl-7 pr-2 py-1 text-[10px] bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 w-32 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
                          {allDirectors
                            .filter(d => (d || '').toLowerCase().includes(directorSearch.toLowerCase()))
                            .map(director => {
                            const isChecked = tempAllowedDirectors.includes(director);
                            return (
                              <button
                                key={director}
                                onClick={() => {
                                  if (isChecked) {
                                    setTempAllowedDirectors(tempAllowedDirectors.filter(d => d !== director));
                                  } else {
                                    setTempAllowedDirectors([...tempAllowedDirectors, director]);
                                  }
                                }}
                                className={clsx(
                                  "flex items-center gap-3 p-2.5 rounded-lg border text-left transition",
                                  isChecked 
                                    ? "bg-white dark:bg-steel-800 border-primary-300 dark:border-primary-700 shadow-sm" 
                                    : "bg-transparent border-transparent opacity-60"
                                )}
                              >
                                <div className={clsx(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  isChecked ? "bg-primary-500 border-primary-500" : "border-steel-300 dark:border-steel-600"
                                )}>
                                  {isChecked && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className={clsx("text-xs transition-colors", isChecked ? "font-bold text-steel-900 dark:text-white" : "text-steel-500")}>
                                  {director}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Lista de Proyectos (si no es 'ALL') */}
                    {tempAllowedProjects !== 'ALL' && Array.isArray(tempAllowedProjects) && (
                      <div className="p-4 rounded-xl bg-steel-50 dark:bg-steel-950/30 border border-steel-200 dark:border-steel-700 space-y-2">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-[10px] font-bold text-steel-400 uppercase tracking-tighter">Proyectos permitidos:</p>
                          <div className="relative">
                            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-steel-400" />
                            <input
                              type="text"
                              placeholder="Buscar proyecto..."
                              value={projectSearch}
                              onChange={(e) => setProjectSearch(e.target.value)}
                              className="pl-7 pr-2 py-1 text-[10px] bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500 w-32 transition-all"
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-1.5 max-h-[250px] overflow-y-auto custom-scrollbar pr-1">
                          {projects
                            .filter(p => 
                              ((p.nombre_proyecto || p.sheet_name || '').toLowerCase()).includes(projectSearch.toLowerCase()) ||
                              (p.id || '').toLowerCase().includes(projectSearch.toLowerCase())
                            )
                            .map(p => {
                            const isChecked = tempAllowedProjects.includes(p.id);
                            return (
                              <button
                                key={p.id}
                                onClick={() => {
                                  if (isChecked) {
                                    setTempAllowedProjects(tempAllowedProjects.filter(id => id !== p.id));
                                  } else {
                                    setTempAllowedProjects([...tempAllowedProjects, p.id]);
                                  }
                                }}
                                className={clsx(
                                  "flex items-center gap-3 p-2.5 rounded-lg border text-left transition",
                                  isChecked 
                                    ? "bg-white dark:bg-steel-800 border-primary-300 dark:border-primary-700 shadow-sm" 
                                    : "bg-transparent border-transparent opacity-60"
                                )}
                              >
                                <div className={clsx(
                                  "w-4 h-4 rounded border flex items-center justify-center transition-colors",
                                  isChecked ? "bg-primary-500 border-primary-500" : "border-steel-300 dark:border-steel-600"
                                )}>
                                  {isChecked && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <div>
                                  <p className={clsx("text-xs transition-colors", isChecked ? "font-bold text-steel-900 dark:text-white" : "text-steel-500")}>
                                    {p.nombre_proyecto || p.sheet_name || p.id}
                                  </p>
                                  <p className="text-[9px] text-steel-400">{p.id}</p>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Columna Derecha: Módulos Accesibles */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-1">
                      <LayoutDashboard className="w-4 h-4 text-steel-400" />
                      <h4 className="text-sm font-bold text-steel-700 dark:text-steel-300">
                        Módulos del Sistema ({tempModules.length}/{AVAILABLE_MODULES.length})
                      </h4>
                    </div>
                    
                    <div className="space-y-3 max-h-[450px] overflow-y-auto pr-2 custom-scrollbar">
                      {AVAILABLE_MODULES.map(module => {
                        const isSelected = tempModules.includes(module.id);
                        const isExpanded = expandedModule === module.id;
                        const selectedFeatures = tempModuleFeatures[module.id] || [];

                        return (
                          <div
                            key={module.id}
                            className={clsx(
                              'rounded-xl border-2 transition-all duration-200 overflow-hidden',
                              isSelected
                                ? 'border-primary-500 bg-primary-50/50 dark:bg-primary-950/20'
                                : 'border-steel-100 dark:border-steel-800 bg-white dark:bg-steel-900'
                            )}
                          >
                            <button
                              onClick={() => {
                                handleToggleModule(module.id);
                                if (isSelected && !isExpanded) setExpandedModule(module.id);
                              }}
                              className="w-full p-3.5 flex items-start justify-between hover:bg-black/5 dark:hover:bg-white/5 transition"
                            >
                              <div className="text-left">
                                <p className={clsx("text-sm font-bold transition-colors", isSelected ? "text-primary-700 dark:text-primary-300" : "text-steel-900 dark:text-white")}>
                                  {module.label}
                                </p>
                                <p className="text-[10px] text-steel-500 mt-0.5 line-clamp-1">{module.description}</p>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-primary-600 bg-white dark:bg-steel-800 px-2 py-0.5 rounded-full border border-primary-200 dark:border-primary-800">
                                    {selectedFeatures.length}/{module.features.length}
                                  </span>
                                )}
                                <div className={clsx(
                                  'w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all',
                                  isSelected ? 'bg-primary-500 border-primary-500' : 'border-steel-200 dark:border-steel-700'
                                )}>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                </div>
                              </div>
                            </button>

                            {isSelected && (
                              <div className={clsx(
                                'overflow-hidden transition-all duration-300',
                                isExpanded ? 'max-h-[500px]' : 'max-h-0'
                              )}>
                                <div className="p-3 pt-1 space-y-1.5 border-t border-primary-100 dark:border-primary-900/30">
                                  {module.features.map(feature => (
                                    <button
                                      key={feature.id}
                                      onClick={() => handleToggleFeature(module.id, feature.id)}
                                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-steel-800 transition text-left"
                                    >
                                      <div className={clsx(
                                        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors',
                                        selectedFeatures.includes(feature.id) ? 'bg-primary-500 border-primary-500' : 'border-steel-300 dark:border-steel-600'
                                      )}>
                                        {selectedFeatures.includes(feature.id) && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <div>
                                        <p className="text-xs font-semibold text-steel-700 dark:text-steel-200">{feature.label}</p>
                                      </div>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}

                            {isSelected && (
                              <button
                                onClick={() => setExpandedModule(isExpanded ? null : module.id)}
                                className="w-full py-1.5 text-[9px] text-primary-600 dark:text-primary-400 font-bold hover:bg-primary-100/50 transition flex items-center justify-center gap-1 border-t border-primary-100/30"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {isExpanded ? 'Contraer' : 'Ver características'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-6 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 sticky bottom-0">
              <button
                onClick={() => {
                  setEditingUser(null);
                  setTempModules([]);
                  setTempModuleFeatures({});
                  setTempAllowedDirectors('ALL');
                  setTempAllowedProjects('ALL');
                  setExpandedModule(null);
                }}
                className="px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-800 transition font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveModules}
                disabled={isSaving}
                className={clsx(
                  "px-4 py-2 rounded-lg text-white transition font-semibold flex items-center gap-2",
                  isSaving ? "bg-primary-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Crear Nuevo Usuario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl max-w-xl w-full">
            <div className="flex items-center justify-between p-6 border-b border-steel-200 dark:border-steel-700">
              <div>
                <h2 className="text-xl font-bold text-steel-900 dark:text-white">Crear Nuevo Usuario</h2>
                <p className="text-sm text-steel-600 dark:text-steel-400 mt-0.5">Completa los datos del nuevo usuario</p>
              </div>
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ email: '', full_name: '', role: 'visitante' });
                  setUserSearchTerm('');
                  setCreateError(null);
                }}
                className="p-2 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition"
              >
                <X className="w-5 h-5 text-steel-600 dark:text-steel-400" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {createError && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
                  <p className="text-sm text-red-700 dark:text-red-300">⚠️ {createError}</p>
                </div>
              )}

              <div className="relative z-10">
                <label className="block text-sm font-semibold text-steel-900 dark:text-white mb-1">Buscar Usuario (Directorio de Empresa) *</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400" />
                  <input
                    type="text"
                    value={userSearchTerm}
                    onChange={(e) => {
                      setUserSearchTerm(e.target.value);
                      setShowUserDropdown(true);
                      if (e.target.value === '') {
                        setNewUser({ ...newUser, email: '', full_name: '' });
                      }
                    }}
                    onFocus={() => setShowUserDropdown(true)}
                    placeholder="Escribe el nombre o correo..."
                    className="w-full pl-9 pr-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  {isSearchingTenant && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="w-4 h-4 animate-spin text-steel-400" />
                    </div>
                  )}
                </div>

                {showUserDropdown && userSearchTerm && (
                  <div className="absolute left-0 right-0 mt-1 max-h-60 overflow-y-auto bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-lg shadow-xl z-50">
                    {tenantUsers
                      .filter(u => {
                        const term = userSearchTerm.toLowerCase();
                        if (newUser.email && (term === newUser.full_name?.toLowerCase() || term.includes(newUser.email.toLowerCase()))) {
                          return true;
                        }
                        return (
                          u.displayName?.toLowerCase().includes(term) || 
                          u.email?.toLowerCase().includes(term)
                        );
                      })
                      .map((u, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setNewUser({
                              ...newUser,
                              email: u.email,
                              full_name: u.displayName || u.email
                            });
                            setUserSearchTerm(`${u.displayName} (${u.email})`);
                            setShowUserDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-steel-50 dark:hover:bg-steel-700/50 transition border-b border-steel-100 dark:border-steel-700/50 last:border-0 flex flex-col"
                        >
                          <span className="font-semibold text-steel-900 dark:text-white">{u.displayName || 'Sin nombre'}</span>
                          <span className="text-xs text-steel-500 dark:text-steel-400">{u.email}</span>
                          <span className="text-[10px] text-primary-600 dark:text-primary-400">{u.jobTitle || 'Empleado'} • {u.department || 'N/A'}</span>
                        </button>
                    ))}
                    {tenantUsers.filter(u => {
                        const term = userSearchTerm.toLowerCase();
                        if (newUser.email && (term === newUser.full_name?.toLowerCase() || term.includes(newUser.email.toLowerCase()))) {
                          return true;
                        }
                        return (
                          u.displayName?.toLowerCase().includes(term) || 
                          u.email?.toLowerCase().includes(term)
                        );
                    }).length === 0 && (
                      <div className="px-4 py-3 text-sm text-steel-500 text-center">
                        No se encontraron usuarios
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-steel-900 dark:text-white mb-1">Email seleccionado</label>
                <input
                  type="email"
                  value={newUser.email}
                  readOnly
                  disabled
                  placeholder="Se autocompletará..."
                  className="w-full px-4 py-2 rounded-lg border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 text-steel-600 dark:text-steel-400 cursor-not-allowed"
                />
              </div>

                <div>
                  <label className="block text-sm font-semibold text-steel-900 dark:text-white mb-1">Rol *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="w-full px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="administrador">Administrador (acceso total)</option>
                    <option value="gerente">Gerente (acceso total)</option>
                    <option value="director_proyectos">Director de Proyectos</option>
                    <option value="director">Director</option>
                    <option value="controller">Controller</option>
                    <option value="ingeniero_residente">Ingeniero Residente</option>
                    <option value="visitante">Visitante (solo lectura)</option>
                  </select>
                </div>
              </div>

            <div className="flex items-center justify-end gap-3 p-6 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setNewUser({ email: '', full_name: '', role: 'visitante' });
                  setUserSearchTerm('');
                  setCreateError(null);
                }}
                disabled={isCreating}
                className="px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-800 transition font-semibold disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateUser}
                disabled={isCreating}
                className={clsx(
                  "px-4 py-2 rounded-lg text-white transition font-semibold flex items-center gap-2",
                  isCreating ? "bg-primary-400 cursor-not-allowed" : "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    Crear Usuario
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
