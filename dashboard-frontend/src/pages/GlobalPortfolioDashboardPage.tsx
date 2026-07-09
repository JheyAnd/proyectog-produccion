import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, BarChart2, DollarSign, Layers, 
  CheckCircle, AlertTriangle, TrendingUp, Calendar, Percent,
  X, Search
} from 'lucide-react';
import { useProjectsTracking, projectStatus } from '@/data/projectsTracking';
import { formatCOPFull } from '@/utils/formatNumbers';
import Modal from '@/components/ui/Modal';
import clsx from 'clsx';

function formatMM(value: number) {
  if (!value) return '0,00 MM';
  return (value / 1_000_000).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MM';
}

function parseNumeric(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    // Remove "$", spaces, and any non-numeric characters except dots, commas and minus
    const cleaned = val.replace(/[^0-9,\.-]/g, '');
    if (cleaned.includes('.') && cleaned.includes(',')) {
      // E.g. "1.234.567,89" -> remove dots, replace comma with dot
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.')) || 0;
    }
    if (cleaned.includes('.') && !cleaned.includes(',')) {
      const parts = cleaned.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        // Thousand separator: "1.234" -> "1234"
        return parseFloat(cleaned.replace(/\./g, '')) || 0;
      } else {
        // Decimal dot: "1234.5"
        return parseFloat(cleaned) || 0;
      }
    }
    if (cleaned.includes(',')) {
      return parseFloat(cleaned.replace(',', '.')) || 0;
    }
    return parseFloat(cleaned) || 0;
  }
  return 0;
}

export default function GlobalPortfolioDashboardPage() {
  const navigate = useNavigate();
  const [projects] = useProjectsTracking();

  // Breakdown modal state
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<'facturacion' | 'pago' | null>(null);
  const [breakdownSearchQuery, setBreakdownSearchQuery] = useState('');

  const kpis = useMemo(() => {
    const activeProjects = projects.filter(p => projectStatus(p) !== 'eliminado');
    const count = activeProjects.length;
    const valorTotal = activeProjects.reduce((s, p) => s + parseNumeric(p.valor_actual_contrato), 0);
    const facturado = activeProjects.reduce((s, p) => s + parseNumeric(p.valor_facturado), 0);
    const pagado = activeProjects.reduce((s, p) => s + parseNumeric(p.valor_pagado), 0);
    const utilidad = activeProjects.reduce((s, p) => s + parseNumeric(p.utilidad_actual), 0);

    const facturacionEsperada = activeProjects.reduce((s, p) => {
      const avanceFraction = p.avance_real != null ? (p.avance_real > 1 ? p.avance_real / 100 : p.avance_real) : 0;
      return s + (parseNumeric(p.valor_actual_contrato) * avanceFraction);
    }, 0);

    const enProgreso = activeProjects.filter(p => projectStatus(p) === 'en_progreso').length;
    const completados = activeProjects.filter(p => projectStatus(p) === 'completado').length;
    const atrasados = activeProjects.filter(p => projectStatus(p) === 'atrasado').length;

    const porcentajeFacturacion = valorTotal ? (facturado / valorTotal) * 100 : 0;
    const porcentajePago = valorTotal ? (pagado / valorTotal) * 100 : 0;
    const porcentajeEsperado = valorTotal ? (facturacionEsperada / valorTotal) * 100 : 0;

    return {
      count,
      valorTotal,
      facturado,
      pagado,
      utilidad,
      facturacionEsperada,
      porcentajeFacturacion,
      porcentajePago,
      porcentajeEsperado,
      enProgreso,
      completados,
      atrasados,
    };
  }, [projects]);

  // Filtered breakdown projects
  const filteredBreakdownProjects = useMemo(() => {
    if (!activeBreakdownTab) return [];
    
    const activeProjects = projects.filter(p => projectStatus(p) !== 'eliminado');
    const sorted = [...activeProjects].sort((a, b) => {
      const contraA = parseNumeric(a.valor_actual_contrato);
      const valA = parseNumeric(activeBreakdownTab === 'facturacion' ? a.valor_facturado : a.valor_pagado);
      const pctA = contraA ? (valA / contraA) : 0;

      const contraB = parseNumeric(b.valor_actual_contrato);
      const valB = parseNumeric(activeBreakdownTab === 'facturacion' ? b.valor_facturado : b.valor_pagado);
      const pctB = contraB ? (valB / contraB) : 0;

      return pctB - pctA; // Descending order
    });

    if (!breakdownSearchQuery) return sorted;
    const query = breakdownSearchQuery.toLowerCase();
    return sorted.filter(p => 
      (p.nombre_proyecto && p.nombre_proyecto.toLowerCase().includes(query)) ||
      (p.codigo_proyecto && p.codigo_proyecto.toLowerCase().includes(query))
    );
  }, [projects, activeBreakdownTab, breakdownSearchQuery]);

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 shadow-sm p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button 
            type="button"
            onClick={() => navigate('/global-dashboard')}
            className="p-3 bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-750 text-steel-600 dark:text-steel-400 hover:text-primary-600 dark:hover:text-primary-400 hover:border-primary-300 dark:hover:border-primary-800 rounded-xl transition-all shadow-sm active:scale-95 group"
            title="Volver a Tableros Globales"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">Dashboards Globales</span>
            </div>
            <h1 className="text-2xl font-black text-steel-900 dark:text-white">Resumen del Portafolio</h1>
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Proyectos Totales */}
        <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Layers size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Proyectos Totales</p>
            <p className="text-3xl font-black text-steel-900 dark:text-white">{kpis.count}</p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-steel-200 dark:text-steel-750">
            <Layers size={90} />
          </div>
        </div>

        {/* Cartera Total */}
        <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-14 h-14 bg-primary-50 dark:bg-primary-900/20 rounded-xl flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0">
            <DollarSign size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Cartera Total</p>
            <p className="text-2xl font-black text-primary-700 dark:text-primary-400 font-mono">{formatMM(kpis.valorTotal)}</p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-steel-200 dark:text-steel-750">
            <DollarSign size={90} />
          </div>
        </div>

        {/* Utilidad Consolidad */}
        <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-shadow relative overflow-hidden">
          <div className="w-14 h-14 bg-violet-50 dark:bg-violet-900/20 rounded-xl flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
            <TrendingUp size={28} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Utilidad Proyectada</p>
            <p className="text-2xl font-black text-violet-600 dark:text-violet-400 font-mono">{formatMM(kpis.utilidad)}</p>
          </div>
          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none text-steel-200 dark:text-steel-750">
            <TrendingUp size={90} />
          </div>
        </div>

        {/* Monto Facturado */}
        <div 
          onClick={() => setActiveBreakdownTab('facturacion')}
          className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-emerald-300 dark:hover:border-emerald-800 transition-all cursor-pointer relative overflow-hidden min-h-[140px] group"
          title="Haga clic para ver el desglose por proyecto"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
              <DollarSign size={28} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">Monto Facturado</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{formatMM(kpis.facturado)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-steel-100 dark:border-steel-750 flex justify-between items-center text-xs">
            <span className="text-steel-400 font-bold uppercase tracking-wide">Avance de Facturación</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono flex items-center gap-1.5">
              {kpis.porcentajeFacturacion.toFixed(2)}%
              <span className="text-[10px] text-steel-400 font-normal">(ver desglose)</span>
            </span>
          </div>
        </div>

        {/* Porcentaje Facturado vs Esperado */}
        <div 
          onClick={() => setActiveBreakdownTab('facturacion')}
          className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-sky-300 dark:hover:border-sky-800 transition-all cursor-pointer relative overflow-hidden min-h-[140px] group"
          title="Haga clic para ver el desglose por proyecto"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-sky-50 dark:bg-sky-900/20 rounded-xl flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0 group-hover:scale-105 transition-transform">
              <Percent size={28} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">% Facturado Real</p>
              <p className="text-2xl font-black text-sky-600 dark:text-sky-400 font-mono">{kpis.porcentajeFacturacion.toFixed(2)}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-steel-100 dark:border-steel-750 flex justify-between items-center text-xs">
            <span className="text-steel-400 font-bold uppercase tracking-wide">Avance Esperado (Físico)</span>
            <span className={clsx(
              "font-bold font-mono",
              kpis.porcentajeFacturacion >= kpis.porcentajeEsperado ? "text-emerald-500" : "text-amber-500"
            )}>
              {kpis.porcentajeEsperado.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Porcentaje Pago / Recaudado */}
        <div 
          onClick={() => setActiveBreakdownTab('pago')}
          className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm flex flex-col justify-between hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-800 transition-all cursor-pointer relative overflow-hidden min-h-[140px] group"
          title="Haga clic para ver el desglose por proyecto"
        >
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 group-hover:scale-105 transition-transform">
              <Percent size={28} />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 mb-1">% Recaudado (Pago)</p>
              <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{kpis.porcentajePago.toFixed(2)}%</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-steel-100 dark:border-steel-750 flex justify-between items-center text-xs">
            <span className="text-steel-400 font-bold uppercase tracking-wide">Monto Recaudado</span>
            <span className="font-bold text-indigo-600 dark:text-indigo-400 font-mono flex items-center gap-1.5">
              {formatMM(kpis.pagado)}
              <span className="text-[10px] text-steel-400 font-normal">(ver desglose)</span>
            </span>
          </div>
        </div>
      </div>

      {/* Interactive Status Sections */}
      <div className="bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 p-6 shadow-sm">
        <h2 className="text-lg font-bold text-steel-900 dark:text-white mb-6 flex items-center gap-2">
          <BarChart2 size={20} className="text-primary-600" />
          Proyectos por Estado
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* En Progreso */}
          <div 
            onClick={() => navigate('/global-summary?status=en_progreso')}
            className="group cursor-pointer p-6 rounded-xl border border-steel-100 dark:border-steel-750 hover:border-primary-300 dark:hover:border-primary-800 hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">En Progreso</span>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300">Activo</span>
              </div>
              <p className="text-sm text-steel-500 dark:text-steel-400">
                Proyectos actualmente en fase de ejecución y desarrollo.
              </p>
            </div>
            <div className="flex justify-between items-end mt-4">
              <span className="text-3xl font-black text-primary-600 dark:text-primary-400">{kpis.enProgreso}</span>
              <span className="text-xs text-primary-500 font-bold group-hover:translate-x-1 transition-transform">Ver lista →</span>
            </div>
          </div>

          {/* Atrasados */}
          <div 
            onClick={() => navigate('/global-summary?status=atrasado')}
            className="group cursor-pointer p-6 rounded-xl border border-steel-100 dark:border-steel-750 hover:border-amber-300 dark:hover:border-amber-800 hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Atrasados</span>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">Atención</span>
              </div>
              <p className="text-sm text-steel-500 dark:text-steel-400">
                Proyectos con desviaciones detectadas en cronograma físico o financiero.
              </p>
            </div>
            <div className="flex justify-between items-end mt-4">
              <span className="text-3xl font-black text-amber-600 dark:text-amber-400">{kpis.atrasados}</span>
              <span className="text-xs text-amber-500 font-bold group-hover:translate-x-1 transition-transform">Ver lista →</span>
            </div>
          </div>

          {/* Completados */}
          <div 
            onClick={() => navigate('/global-summary?status=completado')}
            className="group cursor-pointer p-6 rounded-xl border border-steel-100 dark:border-steel-750 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-md transition-all flex flex-col justify-between min-h-[150px] relative overflow-hidden"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Completados</span>
                <span className="px-2.5 py-1 text-[10px] font-bold rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">Completado</span>
              </div>
              <p className="text-sm text-steel-500 dark:text-steel-400">
                Proyectos finalizados y recibidos a entera satisfacción del cliente.
              </p>
            </div>
            <div className="flex justify-between items-end mt-4">
              <span className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{kpis.completados}</span>
              <span className="text-xs text-emerald-500 font-bold group-hover:translate-x-1 transition-transform">Ver lista →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown Modal */}
      <Modal 
        open={activeBreakdownTab !== null} 
        onClose={() => {
          setActiveBreakdownTab(null);
          setBreakdownSearchQuery('');
        }} 
        showClose={false}
        className="p-0 w-full max-w-3xl overflow-hidden bg-white dark:bg-steel-800"
      >
        {/* Header */}
        <div className="bg-primary-900 p-6 text-white relative">
          <button 
            type="button"
            onClick={() => {
              setActiveBreakdownTab(null);
              setBreakdownSearchQuery('');
            }}
            className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white z-10"
          >
            <X className="h-5 w-5" />
          </button>
          <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-white">
            <BarChart2 className="h-5 w-5 text-white/90" />
            {activeBreakdownTab === 'facturacion' ? 'Desglose de Facturación Real' : 'Desglose de Recaudo (Pago)'}
          </h2>
          <p className="text-sm text-blue-100/90">
            {activeBreakdownTab === 'facturacion' 
              ? 'Porcentaje de facturación por proyecto respecto a su contrato.'
              : 'Porcentaje de recaudo real recibido por proyecto respecto a su contrato.'}
          </p>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {/* Search bar */}
          <div className="flex items-center gap-2 bg-steel-50 dark:bg-steel-900/50 border border-steel-200 dark:border-steel-700 rounded-xl px-3 py-2">
            <Search className="h-4 w-4 text-steel-400 shrink-0" />
            <input 
              type="text" 
              placeholder="Buscar proyecto..." 
              value={breakdownSearchQuery}
              onChange={(e) => setBreakdownSearchQuery(e.target.value)}
              className="w-full text-xs bg-transparent border-none outline-none focus:ring-0 p-1 dark:text-white"
            />
          </div>

          {/* Table Container */}
          <div className="border border-steel-200 dark:border-steel-700 rounded-xl overflow-hidden shadow-sm">
            <div className="max-h-80 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-steel-50 dark:bg-steel-900 text-[10px] font-bold uppercase tracking-wider text-steel-400 dark:text-steel-500 border-b border-steel-200 dark:border-steel-700">
                    <th className="px-4 py-2.5">Proyecto</th>
                    <th className="px-4 py-2.5 text-right">Valor Contrato</th>
                    <th className="px-4 py-2.5 text-right">{activeBreakdownTab === 'facturacion' ? 'Valor Facturado' : 'Valor Recaudado'}</th>
                    <th className="px-4 py-2.5 text-right">% Individual</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100 dark:divide-steel-800/40">
                  {filteredBreakdownProjects.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-xs text-steel-400 italic">
                        No se encontraron proyectos
                      </td>
                    </tr>
                  ) : (
                    filteredBreakdownProjects.map(p => {
                      const contrato = parseNumeric(p.valor_actual_contrato);
                      const metricVal = parseNumeric(activeBreakdownTab === 'facturacion' ? p.valor_facturado : p.valor_pagado);
                      const pct = contrato ? (metricVal / contrato) * 100 : 0;
                      return (
                        <tr key={p.id} className="hover:bg-steel-50 dark:hover:bg-steel-800/40 transition-colors">
                          <td className="px-4 py-2.5 text-xs text-steel-900 dark:text-white font-medium max-w-[220px] truncate">
                            <span className="block font-bold">{p.nombre_proyecto || 'Sin Nombre'}</span>
                            <span className="block text-[9px] text-steel-400 dark:text-steel-500 font-mono mt-0.5">{p.codigo_proyecto}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-steel-600 dark:text-steel-400 font-mono text-right">
                            {formatCOPFull(contrato)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-steel-600 dark:text-steel-400 font-mono text-right">
                            {formatCOPFull(metricVal)}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-right font-mono">
                            <span className={clsx(
                              "inline-block px-2 py-0.5 rounded text-[10px] font-bold",
                              pct >= 80 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400" :
                              pct >= 50 ? "bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400" :
                              pct > 0 ? "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400" :
                              "bg-steel-50 text-steel-500 dark:bg-steel-800/40 dark:text-steel-500"
                            )}>
                              {pct.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer (Totals) */}
            <div className="bg-steel-50 dark:bg-steel-900 p-4 border-t border-steel-200 dark:border-steel-700 flex justify-between items-center text-xs font-bold text-steel-700 dark:text-steel-300">
              <span>Totales del Portafolio:</span>
              <div className="flex gap-6 font-mono">
                <div>
                  <span className="text-[9px] text-steel-400 block text-right font-sans uppercase">Total Contratos</span>
                  <span>{formatCOPFull(kpis.valorTotal)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-steel-400 block text-right font-sans uppercase">
                    {activeBreakdownTab === 'facturacion' ? 'Total Facturado' : 'Total Recaudado'}
                  </span>
                  <span className={activeBreakdownTab === 'facturacion' ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}>
                    {formatCOPFull(activeBreakdownTab === 'facturacion' ? kpis.facturado : kpis.pagado)}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] text-steel-400 block text-right font-sans uppercase">Porcentaje Global</span>
                  <span className="px-2 py-0.5 rounded bg-primary-50 dark:bg-primary-950/40 text-primary-700 dark:text-primary-400">
                    {(activeBreakdownTab === 'facturacion' ? kpis.porcentajeFacturacion : kpis.porcentajePago).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
