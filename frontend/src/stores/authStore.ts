import { create } from 'zustand';

export type UserRole = 'administrador' | 'gerente' | 'director_proyectos' | 'director' | 'ingeniero_residente' | 'controller' | 'visitante';

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  last_login: string | null;
  allowed_directors?: string[] | 'ALL';
  allowed_projects?: string[] | 'ALL';
  module_features?: Record<string, string[]> | string;
  profile_image?: string | null;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;

  // Actions
  login: (token: string, user: User) => void;
  logout: () => void;
  updateProfile: (data: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('pcm_access_token'),
  user: (() => {
    try {
      const u = localStorage.getItem('pcm_user');
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  })(),
  isAuthenticated: false,

  login: (token: string, user: User) => {
    localStorage.setItem('pcm_access_token', token);
    localStorage.setItem('pcm_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('pcm_access_token');
    localStorage.removeItem('pcm_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  updateProfile: (data: Partial<User>) => {
    set((state) => {
      if (!state.user) return state;
      const updatedUser = { ...state.user, ...data };
      localStorage.setItem('pcm_user', JSON.stringify(updatedUser));
      return { user: updatedUser };
    });
  },
}));

// ==================== ROLE PERMISSIONS ====================

export interface RolePermissions {
  label: string;
  modules: string[];
}

// Lista COMPLETA de todos los módulos disponibles en la app
const ALL_MODULES = [
  'dashboard',
  'business-case',
  'cronograma',
  'cash-flow',
  'reports',
  'documents',
  'settings',
  'users',
  'audit-log',
  'tracking',
  'system-config',
];

export const ROLE_CONFIG: Record<UserRole, RolePermissions> = {
  administrador: {
    label: 'Administrador',
    modules: ALL_MODULES,
  },
  gerente: {
    label: 'Gerente',
    modules: ALL_MODULES,
  },
  director_proyectos: {
    label: 'Director de Proyectos',
    modules: ['dashboard', 'business-case', 'cronograma', 'cash-flow', 'reports', 'documents', 'tracking'],
  },
  director: {
    label: 'Director',
    modules: ['dashboard', 'business-case', 'cronograma', 'cash-flow', 'reports', 'documents', 'tracking'],
  },
  controller: {
    label: 'Controller',
    modules: ['dashboard', 'business-case', 'cronograma', 'cash-flow', 'reports', 'documents', 'tracking'],
  },
  ingeniero_residente: {
    label: 'Ingeniero Residente',
    modules: ['dashboard', 'cronograma', 'documents', 'tracking'],
  },
  visitante: {
    label: 'Visitante',
    modules: ['dashboard'],
  },
};

/**
 * Control de acceso por rol.
 * administrador y gerente tienen acceso total.
 */
export function hasAccess(role: UserRole, module: string): boolean {
  if (role === 'administrador' || role === 'gerente') return true;
  const modules = ROLE_CONFIG[role]?.modules ?? [];
  return modules.includes(module);
}

/**
 * Control de acceso personalizado por usuario.
 * Prioridad: admin/gerente > module_features del admin > ROLE_CONFIG por defecto
 */
export function getUserModuleAccess(user: User | null, module: string): boolean {
  if (!user) return false;
  if (user.role === 'administrador' || user.role === 'gerente') return true;

  const mf = user.module_features;
  if (mf) {
    let parsed: Record<string, unknown> | null = null;
    if (typeof mf === 'string') {
      try { parsed = JSON.parse(mf); } catch { parsed = null; }
    } else if (typeof mf === 'object' && !Array.isArray(mf)) {
      parsed = mf as Record<string, unknown>;
    }
    if (parsed && Object.keys(parsed).length > 0) {
      return module in parsed;
    }
  }

  return ROLE_CONFIG[user.role]?.modules?.includes(module) ?? false;
}
