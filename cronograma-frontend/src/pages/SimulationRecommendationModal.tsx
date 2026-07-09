import React, { useMemo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle, X, ChevronRight, Zap } from 'lucide-react';
import type { Activity } from '@/data/cronogramaData';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  cronograma: Activity[];
  projectProg: number;
  projectReal: number;
  onApplyRecommendation: (code: string, newReal: number) => void;
  activeMode: 'en_vivo' | 'simulaciones';
}

export function SimulationRecommendationModal({
  isOpen,
  onClose,
  cronograma,
  projectProg,
  projectReal,
  onApplyRecommendation,
  activeMode
}: Props) {
  const gap = Number((projectProg - projectReal).toFixed(2));

  // Extraer hojas (actividades finales) y calcular impacto
  const recommendations = useMemo(() => {
    const leaves: (Activity & { impactoPotencial: number; missingToProg: number })[] = [];
    
    const traverse = (acts: Activity[]) => {
      acts.forEach(act => {
        if (act.children && act.children.length > 0) {
          traverse(act.children);
        } else {
          // Es hoja
          if (act.avanceReal < 100 && act.avanceReal < act.avanceProg) {
            const missingToProg = act.avanceProg - act.avanceReal;
            const impactoPotencial = missingToProg * act.peso; // peso ya es un ratio (ej. 0.05)
            if (impactoPotencial > 0.001) {
              leaves.push({ ...act, impactoPotencial, missingToProg });
            }
          }
        }
      });
    };
    
    traverse(cronograma);
    
    // Sort por mayor impacto potencial
    return leaves.sort((a, b) => b.impactoPotencial - a.impactoPotencial).slice(0, 10);
  }, [cronograma]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-steel-900/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-steel-200 dark:border-steel-700 flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-steel-200 dark:border-steel-700 flex justify-between items-center bg-gradient-to-r from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-800/50 rounded-xl">
              <TrendingUp className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-steel-900 dark:text-white">Análisis de Desviación</h2>
              <p className="text-sm text-steel-500 dark:text-steel-400">Recomendaciones para alcanzar el objetivo proyectado</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-steel-400 hover:text-steel-600 dark:hover:text-steel-200 transition bg-white dark:bg-steel-700 rounded-lg shadow-sm">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Header Stats */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="p-4 rounded-xl border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
              <p className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-1 uppercase tracking-wider">Avance Proyectado</p>
              <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{projectProg}%</p>
            </div>
            <div className="p-4 rounded-xl border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
              <p className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-1 uppercase tracking-wider">Avance Real</p>
              <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{projectReal}%</p>
            </div>
            <div className={`p-4 rounded-xl border ${gap > 0 ? 'border-red-200 bg-red-50 dark:border-red-900/30 dark:bg-red-900/10' : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/30 dark:bg-emerald-900/10'}`}>
              <p className="text-xs font-bold text-steel-500 dark:text-steel-400 mb-1 uppercase tracking-wider">Brecha (Desviación)</p>
              <p className={`text-3xl font-black ${gap > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                {gap > 0 ? `-${gap}%` : `+${Math.abs(gap)}%`}
              </p>
            </div>
          </div>

          {gap <= 0 ? (
            <div className="p-8 text-center bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-300 mb-2">¡Excelente Trabajo!</h3>
              <p className="text-emerald-600 dark:text-emerald-400">El avance real supera o iguala la proyección esperada. No hay brecha que recuperar.</p>
            </div>
          ) : (
            <div>
              <h3 className="text-sm font-bold text-steel-800 dark:text-steel-200 mb-4 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                TOP ACTIVIDADES CON RETRASO PARA CERRAR LA BRECHA
              </h3>
              
              {activeMode !== 'simulaciones' && (
                <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg flex items-start gap-3">
                  <Zap className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    Estás en el modo principal. Si aplicas estas sugerencias, se <strong>iniciará automáticamente una nueva Simulación</strong> para que veas el impacto sin afectar los datos reales.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {recommendations.length > 0 ? recommendations.map((act, index) => (
                  <div key={act.code} className="p-4 rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 hover:shadow-md transition flex items-center gap-4 group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold px-2 py-0.5 bg-steel-100 dark:bg-steel-700 text-steel-600 dark:text-steel-300 rounded-full">{act.code}</span>
                        <h4 className="font-bold text-steel-800 dark:text-steel-100 truncate">{act.name}</h4>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-steel-500 dark:text-steel-400">
                        <span><strong>Peso:</strong> {act.peso}%</span>
                        <span><strong>Avance Actual:</strong> {act.avanceReal}%</span>
                        <span><strong>Esperado:</strong> {act.avanceProg}%</span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Impacto Global</p>
                      <p className="text-lg font-black text-steel-800 dark:text-steel-100">+{act.impactoPotencial.toFixed(2)}%</p>
                    </div>

                    <div className="shrink-0 pl-4 border-l border-steel-200 dark:border-steel-700">
                      <button
                        onClick={() => {
                          onApplyRecommendation(act.code, act.avanceProg);
                          onClose();
                        }}
                        className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 dark:text-orange-400 rounded-lg text-sm font-bold transition flex items-center gap-2"
                      >
                        Simular
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className="p-8 text-center bg-steel-50 dark:bg-steel-800/50 border border-steel-200 dark:border-steel-700 rounded-xl">
                    <p className="text-steel-500 dark:text-steel-400">No se encontraron actividades hoja retrasadas. Revisa las fechas de inicio.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
