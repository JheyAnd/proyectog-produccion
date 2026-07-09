import React, { useState, useEffect } from 'react';
import { FileText, ShieldAlert, ShieldCheck, TrendingUp, Check, X, Loader2 } from 'lucide-react';
import { useProjectsTracking, ProjectTracking } from '@/data/projectsTracking';
import { formatCOP } from '@/utils/formatNumbers';
import { useAuthStore } from '@/stores/authStore';
import clsx from 'clsx';

interface ContractSummaryProps {
  projectId: string;
}

export default function ContractSummary({ projectId }: ContractSummaryProps) {
  const [projects, , updateProject] = useProjectsTracking();
  const project = projects.find(p => p.project_id === projectId || p.id === projectId);
  
  const user = useAuthStore(state => state.user);
  const canEdit = ['administrador', 'gerente'].includes(user?.role || '');

  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const handleEdit = (field: keyof ProjectTracking, value: any) => {
    if (!canEdit) return;
    setEditingField(field as string);
    setEditValue(value?.toString() || '');
  };

  const handleSave = async (field: keyof ProjectTracking) => {
    if (savingField) return;
    
    // Si el valor no ha cambiado, cancelar
    if (project && project[field]?.toString() === editValue) {
      setEditingField(null);
      return;
    }

    setSavingField(field as string);
    try {
      await updateProject(project?.id || projectId, { [field]: editValue });
      setLastSaved(field as string);
      setTimeout(() => setLastSaved(null), 2000);
    } catch (err) {
      console.error('Error saving field:', err);
      alert('Error al guardar el campo. Intente de nuevo.');
    } finally {
      setSavingField(null);
      setEditingField(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, field: keyof ProjectTracking) => {
    if (e.key === 'Enter') {
      handleSave(field);
    } else if (e.key === 'Escape') {
      setEditingField(null);
    }
  };

  if (!project) return null;

  // Cálculo del Margen Estimado (Hardcoded logic for Patio Sur, dynamic for others if possible)
  // En Patio Sur es 28.2% fijo según el prompt.
  const isPatioSur = projectId.includes('patio-sur');
  const margenPct = isPatioSur ? 28.2 : (project.utilidad_proyectada || 0) * 100;
  const margenValor = isPatioSur ? (project.valor_original_contrato || 0) * 0.2817 : (project.valor_original_contrato || 0) * (project.utilidad_proyectada || 0);

  const EditableField = ({ label, field, type = 'text' }: { label: string, field: keyof ProjectTracking, type?: 'text' | 'textarea' }) => {
    const isEditing = editingField === field;
    const isSaving = savingField === field;
    const isJustSaved = lastSaved === field;
    const value = project[field] || '—';

    return (
      <div className="group relative py-2 border-b border-steel-100 last:border-0">
        <div className="flex justify-between items-start gap-4">
          <span className="text-[10px] font-bold text-steel-400 uppercase tracking-wider mt-1">{label}</span>
          <div className="flex-1 text-right">
            {isEditing ? (
              <div className="flex items-center gap-1 justify-end">
                {type === 'textarea' ? (
                  <textarea
                    autoFocus
                    className="w-full text-xs p-1 border border-primary-500 rounded bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(field)}
                    onKeyDown={(e) => handleKeyDown(e, field)}
                    rows={3}
                  />
                ) : (
                  <input
                    autoFocus
                    type="text"
                    className="w-full max-w-[200px] text-xs p-1 border border-primary-500 rounded bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-200 text-right"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => handleSave(field)}
                    onKeyDown={(e) => handleKeyDown(e, field)}
                  />
                )}
              </div>
            ) : (
              <div 
                className={clsx(
                  "text-xs font-medium text-steel-700 break-words cursor-pointer px-1 py-0.5 rounded transition",
                  canEdit && "hover:bg-primary-50 hover:text-primary-700"
                )}
                onClick={() => handleEdit(field, project[field])}
              >
                {value}
                {isSaving && <Loader2 className="inline h-3 w-3 ml-2 animate-spin text-primary-500" />}
                {isJustSaved && <Check className="inline h-3 w-3 ml-2 text-emerald-500 animate-bounce" />}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-steel-200 bg-white p-6 shadow-card transition-all hover:shadow-lg">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-50 rounded-lg">
            <FileText className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-steel-800">Resumen del Contrato</h3>
            <p className="text-sm text-steel-500">Información contractual y condiciones comerciales</p>
          </div>
        </div>
        {canEdit && (
          <span className="text-[10px] bg-steel-100 text-steel-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
            Edición Inline Habilitada
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
        {/* Columna Izquierda */}
        <div className="space-y-1">
          <EditableField label="Oferente / Contratista" field="oferente" />
          <EditableField label="NIT Contratista" field="nit_contratista" />
          <EditableField label="Ciudad Contratista" field="ciudad_contratista" />
          <EditableField label="Representante Legal" field="representante_legal" />
          <EditableField label="Aceptante / Cliente" field="cliente" />
          <EditableField label="NIT Cliente" field="nit_cliente" />
          <EditableField label="Ciudad Cliente" field="ciudad_cliente" />
        </div>

        {/* Columna Derecha */}
        <div className="space-y-1">
          <EditableField label="Objeto" field="nombre_contrato" type="textarea" />
          <EditableField label="Capacidad" field="capacidad" type="textarea" />
          <EditableField label="Forma de Pago" field="forma_pago" />
          <EditableField label="Cláusula Penal" field="multas_penalidades" />
          <EditableField label="Garantías" field="polizas_requeridas" type="textarea" />
          
          {/* Margen Estimado - Solo Lectura */}
          <div className="py-2 border-b border-emerald-100 bg-emerald-50/30 rounded-lg px-2 mt-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Margen Estimado</span>
              </div>
              <div className="text-right">
                <p className="text-sm font-black text-emerald-800">{margenPct.toFixed(1)}%</p>
                <p className="text-[10px] font-bold text-emerald-600">{formatCOP(margenValor)}</p>
              </div>
            </div>
            <p className="text-[9px] text-emerald-500 mt-1 italic text-right">Valor calculado automáticamente</p>
          </div>
        </div>
      </div>
    </div>
  );
}
