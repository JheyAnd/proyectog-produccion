import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BarChart2, DollarSign, LayoutDashboard, ArrowRight, Layers } from 'lucide-react';
import { useProjectsTracking, projectStatus } from '@/data/projectsTracking';
import Modal from '@/components/ui/Modal';

function formatMM(value: number) {
  if (!value) return '0,00 MM';
  return (value / 1_000_000).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' MM';
}

export default function GlobalDashboardHubPage() {
  const navigate = useNavigate();
  const [projects] = useProjectsTracking();
  const [statusModal, setStatusModal] = useState<string | null>(null);

  const modalProjects = useMemo(() => {
    if (!statusModal) return [];
    return projects.filter(p => projectStatus(p) === statusModal);
  }, [projects, statusModal]);

  const kpis = useMemo(() => {
    const num = (v: any) => parseFloat(String(v ?? 0).replace(/[^\d.-]/g, '')) || 0;
    const activeProjects = projects.filter(p => projectStatus(p) !== 'eliminado');
    const count = activeProjects.length;
    const valorTotal = activeProjects.reduce((s, p) => s + num(p.valor_actual_contrato), 0);
    const facturado = activeProjects.reduce((s, p) => s + num(p.valor_facturado), 0);
    const pagado = activeProjects.reduce((s, p) => s + num(p.valor_pagado), 0);
    const utilidad = activeProjects.reduce((s, p) => s + num(p.utilidad_actual), 0);

    const facturacionEsperada = activeProjects.reduce((s, p) => {
      const avanceFraction = p.avance_real != null ? (p.avance_real > 1 ? p.avance_real / 100 : p.avance_real) : 0;
      return s + (num(p.valor_actual_contrato) * avanceFraction);
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

  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950 p-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 pb-4 border-b border-steel-200 dark:border-steel-800 gap-4">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black text-primary-600 dark:text-primary-500 tracking-tighter">PC <span className="text-steel-900 dark:text-white">·</span> Mejía</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-steel-300 dark:bg-steel-700"></div>
          <h1 className="text-sm font-semibold tracking-widest text-steel-500 dark:text-steel-400 uppercase">Dashboards Globales</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {/* Resumen de Portafolio Card */}
        <div 
          onClick={() => navigate('/global-dashboard/portfolio')}
          className="group cursor-pointer rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <Layers size={100} className="text-primary-600" />
          </div>

          <div className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
            <Layers size={24} />
          </div>

          <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">Resumen de Portafolio</h2>
          <p className="text-sm text-steel-500 dark:text-steel-400 flex-1 relative z-10">
            Indicadores financieros, avance físico e informes consolidados de todos los proyectos de la cartera.
          </p>

          <div className="mt-6 flex items-center text-primary-600 dark:text-primary-400 font-semibold text-sm group-hover:translate-x-1 transition-transform relative z-10">
            Ver Dashboard <ArrowRight size={16} className="ml-1" />
          </div>
        </div>

        {/* FCG Card */}
        <div 
          onClick={() => navigate('/global-dashboard/fcg')}
          className="group cursor-pointer rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-sm hover:shadow-md transition-all p-6 flex flex-col h-full relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <DollarSign size={100} className="text-primary-600" />
          </div>
          
          <div className="w-12 h-12 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
            <BarChart2 size={24} />
          </div>
          
          <h2 className="text-xl font-bold text-steel-900 dark:text-white mb-2">Dashboard FCG</h2>
          <p className="text-sm text-steel-500 dark:text-steel-400 flex-1 relative z-10">
            Flujo de Caja Global. Analiza los ingresos, egresos y saldos consolidados de todo el portafolio de proyectos.
          </p>
          
          <div className="mt-6 flex items-center text-primary-600 dark:text-primary-400 font-semibold text-sm group-hover:translate-x-1 transition-transform relative z-10">
            Ver Dashboard <ArrowRight size={16} className="ml-1" />
          </div>
        </div>
      </div>
    </div>
  );
}
