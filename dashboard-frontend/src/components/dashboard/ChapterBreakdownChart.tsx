import { useMemo, useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LabelList, ReferenceLine, Cell,
} from 'recharts';
import { formatCOP, formatCOPFull } from '@/utils/formatNumbers';
import { useEgresosCategorias, totalGrupo, formatMonthKey, EXCEL_MONTHS } from '@/data/excelCategoriasEgresos';
import { businessCaseAPI } from '@/services/api/businessCase';
import { dashboardApi } from '@/services/api/dashboard';

// ── Intereses en la barra "Flujo de Caja" ──
// = Total Deuda Bancaria − Créditos Bancarios (Neto)
// Lee de clave FIJA: patio_sur_intereses_grafico (publicada por CashFlowPage)
function useCostoFinancieroNeto(projectId: string): number {
  const FIXED_KEY = `project_${projectId}_intereses_grafico`;

  const read = (): number => {
    try {
      const raw = localStorage.getItem(FIXED_KEY);
      if (raw) return JSON.parse(raw) as number;
    } catch { /* ignore */ }
    return 0;
  };

  const [value, setValue] = useState<number>(read);

  useEffect(() => {
    setValue(read());
    const refresh = () => setValue(read());
    window.addEventListener('cashflow_chartdata_updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('cashflow_chartdata_updated', refresh);
      window.removeEventListener('storage', refresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}



// Grupos vacíos por defecto, se llenarán con datos de la API
const GRUPOS_COLORS: Record<string, string> = {
  Materiales: '#1b5eab',
  Servicios: '#0ea5e9',
  ManoObra: '#059669',
  Administracion: '#7c3aed',
  Utilidad: '#86efac',
  Intereses: '#f59e0b',
  Proyeccion: '#94a3b8',
};

function checkIsPatioSur(id?: string): boolean {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/[\s-]/g, '');
  return normalized === 'patio-sur-oe1035' || normalized === 'oe1035' || normalized === 'patiosuroe1035' || normalized === 'oe-1035';
}

function isProtectedProject(id?: string): boolean {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/[\s-]/g, '');
  return checkIsPatioSur(id) || normalized === 'lyracarsanoe2000' || normalized === 'oe2000';
}

// ── Tooltip ──
interface TPayload { name: string; value: number; fill: string }
const NOMBRE_GRUPO: Record<string, string> = {
  'Administración': 'Administracion', Intereses: 'Intereses',
  'Utilidad': 'Utilidad', Proyeccion: 'Proyeccion',
};


// ── Labels en segmentos ──
type LabelProps = { x?: number; y?: number; width?: number; height?: number; index?: number; segKey?: string; chartData?: any[] };

function SegLabel({ x = 0, y = 0, width = 0, height = 0, index = 0, segKey = '', chartData = [] }: LabelProps) {
  const entry = chartData[index];
  if (!entry) return null;
  const value = entry[segKey] ?? 0;
  if (!value) return null;

  const total = (entry.Materiales || 0) + (entry.Servicios || 0) + (entry.ManoObra || 0) + (entry.Administracion || 0) + (entry.Intereses || 0) + (entry.Utilidad || 0) + (entry.Proyeccion || 0);
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : '0';

  if (height >= 26) {
    const isHollow = index === 3 && (segKey === 'Proyeccion' || segKey === 'Utilidad');
    const textColor = isHollow ? '#111827' : 'white';
    return (
      <g>
        <text x={x + width / 2} y={y + height / 2 - 7} textAnchor="middle" fill={textColor} fontSize={9} fontWeight="bold">
          {formatCOP(value)}
        </text>
        <text x={x + width / 2} y={y + height / 2 + 7} textAnchor="middle" fill={isHollow ? '#374151' : 'rgba(255,255,255,0.85)'} fontSize={9}>
          {pct}%
        </text>
      </g>
    );
  }

  if (height >= 10) {
    const isHollow = index === 3 && (segKey === 'Proyeccion' || segKey === 'Utilidad');
    return (
      <text x={x + width / 2} y={y + height / 2 + 4} textAnchor="middle" fill={isHollow ? '#111827' : 'white'} fontSize={8} fontWeight="bold">
        {formatCOP(value)} · {pct}%
      </text>
    );
  }

  let labelY: number;
  let lineY: number;

  if (segKey === 'Materiales' || segKey === 'Servicios') {
    labelY = y - 20;
    lineY = y - 12;
  } else if (segKey === 'ManoObra') {
    labelY = y + height + 12;
    lineY = y + height + 8;
  } else if (segKey === 'Administracion') {
    labelY = y - 8;
    lineY = y - 4;
  } else if (segKey === 'Intereses') {
    labelY = y + height + 24;
    lineY = y + height + 20;
  } else {
    labelY = y + height / 2;
    lineY = y + height / 2;
  }

  return (
    <g>
      <line x1={x + width + 4} y1={lineY} x2={x + width + 14} y2={lineY} stroke="#6e7179" strokeWidth={1} />
      <text x={x + width + 16} y={labelY} textAnchor="start" fill="#374151" fontSize={8} fontWeight="bold">
        {formatCOP(value)} ({pct}%)
      </text>
    </g>
  );
}

function UtilidadLabel({ x = 0, y = 0, width = 0, height = 0, index = 0, chartData = [] }: LabelProps) {
  const entry = chartData[index];
  if (!entry) return null;
  const value = entry.Utilidad;
  if (!value && index !== 3) return null; // Para Real Abril (ahora índice 3), permitir 0

  const labelText = entry.tipo.includes('Venta') ? "Utilidad (4%)" : "UTILIDAD";
  const valText = formatCOP(value);

  const total = (entry.Materiales || 0) + (entry.Servicios || 0) + (entry.ManoObra || 0) + (entry.Administracion || 0) + (entry.Intereses || 0) + (entry.Utilidad || 0) + (entry.Proyeccion || 0);
  const pctText = entry.tipo.includes('Venta') ? "4.0%" : `${total > 0 ? ((value / total) * 100).toFixed(1) : '0'}% margen`;

  if (height < 24 || !value) return null;

  return (
    <g>
      <text x={x + width / 2} y={y + height / 2 - 8} textAnchor="middle" fill={index === 3 ? "#111827" : "#14532d"} fontSize={9} fontWeight="bold">{labelText}</text>
      <text x={x + width / 2} y={y + height / 2 + 5} textAnchor="middle" fill={index === 3 ? "#111827" : "#14532d"} fontSize={9} fontWeight="bold">{valText}</text>
      <text x={x + width / 2} y={y + height / 2 + 17} textAnchor="middle" fill={index === 3 ? "#374151" : "#166534"} fontSize={8}>{pctText}</text>
    </g>
  );
}

// ── Línea de Costo Directo ──
const DottedLine = (props: any) => {
  const { x, y, width, index, chartData } = props;
  if (y === undefined || x === undefined || !chartData) return null;
  
  const entry = chartData[index];
  const directCost = (entry.Materiales || 0) + (entry.Servicios || 0) + (entry.ManoObra || 0) + (entry.Administracion || 0);
  const formattedVal = formatCOP(directCost);
  
  const extension = 10; // Extensión de la línea fuera de la barra

  return (
    <g>
      {/* Línea extendida horizontalmente */}
      <line
        x1={x - extension}
        y1={y}
        x2={x + width + extension}
        y2={y}
        stroke="#000000"
        strokeWidth={2}
        strokeDasharray="4 4"
        style={{ pointerEvents: 'all' }}
      />
      
      {/* Etiqueta con el valor al extremo derecho de la línea */}
      <g transform={`translate(${x + width + extension + 4}, ${y - 10})`}>
        <rect
          x={0}
          y={0}
          width={formattedVal.length * 7 + 10}
          height={20}
          fill="rgba(255, 255, 255, 0.85)"
          rx={4}
        />
        <text
          x={5}
          y={14}
          fontSize={11}
          fontWeight="bold"
          fill="#000000"
        >
          {formattedVal}
        </text>
      </g>
      
      <title>{`Costo Directo (Sum+MO+Admin): ${formattedVal}`}</title>
    </g>
  );
};

// ── Componente principal ──
const ChapterBreakdownChart = ({ projectId = 'patio-sur-oe1035' }: { projectId?: string }) => {
  const isProtected = isProtectedProject(projectId);
  const [bcData, setBcData] = useState<any>(null);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeBar, setActiveBar] = useState<any>(null);
  const [incluirUtilidadVenta, setIncluirUtilidadVenta] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const [categorias] = useEgresosCategorias(projectId);
  const costoFinancieroNeto = useCostoFinancieroNeto(projectId);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chartRef.current && !chartRef.current.contains(e.target as Node)) {
        setActiveBar(null);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const fetchPromises: Promise<any>[] = [
      businessCaseAPI.getFull(projectId).catch(() => null)
    ];
    if (!isProtected) {
      fetchPromises.push(dashboardApi.get(projectId).catch(() => null));
    }
    Promise.all(fetchPromises)
      .then(([bc, dash]) => {
        setBcData(bc);
        if (dash) setDashboardData(dash);
      })
      .catch(() => {
        setBcData(null);
        setDashboardData(null);
      })
      .finally(() => setIsLoading(false));
  }, [projectId, isProtected]);

  // ── Tooltip Dinámico ──
  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: TPayload[]; label?: string }) => {
    if (!active || !payload?.length) return null;
    const esVenta = label?.includes('Venta');
    const esCosto = label?.includes('Caso Neg');
    const esStatic = esVenta || esCosto;
    const total = payload.reduce((s, p) => s + (p.value || 0), 0);

    return (
      <div className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl border border-steel-200 dark:border-steel-700 p-4 min-w-[320px] max-w-sm">
        <p className="text-xs font-bold text-steel-900 dark:text-white mb-3 border-b border-steel-100 dark:border-steel-700 pb-2">{label}</p>
        {[...payload].reverse().map((p) => {
          if (!p.value && p.name !== 'Utilidad') return null;
          const pct = total > 0 ? ((p.value / total) * 100).toFixed(1) : '0';
          
          // Agrupación dinámica si hay bcData
          let items: { nombre: string; valor: number }[] = [];
          const isDetailed = bcData?.chapters && bcData.chapters.length > 0;
          if (bcData && esStatic && isDetailed) {
            const getChaptersByGroup = (groupId: string) => 
              bcData.chapters.filter((ch: any) => ch.group_id === groupId)
                .map((ch: any) => ({ nombre: ch.chapter_name, valor: esVenta ? ch.venta : ch.costo }));

            if (p.name === 'Materiales' || p.name === 'Servicios') {
              const rawItems = getChaptersByGroup(p.name === 'Materiales' ? 'materiales' : 'servicios');
              const legacyItems = p.name === 'Materiales' ? getChaptersByGroup('suministro') : [];
              rawItems.push(...legacyItems);
              // Aplicar agrupaciones lógicas
              const grouped: Record<string, number> = {};
              rawItems.forEach((it: any) => {
                let key = it.nombre;
                if (key.includes('Redes MT') || key.includes('Subestaciones')) key = 'Redes MT / Interconexión SE';
                else if (key.includes('Transformadores') || key.includes('Baja Tensión')) key = 'Transformadores y BT';
                else if (key.includes('Cargadores')) key = 'Suministro Cargadores';
                
                grouped[key] = (grouped[key] || 0) + it.valor;
              });
              items = Object.entries(grouped).map(([nombre, valor]) => ({ nombre, valor }));
            } else if (p.name === 'ManoObra') {
              items = getChaptersByGroup('mano-obra');
            } else if (p.name === 'Administracion') {
              const caps = getChaptersByGroup('administracion');
              const aius = bcData.aiu.filter((a: any) => a.tipo !== 'financiacion' && !a.tipo.startsWith('utilidad'))
                .map((a: any) => ({ nombre: a.label, valor: esVenta ? a.venta : a.costo }));
              items = [...caps, ...aius];
            } else if (p.name === 'Intereses') {
              const caps = getChaptersByGroup('intereses');
              const finItem = bcData.aiu.find((a: any) => a.tipo === 'financiacion');
              const meses = bcData.business_case.meses_sin_ingresos || 9;
              items = [
                ...caps, 
                { 
                  nombre: `Financiación ${meses} meses`, 
                  valor: finItem ? (esVenta ? Number(finItem.venta) : Number(finItem.costo)) : Number(bcData.business_case.financiacion_valor) 
                }
              ];
            } else if (p.name === 'Utilidad') {
              if (esVenta) {
                items = bcData.aiu.filter((a: any) => a.tipo.startsWith('utilidad')).map((a: any) => ({ nombre: a.label, valor: a.venta }));
              } else {
                items = [{ nombre: 'Margen Bruto Real', valor: p.value }];
              }
            }
          } else if (!esStatic && categorias) {
            const esFlujo = label === 'Flujo de Caja';
            const groupMap: Record<string, string> = {
              'Materiales': 'materiales',
              'Servicios': 'servicios',
              'ManoObra': 'mano_obra',
              'Administracion': 'administracion',
              'Intereses': 'intereses',
            };
            const internalGroupId = groupMap[p.name];
            
            if (internalGroupId) {
              const baseCats = categorias.filter(c => c.grupo === internalGroupId && c.incluirEnGrafico !== false);
              
              if (esFlujo) {
                items = baseCats.map(c => {
                  const valor = EXCEL_MONTHS.reduce((s, m) => s + (c.valores[m] || 0), 0);
                  return { nombre: c.nombre, valor };
                }).filter(i => i.valor > 0);
              } else {
                const today = new Date();
                const currentMonthKey = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}`;
                const currentIdx = EXCEL_MONTHS.indexOf(currentMonthKey);
                const effectiveIdx = currentIdx === -1 ? (today < new Date(2025, 9, 1) ? -1 : EXCEL_MONTHS.length - 1) : currentIdx;
                const mesesHastaHoy = effectiveIdx >= 0 ? EXCEL_MONTHS.slice(0, effectiveIdx + 1) : [];
                
                items = baseCats.map(c => {
                  const valor = mesesHastaHoy.reduce((s, m) => s + (c.valores[m] || 0), 0);
                  return { nombre: c.nombre, valor };
                }).filter(i => i.valor > 0);
              }
            } else if (p.name === 'Proyeccion') {
               items = [{ nombre: 'Gasto proyectado / Restante', valor: p.value }];
            } else if (p.name === 'Real') {
               items = [{ nombre: 'Gasto Ejecutado (Genérico)', valor: p.value }];
            }
          }

          return (
            <div key={p.name} className="mb-3 last:mb-0">
              <div className="flex items-center justify-between mb-1.5">
                <span className="flex items-center gap-1.5 text-xs font-bold text-steel-800 dark:text-steel-100">
                  <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: p.fill }} />
                  {p.name === 'ManoObra' ? 'Mano de Obra' : p.name === 'Administracion' ? 'Administración' : p.name}
                </span>
                <span className="text-xs font-bold text-steel-900 dark:text-white">
                  {formatCOP(p.value)} <span className="text-steel-400 dark:text-steel-500 font-normal">({pct}%)</span>
                </span>
              </div>
              {items.length > 0 && (
                <div className="ml-4 space-y-0.5 border-l-2 pl-2" style={{ borderColor: p.fill + '40' }}>
                  {items.map((it, idx) => (
                    <div key={`${it.nombre}-${idx}`} className="flex justify-between text-[10px] text-steel-500 dark:text-steel-400">
                      <span className="truncate mr-2">{it.nombre}</span>
                      <span className="font-mono text-steel-600 dark:text-steel-300">{formatCOP(it.valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        <div className="border-t border-steel-100 dark:border-steel-700 mt-2 pt-2 flex justify-between text-xs">
          <span className="font-bold text-steel-700 dark:text-steel-300">Total {esStatic ? (esVenta ? 'Oferta' : 'Costo') : 'Columna'}</span>
          <span className="font-bold text-steel-900 dark:text-white">{formatCOPFull(total)}</span>
        </div>
      </div>
    );
  };



  const chartData = useMemo(() => {
    if (!bcData) return [];

    const getGroupSum = (groupId: string, key: 'venta' | 'costo') => 
      (bcData?.chapters || []).filter((ch: any) => ch.group_id === groupId).reduce((s: number, ch: any) => s + Number(ch[key] || 0), 0);

    const getAiuSum = (predicate: (a: any) => boolean, key: 'venta' | 'costo') =>
      (bcData?.aiu || []).filter(predicate).reduce((s: number, a: any) => s + Number(a[key] || 0), 0);

    const isDetailed = bcData?.chapters && bcData.chapters.length > 0;

    // 1. Venta (Oferta)
    const venta = {
      tipo: 'Venta (Oferta)',
      Materiales: isDetailed ? (getGroupSum('materiales', 'venta') + getGroupSum('suministro', 'venta')) : Number(bcData?.business_case?.venta_materiales || 0),
      Servicios: isDetailed ? getGroupSum('servicios', 'venta') : Number(bcData?.business_case?.venta_servicios || 0),
      ManoObra: isDetailed ? getGroupSum('mano-obra', 'venta') : Number(bcData?.business_case?.venta_mano_obra || 0),
      Administracion: isDetailed ? (getGroupSum('administracion', 'venta') + getAiuSum(a => a.tipo !== 'financiacion' && !a.tipo.startsWith('utilidad'), 'venta')) : Number(bcData?.business_case?.venta_administracion || 0),
      Intereses: isDetailed ? (getGroupSum('intereses', 'venta') + Number(bcData?.aiu?.find((a: any) => a.tipo === 'financiacion')?.venta || 0)) : Number(bcData?.business_case?.venta_intereses || 0),
      Utilidad: isDetailed ? getAiuSum(a => a.tipo.startsWith('utilidad'), 'venta') : (Number(bcData?.business_case?.venta_monto_manual || 0) - (Number(bcData?.business_case?.venta_materiales || 0) + Number(bcData?.business_case?.venta_servicios || 0) + Number(bcData?.business_case?.venta_mano_obra || 0) + Number(bcData?.business_case?.venta_administracion || 0) + Number(bcData?.business_case?.venta_intereses || 0))),
    };

    // 2. Costo (Caso Neg.)
    const costo = {
      tipo: 'Costo (Caso Neg.)',
      Materiales: isDetailed ? (getGroupSum('materiales', 'costo') + getGroupSum('suministro', 'costo')) : Number(bcData?.business_case?.costo_materiales || 0),
      Servicios: isDetailed ? getGroupSum('servicios', 'costo') : Number(bcData?.business_case?.costo_servicios || 0),
      ManoObra: isDetailed ? getGroupSum('mano-obra', 'costo') : Number(bcData?.business_case?.costo_mano_obra || 0),
      Administracion: isDetailed ? (getGroupSum('administracion', 'costo') + getAiuSum(a => a.tipo !== 'financiacion' && !a.tipo.startsWith('utilidad'), 'costo')) : Number(bcData?.business_case?.costo_administracion || 0),
      Intereses: isDetailed ? (getGroupSum('intereses', 'costo') + Number((bcData?.aiu || []).find((a: any) => a.tipo === 'financiacion')?.costo || 0)) : Number(bcData?.business_case?.costo_intereses || 0),
      Utilidad: isDetailed ? (Number(bcData?.business_case?.valor_oferta_total || 0) - Number(bcData?.business_case?.costo_total_con_fin || 0)) : (Number(bcData?.business_case?.venta_monto_manual || 0) - Number(bcData?.business_case?.costo_monto_manual || 0)),
    };

    // 3. Flujo de Caja (Dinámico del Simulador)
    const filteredCats = categorias.filter(c => c.incluirEnGrafico !== false);
    
    // Calculamos los totales por grupo asegurando consistencia con los KPIs
    const materialesFlow = totalGrupo(filteredCats, 'materiales');
    const serviciosFlow = totalGrupo(filteredCats, 'servicios' as any);
    const manoObraFlow = totalGrupo(filteredCats, 'mano_obra');
    const administracionFlow = totalGrupo(filteredCats, 'administracion');
    const interesesFlow = totalGrupo(filteredCats, 'intereses');
    
    const totalEgresosFlow = materialesFlow + serviciosFlow + manoObraFlow + administracionFlow + interesesFlow;

    const projectBAC = isDetailed 
       ? Number(bcData?.business_case?.valor_oferta_total || 0)
       : Number(bcData?.business_case?.venta_monto_manual || 0);

    const projExpense = Number(dashboardData?.cash_flow_summary?.total_projected_expense ?? 0);
    const realExpense = Number(dashboardData?.cash_flow_summary?.total_actual_expense ?? 0);
    const hasFlowCategories = totalEgresosFlow > 0;

    const utilidadFlow = projectBAC > 0 ? (projectBAC - (hasFlowCategories ? totalEgresosFlow : projExpense)) : 0;

    const flujoCaja = {
      tipo: 'Flujo de Caja',
      Materiales: hasFlowCategories ? materialesFlow : 0,
      Servicios: hasFlowCategories ? serviciosFlow : 0,
      ManoObra: hasFlowCategories ? manoObraFlow : 0,
      Administracion: hasFlowCategories ? administracionFlow : 0,
      Intereses: hasFlowCategories ? interesesFlow : 0,
      Proyeccion: hasFlowCategories ? 0 : projExpense,
      Real: 0,
      Utilidad: utilidadFlow,
    };

    // 4. Real Acumulado (Dinámico hasta el mes actual)
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth() + 1;
    const currentMonthKey = `${currentYear}-${currentMonthNum.toString().padStart(2, '0')}`;

    // Filtrar meses desde el inicio del proyecto (2025-10) hasta hoy
    const startIdx = 0; // 2025-10 es el primero en EXCEL_MONTHS
    const currentIdx = EXCEL_MONTHS.indexOf(currentMonthKey);
    // Si el mes actual no está en la lista (ej: antes de Oct 2025), usamos el primero. 
    // Si está después, usamos hasta el último disponible.
    const effectiveIdx = currentIdx === -1 ? (today < new Date(2025, 9, 1) ? -1 : EXCEL_MONTHS.length - 1) : currentIdx;

    const mesesHastaHoy = effectiveIdx >= 0 ? EXCEL_MONTHS.slice(0, effectiveIdx + 1) : [];
    const lastMonthLabel = mesesHastaHoy.length > 0 ? formatMonthKey(mesesHastaHoy[mesesHastaHoy.length - 1]) : '—';

    const sumReal = (grupo: any) =>
      categorias
        .filter(c => c.grupo === grupo && c.incluirEnGrafico !== false)
        .reduce((s, c) => s + mesesHastaHoy.reduce((m, mes) => m + (c.valores[mes] || 0), 0), 0);

    const realMateriales = sumReal('materiales');
    const realServicios = sumReal('servicios' as any);
    const realManoObra = sumReal('mano_obra');
    const realAdministracion = sumReal('administracion');
    const realIntereses = sumReal('intereses');

    const remainingProyeccion = hasFlowCategories 
      ? (totalEgresosFlow - (realMateriales + realServicios + realManoObra + realAdministracion + realIntereses))
      : (projExpense > realExpense ? projExpense - realExpense : 0);

    const realAcum = {
      tipo: `Real Acum. (${lastMonthLabel})`,
      Materiales: hasFlowCategories ? realMateriales : 0,
      Servicios: hasFlowCategories ? realServicios : 0,
      ManoObra: hasFlowCategories ? realManoObra : 0,
      Administracion: hasFlowCategories ? realAdministracion : 0,
      Intereses: hasFlowCategories ? realIntereses : 0,
      Proyeccion: remainingProyeccion > 0 ? remainingProyeccion : 0,
      Real: hasFlowCategories ? 0 : realExpense,
      Utilidad: utilidadFlow,
    };

    return [venta, costo, flujoCaja, realAcum];
  }, [categorias, costoFinancieroNeto, bcData, dashboardData, incluirUtilidadVenta]);

  // ✅ EMPTY STATE: Si no hay datos, no mostrar gráfico
  if (!isLoading && (!bcData || !bcData.business_case)) {
    return (
      <div className="flex h-[400px] flex-col items-center justify-center rounded-2xl border border-dashed border-steel-200 bg-steel-50/50 p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-steel-100 text-steel-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
        </div>
        <h3 className="text-lg font-bold text-steel-700">Sin datos de Caso de Negocio</h3>
        <p className="max-w-xs text-sm text-steel-400">
          Carga el archivo Excel en la sección de Caso de Negocio para visualizar el desglose por capítulos.
        </p>
      </div>
    );
  }

  // ✅ GUARD CLAUSE: Evitar cálculos si los datos no están listos (previene crash en loading)
  if (isLoading || !chartData || chartData.length < 4) {
    return (
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-8 shadow-card flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
        <p className="text-sm text-steel-500 dark:text-steel-400 font-medium italic animate-pulse">
          Procesando desglose presupuestario...
        </p>
      </div>
    );
  }

  const totalV = (chartData[0]?.Materiales || 0) + (chartData[0]?.Servicios || 0) + (chartData[0]?.ManoObra || 0) + (chartData[0]?.Administracion || 0) + (chartData[0]?.Intereses || 0) + (chartData[0]?.Utilidad || 0);

  const isDetailed = bcData?.chapters && bcData.chapters.length > 0;


  const totalC_Base = (chartData[1]?.Materiales || 0) + (chartData[1]?.Servicios || 0) + (chartData[1]?.ManoObra || 0) + (chartData[1]?.Administracion || 0) + (chartData[1]?.Intereses || 0);
  const currentEgresosFlow = (chartData[2]?.Materiales || 0) + (chartData[2]?.Servicios || 0) + (chartData[2]?.ManoObra || 0) + (chartData[2]?.Administracion || 0) + (chartData[2]?.Intereses || 0);
  const margen = totalV > 0 ? (((totalV - currentEgresosFlow) / totalV) * 100).toFixed(1) : '0';

  return (
    <div ref={chartRef} className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-4 shadow-card relative">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-steel-800 dark:text-white">Comparativa Presupuestaria vs Flujo de Caja</h3>
          <p className="text-xs text-steel-500 dark:text-steel-400 mt-1">Oferta vs Costo Base vs Proyección Actualizada (Flujo) vs Ejecución Real</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-steel-700 bg-steel-100/50 px-3 py-1.5 rounded-lg border border-steel-200 cursor-pointer hover:bg-steel-100 transition-colors">
          <input 
            type="checkbox" 
            checked={incluirUtilidadVenta} 
            onChange={(e) => setIncluirUtilidadVenta(e.target.checked)} 
            className="rounded border-steel-300 text-primary-600 focus:ring-primary-500"
          />
          Incluir Utilidad en Oferta
        </label>
      </div>

      <div role="img" aria-label="Gráfico comparativo presupuestario: barras apiladas de Materiales (azul oscuro), Servicios (celeste), Mano de Obra (verde), Administración (violeta) e Intereses (naranja) para Oferta, Costo Base, Proyección Flujo y Ejecución Real">
        <ResponsiveContainer width="100%" height={580}>
          <BarChart 
            data={chartData} 
            margin={{ top: 30, right: 60, bottom: 30, left: 80 }} 
            barCategoryGap="20%" 
            barSize={140}
            onDoubleClick={(data) => {
              if (data && data.activePayload) {
                const barData = data.activePayload[0].payload;
                setActiveBar(activeBar?.tipo === barData.tipo ? null : barData);
              }
            }}
          >
            <CartesianGrid strokeDasharray="6 4" stroke="var(--chart-grid, #c8ccd4)" strokeWidth={1} vertical={false} />
            <XAxis dataKey="tipo" tick={{ fontSize: 10, fill: '#374151', fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCOP(v)} tick={{ fontSize: 10, fill: '#6e7179' }} axisLine={false} tickLine={false} />
            
            {/* Tooltip desactivado para hover */}
            <Tooltip content={<div className="hidden" />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Legend
              wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
              formatter={(value: string) => (
                <span className="text-xs font-medium text-steel-600">
                  {value === 'ManoObra' ? 'Mano de Obra' : value === 'Administracion' ? 'Administración' : value}
                </span>
              )}
            />

            <Bar dataKey="Materiales" name="Materiales" stackId="a" fill="#1b5eab">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Materiales" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Servicios" name="Servicios" stackId="a" fill="#0ea5e9">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Servicios" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="ManoObra" name="ManoObra" stackId="a" fill="#059669">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="ManoObra" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Administracion" name="Administracion" stackId="a" fill="#7c3aed">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Administracion" chartData={chartData} />} />
              <LabelList content={(p: any) => <DottedLine {...p} chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Real" name="Ejecución Real" stackId="a" fill="#8B5CF6">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Real" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Intereses" name="Intereses" stackId="a" fill="#f59e0b">
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Intereses" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Proyeccion" name="Proyeccion" stackId="a" fill="#94a3b8">
              {chartData.map((_, i) => (
                <Cell
                  key={`cell-proj-${i}`}
                  fill={i === 3 ? 'transparent' : '#94a3b8'}
                  stroke={i === 3 ? '#64748b' : 'none'}
                  strokeDasharray={i === 3 ? '5 5' : '0'}
                  strokeWidth={2}
                />
              ))}
              <LabelList content={(p: any) => <SegLabel {...p} segKey="Proyeccion" chartData={chartData} />} />
            </Bar>
            <Bar dataKey="Utilidad" name="Utilidad" stackId="a" fill="#86efac" radius={[5, 5, 0, 0]}>
              {chartData.map((_, i) => (
                <Cell
                  key={`cell-util-${i}`}
                  fill={i === 3 ? 'transparent' : '#86efac'}
                  stroke={i === 3 ? '#059669' : 'none'}
                  strokeDasharray={i === 3 ? '5 5' : '0'}
                  strokeWidth={2}
                />
              ))}
              <LabelList content={(p: any) => <UtilidadLabel {...p} chartData={chartData} />} />
            </Bar>

            <ReferenceLine
              y={totalV}
              stroke="#ef4444"
              strokeDasharray="8 4"
              strokeWidth={2}
              label={{ value: `Oferta Total: ${formatCOP(totalV)}`, position: 'insideTopLeft', fill: '#ef4444', fontSize: 10, fontWeight: 'bold', dy: -22 }}
            />
          </BarChart>
        </ResponsiveContainer>

        {/* Panel de detalle al hacer doble clic */}
        {activeBar && (
          <div 
            className="absolute z-50 pointer-events-auto"
            style={{ 
              left: '50%', 
              top: '50%', 
              transform: 'translate(-50%, -50%)',
            }}
          >
            <CustomTooltip 
              active={true} 
              label={activeBar.tipo} 
              payload={[
                { name: 'Materiales', value: activeBar.Materiales, fill: GRUPOS_COLORS.Materiales },
                { name: 'Servicios', value: activeBar.Servicios, fill: GRUPOS_COLORS.Servicios },
                { name: 'ManoObra', value: activeBar.ManoObra, fill: GRUPOS_COLORS.ManoObra },
                { name: 'Administracion', value: activeBar.Administracion, fill: GRUPOS_COLORS.Administracion },
                { name: 'Intereses', value: activeBar.Intereses, fill: GRUPOS_COLORS.Intereses },
                { name: 'Real', value: activeBar.Real || 0, fill: GRUPOS_COLORS.Real },
                { name: 'Proyeccion', value: activeBar.Proyeccion || 0, fill: GRUPOS_COLORS.Proyeccion },
                { name: 'Utilidad', value: activeBar.Utilidad || 0, fill: GRUPOS_COLORS.Utilidad },
              ].filter(p => p.value !== undefined && p.value > 0) as any} 
            />
            <button 
              onClick={() => setActiveBar(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-[12px] font-bold shadow-xl hover:bg-red-600 transition-all border-2 border-white"
              title="Cerrar detalle"
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {/* KPIs Inferiores */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-steel-100 dark:border-steel-700">
        <div className="bg-blue-50 dark:bg-primary-950/30 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-steel-500 dark:text-steel-400 font-semibold uppercase tracking-wide">Total Oferta</p>
          <p className="text-xs font-bold text-primary-700 dark:text-primary-300 mt-0.5">{formatCOPFull(totalV)}</p>
        </div>
        <div className="bg-steel-50 dark:bg-steel-700/50 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-steel-500 dark:text-steel-400 font-semibold uppercase tracking-wide">Total Costo Base</p>
          <p className="text-xs font-bold text-steel-800 dark:text-steel-100 mt-0.5">{formatCOPFull(totalC_Base)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 text-center border border-emerald-200">
          <p className="text-[10px] text-steel-500 dark:text-steel-400 font-semibold uppercase tracking-wide text-emerald-700">Utilidad (Flujo)</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{formatCOPFull(chartData[2].Utilidad)}</p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-steel-500 dark:text-steel-400 font-semibold uppercase tracking-wide">Margen Act.</p>
          <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">{margen}%</p>
        </div>
        <div className="bg-cyan-50 dark:bg-cyan-950/30 rounded-lg px-3 py-2 text-center">
          <p className="text-[10px] text-steel-500 dark:text-steel-400 font-semibold uppercase tracking-wide">{chartData[3].tipo}</p>
          <p className="text-xs font-bold text-cyan-600 dark:text-cyan-400 mt-0.5">{formatCOPFull(chartData[3].Materiales + chartData[3].Servicios + chartData[3].ManoObra + chartData[3].Administracion + chartData[3].Intereses)}</p>
        </div>
      </div>
    </div>
  );
};

export default ChapterBreakdownChart;
