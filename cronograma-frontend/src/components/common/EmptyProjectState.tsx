import React from 'react';
import { 
  HardHat, 
  Plus, 
  ArrowRight, 
  LayoutDashboard, 
  Briefcase, 
  TrendingUp, 
  Calendar, 
  ClipboardCheck, 
  FileText,
  Clock
} from 'lucide-react';
import clsx from 'clsx';

interface EmptyProjectStateProps {
  module: string;
  projectName?: string;
  projectCode?: string;
  clientName?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  icon?: React.ElementType;
}

/**
 * EmptyProjectState: Premium empty state component for unconfigured projects.
 * Designed to WOW the user and provide clear context.
 */
export default function EmptyProjectState({
  module,
  projectName = 'Proyecto sin Nombre',
  projectCode = 'ID-PENDIENTE',
  clientName = 'Cliente no asignado',
  description = 'Este módulo aún no contiene información registrada en la base de datos.',
  actionLabel,
  onAction,
  className,
  icon: Icon = HardHat,
}: EmptyProjectStateProps) {
  
  const modules = [
    { name: 'Dashboard de Control', icon: LayoutDashboard },
    { name: 'Caso de Negocio (BAC)', icon: Briefcase },
    { name: 'Flujo de Caja Mensual', icon: TrendingUp },
    { name: 'Cronograma de Obra', icon: Calendar },
    { name: 'Seguimiento Financiero', icon: ClipboardCheck },
    { name: 'Reportes Ejecutivos', icon: FileText },
  ];

  return (
    <div className={clsx('flex flex-col items-center justify-center py-20 px-6 min-h-[70vh] animate-in fade-in duration-700', className)}>
      
      {/* Premium Glass Card */}
      <div className="relative w-full max-w-2xl bg-white dark:bg-steel-900 rounded-2xl border border-steel-200 dark:border-steel-800 shadow-2xl overflow-hidden">
        
        {/* Animated Background Element */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-primary-600 to-primary-700"></div>
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-100/50 dark:bg-primary-900/20 rounded-full blur-3xl"></div>
        
        <div className="p-8 sm:p-12 text-center relative z-10">
          
          {/* Main Icon with Glow */}
          <div className="inline-flex items-center justify-center p-5 bg-primary-50 dark:bg-primary-950/30 rounded-2xl mb-8 shadow-inner border border-primary-100/50 dark:border-primary-900/30 group">
            <Icon className="h-14 w-14 text-primary-600 group-hover:scale-110 transition-transform duration-500" />
          </div>

          {/* Project Identity */}
          <div className="mb-8">
            <h2 className="text-2xl sm:text-3xl font-black text-steel-900 dark:text-white tracking-tight uppercase">
              {projectName}
            </h2>
            <div className="flex flex-wrap justify-center items-center gap-3 mt-3">
              <span className="px-3 py-1 bg-steel-100 dark:bg-steel-800 text-steel-600 dark:text-steel-400 text-xs font-bold rounded-md border border-steel-200 dark:border-steel-700">
                {projectCode}
              </span>
              <span className="text-steel-300 dark:text-steel-600">|</span>
              <span className="text-xs font-semibold text-steel-500 dark:text-steel-400">
                CLIENTE: <span className="text-steel-800 dark:text-steel-200">{clientName}</span>
              </span>
            </div>
          </div>

          {/* Status Message */}
          <div className="mb-8 p-4 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-800/30 rounded-xl">
            <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-500 font-bold text-sm tracking-widest uppercase mb-1">
              <Clock className="h-4 w-4" />
              Proyecto en Fase de Configuración
            </div>
            <p className="text-sm text-steel-600 dark:text-steel-400 font-medium">
              El módulo de <span className="text-primary-600 font-bold italic">{module}</span> está listo para recibir información.
            </p>
          </div>

          {/* Module Grid (The "Wow" factor) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-10 text-left">
            {modules.map((m, idx) => (
              <div 
                key={idx} 
                className={clsx(
                  "p-3 rounded-lg border transition-all duration-300 flex items-center gap-2",
                  m.name === module 
                    ? "bg-primary-50 dark:bg-primary-950/20 border-primary-200 dark:border-primary-800 ring-2 ring-primary-500/10" 
                    : "bg-steel-50/50 dark:bg-steel-800/30 border-steel-100 dark:border-steel-800 grayscale opacity-60"
                )}
              >
                <m.icon className={clsx("h-4 w-4", m.name === module ? "text-primary-600" : "text-steel-400")} />
                <span className={clsx("text-[10px] font-bold leading-tight", m.name === module ? "text-primary-700 dark:text-primary-300" : "text-steel-500")}>
                  {m.name}
                </span>
              </div>
            ))}
          </div>

          {/* Call to Action */}
          {actionLabel && onAction && (
            <button
              onClick={onAction}
              className="group relative inline-flex items-center justify-center gap-3 px-8 py-4 bg-primary-600 text-white font-black text-sm rounded-xl hover:bg-primary-700 transition-all shadow-xl hover:shadow-primary-600/30 hover:-translate-y-0.5 active:translate-y-0"
            >
              <Plus className="h-5 w-5" />
              {actionLabel.toUpperCase()}
              <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-1 transition-transform" />
            </button>
          )}

          <p className="mt-8 text-[10px] text-steel-400 font-medium italic">
            Consulte al administrador para cargar los datos base del proyecto.
          </p>
        </div>
      </div>
    </div>
  );
}
