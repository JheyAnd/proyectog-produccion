/**
 * PATIO SUR FINANCIALS SERVICE
 * ════════════════════════════════════════════════════════════════
 * ÚNICA FUENTE DE VERDAD para todos los cálculos financieros de Patio Sur.
 *
 * Los datos provienen EXCLUSIVAMENTE de:
 * - MySQL project_tracking (backend)
 * - Consultado via GET /api/v1/project-tracking
 * - NUNCA valores hardcoded
 *
 * Cambios Históricos Evitados:
 * ❌ services/api/projects.ts con mock: 41,680,062,235
 * ❌ seed_patio_sur.py con valor: 41,012,884,481
 * ✅ ÚNICA FUENTE: MySQL project_tracking
 */

import type { ProjectTracking } from '@/data/projectsTracking';

export interface PatioSurData {
  id: string;
  name: string;
  contractValue: number;       // valor_original_contrato (baseline)
  currentValue: number;        // valor_actual_contrato (con modificaciones)
  invoiced: number;            // valor_facturado
  costs: number;               // costos_ejecutados_total
  profit: number;              // utilidad_actual
  remaining: number;           // contractValue - invoiced (calculado)
  executionRate: number;       // invoiced / contractValue (%)
  modifications: number;       // valor_otros_adiciones
}

/**
 * Servicio centralizado para datos de Patio Sur.
 *
 * REGLA DE ORO:
 * Siempre usar project_tracking desde MySQL.
 * NUNCA usar valores hardcoded.
 */
export class PatioSurFinancialService {

  // ID oficial del proyecto
  static readonly OFFICIAL_PROJECT_ID = 'patio-sur-oe1035';

  /**
   * Extraer datos financieros oficiales de Patio Sur.
   *
   * @param projects - Lista de proyectos desde useProjectsTracking()
   * @returns Datos financieros completos de Patio Sur, o null si no existe
   */
  static extractOfficialData(projects: ProjectTracking[]): PatioSurData | null {
    const patioSur = projects.find(p => p.id === this.OFFICIAL_PROJECT_ID);

    if (!patioSur) {
      console.warn(`[PatioSurFinancialService] Proyecto ${this.OFFICIAL_PROJECT_ID} no encontrado en BD`);
      return null;
    }

    // VALORES OFICIALES desde MySQL
    const contractValue = patioSur.valor_original_contrato ?? 0;
    const currentValue = patioSur.valor_actual_contrato ?? contractValue;
    const invoiced = patioSur.valor_facturado ?? 0;
    const costs = patioSur.costos_ejecutados_total ?? 0;
    const profit = patioSur.utilidad_actual ?? 0;
    const modifications = patioSur.valor_otros_adiciones ?? 0;

    // CAMPOS COMPUTADOS
    const remaining = currentValue - invoiced;
    const executionRate = currentValue > 0 ? (invoiced / currentValue) * 100 : 0;

    return {
      id: patioSur.id,
      name: patioSur.nombre_proyecto || 'PATIO SUR',
      contractValue,
      currentValue,
      invoiced,
      costs,
      profit,
      remaining,
      executionRate,
      modifications,
    };
  }

  /**
   * Obtener valor de contrato oficial.
   * Prioridad: valor_actual_contrato → valor_original_contrato
   *
   * @param projects - Lista de proyectos
   * @returns Valor en COP, o 0 si no existe
   */
  static getOfficialContractValue(projects: ProjectTracking[]): number {
    const data = this.extractOfficialData(projects);
    return data?.currentValue ?? 0;
  }

  /**
   * Obtener BAC (Budget At Completion) oficial.
   * En contexto de Patio Sur, es el valor_original_contrato.
   *
   * @param projects - Lista de proyectos
   * @returns BAC en COP, o 0 si no existe
   */
  static getOfficialBAC(projects: ProjectTracking[]): number {
    const data = this.extractOfficialData(projects);
    return data?.contractValue ?? 0;
  }

  /**
   * Validar coherencia financiera de Patio Sur.
   *
   * @param projects - Lista de proyectos
   * @returns Objeto con isValid y warnings (si las hay)
   */
  static validateFinancialCoherence(projects: ProjectTracking[]): {
    isValid: boolean;
    warnings: string[];
  } {
    const data = this.extractOfficialData(projects);
    const warnings: string[] = [];

    if (!data) {
      return { isValid: false, warnings: ['Patio Sur no encontrado en BD'] };
    }

    // Validación 1: valor_actual debe ser >= valor_original + adiciones
    if (data.modifications !== 0) {
      const expected = data.contractValue + data.modifications;
      if (Math.abs(data.currentValue - expected) > 100) {
        warnings.push(
          `Inconsistencia: valor_actual (${data.currentValue}) ` +
          `no coincide con original + adiciones (${expected})`
        );
      }
    }

    // Validación 2: valor_facturado <= valor_actual_contrato
    if (data.invoiced > data.currentValue * 1.01) {
      warnings.push(
        `Advertencia: facturado (${data.invoiced}) excede contrato actual (${data.currentValue})`
      );
    }

    // Validación 3: costos ejecutados <= suma de todos los gastos
    if (data.costs > data.currentValue * 1.02) {
      warnings.push(
        `Advertencia: costos ejecutados (${data.costs}) exceden contrato (${data.currentValue})`
      );
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Resumen ejecutivo de Patio Sur para dashboards.
   *
   * @param projects - Lista de proyectos
   * @returns Objeto con métricas principales
   */
  static getExecutiveSummary(projects: ProjectTracking[]) {
    const data = this.extractOfficialData(projects);

    if (!data) {
      return {
        contractValue: 0,
        invoiced: 0,
        remaining: 0,
        executionRate: 0,
        profit: 0,
        status: 'NOT_FOUND',
      };
    }

    return {
      contractValue: data.currentValue,
      invoiced: data.invoiced,
      remaining: data.remaining,
      executionRate: parseFloat(data.executionRate.toFixed(2)),
      profit: data.profit,
      costs: data.costs,
      status: 'LOADED',
    };
  }
}

/**
 * Hook de React para usar datos de Patio Sur en componentes.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [projects] = useProjectsTracking();
 *   const patioSur = PatioSurFinancialService.extractOfficialData(projects);
 *
 *   if (!patioSur) return <div>Cargando...</div>;
 *
 *   return <div>Valor: {patioSur.contractValue}</div>;
 * }
 * ```
 */
export function usePatioSurFinancials(projects: ProjectTracking[]) {
  return {
    data: PatioSurFinancialService.extractOfficialData(projects),
    contractValue: PatioSurFinancialService.getOfficialContractValue(projects),
    bac: PatioSurFinancialService.getOfficialBAC(projects),
    summary: PatioSurFinancialService.getExecutiveSummary(projects),
    validation: PatioSurFinancialService.validateFinancialCoherence(projects),
  };
}
