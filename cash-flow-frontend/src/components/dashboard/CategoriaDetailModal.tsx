import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Calendar, Loader2, DollarSign, FileText } from 'lucide-react';
import clsx from 'clsx';
import { cashFlowV2API, type CellSummary } from '@/services/api/cashFlowV2';
import { formatMonthKey } from '@/data/excelCategoriasEgresos';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  categoriaId: string;
  categoriaNombre: string;
  mesesConDetalle: string[];
}

import { formatCOPFull as formatCOP } from '@/utils/formatNumbers';

export default function CategoriaDetailModal({
  open, onClose, projectId, categoriaId, categoriaNombre, mesesConDetalle
}: Props) {
  const [loading, setLoading] = useState(true);
  const [dataPorMes, setDataPorMes] = useState<CellSummary[]>([]);

  useEffect(() => {
    if (!open) return;
    
    let cancelled = false;
    setLoading(true);

    async function fetchData() {
      try {
        if (mesesConDetalle.length === 0) {
          if (!cancelled) setDataPorMes([]);
          return;
        }

        // Fetch details for all months concurrently
        const responses = await Promise.all(
          mesesConDetalle.map(mesKey => 
            cashFlowV2API.getCellDetails(projectId, categoriaId, mesKey, false)
          )
        );

        if (!cancelled) {
          // Sort responses chronologically
          const sorted = responses.sort((a, b) => a.mes_key.localeCompare(b.mes_key));
          // Filter out those with no details just in case
          setDataPorMes(sorted.filter(r => r.detalles && r.detalles.length > 0));
        }
      } catch (err) {
        console.error("Error fetching category details:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();

    return () => { cancelled = true; };
  }, [open, projectId, categoriaId, mesesConDetalle]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b dark:border-steel-700 bg-steel-50/50 dark:bg-steel-800/50 rounded-t-2xl">
          <div>
            <h2 className="text-lg font-bold text-steel-900 dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary-600" />
              Detalle Completo de Categoría
            </h2>
            <p className="text-sm text-steel-500 dark:text-steel-400 mt-1">
              {categoriaNombre}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-steel-500" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
              <p className="text-steel-500 dark:text-steel-400 text-sm animate-pulse">
                Cargando detalles...
              </p>
            </div>
          ) : dataPorMes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4 bg-steel-50 dark:bg-steel-800/50 rounded-xl border border-dashed border-steel-200 dark:border-steel-700">
              <div className="bg-steel-100 dark:bg-steel-800 p-3 rounded-full mb-3">
                <FileText className="h-6 w-6 text-steel-400" />
              </div>
              <p className="text-steel-600 dark:text-steel-300 font-medium">No hay detalles registrados</p>
              <p className="text-sm text-steel-500 dark:text-steel-400 mt-1">Esta categoría aún no tiene facturas o pagos vinculados en ningún mes.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {dataPorMes.map((mesData) => {
                // Filtramos los eliminados para ni siquiera mostrarlos
                const detallesActivos = mesData.detalles.filter(d => !d.is_deleted);
                // Calculamos el total localmente SOLO de los incluidos en el grafico
                const totalCalculado = detallesActivos
                  .filter(d => d.incluir_en_grafico !== false)
                  .reduce((sum, d) => sum + (Number(d.valor) || 0), 0);

                if (detallesActivos.length === 0) return null;

                return (
                  <div key={mesData.mes_key} className="border dark:border-steel-700 rounded-xl overflow-hidden bg-white dark:bg-steel-800">
                    <div className="flex items-center justify-between px-4 py-3 bg-steel-50 dark:bg-steel-800/80 border-b dark:border-steel-700">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary-600" />
                        <h3 className="font-bold text-steel-900 dark:text-white capitalize">
                          {formatMonthKey(mesData.mes_key)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 bg-primary-50 dark:bg-primary-900/20 px-3 py-1 rounded-full">
                        <span className="text-xs font-medium text-primary-700 dark:text-primary-400">Total Válido:</span>
                        <span className="text-sm font-bold text-primary-700 dark:text-primary-300 font-mono">
                          {formatCOP(totalCalculado)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="divide-y dark:divide-steel-700">
                      {detallesActivos.map((det) => {
                        const isExcluded = det.incluir_en_grafico === false;

                        return (
                          <div key={det.id} className={clsx("p-4 transition-colors", isExcluded ? "bg-red-50/50 dark:bg-red-900/10 opacity-75" : "hover:bg-steel-50/50 dark:hover:bg-steel-800/50")}>
                            <div className="flex flex-col sm:flex-row justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-bold bg-steel-100 text-steel-800 dark:bg-steel-700 dark:text-steel-200">
                                    Factura: {det.numero_factura || 'S/N'}
                                  </span>
                                  {det.numero_oc && (
                                    <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                      OC: {det.numero_oc}
                                    </span>
                                  )}
                                  {det.fecha_factura && (
                                    <span className="text-xs text-steel-500 flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {det.fecha_factura}
                                    </span>
                                  )}
                                  {isExcluded && (
                                    <span className="text-xs font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">
                                      Excluido de Suma
                                    </span>
                                  )}
                                </div>
                                
                                {det.proveedor && (
                                  <p className="text-sm font-medium text-steel-900 dark:text-steel-100 flex items-center gap-1.5">
                                    <span className="text-steel-400">Proveedor:</span>
                                    {det.proveedor}
                                  </p>
                                )}
                                
                                {det.nota && (
                                  <p className="text-sm text-steel-600 dark:text-steel-400 bg-steel-50 dark:bg-steel-900/50 p-2 rounded-lg border dark:border-steel-700">
                                    {det.nota}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-start sm:items-center">
                                <span className={clsx(
                                  "text-base font-bold font-mono px-3 py-1.5 rounded-lg border",
                                  isExcluded 
                                    ? "text-red-600/70 dark:text-red-400/70 line-through bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50" 
                                    : "text-steel-900 dark:text-white bg-steel-100 dark:bg-steel-700 border-transparent dark:border-steel-600"
                                )}>
                                  {formatCOP(det.valor)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
