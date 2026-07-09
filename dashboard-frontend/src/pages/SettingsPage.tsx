import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Settings, Moon, Sun, Palette, Sparkles, Users, History } from 'lucide-react';
import clsx from 'clsx';
import { useThemeStore } from '@/stores/themeStore';
import { useAuthStore } from '@/stores/authStore';
import ActivityLogSection from '@/components/settings/ActivityLogSection';
import UserManagementSection from '@/components/settings/UserManagementSection';
import ErrorBoundary from '@/components/common/ErrorBoundary';

type SettingsTab = 'users' | 'activity';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('users');
  const { mode, toggleMode } = useThemeStore();
  const user = useAuthStore((s) => s.user);

  // Leer tab desde sessionStorage al montar
  useEffect(() => {
    const savedTab = sessionStorage.getItem('settings_tab');
    if (savedTab === 'users' || savedTab === 'activity') {
      setActiveTab(savedTab as SettingsTab);
      sessionStorage.removeItem('settings_tab');
    }
  }, []);

  // Solo administrador y gerente tienen acceso a la configuración
  // Override para Rosmel (testing)
  const userRole = user?.email === 'rosmel.pernia@pcmejia.com.co' ? 'administrador' : user?.role;
  const isAllowed = userRole === 'administrador' || userRole === 'gerente';

  if (!isAllowed) {
    return <Navigate to="/projects" replace />;
  }

  const tabs = [
    { id: 'users', label: 'Administración', icon: Users },
    { id: 'activity', label: 'Registro de Actividades', icon: History },
  ] as const;
  
  const isActivityTab = activeTab === 'activity';
  const containerClass = clsx("mx-auto transition-all duration-300", isActivityTab ? "max-w-[98%]" : "max-w-5xl");

  return (
    <div className="min-h-screen bg-gradient-to-br from-steel-50 to-steel-100 dark:from-steel-950 dark:to-steel-900 p-6">
      {/* Header */}
      <div className={clsx(containerClass, "mb-8")}>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-primary-600 to-primary-700 shadow-lg">
            <Settings className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-steel-900 dark:text-white">Configuración</h1>
            <p className="text-sm text-steel-600 dark:text-steel-400">Personaliza tu experiencia en PC Mejía Ingeniería</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={clsx(containerClass, "mb-8")}>
        <div className="grid grid-cols-2 gap-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SettingsTab)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200',
                  isActive
                    ? 'bg-white dark:bg-steel-800 text-primary-600 shadow-md'
                    : 'bg-white/50 dark:bg-steel-800/50 text-steel-600 dark:text-steel-400 hover:bg-white dark:hover:bg-steel-800'
                )}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className={containerClass}>

        {/* Administración Tab */}
        {activeTab === 'users' && (
          <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-md border border-steel-200 dark:border-steel-700 p-8">
            <ErrorBoundary fallbackTitle="Error en Gestión de Usuarios">
              <UserManagementSection />
            </ErrorBoundary>
          </div>
        )}

        {/* Registro de Actividades Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-md border border-steel-200 dark:border-steel-700 p-8">
            <ErrorBoundary fallbackTitle="Error en Registro de Actividades">
              <ActivityLogSection />
            </ErrorBoundary>
          </div>
        )}
      </div>
    </div>
  );
}
