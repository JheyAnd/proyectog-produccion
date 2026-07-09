/**
 * Cliente API para gestión de documentos v2 (por proyecto).
 * BD almacena metadatos + SharePoint almacena archivos físicos.
 */
import apiClient from './client';

// ── Types ────────────────────────────────────────────────────────────

export interface DocumentCategory {
  id: string;
  name: string;
  description?: string | null;
  display_order: number;
  icon?: string | null;
  phase?: string | null;
  is_required: boolean;
  allowed_extensions?: string | null;
}

export interface DocumentItem {
  id: string;
  project_id: string;
  category_id: string;
  category_name?: string | null;
  phase?: string | null;
  filename: string;
  file_extension: string;
  mime_type: string;
  file_size_bytes?: number | null;
  sharepoint_url: string;
  preview_url?: string | null;
  storage_type: 'sharepoint' | 'local' | 'legacy';
  uploaded_by_id: string;
  uploaded_by_name: string;
  uploaded_by_role: string;
  uploaded_at: string; // ISO
  version: number;
  is_latest_version: boolean;
  status: 'draft' | 'pending' | 'revision' | 'approved' | 'rejected' | 'obsolete';
  is_deleted: boolean;
}

export interface RequiredDoc {
  id: string;
  phase: string;
  category_id: string;
  document_type: string;
  description?: string | null;
  is_mandatory: boolean;
  responsible_role?: string | null;
  display_order: number;
}

export interface ProjectDocStatus {
  project_id: string;
  phase: string;
  total_required: number;
  total_uploaded: number;
  total_approved: number;
  completion_pct: number;
  last_updated: string;
}

// ── API Calls ────────────────────────────────────────────────────────

export const documentsV2API = {
  /** Lista categorías disponibles. */
  listCategories: async (): Promise<DocumentCategory[]> => {
    const { data } = await apiClient.get<DocumentCategory[]>('/v2/categories');
    return data;
  },

  /** Lista documentos requeridos por fase (checklist). */
  listRequiredPerPhase: async (): Promise<RequiredDoc[]> => {
    const { data } = await apiClient.get<RequiredDoc[]>('/v2/required-per-phase');
    return data;
  },

  /** Lista documentos de un proyecto. */
  listByProject: async (
    projectId: string,
    filters?: { categoryId?: string; phase?: string; includeDeleted?: boolean }
  ): Promise<DocumentItem[]> => {
    const params: Record<string, string | boolean> = {};
    if (filters?.categoryId) params.category_id = filters.categoryId;
    if (filters?.phase) params.phase = filters.phase;
    if (filters?.includeDeleted) params.include_deleted = filters.includeDeleted;

    const { data } = await apiClient.get<DocumentItem[]>(
      `/v2/projects/${projectId}/documents`,
      { params }
    );
    return data;
  },

  /** Estado de completitud del proyecto por fase. */
  getProjectStatus: async (projectId: string): Promise<ProjectDocStatus[]> => {
    const { data } = await apiClient.get<ProjectDocStatus[]>(
      `/v2/projects/${projectId}/documents/status`
    );
    return data;
  },

  /** Sube un documento. */
  upload: async (
    projectId: string,
    categoryId: string,
    file: File,
    phase?: string
  ): Promise<DocumentItem> => {
    const formData = new FormData();
    formData.append('file', file);
    if (phase) formData.append('phase', phase);

    const { data } = await apiClient.post<DocumentItem>(
      `/v2/projects/${projectId}/documents/upload/${categoryId}`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return data;
  },

  /** URL de descarga de un documento. */
  downloadUrl: (projectId: string, docId: string): string => {
    return `/api/v1/v2/projects/${projectId}/documents/${docId}/download`;
  },

  /** URL de preview de un documento. */
  previewUrl: (projectId: string, docId: string): string => {
    return `/api/v1/v2/projects/${projectId}/documents/${docId}/preview`;
  },

  /** Soft delete. */
  delete: async (projectId: string, docId: string, reason?: string): Promise<void> => {
    await apiClient.delete(`/v2/projects/${projectId}/documents/${docId}`, {
      params: reason ? { reason } : undefined,
    });
  },

  /** Restaurar documento soft-deleted. */
  restore: async (projectId: string, docId: string): Promise<DocumentItem> => {
    const { data } = await apiClient.post<DocumentItem>(
      `/v2/projects/${projectId}/documents/${docId}/restore`
    );
    return data;
  },
};
