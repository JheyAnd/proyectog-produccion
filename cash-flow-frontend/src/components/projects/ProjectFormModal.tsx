import { useState } from 'react';
import { X, Save } from 'lucide-react';
import type { Project } from '@/types';

interface ProjectFormModalProps {
  onClose: () => void;
  onSubmit: (data: Partial<Project>) => void;
  isLoading?: boolean;
}

export default function ProjectFormModal({ onClose, onSubmit, isLoading }: ProjectFormModalProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: '',
    code: '',
    description: '',
    client_name: '',
    location: '',
    project_manager: '',
    status: 'planning',
    total_budget: 0,
    start_date: new Date().toISOString().split('T')[0],
    estimated_end_date: new Date().toISOString().split('T')[0],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'total_budget' ? Number(value) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-steel-900/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title-project"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-steel-200 overflow-hidden flex flex-col max-h-full"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-steel-100 flex justify-between items-center bg-steel-50/50">
          <h3 id="modal-title-project" className="text-lg font-bold text-steel-900">Crear Nuevo Proyecto</h3>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="p-1.5 hover:bg-steel-200 rounded-lg text-steel-500 hover:text-steel-800 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto">
          <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Sec: Info General */}
            <div>
              <h4 className="text-sm font-semibold text-steel-800 mb-3 uppercase tracking-wider">Información General</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="pf-name" className="block text-xs font-medium text-steel-700 mb-1">Nombre del Proyecto *</label>
                  <input
                    id="pf-name"
                    required
                    aria-required="true"
                    type="text"
                    name="name"
                    value={formData.name || ''}
                    onChange={handleChange}
                    placeholder="Ej. Patio de Operación Norte"
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="pf-code" className="block text-xs font-medium text-steel-700 mb-1">Código *</label>
                  <input
                    id="pf-code"
                    required
                    aria-required="true"
                    type="text"
                    name="code"
                    value={formData.code || ''}
                    onChange={handleChange}
                    placeholder="Ej. OE 1036"
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="pf-client" className="block text-xs font-medium text-steel-700 mb-1">Cliente *</label>
                  <input
                    id="pf-client"
                    required
                    aria-required="true"
                    type="text"
                    name="client_name"
                    value={formData.client_name || ''}
                    onChange={handleChange}
                    placeholder="Ej. Consorcio SAS"
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="pf-location" className="block text-xs font-medium text-steel-700 mb-1">Ubicación</label>
                  <input
                    id="pf-location"
                    type="text"
                    name="location"
                    value={formData.location || ''}
                    onChange={handleChange}
                    placeholder="Ej. Bogotá, Colombia"
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="pf-manager" className="block text-xs font-medium text-steel-700 mb-1">Gerente de Proyecto</label>
                  <input
                    id="pf-manager"
                    type="text"
                    name="project_manager"
                    value={formData.project_manager || ''}
                    onChange={handleChange}
                    placeholder="Ej. PCMejia SA"
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pf-description" className="block text-xs font-medium text-steel-700 mb-1">Descripción</label>
                  <textarea
                    id="pf-description"
                    name="description"
                    value={formData.description || ''}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Breve alcance del proyecto..."
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 placeholder-steel-400 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  />
                </div>
              </div>
            </div>

            <hr className="border-steel-200" />

            {/* Sec: Financiero y Cronograma */}
            <div>
              <h4 className="text-sm font-semibold text-steel-800 mb-3 uppercase tracking-wider">Planificación y Presupuesto</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label htmlFor="pf-budget" className="block text-xs font-medium text-steel-700 mb-1">Presupuesto Aprobado (COP) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-steel-500 font-bold" aria-hidden="true">$</span>
                    <input
                      id="pf-budget"
                      required
                      aria-required="true"
                      type="number"
                      name="total_budget"
                      value={formData.total_budget || ''}
                      onChange={handleChange}
                      placeholder="0"
                      min="0"
                      className="w-full pl-8 pr-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="pf-start" className="block text-xs font-medium text-steel-700 mb-1">Fecha de Inicio *</label>
                  <input
                    id="pf-start"
                    required
                    aria-required="true"
                    type="date"
                    name="start_date"
                    value={formData.start_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label htmlFor="pf-end" className="block text-xs font-medium text-steel-700 mb-1">Fin Estimado *</label>
                  <input
                    id="pf-end"
                    required
                    aria-required="true"
                    type="date"
                    name="estimated_end_date"
                    value={formData.estimated_end_date || ''}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="pf-status" className="block text-xs font-medium text-steel-700 mb-1">Estado</label>
                  <select
                    id="pf-status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-steel-300 rounded-lg text-sm text-steel-800 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="planning">Planificación</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="on_hold">En Pausa</option>
                  </select>
                </div>
              </div>
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-steel-100 flex justify-end gap-3 bg-steel-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-steel-700 bg-white border border-steel-300 rounded-lg hover:bg-steel-50 transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="project-form"
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition disabled:opacity-50"
          >
            {isLoading ? 'Guardando...' : (
              <>
                <Save className="h-4 w-4" />
                Crear Proyecto
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
