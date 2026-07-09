import React, { useMemo } from 'react';
import { formatCurrency, formatShortDate } from '../utils/formatters';

interface SummaryViewProps {
  data: any;
  onProjectClick: (projectName: string) => void;
  yearFilter: string;
  setYearFilter: (year: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
}

export default function SummaryView({ data, onProjectClick, yearFilter, setYearFilter, searchQuery, setSearchQuery }: SummaryViewProps) {
  
  const { filteredDates, filteredIndices, rows } = useMemo(() => {
    if (!data || !data.summary) return { filteredDates: [], filteredIndices: [], rows: [] };
    const dates = data.summary.dates;
    
    let fDates = dates;
    let fIdx = dates.map((_: any, i: number) => i);

    if (yearFilter !== 'all') {
      fIdx = dates.map((d: string, i: number) => d.startsWith(yearFilter) ? i : -1).filter((i: number) => i !== -1);
      fDates = fIdx.map((i: number) => dates[i]);
    }

    const q = searchQuery.toLowerCase();
    const fRows = data.summary.p.filter((p: any) => !q || (p.n || '').toLowerCase().includes(q));

    return { filteredDates: fDates, filteredIndices: fIdx, rows: fRows };
  }, [data, yearFilter, searchQuery]);

  return (
    <div className="view active animate-fade-in">
      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-140px)]">
        
        {/* Header */}
        <div className="px-5 py-3 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">📋 RESUMEN — Flujo de Caja Neto por Proyecto</span>
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="absolute left-2.5 top-1.5 text-steel-400">🔍</span>
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-lg text-xs w-48 focus:outline-none focus:border-primary-500"
              />
            </div>
            {filteredDates.length > 0 && (
              <span className="text-xs text-steel-500 dark:text-steel-400">
                {yearFilter === 'all' ? 'Portafolio completo' : `Año ${yearFilter}`} · {filteredDates[0]} → {filteredDates[filteredDates.length-1]}
              </span>
            )}
            <div className="flex gap-1 ml-auto md:ml-0">
              <button onClick={() => setYearFilter('all')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-steel-800 text-steel-600 dark:text-steel-300 border border-steel-200 dark:border-steel-700'}`}>Todo</button>
              <button onClick={() => setYearFilter('2026')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === '2026' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-steel-800 text-steel-600 dark:text-steel-300 border border-steel-200 dark:border-steel-700'}`}>2026</button>
              <button onClick={() => setYearFilter('2027')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === '2027' ? 'bg-primary-600 text-white' : 'bg-white dark:bg-steel-800 text-steel-600 dark:text-steel-300 border border-steel-200 dark:border-steel-700'}`}>2027</button>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="flex-1 overflow-auto bg-white dark:bg-steel-800 relative custom-scrollbar">
          <div className="text-right text-[10px] text-steel-500 p-1 sticky left-0 right-0 top-0 bg-white/90 dark:bg-steel-800/90 z-[20] backdrop-blur-sm border-b border-steel-100 dark:border-steel-700/50">
            ↔ Usa la barra inferior para deslizar y ver más meses
          </div>
          <table className="w-full text-xs whitespace-nowrap min-w-max border-collapse">
            <thead className="sticky top-[24px] z-[30] bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700 shadow-sm text-steel-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="sticky left-0 z-[40] bg-steel-50 dark:bg-steel-900 px-4 py-3 text-left border-r border-steel-200 dark:border-steel-700">Proyecto</th>
                <th className="sticky left-[200px] z-[40] bg-steel-50 dark:bg-steel-900 px-3 py-3 text-left border-r border-steel-200 dark:border-steel-700">Código</th>
                {filteredDates.map((d: string, i: number) => (
                  <th key={i} className="px-3 py-3 text-right">{formatShortDate(d)}</th>
                ))}
                <th className="sticky right-0 z-[40] bg-steel-100 dark:bg-steel-800 px-4 py-3 text-right font-bold border-l border-steel-200 dark:border-steel-700 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                  TOTAL {yearFilter !== 'all' ? yearFilter : ''}
                </th>
              </tr>
            </thead>
            <tbody className="text-steel-600 dark:text-steel-300">
              {rows.map((p: any, idx: number) => {
                const isTotal = p.n === 'TOTAL FLUJO DE CAJA RESUMEN';
                const fVals = filteredIndices.map((i: number) => p.m[i] || 0);
                const fTot = fVals.reduce((a: number, b: number) => a + b, 0);
                const displayTot = yearFilter === 'all' ? p.t : fTot;

                return (
                  <tr 
                    key={idx} 
                    onClick={() => !isTotal && onProjectClick(p.n)}
                    className={`border-b border-steel-100 dark:border-steel-800/50 transition-colors ${isTotal ? 'bg-rose-50 dark:bg-rose-900/10 font-bold' : 'hover:bg-steel-50 dark:hover:bg-steel-700/50 cursor-pointer group'}`}
                  >
                    <td className={`sticky left-0 z-[20] px-4 py-2 border-r border-steel-100 dark:border-steel-800 transition-colors ${isTotal ? 'bg-rose-50 dark:bg-rose-900/10 text-rose-700 dark:text-rose-400' : 'bg-white dark:bg-steel-800 group-hover:bg-steel-50 dark:group-hover:bg-steel-700/50 text-steel-900 dark:text-white font-medium'}`}>
                      <div className="flex items-center gap-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${isTotal ? 'bg-yellow-500' : displayTot >= 0 ? 'bg-success-500' : 'bg-danger-500'}`}></span>
                        {p.n}
                      </div>
                    </td>
                    <td className={`sticky left-[200px] z-[20] px-3 py-2 border-r border-steel-100 dark:border-steel-800 transition-colors font-mono ${isTotal ? 'bg-rose-50 dark:bg-rose-900/10' : 'bg-white dark:bg-steel-800 group-hover:bg-steel-50 dark:group-hover:bg-steel-700/50 text-steel-400'}`}>
                      {p.c || '—'}
                    </td>
                    {fVals.map((v: number, i: number) => (
                      <td key={i} className={`px-3 py-2 text-right font-mono ${v === 0 ? 'text-steel-300 dark:text-steel-600' : v > 0 ? 'text-success-500 dark:text-success-400' : 'text-danger-500 dark:text-danger-400'}`}>
                        {v === 0 ? '—' : formatCurrency(v)}
                      </td>
                    ))}
                    <td className={`sticky right-0 z-[20] px-4 py-2 text-right font-mono border-l border-steel-200 dark:border-steel-700 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] ${isTotal ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 font-bold' : 'bg-steel-50 dark:bg-steel-900 text-steel-900 dark:text-white font-bold'}`}>
                      <span className={displayTot >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}>
                        {formatCurrency(displayTot)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
