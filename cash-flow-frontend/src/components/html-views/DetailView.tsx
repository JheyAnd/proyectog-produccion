import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Cell
} from 'recharts';
import { formatCurrency, formatShortDate, formatPercentage } from '../utils/formatters';

interface DetailViewProps {
  data: any;
  projectName: string;
  onBack: () => void;
}

type TabType = 'all' | 'ingresos' | 'materiales' | 'mano de obra' | 'administrativos';

export default function DetailView({ data, projectName, onBack }: DetailViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<Record<string, number>>({});

  const { projectSummary, sheet, chartData, kpis } = useMemo(() => {
    if (!data || !projectName) return { projectSummary: null, sheet: null, chartData: [], kpis: null };

    const sp = data.summary.p.find((p: any) => p.n === projectName || p.n?.trim() === projectName);
    // Find detailed data in data.projects
    const projKey = Object.keys(data.projects || {}).find(k => k === projectName || k.includes(projectName) || projectName.includes(k));
    const sheet = projKey ? data.projects[projKey] : null;

    const dates = sheet ? sheet.d : data.summary.dates;
    const getRow = (label: string) => sheet?.r.find((r: any) => r.l.toLowerCase().includes(label));
    
    const iR = getRow('total ingresos');
    const eR = getRow('total egresos');
    const sR = getRow('saldo disponible');
    const matR = getRow('total material');
    const moR = getRow('total mano de obra');
    const admR = getRow('total admin');

    let cumAcum = 0;
    const cData = dates.map((d: string, i: number) => {
      const neto = sR ? sR.m[i] || 0 : (sp ? sp.m[i] || 0 : 0);
      cumAcum += neto;
      return {
        date: formatShortDate(d),
        ingresos: iR ? iR.m[i] || 0 : 0,
        egresos: eR ? -Math.abs(eR.m[i] || 0) : 0, // Make negative for chart
        neto,
        acumulado: cumAcum
      };
    });

    const kpis = {
      sal: sR ? sR.t : (sp ? sp.t : 0),
      ing: iR ? iR.t : 0,
      egr: Math.abs(eR ? eR.t : 0),
      mat: Math.abs(matR ? matR.t : 0),
      mo: Math.abs(moR ? moR.t : 0),
      adm: Math.abs(admR ? admR.t : 0)
    };

    return { projectSummary: sp, sheet, chartData: cData, kpis };
  }, [data, projectName]);

  if (!projectName) return null;

  const handleEditChange = (label: string, index: number, val: string) => {
    const num = parseFloat(val) || 0;
    setEdits(prev => ({ ...prev, [`${label}|${index}`]: num }));
  };

  const handleSave = () => {
    alert('✅ Cambios guardados (simulado). En una app real, aquí se llamaría al backend.');
    setEditMode(false);
    setEdits({});
  };

  const tableRows = useMemo(() => {
    if (!sheet) return [];
    
    // Filter rows based on tab
    let filtered = sheet.r;
    if (activeTab !== 'all') {
      filtered = sheet.r.filter((r: any) => {
        const l = r.l.toLowerCase();
        if (activeTab === 'ingresos') return l.includes('anticipo') || l.includes('corte') || l.includes('ingreso') || l.includes('aiu');
        if (activeTab === 'materiales') return !l.includes('ingreso') && !l.includes('mano') && !l.includes('admin') && !l.includes('saldo') && !l.includes('total egresos');
        if (activeTab === 'mano de obra') return l.includes('mano') || l.includes('oficial') || l.includes('ayudante');
        if (activeTab === 'administrativos') return l.includes('admin') || l.includes('arrend') || l.includes('poliza') || l.includes('viatico');
        return true;
      });
    }
    return filtered;
  }, [sheet, activeTab]);

  return (
    <div className="view active animate-fade-in flex flex-col h-full">
      <div className="shrink-0 mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-300 hover:text-primary-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
          ← Volver
        </button>
      </div>

      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm mb-4 overflow-hidden shrink-0">
        <div className="px-5 py-4 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
          <h2 className="text-xl font-bold text-steel-900 dark:text-white">{projectName}</h2>
          <div className="flex gap-3 mt-2 text-xs text-steel-500">
            {projectSummary?.c && <span className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 px-2 py-1 rounded">📋 {projectSummary.c}</span>}
            {chartData.length > 0 && <span className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 px-2 py-1 rounded">📅 {chartData[0]?.date} → {chartData[chartData.length-1]?.date}</span>}
          </div>
        </div>
        
        {kpis && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-0 border-b border-steel-200 dark:border-steel-700">
            <div className="p-4 border-r border-b lg:border-b-0 border-steel-200 dark:border-steel-700">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Saldo Neto</div>
              <div className={`text-lg font-bold ${kpis.sal >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{formatCurrency(kpis.sal)}</div>
            </div>
            <div className="p-4 border-r border-b lg:border-b-0 border-steel-200 dark:border-steel-700">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Total Ingresos</div>
              <div className="text-lg font-bold text-success-500">{formatCurrency(kpis.ing)}</div>
            </div>
            <div className="p-4 border-r border-b lg:border-b-0 md:border-r-0 lg:border-r border-steel-200 dark:border-steel-700">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Total Egresos</div>
              <div className="text-lg font-bold text-danger-500">{formatCurrency(kpis.egr)}</div>
            </div>
            <div className="p-4 border-r border-steel-200 dark:border-steel-700">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Margen Neto</div>
              <div className={`text-lg font-bold ${kpis.sal >= 0 ? 'text-success-500' : 'text-danger-500'}`}>{kpis.ing ? ((kpis.sal/kpis.ing)*100).toFixed(1)+'%' : '—'}</div>
            </div>
            <div className="p-4 border-r border-steel-200 dark:border-steel-700">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Materiales</div>
              <div className="text-lg font-bold text-accent-600">{formatCurrency(kpis.mat)}</div>
              <div className="text-[9px] text-steel-400">{kpis.ing ? ((kpis.mat/kpis.ing)*100).toFixed(0)+'%' : '0%'} de ing</div>
            </div>
            <div className="p-4">
              <div className="text-[10px] uppercase tracking-widest text-steel-500 font-bold mb-1">Mano Obra</div>
              <div className="text-lg font-bold text-accent-600">{formatCurrency(kpis.mo)}</div>
              <div className="text-[9px] text-steel-400">{kpis.ing ? ((kpis.mo/kpis.ing)*100).toFixed(0)+'%' : '0%'} de ing</div>
            </div>
          </div>
        )}

        <div className="h-64 p-4 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150,150,150,0.1)" />
              <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} />
              <YAxis yAxisId="left" tickFormatter={(val) => `$${(val/1000000).toFixed(0)}M`} tick={{fontSize: 10, fill: '#64748b'}} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend wrapperStyle={{fontSize: '11px'}} />
              <Bar yAxisId="left" dataKey="ingresos" name="Ingresos" fill="#3b82f6" radius={[2,2,0,0]} />
              <Bar yAxisId="left" dataKey="egresos" name="Egresos" fill="#ef4444" radius={[0,0,2,2]} />
              <Line yAxisId="left" type="monotone" dataKey="neto" name="Saldo Mensual" stroke="#f59e0b" strokeWidth={2} dot={{r: 2}} activeDot={{r: 4}} />
              <Line yAxisId="left" type="monotone" dataKey="acumulado" name="Acumulado" stroke="#8b5cf6" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 rounded-xl shadow-sm overflow-hidden flex flex-col flex-1 min-h-[400px]">
        <div className="px-5 py-3 border-b border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <span className="font-semibold text-steel-900 dark:text-white text-sm">📝 Detalle por Categoría</span>
          <div className="flex gap-2">
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${editMode ? 'bg-steel-200 dark:bg-steel-700 text-steel-800 dark:text-white' : 'bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 text-steel-600 dark:text-steel-300 hover:text-primary-600'}`}
            >
              {editMode ? '🔒 Salir' : '✏️ Editar'}
            </button>
            {editMode && (
              <button onClick={handleSave} className="bg-success-500 hover:bg-success-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shadow-sm">
                💾 Guardar
              </button>
            )}
          </div>
        </div>

        <div className="flex overflow-x-auto border-b border-steel-200 dark:border-steel-700 bg-steel-50/50 dark:bg-steel-900/30 shrink-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'ingresos', label: '💰 Ingresos' },
            { id: 'materiales', label: '🔧 Materiales' },
            { id: 'mano de obra', label: '👷 Mano de Obra' },
            { id: 'administrativos', label: '📋 Administrativos' }
          ].map(tab => (
            <button 
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`px-4 py-2.5 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${activeTab === tab.id ? 'border-primary-500 text-primary-600 dark:text-primary-400' : 'border-transparent text-steel-500 hover:text-steel-800 dark:hover:text-steel-300'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar relative bg-white dark:bg-steel-800">
          <table className="w-full text-xs whitespace-nowrap min-w-max border-collapse">
            <thead className="sticky top-0 z-[20] bg-steel-50 dark:bg-steel-900 border-b border-steel-200 dark:border-steel-700 shadow-sm text-steel-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="sticky left-0 z-[30] bg-steel-50 dark:bg-steel-900 px-4 py-3 text-left border-r border-steel-200 dark:border-steel-700 min-w-[200px]">Descripción</th>
                {sheet?.d.slice(0, 16).map((d: string, i: number) => (
                  <th key={i} className="px-3 py-3 text-right">{formatShortDate(d)}</th>
                ))}
                {sheet?.d.length > 16 && <th className="px-3 py-3 text-steel-400">+{sheet.d.length - 16}…</th>}
                <th className="sticky right-0 z-[30] bg-steel-100 dark:bg-steel-800 px-4 py-3 text-right font-bold border-l border-steel-200 dark:border-steel-700 shadow-[-2px_0_5px_rgba(0,0,0,0.05)]">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody className="text-steel-600 dark:text-steel-300">
              {tableRows.map((r: any, idx: number) => {
                const isSubTotal = r.l.toLowerCase().includes('total');
                return (
                  <tr key={idx} className={`border-b border-steel-100 dark:border-steel-800/50 hover:bg-steel-50 dark:hover:bg-steel-700/50 ${isSubTotal ? 'bg-steel-50/80 dark:bg-steel-800/80 font-bold' : ''}`}>
                    <td className={`sticky left-0 z-[10] px-4 py-2 border-r border-steel-100 dark:border-steel-800 bg-white dark:bg-steel-800 ${isSubTotal ? 'text-steel-900 dark:text-white bg-steel-50 dark:bg-steel-800' : 'text-steel-800 dark:text-steel-200'}`}>
                      {r.l}
                    </td>
                    {r.m.slice(0, 16).map((v: number, i: number) => {
                      if (editMode && !isSubTotal) {
                        const ev = edits[`${r.l}|${i}`] !== undefined ? edits[`${r.l}|${i}`] : v;
                        return (
                          <td key={i} className="px-1 py-1 text-right relative group">
                            <input 
                              type="number" 
                              value={ev}
                              onChange={(e) => handleEditChange(r.l, i, e.target.value)}
                              className="w-24 text-right bg-white dark:bg-steel-900 border border-steel-300 dark:border-steel-600 rounded px-1.5 py-1 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </td>
                        );
                      }
                      return (
                        <td key={i} className={`px-3 py-2 text-right font-mono ${v === 0 ? 'text-steel-300 dark:text-steel-600' : v > 0 ? 'text-success-500 dark:text-success-400' : 'text-danger-500 dark:text-danger-400'}`}>
                          {v === 0 ? '—' : formatCurrency(v)}
                        </td>
                      );
                    })}
                    {sheet?.d.length > 16 && <td className="px-3 py-2 text-steel-400 text-center">…</td>}
                    <td className={`sticky right-0 z-[10] px-4 py-2 text-right font-mono font-bold border-l border-steel-200 dark:border-steel-700 shadow-[-2px_0_5px_rgba(0,0,0,0.05)] ${isSubTotal ? 'bg-steel-100 dark:bg-steel-800 text-steel-900 dark:text-white' : 'bg-white dark:bg-steel-900'}`}>
                      <span className={r.t >= 0 ? 'text-success-600 dark:text-success-400' : 'text-danger-600 dark:text-danger-400'}>
                        {formatCurrency(r.t)}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {tableRows.length === 0 && (
                <tr><td colSpan={20} className="px-4 py-8 text-center text-steel-400">Sin datos para esta categoría.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
