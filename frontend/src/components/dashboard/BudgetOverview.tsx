import clsx from 'clsx';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { formatCOP, formatCOPFull } from '@/utils/formatNumbers';

// ============================================================
// DATA — Estructura General del Proyecto (Cruzado entre 3 fuentes)
//
// Fuente 1 — CASO DE NEGOCIO: "Detallado caso de negocio_220126.xlsx"
//   → Hoja "Costo vs Venta": desglose 15 capitulos + AIU + Financiacion
//   → Hoja "Admon Patios": AIU original (A 11%, I 2%, U 4%)
//   → Hoja "RESUMEN VENTA": oferta mercantil $41.013B
//
// Fuente 2 — EJECUCION REAL: "Proyeccion de Pagos Patio Sur.xlsx"
//   → Hoja "Pagos Patio Sur (2)": contratos adjudicados, pagos Feb+Mar
//   → Hoja "CREDITO": $17B a IBR+2.85 → intereses $2.211B
//   → Hoja "Otros Pagos": flujo real disponible $227.5M
//
// Fuente 3 — REPORTE PROYECTO: "Patio Sur_.xlsx"
//   → Costos ejecutados: Mat $7.553B + Admin $500.8M = $8.054B
//   → Valor facturado: $16.745B | Valor pagado: $7.511B
// ============================================================

// ─── OFERTA (Venta al cliente) ────────────────────────────────
// ⚠️ AUDITORÍA: TOTAL_OFERTA hardcoded = 41012884481 COP (VALOR OFICIAL DE PATIO SUR)
// SINCRONIZADO CON: backend/seed_patio_sur.py line 54
// FUENTE: MySQL project_tracking.valor_original_contrato
// Cambiar SOLO si MySQL es actualizado. Ver: PatioSurFinancialService.getOfficialBAC()
const TOTAL_OFERTA = 41012884481;

interface Segment {
  label: string;
  value: number;
  color: string;         // bar fill
  textColor: string;     // label text
}

const ventaSegments: Segment[] = [
  { label: 'Costo Directo (15 caps)',  value: 31224603518, color: 'bg-blue-600',    textColor: 'text-blue-700' },
  { label: 'IVA Carg. + ITS',         value: 781729081,   color: 'bg-blue-400',    textColor: 'text-blue-600' },
  { label: 'Administracion (11%)',     value: 3734163668,  color: 'bg-indigo-500',  textColor: 'text-indigo-700' },
  { label: 'Imprevistos (2%)',         value: 649419768,   color: 'bg-violet-400',  textColor: 'text-violet-700' },
  { label: 'Utilidad (4%) + IVA',      value: 1545619049,  color: 'bg-emerald-500', textColor: 'text-emerald-700' },
  { label: 'Financiacion',            value: 3077349397,   color: 'bg-amber-500',   textColor: 'text-amber-700' },
];

// ─── COSTO PROYECTADO (lo que cuesta ejecutar) ────────────────
// Base: "Costo vs Venta" + financiacion real de "CREDITO"
const TOTAL_COSTO = 30293164387;
const costoSegments: Segment[] = [
  { label: 'Costo Directo (15 caps)',  value: 24274282134, color: 'bg-blue-500',    textColor: 'text-blue-700' },
  { label: 'IVA Carg. + ITS',         value: 630888200,   color: 'bg-blue-300',    textColor: 'text-blue-600' },
  { label: 'Administracion',          value: 2444728897,   color: 'bg-indigo-400',  textColor: 'text-indigo-700' },
  { label: 'Imprevistos',             value: 485485643,    color: 'bg-violet-300',  textColor: 'text-violet-600' },
  { label: 'IVA Utilidad',            value: 246779512,    color: 'bg-slate-400',   textColor: 'text-slate-600' },
  { label: 'Financiacion Real',       value: 2211000000,   color: 'bg-red-500',     textColor: 'text-red-700' },
];

// ─── EJECUCION ────────────────────────────────────────────────
// AC de "Pagos Patio Sur (2)": pagos Feb $7.593B + Mar $1.004B ≈ $8.597B
// Reporte Patio Sur_.xlsx: costos ejecutados $8.054B
// Dashboard usa $8.531B (corte ligeramente posterior)
const AC = 8597143906;           // Pagado real Feb+Mar (fuente: Pagos)
const COMPROMETIDO = 13052418623; // Contratos adjudicados (fuente: Ejec vs Caso Negocio)
const ETC = TOTAL_COSTO - COMPROMETIDO;  // Estimado a completar

const ejecSegments: Segment[] = [
  { label: 'Ejecutado (AC)',       value: AC,                     color: 'bg-red-500',    textColor: 'text-red-700' },
  { label: 'Comprometido (pend.)', value: COMPROMETIDO - AC,      color: 'bg-amber-400',  textColor: 'text-amber-700' },
  { label: 'Por Ejecutar (ETC)',   value: ETC,                    color: 'bg-steel-300',  textColor: 'text-steel-600' },
];

// ─── DETALLE POR CAPITULO ─────────────────────────────────────
// Mapeo completo: Caso de Negocio → Ejecucion → Proyeccion
interface CategoryRow {
  cap: string;
  nombre: string;
  venta: number;
  costoCN: number;    // Costo Caso de Negocio
  negociado: number;  // Comprometido / Adjudicado
  ejecutado: number;  // Pagado real
  margen: number;     // % margen
  risk?: 'loss' | 'low' | 'ok' | 'high';
}

const categories: CategoryRow[] = [
  { cap: '1',  nombre: 'Estudios y Disenos',       venta: 419047180,  costoCN: 312727205,   negociado: 252360920,  ejecutado: 0,          margen: 25.4, risk: 'ok' },
  { cap: '2',  nombre: 'Conexion a la Red',        venta: 519268407,  costoCN: 369435063,   negociado: 0,          ejecutado: 0,          margen: 28.9, risk: 'ok' },
  { cap: '3',  nombre: 'Redes MT (Celdas)',        venta: 2893959054, costoCN: 2046582157,  negociado: 1238615200, ejecutado: 368295250,  margen: 29.3, risk: 'ok' },
  { cap: '4',  nombre: 'Subestaciones (Shelter)',   venta: 3406137000, costoCN: 2692179338,  negociado: 460221135,  ejecutado: 0,          margen: 21.0, risk: 'ok' },
  { cap: '5',  nombre: 'Transformadores',           venta: 2338037308, costoCN: 2115002279,  negociado: 1211417000, ejecutado: 351483685,  margen: 9.5,  risk: 'low' },
  { cap: '6',  nombre: 'Baja Tension (BT)',         venta: 3856386116, costoCN: 2864635880,  negociado: 1988944382, ejecutado: 288497730,  margen: 25.7, risk: 'ok' },
  { cap: '7',  nombre: 'SPE y SPT',                 venta: 262823529,  costoCN: 257800000,   negociado: 0,          ejecutado: 0,          margen: 1.9,  risk: 'low' },
  { cap: '8',  nombre: 'Comunicaciones',             venta: 701469115,  costoCN: 264839198,   negociado: 0,          ejecutado: 0,          margen: 62.2, risk: 'high' },
  { cap: '9',  nombre: 'Suministro Cargadores',     venta: 6743603237, costoCN: 5330376000,  negociado: 4267580000, ejecutado: 4231824600, margen: 21.0, risk: 'ok' },
  { cap: '10', nombre: 'Instalacion Cargadores',    venta: 261567164,  costoCN: 191000000,   negociado: 0,          ejecutado: 0,          margen: 27.0, risk: 'ok' },
  { cap: '11', nombre: 'Iluminacion y Aux.',         venta: 147984032,  costoCN: 125786428,   negociado: 0,          ejecutado: 0,          margen: 15.0, risk: 'ok' },
  { cap: '12', nombre: 'Compensacion Reactiva',     venta: 547200000,  costoCN: 751864128,   negociado: 0,          ejecutado: 0,          margen: -37.4, risk: 'loss' },
  { cap: '13', nombre: 'Deteccion Incendios',       venta: 270082618,  costoCN: 227943849,   negociado: 0,          ejecutado: 0,          margen: 15.6, risk: 'ok' },
  { cap: '14', nombre: 'Obras Civiles',              venta: 8177142400, costoCN: 6537881527,  negociado: 4021596721, ejecutado: 1244000194, margen: 20.0, risk: 'ok' },
  { cap: '15', nombre: 'Tramites',                   venta: 679896358,  costoCN: 186229084,   negociado: 13605060,   ejecutado: 0,          margen: 72.6, risk: 'high' },
];

// ─── HELPERS ──────────────────────────────────────────────────
// Using centralized formatting utilities
const formatB = formatCOP;
const formatFull = formatCOPFull;

const pct = (v: number, total: number) => ((v / total) * 100).toFixed(1);

// ─── STACKED BAR COMPONENT ───────────────────────────────────
function StackedBar({ segments, total, scaleTotal, label, totalLabel }: {
  segments: Segment[]; total: number; scaleTotal: number; label: string; totalLabel: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <p className="text-[10px] font-bold text-steel-600 uppercase tracking-wide">{label}</p>
        <p className="text-xs font-bold text-steel-900">{totalLabel}</p>
      </div>
      <div
        role="img"
        aria-label={`${label}: ${totalLabel}`}
        className="flex h-7 rounded-lg overflow-hidden shadow-inner border border-steel-200"
        style={{ width: `${Math.max((total / scaleTotal) * 100, 25)}%` }}>
        {segments.map((seg, i) => {
          const w = (seg.value / total) * 100;
          if (w < 0.3) return null;
          return (
            <div
              key={i}
              className={clsx('relative group flex items-center justify-center transition-all', seg.color)}
              style={{ width: `${w}%` }}
            >
              {w > 10 && (
                <span className="text-[8px] font-bold text-white/90 truncate px-0.5">
                  {formatB(seg.value)}
                </span>
              )}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20 pointer-events-none">
                <div className="bg-steel-900 text-white rounded-lg px-3 py-2 text-[10px] whitespace-nowrap shadow-lg">
                  <p className="font-bold">{seg.label}</p>
                  <p>{formatFull(seg.value)}</p>
                  <p className="text-steel-300">{pct(seg.value, total)}% del total</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
        {segments.map((seg, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className={clsx('h-2 w-2 rounded-sm flex-shrink-0', seg.color)} />
            <span className="text-[9px] text-steel-400">{seg.label}</span>
            <span className={clsx('text-[9px] font-semibold', seg.textColor)}>{pct(seg.value, total)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RISK BADGE ───────────────────────────────────────────────
function RiskBadge({ risk }: { risk?: string }) {
  if (risk === 'loss') return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-red-100 text-red-700">Perdida</span>;
  if (risk === 'low') return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-amber-100 text-amber-700">Bajo</span>;
  if (risk === 'high') return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-100 text-emerald-700">Alto</span>;
  return <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-steel-100 text-steel-500">OK</span>;
}

// ─── EXECUTION MINI BAR ───────────────────────────────────────
function ExecBar({ negociado, costoCN }: { negociado: number; costoCN: number }) {
  const pctNeg = Math.min((negociado / costoCN) * 100, 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-2 bg-steel-100 rounded-full overflow-hidden min-w-[40px]">
        <div
          className={clsx('h-full rounded-full', pctNeg >= 80 ? 'bg-emerald-400' : pctNeg > 0 ? 'bg-amber-400' : 'bg-steel-200')}
          style={{ width: `${pctNeg}%` }}
        />
      </div>
      <span className="text-[8px] text-steel-400 w-7 text-right">{pctNeg.toFixed(0)}%</span>
    </div>
  );
}

// ─── MAIN COMPONENT ──────────────────────────────────────────
export default function BudgetOverview() {
  const [showDetail, setShowDetail] = useState(false);

  const margen = TOTAL_OFERTA - TOTAL_COSTO;
  const margenPct = (margen / TOTAL_OFERTA) * 100;
  const costoFinOferta = 1375000000;
  const costoFinReal = 2211000000;
  const sobrecosto = costoFinReal - costoFinOferta;

  return (
    <div className="rounded-xl border border-steel-200 bg-white p-5 shadow-card">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-steel-800">Estructura General del Proyecto</h3>
          <p className="text-[9px] text-steel-400 mt-0.5">
            Cruce: Caso de Negocio × Ejecucion × Proyeccion | Corte: Mar 2026
          </p>
        </div>
        <span className="text-[9px] font-medium text-steel-400 bg-steel-50 px-2 py-1 rounded-full border border-steel-200">
          OE 1035
        </span>
      </div>

      <div className="space-y-5">
        {/* Bar 1: OFERTA */}
        <StackedBar
          segments={ventaSegments}
          total={TOTAL_OFERTA}
          scaleTotal={TOTAL_OFERTA}
          label="Valor de Venta (Oferta Mercantil)"
          totalLabel={formatFull(TOTAL_OFERTA)}
        />

        {/* Bar 2: COSTO PROYECTADO — bar proportional to oferta */}
        <StackedBar
          segments={costoSegments}
          total={TOTAL_COSTO}
          scaleTotal={TOTAL_OFERTA}
          label="Costo Total Proyectado (con financiacion real)"
          totalLabel={formatFull(TOTAL_COSTO)}
        />

        {/* Bar 3: EJECUCION */}
        <StackedBar
          segments={ejecSegments}
          total={TOTAL_COSTO}
          scaleTotal={TOTAL_OFERTA}
          label="Ejecucion del Costo (EAC = AC + ETC)"
          totalLabel={`${formatFull(AC)} pagado`}
        />

        {/* Margen + key metrics row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
            <p className="text-[8px] font-bold text-steel-500 uppercase">Margen Ajustado</p>
            <p className="text-base font-bold text-emerald-700">{margenPct.toFixed(1)}%</p>
            <p className="text-[8px] text-steel-400">{formatB(margen)}</p>
          </div>
          <div className="rounded-lg bg-red-50 border border-red-200 p-2.5">
            <p className="text-[8px] font-bold text-steel-500 uppercase">Sobrecosto Financ.</p>
            <p className="text-base font-bold text-red-600">{formatFull(sobrecosto)}</p>
            <p className="text-[8px] text-steel-400">+61% vs oferta</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-2.5">
            <p className="text-[8px] font-bold text-steel-500 uppercase">Comprometido</p>
            <p className="text-base font-bold text-blue-700">{pct(COMPROMETIDO, TOTAL_COSTO)}%</p>
            <p className="text-[8px] text-steel-400">{formatB(COMPROMETIDO)} adjudicado</p>
          </div>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-2.5">
            <p className="text-[8px] font-bold text-steel-500 uppercase">Disponible (Caja)</p>
            <p className="text-base font-bold text-amber-700">{formatFull(227548931)}</p>
            <p className="text-[8px] text-steel-400">Ingreso $16.7B - Pagos</p>
          </div>
        </div>

        {/* Expandable detail table */}
        <div>
          <button
            onClick={() => setShowDetail(!showDetail)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-primary-600 hover:text-primary-700 transition"
          >
            {showDetail ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            {showDetail ? 'Ocultar detalle por capitulo' : 'Ver detalle por capitulo (15 caps)'}
          </button>

          {showDetail && (
            <div className="mt-3 overflow-x-auto rounded-lg border border-steel-200">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="bg-steel-50 border-b border-steel-200">
                    <th scope="col" className="px-2 py-2 text-left font-semibold text-steel-500">#</th>
                    <th scope="col" className="px-2 py-2 text-left font-semibold text-steel-500">Capitulo</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-steel-500">Venta</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-steel-500">Costo CN</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-steel-500">Adjudicado</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold text-steel-500">Pagado</th>
                    <th scope="col" className="px-2 py-2 text-center font-semibold text-steel-500">% Ejec.</th>
                    <th scope="col" className="px-2 py-2 text-center font-semibold text-steel-500">Margen</th>
                    <th scope="col" className="px-2 py-2 text-center font-semibold text-steel-500">Riesgo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-steel-100">
                  {categories.map((c) => (
                    <tr key={c.cap} className={clsx(
                      'hover:bg-steel-50/50',
                      c.risk === 'loss' && 'bg-red-50/40'
                    )}>
                      <td className="px-2 py-1.5 font-bold text-steel-700">{c.cap}</td>
                      <td className="px-2 py-1.5 text-steel-700 whitespace-nowrap">{c.nombre}</td>
                      <td className="px-2 py-1.5 text-right text-steel-600">{formatB(c.venta)}</td>
                      <td className="px-2 py-1.5 text-right text-steel-600">{formatB(c.costoCN)}</td>
                      <td className="px-2 py-1.5 text-right text-steel-600">{c.negociado > 0 ? formatB(c.negociado) : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-steel-800">{c.ejecutado > 0 ? formatB(c.ejecutado) : '—'}</td>
                      <td className="px-2 py-1.5"><ExecBar negociado={c.negociado} costoCN={c.costoCN} /></td>
                      <td className={clsx('px-2 py-1.5 text-center font-bold', c.margen < 0 ? 'text-red-600' : c.margen < 10 ? 'text-amber-600' : 'text-emerald-600')}>
                        {c.margen.toFixed(1)}%
                      </td>
                      <td className="px-2 py-1.5 text-center"><RiskBadge risk={c.risk} /></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-steel-100 border-t border-steel-300 font-bold">
                    <td className="px-2 py-2 text-steel-700" colSpan={2}>COSTO DIRECTO</td>
                    <td className="px-2 py-2 text-right text-steel-800">{formatB(31224603518)}</td>
                    <td className="px-2 py-2 text-right text-steel-800">{formatB(24274282134)}</td>
                    <td className="px-2 py-2 text-right text-steel-800">{formatB(COMPROMETIDO)}</td>
                    <td className="px-2 py-2 text-right text-steel-800">{formatB(AC)}</td>
                    <td className="px-2 py-2"></td>
                    <td className="px-2 py-2 text-center text-emerald-700">22.3%</td>
                    <td className="px-2 py-2"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Sources */}
        <div className="text-[8px] text-steel-400 border-t border-steel-100 pt-2 space-y-0.5">
          <p><strong className="text-steel-500">Fuentes cruzadas:</strong></p>
          <p>• Venta/Costo: "Costo vs Venta" + "RESUMEN VENTA" del Caso de Negocio</p>
          <p>• Adjudicado: "Ejecucion vs Caso de Negocio" del mismo archivo</p>
          <p>• Pagado: "Pagos Patio Sur (2)" de Proyeccion de Pagos (Feb+Mar 2026)</p>
          <p>• Financiacion: "CREDITO" ($17B IBR+2.85, intereses $2.211B)</p>
          <p>• Caja: "Otros Pagos" (Ingreso $16.7B - Pagos $15B = Disp. $228M)</p>
        </div>
      </div>
    </div>
  );
}
