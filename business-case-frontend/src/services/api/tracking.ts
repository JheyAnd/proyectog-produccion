import apiClient from './client';

export interface ProjectPending {
  id?: string;
  tipo_proceso: string;
  pendiente: string;
  nota?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  responsable?: string;
  estado: string;
}

export const trackingApi = {
  getPendings: async (projectId: string): Promise<ProjectPending[]> => {
    const response = await apiClient.get(`/projects/${projectId}/pendings`);
    return response.data;
  },
  
  createPending: async (projectId: string, data: ProjectPending): Promise<ProjectPending> => {
    const response = await apiClient.post(`/projects/${projectId}/pendings`, data);
    return response.data;
  },
  
  updatePending: async (projectId: string, pendingId: string, data: ProjectPending): Promise<ProjectPending> => {
    const response = await apiClient.put(`/projects/${projectId}/pendings/${pendingId}`, data);
    return response.data;
  },
  
  deletePending: async (projectId: string, pendingId: string): Promise<void> => {
    await apiClient.delete(`/projects/${projectId}/pendings/${pendingId}`);
  }
};
