import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  ComposedChart,
} from 'recharts';
import { cronogramaApi, CronogramaCorte } from '@/services/api/cronograma';




// Format date for display
const fmtDate = (d: string) => {
  if (!d || !d.includes('-')) return d || '—';
  const parts = d.split('-');
  if (parts.length < 3) return d;
  
  // Handle both YYYY-MM-DD and DD-MM-YYYY if needed, 
  // but usually it's YYYY-MM-DD from MySQL
  const m = parts[1];
  const day = parts[2];
  
  const months: Record<string, string> = {
    '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr', '05': 'May', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
  };
  return months[m] ? `${parseInt(day)} ${months[m]}` : d;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white dark:bg-steel-800 rounded-xl border border-steel-200 dark:border-steel-700 shadow-lg px-4 py-3 text-xs">
      <p className="font-bold text-steel-800 dark:text-steel-100 mb-1">
        {d.week} — {fmtDate(d.date)}
        {d.isCustom && <span className="ml-2 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">Nuevo corte</span>}
      </p>
      <p className="text-primary-600">Planeado: <span className="font-bold">{d.planeado.toFixed(2)}%</span></p>
      {d.ejecutado !== null && (
        <>
          <p className="text-emerald-600">Ejecutado: <span className="font-bold">{d.ejecutado.toFixed(2)}%</span></p>
          <p className={d.ejecutado >= d.planeado ? 'text-emerald-600' : 'text-red-500'}>
            Δ: <span className="font-bold">{(d.ejecutado - d.planeado) >= 0 ? '+' : ''}{(d.ejecutado - d.planeado).toFixed(2)}%</span>
          </p>
        </>
      )}
    </div>
  );
};

interface Props {
  projectId?: string;
  proyectado?: any[];
  cortes?: any[];
}

export default function SCurveChart({ 
  projectId: propsProjectId,
  proyectado: propsProyectado,
  cortes: propsCortes
}: Props) {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = propsProjectId || urlProjectId || 'patio-sur-oe1035';
  
  const [internalCortes, setInternalCortes] = useState<CronogramaCorte[]>([]);
  const [internalProyectado, setInternalProyectado] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    if (propsCortes && propsProyectado) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const cortesData = await cronogramaApi.listCortes(projectId);
      setInternalCortes(cortesData);
      
      try {
        const proyectadoData = await cronogramaApi.getProyectado(projectId);
        setInternalProyectado(proyectadoData);
      } catch {
        // Ignorar si falla o no aplica
      }
    } catch (err) {
      console.error('Error al cargar datos de cronograma:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId, propsCortes, propsProyectado]);

  const cortes = Array.isArray(propsCortes) ? propsCortes : (Array.isArray(internalCortes) ? internalCortes : []);
  const proyectado = Array.isArray(propsProyectado) ? propsProyectado : (Array.isArray(internalProyectado) ? internalProyectado : []);

  // Combinar datos para el gráfico
  const mergedData = useMemo(() => {
    if (proyectado.length === 0) {
      return cortes.map((c) => {
        const weekNum = c.semana;
        const showLabel = weekNum % 2 === 0;
        const dateStr = c.fecha_corte || '';
        return {
          week: `S-${weekNum.toString().padStart(2, '0')}`,
          date: dateStr,
          planeado: Number(c.avance_planeado),
          ejecutado: c.avance_ejecutado !== null ? Number(c.avance_ejecutado) : null,
          isCustom: c.origen === 'snapshot_usuario',
          label: showLabel ? fmtDate(dateStr) : '',
          displayLabel: `S-${weekNum.toString().padStart(2, '0')} (${fmtDate(dateStr)})`,
        };
      });
    }

    const mapaEjec: Record<number, { avance: number; isCustom: boolean; fecha?: string }> = {};
    
    const maxWeekWithData = cortes.reduce((max, c) => Number(c.avance_ejecutado) > 0 ? Math.max(max, c.semana) : max, -1);

    cortes.forEach((c) => {
      if (c.avance_ejecutado !== null && c.semana <= maxWeekWithData) {
        mapaEjec[c.semana] = {
          avance: Number(c.avance_ejecutado),
          isCustom: c.origen === 'snapshot_usuario',
          fecha: c.fecha_corte || undefined
        };
      }
    });

    return proyectado.map((p) => {
      const weekNum = p.semana;
      const showLabel = weekNum % 2 === 0;
      const ejecInfo = mapaEjec[weekNum];
      const dateStr = ejecInfo?.fecha || p.fecha_semana || '';
      return {
        week: `S-${weekNum.toString().padStart(2, '0')}`,
        date: dateStr,
        planeado: Number(p.avance_planeado),
        ejecutado: ejecInfo ? ejecInfo.avance : null,
        isCustom: ejecInfo ? ejecInfo.isCustom : false,
        label: showLabel ? fmtDate(dateStr) : '',
        displayLabel: `S-${weekNum.toString().padStart(2, '0')} (${fmtDate(dateStr)})`,
      };
    });
  }, [proyectado, cortes]);

  if (loading) {
    return (
      <div className="h-[420px] flex items-center justify-center bg-white dark:bg-steel-800 rounded-xl border border-steel-200">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (mergedData.length === 0) {
    return (
      <div className="h-[420px] flex flex-col items-center justify-center bg-white dark:bg-steel-800 rounded-xl border border-steel-200">
        <p className="text-steel-400 text-sm">No hay datos de cronograma para este proyecto.</p>
        <p className="text-steel-400 text-[10px] mt-1">Carga el cronograma o crea un corte semanal para ver la Curva S.</p>
      </div>
    );
  }

  // Semana actual = última con avance real (si no hay ninguna, mostramos la primera semana con ejec = null)
  const lastRealIdx = mergedData.reduce((acc, d, i) => d.ejecutado !== null ? i : acc, -1);
  const currentIdx = lastRealIdx >= 0 ? lastRealIdx : 0;
  const currentData = mergedData[currentIdx];

  const currentPlaneado = currentData ? currentData.planeado : 0;
  const currentEjecutado = currentData ? currentData.ejecutado : null;
  
  const hasEjecutado = currentEjecutado !== null && currentEjecutado !== undefined;
  const desviacion = hasEjecutado ? (currentEjecutado as number) - currentPlaneado : 0;
  const spiCurva = hasEjecutado ? (currentPlaneado > 0 ? (currentEjecutado as number) / currentPlaneado : 0) : 0;

  const snapshotCortes = cortes.filter(c => c.origen === 'snapshot_usuario');
  const hasSnapshots = snapshotCortes.length > 0;

  return (
    <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-6 shadow-card">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-bold text-steel-800">
            Curva S — Avance del Proyecto
          </h3>
          <p className="text-xs text-steel-400 mt-1">
            Progreso acumulado ponderado semanal (Jun 2025 - Sep 2026) | 515 actividades | Fuente: Curva S (19 mar) Pablo.xlsx
            {hasSnapshots && (
              <span className="ml-2 text-emerald-600 font-medium">
                + {snapshotCortes.length} corte{snapshotCortes.length > 1 ? 's' : ''} nuevo{snapshotCortes.length > 1 ? 's' : ''} ({snapshotCortes.map(c => `S-${c.semana.toString().padStart(2, '0')}`).join(', ')})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-primary-600 rounded" />
            <span className="text-steel-500">Planeado</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-0.5 bg-emerald-600 rounded" />
            <span className="text-steel-500">Ejecutado</span>
          </div>
        </div>
      </div>

      <div role="img" aria-label="Curva S del proyecto: línea azul de avance planeado y línea verde de avance ejecutado real, expresados en porcentaje de avance por semana">
      <ResponsiveContainer width="100%" height={420}>
        <ComposedChart data={mergedData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
          <defs>
            <linearGradient id="gradPlan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1b5eab" stopOpacity={0.08} />
              <stop offset="95%" stopColor="#1b5eab" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradReal" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#16a34a" stopOpacity={0.12} />
              <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #ecedef)" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 8, fill: '#6e7179' }}
            tickLine={false}
            interval="preserveStartEnd"
            height={42}
            angle={-30}
            textAnchor="end"
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 11, fill: '#6e7179' }}
            tickLine={false}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Línea de corte actual */}
          {hasEjecutado && (
            <ReferenceLine
              x={mergedData[currentIdx].label || ''}
              stroke={currentData.isCustom ? '#16a34a' : '#8b8e96'}
              strokeDasharray="4 4"
              label={{
                value: `${currentData.week} (${fmtDate(currentData.date)})`,
                position: 'top',
                fontSize: 9,
                fill: currentData.isCustom ? '#16a34a' : '#6e7179',
              }}
            />
          )}

          {/* Áreas de relleno */}
          <Area type="monotone" dataKey="planeado" fill="url(#gradPlan)" stroke="none" />
          <Area type="monotone" dataKey="ejecutado" fill="url(#gradReal)" stroke="none" connectNulls={false} />

          {/* Líneas principales */}
          <Line
            type="monotone"
            dataKey="planeado"
            stroke="#1b5eab"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#1b5eab', stroke: '#fff', strokeWidth: 2 }}
          />
          <Line
            type="monotone"
            dataKey="ejecutado"
            stroke="#16a34a"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 5, fill: '#16a34a', stroke: '#fff', strokeWidth: 2 }}
            connectNulls={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* Métricas resumen */}
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-4 border-t border-steel-100 dark:border-steel-700 pt-4">
        <div className="text-center">
          <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Semana Actual</p>
          <p className="text-sm font-bold text-steel-800 dark:text-steel-100 flex items-center justify-center gap-1">
            {hasEjecutado ? currentData.week : 'S-00'}
            {hasEjecutado && currentData.isCustom && (
              <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">Nuevo</span>
            )}
          </p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500">
            {hasEjecutado ? fmtDate(currentData.date) : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Avance Planificado</p>
          <p className="text-lg font-bold text-primary-600">{currentPlaneado.toFixed(1)}%</p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Avance Real</p>
          <p className="text-lg font-bold text-emerald-600">
            {hasEjecutado ? `${(currentEjecutado as number).toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">Desviacion</p>
          <p className={`text-lg font-bold ${desviacion >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {hasEjecutado ? `${desviacion >= 0 ? '+' : ''}${desviacion.toFixed(1)}%` : '—'}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[10px] text-steel-400 dark:text-steel-500 uppercase tracking-wide font-medium">SPI (Curva S)</p>
          <p className={`text-lg font-bold ${spiCurva >= 1 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {hasEjecutado ? spiCurva.toFixed(2) : '—'}
          </p>
          <p className="text-[10px] text-steel-400 dark:text-steel-500">Real / Planeado</p>
        </div>
      </div>
    </div>
  );
}
