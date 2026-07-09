/**
 * Modal para editar detalles de una celda del Flujo de Caja.
 *
 * Doble clic en celda → abre este modal.
 * Permite agregar/editar/eliminar detalles (factura, proveedor, valor, nota, fecha, doc).
 * El total de la celda = SUMA de detalles activos (autocalculado).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Plus, Trash2, Save, Loader2, Calendar, FileText, Paperclip, Check, Download } from 'lucide-react';
import clsx from 'clsx';
import {
  cashFlowV2API,
  type CellDetail,
  type CellDetailInput,
} from '@/services/api/cashFlowV2';

interface Props {
  open: boolean;
  onClose: () => void;
  projectId: string;
  categoriaId: string;
  categoriaNombre: string;
  mesKey: string;             // "2026-04"
  mesLabel: string;           // "Abr 2026"
  onSaved?: (totalCelda: number, tieneDetalles: boolean) => void;
}

interface DraftRow extends CellDetailInput {
  incluir_en_grafico: boolean;
  _localKey: string;          // key React (cuando aún no hay id)
  has_doc_oc?: boolean;
  doc_oc_contrato_nombre?: string | null;
  has_doc_factura?: boolean;
  doc_factura_nombre?: string | null;
}

function formatCOP(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0
  }).format(n);
}

interface ValorInputProps {
  value: number;
  onChange: (val: number) => void;
  className?: string;
}

function ValorInput({ value, onChange, className }: ValorInputProps) {
  const formatMiles = (val: string | number): string => {
    const clean = String(val).replace(/\./g, '');
    if (!clean || isNaN(Number(clean))) return '';
    return Number(clean).toLocaleString('es-CO');
  };

  const [displayValue, setDisplayValue] = useState<string>(
    value === 0 ? '' : formatMiles(value)
  );

  useEffect(() => {
    const formattedParent = value === 0 ? '' : formatMiles(value);
    const cleanLocal = displayValue.replace(/\./g, '');
    if (Number(cleanLocal) !== value) {
      setDisplayValue(formattedParent);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\./g, '');
    if (raw === '' || /^\d+$/.test(raw)) {
      setDisplayValue(formatMiles(raw));
      const numericVal = raw === '' ? 0 : Number(raw);
      onChange(numericVal);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      placeholder="0"
    />
  );
}

export default function CellDetailModal({
  open, onClose, projectId, categoriaId, categoriaNombre, mesKey, mesLabel, onSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [rows, setRows] = useState<DraftRow[]>([]);
  const [proveedores, setProveedores] = useState<string[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{name: string; type: string; objectUrl: string} | null>(null);

  const initialJsonRef = useRef<string>('');

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

  // Cargar datos al abrir
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);

    Promise.all([
      cashFlowV2API.getCellDetails(projectId, categoriaId, mesKey),
      cashFlowV2API.listProveedores(projectId).catch(() => [] as string[]),
    ])
      .then(([summary, provs]) => {
        const draftRows: DraftRow[] = summary.detalles
          .filter((d: CellDetail) => !d.is_deleted)
          .map((d: CellDetail) => ({
            _localKey: d.id,
            id: d.id,
            numero_oc: d.numero_oc || '',
            numero_factura: d.numero_factura,
            proveedor: d.proveedor || '',
            valor: Number(d.valor),
            nota: d.nota || '',
            fecha_factura: d.fecha_factura || null,
            documento_id: d.documento_id || null,
            has_doc_oc: d.has_doc_oc,
            doc_oc_contrato_nombre: d.doc_oc_contrato_nombre,
            has_doc_factura: d.has_doc_factura,
            doc_factura_nombre: d.doc_factura_nombre,
            is_deleted: false,
            incluir_en_grafico: d.incluir_en_grafico ?? true,
          }));
        setRows(draftRows);
        setProveedores(provs);
        initialJsonRef.current = JSON.stringify(draftRows);
      })
      .catch((err) => {
        setError(err?.response?.data?.detail || err?.message || 'Error al cargar');
      })
      .finally(() => setLoading(false));
  }, [open, projectId, categoriaId, mesKey]);

  const totalCelda = useMemo(() => {
    return rows
      .filter(r => !r.is_deleted && r.incluir_en_grafico)
      .reduce((s, r) => s + (Number(r.valor) || 0), 0);
  }, [rows]);

  const hasChanges = useMemo(() => {
    return JSON.stringify(rows) !== initialJsonRef.current;
  }, [rows]);

  const handleAddRow = () => {
    setRows(prev => [
      ...prev,
      {
        _localKey: `new_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        id: null,
        numero_oc: '',
        numero_factura: '',
        proveedor: '',
        valor: 0,
        nota: '',
        fecha_factura: null,
        documento_id: null,
        is_deleted: false,
        incluir_en_grafico: true,
      },
    ]);
  };

  const handleRemoveRow = (localKey: string) => {
    setRows(prev =>
      prev.map(r =>
        r._localKey === localKey
          ? (r.id ? { ...r, is_deleted: true } : { ...r, _shouldRemove: true } as any)
          : r
      ).filter((r: any) => !r._shouldRemove)
    );
  };

  const updateRow = (localKey: string, patch: Partial<DraftRow>) => {
    setRows(prev => prev.map(r => r._localKey === localKey ? { ...r, ...patch } : r));
  };

  const handleSave = async () => {
    // Validación
    const visibleRows = rows.filter(r => !r.is_deleted);
    for (const r of visibleRows) {
      if (!r.numero_factura?.trim()) {
        setError('El N° de Factura es requerido en todas las filas');
        return;
      }
      if (r.valor === undefined || r.valor === null || isNaN(Number(r.valor))) {
        setError(`Valor inválido en factura "${r.numero_factura}"`);
        return;
      }
    }

    setSaving(true);
    setError(null);
    try {
      const result = await cashFlowV2API.bulkUpsertCellDetails(
        projectId, categoriaId, mesKey,
        rows.map(({ _localKey, ...rest }) => rest)
      );
      const activeDetailsCount = rows.filter(r => !r.is_deleted).length;
      onSaved?.(result.total_celda, activeDetailsCount > 0);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      const confirmar = window.confirm(
        '¿Deseas cerrar sin guardar? Los cambios ingresados se perderán.'
      );
      if (!confirmar) return; // el usuario eligió quedarse
    }
    onClose(); // cerrar solo si no hay cambios o el usuario confirmó
  };

  if (!open) return null;

  const visibleRows = rows.filter(r => !r.is_deleted);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-steel-800 rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-none max-h-none flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-5 border-b border-steel-200 dark:border-steel-700">
          <div>
            <h2 className="text-lg font-bold text-steel-900 dark:text-white">
              Detalle: {categoriaNombre}
            </h2>
            <p className="text-xs text-steel-500 dark:text-steel-400 mt-0.5">
              <Calendar className="inline h-3 w-3 mr-1" />{mesLabel}
              <span className="mx-2">·</span>
              <span className="font-semibold">Total: {formatCOP(totalCelda)}</span>
              <span className="mx-2">·</span>
              {visibleRows.length} {visibleRows.length === 1 ? 'detalle' : 'detalles'}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-lg transition"
          >
            <X className="h-5 w-5 text-steel-600 dark:text-steel-400" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
              ⚠️ {error}
            </div>
          ) : visibleRows.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-steel-300 dark:text-steel-600 mb-3" />
              <p className="text-sm text-steel-500 dark:text-steel-400">
                No hay detalles cargados para esta celda.
              </p>
              <button
                onClick={handleAddRow}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-semibold"
              >
                <Plus className="h-4 w-4" /> Agregar primer detalle
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-steel-500 dark:text-steel-400 border-b border-steel-200 dark:border-steel-700">
                    <th className="hidden text-center p-2 w-[3%]">Inc.</th>
                    <th className="text-center p-2 w-[10%]">Doc OC/Contrato *</th>
                    <th className="text-left p-2 w-[10%]">N° OC *</th>
                    <th className="text-left p-2 w-[12%]">Proveedor</th>
                    <th className="text-right p-2 w-[12%]">Valor (COP) *</th>
                    <th className="text-left p-2 w-[10%]">Fecha Fact.</th>
                    <th className="text-left p-2 w-[10%]">N° Factura *</th>
                    <th className="text-center p-2 w-[10%]">Doc Factura *</th>
                    <th className="text-left p-2 w-[15%]">Nota</th>
                    <th className="text-center p-2 w-[8%]">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row) => (
                    <tr
                      key={row._localKey}
                      className={clsx(
                        "border-b border-steel-100 dark:border-steel-700/50 hover:bg-steel-50/50 dark:hover:bg-steel-700/30",
                        !row.incluir_en_grafico && "opacity-60 grayscale-[0.5]"
                      )}
                    >
                      <td className="hidden p-2 text-center">
                        <button
                          onClick={() => updateRow(row._localKey, { incluir_en_grafico: !row.incluir_en_grafico })}
                          className={clsx(
                            "mx-auto flex items-center justify-center w-4 h-4 rounded transition-all border shrink-0",
                            row.incluir_en_grafico 
                              ? "bg-primary-500 border-primary-600 shadow-sm" 
                              : "bg-white dark:bg-steel-700 border-steel-300 dark:border-steel-600"
                          )}
                          title={row.incluir_en_grafico ? "Incluido (clic para excluir)" : "Excluido (clic para incluir)"}
                        >
                          {row.incluir_en_grafico && <Check className="h-3 w-3 text-white stroke-[3px]" />}
                        </button>
                      </td>
                      <td className="p-2 text-center">
                        {row.has_doc_oc && !row.doc_oc_file ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleViewDocument(row.id as string, 'doc-oc', row.doc_oc_contrato_nombre || 'documento')}
                              className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Paperclip className="h-3 w-3" /> Ver
                            </button>
                            <label className="text-[9px] text-steel-500 cursor-pointer hover:text-steel-700">
                              Reemplazar
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => updateRow(row._localKey, { doc_oc_file: e.target.files?.[0] || null })}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <label className="cursor-pointer bg-steel-100 hover:bg-steel-200 dark:bg-steel-700 dark:hover:bg-steel-600 text-steel-700 dark:text-steel-300 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                              <Paperclip className="h-3 w-3" /> {row.doc_oc_file ? 'Archivo listo' : 'Subir'}
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => updateRow(row._localKey, { doc_oc_file: e.target.files?.[0] || null })}
                              />
                            </label>
                            {row.doc_oc_file && <span className="text-[9px] text-primary-600 mt-1 truncate max-w-[60px]">{row.doc_oc_file.name}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.numero_oc || ''}
                          onChange={(e) => updateRow(row._localKey, { numero_oc: e.target.value })}
                          placeholder="OC-001..."
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          list="proveedores-list"
                          value={row.proveedor || ''}
                          onChange={(e) => updateRow(row._localKey, { proveedor: e.target.value })}
                          placeholder="Starcharge..."
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <ValorInput
                          value={row.valor}
                          onChange={(val) => updateRow(row._localKey, { valor: val })}
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs text-right font-mono focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="date"
                          value={row.fecha_factura || ''}
                          onChange={(e) => updateRow(row._localKey, { fecha_factura: e.target.value || null })}
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.numero_factura}
                          onChange={(e) => updateRow(row._localKey, { numero_factura: e.target.value })}
                          placeholder="FV-001234"
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        {row.has_doc_factura && !row.doc_factura_file ? (
                          <div className="flex flex-col items-center gap-1">
                            <button
                              onClick={() => handleViewDocument(row.id as string, 'doc-factura', row.doc_factura_nombre || 'documento')}
                              className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-semibold"
                            >
                              <Paperclip className="h-3 w-3" /> Ver
                            </button>
                            <label className="text-[9px] text-steel-500 cursor-pointer hover:text-steel-700">
                              Reemplazar
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => updateRow(row._localKey, { doc_factura_file: e.target.files?.[0] || null })}
                              />
                            </label>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <label className="cursor-pointer bg-steel-100 hover:bg-steel-200 dark:bg-steel-700 dark:hover:bg-steel-600 text-steel-700 dark:text-steel-300 rounded px-2 py-1 text-[10px] flex items-center gap-1">
                              <Paperclip className="h-3 w-3" /> {row.doc_factura_file ? 'Archivo listo' : 'Subir'}
                              <input 
                                type="file" 
                                className="hidden" 
                                onChange={(e) => updateRow(row._localKey, { doc_factura_file: e.target.files?.[0] || null })}
                              />
                            </label>
                            {row.doc_factura_file && <span className="text-[9px] text-primary-600 mt-1 truncate max-w-[60px]">{row.doc_factura_file.name}</span>}
                          </div>
                        )}
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={row.nota || ''}
                          onChange={(e) => updateRow(row._localKey, { nota: e.target.value })}
                          placeholder="Observaciones..."
                          className="w-full px-2 py-1 rounded border border-steel-300 dark:border-steel-600 bg-white dark:bg-steel-900 text-steel-900 dark:text-white text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <button
                          onClick={() => handleRemoveRow(row._localKey)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-red-500 hover:text-red-700 transition"
                          title="Eliminar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-steel-300 dark:border-steel-600 font-bold">
                    <td colSpan={2} className="p-2 text-right text-steel-700 dark:text-steel-200">TOTAL CELDA:</td>
                    <td className="p-2 text-right font-mono text-primary-600 dark:text-primary-400">
                      {formatCOP(totalCelda)}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
              {/* Datalist para autocomplete de proveedores */}
              <datalist id="proveedores-list">
                {proveedores.map((p) => <option key={p} value={p} />)}
              </datalist>

              <button
                onClick={handleAddRow}
                className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 border border-primary-300 dark:border-primary-700 text-primary-700 dark:text-primary-300 hover:bg-primary-50 dark:hover:bg-primary-950/30 rounded-lg text-xs font-semibold transition"
              >
                <Plus className="h-3.5 w-3.5" /> Agregar detalle
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {/* Footer */}
        {error ? (
          <div className="flex-shrink-0 flex items-center justify-between gap-3 p-5 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
            <span className="text-sm font-bold text-red-600 dark:text-red-400">⚠️ Error de validación</span>
            <div className="flex gap-2">
              <button
                onClick={() => setError(null)}
                className="px-4 py-2 rounded-lg bg-steel-200 dark:bg-steel-800 text-steel-800 dark:text-steel-200 hover:bg-steel-300 dark:hover:bg-steel-700 text-sm font-bold transition flex items-center gap-2"
              >
                ← Regresar
              </button>
              <button
                onClick={handleClose}
                className="px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 text-sm font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-shrink-0 flex items-center justify-between gap-3 p-5 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50">
            <p className="text-[11px] text-steel-500 dark:text-steel-400">
              * Campos obligatorios. Total de la celda = suma de detalles.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleClose}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-steel-300 dark:border-steel-600 text-steel-700 dark:text-steel-300 hover:bg-steel-100 dark:hover:bg-steel-700 text-sm font-semibold disabled:opacity-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !hasChanges}
                className={clsx(
                  "px-4 py-2 rounded-lg text-white text-sm font-semibold flex items-center gap-2 transition",
                  saving || !hasChanges
                    ? "bg-primary-400 cursor-not-allowed"
                    : "bg-primary-600 hover:bg-primary-700"
                )}
              >
                {saving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Guardando...</>
                ) : (
                  <><Save className="h-4 w-4" /> Guardar cambios</>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

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
