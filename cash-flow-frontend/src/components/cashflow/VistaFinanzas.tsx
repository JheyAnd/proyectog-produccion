import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { X, FileText, ChevronDown, ChevronRight, BarChart2, List, LayoutGrid, Paperclip, Download, Plus } from 'lucide-react';
import apiClient from '@/services/api/client';
import { formatCOP } from '@/utils/formatNumbers';

interface Props {
  projectId: string;
  onClose: () => void;
}

// ── Colores por sección — paleta clara ──
const SECCION_STYLE: Record<string, { header: string; badge: string; label: string; amount: string }> = {
  'INGRESO':                   { header: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700', amount: 'text-emerald-700' },
  'MATERIALES':                { header: 'bg-blue-50 border-blue-200',       badge: 'bg-blue-100 text-blue-700',       label: 'text-blue-700',    amount: 'text-blue-700'    },
  'MANO DE OBRA':              { header: 'bg-teal-50 border-teal-200',        badge: 'bg-teal-100 text-teal-700',       label: 'text-teal-700',    amount: 'text-teal-700'    },
  'ADMINISTRATIVOS DIRECTIVOS':{ header: 'bg-violet-50 border-violet-200',   badge: 'bg-violet-100 text-violet-700',   label: 'text-violet-700',  amount: 'text-violet-700'  },
  'INTERESES':                 { header: 'bg-amber-50 border-amber-200',      badge: 'bg-amber-100 text-amber-700',     label: 'text-amber-700',   amount: 'text-amber-700'   },
};
const DEFAULT_STYLE = { header: 'bg-gray-50 border-gray-200', badge: 'bg-gray-100 text-gray-600', label: 'text-gray-600', amount: 'text-gray-600' };

// ── Helpers compartidos ──
const GRUPO_A_SECCION: Record<string, string> = {
  ingreso:        'INGRESO',
  materiales:     'MATERIALES',
  mano_obra:      'MANO DE OBRA',
  administracion: 'ADMINISTRATIVOS DIRECTIVOS',
  intereses:      'INTERESES',
};
const SECCION_ORDER = ['INGRESO', 'MATERIALES', 'MANO DE OBRA', 'ADMINISTRATIVOS DIRECTIVOS', 'INTERESES'];
const MESES_ES: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Sep', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};
function mesLabel(periodo: string) {
  try {
    const [year, month] = periodo.split('-');
    return `${MESES_ES[month] || month} ${year.slice(2)}`;
  } catch { return periodo; }
}

// ══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ══════════════════════════════════════════════════════════
export default function VistaFinanzas({ projectId, onClose }: Props) {
  const [mesSeleccionado, setMesSeleccionado] = useState<string | null>(null);
  const [vistaActual, setVistaActual] = useState<'facturas' | 'totales'>('facturas');
  const [previewDoc, setPreviewDoc] = useState<{name: string; type: string; objectUrl: string} | null>(null);

  const handleViewDocument = async (rowId: string, tipo: 'doc-oc' | 'doc-factura', fileName: string) => {
    try {
      const response = await fetch(`/api/v1/v2/projects/${projectId}/cash-flow/cell-details/${rowId}/${tipo}`);
      if (!response.ok) throw new Error('Documento no encontrado');
      
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const mimeType = response.headers.get('content-type') || 'application/octet-stream';

      if (mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf') || mimeType.startsWith('image/')) {
        setPreviewDoc({
          name: fileName,
          type: mimeType,
          objectUrl
        });
      } else {
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(objectUrl);
      }
    } catch (err) {
      alert('Error al visualizar el documento');
    }
  };

  // ── Query vista Por Factura ──
  const { data, isLoading } = useQuery({
    queryKey: ['vistaFinanzas', projectId],
    queryFn: () => apiClient.get(`/projects/${projectId}/cash-flow/finance-view`).then(res => res.data),
    staleTime: 60_000,
  });

  const meses: any[] = data?.meses ?? [];
  const mesActual = meses.find(m => m.periodo === mesSeleccionado) ?? meses[0];

  const formatFecha = (s: string | null) => {
    if (!s) return '';
    try { return new Date(s).toLocaleDateString('es-CO'); } catch { return s; }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-[95vw] h-[90vh] max-w-none max-h-none flex flex-col shadow-2xl border border-gray-200 overflow-hidden relative">

        {/* ── Botón Cerrar Absoluto ── */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors z-10"
        >
          <X size={18} />
        </button>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0 pr-14">
          <div className="flex items-center gap-2">
            <BarChart2 className="text-blue-600" size={20} />
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">Vista finanzas</h2>
              <p className="text-xs text-gray-400 leading-tight">Desglose mensual de egresos con detalle por factura</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* ── Selector de Vista ── */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden shadow-sm">
              <button
                onClick={() => setVistaActual('facturas')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-all
                  ${vistaActual === 'facturas'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                <List size={13} />
                Por Factura
              </button>
              <button
                onClick={() => setVistaActual('totales')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border-l border-gray-200 transition-all
                  ${vistaActual === 'totales'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
              >
                <LayoutGrid size={13} />
                Totales por Mes
              </button>
            </div>
          </div>
        </div>

        {/* Contenedor scrolleable */}
        <div className="flex-1 overflow-y-auto flex flex-col">

        {/* ══════════════════════════════════════════════════════════
            VISTA 1: POR FACTURA (sin cambios)
            ══════════════════════════════════════════════════════════ */}
        {vistaActual === 'facturas' && (
          <>
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : meses.length === 0 ? (
              <div className="px-6 pb-8 text-center text-gray-400 py-16">
                <FileText size={36} className="mx-auto mb-3 opacity-40" />
                <p className="font-medium text-gray-500">Sin períodos registrados</p>
                <p className="text-sm mt-1">No hay facturas cargadas para este proyecto.</p>
              </div>
            ) : (
              <>
                {/* Tabs de meses */}
                <div className="px-6 pt-4 pb-4 flex gap-2 flex-wrap">
                  {meses.map(mes => {
                    const isActive = mes.periodo === (mesSeleccionado ?? meses[0]?.periodo);
                    return (
                      <button
                        key={mes.periodo}
                        onClick={() => setMesSeleccionado(mes.periodo)}
                        className={`text-sm px-4 py-1.5 rounded-full font-medium transition-all
                          ${isActive
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                            : mes.total > 0
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                      >
                        {mes.label}
                      </button>
                    );
                  })}
                </div>

                {/* KPIs del mes */}
                <div className="px-6 pb-4 grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Total egresos del mes</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCOP(mesActual?.total ?? 0)}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-1">Facturas registradas</p>
                    <p className="text-2xl font-bold text-gray-900">{mesActual?.totalFacturas ?? 0}</p>
                  </div>
                </div>

                {/* Secciones */}
                <div className="px-6 pb-6 space-y-2">
                  {mesActual?.secciones?.length === 0 && (
                    <div className="text-center py-10 text-gray-400">
                      <FileText size={32} className="mx-auto mb-3 opacity-30" />
                      <p>Sin movimientos con detalle este mes</p>
                    </div>
                  )}
                  {mesActual?.secciones?.map((seccion: any) => (
                    <SeccionFinanzas
                      key={seccion.nombre}
                      seccion={seccion}
                      formatMonto={formatCOP}
                      formatFecha={formatFecha}
                      onPreviewDoc={handleViewDocument}
                    />
                  ))}
                </div>

                {/* Footer */}
                <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <FileText size={13} />
                    Solo categorías con detalle de factura
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {mesActual?.label}: {formatCOP(mesActual?.total ?? 0)}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════════════
            VISTA 2: TOTALES POR MES
            ══════════════════════════════════════════════════════════ */}
        {vistaActual === 'totales' && (
          <VistaTotalesPorMes projectId={projectId} />
        )}
        </div>
      </div>

      {/* Modal visor de documentos */}
      {previewDoc && createPortal(
        <div
          style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.65)', zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
          onClick={() => {
            URL.revokeObjectURL(previewDoc.objectUrl);
            setPreviewDoc(null);
          }}
        >
          <div
            style={{
              position: 'relative', width: '62vw', height: '78vh', maxWidth: '900px',
              background: '#FFFFFF', borderRadius: '8px', display: 'flex', flexDirection: 'column',
              overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              height: '48px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0 16px', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                <FileText style={{ height: '16px', width: '16px', color: '#EF4444', flexShrink: 0 }} />
                <span style={{ fontWeight: 600, fontSize: '14px', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {previewDoc.name}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <a
                  href={previewDoc.objectUrl}
                  download={previewDoc.name}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
                    background: '#FFFFFF', color: '#4B5563', borderRadius: '8px', fontSize: '10px',
                    fontWeight: 'bold', border: '1px solid #E5E7EB', textDecoration: 'none'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <Download style={{ height: '14px', width: '14px' }} /> Descargar
                </a>
                <button
                  onClick={() => {
                    URL.revokeObjectURL(previewDoc.objectUrl);
                    setPreviewDoc(null);
                  }}
                  style={{
                    padding: '6px', color: '#9CA3AF', borderRadius: '8px', fontWeight: 'bold',
                    cursor: 'pointer', background: 'none', border: 'none', display: 'flex',
                    alignItems: 'center', justifyContent: 'center'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.color = '#EF4444'}
                  onMouseOut={(e) => e.currentTarget.style.color = '#9CA3AF'}
                >
                  <Plus style={{ height: '20px', width: '20px', transform: 'rotate(45deg)' }} />
                </button>
              </div>
            </div>
            <div style={{ flex: 1, background: '#FFFFFF', position: 'relative' }}>
              {previewDoc.type.startsWith('image/') ? (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', overflow: 'auto' }}>
                  <img src={previewDoc.objectUrl} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                </div>
              ) : (
                <iframe src={previewDoc.objectUrl} title={previewDoc.name} style={{ width: '100%', height: '100%', border: 'none', display: 'block' }} />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// VISTA 2: TOTALES POR MES
// ══════════════════════════════════════════════════════════
function VistaTotalesPorMes({ projectId }: { projectId: string }) {
  const { data: cats, isLoading } = useQuery({
    queryKey: ['categoriasAllTotales', projectId],
    queryFn: () => apiClient.get(`/v2/projects/${projectId}/cash-flow/categorias`).then(r => r.data),
    staleTime: 60_000,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const categorias: any[] = cats ?? [];
  if (categorias.length === 0) {
    return (
      <div className="px-6 py-16 text-center text-gray-400">
        <LayoutGrid size={36} className="mx-auto mb-3 opacity-30" />
        <p className="font-medium text-gray-500">Sin datos de categorías</p>
      </div>
    );
  }

  // ── Recopilar todos los meses disponibles ──
  const allMonthsSet = new Set<string>();
  categorias.forEach(cat => {
    Object.keys(cat.valores || {}).forEach(m => allMonthsSet.add(m));
  });
  const allMonths = Array.from(allMonthsSet).sort();

  // ── Agrupar totales por sección × mes ──
  const sectionMap: Record<string, Record<string, number>> = {};
  categorias.forEach(cat => {
    const seccion = GRUPO_A_SECCION[cat.grupo] || cat.grupo?.toUpperCase() || 'OTROS';
    if (!sectionMap[seccion]) sectionMap[seccion] = {};
    Object.entries(cat.valores || {}).forEach(([mes, val]) => {
      sectionMap[seccion][mes] = (sectionMap[seccion][mes] || 0) + Number(val);
    });
  });

  // Ordenar secciones
  const secciones = [
    ...SECCION_ORDER.filter(s => sectionMap[s]),
    ...Object.keys(sectionMap).filter(s => !SECCION_ORDER.includes(s)),
  ];

  // ── Secciones de EGRESO (excluye INGRESO del total) ──
  const seccionesEgreso = secciones.filter(s => s !== 'INGRESO');

  // ── Total EGRESOS por mes (sin INGRESO) ──
  const egresosPorMes: Record<string, number> = {};
  allMonths.forEach(m => {
    egresosPorMes[m] = seccionesEgreso.reduce((sum, sec) => sum + (sectionMap[sec]?.[m] || 0), 0);
  });
  const totalEgresosGeneral = allMonths.reduce((s, m) => s + (egresosPorMes[m] || 0), 0);

  // Color para secciones en la tabla
  const SECCION_COLOR: Record<string, string> = {
    'INGRESO':                   'text-emerald-700 bg-emerald-50',
    'MATERIALES':                'text-blue-700 bg-blue-50',
    'MANO DE OBRA':              'text-teal-700 bg-teal-50',
    'ADMINISTRATIVOS DIRECTIVOS':'text-violet-700 bg-violet-50',
    'INTERESES':                 'text-amber-700 bg-amber-50',
  };

  return <VistaTotalesInner
    allMonths={allMonths}
    secciones={secciones}
    sectionMap={sectionMap}
    seccionesEgreso={seccionesEgreso}
    egresosPorMes={egresosPorMes}
    totalEgresosGeneral={totalEgresosGeneral}
    categorias={categorias}
    SECCION_COLOR={SECCION_COLOR}
  />;
}

// Componente inner con estado (para hooks después de early returns)
function VistaTotalesInner({
  allMonths, secciones, sectionMap, seccionesEgreso,
  egresosPorMes, totalEgresosGeneral, categorias, SECCION_COLOR,
}: {
  allMonths: string[];
  secciones: string[];
  sectionMap: Record<string, Record<string, number>>;
  seccionesEgreso: string[];
  egresosPorMes: Record<string, number>;
  totalEgresosGeneral: number;
  categorias: any[];
  SECCION_COLOR: Record<string, string>;
}) {
  const [selectedMonths, setSelectedMonths] = useState<Set<string>>(new Set());

  const toggleMonth = (m: string) => {
    setSelectedMonths(prev => {
      const next = new Set(prev);
      if (next.has(m)) next.delete(m);
      else next.add(m);
      return next;
    });
  };

  const clearSelection = () => setSelectedMonths(new Set());

  // Meses activos para el cálculo de la selección
  const hasSel = selectedMonths.size > 0;
  const selMonths = allMonths.filter(m => selectedMonths.has(m));

  // Total egresos de los meses seleccionados
  const totalEgresosSeleccion = selMonths.reduce((s, m) => s + (egresosPorMes[m] || 0), 0);

  return (
    <div className="pb-2">
      {/* Subtítulo + barra de selección */}
      <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-500">
          Haz clic en los meses para seleccionarlos y ver su sumatoria
        </p>
        {hasSel && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full">
              {selMonths.length} {selMonths.length === 1 ? 'mes' : 'meses'} seleccionados:&nbsp;
              <span className="font-bold">{formatCOP(totalEgresosSeleccion)}</span>
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors"
            >
              Limpiar
            </button>
          </div>
        )}
      </div>

      {/* Tabla con scroll horizontal */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider sticky left-0 bg-gray-50 min-w-[200px] z-10">
                Sección
              </th>
              {allMonths.map(m => {
                const isSel = selectedMonths.has(m);
                return (
                  <th
                    key={m}
                    onClick={() => toggleMonth(m)}
                    title="Clic para seleccionar este mes"
                    className={`text-right px-3 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap min-w-[100px] cursor-pointer select-none transition-all
                      ${isSel
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-600 hover:bg-blue-50 hover:text-blue-700'}`}
                  >
                    {mesLabel(m)}
                    {isSel && <span className="block text-[9px] font-normal opacity-75 leading-none mt-0.5">✓ sel.</span>}
                  </th>
                );
              })}
              <th className="text-right px-4 py-3 text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap bg-gray-100 border-l border-gray-200 sticky right-0 z-10">
                {hasSel ? 'Sel.' : 'Total'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {secciones.map((sec, idx) => {
              const rowTotalAll = allMonths.reduce((s, m) => s + (sectionMap[sec]?.[m] || 0), 0);
              const rowTotalSel = selMonths.reduce((s, m) => s + (sectionMap[sec]?.[m] || 0), 0);
              const rowTotal = hasSel ? rowTotalSel : rowTotalAll;
              const colorClass = SECCION_COLOR[sec] || 'text-gray-700 bg-white';
              return (
                <tr key={sec} className="hover:bg-gray-50 transition-colors">
                  {/* Nombre sección */}
                  <td className={`px-5 py-3 font-semibold text-xs sticky left-0 z-10 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'}`}>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${colorClass}`}>
                      {sec}
                    </span>
                  </td>
                  {/* Valor por mes */}
                  {allMonths.map(m => {
                    const val = sectionMap[sec]?.[m] || 0;
                    const isSel = selectedMonths.has(m);
                    return (
                      <td
                        key={m}
                        className={`text-right px-3 py-3 tabular-nums transition-colors
                          ${isSel ? 'bg-blue-50' : ''}
                          ${val === 0 ? 'text-gray-300' : 'text-gray-800 font-medium'}`}
                      >
                        {val === 0 ? '—' : formatCOP(val)}
                      </td>
                    );
                  })}
                  {/* Total fila */}
                  <td className={`text-right px-4 py-3 font-bold text-gray-900 tabular-nums border-l border-gray-200 sticky right-0 z-10 ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-gray-100'}`}>
                    {formatCOP(rowTotal)}
                  </td>
                </tr>
              );
            })}

            {/* ── Fila TOTAL EGRESOS (excluye INGRESO) ── */}
            <tr className="border-t-2 border-gray-300 bg-blue-600 text-white">
              <td className="px-5 py-3 font-bold text-xs uppercase tracking-wider sticky left-0 bg-blue-600 z-10">
                TOTAL EGRESOS
              </td>
              {allMonths.map(m => {
                const isSel = selectedMonths.has(m);
                const val = egresosPorMes[m] || 0;
                return (
                  <td
                    key={m}
                    className={`text-right px-3 py-3 font-bold tabular-nums transition-colors
                      ${isSel ? 'bg-blue-500 text-white' : 'text-blue-100'}`}
                  >
                    {val ? formatCOP(val) : '—'}
                  </td>
                );
              })}
              <td className="text-right px-4 py-3 font-bold tabular-nums sticky right-0 bg-blue-700 z-10 border-l border-blue-500">
                {formatCOP(hasSel ? totalEgresosSeleccion : totalEgresosGeneral)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer info */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
        <span className="text-xs text-gray-400">
          {secciones.length} secciones · {allMonths.length} meses · {categorias.length} categorías
          {hasSel && <span className="ml-2 text-blue-500 font-medium">· {selMonths.length} meses seleccionados</span>}
        </span>
        <span className="text-sm font-bold text-gray-900">
          {hasSel
            ? <>Selección: <span className="text-blue-700">{formatCOP(totalEgresosSeleccion)}</span></>
            : <>Total Egresos: {formatCOP(totalEgresosGeneral)}</>
          }
        </span>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// Sección colapsable (Vista Por Factura)
// ══════════════════════════════════════════════════════════
function SeccionFinanzas({ seccion, formatMonto, formatFecha, onPreviewDoc }: any) {
  const [expandida, setExpandida] = useState(true);
  const style = SECCION_STYLE[seccion.nombre] ?? DEFAULT_STYLE;

  return (
    <div className="rounded-xl overflow-hidden border border-gray-200">
      {/* Header de sección */}
      <button
        onClick={() => setExpandida(!expandida)}
        className={`w-full px-4 py-3 flex items-center justify-between transition-all border-b ${style.header}`}
      >
        <div className="flex items-center gap-2">
          {expandida
            ? <ChevronDown size={15} className={style.label} />
            : <ChevronRight size={15} className={style.label} />}
          <span className={`font-bold text-sm ${style.label}`}>{seccion.nombre}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>
            {seccion.categorias.length} categorías con detalle
          </span>
        </div>
        <span className={`font-bold text-sm ${style.amount}`}>{formatMonto(seccion.total)}</span>
      </button>

      {/* Categorías + facturas */}
      {expandida && (
        <div className="bg-white divide-y divide-gray-100">
          {seccion.categorias.map((cat: any) => (
            <div key={cat.nombre} className="px-4 py-2">
              <div className="flex justify-between items-end py-2">
                <div>
                  <p className="font-semibold text-sm text-gray-900">{cat.nombre}</p>
                  <p className="text-[11px] text-gray-400">{cat.detalles.length} facturas</p>
                </div>
                <span className="font-bold text-sm text-gray-700">{formatMonto(cat.total)}</span>
              </div>

              <div className="rounded-lg overflow-hidden mb-1">
                {cat.detalles.map((det: any, idx: number) => (
                  <div
                    key={det.id}
                    className={`flex flex-col py-3 px-4 text-xs
                      ${idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}
                      hover:bg-blue-50 transition-colors`}
                  >
                    {/* LÍNEA 1: N° OC y N° Factura */}
                    <div className="flex items-center gap-2 mb-1">
                      <FileText size={13} className="text-gray-400" />
                      <span className="font-semibold text-gray-800">
                        {det.numero_oc ? `OC: ${det.numero_oc} | ` : ''} Factura: {det.factura !== 'S/N' ? det.factura : 'S/N'}
                      </span>
                    </div>

                    {/* LÍNEA 2: Proveedor, Fecha, Valor */}
                    <div className="flex items-center justify-between ml-5 mb-1.5">
                      <span className="text-gray-600 truncate max-w-[200px]">{det.proveedor || det.nota || '—'}</span>
                      <div className="flex gap-4">
                        <span className="text-gray-500">{formatFecha(det.fecha_factura)}</span>
                        <span className="font-bold text-gray-900">{formatMonto(det.valor)}</span>
                      </div>
                    </div>

                    {/* LÍNEA 3: Links a los documentos (si existen) */}
                    {(det.has_doc_oc || det.has_doc_factura) && (
                      <div className="flex items-center gap-4 ml-5 mt-1">
                        {det.has_doc_oc && (
                          <button onClick={() => onPreviewDoc(det.id, 'doc-oc', det.doc_oc_contrato_nombre || 'documento')} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                            <Paperclip size={12} /> <span className="truncate max-w-[150px]">Doc OC: {det.doc_oc_contrato_nombre || 'documento'}</span>
                          </button>
                        )}
                        {det.has_doc_factura && (
                          <button onClick={() => onPreviewDoc(det.id, 'doc-factura', det.doc_factura_nombre || 'documento')} className="flex items-center gap-1.5 text-blue-600 hover:underline">
                            <Paperclip size={12} /> <span className="truncate max-w-[150px]">Factura: {det.doc_factura_nombre || 'documento'}</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
