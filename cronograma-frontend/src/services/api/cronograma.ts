import apiClient from './client';

export interface CronogramaCorte {
  id: number;
  project_id: string;
  semana: number;
  fecha_corte: string | null;
  avance_planeado: number;
  avance_ejecutado: number | null;
  origen: 'historico' | 'snapshot_usuario';
  detalle_json?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CronogramaProyectado {
  id: string;
  project_id: string;
  semana: number;
  fecha_semana: string;
  avance_planeado: number;
  created_at: string;
}

export interface CronogramaSimulacion {
  id: number;
  project_id: string;
  nombre: string;
  estado_json: any;
  created_at: string;
}

export const cronogramaApi = {
  listCortes: async (projectId: string): Promise<CronogramaCorte[]> => {
    const res = await apiClient.get(`/cronograma/${projectId}/cortes`);
    return res.data;
  },
  createCorte: async (projectId: string, data: Partial<CronogramaCorte>): Promise<CronogramaCorte> => {
    const res = await apiClient.post(`/cronograma/${projectId}/cortes`, data);
    return res.data;
  },
  updateCorte: async (corteId: number, data: Partial<CronogramaCorte>): Promise<CronogramaCorte> => {
    const res = await apiClient.patch(`/cronograma/cortes/${corteId}`, data);
    return res.data;
  },
  deleteCorte: async (corteId: number): Promise<void> => {
    await apiClient.delete(`/cronograma/cortes/${corteId}`);
  },
  getProyectado: async (projectId: string): Promise<CronogramaProyectado[]> => {
    const res = await apiClient.get(`/cronograma/${projectId}/proyectado`);
    return res.data;
  },
  getActividades: async (projectId: string): Promise<any[]> => {
    const res = await apiClient.get(`/cronograma/${projectId}/actividades`);
    return res.data;
  },
  getSemanaActual: async (projectId: string): Promise<any> => {
    const res = await apiClient.get(`/cronograma/${projectId}/semana-actual`);
    return res.data;
  },
  importExcel: async (projectId: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post(`/cronograma/${projectId}/import`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  listSimulaciones: async (projectId: string): Promise<CronogramaSimulacion[]> => {
    const res = await apiClient.get(`/cronograma/${projectId}/simulaciones`);
    return res.data;
  },
  createSimulacion: async (projectId: string, nombre: string, estado_json: string): Promise<{ id: number, nombre: string }> => {
    const res = await apiClient.post(`/cronograma/${projectId}/simulaciones`, {
      nombre,
      estado_json
    });
    return res.data;
  },
  updateSimulacion: async (simId: number, nombre?: string, estado_json?: string): Promise<any> => {
    const res = await apiClient.put(`/cronograma/simulaciones/${simId}`, {
      nombre,
      estado_json
    });
    return res.data;
  },
  deleteSimulacion: async (simId: number): Promise<void> => {
    await apiClient.delete(`/cronograma/simulaciones/${simId}`);
  },
  runSimulation: async (payload: any): Promise<any> => {
    const res = await apiClient.post(`/cronograma/simulaciones/run`, payload);
    return res.data;
  }
};
