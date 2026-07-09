import React, { useMemo } from 'react';
import { formatCurrency, formatShortDate } from '../utils/formatters';

interface CorteViewProps {
  data: any;
  onProjectClick: (projectName: string) => void;
  corteMonth: string;
  setCorteMonth: (month: string) => void;
}

export default function CorteView({ data, onProjectClick, corteMonth, setCorteMonth }: CorteViewProps) {
  
  const { dates, rows, totals } = useMemo(() => {
    if (!data || !data.summary || !data.summary.dates) return { dates: [], rows: [], totals: { ing: 0, egr: 0, sal: 0 } };
    
    const allDates = data.summary.dates;
    // Set default corteMonth to last date if not set
    if (!corteMonth && allDates.length > 0) {
      setTimeout(() => setCorteMonth(allDates[allDates.length - 1]), 0);
    }
    
    const currentMonth = corteMonth || allDates[allDates.length - 1];
    const cutIdx = allDates.indexOf(currentMonth);
    if (cutIdx === -1) return { dates: allDates, rows: [], totals: { ing: 0, egr: 0, sal: 0 } };

    const projs = data.summary.p.filter((p: any) => p.n !== 'TOTAL FLUJO DE CAJA RESUMEN');
    
    let gIng = 0, gEgr = 0, gSal = 0;
    
    const mappedRows = projs.map((p: any) => {
      let ing = 0, egr = 0, sal = 0;
      for (let i = 0; i <= cutIdx; i++) {
        const val = p.m[i] || 0;
        sal += val;
        if (val > 0) ing += val;
        else egr += val;
      }
      
      // Approximation of avance for the UI (random or calculated based on full total)
      // Since we don't have total budget in mock data easily, we leave it blank or approximate
      const avance = p.t !== 0 ? Math.min(100, Math.abs((sal / p.t) * 100)).toFixed(0) : 0;
      
      if (sal !== 0 || ing !== 0 || egr !== 0) {
        gIng += ing;
        gEgr += egr;
        gSal += sal;
      }

      return {
        ...p,
        ing, egr, sal,
        mg: ing > 0 ? ((sal / ing) * 100).toFixed(1) : null,
        avance
      };
    }).filter((p: any) => p.ing !== 0 || p.egr !== 0);

    return { 
      dates: allDates, 
      rows: mappedRows.sort((a: any, b: any) => b.sal - a.sal),
      totals: { ing: gIng, egr: gEgr, sal: gSal }
    };
  }, [data, corteMonth]);

  return (
    <div className="view active animate-fade-in">
      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">✂️ Corte a Fecha — Estado Acumulado por Proyecto</span>
          <div className="flex items-center gap-3">
            <label className="text-xs text-steel-500">Corte hasta:</label>
            <select 
              value={corteMonth}
              onChange={(e) => setCorteMonth(e.target.value)}
              className="bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 text-steel-900 dark:text-white px-3 py-1.5 rounded-lg text-xs outline-none cursor-pointer"
            >
              <option value="">Seleccionar mes...</option>
              {dates.map((d: string) => (
                <option key={d} value={d}>{formatShortDate(d)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-3.5 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">📊 Indicadores Acumulados al Corte</span>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4 bg-white dark:bg-steel-800">
          <div className="border border-steel-200 dark:border-steel-700 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Ingresos Acum.</div>
            <div className="text-2xl font-bold text-success-500">{formatCurrency(totals.ing)}</div>
          </div>
          <div className="border border-steel-200 dark:border-steel-700 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Egresos Acum.</div>
            <div className="text-2xl font-bold text-danger-500">{formatCurrency(totals.egr)}</div>
          </div>
          <div className="border border-steel-200 dark:border-steel-700 rounded-xl p-4">
            <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Saldo Neto Acum.</div>
            <div className={`text-2xl font-bold ${totals.sal >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(totals.sal)}</div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-340px)]">
        <div className="px-5 py-3.5 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex items-center justify-between shrink-0">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">🏢 Proyectos — Estado al Corte</span>
          <span className="text-xs text-steel-500">Clic en fila → detalle del proyecto</span>
        </div>
        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-xs whitespace-nowrap min-w-max border-collapse text-left">
            <thead className="sticky top-0 z-[10] bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700 text-steel-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3 min-w-[220px]">Proyecto</th>
                <th className="px-3 py-3">Código</th>
                <th className="px-3 py-3 text-right">Ingresos Acum.</th>
                <th className="px-3 py-3 text-right">Egresos Acum.</th>
                <th className="px-3 py-3 text-right">Saldo Acum.</th>
                <th className="px-3 py-3 text-right">Margen %</th>
                <th className="px-3 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="text-steel-600 dark:text-steel-300">
              {rows.map((p: any, idx: number) => (
                <tr key={idx} onClick={() => onProjectClick(p.n)} className="border-b border-steel-100 dark:border-steel-800/50 hover:bg-steel-50 dark:hover:bg-steel-700/50 cursor-pointer group transition-colors">
                  <td className="px-4 py-3 text-steel-900 dark:text-white font-medium">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${p.sal >= 0 ? 'bg-success-500' : 'bg-danger-500'}`}></span>
                      {p.n}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-steel-400 font-mono">{p.c || '—'}</td>
                  <td className="px-3 py-3 text-right text-success-500 font-mono">{formatCurrency(p.ing)}</td>
                  <td className="px-3 py-3 text-right text-danger-500 font-mono">{formatCurrency(p.egr)}</td>
                  <td className={`px-3 py-3 text-right font-mono font-bold ${p.sal >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}`}>
                    {formatCurrency(p.sal)}
                  </td>
                  <td className={`px-3 py-3 text-right font-mono ${p.mg !== null ? (parseFloat(p.mg) >= 0 ? 'text-success-500' : 'text-danger-500') : 'text-steel-400'}`}>
                    {p.mg !== null ? `${p.mg}%` : '—'}
                  </td>
                  <td className="px-3 py-3 text-center">{p.sal > 0 ? '🟢' : p.sal === 0 ? '⚪' : '🔴'}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-steel-400">Sin datos para este corte.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
