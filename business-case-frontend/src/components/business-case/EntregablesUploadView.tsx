import React, { useState, useEffect } from 'react';
import { Upload, FileText, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Calculator, ArrowRight, Edit2, Save } from 'lucide-react';
import { businessCaseAPI } from '@/services/api/businessCase';
import { useToastStore } from '@/components/common/Toast';

interface EntregableItemProps {
  nombre: string;
  descripcion: string;
  cargado: boolean;
  totalDetectado: number;
  onCargar: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
  manualValue?: number;
  isValidated?: boolean;
  onConfirm?: () => void;
}

const EntregableItem: React.FC<EntregableItemProps> = ({
  nombre,
  descripcion,
  cargado,
  totalDetectado,
  onCargar,
  accept = ".xlsx,.xls",
  isLoading = false,
  manualValue = 0,
  isValidated = false,
  onConfirm
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  const valManual = Number(manualValue) || 0;
  const valExcel = Number(totalDetectado) || 0;
  const diferenciaPct = valManual > 0 ? (Math.abs(valExcel - valManual) / valManual) * 100 : 0;
  const dentroDeTolerancia = valManual > 0 && diferenciaPct <= 5.0;
  const fueraDeTolerancia = cargado && !dentroDeTolerancia;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onCargar(file);
    }
  };

  return (
    <div className={`p-5 rounded-lg border transition-colors duration-300 ${
      isValidated 
        ? 'border-emerald-200 bg-emerald-50' 
        : cargado
          ? fueraDeTolerancia ? 'border-red-300 bg-red-50/50' : 'border-blue-200 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex gap-4 items-center">
          <div className={`text-xl ${isValidated ? 'text-emerald-600' : nombre.includes('Venta') ? 'text-green-600' : 'text-blue-600'}`}>
            {nombre.includes('Venta') ? '$' : '📊'}
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              {nombre}
              {isValidated && <CheckCircle2 size={16} className="text-emerald-500" />}
              {fueraDeTolerancia && !isValidated && <AlertCircle size={16} className="text-red-500" />}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {descripcion}
            </p>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          {!isValidated ? (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                cargado
                  ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                <>
                  <Upload size={16} />
                  {cargado ? 'Reemplazar Excel' : '↑ Cargar Excel'}
                </>
              )}
            </button>
          ) : (
            <div className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 size={12} /> VALIDADO
            </div>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept={accept}
            className="hidden"
          />
        </div>
      </div>

      {cargado && (
        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Valor Manual (Paso 1)</span>
              <div className="text-lg font-mono font-bold text-gray-700">
                ${new Intl.NumberFormat('es-CO').format(manualValue)}
              </div>
            </div>
            <div className={`p-3 rounded-lg border ${
              fueraDeTolerancia ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">Total Detectado Excel</span>
              <div className={`text-lg font-mono font-bold ${fueraDeTolerancia ? 'text-red-600' : 'text-blue-700'}`}>
                ${new Intl.NumberFormat('es-CO').format(totalDetectado)}
              </div>
            </div>
          </div>

          {!isValidated && (
            <div className="mt-4">
              <button
                onClick={onConfirm}
                disabled={!dentroDeTolerancia || isLoading}
                className={`px-6 py-3 rounded-lg font-semibold text-white transition-all
                  ${dentroDeTolerancia && !isLoading
                    ? 'bg-green-600 hover:bg-green-700 cursor-pointer'
                    : 'bg-gray-400 cursor-not-allowed opacity-50'}`}
              >
                {isLoading ? 'Procesando...' : 'Confirmar y Validar'}
              </button>

              {!dentroDeTolerancia && (
                <div className="mt-3 bg-red-50 border border-red-300 rounded-lg p-3 text-red-700 text-sm">
                  <span className="font-bold">❌ No se puede validar.</span>{' '}
                  La diferencia del {diferenciaPct.toFixed(1)}% supera la tolerancia
                  máxima de ±5%. Corrija el archivo Excel o edite los valores manuales.
                </div>
              )}

              {dentroDeTolerancia && totalDetectado > 0 && (
                <div className="mt-3 bg-green-50 border border-green-300 rounded-lg p-3 text-green-700 text-sm">
                  ✅ Diferencia del {diferenciaPct.toFixed(1)}% — dentro de tolerancia.
                  Puede confirmar.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface EntregablesUploadViewProps {
  ventaCargado: boolean;
  costoCargado: boolean;
  totalVenta: number;
  totalCosto: number;
  onSubirVenta: (file: File) => Promise<void>;
  onSubirCosto: (file: File) => Promise<void>;
  isLoadingVenta?: boolean;
  isLoadingCosto?: boolean;
  valoresManualesCompletos: boolean;
  initialValues?: any;
  onSaveManualValues: (values: any) => Promise<void>;
  ventaValidada: boolean;
  costoValidada: boolean;
  onConfirmVenta: () => Promise<void>;
  onConfirmCosto: () => Promise<void>;
  montoManualVenta?: number;
  montoManualCosto?: number;
  esProyectoUSD?: boolean;
  projectId?: string;
  refetchBusinessCase?: () => Promise<void>;
}

const EntregablesUploadView: React.FC<EntregablesUploadViewProps> = ({
  ventaCargado,
  costoCargado,
  totalVenta,
  totalCosto,
  onSubirVenta,
  onSubirCosto,
  isLoadingVenta = false,
  isLoadingCosto = false,
  valoresManualesCompletos,
  initialValues,
  onSaveManualValues,
  ventaValidada,
  costoValidada,
  onConfirmVenta,
  onConfirmCosto,
  montoManualVenta = 0,
  montoManualCosto = 0,
  esProyectoUSD = false,
  projectId = '',
  refetchBusinessCase
}) => {
  const [showModalTRM, setShowModalTRM] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState<{ file: File; tipo: 'venta' | 'costo' } | null>(null);
  const [trm, setTrm] = useState('');
  const [isImportingLyra, setIsImportingLyra] = useState(false);

  const showToast = useToastStore((s) => s.showToast);
  const toast = {
    success: (msg: string) => showToast(msg, 'success'),
    error: (msg: string) => showToast(msg, 'error'),
  };

  const esLYRA = projectId === 'lyra-carsan-oe2000';

  const handleCargarExcel = (tipo: 'venta' | 'costo') => (file: File) => {
    if (esLYRA) {
      setArchivoSeleccionado({ file, tipo });
      setShowModalTRM(true);
    } else {
      if (tipo === 'venta') {
        onSubirVenta(file);
      } else {
        onSubirCosto(file);
      }
    }
  };

  const handleConfirmarLYRA = async (
    selection: { file: File; tipo: 'venta' | 'costo' } | null,
    trmVal: number
  ) => {
    if (!selection) return;
    const { file, tipo } = selection;
    setShowModalTRM(false);
    setIsImportingLyra(true);

    try {
      const result = await businessCaseAPI.importLyraCarsan(projectId, file, trmVal, tipo);
      
      // Auto-validate budget if tolerance is within 5%
      if (tipo === 'venta') {
        const diff = Math.abs(result.total_venta - (montoManualVenta || 0)) / (montoManualVenta || 1);
        if (diff <= 0.05) {
          await businessCaseAPI.validateVenta(projectId);
        }
      } else {
        const diff = Math.abs(result.total_costo - (montoManualCosto || 0)) / (montoManualCosto || 1);
        if (diff <= 0.05) {
          await businessCaseAPI.validateCosto(projectId);
        }
      }

      if (refetchBusinessCase) {
        await refetchBusinessCase();
      }
      toast.success(`Presupuesto de ${tipo} importado correctamente.`);
    } catch (error: any) {
      const detalle = error?.response?.data?.detail || 'Error al importar';
      toast.error(detalle);
    } finally {
      setIsImportingLyra(false);
      setArchivoSeleccionado(null);
      setTrm('');
    }
  };

  const [step, setStep] = useState<1 | 2>(valoresManualesCompletos ? 2 : 1);
  const [form, setForm] = useState({
    venta_monto_manual: initialValues?.venta_monto_manual || 0,
    venta_materiales: initialValues?.venta_materiales || 0,
    venta_servicios: initialValues?.venta_servicios || 0,
    venta_administracion: initialValues?.venta_administracion || 0,
    venta_mano_obra: initialValues?.venta_mano_obra || 0,
    venta_intereses: initialValues?.venta_intereses || 0,
    costo_monto_manual: initialValues?.costo_monto_manual || 0,
    costo_materiales: initialValues?.costo_materiales || 0,
    costo_servicios: initialValues?.costo_servicios || 0,
    costo_administracion: initialValues?.costo_administracion || 0,
    costo_mano_obra: initialValues?.costo_mano_obra || 0,
    costo_intereses: initialValues?.costo_intereses || 0,
    trm: initialValues?.usd_rate || 4000,
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialValues) {
      setForm({
        venta_monto_manual: initialValues.venta_monto_manual || 0,
        venta_materiales: initialValues.venta_materiales || 0,
        venta_servicios: initialValues.venta_servicios || 0,
        venta_administracion: initialValues.venta_administracion || 0,
        venta_mano_obra: initialValues.venta_mano_obra || 0,
        venta_intereses: initialValues.venta_intereses || 0,
        costo_monto_manual: initialValues.costo_monto_manual || 0,
        costo_materiales: initialValues.costo_materiales || 0,
        costo_servicios: initialValues.costo_servicios || 0,
        costo_administracion: initialValues.costo_administracion || 0,
        costo_mano_obra: initialValues.costo_mano_obra || 0,
        costo_intereses: initialValues.costo_intereses || 0,
        trm: initialValues.usd_rate || 4000,
      });
    }
  }, [initialValues]);

  const handleSave = async () => {
    const requiredKeys = [
      'venta_monto_manual', 'venta_materiales', 'venta_servicios', 'venta_administracion', 'venta_mano_obra', 'venta_intereses',
      'costo_monto_manual', 'costo_materiales', 'costo_servicios', 'costo_administracion', 'costo_mano_obra', 'costo_intereses'
    ];
    const emptyFields = requiredKeys.filter(k => form[k as keyof typeof form] === undefined || form[k as keyof typeof form] === null || form[k as keyof typeof form] === '');
    if (emptyFields.length > 0) {
      alert("Por favor completa todos los campos requeridos del presupuesto.");
      return;
    }

    if (form.costo_monto_manual >= form.venta_monto_manual) {
      alert("El monto total de Venta debe ser mayor al monto total de Costo.");
      return;
    }
    
    setIsSaving(true);
    try {
      await onSaveManualValues(form);
      setStep(2);
    } catch (error: any) {
      const detalle = error?.response?.data?.detail || error?.message || "Error desconocido";
      alert(`Error al guardar valores manuales: ${detalle}`);
      console.error("Error completo:", error?.response?.data);
    } finally {
      setIsSaving(false);
    }
  };

  const formatMonto = (v: number) => '$' + new Intl.NumberFormat('es-CO').format(v);

  // Venta calculations
  const sumaComponentesVenta =
    (form.venta_materiales || 0) +
    (form.venta_servicios || 0) +
    (form.venta_mano_obra || 0) +
    (form.venta_administracion || 0) +
    (form.venta_intereses || 0);

  const diferenciaVenta = Math.abs(sumaComponentesVenta - form.venta_monto_manual);
  const toleranciaVenta = form.venta_monto_manual * 0.01; // 1%
  const sumaCorrectaVenta = diferenciaVenta <= toleranciaVenta;

  // Costo calculations
  const sumaComponentesCosto =
    (form.costo_materiales || 0) +
    (form.costo_servicios || 0) +
    (form.costo_mano_obra || 0) +
    (form.costo_administracion || 0) +
    (form.costo_intereses || 0);

  const diferenciaCosto = Math.abs(sumaComponentesCosto - form.costo_monto_manual);
  const toleranciaCosto = form.costo_monto_manual * 0.01; // 1%
  const sumaCorrectaCosto = diferenciaCosto <= toleranciaCosto;

  const ambosCompletos = ventaValidada && costoValidada;
  const completados = (ventaValidada ? 1 : 0) + (costoValidada ? 1 : 0);

  return (
    <div className="max-w-5xl mx-auto py-12 px-6">
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4 border border-blue-200">
          <TrendingUp size={14} />
          Configuración de Proyecto
        </div>
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Caso de Negocio</h1>
        <div className="flex items-center justify-center gap-8 mt-6">
          <div className={`flex items-center gap-2 ${step === 1 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
              step === 1 ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-gray-300 bg-gray-100 text-gray-400'
            }`}>1</div>
            <span>Valores Manuales</span>
          </div>
          <div className="w-12 h-px bg-gray-300" />
          <div className={`flex items-center gap-2 ${step === 2 ? 'text-blue-700 font-semibold' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${
              step === 2 ? 'border-blue-700 bg-blue-50 text-blue-700' : 'border-gray-300 bg-gray-100 text-gray-400'
            }`}>2</div>
            <span>Validación Excel</span>
          </div>
        </div>
      </div>

      <div className={step === 1 
        ? "bg-white border border-gray-200 rounded-xl p-8 max-w-[900px] mx-auto shadow-sm"
        : "bg-white border border-gray-200 rounded-xl p-6 shadow-sm max-w-[900px] mx-auto"}>
        {step === 1 ? (
          <div>
            <div className="mb-7">
              <h2 className="text-[22px] font-bold text-gray-900 mb-1">PASO 1: Ingreso de Valores Base</h2>
              <p className="text-[14px] text-gray-500">Define los montos globales aprobados para venta y costo.</p>
            </div>
            {/* ... form ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* VENTA */}
              <div className="space-y-5">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-[15px] font-semibold text-blue-700 flex items-center gap-2">
                    <span role="img" aria-label="money">💲</span> PRESUPUESTO VENTA {esProyectoUSD && '(USD)'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Monto Total Venta</label>
                    <input 
                      type="number" 
                      value={form.venta_monto_manual || ''} 
                      onChange={e => setForm({...form, venta_monto_manual: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Materiales</label>
                    <input 
                      type="number" 
                      value={form.venta_materiales || ''} 
                      onChange={e => setForm({...form, venta_materiales: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Servicios</label>
                    <input 
                      type="number" 
                      value={form.venta_servicios || ''} 
                      onChange={e => setForm({...form, venta_servicios: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Administración</label>
                    <input 
                      type="number" 
                      value={form.venta_administracion || ''} 
                      onChange={e => setForm({...form, venta_administracion: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Mano de Obra</label>
                    <input 
                      type="number" 
                      value={form.venta_mano_obra || ''} 
                      onChange={e => setForm({...form, venta_mano_obra: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
                        INTERESES (opcional)
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Solo si el proyecto tiene financiación bancaria
                      </span>
                    </div>
                    <input 
                      type="number" 
                      value={form.venta_intereses || ''} 
                      onChange={e => setForm({...form, venta_intereses: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                      placeholder="0 — dejar vacío si no aplica"
                    />
                  </div>
                  {!sumaCorrectaVenta && sumaComponentesVenta > 0 && form.venta_monto_manual > 0 && (
                    <div className="text-red-500 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      ⚠️ Los componentes de Venta suman {formatMonto(sumaComponentesVenta)} pero el
                      Monto Total es {formatMonto(form.venta_monto_manual)}.
                      Diferencia: {formatMonto(diferenciaVenta)}
                    </div>
                  )}
                </div>
              </div>

              {/* COSTO */}
              <div className="space-y-5 md:border-l md:border-gray-200 md:pl-8">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-[15px] font-semibold text-blue-700 flex items-center gap-2">
                    <span role="img" aria-label="chart">📊</span> PRESUPUESTO COSTO {esProyectoUSD && '(USD)'}
                  </h3>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Monto Total Costo</label>
                    <input 
                      type="number" 
                      value={form.costo_monto_manual || ''} 
                      onChange={e => setForm({...form, costo_monto_manual: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Materiales</label>
                    <input 
                      type="number" 
                      value={form.costo_materiales || ''} 
                      onChange={e => setForm({...form, costo_materiales: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Servicios</label>
                    <input 
                      type="number" 
                      value={form.costo_servicios || ''} 
                      onChange={e => setForm({...form, costo_servicios: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Administración</label>
                    <input 
                      type="number" 
                      value={form.costo_administracion || ''} 
                      onChange={e => setForm({...form, costo_administracion: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide block mb-1.5">Mano de Obra</label>
                    <input 
                      type="number" 
                      value={form.costo_mano_obra || ''} 
                      onChange={e => setForm({...form, costo_mano_obra: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <label className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
                        INTERESES (opcional)
                      </label>
                      <span className="text-[10px] text-gray-400">
                        Solo si el proyecto tiene financiación bancaria
                      </span>
                    </div>
                    <input 
                      type="number" 
                      value={form.costo_intereses || ''} 
                      onChange={e => setForm({...form, costo_intereses: Number(e.target.value)})}
                      className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3.5 py-2.5 text-[15px] text-gray-900 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-colors placeholder-gray-400"
                      placeholder="0 — dejar vacío si no aplica"
                    />
                  </div>
                  {!sumaCorrectaCosto && sumaComponentesCosto > 0 && form.costo_monto_manual > 0 && (
                    <div className="text-red-500 text-xs font-semibold bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      ⚠️ Los componentes de Costo suman {formatMonto(sumaComponentesCosto)} pero el
                      Monto Total es {formatMonto(form.costo_monto_manual)}.
                      Diferencia: {formatMonto(diferenciaCosto)}
                    </div>
                  )}
                </div>
              </div>
            </div>


            <div className="mt-7">
              <button
                onClick={handleSave}
                disabled={isSaving || (form.venta_monto_manual > 0 && !sumaCorrectaVenta) || (form.costo_monto_manual > 0 && !sumaCorrectaCosto)}
                className="w-full bg-blue-700 text-white px-8 py-3 rounded-lg text-[15px] font-semibold hover:bg-blue-800 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSaving ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    Guardar y Continuar <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">PASO 2: Validación de Presupuestos</h3>
                <p className="text-sm text-gray-500 mt-1">Carga los archivos Excel para contrastar con los valores manuales.</p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 font-medium px-3 py-1 rounded-lg hover:bg-blue-50 transition"
                >
                  <Edit2 size={14} /> Editar Valores Manuales
                </button>
                <div className="h-10 w-px bg-gray-200 mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-500">Progreso</div>
                    <div className="text-lg font-bold text-gray-900">{completados}/2 Validados</div>
                  </div>
                  <div className="w-16 h-16 relative">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-100" />
                      <circle
                        cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent"
                        strokeDasharray={175.9}
                        strokeDashoffset={175.9 - (175.9 * completados) / 2}
                        className="text-blue-600 transition-all duration-1000 ease-out"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-gray-700">
                      {Math.round((completados / 2) * 100)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="relative">
                <EntregableItem
                  nombre="Presupuesto de Venta"
                  descripcion="El total del Excel debe coincidir (±5%) con el valor manual de venta."
                  cargado={ventaCargado}
                  totalDetectado={totalVenta}
                  onCargar={handleCargarExcel('venta')}
                  isLoading={isLoadingVenta || (archivoSeleccionado?.tipo === 'venta' && isImportingLyra)}
                  manualValue={montoManualVenta}
                  isValidated={ventaValidada}
                  onConfirm={onConfirmVenta}
                />
              </div>

              <div className="relative">
                <EntregableItem
                  nombre="Presupuesto de Costo"
                  descripcion="El total del Excel debe coincidir (±5%) con el valor manual de costo."
                  cargado={costoCargado}
                  totalDetectado={totalCosto}
                  onCargar={handleCargarExcel('costo')}
                  isLoading={isLoadingCosto || (archivoSeleccionado?.tipo === 'costo' && isImportingLyra)}
                  manualValue={montoManualCosto}
                  isValidated={costoValidada}
                  onConfirm={onConfirmCosto}
                />
              </div>
            </div>
          </div>
        )}

        {ambosCompletos && (
          <div className="p-6 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center justify-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
              <CheckCircle2 size={20} />
            </div>
            <span className="text-emerald-400 font-bold text-lg animate-pulse">
              ¡Excelente! Todos los presupuestos han sido validados. Abriendo Caso de Negocio...
            </span>
          </div>
        )}
      </div>

      {showModalTRM && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 animate-in fade-in">
          <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl border border-gray-100 transform scale-100 transition-all duration-300">
            <h3 className="font-bold text-gray-900 text-lg">
              Importar Presupuesto LYRA CARSAN
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Este proyecto maneja valores en USD. Ingresa la TRM para convertir a COP.
            </p>
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                TRM vigente (USD → COP)
              </label>
              <input
                type="number"
                value={trm}
                onChange={e => setTrm(e.target.value)}
                placeholder="Ej: 4200"
                className="w-full mt-1 border border-gray-300 rounded-lg px-3 py-2
                           focus:ring-2 focus:ring-blue-500 focus:outline-none text-gray-900"
              />
            </div>
            <div className="flex gap-3 mt-6 justify-end">
              <button
                onClick={() => { setShowModalTRM(false); setTrm(''); }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg
                           hover:bg-gray-50 font-medium text-sm transition-colors">
                Cancelar
              </button>
              <button
                disabled={!trm || Number(trm) <= 0}
                onClick={() => handleConfirmarLYRA(archivoSeleccionado, Number(trm))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium text-sm
                           hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm">
                Confirmar e Importar
              </button>
            </div>
          </div>
        </div>
      )}



      {projectId === 'patio-sur-oe1035' && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-700 text-sm mt-4 flex items-center gap-3">
          <AlertCircle size={18} className="shrink-0" />
          <p>
            <span className="font-medium">Nota:</span> El proyecto Patio Sur está protegido y no permite modificaciones desde este asistente.
          </p>
        </div>
      )}
    </div>
  );
};

export default EntregablesUploadView;
