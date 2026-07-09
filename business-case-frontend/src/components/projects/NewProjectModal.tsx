import React, { useState } from 'react';
import { X, Plus, Save, Building2, Calendar, DollarSign, User, Briefcase, MapPin, Info } from 'lucide-react';
import { DATOS_GENERALES_FIELDS, ProjectTracking } from '@/data/projectsTracking';
import clsx from 'clsx';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<ProjectTracking>) => Promise<any>;
}

export default function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [formData, setFormData] = useState<Partial<ProjectTracking>>({
    id: '',
    nombre_proyecto: '',
    codigo_proyecto: '',
    group: 'PCM',
    cliente: '',
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_finalizacion_contractual: '',
    valor_original_contrato: 0,
    porcentaje_anticipo: 0,
    retencion_garantia: 0,
    utilidad_proyectada: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (key: keyof ProjectTracking, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    if (key === 'codigo_proyecto') {
      setFormData(prev => ({ ...prev, id: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nombre_proyecto || !formData.codigo_proyecto) {
      setError('Nombre y Código son obligatorios');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Convert percent fields to fractions before sending
      const submissionData = { ...formData };
      DATOS_GENERALES_FIELDS.forEach(field => {
        if (field.type === 'percent' && typeof submissionData[field.key] === 'number') {
          submissionData[field.key] = (submissionData[field.key] as number) / 100;
        }
      });

      await onCreate(submissionData);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear el proyecto');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group fields into sections for better layout
  const sections = [
    {
      title: 'Identificación y Cliente',
      icon: Building2,
      fields: DATOS_GENERALES_FIELDS.slice(0, 4), // Nombre, Contrato, Código, Cliente
    },
    {
      title: 'Equipo del Proyecto',
      icon: User,
      fields: DATOS_GENERALES_FIELDS.slice(4, 11), // Gerente, Admin, Interventor, Director, Residente, Supervisor, Encargado
    },
    {
      title: 'Detalles Contractuales',
      icon: Briefcase,
      fields: DATOS_GENERALES_FIELDS.slice(11, 17), // Tipo, Auxilios, Pólizas, Multas, Alcance, Localización
    },
    {
      title: 'Cronograma y Financiero',
      icon: DollarSign,
      fields: DATOS_GENERALES_FIELDS.slice(17), // Fechas, Valores, Porcentajes
    }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-steel-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-steel-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-steel-200 dark:border-steel-700 animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-100 dark:border-steel-700 flex items-center justify-between bg-primary-900 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
              <Plus className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Crear Nuevo Proyecto</h2>
              <p className="text-white/85 text-xs">Ingrese los datos generales para iniciar el seguimiento</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
              <Info className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {sections.map((section, sIdx) => (
              <div key={sIdx} className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-steel-100 dark:border-steel-700">
                  <section.icon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-sm font-bold text-steel-900 dark:text-white uppercase tracking-wider">
                    {section.title}
                  </h3>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {section.fields.map(field => (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-[11px] font-bold text-steel-500 dark:text-steel-400 uppercase tracking-tighter ml-1">
                        {field.label}
                      </label>
                      
                      {field.type === 'textarea' ? (
                        <textarea
                          value={(formData as any)[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all min-h-[80px]"
                          placeholder={`Ingrese ${field.label.toLowerCase()}...`}
                        />
                      ) : field.type === 'number' || field.type === 'currency' || field.type === 'percent' ? (
                        <div className="relative">
                          <input
                            type="number"
                            step="any"
                            value={(formData as any)[field.key] || 0}
                            onChange={(e) => handleChange(field.key, parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 pl-8 text-sm bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {field.type === 'percent' ? (
                              <span className="text-xs font-bold text-steel-400">%</span>
                            ) : (
                              <DollarSign className="h-3.5 w-3.5 text-steel-400" />
                            )}
                          </div>
                        </div>
                      ) : field.type === 'date' ? (
                        <div className="relative">
                          <input
                            type="date"
                            value={(formData as any)[field.key] || ''}
                            onChange={(e) => handleChange(field.key, e.target.value)}
                            className="w-full px-3 py-2 pl-8 text-sm bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          />
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Calendar className="h-3.5 w-3.5 text-steel-400" />
                          </div>
                        </div>
                      ) : (
                        <input
                          type="text"
                          value={(formData as any)[field.key] || ''}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          className="w-full px-3 py-2 text-sm bg-steel-50 dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                          placeholder={`Ingrese ${field.label.toLowerCase()}...`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Group selection */}
          <div className="p-4 bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900 rounded-2xl flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-primary-900 dark:text-primary-100">Grupo de Negocio</h4>
            </div>
            <div className="flex gap-2">
              {[
                { id: 'PCM', label: 'PC Mejía' },
                { id: 'PCS', label: 'PC Solar' },
                { id: 'CARSAN', label: 'CARSAN' }
              ].map(g => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleChange('group', g.id)}
                  className={clsx(
                    "px-6 py-2 rounded-xl font-bold text-sm transition-all border",
                    formData.group === g.id 
                      ? "bg-primary-600 text-white border-primary-600 shadow-lg shadow-primary-500/30" 
                      : "bg-white dark:bg-steel-800 text-steel-500 dark:text-steel-400 border-steel-200 dark:border-steel-700 hover:border-primary-300"
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-steel-100 dark:border-steel-700 bg-steel-50 dark:bg-steel-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-bold text-steel-600 dark:text-steel-400 hover:text-steel-800 dark:hover:text-steel-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={clsx(
              "px-8 py-2 rounded-xl font-bold text-sm text-white transition-all flex items-center gap-2 shadow-lg",
              isSubmitting 
                ? "bg-steel-400 cursor-not-allowed" 
                : "bg-primary-600 hover:bg-primary-700 active:scale-95 shadow-primary-500/30"
            )}
          >
            {isSubmitting ? (
              <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Crear Proyecto
          </button>
        </div>
      </div>
    </div>
  );
}
