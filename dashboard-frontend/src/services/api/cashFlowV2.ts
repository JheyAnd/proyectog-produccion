/**
 * Cliente API v2 para Flujo de Caja.
 *
 * Origen: Excel "Flujo de caja patio sur 6 abril.xlsx" → Hoja "FC X Obras"
 * Política:
 *   - Importar Excel → REEMPLAZA datos
 *   - Edición manual → auditada en cash_flow_audit_log
 */
import apiClient from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface CashFlowCategoria {
  id: string;
  nombre: string;
  grupo: 'materiales' | 'mano_obra' | 'administracion' | 'ingreso';
  incluir_en_grafico: boolean;
  sort_order: number;
  valores: Record<string, number>;
}

export interface CashFlowSummary {
  project_id: string;
  total_categorias: number;
  grupos: Record<string, number>;
  total_general: number;
  real_acumulado_actual: Record<string, number>;
  proyectado_total: number;
  last_imported_at?: string | null;
  last_imported_by?: string | null;
  last_imported_filename?: string | null;
}

export interface CashFlowAuditEntry {
  id: string;
  categoria_nombre?: string | null;
  grupo?: string | null;
  mes_key?: string | null;
  field_name: string;
  old_value?: string | null;
  new_value?: string | null;
  user_name: string;
  user_role: string;
  action: 'edit' | 'create' | 'delete' | 'import_excel' | 'bulk_update';
  occurred_at: string;
  notes?: string | null;
}

export interface CashFlowImportEntry {
  id: string;
  filename: string;
  sheet_name?: string | null;
  total_categorias: number;
  total_valores: number;
  sum_total: number;
  imported_by_name: string;
  imported_by_role: string;
  status: 'success' | 'partial' | 'failed';
  imported_at: string;
}

// ── Cell Details (factura, proveedor, valor, nota) ────────────

export interface CellDetail {
  id: string;
  project_id: string;
  categoria_id: string;
  mes_key: string;
  numero_oc?: string | null;
  numero_factura: string;
  proveedor?: string | null;
  valor: number;
  nota?: string | null;
  fecha_factura?: string | null;
  documento_id?: string | null;
  
  has_doc_oc?: boolean;
  doc_oc_contrato_nombre?: string | null;
  has_doc_factura?: boolean;
  doc_factura_nombre?: string | null;
  
  created_by_name: string;
  created_by_role: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  incluir_en_grafico?: boolean;
}

export interface CellSummary {
  project_id: string;
  categoria_id: string;
  mes_key: string;
  total_celda: number;
  total_detalles: number;
  detalles: CellDetail[];
}

export interface CellDetailInput {
  id?: string | null;            // null = crear, string = update
  categoria_id?: string | null;
  numero_oc?: string | null;
  numero_factura: string;
  proveedor?: string | null;
  valor: number;
  nota?: string | null;
  fecha_factura?: string | null;
  documento_id?: string | null;
  is_deleted?: boolean;
  incluir_en_grafico?: boolean;
  
  doc_oc_file?: File | null;
  doc_factura_file?: File | null;
}

// ── API Calls ────────────────────────────────────────────────────────

export const cashFlowV2API = {
  /** Lista todas las categorías con sus valores. */
  listCategorias: async (
    projectId: string,
    grupo?: string
  ): Promise<CashFlowCategoria[]> => {
    const { data } = await apiClient.get<CashFlowCategoria[]>(
      `/v2/projects/${projectId}/cash-flow/categorias`,
      { params: grupo ? { grupo } : {} }
    );
    return data;
  },

  /** Resumen del proyecto: totales por grupo + Real Acumulado. */
  getSummary: async (
    projectId: string,
    cutoffMonth = '2026-04'
  ): Promise<CashFlowSummary> => {
    const { data } = await apiClient.get<CashFlowSummary>(
      `/v2/projects/${projectId}/cash-flow/summary`,
      { params: { cutoff_month: cutoffMonth } }
    );
    return data;
  },

  /** Editar valor mensual (auditado). */
  updateValor: async (
    projectId: string,
    categoriaId: string,
    payload: { mes_key: string; nuevo_valor: number; notes?: string }
  ): Promise<{ changed: boolean; old_value?: number; new_value?: number }> => {
    const { data } = await apiClient.put(
      `/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/valores`,
      payload
    );
    return data;
  },

  /** Importar Excel (REEMPLAZA datos). */
  importExcel: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await apiClient.post(
      `/v2/projects/${projectId}/cash-flow/import-excel`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** Audit log de ediciones. */
  getAuditLog: async (
    projectId: string,
    limit = 100
  ): Promise<CashFlowAuditEntry[]> => {
    const { data } = await apiClient.get<CashFlowAuditEntry[]>(
      `/v2/projects/${projectId}/cash-flow/audit-log`,
      { params: { limit } }
    );
    return data;
  },

  /** Historial de importaciones. */
  getImportLog: async (
    projectId: string,
    limit = 50
  ): Promise<CashFlowImportEntry[]> => {
    const { data } = await apiClient.get<CashFlowImportEntry[]>(
      `/v2/projects/${projectId}/cash-flow/import-log`,
      { params: { limit } }
    );
    return data;
  },

  // ── Cell Details ────────────────────────────────────────────

  /** Obtener detalles de una celda (categoría × mes). */
  getCellDetails: async (
    projectId: string,
    categoriaId: string,
    mesKey: string,
    includeDeleted = false
  ): Promise<CellSummary> => {
    const { data } = await apiClient.get<CellSummary>(
      `/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/cell-details/${mesKey}`,
      { params: includeDeleted ? { include_deleted: true } : {} }
    );
    return data;
  },

  /** Crear un detalle. */
  createCellDetail: async (
    projectId: string,
    categoriaId: string,
    mesKey: string,
    detail: Omit<CellDetailInput, 'id' | 'is_deleted'>
  ): Promise<CellDetail> => {
    const { data } = await apiClient.post<CellDetail>(
      `/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/cell-details/${mesKey}`,
      detail
    );
    return data;
  },

  /** Editar un detalle. */
  updateCellDetail: async (
    projectId: string,
    detailId: string,
    updates: Partial<Omit<CellDetailInput, 'id' | 'is_deleted'>>
  ): Promise<CellDetail> => {
    const { data } = await apiClient.put<CellDetail>(
      `/v2/projects/${projectId}/cash-flow/cell-details/${detailId}`,
      updates
    );
    return data;
  },

  /** Soft delete de un detalle. */
  deleteCellDetail: async (
    projectId: string,
    detailId: string,
    reason?: string
  ): Promise<void> => {
    await apiClient.delete(
      `/v2/projects/${projectId}/cash-flow/cell-details/${detailId}`,
      { params: reason ? { reason } : undefined }
    );
  },

  /** Restaurar detalle eliminado. */
  restoreCellDetail: async (
    projectId: string,
    detailId: string
  ): Promise<CellDetail> => {
    const { data } = await apiClient.post<CellDetail>(
      `/v2/projects/${projectId}/cash-flow/cell-details/${detailId}/restore`
    );
    return data;
  },

  /** Bulk upsert: reemplaza todos los detalles de una celda. */
  bulkUpsertCellDetails: async (
    projectId: string,
    categoriaId: string,
    mesKey: string,
    details: CellDetailInput[]
  ): Promise<CellSummary> => {
    let hasFiles = false;
    const formData = new FormData();
    details.forEach((d, index) => {
      if (d.doc_oc_file instanceof File) {
        hasFiles = true;
        formData.append(`doc_oc_${index}`, d.doc_oc_file);
      }
      if (d.doc_factura_file instanceof File) {
        hasFiles = true;
        formData.append(`doc_factura_${index}`, d.doc_factura_file);
      }
    });

    if (hasFiles) {
      const cleanDetails = details.map(d => {
        const { doc_oc_file, doc_factura_file, ...rest } = d;
        return rest;
      });
      formData.append('details', JSON.stringify(cleanDetails));
      const { data } = await apiClient.post<CellSummary>(
        `/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/cell-details/${mesKey}/bulk`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return data;
    } else {
      const cleanDetails = details.map(d => {
        const { doc_oc_file, doc_factura_file, ...rest } = d;
        return rest;
      });
      const { data } = await apiClient.post<CellSummary>(
        `/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/cell-details/${mesKey}/bulk`,
        { details: cleanDetails }
      );
      return data;
    }
  },

  /** Lista de proveedores únicos (autocomplete). */
  listProveedores: async (projectId: string): Promise<string[]> => {
    const { data } = await apiClient.get<string[]>(
      `/v2/projects/${projectId}/cash-flow/proveedores`
    );
    return data;
  },
};
