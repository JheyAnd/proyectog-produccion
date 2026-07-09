import apiClient from './client';

export interface Alert {
  id: string;
  project_id: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  metric?: string;
  metric_label?: string;
  alert_date: string;
  resolved: boolean;
  resolved_at?: string;
  resolved_by?: string;
  created_at: string;
  updated_at: string;
}

export const alertsApi = {
  list: (projectId: string) =>
    apiClient.get<Alert[]>(`/projects/${projectId}/alerts`).then((r) => r.data),

  getById: (projectId: string, alertId: string) =>
    apiClient.get<Alert>(`/projects/${projectId}/alerts/${alertId}`).then((r) => r.data),

  create: (projectId: string, data: Omit<Alert, 'id' | 'created_at' | 'updated_at' | 'project_id'>) =>
    apiClient
      .post<Alert>(`/projects/${projectId}/alerts`, {
        ...data,
        project_id: projectId,
      })
      .then((r) => r.data),

  update: (projectId: string, alertId: string, data: Partial<Alert>) =>
    apiClient
      .put<Alert>(`/projects/${projectId}/alerts/${alertId}`, data)
      .then((r) => r.data),

  delete: (projectId: string, alertId: string) =>
    apiClient.delete(`/projects/${projectId}/alerts/${alertId}`),

  resolve: (projectId: string, alertId: string, resolved_by: string) =>
    apiClient
      .patch<Alert>(`/projects/${projectId}/alerts/${alertId}/resolve`, { resolved_by })
      .then((r) => r.data),
};
