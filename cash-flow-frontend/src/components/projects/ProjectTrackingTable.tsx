import { useState, useRef, useMemo } from 'react';
import {
  Download, Upload, Loader, ChevronRight, ChevronDown,
  CheckCircle2, AlertTriangle, Clock, Search, X, Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import clsx from 'clsx';
import type { Project } from '@/types';
import { formatCOP } from '@/utils/formatNumbers';
import ProjectTrackingModal from './ProjectTrackingModal';

// ─── helpers ────────────────────────────────────────────────────────────────

function pct(v?: number) { return v != null ? +(v * 100).toFixed(1) : 0; }

function statusConfig(p: Project): { label: string; color: string; icon: any } {
  const actual = p.time_progress_percentage ?? 0;
  const planned = pct(p.planned_progress);
  if (p.status === 'completed') return { label: 'Completado', color: 'text-emerald-600 bg-emerald-50 border-emerald-200', icon: CheckCircle2 };
  if (actual >= planned - 2) return { label: 'En Progreso', color: 'text-blue-600 bg-blue-50 border-blue-200', icon: Clock };
  return { label: 'Atrasado', color: 'text-amber-600 bg-amber-50 border-amber-200', icon: AlertTriangle };
}

function ProgressBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  const pctValue = Math.min(Math.max(value, 0), max);
  return (
    <div className="w-full bg-steel-200 rounded-full h-1.5 overflow-hidden">
      <div className={clsx('h-full rounded-full transition-all', color)} style={{ width: `${pctValue}%` }} />
    </div>
  );
}

// ─── Expandable row detail ───────────────────────────────────────────────────

function ProjectRowDetail({ p }: { p: Project }) {
  const fields = [
    { label: 'Director', value: p.project_director },
    { label: 'Residente', value: p.resident_engineer },
    { label: 'Supervisor', value: p.supervisor },
    { label: 'Tipo contrato', value: p.contract_type },
    { label: 'Alcance', value: p.scope },
    { label: 'Valor original', value: p.contract_value_original ? formatCOP(p.contract_value_original) + ' M' : undefined },
    { label: 'Otrosí', value: p.other_modifications_value ? formatCOP(p.other_modifications_value) + ' M' : undefined },
    { label: 'Anticipo recibido', value: p.advance_received_value ? formatCOP(p.advance_received_value) + ' M' : undefined },
    { label: 'Retenido', value: p.retained_value ? formatCOP(p.retained_value) + ' M' : undefined },
    { label: 'Amortización', value: p.amortization_value ? formatCOP(p.amortization_value) + ' M' : undefined },
    { label: 'Valor pagado', value: p.paid_value ? formatCOP(p.paid_value) + ' M' : undefined },
    { label: 'Costos materiales', value: p.costs_materials ? formatCOP(p.costs_materials) + ' M' : undefined },
    { label: 'Costos MO', value: p.costs_labor ? formatCOP(p.costs_labor) + ' M' : undefined },
    { label: 'Costos admin', value: p.costs_admin ? formatCOP(p.costs_admin) + ' M' : undefined },
    { label: 'Desviaciones', value: p.detected_deviations },
    { label: 'Justificación', value: p.deviations_justification },
    { label: 'Necesidades apoyo', value: p.support_needs },
  ].filter(f => f.value);

  return (
    <tr>
      <td colSpan={10} className="bg-steel-50/80 border-b border-steel-200">
        <div className="px-8 py-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          {fields.map(f => (
            <div key={f.label}>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-steel-400">{f.label}</p>
              <p className="text-sm text-steel-800 mt-0.5 leading-tight">{f.value}</p>
            </div>
          ))}
          {fields.length === 0 && (
            <p className="col-span-4 text-sm text-steel-400 italic">Sin detalles adicionales cargados.</p>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

interface Props {
  projects: Project[];
  onBulkUpdate: (projects: Project[]) => void;
  isLoading?: boolean;
}

export default function ProjectTrackingTable({ projects, onBulkUpdate, isLoading }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clientes únicos para el selector
  const uniqueClients = useMemo(() => {
    const clients = [...new Set(projects.map(p => p.client_name).filter(Boolean))];
    return clients.sort();
  }, [projects]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return projects.filter(p => {
      const matchText = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.code || '').toLowerCase().includes(q) ||
        (p.client_name || '').toLowerCase().includes(q) ||
        (p.location || '').toLowerCase().includes(q);
      
      const matchStatus = statusFilter === 'all' || p.status === statusFilter || (statusFilter === 'overdue' && statusConfig(p).label === 'Atrasado');
      const matchClient = clientFilter === 'all' || p.client_name === clientFilter;
      
      return matchText && matchStatus && matchClient;
    });
  }, [projects, search, statusFilter, clientFilter]);

  const activeFiltersCount = (statusFilter !== 'all' ? 1 : 0) + (clientFilter !== 'all' ? 1 : 0);

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = projects.length;
    const cartera = projects.reduce((s, p) => s + (p.contract_value_current || p.total_budget || 0), 0);
    const facturado = projects.reduce((s, p) => s + (p.billed_value || 0), 0);
    const costos = projects.reduce((s, p) => s + (p.costs_total || 0), 0);
    const utilidad = facturado - costos;
    const completados = projects.filter(p => p.status === 'completed').length;
    const atrasados = projects.filter(p => {
      const actual = p.time_progress_percentage ?? 0;
      const planned = pct(p.planned_progress);
      return p.status !== 'completed' && actual < planned - 2;
    }).length;
    return { total, cartera, facturado, utilidad, completados, atrasados };
  }, [projects]);

  // ── Save from modal ────────────────────────────────────────────────────────
  const handleSaveProject = (updated: Project) => {
    const newList = [...projects];
    const idx = newList.findIndex(p => p.id === updated.id);
    if (idx >= 0) newList[idx] = updated;
    onBulkUpdate(newList);
  };

  // ── Export ─────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = projects.map((p, i) => ({
      '#': i + 1,
      'Nombre del proyecto': p.name,
      'Nombre del contrato': p.contract_name || '',
      'Código del proyecto': p.code || '',
      'Cliente': p.client_name || '',
      'Gerente del proyecto - Cliente': p.client_manager || '',
      'Administrador del contrato - Cliente': p.client_admin || '',
      'Director de Proyectos': p.project_director || '',
      'Ingeniero residente': p.resident_engineer || '',
      'Supervisor': p.supervisor || '',
      'Encargado': p.manager_in_charge || '',
      'Tipo de Contrato (obra, suministro, EPC, etc.)': p.contract_type || '',
      'Requiere Auxilios SI / NO': p.requires_aid || '',
      'Pólizas Requeridas': p.required_policies || '',
      'Multas o Penalidades': p.penalties || '',
      'Alcance': p.scope || '',
      'Localización': p.location || '',
      'Fecha de inicio': p.start_date || '',
      'Fecha de finalización contractual': p.estimated_end_date || '',
      'Valor Original del Contrato': p.contract_value_original || 0,
      'Porcentaje Anticipo': (p.advance_percentage || 0) * 100,
      'Retención en garantía': (p.retention_guarantee || 0) * 100,
      'Utilidad Proyectada': p.projected_utility || 0,
      'Fecha de terminación estimada': p.estimated_completion_date || '',
      'Porcentaje de avance programado a la fecha': pct(p.planned_progress),
      'Porcentaje de avance real a la fecha': p.time_progress_percentage || 0,
      'Modificación del alcance': p.scope_modifications || '',
      'Órdenes de compra ? (SI / NO)': p.purchase_orders_exist || '',
      'Alcance Ordenes': p.purchase_orders_scope || '',
      'Tiempo Ordenes': p.purchase_orders_time || '',
      'Valor Ordenes': p.purchase_orders_value || 0,
      'Estado facturación Ordenes': p.purchase_orders_billing_status || '',
      'Desviaciones detectadas (si hubiera: cronograma, costo, calidad, etc.)': p.detected_deviations || '',
      'Justificación de las desviaciones': p.deviations_justification || '',
      'Valor de los Otrosí (adiciones y reducciones)': p.other_modifications_value || 0,
      'Valor Actual del contrato': p.contract_value_current || 0,
      'Valor Anticipo recibido': p.advance_received_value || 0,
      'Valor facturado': p.billed_value || 0,
      'Retenido': p.retained_value || 0,
      'Amortización del anticipo': p.amortization_value || 0,
      'Valor Total Ingreso (liquidez)': p.total_revenue_liquidity || 0,
      'Valor Descuentos (descuentos de materiales, obras, etc.)': p.discounts_value || 0,
      'Valor pagado': p.paid_value || 0,
      'Valor Por Amortizar': p.pending_amortization_value || 0,
      'Costos Ejecutados hasta el momento: Materiales': p.costs_materials || 0,
      'Costos Ejecutados hasta el momento: Mano de obra': p.costs_labor || 0,
      'Costos Ejecutados hasta el momento: Administrativos y operacionales': p.costs_admin || 0,
      'Costos ejecutados hasta el momento': p.costs_total || 0,
      'Utilidad': p.current_utility || 0,
      'Necesidades de apoyo (técnico, administrativo, financiero)': p.support_needs || '',
      '¿Decisiones que deben ser tomadas por la gerencia?': p.management_decisions || '',
      'Observaciones del cliente / Interventoría': p.client_observations || '',
      'Identificación de riesgos': p.risk_identification || '',
      'Lecciones aprendidas': p.lessons_learned || '',
      'Recomendaciones para otros proyectos': p.recommendations || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Seguimiento');
    XLSX.writeFile(wb, `Seguimiento_PCMejia_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // ── Import ─────────────────────────────────────────────────────────────────
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any>(ws);

      const imported: Project[] = data.map((row) => ({
        id: `excel-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        code: row['Código del proyecto'] || row['Código'] || row['CODIGO'],
        name: row['Nombre del proyecto'] || row['Proyecto'] || row['PROYECTO'] || 'Proyecto Importado',
        client_name: row['Cliente'] || row['CLIENTE'] || '',
        start_date: row['Fecha de inicio'] || new Date().toISOString().split('T')[0],
        estimated_end_date: row['Fecha de finalización contractual'] || new Date().toISOString().split('T')[0],
        contract_name: row['Nombre del contrato'],
        client_manager: row['Gerente del proyecto - Cliente'],
        client_admin: row['Administrador del contrato - Cliente'],
        project_director: row['Director de Proyectos'],
        resident_engineer: row['Ingeniero residente'],
        supervisor: row['Supervisor'],
        manager_in_charge: row['Encargado'],
        contract_type: row['Tipo de Contrato (obra, suministro, EPC, etc.)'],
        requires_aid: row['Requiere Auxilios SI / NO'],
        required_policies: row['Pólizas Requeridas'],
        penalties: row['Multas o Penalidades'],
        scope: row['Alcance'],
        location: row['Localización'],
        contract_value_original: Number(row['Valor Original del Contrato']) || 0,
        total_budget: Number(row['Valor Actual del contrato']) || Number(row['Valor Original del Contrato']) || 0,
        advance_percentage: (Number(row['Porcentaje Anticipo']) || 0) / 100,
        retention_guarantee: (Number(row['Retención en garantía']) || 0) / 100,
        projected_utility: Number(row['Utilidad Proyectada']) || 0,
        estimated_completion_date: row['Fecha de terminación estimada'],
        planned_progress: (Number(row['Porcentaje de avance programado a la fecha']) || 0) / 100,
        time_progress_percentage: Number(row['Porcentaje de avance real a la fecha']) || 0,
        scope_modifications: row['Modificación del alcance'],
        purchase_orders_exist: row['Órdenes de compra ? (SI / NO)'],
        purchase_orders_scope: row['Alcance Ordenes'],
        purchase_orders_time: row['Tiempo Ordenes'],
        purchase_orders_value: Number(row['Valor Ordenes']) || 0,
        purchase_orders_billing_status: row['Estado facturación Ordenes'],
        detected_deviations: row['Desviaciones detectadas (si hubiera: cronograma, costo, calidad, etc.)'],
        deviations_justification: row['Justificación de las desviaciones'],
        other_modifications_value: Number(row['Valor de los Otrosí (adiciones y reducciones)']) || 0,
        contract_value_current: Number(row['Valor Actual del contrato']) || 0,
        advance_received_value: Number(row['Valor Anticipo recibido']) || 0,
        billed_value: Number(row['Valor facturado']) || 0,
        retained_value: Number(row['Retenido']) || 0,
        amortization_value: Number(row['Amortización del anticipo']) || 0,
        total_revenue_liquidity: Number(row['Valor Total Ingreso (liquidez)']) || 0,
        discounts_value: Number(row['Valor Descuentos (descuentos de materiales, obras, etc.)']) || 0,
        paid_value: Number(row['Valor pagado']) || 0,
        pending_amortization_value: Number(row['Valor Por Amortizar']) || 0,
        costs_materials: Number(row['Costos Ejecutados hasta el momento: Materiales']) || 0,
        costs_labor: Number(row['Costos Ejecutados hasta el momento: Mano de obra']) || 0,
        costs_admin: Number(row['Costos Ejecutados hasta el momento: Administrativos y operacionales']) || 0,
        costs_total: Number(row['Costos ejecutados hasta el momento']) || 0,
        current_utility: Number(row['Utilidad']) || 0,
        support_needs: row['Necesidades de apoyo (técnico, administrativo, financiero)'],
        management_decisions: row['¿Decisiones que deben ser tomadas por la gerencia?'],
        client_observations: row['Observaciones del cliente / Interventoría'],
        risk_identification: row['Identificación de riesgos'],
        lessons_learned: row['Lecciones aprendidas'],
        recommendations: row['Recomendaciones para otros proyectos'],
        currency: 'COP',
        status: 'in_progress',
        actual_end_date: null,
        project_manager: row['Director de Proyectos'] || '',
        description: row['Alcance'] || '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })) as Project[];

      onBulkUpdate(imported);
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <div className="flex flex-col h-full gap-4">

        {/* ── KPI CARDS ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard label="Proyectos" value={kpis.total.toString()} color="text-steel-900" />
          <KpiCard label="Cartera Total" value={`${formatCOP(kpis.cartera)} M`} color="text-primary-700" />
          <KpiCard label="Facturado" value={`${formatCOP(kpis.facturado)} M`} color="text-emerald-600" />
          <KpiCard label="Utilidad" value={`${kpis.utilidad < 0 ? '-' : ''}${formatCOP(Math.abs(kpis.utilidad))} M`} color={kpis.utilidad >= 0 ? 'text-emerald-600' : 'text-red-500'} />
          <KpiCard label="Completados" value={kpis.completados.toString()} color="text-emerald-500" />
          <KpiCard label="Atrasados" value={kpis.atrasados.toString()} color="text-amber-500" />
        </div>

        {/* ── TABLE CARD ──────────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow-card border border-steel-200 flex flex-col overflow-hidden flex-1 relative">

          {/* Toolbar */}
          <div className="px-5 py-3 border-b border-steel-100 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-400" />
              <input
                type="search"
                aria-label="Buscar proyectos"
                placeholder="Buscar proyectos..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-sm border border-steel-200 rounded-lg focus:ring-1 focus:ring-primary-500 focus:outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-steel-400 hover:text-steel-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <button
                onClick={() => setShowFilters(!showFilters)}
                className={clsx(
                  "flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all shadow-sm whitespace-nowrap",
                  showFilters || activeFiltersCount > 0
                    ? 'bg-primary-50 border-primary-300 text-primary-700'
                    : 'bg-white border-steel-200 text-steel-600 hover:bg-steel-50'
                )}
              >
                <Filter className="h-3.5 w-3.5" />
                Filtros
                {activeFiltersCount > 0 && (
                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary-600 text-white text-[9px] font-bold">
                    {activeFiltersCount}
                  </span>
                )}
                <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform", showFilters && "rotate-180")} />
              </button>

            <span className="text-xs text-steel-500 whitespace-nowrap">{filtered.length} resultados</span>
            
            <div className="flex gap-2 ml-auto">
              <input type="file" accept=".xlsx,.xls" className="hidden" ref={fileInputRef} onChange={handleImport} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-steel-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition shadow-sm">
                <Upload className="h-3.5 w-3.5 text-emerald-600" /> Importar Excel
              </button>
              <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition shadow-sm">
                <Download className="h-3.5 w-3.5" /> Exportar
              </button>
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
              <div className="w-full bg-steel-50/50 p-3 border-b border-steel-100 flex flex-wrap gap-4 animate-in fade-in slide-in-from-top-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-[10px] font-bold uppercase text-steel-400">Estado</span>
                  <div className="flex gap-1.5">
                    {([
                      { id: 'all', label: 'Todos' },
                      { id: 'in_progress', label: 'En Progreso' },
                      { id: 'completed', label: 'Completado' },
                      { id: 'overdue', label: 'Atrasados' }
                    ]).map(s => (
                      <button
                        key={s.id}
                        onClick={() => setStatusFilter(s.id)}
                        className={clsx(
                          "px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all",
                          statusFilter === s.id
                            ? "bg-primary-600 border-primary-600 text-white shadow-sm"
                            : "bg-white border-steel-200 text-steel-600 hover:border-primary-300"
                        )}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 min-w-[180px]">
                  <span className="text-[10px] font-bold uppercase text-steel-400">Cliente</span>
                  <select
                    value={clientFilter}
                    onChange={e => setClientFilter(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg border border-steel-200 bg-white text-[11px] font-medium text-steel-700 outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="all">Todos los clientes</option>
                    {uniqueClients.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {activeFiltersCount > 0 && (
                  <button
                    onClick={() => { setSearch(''); setStatusFilter('all'); setClientFilter('all'); }}
                    className="mt-auto ml-auto px-2 py-1.5 text-[11px] font-bold text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 rounded-lg"
                  >
                    Limpiar Filtros
                  </button>
                )}
              </div>
            )}

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 bg-white/60 z-20 flex items-center justify-center">
              <Loader className="h-8 w-8 text-primary-500 animate-spin" />
            </div>
          )}

          {/* Table */}
          <div className="overflow-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="bg-steel-50 border-b border-steel-200 sticky top-0 z-10">
                <tr>
                  <th scope="col" className="px-4 py-3 w-8 font-semibold text-steel-500 text-xs">#</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs min-w-[180px]">Proyecto</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs">Código</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs min-w-[140px]">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-right">Valor Contrato</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-center min-w-[110px]">Avance Prog.</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-center min-w-[110px]">Avance Real</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-right">Facturado</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-right">Utilidad</th>
                  <th scope="col" className="px-4 py-3 font-semibold text-steel-700 text-xs text-center">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100">
                {filtered.map((p, i) => {
                  const isExpanded = expandedId === p.id;
                  const plannedPctValue = pct(p.planned_progress);
                  const actualPctValue = p.time_progress_percentage ?? 0;
                  const contrato = p.contract_value_current || p.total_budget || 0;
                  const facturado = p.billed_value || 0;
                  const costos = p.costs_total || 0;
                  const utilidad = (p.current_utility != null) ? p.current_utility : (facturado - costos);
                  const sc = statusConfig(p);

                  return (
                    <div key={p.id}>
                      <tr
                        className={clsx(
                          'hover:bg-steel-50/70 cursor-pointer transition-colors group',
                          isExpanded && 'bg-primary-50/30'
                        )}
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        onDoubleClick={() => setEditingProject(p)}
                      >
                        <td className="px-4 py-3 text-steel-400 text-xs font-mono">
                          <span className="flex items-center gap-1">
                            {isExpanded
                              ? <ChevronDown className="h-3.5 w-3.5 text-primary-500" />
                              : <ChevronRight className="h-3.5 w-3.5 text-steel-300 group-hover:text-steel-500" />}
                            {i + 1}
                          </span>
                        </td>
                        <th scope="row" className="px-4 py-3 font-medium text-steel-900 max-w-[220px] truncate" title={p.name}>{p.name}</th>
                        <td className="px-4 py-3 font-mono text-xs text-steel-500">{p.code}</td>
                        <td className="px-4 py-3 text-primary-600 text-xs truncate max-w-[160px]" title={p.client_name || ''}>{p.client_name}</td>
                        <td className="px-4 py-3 text-right font-medium text-steel-800 text-xs whitespace-nowrap">{formatCOP(contrato)} M</td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-xs font-bold text-primary-700">{plannedPctValue.toFixed(1)}%</span>
                            <ProgressBar value={plannedPctValue} color="bg-primary-500" />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex flex-col items-center gap-1">
                            <span className={clsx('text-xs font-bold', actualPctValue >= plannedPctValue ? 'text-emerald-600' : 'text-amber-500')}>
                              {actualPctValue.toFixed(1)}%
                            </span>
                            <ProgressBar value={actualPctValue} color={actualPctValue >= plannedPctValue ? 'bg-emerald-500' : 'bg-amber-400'} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-xs font-medium text-steel-700 whitespace-nowrap">
                          {facturado > 0 ? `${formatCOP(facturado)} M` : <span className="text-steel-300">–</span>}
                        </td>
                        <td className={clsx('px-4 py-3 text-right text-xs font-semibold whitespace-nowrap', utilidad >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                          {costos > 0 ? `${utilidad < 0 ? '-' : ''}${formatCOP(Math.abs(utilidad))} M` : <span className="text-steel-300">–</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-semibold whitespace-nowrap', sc.color)}>
                            <sc.icon className="h-3 w-3" />
                            {sc.label}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && <ProjectRowDetail p={p} />}
                    </div>
                  );
                })}

                {filtered.length === 0 && !isLoading && (
                  <tr>
                    <td colSpan={10} className="py-16 text-center text-steel-500">
                      <p className="font-medium text-steel-700 mb-1">
                        {search ? 'Sin resultados para tu búsqueda' : 'Sin proyectos cargados'}
                      </p>
                      <p className="text-xs">
                        {search ? 'Intenta con otro término' : 'Usa el botón "Importar Excel" para cargar la matriz de seguimiento.'}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <ProjectTrackingModal
        project={editingProject}
        isOpen={!!editingProject}
        onClose={() => setEditingProject(null)}
        onSave={handleSaveProject}
      />
    </>
  );
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-steel-200 shadow-sm px-4 py-3 flex flex-col gap-1">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-steel-400">{label}</p>
      <p className={clsx('text-xl font-bold tabular-nums', color)}>{value}</p>
    </div>
  );
}
