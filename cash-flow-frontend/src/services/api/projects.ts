import apiClient from './client';
import type { Project, DashboardData } from '@/types';

// ============================================================
// Seed — 25 proyectos del portafolio PCMejía
// Solo Patio Sur (patio-sur-oe1035) tiene módulos desarrollados.
// Los demás se muestran en Resumen pero muestran placeholder al abrir.
// Última actualización: 14-Abr-2026
// ============================================================
export const EXCEL_PROJECTS_SEED: Project[] = [
  { id:'excel-1', name:'ALKOSTO MOSQUERA', code:'OE997', contract_name:'CONTRATO SUM CONST Y CONEXION REDES ELECTRICAS', client_name:'CONSTRUCTORA COLPATRIA SAS', client_manager:'CONSTRUCTORA COLPATRIA SAS', client_admin:'CONSTRUCTORA COLPATRIA SAS', project_director:'ALEXANDER GUTIERREZ', manager_in_charge:'JHON CASTRO', contract_type:'PRECIO GLOBAL FIJO', requires_aid:'SI', scope:'Suministro, construcción, conexión de instalaciones eléctricas', location:'MOSQUERA - CUNDINAMARCA', start_date:'2025-02-25', estimated_end_date:'2025-12-17', contract_value_original:5005409660, advance_percentage:0.4, retention_guarantee:0.1, projected_utility:0.2, total_budget:5363868610, planned_progress:1, time_progress_percentage:100, other_modifications_value:97337459, contract_value_current:5363868610, advance_received_value:2080899612, billed_value:5419782139, retained_value:0, amortization_value:0, total_revenue_liquidity:5419782139, discounts_value:26268266, paid_value:5393513873, pending_amortization_value:0, costs_materials:3044049643, costs_labor:1112284461, costs_admin:1033090811, costs_total:5189424915, current_utility:204088958, detected_deviations:'PC Mejía es constructor y diseñador. El diseño quedó mal calculado en la carga de máquinas de lavado.', deviations_justification:'No se debe realizar más presupuestos mediante estadísticas', purchase_orders_exist:'SI', purchase_orders_scope:'SUMINISTRO EN ALQUILER GENERADORES ELECTRICOS', purchase_orders_time:'60 DIAS', purchase_orders_value:261121491, support_needs:'Proyecto liquidado en su totalidad', currency:'COP', status:'completed', actual_end_date:'2025-12-17', project_manager:'ALEXANDER GUTIERREZ', description:'Suministro, construcción, conexión instalaciones eléctricas', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-2', name:'METRO BOD 102, 103 Y 900', code:'OE1014', client_name:'CONINSA SAS', client_manager:'CONINSA SAS', project_director:'ALEXANDER GUTIERREZ', contract_type:'', scope:'', location:'', start_date:'2025-01-01', estimated_end_date:'2026-12-31', total_budget:1732800000, planned_progress:1, time_progress_percentage:35, billed_value:1327800000, current_utility:418200000, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'ALEXANDER GUTIERREZ', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-3', name:'METRO LÍNEA D104', code:'OE984', client_name:'HORMIGON REFORZADO SAS', project_director:'ESTEBAN LONDOÑO', contract_type:'', scope:'Suministro y construcción de instalaciones eléctricas', location:'', start_date:'2024-01-01', estimated_end_date:'2026-06-30', total_budget:5869400000, planned_progress:1, time_progress_percentage:97, billed_value:4839300000, current_utility:-1488500000, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'ESTEBAN LONDOÑO', description:'Suministro y construcción instalaciones eléctricas Metro Línea D104', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-4', name:'BODEGAS TERRAPUERTO 4 Y 5', code:'OE979', client_name:'TERRAPUERTO S.A.S.', contract_type:'', scope:'', location:'', start_date:'2024-01-01', estimated_end_date:'2026-06-30', total_budget:650088000, planned_progress:1, time_progress_percentage:99, billed_value:649000000, current_utility:10429000, currency:'COP', status:'completed', actual_end_date:'2026-06-30', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-5', name:'MULTIPLEX HACIENDA SANTA BARBARA', code:'OE848', client_name:'CINE COLOMBIA SAS', contract_type:'', scope:'Construcción redes de media tensión, subestación e instalaciones eléctricas', location:'', start_date:'2023-01-01', estimated_end_date:'2026-06-30', total_budget:2885800000, planned_progress:1, time_progress_percentage:98, billed_value:7161800000, current_utility:689240000, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'Redes media tensión, subestación e instalaciones eléctricas Multiplex', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-6', name:'AMPLIACION CEDI CORBETA YUMBO 2025', code:'OE1041', client_name:'CORBETA COLOMBIANA DE COMERCIO', contract_type:'', scope:'', location:'Yumbo, Valle', start_date:'2025-06-01', estimated_end_date:'2027-01-01', total_budget:769100000, planned_progress:0.05, time_progress_percentage:0, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-7', name:'BURBUJAS FABRICATO', code:'OE1015', client_name:'ARQUITECTURA Y CONCRETO SAS', contract_type:'', scope:'', location:'', start_date:'2025-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:0.963, time_progress_percentage:94, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-8', name:'DISLICORES P1', code:'OE1012', client_name:'DISLICORES S.A.S.', contract_type:'', scope:'', location:'', start_date:'2025-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:1, time_progress_percentage:50, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-9', name:'CC FLORIDA ETAPA 2', code:'JV065', client_name:'CELSIA (CONINSA)', contract_type:'', scope:'', location:'', start_date:'2024-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:1, time_progress_percentage:99, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2026-12-31', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-10', name:'HOTEL CLICK CLACK', code:'OE1008', client_name:'ARIAS SERNA Y SARAVIA (ASYS)', project_director:'ESTEBAN LONDOÑO', contract_type:'', scope:'', location:'', start_date:'2025-07-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:0.15, time_progress_percentage:2.9, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'ESTEBAN LONDOÑO', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-11', name:'SAN NICOLAS ETAPA 5', code:'OE993', client_name:'MUROS Y TECHOS', contract_type:'', scope:'', location:'', start_date:'2024-06-01', estimated_end_date:'2026-09-30', total_budget:9862000000, planned_progress:0.959, time_progress_percentage:93.6, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-12', name:'HOTEL RIVANA MDE', code:'OE1033', client_name:'B&B CONSTRUCTORES S.A.S.', project_director:'MAURICIO URUEÑA', resident_engineer:'MATEO AGUIRRE', contract_type:'PRECIO GLOBAL FIJO', scope:'Instalaciones eléctricas del Hotel Rivana Medellín', location:'Medellín', start_date:'2026-01-07', estimated_end_date:'2026-10-07', contract_value_original:1098527590, total_budget:1098527590, planned_progress:0.004, time_progress_percentage:0.38, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'MAURICIO URUEÑA', description:'Instalaciones eléctricas Hotel Rivana Medellín', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-13', name:'LA CENTRAL PISO 2', code:'OE1031', client_name:'MUROS Y TECHOS', contract_type:'', scope:'', location:'', start_date:'2025-06-01', estimated_end_date:'2026-06-30', total_budget:138720000, planned_progress:1, time_progress_percentage:90, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-14', name:'LA CENTRAL PISO 6', code:'OE1030', client_name:'MUROS Y TECHOS', contract_type:'', scope:'', location:'', start_date:'2025-06-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:0.78, time_progress_percentage:65.43, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-15', name:'CDE PRIMAVERA ARENA SAB', code:'OE1013', client_name:'CLK', project_director:'JOHN LEMA', resident_engineer:'SERGIO RUBIANO', supervisor:'GABRIEL PIZARRO - DIEGO SALDARRIAGA', contract_type:'PRECIO GLOBAL FIJO', scope:'Servicios Electricidad e Iluminación Arena Primavera SAB', location:'Sabaneta, Antioquia', start_date:'2024-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:0.772, time_progress_percentage:67.95, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'JOHN LEMA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-16', name:'CD ARENA P', code:'OE1040', client_name:'CLK', contract_type:'PRECIO GLOBAL FIJO', scope:'Suministro, ejecución, construcción e instalación eléctricas', location:'Sabaneta, Antioquia', start_date:'2025-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:0.53, time_progress_percentage:40.16, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-17', name:'CC SHOPPING PREMIER LIMONAR', code:'OE894', client_name:'CONSTRUCTORA COLPATRIA SAS', contract_type:'', scope:'', location:'Cali', start_date:'2023-01-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:1, time_progress_percentage:99, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2026-06-30', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-18', name:'FISCALIA CALI', code:'OE909', client_name:'FISCALIA GENERAL DE LA NACION', contract_type:'', scope:'', location:'Cali', start_date:'2023-01-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:1, time_progress_percentage:100, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2026-06-30', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-19', name:'LABORATORIOS UNIVERSIDAD DEL ROSARIO', code:'OE797', client_name:'UNIVERSIDAD DEL ROSARIO', contract_type:'', scope:'', location:'Bogotá', start_date:'2022-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:0.4, time_progress_percentage:20, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-20', name:'SE SAI AEROPUERTO', code:'OE941', client_name:'AEROPUERTO EL DORADO', contract_type:'', scope:'', location:'Bogotá', start_date:'2024-01-01', estimated_end_date:'2026-12-31', total_budget:0, planned_progress:0.65, time_progress_percentage:55, billed_value:0, current_utility:0, currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-21', name:'HANGAR II', code:'JV077', client_name:'AEROPUERTO EL DORADO', contract_type:'', scope:'', location:'Bogotá', start_date:'2023-01-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:1, time_progress_percentage:100, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2026-06-30', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-22', name:'MANTENIMIENTO AEROPUERTO EL DORADO', code:'JV048', client_name:'AEROPUERTO EL DORADO', contract_type:'', scope:'', location:'Bogotá', start_date:'2022-01-01', estimated_end_date:'2026-06-30', total_budget:0, planned_progress:1, time_progress_percentage:100, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2026-06-30', project_manager:'PC MEJIA', description:'', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-23', name:'ED SAN MARTIN', code:'OE819', client_name:'BANCOLOMBIA', project_director:'ESTEBAN LONDOÑO', contract_type:'PRECIOS UNITARIOS', scope:'Repotenciación del edificio Bancolombia San Martin', location:'Bogotá', start_date:'2022-01-01', estimated_end_date:'2023-03-01', total_budget:0, planned_progress:1, time_progress_percentage:99, billed_value:0, current_utility:0, currency:'COP', status:'completed', actual_end_date:'2023-03-01', project_manager:'ESTEBAN LONDOÑO', description:'Repotenciación edificio Bancolombia San Martin', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'patio-sur-oe1035', name:'PATIO SUR', code:'OE 1035', contract_name:'ELECTRIFICACION PATIO SUR', client_name:'CONSORCIO EXPRES', client_manager:'CONSORCIO EXPRES', client_admin:'CONSORCIO EXPRES', project_director:'ESTEBAN LONDOÑO', resident_engineer:'DANIELA ARANGO', supervisor:'JAVIER PINZON', contract_type:'EPC', requires_aid:'NO', scope:'Instalaciones eléctricas y civiles para la infraestructura de recarga eléctrica para buses articulados y bi articulados para el patio troncar sur en Bogotá DC', location:'PATIO PORTAL SUR', start_date:'2025-10-03', estimated_end_date:'2026-07-03', estimated_completion_date:'2026-07-03', contract_value_original:41012884481, advance_percentage:0, retention_guarantee:0, projected_utility:6324837989, total_budget:41012884481, planned_progress:0.5973, time_progress_percentage:58.64, contract_value_current:41012884481, billed_value:16756029113, total_revenue_liquidity:16756029113, paid_value:16756029113, costs_labor:190239701, costs_admin:508185745, costs_total:7797591572, current_utility:6324837989, detected_deviations:'Retrasos en la ejecución por incumplimientos en el cronograma por parte de R2F (envolventes, placas de contra piso subestaciones 1, y enlace). Al contratista se le ha solicitado un plan de choque para dar solución a estos incumplimientos.', deviations_justification:'Inicio tardío de actividades por falta de recursos económicos y actualmente falta de mayor número de funcionarios en obra (R2F) y actualización de procesos al interior de Enel.', recommendations:'Dado el tipo de infraestructura se deben contar con todos los recursos financieros y permisos, licencias, programas y sistemas de gestión enfocados a la ejecución del proyecto', currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'ESTEBAN LONDOÑO', description:'Instalaciones eléctricas y civiles para la infraestructura de recarga eléctrica para buses articulados y bi articulados en Bogotá DC', created_at:'2025-06-20T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
  { id:'excel-25', name:'IGLESIA MANANTIALES DE VIDA', code:'OE996', client_name:'OBRAS CAPITAL', project_director:'MAURICIO URUEÑA', resident_engineer:'LUISAN GELIS LOPEZ', supervisor:'ALBEIRO CICERO', contract_type:'PRECIOS UNITARIOS', requires_aid:'NO', scope:'Instalaciones eléctricas generales, subestación, suministro de equipos para la nueva iglesia', location:'Bogotá', start_date:'2024-12-01', estimated_end_date:'2026-12-31', contract_value_original:5382738102, advance_percentage:0.3, retention_guarantee:0.1, total_budget:5645137080, planned_progress:0.62, time_progress_percentage:12, other_modifications_value:226000368, contract_value_current:5645137080, advance_received_value:1345684525, billed_value:757795648, retained_value:75779565, amortization_value:189417594, total_revenue_liquidity:492598489, paid_value:606773506, pending_amortization_value:1156266931, costs_labor:627698372, costs_admin:352778146, costs_total:629721806, current_utility:0, detected_deviations:'Liberación tardía de espacios por parte del constructor dada la forma constructiva, modificación de diseños', deviations_justification:'Falta de definiciones oportunas por parte del cliente final, modificación de diseños', support_needs:'Flujo de materiales', management_decisions:'EJECUCIÓN DE ACTIVIDADES EN HORARIO EXTRA', risk_identification:'Disminución en la utilidad por cambios en diseño y avance de obra civil', lessons_learned:'Exigencia de cronograma de obra civil, solicitar aprobación de adicionales por parte del cliente antes de ejecutar', currency:'COP', status:'in_progress', actual_end_date:null, project_manager:'MAURICIO URUEÑA', description:'Instalaciones eléctricas generales, subestación, suministro de equipos para la nueva iglesia', created_at:'2026-04-14T00:00:00Z', updated_at:'2026-04-14T00:00:00Z' } as Project,
];

export const PATIO_SUR_PROJECT = EXCEL_PROJECTS_SEED.find(p => p.id === 'patio-sur-oe1035')!;

// ── API REST contra MySQL — fuente de verdad ──────────────────────────────────
// El modo "demo" con localStorage fue eliminado: todos los datos van a MySQL.
// EXCEL_PROJECTS_SEED se mantiene únicamente como referencia estática para
// mostrar datos mientras la API carga (skeleton state).

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    try {
      return await apiClient.get<Project[]>('/projects').then((r) => r.data);
    } catch {
      // Fallback de emergencia: seed estático (solo si la API no está disponible)
      console.warn('[projectsApi.list] API unavailable — using static seed as fallback');
      return EXCEL_PROJECTS_SEED;
    }
  },

  getById: async (id: string): Promise<Project> => {
    try {
      // Siempre intentar la BD primero
      return await apiClient.get<Project>(`/projects/${id}`).then(r => r.data);
    } catch (error: any) {
      // Solo usar fallback si es error de red (offline)
      // Si es 404 → el proyecto no existe → no usar fallback de Patio Sur
      if (error?.response?.status === 404) {
        throw new Error(`Proyecto ${id} no encontrado.`);
      }

      // Fallback solo para errores de red
      const found = EXCEL_PROJECTS_SEED.find(p => p.id === id);
      if (found) return found;

      // Fallback genérico neutro — NUNCA devolver PATIO_SUR_PROJECT
      return {
        id,
        name: id,
        company_id: null, // desconocido — no asumir
        currency: 'COP',  // default seguro
        status: 'unknown',
      } as unknown as Project;
    }
  },

  create: async (data: Partial<Project>): Promise<Project> => {
    return apiClient.post<Project>('/projects', data).then((r) => r.data);
  },

  update: async (id: string, data: Partial<Project>): Promise<Project> => {
    return apiClient.put<Project>(`/projects/${id}`, data).then((r) => r.data);
  },

  bulkUpsert: async (projectsList: Project[]): Promise<Project[]> => {
    return apiClient.post<Project[]>('/projects/bulk', projectsList).then(r => r.data);
  },

  updateRealCosts: async (id: string, data: { costo_facturado: number; costo_pagado: number }): Promise<Project> => {
    return apiClient.patch<Project>(`/projects/${id}/costos-reales`, data).then((r) => r.data);
  },

  delete: async (id: string) => {
    return apiClient.delete(`/projects/${id}`);
  },

  getDashboard: (id: string) =>
    apiClient.get<DashboardData>(`/projects/${id}/dashboard`).then((r) => r.data),
};
