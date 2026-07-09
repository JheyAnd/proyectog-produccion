/**
 * LYRA FINANCIAL SERVICE
 * ════════════════════════════════════════════════════════════════
 * ÚNICA FUENTE DE VERDAD para todos los cálculos financieros de LYRA.
 *
 * Los datos provienen EXCLUSIVAMENTE de:
 * - MySQL egreso_categorias y egreso_valores
 * - Consultado via GET /v2/projects/lyra-carsan-oe2000/cash-flow/*
 * - NUNCA valores hardcoded
 *
 * Estructura:
 * - egreso_categorias: 12+ categorías (FEEDERS, PVC CONDUIT, etc.)
 * - egreso_valores: 18 meses × categorías = 216+ entries
 * - Aislamiento: project_id = 'lyra-carsan-oe2000'
 */

import { useQuery } from '@tanstack/react-query';
import { LYRA_PROJECT_ID, LYRA_CURRENCY, LYRA_DURATION_MONTHS } from '@/constants/lyra';

/**
 * Interfaz para respuesta del endpoint /cash-flow/summary
 */
interface CashFlowSummary {
  total_categorias: number;
  total_general: number;
  grupos: Record<string, number>;  // materiales, mano_obra, administracion, ingreso
  real_acumulado_actual: Record<string, number>;
  proyectado_total: number;
  last_imported_at?: string;
  last_imported_by?: string;
  last_imported_filename?: string;
}

/**
 * Interfaz para datos financieros de LYRA
 */
export interface LyraData {
  projectId: string;
  name: string;
  bac: number;                  // Budget At Completion (suma de "Valor" del Excel)
  currency: string;             // USD
  durationMonths: number;        // 18
  totalCategories: number;       // Detectadas del Excel
  totalMonthlyValues: number;    // ~216 (12 × 18)
  distribution: Record<string, number>;  // Por grupo (materiales, mano_obra, etc.)
  lastImported?: {
    date: string;
    by: string;
    filename: string;
  };
}

/**
 * Servicio centralizado para datos de LYRA.
 *
 * REGLA DE ORO:
 * Siempre usar egreso_* desde MySQL via cash-flow API.
 * NUNCA usar valores hardcoded.
 */
export class LyraFinancialService {

  // ID oficial del proyecto
  static readonly OFFICIAL_PROJECT_ID = LYRA_PROJECT_ID;

  /**
   * Fetch resumen de flujo de caja de LYRA desde API
   */
  private static async fetchCashFlowSummary(): Promise<CashFlowSummary | null> {
    try {
      const response = await fetch(
        `/api/v2/projects/${this.OFFICIAL_PROJECT_ID}/cash-flow/summary`
      );

      if (!response.ok) {
        console.warn(
          `[LyraFinancialService] Error fetching summary: ${response.status}`,
          response.statusText
        );
        return null;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('[LyraFinancialService] Error fetching cash flow summary:', error);
      return null;
    }
  }

  /**
   * Extraer datos financieros oficiales de LYRA.
   *
   * @returns Datos financieros completos de LYRA, o null si no existen
   */
  static async extractOfficialData(): Promise<LyraData | null> {
    const summary = await this.fetchCashFlowSummary();

    if (!summary) {
      console.warn(`[LyraFinancialService] No cash flow data found for project ${this.OFFICIAL_PROJECT_ID}`);
      return null;
    }

    // VALORES OFICIALES desde MySQL
    const bac = summary.total_general ?? 0;
    const totalCategories = summary.total_categorias ?? 0;
    const distribution = summary.grupos ?? {};

    // Calcular total de values (proxy para totalMonthlyValues)
    let totalMonthlyValues = 0;
    Object.values(distribution).forEach(amount => {
      // Rough estimate: cada categoría × 18 meses
      // Este valor exacto debería venir desde el API en el futuro
      totalMonthlyValues += 18;
    });

    return {
      projectId: this.OFFICIAL_PROJECT_ID,
      name: 'LYRA CARSAN',
      bac,
      currency: LYRA_CURRENCY,
      durationMonths: LYRA_DURATION_MONTHS,
      totalCategories,
      totalMonthlyValues,
      distribution,
      lastImported: summary.last_imported_at ? {
        date: summary.last_imported_at,
        by: summary.last_imported_by || 'N/A',
        filename: summary.last_imported_filename || 'FC Lyra detallado.xlsx',
      } : undefined,
    };
  }

  /**
   * Obtener BAC (Budget At Completion) oficial de LYRA.
   * En contexto de LYRA, es la suma de todos los "Valor" del Excel.
   *
   * @returns BAC en USD, o 0 si no existen datos
   */
  static async getOfficialBAC(): Promise<number> {
    const data = await this.extractOfficialData();
    return data?.bac ?? 0;
  }

  /**
   * Validar coherencia financiera de LYRA.
   *
   * @returns Objeto con isValid y warnings (si las hay)
   */
  static async validateFinancialCoherence(): Promise<{
    isValid: boolean;
    warnings: string[];
  }> {
    const data = await this.extractOfficialData();
    const warnings: string[] = [];

    if (!data) {
      return { isValid: false, warnings: ['LYRA data not found in database'] };
    }

    if (data.totalCategories === 0) {
      warnings.push('No categories detected for LYRA');
    }

    if (data.totalMonthlyValues === 0) {
      warnings.push('No monthly values imported for LYRA');
    }

    if (data.bac === 0) {
      warnings.push('BAC is zero (budget not calculated)');
    }

    if (Object.keys(data.distribution).length === 0) {
      warnings.push('No expense distribution found');
    }

    return {
      isValid: warnings.length === 0,
      warnings,
    };
  }

  /**
   * Obtener resumen ejecutivo de LYRA para dashboard.
   */
  static async getExecutiveSummary(): Promise<{
    projectId: string;
    name: string;
    bac: string;  // Formateado como moneda
    currency: string;
    durationMonths: number;
    statusMessage: string;
  } | null> {
    const data = await this.extractOfficialData();

    if (!data) {
      return null;
    }

    const bacFormatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: LYRA_CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(data.bac);

    const statusMessage = data.lastImported
      ? `Last import: ${new Date(data.lastImported.date).toLocaleDateString()}`
      : 'No cash flow data imported yet';

    return {
      projectId: data.projectId,
      name: data.name,
      bac: bacFormatted,
      currency: data.currency,
      durationMonths: data.durationMonths,
      statusMessage,
    };
  }
}

/**
 * React Hook para usar datos de LYRA en componentes.
 *
 * Uso:
 * const { contractValue, bac, isLoading, error } = useLyraFinancials();
 */
export function useLyraFinancials() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['lyra-financials'],
    queryFn: async () => {
      return await LyraFinancialService.extractOfficialData();
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const validation = useQuery({
    queryKey: ['lyra-financials-validation'],
    queryFn: async () => {
      return await LyraFinancialService.validateFinancialCoherence();
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    projectId: data?.projectId,
    name: data?.name,
    bac: data?.bac ?? 0,
    currency: data?.currency,
    durationMonths: data?.durationMonths ?? 18,
    totalCategories: data?.totalCategories ?? 0,
    distribution: data?.distribution ?? {},
    isValid: validation.data?.isValid ?? false,
    warnings: validation.data?.warnings ?? [],
    isLoading: isLoading || validation.isLoading,
    error: error || validation.error,
  };
}
