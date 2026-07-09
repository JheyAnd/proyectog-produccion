import { useState, useEffect } from 'react';
import { Maximize2, X, Plus } from 'lucide-react';
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import clsx from 'clsx';

interface ChartDataEntry {
  period: string;
  income: number;
  expense: number;
  net: number;
  accumulated: number;
}

interface CashFlowChartProps {
  data: ChartDataEntry[];
  onMonthClick?: (month: string) => void;
}

function fmtM(v: number): string {
  if (v === 0) return '0';
  const abs = Math.abs(v);
  const sign = v < 0 ? '-' : '';
  // Convert to millions (divide by 1,000,000)
  const millions = abs / 1_000_000;
  return `${sign}${millions.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`;
}

// ── Tooltip personalizado unificado ──────────────────────────────────────────
interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
  dataKey: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-lg px-4 py-3 text-xs min-w-[220px] pointer-events-none">
      <p className="font-bold text-steel-700 dark:text-steel-200 mb-2 border-b border-steel-100 dark:border-steel-700 pb-1">{label}</p>
      <div className="space-y-1.5">
        {payload.map((p) => {
          const isFCA = p.name === 'FCA (Acumulado)';
          const isFCN = p.name === 'FCN';
          const isNegative = p.value < 0;

          // Mostrar solo los 4 indicadores solicitados
          const allowedNames = ['Ingreso', 'Egreso', 'FCN', 'FCA (Acumulado)'];
          if (!allowedNames.includes(p.name)) return null;

          return (
            <div key={p.name} className={`flex items-center justify-between gap-4 ${isFCA ? 'border-t border-steel-100 dark:border-steel-700 mt-1 pt-1.5' : ''}`}>
              <div className="flex items-center gap-1.5">
                <span className="inline-block h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
                <span className={`${(isFCA || isFCN) ? 'font-bold text-steel-800 dark:text-steel-100' : 'text-steel-600 dark:text-steel-300'}`}>{p.name}</span>
              </div>
              <span className={`font-black tabular-nums ${isFCA && isNegative ? 'text-red-600' : isFCA ? 'text-violet-700 dark:text-violet-400' : isFCN && isNegative ? 'text-red-500' : isFCN ? 'text-emerald-600 dark:text-emerald-400' : 'text-steel-800 dark:text-steel-100'}`}>
                {fmtM(p.value)}
                {isFCA && isNegative && ' ⚠️'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Leyenda simplificada ─────────────────────────────────────────────────────
const LEGEND_ITEMS = [
  { key: 'Ingreso',    color: '#3b82f6', type: 'bar'  },
  { key: 'Egreso',     color: '#ef4444', type: 'bar'  },
  { key: 'FCN', color: '#059669', type: 'line' },
  { key: 'FCA (Acumulado)', color: '#7c3aed', type: 'line' },
];

function CustomLegend() {
  return (
    <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 pt-4">
      {LEGEND_ITEMS.map((item) => (
        <div key={item.key} className="flex items-center gap-2 text-[11px] font-bold text-steel-600">
          <span 
            className={`inline-block h-2.5 rounded-sm ${item.type === 'bar' ? 'w-4' : 'w-2.5'}`}
            style={{ background: item.color }} 
          />
          {item.key}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
export default function CashFlowChart({ data, onMonthClick }: CashFlowChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const resetZoom = () => setZoomLevel(1);

  // Close on ESC and reset zoom
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
        resetZoom();
      }
    };
    if (isExpanded) {
      window.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden'; // Prevent scroll
    }
    return () => {
      window.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = 'unset';
    };
  }, [isExpanded]);

  const chartData = data.map((d) => ({
    ...d,
    'Ingreso': d.income,
    'Egreso': -d.expense,
    'FCN': d.net,
    'FCA (Acumulado)': d.accumulated,
  }));

  const renderChart = (height: number | string, width: string = '100%') => (
    <div
      className="h-full"
      style={{ width, minWidth: '100%' }}
      role="img"
      aria-label="Gráfico de flujo de caja: barras de ingresos (azul) y egresos (rojo), línea de flujo neto (verde) y flujo acumulado (violeta)"
    >
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
          barCategoryGap="35%"
          onClick={(state: any) => {
            if (state && state.activeLabel && onMonthClick) {
              onMonthClick(state.activeLabel);
            }
          }}
          style={onMonthClick ? { cursor: 'pointer' } : undefined}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />

          <XAxis
            dataKey="period"
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            axisLine={{ stroke: '#e2e8f0' }}
            tickLine={false}
          />

          <YAxis
            tickFormatter={fmtM}
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
            width={70}
          />

          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: '#f8fafc', opacity: 0.5 }}
          />

          <ReferenceLine y={0} stroke="#cbd5e1" strokeWidth={1} />

          <Bar 
            dataKey="Ingreso" 
            fill="#3b82f6" 
            radius={[4, 4, 0, 0]} 
            maxBarSize={30} 
            onClick={(data) => onMonthClick && onMonthClick(data.period)}
          />
          <Bar 
            dataKey="Egreso" 
            fill="#ef4444" 
            radius={[0, 0, 4, 4]} 
            maxBarSize={30} 
            onClick={(data) => onMonthClick && onMonthClick(data.period)}
          />

          <Line
            type="monotone"
            dataKey="FCN"
            stroke="#059669"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls
          />

          <Line
            type="monotone"
            dataKey="FCA (Acumulado)"
            stroke="#7c3aed"
            strokeWidth={3}
            dot={(props: { cx: number; cy: number; index: number }) => {
              const val = chartData[props.index]['FCA (Acumulado)'];
              const isNeg = val < 0;
              return (
                <circle
                  key={props.index}
                  cx={props.cx}
                  cy={props.cy}
                  r={isNeg ? 5 : 4}
                  fill={isNeg ? '#ef4444' : '#7c3aed'}
                  stroke="#fff"
                  strokeWidth={2}
                />
              );
            }}
            connectNulls
          />

          <Legend content={<CustomLegend />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );

  return (
    <>
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-8 shadow-card relative group">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h3 className="text-base font-bold text-steel-800 dark:text-white">Flujo de Caja Operativo</h3>
            <p className="text-[11px] text-steel-400 dark:text-steel-500 mt-0.5">
              Sincronizado con matriz de costos · Azul (Ingresos) / Rojo (Egresos)
            </p>
          </div>
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 rounded-lg bg-steel-50 dark:bg-steel-700 text-steel-500 hover:bg-steel-100 dark:hover:bg-steel-600 transition-colors"
            title="Expandir gráfico"
          >
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {renderChart(600)}
      </div>

      {/* Vista Expandida (Modal) */}
      {isExpanded && (
        <div className="fixed inset-0 z-[9999] bg-white dark:bg-steel-950 flex flex-col p-4 sm:p-8 overflow-hidden">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6 gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-50 dark:bg-primary-900/30 rounded-lg">
                <Maximize2 className="h-5 w-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-steel-900 dark:text-white">
                  Flujo de Caja Operativo (Vista Detallada)
                </h3>
                <p className="text-xs text-steel-500 dark:text-steel-400 mt-0.5">
                  Análisis mensual detallado con controles de zoom.
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 bg-steel-100/50 dark:bg-steel-900 p-1.5 rounded-xl border border-steel-200 dark:border-steel-800 shadow-sm">
              <div className="flex items-center gap-1 border-r border-steel-200 dark:border-steel-800 pr-3 mr-1">
                <button
                  onClick={() => setZoomLevel(Math.max(1, zoomLevel - 0.5))}
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-steel-800 text-steel-600 dark:text-steel-400 transition-all disabled:opacity-30"
                  disabled={zoomLevel <= 1}
                  title="Alejar"
                >
                  <div className="h-5 w-5 flex items-center justify-center font-bold text-xl">−</div>
                </button>
                <div className="min-w-[4.5rem] text-center">
                  <span className="text-[10px] font-black text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/40 px-2 py-1 rounded">
                    {zoomLevel === 1 ? 'TOTAL' : `${(zoomLevel * 100).toFixed(0)}%`}
                  </span>
                </div>
                <button
                  onClick={() => setZoomLevel(Math.min(4, zoomLevel + 0.5))}
                  className="p-2 rounded-lg hover:bg-white dark:hover:bg-steel-800 text-steel-600 dark:text-steel-400 transition-all disabled:opacity-30"
                  disabled={zoomLevel >= 4}
                  title="Acercar"
                >
                  <Plus className="h-5 w-5" />
                </button>
              </div>

              <button
                onClick={() => {
                  setIsExpanded(false);
                  resetZoom();
                }}
                className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                title="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-h-0 bg-white dark:bg-steel-900 rounded-2xl border border-steel-100 dark:border-steel-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <div className="h-full min-h-[500px]" style={{ width: `${zoomLevel * 100}%` }}>
                {renderChart('95%')}
              </div>
            </div>
          </div>
          
          <div className="mt-4 flex justify-between items-center px-2">
            <div className="text-[10px] text-steel-400 uppercase tracking-widest font-bold flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {zoomLevel > 1 ? 'Desliza para navegar' : 'Vista general activa'}
            </div>
            <div className="text-[10px] text-steel-400 font-medium">
              Esc para cerrar · Click en barras para detalle
            </div>
          </div>
        </div>
      )}
    </>
  );
}
