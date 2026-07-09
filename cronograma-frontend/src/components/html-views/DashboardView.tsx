import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell
} from 'recharts';
import { formatCurrency, formatShortDate } from '../utils/formatters';

interface DashboardViewProps {
  data: any;
  onProjectClick: (projectName: string) => void;
  yearFilter: string;
  setYearFilter: (year: string) => void;
}

export default function DashboardView({ data, onProjectClick, yearFilter, setYearFilter }: DashboardViewProps) {
  
  // Compute global chart data
  const globalChartData = useMemo(() => {
    if (!data || !data.summary || !data.summary.dates) return [];
    const dates = data.summary.dates;
    const totalRow = data.summary.p.find((p: any) => p.n === 'TOTAL FLUJO DE CAJA RESUMEN');
    if (!totalRow) return [];

    let filteredDates = dates;
    let filteredVals = totalRow.m;

    if (yearFilter !== 'all') {
      const idxs = dates.map((d: string, i: number) => d.startsWith(yearFilter) ? i : -1).filter((i: number) => i !== -1);
      filteredDates = idxs.map((i: number) => dates[i]);
      filteredVals = idxs.map((i: number) => totalRow.m[i]);
    }

    let cum = 0;
    return filteredDates.map((d: string, i: number) => {
      cum += filteredVals[i] || 0;
      return {
        date: formatShortDate(d),
        neto: filteredVals[i] || 0,
        acumulado: cum
      };
    });
  }, [data, yearFilter]);

  // Compute top projects data
  const topProjectsData = useMemo(() => {
    if (!data || !data.summary) return [];
    const projs = data.summary.p.filter((p: any) => p.n !== 'TOTAL FLUJO DE CAJA RESUMEN');
    
    const mapped = projs.map((p: any) => {
      // Calculate totals based on yearFilter
      let sal = 0, ing = 0, egr = 0;
      if (yearFilter === 'all') {
        sal = p.t;
        // Approximation from mock data since we don't have detailed rows in summary
        ing = p.m.filter((v:number)=>v>0).reduce((a:number,b:number)=>a+b,0);
        egr = p.m.filter((v:number)=>v<0).reduce((a:number,b:number)=>a+b,0);
      } else {
        const idxs = data.summary.dates.map((d: string, i: number) => d.startsWith(yearFilter) ? i : -1).filter((i: number) => i !== -1);
        sal = idxs.reduce((sum: number, i: number) => sum + (p.m[i] || 0), 0);
        ing = idxs.reduce((sum: number, i: number) => sum + ((p.m[i] > 0) ? p.m[i] : 0), 0);
        egr = idxs.reduce((sum: number, i: number) => sum + ((p.m[i] < 0) ? p.m[i] : 0), 0);
      }
      return { ...p, sal, ing, egr, mg: ing > 0 ? ((sal / ing) * 100).toFixed(1) : null };
    });

    return mapped.sort((a: any, b: any) => b.sal - a.sal);
  }, [data, yearFilter]);

  const top12 = topProjectsData.slice(0, 12);

  // Compute global KPIs
  const globalSal = globalChartData.reduce((sum: number, item: any) => sum + item.neto, 0);
  const globalIng = topProjectsData.reduce((sum: number, p: any) => sum + p.ing, 0);
  const globalEgr = Math.abs(topProjectsData.reduce((sum: number, p: any) => sum + p.egr, 0));

  return (
    <div className="view active animate-fade-in">
      
      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Saldo Neto Periodo</div>
          <div className={`text-2xl font-bold ${globalSal >= 0 ? 'text-success-500' : 'text-danger-500'}`}>
            {formatCurrency(globalSal)}
          </div>
        </div>
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Ingresos Totales</div>
          <div className="text-2xl font-bold text-success-500">
            {formatCurrency(globalIng)}
          </div>
        </div>
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Egresos Totales</div>
          <div className="text-2xl font-bold text-danger-500">
            {formatCurrency(globalEgr)}
          </div>
        </div>
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
          <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-2">Proyectos Activos</div>
          <div className="text-2xl font-bold text-primary-600">
            {topProjectsData.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        {/* Global Chart */}
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex items-center justify-between">
            <span className="font-semibold text-steel-900 dark:text-white text-sm">📈 Flujo Caja Neto Total — Mensual</span>
            <div className="flex gap-1">
              <button onClick={() => setYearFilter('all')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === 'all' ? 'bg-primary-600 text-white' : 'bg-white text-steel-600 border border-steel-200'}`}>Todo</button>
              <button onClick={() => setYearFilter('2026')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === '2026' ? 'bg-primary-600 text-white' : 'bg-white text-steel-600 border border-steel-200'}`}>2026</button>
              <button onClick={() => setYearFilter('2027')} className={`px-2 py-1 rounded text-xs font-medium ${yearFilter === '2027' ? 'bg-primary-600 text-white' : 'bg-white text-steel-600 border border-steel-200'}`}>2027</button>
            </div>
          </div>
          <div className="h-64 w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={globalChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
                <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis yAxisId="left" tickFormatter={(val: any) => `$${(val/1000000).toFixed(0)}M`} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis yAxisId="right" orientation="right" tickFormatter={(val: any) => `$${(val/1000000).toFixed(0)}M`} tick={{fontSize: 10, fill: '#b45309'}} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend wrapperStyle={{fontSize: '11px'}} />
                <Bar yAxisId="left" dataKey="neto" name="Neto Mensual" radius={[2,2,0,0]}>
                  {globalChartData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.neto >= 0 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
                <Line yAxisId="right" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#10b981" strokeWidth={2} dot={{r: 2}} activeDot={{r: 4}} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 12 Bar Chart */}
        <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-3 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex items-center justify-between">
            <span className="font-semibold text-steel-900 dark:text-white text-sm">🏢 Saldo por Proyecto (Top 12)</span>
          </div>
          <div className="h-64 w-full p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top12} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(150,150,150,0.1)" />
                <XAxis type="number" tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} tick={{fontSize: 10, fill: '#64748b'}} />
                <YAxis dataKey="n" type="category" width={100} tick={{fontSize: 9, fill: '#64748b'}} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="sal" name="Saldo" radius={[0,2,2,0]}>
                  {top12.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.sal >= 0 ? '#60A5FA' : '#F87171'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Projects Table */}
      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex items-center justify-between">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">🏆 Portafolio de Proyectos — Resumen Ejecutivo</span>
          <span className="text-xs text-steel-500">Clic en fila para ver detalle completo</span>
        </div>
        <div className="overflow-x-auto max-h-[350px]">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="sticky top-0 bg-steel-50 dark:bg-steel-900 z-10 text-[10px] uppercase text-steel-500 border-b border-steel-200 dark:border-steel-700">
              <tr>
                <th className="px-4 py-3 min-w-[200px]">Proyecto</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3 text-right">Saldo Disponible</th>
                <th className="px-4 py-3 text-right">Ingresos Totales</th>
                <th className="px-4 py-3 text-right">Egresos Totales</th>
                <th className="px-4 py-3 text-right">Margen %</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody>
              {topProjectsData.map((p: any, idx: number) => (
                <tr key={idx} onClick={() => onProjectClick(p.n)} className="border-b border-steel-100 dark:border-steel-800/50 hover:bg-steel-50 dark:hover:bg-steel-800/50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-steel-900 dark:text-white flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.sal >= 0 ? 'bg-success-500' : 'bg-danger-500'}`}></span>
                    {p.n}
                  </td>
                  <td className="px-4 py-3 text-steel-500 text-xs font-mono">{p.c || '—'}</td>
                  <td className={`px-4 py-3 text-right font-medium ${p.sal >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(p.sal)}</td>
                  <td className="px-4 py-3 text-right text-success-500">{formatCurrency(p.ing)}</td>
                  <td className="px-4 py-3 text-right text-danger-500">{formatCurrency(p.egr)}</td>
                  <td className={`px-4 py-3 text-right font-mono ${p.mg ? (parseFloat(p.mg) >= 0 ? 'text-success-500' : 'text-danger-500') : 'text-steel-400'}`}>
                    {p.mg !== null ? `${p.mg}%` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">{p.sal > 0 ? '🟢' : p.sal === 0 ? '⚪' : '🔴'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
