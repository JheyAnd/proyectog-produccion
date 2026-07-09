// ============================================================
// SEGUIMIENTO DE PROYECTOS — Fuente de verdad: MySQL
// Tabla: project_tracking  |  API: /api/v1/project-tracking
// Los archivos JSON (projectsTrackingData.json, projectsSolarData.json)
// son sólo el seed inicial y NO deben usarse en runtime.
// ============================================================
import { useState, useEffect } from 'react';
import apiClient from '@/services/api/client';
import { socketService } from '@/services/socketService';

// ── Tipo de dato ──
export interface ProjectTracking {
  id: string;
  project_id?: string | null;
  sheet_name: string;
  fecha_informe: string | null;
  // Datos Generales (read-only)
  nombre_proyecto: string | null;
  nombre_contrato: string | null;
  codigo_proyecto: string | null;
  cliente: string | null;
  gerente_proyecto_cliente: string | null;
  administrador_contrato_cliente: string | null;
  interventor: string | null;
  director_proyectos: string | null;
  ingeniero_residente: string | null;
  supervisor: string | null;
  encargado: string | null;
  tipo_contrato: string | null;
  requiere_auxilios: string | null;
  polizas_requeridas: string | null;
  multas_penalidades: string | null;
  alcance: string | null;
  localizacion: string | null;
  group?: 'PCM' | 'PCS' | 'CARSAN';
  fecha_inicio: string | null;
  fecha_finalizacion_contractual: string | null;
  valor_original_contrato: number | null;
  porcentaje_anticipo: number | null;
  retencion_garantia: number | null;
  utilidad_proyectada: number | null;
  // Seguimiento (editable)
  fecha_terminacion_estimada: string | null;
  avance_programado: number | null;
  avance_real: number | null;
  modificacion_alcance: string | null;
  ordenes_compra: string | null;
  alcance_ordenes: string | null;
  tiempo_ordenes: string | null;
  valor_ordenes: number | null;
  estado_facturacion_ordenes: number | string | null;
  desviaciones_detectadas: string | null;
  justificacion_desviaciones: string | null;
  valor_otros_adiciones: number | null;
  valor_actual_contrato: number | null;
  valor_anticipo_recibido: number | null;
  valor_facturado: number | null;
  retenido: number | null;
  amortizacion_anticipo: number | null;
  valor_total_ingreso: number | null;
  valor_descuentos: number | null;
  valor_pagado: number | null;
  valor_por_amortizar: number | null;
  costos_materiales: number | null;
  costos_mano_obra: number | null;
  costos_administrativos: number | null;
  costos_ejecutados_total: number | null;
  utilidad_actual: number | null;
  utilidad_proyectada_fc: number | null;
  necesidades_apoyo: string | null;
  decisiones_gerencia: string | null;
  observaciones_cliente: string | null;
  identificacion_riesgos: string | null;
  lecciones_aprendidas: string | null;
  recomendaciones: string | null;
  // Nuevos campos Resumen Contrato
  oferente: string | null;
  nit_contratista: string | null;
  ciudad_contratista: string | null;
  representante_legal: string | null;
  nit_cliente: string | null;
  ciudad_cliente: string | null;
  capacidad: string | null;
  forma_pago: string | null;
  status?: string;
}

// ── Campos del modelo ──
export type FieldDef = {
  key: keyof ProjectTracking;
  label: string;
  type: 'text' | 'number' | 'currency' | 'percent' | 'date' | 'textarea';
  section: 'general' | 'seguimiento';
};

export const DATOS_GENERALES_FIELDS: FieldDef[] = [
  { key: 'nombre_proyecto', label: 'Nombre del Proyecto', type: 'text', section: 'general' },
  { key: 'nombre_contrato', label: 'Nombre del Contrato', type: 'textarea', section: 'general' },
  { key: 'codigo_proyecto', label: 'Código del Proyecto', type: 'text', section: 'general' },
  { key: 'cliente', label: 'Cliente', type: 'text', section: 'general' },
  { key: 'gerente_proyecto_cliente', label: 'Gerente del Proyecto - Cliente', type: 'text', section: 'general' },
  { key: 'administrador_contrato_cliente', label: 'Administrador del Contrato', type: 'text', section: 'general' },
  { key: 'interventor', label: 'Interventor', type: 'text', section: 'general' },
  { key: 'director_proyectos', label: 'Director de Proyectos', type: 'text', section: 'general' },
  { key: 'ingeniero_residente', label: 'Ingeniero Residente', type: 'text', section: 'general' },
  { key: 'supervisor', label: 'Supervisor', type: 'text', section: 'general' },
  { key: 'encargado', label: 'Encargado', type: 'text', section: 'general' },
  { key: 'tipo_contrato', label: 'Tipo de Contrato', type: 'text', section: 'general' },
  { key: 'requiere_auxilios', label: 'Requiere Auxilios', type: 'text', section: 'general' },
  { key: 'polizas_requeridas', label: 'Pólizas Requeridas', type: 'textarea', section: 'general' },
  { key: 'multas_penalidades', label: 'Multas o Penalidades', type: 'textarea', section: 'general' },
  { key: 'alcance', label: 'Alcance', type: 'textarea', section: 'general' },
  { key: 'localizacion', label: 'Localización', type: 'text', section: 'general' },
  { key: 'fecha_inicio', label: 'Fecha de Inicio', type: 'date', section: 'general' },
  { key: 'fecha_finalizacion_contractual', label: 'Fecha Finalización Contractual', type: 'date', section: 'general' },
  { key: 'valor_original_contrato', label: 'Valor Original del Contrato', type: 'currency', section: 'general' },
  { key: 'porcentaje_anticipo', label: 'Porcentaje Anticipo', type: 'percent', section: 'general' },
  { key: 'retencion_garantia', label: 'Retención en Garantía', type: 'percent', section: 'general' },
  { key: 'utilidad_proyectada', label: 'Utilidad Proyectada', type: 'percent', section: 'general' },
  // Nuevos campos Resumen Contrato
  { key: 'oferente', label: 'Oferente / Contratista', type: 'text', section: 'general' },
  { key: 'nit_contratista', label: 'NIT Contratista', type: 'text', section: 'general' },
  { key: 'ciudad_contratista', label: 'Ciudad Contratista', type: 'text', section: 'general' },
  { key: 'representante_legal', label: 'Representante Legal', type: 'text', section: 'general' },
  { key: 'nit_cliente', label: 'NIT Cliente', type: 'text', section: 'general' },
  { key: 'ciudad_cliente', label: 'Ciudad Cliente', type: 'text', section: 'general' },
  { key: 'capacidad', label: 'Capacidad', type: 'textarea', section: 'general' },
  { key: 'forma_pago', label: 'Forma de Pago', type: 'text', section: 'general' },
];

export const SEGUIMIENTO_FIELDS: FieldDef[] = [
  { key: 'fecha_terminacion_estimada', label: 'Fecha Terminación Estimada', type: 'date', section: 'seguimiento' },
  { key: 'avance_programado', label: 'Avance Programado', type: 'percent', section: 'seguimiento' },
  { key: 'avance_real', label: 'Avance Real', type: 'percent', section: 'seguimiento' },
  { key: 'modificacion_alcance', label: 'Modificación del Alcance', type: 'textarea', section: 'seguimiento' },
  { key: 'ordenes_compra', label: 'Órdenes de Compra (SI/NO)', type: 'text', section: 'seguimiento' },
  { key: 'alcance_ordenes', label: 'Alcance Órdenes', type: 'textarea', section: 'seguimiento' },
  { key: 'tiempo_ordenes', label: 'Tiempo Órdenes', type: 'text', section: 'seguimiento' },
  { key: 'valor_ordenes', label: 'Valor Órdenes', type: 'currency', section: 'seguimiento' },
  { key: 'estado_facturacion_ordenes', label: 'Estado Facturación Órdenes', type: 'text', section: 'seguimiento' },
  { key: 'desviaciones_detectadas', label: 'Desviaciones Detectadas', type: 'textarea', section: 'seguimiento' },
  { key: 'justificacion_desviaciones', label: 'Justificación Desviaciones', type: 'textarea', section: 'seguimiento' },
  { key: 'valor_otros_adiciones', label: 'Adiciones y Reducciones', type: 'currency', section: 'seguimiento' },
  { key: 'valor_actual_contrato', label: 'Valor Actual del Contrato', type: 'currency', section: 'seguimiento' },
  { key: 'valor_anticipo_recibido', label: 'Anticipo Recibido', type: 'currency', section: 'seguimiento' },
  { key: 'valor_facturado', label: 'Valor Facturado', type: 'currency', section: 'seguimiento' },
  { key: 'retenido', label: 'Retenido', type: 'currency', section: 'seguimiento' },
  { key: 'amortizacion_anticipo', label: 'Amortización del Anticipo', type: 'currency', section: 'seguimiento' },
  { key: 'valor_total_ingreso', label: 'Total Ingreso (Liquidez)', type: 'currency', section: 'seguimiento' },
  { key: 'valor_descuentos', label: 'Valor Descuentos', type: 'currency', section: 'seguimiento' },
  { key: 'valor_pagado', label: 'Valor Pagado', type: 'currency', section: 'seguimiento' },
  { key: 'valor_por_amortizar', label: 'Valor Por Amortizar', type: 'currency', section: 'seguimiento' },
  { key: 'costos_materiales', label: 'Costos: Materiales', type: 'currency', section: 'seguimiento' },
  { key: 'costos_mano_obra', label: 'Costos: Mano de Obra', type: 'currency', section: 'seguimiento' },
  { key: 'costos_administrativos', label: 'Costos: Administrativos', type: 'currency', section: 'seguimiento' },
  { key: 'costos_ejecutados_total', label: 'Costos Ejecutados Total', type: 'currency', section: 'seguimiento' },
  { key: 'utilidad_actual', label: 'Utilidad', type: 'currency', section: 'seguimiento' },
  { key: 'utilidad_proyectada_fc', label: 'Utilidad Proyectada FC', type: 'currency', section: 'seguimiento' },
  { key: 'necesidades_apoyo', label: 'Necesidades de Apoyo', type: 'textarea', section: 'seguimiento' },
  { key: 'decisiones_gerencia', label: 'Decisiones de Gerencia', type: 'textarea', section: 'seguimiento' },
  { key: 'observaciones_cliente', label: 'Observaciones del Cliente', type: 'textarea', section: 'seguimiento' },
  { key: 'identificacion_riesgos', label: 'Identificación de Riesgos', type: 'textarea', section: 'seguimiento' },
  { key: 'lecciones_aprendidas', label: 'Lecciones Aprendidas', type: 'textarea', section: 'seguimiento' },
  { key: 'recomendaciones', label: 'Recomendaciones', type: 'textarea', section: 'seguimiento' },
];

// ── Formateadores ──
export function formatCurrency(v: number | string | null | undefined): string {
  if (v == null || v === 0 || v === '') return '—';
  if (typeof v === 'string') {
    if (v.includes('$')) return v.replace('.', ',');
    const p = parseFloat(v.replace(/[^0-9.-]/g, ''));
    if (isNaN(p)) return v;
    v = p;
  }
  const hasDecimals = (v as number) % 1 !== 0;
  if (hasDecimals) {
    const isNegative = (v as number) < 0;
    const parts = Math.abs(v as number).toFixed(10).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const dec = parts[1].replace(/0+$/, '');
    return `${isNegative ? '-' : ''}$ ${parts[0]}${dec.length > 0 ? ',' + dec : ''}`;
  }
  return new Intl.NumberFormat('es-CO', { 
    style: 'currency', 
    currency: 'COP', 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  }).format(v as number);
}

export function formatPercent(v: number | string | null | undefined): string {
  if (v == null || v === '') return '—';
  
  if (typeof v === 'string') {
    if (v.includes('%')) return v.replace('.', ',');
    const p = parseFloat(v.replace(',', '.'));
    if (isNaN(p)) return v;
    v = p;
  }
  
  const num = v as number;
  const pct = num <= 1 && num >= 0 ? num * 100 : num;
  const formatted = pct % 1 === 0 
    ? pct.toFixed(1).replace('.', ',') 
    : parseFloat(pct.toFixed(10)).toString().replace('.', ',');
  return `${formatted}%`;
}

// ── Determinar estado visual a partir del avance ──
export function projectStatus(p: ProjectTracking): 'completado' | 'en_progreso' | 'atrasado' | 'sin_datos' | 'eliminado' {
  if (p.status === 'eliminado') return 'eliminado';
  const programado = p.avance_programado;
  const real = p.avance_real;
  if (programado == null || real == null) return 'sin_datos';
  if (real >= 1 && programado >= 1) return 'completado';
  if (real < programado - 0.02) return 'atrasado';
  return 'en_progreso';
}

// Mantenemos el export para compatibilidad con código existente que lo importe,
// pero en runtime el hook carga siempre desde MySQL.
export const INITIAL_PROJECTS: ProjectTracking[] = [];

// ── Persistencia: MySQL vía /api/v1/project-tracking ──
const UPDATE_EVENT = 'projects-tracking:updated';
const API_BASE = '/project-tracking';

export function useProjectsTracking() {
  const [projects, setProjectsState] = useState<ProjectTracking[]>([]);

  // Actualiza un proyecto en el servidor y en el estado local
  const updateProject = async (identifier: string, fields: Partial<ProjectTracking>) => {
    try {
      // Intentar resolver el registro por ID (PK) o project_id (Alias)
      const matches = projects.filter(p => p.id === identifier || p.project_id === identifier);
      
      if (matches.length > 1) {
        const errorMsg = `Ambigüedad detectada: El identificador "${identifier}" tiene ${matches.length} registros asociados. Por favor, use la Primary Key (id) específica.`;
        console.error(errorMsg, matches.map(m => m.id));
        throw new Error(errorMsg);
      }

      if (matches.length === 0) {
        console.warn(`No se encontró ningún registro para el identificador: ${identifier}`);
      }

      const realId = matches.length === 1 ? matches[0].id : identifier;

      // Determinar a qué endpoint enviar basándose en los campos
      const fieldKeys = Object.keys(fields);
      const isGeneral = fieldKeys.some(k => DATOS_GENERALES_FIELDS.some(f => f.key === k));
      
      const endpoint = isGeneral 
        ? `${API_BASE}/${realId}/general-data` 
        : `${API_BASE}/${realId}/tracking`;

      const res = await apiClient.patch(endpoint, fields);
      
      // La respuesta ahora viene envuelta en { success: true, data: ... }
      const updatedData = res.data.data || res.data;

      setProjectsState(prev =>
        prev.map(p => p.id === realId ? { ...p, ...updatedData } : p)
      );
      window.dispatchEvent(new Event(UPDATE_EVENT));
      return updatedData;
    } catch (err) {
      console.error('Failed to update project', err);
      throw err;
    }
  };

  const setProjects = (updater: ProjectTracking[] | ((prev: ProjectTracking[]) => ProjectTracking[])) => {
    setProjectsState(prev => {
      return typeof updater === 'function' ? (updater as (p: ProjectTracking[]) => ProjectTracking[])(prev) : updater;
    });
  };

  useEffect(() => {
    // Carga inicial desde MySQL
    apiClient.get(API_BASE)
      .then(res => {
        if (res.data && Array.isArray(res.data) && res.data.length > 0) {
          setProjectsState(res.data);
        }
      }).catch(() => {
        // Si falla la API, mantenemos los datos del JSON (fallback)
        console.warn('project-tracking API unavailable, using JSON seed data');
      });

    const handler = () => {
      apiClient.get(API_BASE)
        .then(res => {
          if (res.data && Array.isArray(res.data) && res.data.length > 0) {
            setProjectsState(res.data);
          }
        }).catch(() => {});
    };
    window.addEventListener(UPDATE_EVENT, handler);

    // Integración con Socket.io
    socketService.onPreferenceUpdated(({ key }) => {
      if (key === 'project_tracking_updated') {
        handler();
      }
    });

    return () => {
      window.removeEventListener(UPDATE_EVENT, handler);
    };
  }, []);

  const refresh = async () => {
    try {
      const res = await apiClient.get(API_BASE);
      if (res.data && Array.isArray(res.data)) {
        setProjectsState(res.data);
      }
    } catch (err) {
      console.error('Failed to refresh projects', err);
    }
  };

  // Crea un nuevo proyecto
  const createProject = async (data: Partial<ProjectTracking>) => {
    try {
      const res = await apiClient.post(API_BASE, data);
      const newProject = res.data;
      setProjectsState(prev => [...prev, newProject]);
      window.dispatchEvent(new Event(UPDATE_EVENT));
      return newProject;
    } catch (err) {
      console.error('Failed to create project', err);
      throw err;
    }
  };

  return [projects, setProjects, updateProject, createProject, refresh] as const;
}
