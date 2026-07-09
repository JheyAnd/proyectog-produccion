import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, ComposedChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, ReferenceLine, Cell, Brush,
  PieChart, Pie
} from 'recharts';
import { Calendar, TrendingUp, TrendingDown, Building2, Trophy, BarChart2, List, Maximize2, X, AlertCircle, PieChart as PieChartIcon } from 'lucide-react';
import { dashboardApi } from '@/services/api/dashboard';

const formatMM = (value: number) => {
  const abs = Math.abs(value);
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)} MM`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)} M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(0)} k`;
  return `$${value}`;
};

const formatPercent = (ingresos: number, egresos: number) => {
  if (!ingresos || ingresos === 0) return '0.0%';
  const margin = ((ingresos - egresos) / ingresos) * 100;
  return `${margin.toFixed(1)}%`;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-steel-200 dark:border-steel-600 bg-white dark:bg-steel-800 shadow-lg p-3 text-xs min-w-[180px]">
      {label && <p className="font-semibold text-steel-700 dark:text-steel-200 mb-2">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={`entry-${i}`} className="flex justify-between gap-4 mb-1">
          <span style={{ color: entry.color || entry.payload?.fill || '#fff' }}>{entry.name}</span>
          <span className="font-bold text-steel-800 dark:text-steel-100">{formatMM(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

export default function GlobalCashFlowPage() {
  const navigate = useNavigate();
  const [filterYear, setFilterYear] = useState<'all' | '2026' | '2027'>('all');
  const [chartMode, setChartMode] = useState<'neto' | 'ing_eg'>('neto');
  const [isChartFullscreen, setIsChartFullscreen] = useState(false);
  const [companyFilter, setCompanyFilter] = useState<'todos' | 'PCM' | 'PCS' | 'CARSAN'>('todos');

  const { data, isLoading, error } = useQuery({
    queryKey: ['global-cash-flow'],
    queryFn: () => dashboardApi.getGlobalCashFlow(),
  });

  const { startIdx, endIdx, datesSlice, filteredMonthlyData } = useMemo(() => {
    if (!data?.monthlyData?.length) return { startIdx: 0, endIdx: 0, datesSlice: [], filteredMonthlyData: [] };
    
    let s = 0;
    let e = data.monthlyData.length - 1;
    
    if (filterYear === '2026') {
      const is2026 = (d: any) => d.periodo.includes('2026');
      s = data.monthlyData.findIndex(is2026);
      e = s !== -1 ? data.monthlyData.length - 1 - [...data.monthlyData].reverse().findIndex(is2026) : -1;
    } else if (filterYear === '2027') {
      const is2027 = (d: any) => d.periodo.includes('2027');
      s = data.monthlyData.findIndex(is2027);
      e = s !== -1 ? data.monthlyData.length - 1 - [...data.monthlyData].reverse().findIndex(is2027) : -1;
    }
    
    if (s === -1 || e === -1) {
      // Si no hay datos para el año, mostrar vacío
      return { startIdx: 0, endIdx: 0, datesSlice: [], filteredMonthlyData: [] };
    }

    const filtered = data.monthlyData.slice(s, e + 1);
    return { 
      startIdx: s, 
      endIdx: e, 
      datesSlice: filtered.map(d => d.periodo), 
      filteredMonthlyData: filtered 
    };
  }, [filterYear, data]);

  const mainChartData = useMemo(() => {
    return filteredMonthlyData.map(d => ({
      label: d.periodo,
      Neto: d.neto,
      NetoPos: d.neto >= 0 ? d.neto : null,
      NetoNeg: d.neto < 0 ? d.neto : null,
      Ingresos: d.ingreso,
      Egresos: -d.egreso
    }));
  }, [filteredMonthlyData]);

  const projects = useMemo(() => {
    const allProjects = data?.projects || [];
    if (companyFilter === 'todos') return allProjects;
    return allProjects.filter(p => p.company === companyFilter);
  }, [data, companyFilter]);

  const pieData = useMemo(() => {
    if (!data?.category_totals) return [];
    const totals = data.category_totals[companyFilter] || data.category_totals['todos'];
    if (!totals) return [];
    return [
      { name: 'Materiales', value: totals.materiales, color: '#3b82f6' },
      { name: 'Servicios', value: totals.servicios, color: '#8b5cf6' },
      { name: 'Administración', value: totals.administracion, color: '#10b981' },
      { name: 'Mano de Obra', value: totals.mano_obra, color: '#f59e0b' },
      { name: 'Intereses', value: totals.intereses, color: '#ef4444' },
    ].filter(item => item.value > 0).sort((a, b) => b.value - a.value);
  }, [data, companyFilter]);

  // Si está cargando
  if (isLoading) {
    return (
      <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6 flex items-center justify-center">
        <div className="text-steel-500 animate-pulse font-medium">Cargando Dashboard Global...</div>
      </div>
    );
  }

  // Si hay error
  if (error) {
    return (
      <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6 flex flex-col items-center justify-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">Error al cargar datos</h2>
        <p className="text-steel-500 text-sm">Hubo un problema al conectar con el servidor.</p>
      </div>
    );
  }

  // Empty state
  if (!data || data.projects.length === 0 || data.monthlyData.length === 0) {
    return (
      <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6">
        <div className="flex flex-col items-center justify-center h-[70vh] text-center max-w-md mx-auto">
          <div className="w-16 h-16 bg-steel-100 dark:bg-steel-800 rounded-full flex items-center justify-center mb-6">
            <BarChart2 size={32} className="text-steel-400" />
          </div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">No hay datos suficientes</h2>
          <p className="text-steel-500 text-sm">
            La base de datos está limpia. Crea nuevos proyectos y añade datos a sus flujos de caja para que el Dashboard Global consolide la información automáticamente.
          </p>
        </div>
      </div>
    );
  }

  // Mueve la destructuración DEPUÉS de los early returns, o usa variables con encadenamiento opcional
  const globalStats = data.globalStats;

  // Mejores proyectos según saldo neto
  const posProjects = projects.filter(p => p.net >= 0).length;
  const negProjects = projects.filter(p => p.net < 0).length;
  const bestProject = projects.length > 0 ? projects[0] : { name: '—', net: 0 };
  const top12 = projects.slice(0, 12);

  const kpiClass = "rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm p-5 flex flex-col gap-2 relative overflow-hidden";
  const yearBtnClass = (active: boolean) => 
    `px-3 py-1 text-xs rounded transition-colors font-medium ${active ? 'bg-primary-600 text-white' : 'bg-steel-100 dark:bg-steel-700 text-steel-600 dark:text-steel-300 hover:bg-steel-200 dark:hover:bg-steel-600'}`;

  const renderChart = (isFullscreen = false) => {
    const chartHeight = isFullscreen ? '100%' : 280;
    const bottomMargin = isFullscreen ? 20 : 4;

    return (
      <ResponsiveContainer width="100%" height={chartHeight}>
        {chartMode === 'neto' ? (
          <BarChart data={mainChartData} margin={{ top: 4, right: 16, left: 8, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatMM} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Bar dataKey="NetoPos" stackId="neto" name="Neto" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={isFullscreen ? 60 : 28} />
            <Bar dataKey="NetoNeg" stackId="neto" name="Neto" fill="#ef4444" radius={[0, 0, 3, 3]} maxBarSize={isFullscreen ? 60 : 28} />
            {isFullscreen && <Brush dataKey="label" height={30} stroke="#9ca3af" fill="transparent" />}
          </BarChart>
        ) : (
          <ComposedChart data={mainChartData} margin={{ top: 4, right: 16, left: 8, bottom: bottomMargin }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} opacity={0.2} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={formatMM} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign={isFullscreen ? 'top' : 'bottom'} />
            <ReferenceLine y={0} stroke="#9ca3af" strokeWidth={1} />
            <Bar dataKey="Ingresos" fill="#3b82f6" radius={[2, 2, 0, 0]} maxBarSize={isFullscreen ? 30 : 14} />
            <Bar dataKey="Egresos" fill="#f97316" radius={[2, 2, 0, 0]} maxBarSize={isFullscreen ? 30 : 14} />
            <Line dataKey="Neto" type="monotone" stroke="#6366f1" strokeWidth={2} dot={false} />
            {isFullscreen && <Brush dataKey="label" height={30} stroke="#9ca3af" fill="transparent" />}
          </ComposedChart>
        )}
      </ResponsiveContainer>
    );
  };

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6">
      
      {/* HEADER TIPO DASHBOARD */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-steel-200 dark:border-steel-800 gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary-600 dark:text-primary-500 tracking-tighter">PC <span className="text-steel-900 dark:text-white">·</span> Mejía</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-steel-300 dark:bg-steel-700"></div>
          <h1 className="text-sm font-semibold tracking-widest text-steel-500 dark:text-steel-400 uppercase">Dashboard Financiero de Proyectos</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="flex gap-1 bg-white dark:bg-steel-800 p-1.5 rounded-lg border border-steel-200 dark:border-steel-700 shadow-sm w-full sm:w-auto overflow-x-auto">
            <button onClick={() => setCompanyFilter('todos')} className={yearBtnClass(companyFilter === 'todos')}>Todas</button>
            <button onClick={() => setCompanyFilter('PCM')} className={yearBtnClass(companyFilter === 'PCM')}>PC Mejía</button>
            <button onClick={() => setCompanyFilter('PCS')} className={yearBtnClass(companyFilter === 'PCS')}>PCM Solar</button>
            <button onClick={() => setCompanyFilter('CARSAN')} className={yearBtnClass(companyFilter === 'CARSAN')}>Carsan</button>
          </div>
          <div className="w-full sm:w-auto bg-white dark:bg-steel-800 px-4 py-2 rounded-md text-sm border border-steel-200 dark:border-steel-700 text-steel-700 dark:text-steel-300 shadow-sm text-center">
            {new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className={kpiClass}>
          <div className="text-xs font-semibold tracking-wider text-steel-500 dark:text-steel-400 uppercase">Flujo Neto Total Portafolio</div>
          <div className={`text-3xl font-bold ${globalStats.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatMM(globalStats.net)}
          </div>
          <div className="text-xs text-steel-500 mt-auto">{datesSlice[0]} → {datesSlice[datesSlice.length-1]}</div>
          <div className={`absolute bottom-0 left-0 h-1 w-full ${globalStats.net >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
        </div>

        <div className={kpiClass}>
          <div className="text-xs font-semibold tracking-wider text-steel-500 dark:text-steel-400 uppercase flex justify-between items-center">
            <span>Proyectos Activos</span>
            <Building2 size={16} className="text-steel-400" />
          </div>
          <div className="text-3xl font-bold text-steel-900 dark:text-white">{globalStats.active_projects}</div>
          <div className="text-xs text-steel-500 mt-auto flex items-center gap-2">
            <span className="text-emerald-600 dark:text-emerald-400">▲ {posProjects} positivos</span>
            <span className="text-red-600 dark:text-red-400">▼ {negProjects} negativos</span>
          </div>
        </div>

        <div className={kpiClass}>
          <div className="text-xs font-semibold tracking-wider text-steel-500 dark:text-steel-400 uppercase flex justify-between items-center">
            <span>Ingresos Totales (Real + Proy)</span>
            <TrendingUp size={16} className="text-steel-400" />
          </div>
          <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{formatMM(globalStats.total_income)}</div>
          <div className="text-xs text-steel-500 mt-auto">{companyFilter !== 'todos' ? `Suma ingresos de ${companyFilter}` : 'Suma ingresos del portafolio'}</div>
        </div>

        <div className={kpiClass}>
          <div className="text-xs font-semibold tracking-wider text-steel-500 dark:text-steel-400 uppercase flex justify-between items-center">
            <span>Mejor Proyecto (Saldo)</span>
            <Trophy size={16} className="text-steel-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatMM(bestProject.net)}</div>
          <div className="text-xs text-steel-500 mt-auto uppercase truncate font-medium" title={bestProject.name}>
            {bestProject.name}
          </div>
        </div>
      </div>

      {/* CHARTS SECTION */}
      <div className="grid grid-cols-1 gap-4 mb-6">
        
        {/* CHART 1: Flujo Mensual */}
        <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <h2 className="text-base font-bold text-steel-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="text-steel-400 dark:text-steel-500" size={18}/>
              Flujo Consolidado Mensual
            </h2>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex gap-1 bg-steel-50 dark:bg-steel-900 p-1 rounded-md border border-steel-200 dark:border-steel-700">
                <button onClick={() => setChartMode('neto')} className={yearBtnClass(chartMode === 'neto')}>Neto</button>
                <button onClick={() => setChartMode('ing_eg')} className={yearBtnClass(chartMode === 'ing_eg')}>Ing + Eg</button>
              </div>
              <div className="flex gap-1 bg-steel-50 dark:bg-steel-900 p-1 rounded-md border border-steel-200 dark:border-steel-700">
                <button onClick={() => setFilterYear('all')} className={yearBtnClass(filterYear === 'all')}>Todo</button>
                <button onClick={() => setFilterYear('2026')} className={yearBtnClass(filterYear === '2026')}>2026</button>
                <button onClick={() => setFilterYear('2027')} className={yearBtnClass(filterYear === '2027')}>2027</button>
              </div>
              <button 
                onClick={() => setIsChartFullscreen(true)} 
                className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-md bg-steel-100 dark:bg-steel-700 text-steel-600 dark:text-steel-300 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/30 transition text-xs font-medium" 
                title="Ver en Pantalla Completa"
              >
                <Maximize2 size={14} />
                Expandir
              </button>
            </div>
          </div>
          {renderChart(false)}
        </div>

      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* CHART 2: Distribución de Costos (PieChart) */}
        <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm p-5">
          <h2 className="text-base font-bold text-steel-900 dark:text-white flex items-center gap-2 mb-6">
            <PieChartIcon className="text-steel-400 dark:text-steel-500" size={18}/>
            Distribución de Egresos
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            {pieData.length > 0 ? (
              <PieChart>
                <defs>
                  <filter id="pie3D" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="6" stdDeviation="5" floodColor="#000" floodOpacity="0.25" result="shadow" />
                    <feOffset dx="0" dy="-2" in="SourceAlpha" result="offsetUp" />
                    <feGaussianBlur stdDeviation="2" in="offsetUp" result="blurUp" />
                    <feComposite operator="arithmetic" k2="-1" k3="1" in="SourceAlpha" in2="blurUp" result="invAlphaUp" />
                    <feFlood floodColor="#ffffff" floodOpacity="0.5" result="floodWhite" />
                    <feComposite operator="in" in="floodWhite" in2="invAlphaUp" result="highlight" />
                    <feOffset dx="0" dy="4" in="SourceAlpha" result="offsetDown" />
                    <feGaussianBlur stdDeviation="3" in="offsetDown" result="blurDown" />
                    <feComposite operator="arithmetic" k2="-1" k3="1" in="SourceAlpha" in2="blurDown" result="invAlphaDown" />
                    <feFlood floodColor="#000000" floodOpacity="0.3" result="floodBlack" />
                    <feComposite operator="in" in="floodBlack" in2="invAlphaDown" result="bevel" />
                    <feMerge>
                      <feMergeNode in="shadow" />
                      <feMergeNode in="SourceGraphic" />
                      <feMergeNode in="highlight" />
                      <feMergeNode in="bevel" />
                    </feMerge>
                  </filter>
                  {pieData.map((entry, index) => (
                    <linearGradient key={`pieGrad-${index}`} id={`pieGrad-${index}`} x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={entry.color} stopOpacity="1" />
                      <stop offset="100%" stopColor={entry.color} stopOpacity="0.75" />
                    </linearGradient>
                  ))}
                </defs>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={65}
                  outerRadius={105}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={`url(#pieGrad-${index})`} 
                      filter="url(#pie3D)"
                    />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-steel-400 text-sm">
                No hay datos de categorías disponibles.
              </div>
            )}
          </ResponsiveContainer>
        </div>

        {/* CHART 3: Top 12 */}
        <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm p-5">
          <h2 className="text-base font-bold text-steel-900 dark:text-white flex items-center gap-2 mb-6">
            <Trophy className="text-steel-400 dark:text-steel-500" size={18}/>
            Saldo por Proyecto (Top 12)
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={top12.map(p => ({
                name: p.name.length > 25 ? p.name.substring(0, 25) + '...' : p.name,
                valor: p.net
              }))}
              layout="vertical"
              margin={{ top: 0, right: 20, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} opacity={0.2} />
              <XAxis type="number" tickFormatter={formatMM} tick={{ fontSize: 10, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} width={160} tickLine={false} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine x={0} stroke="#9ca3af" />
              <Bar dataKey="valor" name="Saldo" radius={[0, 4, 4, 0]} maxBarSize={16}>
                {top12.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.net >= 0 ? '#3b82f6' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* TABLE SECTION */}
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-steel-200 dark:border-steel-700 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 bg-steel-50 dark:bg-steel-900/50">
          <h2 className="text-base font-bold text-steel-900 dark:text-white flex items-center gap-2">
            <List className="text-steel-400" size={18}/>
            Portafolio de Proyectos — Resumen Ejecutivo
          </h2>
          <span className="text-xs text-steel-500">Clic en fila para ver detalle completo</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left whitespace-nowrap">
            <thead className="bg-steel-100 dark:bg-steel-900/80 text-steel-500 dark:text-steel-400 border-b border-steel-200 dark:border-steel-700 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-4 font-semibold">Proyecto</th>
                <th className="px-5 py-4 font-semibold">Empresa</th>
                <th className="px-5 py-4 font-semibold">Cliente</th>
                <th className="px-5 py-4 font-semibold text-right">Saldo Disponible</th>
                <th className="px-5 py-4 font-semibold text-right">Ingresos Totales</th>
                <th className="px-5 py-4 font-semibold text-right">Egresos Totales</th>
                <th className="px-5 py-4 font-semibold text-right">Margen %</th>
                <th className="px-5 py-4 font-semibold text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
              {projects.map((p) => (
                <tr 
                  key={p.id} 
                  onClick={() => navigate(`/projects/${p.id}/cash-flow`)}
                  className="hover:bg-steel-50 dark:hover:bg-steel-700/50 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3 text-steel-800 dark:text-steel-200 font-medium flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-steel-300 dark:bg-steel-600 group-hover:bg-primary-500 transition-colors"></span>
                    {p.name}
                  </td>
                  <td className="px-5 py-3 text-steel-600 dark:text-steel-400 font-medium">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      p.company === 'PCM' ? 'bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400' :
                      p.company === 'PCS' ? 'bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400' :
                      'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400'
                    }`}>{p.company}</span>
                  </td>
                  <td className="px-5 py-3 text-steel-500 font-medium truncate max-w-[150px]">{p.client_name || '—'}</td>
                  <td className={`px-5 py-3 text-right font-bold ${p.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {formatMM(p.net)}
                  </td>
                  <td className="px-5 py-3 text-right text-blue-600 dark:text-blue-400">{formatMM(p.total_income)}</td>
                  <td className="px-5 py-3 text-right text-orange-600 dark:text-orange-400">{formatMM(p.total_expense)}</td>
                  <td className="px-5 py-3 text-right text-steel-600 dark:text-steel-300 font-medium">{formatPercent(p.total_income, p.total_expense)}</td>
                  <td className="px-5 py-3 text-center">
                    <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                      p.net >= 0 
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' 
                        : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                    }`}>
                      {p.net >= 0 ? 'Positivo' : 'Negativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FULLSCREEN CHART MODAL */}
      {isChartFullscreen && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-steel-950 flex flex-col animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-steel-200 dark:border-steel-800 bg-steel-50 dark:bg-steel-900 shadow-sm">
            <h2 className="text-lg font-bold text-steel-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="text-primary-500" size={24}/>
              Flujo Consolidado Mensual
            </h2>
            <div className="flex items-center gap-6">
              <div className="flex gap-1 bg-white dark:bg-steel-800 p-1 rounded-md border border-steel-200 dark:border-steel-700">
                <button onClick={() => setChartMode('neto')} className={yearBtnClass(chartMode === 'neto')}>Neto</button>
                <button onClick={() => setChartMode('ing_eg')} className={yearBtnClass(chartMode === 'ing_eg')}>Ing + Eg</button>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-steel-500 font-medium">
                  Usa el control inferior para hacer zoom
                </span>
                <span className="text-[10px] text-steel-400">
                  Arrastra los bordes para seleccionar un rango de meses
                </span>
              </div>
              <button 
                onClick={() => setIsChartFullscreen(false)} 
                className="p-2 rounded-lg bg-steel-200 dark:bg-steel-800 text-steel-700 dark:text-steel-300 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400 transition" 
                title="Cerrar Pantalla Completa"
              >
                <X size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 p-4 sm:p-8 min-h-0 bg-white dark:bg-steel-950">
            {renderChart(true)}
          </div>
        </div>
      )}

    </div>
  );
}

// Trigger rebuild
