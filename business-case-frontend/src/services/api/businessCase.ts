/**
 * Cliente API para módulo Caso de Negocio.
 *
 * Origen: Excel "Detallado caso de negocio_220126.xlsx"
 * Política: importar Excel REEMPLAZA datos. Edición manual queda auditada.
 */
import apiClient from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface BusinessCase {
  id: string;
  project_id: string;
  scenario_active: string;
  usd_rate: number;
  valor_oferta_total: number;
  costo_total_sin_fin: number;
  costo_total_con_fin: number;
  margen_bruto_valor: number;
  margen_bruto_pct: number;
  administracion_valor: number;
  financiacion_valor: number;
  meses_sin_ingresos?: number | null;
  source_excel_filename?: string | null;
  last_imported_at?: string | null;
  last_imported_by_name?: string | null;
  updated_at: string;

  // Paso 1: Valores Manuales
  venta_monto_manual?: number | null;
  venta_materiales?: number | null;
  venta_servicios?: number | null;
  venta_administracion?: number | null;
  venta_mano_obra?: number | null;
  venta_intereses?: number | null;
  costo_monto_manual?: number | null;
  costo_materiales?: number | null;
  costo_servicios?: number | null;
  costo_administracion?: number | null;
  costo_mano_obra?: number | null;
  costo_intereses?: number | null;
  valores_manuales_completos?: boolean;

  // Flags de validación
  venta_excel_validado?: boolean;
  costo_excel_validado?: boolean;
}

export interface BusinessCaseChapter {
  id: string;
  business_case_id: string;
  group_id: 'suministro' | 'mano-obra' | 'administracion' | 'intereses';
  group_name: string;
  chapter_id: string;
  chapter_name: string;
  venta: number;
  costo: number;
  display_order: number;
}

export interface BusinessCaseAIU {
  id: string;
  business_case_id: string;
  tipo: string;
  label: string;
  venta: number;
  costo: number;
  percentage?: number | null;
  display_order: number;
}

export interface ProcurementItem {
  id: string;
  capitulo: string;
  proveedor?: string | null;
  negociado: number;
  pendiente: number;
  display_order: number;
}

export interface ProcurementGroup {
  id: string;
  ref: string;
  caso_negocio: number;
  negociado: number;
  pendiente: number;
  proyectado: number;
  display_order: number;
  items: ProcurementItem[];
}

export interface IndirectCost {
  id: string;
  seccion: string;
  item_code?: string | null;
  descripcion: string;
  unidad?: string | null;
  cantidad?: number | null;
  vr_unitario?: number | null;
  total: number;
  display_order: number;
}

export interface BusinessCaseScenario {
  id: string;
  scenario_name: string;
  usd_rate: number;
  total_oferta: number;
  total_costo: number;
  margen_pct: number;
  is_active: boolean;
}

export interface AuditLogEntry {
  id: string;
  table_name: string;
  record_id: string;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  user_name: string;
  user_role: string;
  occurred_at: string;
  notes?: string | null;
}

export interface FullBusinessCaseResponse {
  business_case: BusinessCase;
  chapters: BusinessCaseChapter[];
  aiu: BusinessCaseAIU[];
  procurement: ProcurementGroup[];
  indirect_costs: IndirectCost[];
  scenarios: BusinessCaseScenario[];
}

// ── API Calls ────────────────────────────────────────────────────────

export const businessCaseAPI = {
  /** Carga payload completo del caso de negocio. */
  getFull: async (projectId: string): Promise<FullBusinessCaseResponse> => {
    const { data } = await apiClient.get<FullBusinessCaseResponse>(
      `/projects/${projectId}/business-case/full`
    );
    return data;
  },

  /** Solo el resumen (KPIs). */
  getSummary: async (projectId: string): Promise<BusinessCase> => {
    const { data } = await apiClient.get<BusinessCase>(
      `/projects/${projectId}/business-case`
    );
    return data;
  },

  /** Capítulos Costo vs Venta. */
  getChapters: async (projectId: string): Promise<BusinessCaseChapter[]> => {
    const { data } = await apiClient.get<BusinessCaseChapter[]>(
      `/projects/${projectId}/business-case/chapters`
    );
    return data;
  },

  /** Items AIU. */
  getAIU: async (projectId: string): Promise<BusinessCaseAIU[]> => {
    const { data } = await apiClient.get<BusinessCaseAIU[]>(
      `/projects/${projectId}/business-case/aiu`
    );
    return data;
  },

  /** Procurement detalle. */
  getProcurement: async (projectId: string): Promise<ProcurementGroup[]> => {
    const { data } = await apiClient.get<ProcurementGroup[]>(
      `/projects/${projectId}/business-case/procurement`
    );
    return data;
  },

  /** Costos Indirectos. */
  getIndirectCosts: async (projectId: string): Promise<IndirectCost[]> => {
    const { data } = await apiClient.get<IndirectCost[]>(
      `/projects/${projectId}/business-case/indirect-costs`
    );
    return data;
  },

  /** Escenarios. */
  getScenarios: async (projectId: string): Promise<BusinessCaseScenario[]> => {
    const { data } = await apiClient.get<BusinessCaseScenario[]>(
      `/projects/${projectId}/business-case/scenarios`
    );
    return data;
  },

  /** Editar capítulo (auditado). */
  updateChapter: async (
    projectId: string,
    chapterId: string,
    updates: { venta?: number; costo?: number; notes?: string }
  ): Promise<BusinessCaseChapter> => {
    const { data } = await apiClient.put<BusinessCaseChapter>(
      `/projects/${projectId}/business-case/chapters/${chapterId}`,
      updates
    );
    return data;
  },

  /** Editar AIU (auditado). */
  updateAIU: async (
    projectId: string,
    aiuId: string,
    updates: { venta?: number; costo?: number; notes?: string }
  ): Promise<BusinessCaseAIU> => {
    const { data } = await apiClient.put<BusinessCaseAIU>(
      `/projects/${projectId}/business-case/aiu/${aiuId}`,
      updates
    );
    return data;
  },

  /** Activar escenario. */
  activateScenario: async (
    projectId: string,
    scenarioId: string
  ): Promise<BusinessCaseScenario> => {
    const { data } = await apiClient.post<BusinessCaseScenario>(
      `/projects/${projectId}/business-case/scenarios/activate`,
      { scenario_id: scenarioId }
    );
    return data;
  },

  /** Audit log. */
  getAuditLog: async (projectId: string, limit = 100): Promise<AuditLogEntry[]> => {
    const { data } = await apiClient.get<AuditLogEntry[]>(
      `/projects/${projectId}/business-case/audit-log`,
      { params: { limit } }
    );
    return data;
  },

  /** Importar Excel (REEMPLAZA datos). */
  importExcel: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/projects/${projectId}/business-case/import-excel`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Obtiene el estado de los entregables (venta/costo cargado). */
  getStatus: async (projectId: string): Promise<{
    venta_cargado: boolean;
    costo_cargado: boolean;
    valor_oferta_total: number;
    costo_total: number;
    valores_manuales_completos: boolean;
    venta_monto_manual?: number;
    venta_materiales?: number;
    venta_servicios?: number;
    venta_administracion?: number;
    venta_mano_obra?: number;
    venta_intereses?: number;
    costo_monto_manual?: number;
    costo_materiales?: number;
    costo_servicios?: number;
    costo_administracion?: number;
    costo_mano_obra?: number;
    costo_intereses?: number;
    venta_excel_validado: boolean;
    costo_excel_validado: boolean;
  }> => {
    const { data } = await apiClient.get(
      `/projects/${projectId}/business-case/status`
    );
    return data;
  },

  /** Guarda los valores manuales (Paso 1). */
  saveManualValues: async (projectId: string, values: any): Promise<any> => {
    const { data } = await apiClient.patch(
      `/projects/${projectId}/business-case/valores-manuales`,
      values
    );
    return data;
  },

  /** Marca el presupuesto de venta como validado. */
  validateVenta: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.patch(
      `/projects/${projectId}/business-case/upload/venta`
    );
    return data;
  },

  /** Marca el presupuesto de costo como validado. */
  validateCosto: async (projectId: string): Promise<any> => {
    const { data } = await apiClient.patch(
      `/projects/${projectId}/business-case/upload/costo`
    );
    return data;
  },

  /** Sube presupuesto de venta y detecta total. */
  uploadVenta: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/projects/${projectId}/business-case/upload/venta`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Sube presupuesto de costo y detecta total. */
  uploadCosto: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/projects/${projectId}/business-case/upload/costo`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Importar Excel con parser especializado LYRA. */
  importLyraCarsan: async (projectId: string, file: File, trm: number, tipo: 'venta' | 'costo'): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/projects/${projectId}/business-case/import/lyra-carsan?trm=${trm}&tipo=${tipo}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Parsea el Excel de presupuesto y clasifica las líneas detalladas mediante Claude. */
  parseDetail: async (projectId: string, tipo: 'venta' | 'costo'): Promise<any> => {
    const { data } = await apiClient.post(
      `/projects/${projectId}/business-case/parse-detail`,
      { tipo }
    );
    return data;
  },

  /** Retorna todas las líneas de detalle del Caso de Negocio clasificadas por la IA. */
  getDetails: async (projectId: string): Promise<any[]> => {
    const { data } = await apiClient.get<any[]>(
      `/projects/${projectId}/business-case/details`
    );
    return data;
  },
};
