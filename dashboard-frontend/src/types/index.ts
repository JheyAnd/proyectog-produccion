// ========================
// Core Types for Patio Sur
// ========================

export interface Project {
  id: string;
  name: string;
  code: string;
  description: string;
  client_name: string;
  start_date: string;
  estimated_end_date: string;
  actual_end_date: string | null;
  total_budget: number;
  currency: string;
  company_id?: number | null;
  costo_pagado?: number;
  costo_facturado?: number;
  status: 'planning' | 'in_progress' | 'on_hold' | 'completed' | 'cancelled';
  location: string | null;
  project_manager: string | null;
  time_progress_percentage: number;
  created_at: string;
  updated_at: string;
  
  // Excel Tracking Data - Datos Generales
  contract_name?: string;
  client_manager?: string;
  client_admin?: string;
  project_director?: string;
  resident_engineer?: string;
  supervisor?: string;
  manager_in_charge?: string;
  contract_type?: string;
  requires_aid?: string;
  required_policies?: string;
  penalties?: string;
  scope?: string;
  contract_value_original?: number;
  advance_percentage?: number;
  retention_guarantee?: number;
  projected_utility?: number;

  // Nuevos campos Resumen Contrato
  oferente?: string;
  nit_contratista?: string;
  ciudad_contratista?: string;
  representante_legal?: string;
  nit_cliente?: string;
  ciudad_cliente?: string;
  capacidad?: string;
  forma_pago?: string;

  // Excel Tracking Data - Seguimiento y Avance
  estimated_completion_date?: string;
  planned_progress?: number;
  actual_progress?: number;
  scope_modifications?: string;
  purchase_orders_exist?: string;
  purchase_orders_scope?: string;
  purchase_orders_time?: string;
  purchase_orders_value?: number;
  purchase_orders_billing_status?: string;

  // Excel Tracking Data - Desviaciones
  detected_deviations?: string;
  deviations_justification?: string;
  support_needs?: string;
  management_decisions?: string;
  client_observations?: string;
  risk_identification?: string;
  lessons_learned?: string;
  recommendations?: string;

  // Excel Tracking Data - Financiero Contrato
  other_modifications_value?: number;
  contract_value_current?: number;
  advance_received_value?: number;
  billed_value?: number;
  retained_value?: number;
  amortization_value?: number;
  total_revenue_liquidity?: number;
  discounts_value?: number;
  paid_value?: number;
  pending_amortization_value?: number;

  // Excel Tracking Data - Costos
  costs_materials?: number;
  costs_labor?: number;
  costs_admin?: number;
  costs_total?: number;
  current_utility?: number;
  justificacion?: string; // Legacy fallback
}

export interface WBSItem {
  id: string;
  project_id: string;
  code: string;
  name: string;
  level: 'chapter' | 'sub_chapter' | 'work_package' | 'activity';
  parent_id: string | null;
  description: string | null;
  planned_start_date: string | null;
  planned_end_date: string | null;
  actual_start_date: string | null;
  actual_end_date: string | null;
  planned_progress: number;
  actual_progress: number;
  progress_deviation: number;
  is_behind_schedule: boolean;
  weight: number;
  status: string;
  sort_order: number;
}

export interface BudgetItem {
  id: string;
  project_id: string;
  wbs_item_id: string;
  code: string;
  description: string;
  category: string;
  cost_type: string;
  original_amount: number;
  unit?: string;
  quantity?: number;
  approved_changes: number;
  current_budget: number;
  committed_amount: number;
  actual_amount: number;
  available_budget: number;
  cost_variance: number;
  cost_variance_percentage: number;
  budget_consumption_percentage: number;
  is_over_budget: boolean;
}

export interface Transaction {
  id: string;
  project_id: string;
  transaction_type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  net_amount: number;
  signed_amount: number;
  transaction_date: string;
  counterparty: string | null;
  status: string;
  due_date: string | null;
  is_overdue: boolean;
}

export interface Invoice {
  id: string;
  project_id: string;
  invoice_type: 'client' | 'supplier';
  invoice_number: string;
  counterparty_name: string;
  issue_date: string;
  due_date: string;
  status: string;
  gross_total: number;
  net_total: number;
  amount_paid: number;
  balance_due: number;
  is_overdue: boolean;
  days_until_due: number;
}

export interface CashFlowEntry {
  id: string;
  project_id: string;
  year: number;
  month: number;
  period_label: string;
  projected_income: number;
  projected_expense: number;
  projected_net: number;
  actual_income: number;
  actual_expense: number;
  actual_net: number;
  is_negative_cash_flow: boolean;
}

export interface BudgetSummary {
  total_original_budget: number;
  total_approved_changes: number;
  total_current_budget: number;
  total_committed: number;
  total_actual: number;
  total_available: number;
  consumption_percentage: number;
}

export interface DashboardData {
  project: Project;
  budget_summary: BudgetSummary;
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
  };
}

export interface CustomWeekData {
  label: string;
  dateLabel: string;
  weekNum: number;
  values: Record<string, number>;
  notes?: Record<string, string>;
  actualDate?: string;
}
