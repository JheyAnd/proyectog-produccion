import apiClient from './client';

export interface DashboardData {
  project: {
    id: string;
    name: string;
    code: string;
    description: string;
    client_name: string;
    start_date: string;
    estimated_end_date: string;
    total_budget: number;
    currency: string;
    status: string;
    costo_pagado?: number;
    costo_facturado?: number;
  };
  budget_summary: {
    total_original_budget: number;
    total_approved_changes: number;
    total_current_budget: number;
    total_committed: number;
    total_actual: number;
    total_available: number;
    consumption_percentage: number;
  };
  cash_flow_summary: {
    total_projected_income: number;
    total_projected_expense: number;
    total_actual_income: number;
    total_actual_expense: number;
    projected_net: number;
    actual_net: number;
  };
  counts: {
    recent_transactions: number;
    pending_invoices: number;
    overdue_invoices: number;
  };
  earned_value: {
    bac: number;
    actual_cost: number;
    earned_value_amount?: number;
    planned_value_amount?: number;
    cpi: number;
    cpi_contractual: number;
    spi: number;
    spi_contractual: number;
    eac: number;
    note?: string;
  };
}

export const dashboardApi = {
  get: (projectId: string) =>
    apiClient.get<DashboardData>(`/projects/${projectId}/dashboard`).then((r) => r.data),
  getGlobalCashFlow: () =>
    apiClient.get<GlobalCashFlowData>('/dashboard/global-cash-flow').then((r) => r.data),
};

export interface GlobalCashFlowData {
  globalStats: {
    total_income: number;
    total_expense: number;
    net: number;
    active_projects: number;
  };
  monthlyData: {
    periodo: string;
    ingreso: number;
    egreso: number;
    neto: number;
  }[];
  projects: {
    id: string;
    name: string;
    client_name: string;
    total_income: number;
    total_expense: number;
    net: number;
  }[];
}
