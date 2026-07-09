import { useState, useEffect } from 'react';
import { X, Save, Activity, DollarSign, PieChart, Info, ShieldAlert, Lock, AlertCircle, CheckCircle } from 'lucide-react';
import type { Project } from '@/types';
import clsx from 'clsx';
import { formatCOPFull } from '@/utils/formatNumbers';
import { useAuthStore } from '@/stores/authStore';
import apiClient from '@/services/api/client';
import { useToastStore } from '@/components/common/Toast';

const formatCOP = formatCOPFull;

interface Props {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (p: Project) => void;
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error';

type TabType = 'generales' | 'seguimiento' | 'financiero' | 'costos' | 'gerencia';

export default function ProjectTrackingModal({ project, isOpen, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<Project>>({});
  const [activeTab, setActiveTab] = useState<TabType>('generales');
  const [loadingState, setLoadingState] = useState<LoadingState>('idle');
  const showToast = useToastStore(s => s.showToast);

  const user = useAuthStore(state => state.user);
  const userRole = user?.role || 'viewer';

  // Roles que pueden editar Datos Generales
  const canEditGeneralData = ['administrador', 'gerente'].includes(userRole);
  const isReadOnly = activeTab === 'generales' && !canEditGeneralData;

  useEffect(() => {
    if (project && isOpen) setFormData({ ...project });
  }, [project, isOpen]);

  if (!isOpen || !project) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: Number(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSaveClick = async () => {
    // No permite guardar si no tiene permisos Y está en Datos Generales
    if (isReadOnly && activeTab === 'generales') {
      showToast('No tiene permisos para modificar los Datos Generales.', 'error');
      return;
    }

    setLoadingState('loading');

    try {
      // Hacer llamada API al backend para guardar los cambios
      // Nota: Usamos el mismo endpoint que en el hook para consistencia
      const fieldKeys = Object.keys(formData);
      const isGeneral = activeTab === 'generales';
      
      const endpoint = isGeneral 
        ? `/project-tracking/${project?.id}/general-data` 
        : `/project-tracking/${project?.id}/tracking`;

      const response = await apiClient.patch(endpoint, formData);
      const updatedData = response.data.data || response.data;

      // Actualizar el estado local con la respuesta del servidor
      onSave(updatedData as Project);

      setLoadingState('success');
      showToast('Cambios guardados correctamente', 'success');

      // Cerrar modal después de 1.5 segundos
      setTimeout(() => {
        onClose();
        setLoadingState('idle');
      }, 1500);
    } catch (error: any) {
      setLoadingState('error');

      // Manejo específico de errores
      if (error?.response?.status === 403) {
        showToast('No tiene permisos para realizar esta acción.', 'error');
      } else if (error?.response?.status === 404) {
        showToast('Proyecto no encontrado.', 'error');
      } else {
        const detail = error?.response?.data?.detail || 'Error al guardar los datos.';
        showToast(detail, 'error');
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: any }[] = [
    { id: 'generales', label: 'Datos Generales', icon: Info },
    { id: 'seguimiento', label: 'Seguimiento Técnico', icon: Activity },
    { id: 'financiero', label: 'Control Financiero', icon: DollarSign },
    { id: 'costos', label: 'Costos y Utilidad', icon: PieChart },
    { id: 'gerencia', label: 'Reportes Gerencia', icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 bg-steel-900/40 backdrop-blur-sm z-50 flex justify-center items-center p-4 sm:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tracking-modal-title"
        className="bg-white rounded-2xl shadow-xl w-full max-w-5xl max-h-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-200 flex justify-between items-center bg-steel-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 id="tracking-modal-title" className="text-xl font-bold text-steel-900">Hoja de Vida del Proyecto</h2>
              {isReadOnly && (
                <div className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded text-xs font-semibold">
                  <Lock className="h-3.5 w-3.5" /> Solo lectura
                </div>
              )}
            </div>
            <p className="text-sm text-steel-500 mt-1 font-mono">{project.code} — {project.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {!isReadOnly && (
              <button
                onClick={handleSaveClick}
                aria-label="Guardar cambios"
                disabled={loadingState === 'loading'}
                className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:bg-steel-300 disabled:cursor-not-allowed transition shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                {loadingState === 'loading' ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" aria-hidden="true" /> Guardar
                  </>
                )}
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="Cerrar modal"
              className="p-2 text-steel-400 hover:text-steel-600 hover:bg-steel-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Header */}

        {/* Tabs Menu */}
        <div className="flex px-2 border-b border-steel-200 overflow-x-auto scrollbar-none bg-white">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={clsx(
                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-steel-500 hover:text-steel-700 hover:border-steel-300"
              )}
            >
              <tab.icon className="h-4 w-4" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 scrollbar-pcm bg-steel-50/30">
          
          {/* TAB 1: Datos Generales */}
          {activeTab === 'generales' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Información Básica</h3>
                <Input disabled={isReadOnly} label="Nombre del Proyecto" name="name" value={formData.name} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Nombre del Contrato" name="contract_name" value={formData.contract_name} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Código del Proyecto" name="code" value={formData.code} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Aceptante / Cliente" name="client_name" value={formData.client_name} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Localización" name="location" value={formData.location} onChange={handleChange} />
                <TextArea disabled={isReadOnly} label="Alcance" name="scope" value={formData.scope} onChange={handleChange} rows={3} />
                
                <h3 className="font-semibold text-steel-800 border-b pb-2 pt-4">Resumen Contrato</h3>
                <Input disabled={isReadOnly} label="Oferente / Contratista" name="oferente" value={formData.oferente} onChange={handleChange} />
                <Input disabled={isReadOnly} label="NIT Contratista" name="nit_contratista" value={formData.nit_contratista} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Ciudad Contratista" name="ciudad_contratista" value={formData.ciudad_contratista} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Representante Legal" name="representante_legal" value={formData.representante_legal} onChange={handleChange} />
                <Input disabled={isReadOnly} label="NIT Cliente" name="nit_cliente" value={formData.nit_cliente} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Ciudad Cliente" name="ciudad_cliente" value={formData.ciudad_cliente} onChange={handleChange} />
                <TextArea disabled={isReadOnly} label="Capacidad" name="capacidad" value={formData.capacidad} onChange={handleChange} rows={2} />
                <Input disabled={isReadOnly} label="Forma de Pago" name="forma_pago" value={formData.forma_pago} onChange={handleChange} />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Equipo de Trabajo</h3>
                <Input disabled={isReadOnly} label="Gerente Cliente" name="client_manager" value={formData.client_manager} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Admin Contrato Cliente" name="client_admin" value={formData.client_admin} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Director de Proyectos" name="project_director" value={formData.project_director} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Ingeniero Residente" name="resident_engineer" value={formData.resident_engineer} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Supervisor" name="supervisor" value={formData.supervisor} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Encargado" name="manager_in_charge" value={formData.manager_in_charge} onChange={handleChange} />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Condiciones Generales</h3>
                <Input disabled={isReadOnly} label="Tipo de Contrato" name="contract_type" value={formData.contract_type} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Requiere Auxilios" name="requires_aid" value={formData.requires_aid} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Pólizas Requeridas" name="required_policies" value={formData.required_policies} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Multas o Penalidades" name="penalties" value={formData.penalties} onChange={handleChange} />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Fechas Contractuales</h3>
                <Input disabled={isReadOnly} label="Fecha de Inicio" name="start_date" type="date" value={formData.start_date} onChange={handleChange} />
                <Input disabled={isReadOnly} label="Fecha Fin Contractual" name="estimated_end_date" type="date" value={formData.estimated_end_date} onChange={handleChange} />
              </div>
            </div>
          )}

          {/* TAB 2: Seguimiento Técnico */}
          {activeTab === 'seguimiento' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Progreso</h3>
                <Input label="Fecha Terminación Estimada" name="estimated_completion_date" type="date" value={formData.estimated_completion_date} onChange={handleChange} />
                <div className="flex gap-4">
                  <Input label="% Programado (Decimal)" name="planned_progress" type="number" step="0.01" value={formData.planned_progress} onChange={handleChange} />
                  <Input label="% Real (Decimal)" name="time_progress_percentage" type="number" step="1" value={formData.time_progress_percentage} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Órdenes de Compra</h3>
                <Input label="¿Existen OC?" name="purchase_orders_exist" value={formData.purchase_orders_exist} onChange={handleChange} />
                <Input label="Alcance OC" name="purchase_orders_scope" value={formData.purchase_orders_scope} onChange={handleChange} />
                <Input label="Tiempo OC" name="purchase_orders_time" value={formData.purchase_orders_time} onChange={handleChange} />
                <Input label="Estado Facturación OC" name="purchase_orders_billing_status" value={formData.purchase_orders_billing_status} onChange={handleChange} />
                <AmountInput label="Valor Órdenes" name="purchase_orders_value" value={formData.purchase_orders_value} onChange={handleChange} />
              </div>
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Novedades</h3>
                <TextArea label="Modificaciones de Alcance" name="scope_modifications" value={formData.scope_modifications} onChange={handleChange} />
                <TextArea label="Desviaciones Detectadas" name="detected_deviations" value={formData.detected_deviations} onChange={handleChange} rows={4} />
                <TextArea label="Justificación de Desviaciones" name="deviations_justification" value={formData.deviations_justification} onChange={handleChange} rows={4} />
              </div>
            </div>
          )}

          {/* TAB 3: Control Financiero */}
          {activeTab === 'financiero' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Valores Contractuales</h3>
                <AmountInput label="Valor Original del Contrato" name="contract_value_original" value={formData.contract_value_original} onChange={handleChange} />
                <AmountInput label="Valor Otrosí (Adiciones/Red)" name="other_modifications_value" value={formData.other_modifications_value} onChange={handleChange} />
                <AmountInput label="Valor Actual del Contrato" name="contract_value_current" value={formData.contract_value_current} onChange={handleChange} />
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Anticipos y Retenciones</h3>
                <Input label="% Anticipo" name="advance_percentage" type="number" step="0.01" value={formData.advance_percentage} onChange={handleChange} />
                <AmountInput label="Valor Anticipo Recibido" name="advance_received_value" value={formData.advance_received_value} onChange={handleChange} />
                <Input label="% Retención Garantía" name="retention_guarantee" type="number" step="0.01" value={formData.retention_guarantee} onChange={handleChange} />
                <AmountInput label="Retenido ($)" name="retained_value" value={formData.retained_value} onChange={handleChange} />
              </div>
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Facturación y Pagos</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AmountInput label="Valor Facturado" name="billed_value" value={formData.billed_value} onChange={handleChange} />
                  <AmountInput label="Amortización del Anticipo" name="amortization_value" value={formData.amortization_value} onChange={handleChange} />
                  <AmountInput label="Valor Total Ingreso (Liquidez)" name="total_revenue_liquidity" value={formData.total_revenue_liquidity} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <AmountInput label="Valor Descuentos" name="discounts_value" value={formData.discounts_value} onChange={handleChange} />
                  <AmountInput label="Valor Pagado" name="paid_value" value={formData.paid_value} onChange={handleChange} />
                  <AmountInput label="Valor Por Amortizar" name="pending_amortization_value" value={formData.pending_amortization_value} onChange={handleChange} />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Costos y Utilidad */}
          {activeTab === 'costos' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Costos Ejecutados</h3>
                <AmountInput label="Materiales" name="costs_materials" value={formData.costs_materials} onChange={handleChange} />
                <AmountInput label="Mano de Obra" name="costs_labor" value={formData.costs_labor} onChange={handleChange} />
                <AmountInput label="Administrativos y Operacionales" name="costs_admin" value={formData.costs_admin} onChange={handleChange} />
                <div className="pt-2">
                  <AmountInput label="Costo Total Ejecutado" name="costs_total" value={formData.costs_total} onChange={handleChange} className="bg-steel-50 border-primary-200" />
                </div>
              </div>
              <div className="space-y-4">
                <h3 className="font-semibold text-steel-800 border-b pb-2">Utilidad</h3>
                <AmountInput label="Utilidad Proyectada" name="projected_utility" value={formData.projected_utility} onChange={handleChange} />
                <AmountInput label="Utilidad Actual (En Curso)" name="current_utility" value={formData.current_utility} onChange={handleChange} className="bg-emerald-50 border-emerald-200 text-emerald-800" />
              </div>
            </div>
          )}

          {/* TAB 5: Gerencia */}
          {activeTab === 'gerencia' && (
            <div className="grid grid-cols-1 gap-6">
              <TextArea label="Necesidades de Apoyo (Técnico, Admin, Financiero)" name="support_needs" value={formData.support_needs} onChange={handleChange} rows={3} />
              <TextArea label="Decisiones que deben ser tomadas por gerencia" name="management_decisions" value={formData.management_decisions} onChange={handleChange} rows={3} />
              <TextArea label="Observaciones Cliente / Interventoría" name="client_observations" value={formData.client_observations} onChange={handleChange} rows={3} />
              <TextArea label="Identificación de Riesgos" name="risk_identification" value={formData.risk_identification} onChange={handleChange} rows={3} />
              <TextArea label="Lecciones Aprendidas" name="lessons_learned" value={formData.lessons_learned} onChange={handleChange} rows={4} />
              <TextArea label="Recomendaciones para otros proyectos" name="recommendations" value={formData.recommendations} onChange={handleChange} rows={3} />
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// Minimal un-styled components just for this modal
function Input({ label, disabled = false, ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={clsx("text-xs font-semibold", disabled ? "text-steel-400" : "text-steel-600")}>{label}</label>
      <input
        disabled={disabled}
        className={clsx(
          "px-3 py-2 border rounded-lg text-sm transition",
          disabled
            ? "border-steel-200 bg-steel-50 text-steel-500 cursor-not-allowed"
            : "border-steel-300 bg-white text-steel-900 focus:ring-1 focus:ring-primary-500 hover:border-steel-400"
        )}
        {...props}
      />
    </div>
  );
}
function TextArea({ label, rows=2, disabled = false, ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={clsx("text-xs font-semibold", disabled ? "text-steel-400" : "text-steel-600")}>{label}</label>
      <textarea
        rows={rows}
        disabled={disabled}
        className={clsx(
          "px-3 py-2 border rounded-lg text-sm transition resize-y",
          disabled
            ? "border-steel-200 bg-steel-50 text-steel-500 cursor-not-allowed"
            : "border-steel-300 bg-white text-steel-900 focus:ring-1 focus:ring-primary-500 hover:border-steel-400"
        )}
        {...props}
      />
    </div>
  );
}
function AmountInput({ label, className, disabled = false, ...props }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={clsx("text-xs font-semibold flex justify-between", disabled ? "text-steel-400" : "text-steel-600")}>
        {label} <span className={clsx("font-mono font-medium", disabled ? "text-steel-300" : "text-steel-400")}>{formatCOP(props.value || 0)}</span>
      </label>
      <div className="relative">
        <div className={clsx("absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none", disabled ? "text-steel-300" : "text-steel-400")}>
          <DollarSign className="h-4 w-4" />
        </div>
        <input
          type="number"
          disabled={disabled}
          className={clsx(
            "pl-8 w-full px-3 py-2 border rounded-lg text-sm transition",
            disabled
              ? "border-steel-200 bg-steel-50 text-steel-500 cursor-not-allowed"
              : "border-steel-300 bg-white text-steel-900 focus:ring-1 focus:ring-primary-500 hover:border-steel-400",
            className
          )}
          {...props}
        />
      </div>
    </div>
  );
}
