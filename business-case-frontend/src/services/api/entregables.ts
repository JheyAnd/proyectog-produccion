import apiClient from './client';
import { useAuthStore } from '../../stores/authStore';

export interface EntregableMeta {
  id: string;
  project_id: string;
  doc_type: string;
  filename: string;
  file_size: number;
  content_type: string;
  uploaded_at: string;
  uploaded_by: string | null;
}

function isDemoMode(): boolean {
  return !useAuthStore.getState().token;
}

export const entregablesApi = {
  list: async (projectId: string): Promise<EntregableMeta[]> => {
    if (isDemoMode()) return [];
    try {
      return await apiClient
        .get<EntregableMeta[]>(`/projects/${projectId}/entregables`)
        .then((r) => r.data);
    } catch {
      return [];
    }
  },

  upload: async (projectId: string, docType: string, file: File, uploadedBy?: string): Promise<EntregableMeta> => {
    const form = new FormData();
    form.append('file', file);
    const url = `/projects/${projectId}/entregables/${docType}` + (uploadedBy ? `?uploaded_by=${encodeURIComponent(uploadedBy)}` : '');
    return await apiClient
      .post<EntregableMeta>(url, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },

  downloadUrl: (projectId: string, docType: string): string =>
    `/api/v1/projects/${projectId}/entregables/${docType}/download`,

  download: async (projectId: string, docType: string, filename: string): Promise<void> => {
    const res = await apiClient.get(
      `/projects/${projectId}/entregables/${docType}/download`,
      { responseType: 'blob' }
    );
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  },

  remove: async (projectId: string, docType: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/entregables/${docType}`);
  },
};
