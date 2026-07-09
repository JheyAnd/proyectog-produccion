/**
 * Constantes centralizadas del proyecto LYRA CARSAN.
 * Patrón: idéntico a patioSur.ts
 *
 * Proyecto: LYRA (CARSAN)
 * Código: OE-2000
 * Duración: 18 meses (Mayo 2026 - Octubre 2027)
 * Moneda: USD
 * Fuente de datos: FC Lyra detallado.xlsx
 */

export const LYRA_PROJECT_ID = 'lyra-carsan-oe2000';
export const LYRA_PROJECT_NAME = 'LYRA CARSAN';
export const LYRA_PROJECT_CODE = 'OE-2000';
export const LYRA_CLIENT = 'CARSAN';

// Duración y fechas del proyecto
export const LYRA_DURATION_MONTHS = 18;
export const LYRA_START_DATE = '2026-05-01';
export const LYRA_END_DATE = '2027-10-31';

// Moneda
export const LYRA_CURRENCY = 'USD';

// Grupos de categorías (compatible con egreso_categorias)
export const LYRA_GROUPS = {
  materiales: 'Materiales',
  mano_obra: 'Mano de Obra',
  administracion: 'Administración',
  ingreso: 'Ingresos',
} as const;

/**
 * BAC (Budget At Completion) de LYRA
 * Será actualizado dinámicamente desde la API después de cargar el Excel
 * Valor inicial: 0 (placeholder)
 */
let LYRA_BAC_CACHE = 0;

/**
 * Actualiza el BAC en memoria después de importar el Excel
 */
export function setLyraBAC(value: number): void {
  LYRA_BAC_CACHE = value;
  localStorage.setItem('lyra_bac_cache', value.toString());
}

/**
 * Obtiene el BAC actual (desde cache o localStorage)
 */
export function getLyraBAC(): number {
  // Intentar obtener del cache de localStorage primero
  const cached = localStorage.getItem('lyra_bac_cache');
  if (cached) {
    const parsedValue = parseFloat(cached);
    LYRA_BAC_CACHE = parsedValue;
    return parsedValue;
  }
  return LYRA_BAC_CACHE;
}

/**
 * Formatea el BAC como string localizado
 */
export function formatLyraBAC(value?: number): string {
  const bac = value ?? getLyraBAC();
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: LYRA_CURRENCY,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(bac);
}

/**
 * Función helper para detectar si un projectId es Lyra
 */
export function isLyraProject(projectId?: string): boolean {
  if (!projectId) return false;
  const normalized = projectId.toLowerCase().replace(/[\s-]/g, '');
  return (
    normalized === 'lyracarsan' ||
    normalized === 'lyracarsan oe2000' ||
    normalized === 'lyracarsanoe2000' ||
    normalized === 'oe2000'
  );
}

/**
 * Mapeo de meses relativos (1-18) a meses calendario
 * Usado para convertir "Mes 1" a "May 2026", etc.
 */
export const LYRA_MONTH_MAP: Record<number, { month: string; year: number }> = {
  1: { month: 'May', year: 2026 },
  2: { month: 'Jun', year: 2026 },
  3: { month: 'Jul', year: 2026 },
  4: { month: 'Aug', year: 2026 },
  5: { month: 'Sep', year: 2026 },
  6: { month: 'Oct', year: 2026 },
  7: { month: 'Nov', year: 2026 },
  8: { month: 'Dec', year: 2026 },
  9: { month: 'Jan', year: 2027 },
  10: { month: 'Feb', year: 2027 },
  11: { month: 'Mar', year: 2027 },
  12: { month: 'Apr', year: 2027 },
  13: { month: 'May', year: 2027 },
  14: { month: 'Jun', year: 2027 },
  15: { month: 'Jul', year: 2027 },
  16: { month: 'Aug', year: 2027 },
  17: { month: 'Sep', year: 2027 },
  18: { month: 'Oct', year: 2027 },
};

/**
 * Obtiene el label de un mes relativo (1-18)
 * Ej: 1 → "May 2026", 18 → "Oct 2027"
 */
export function getLyraMonthLabel(monthNumber: number): string {
  const monthInfo = LYRA_MONTH_MAP[monthNumber];
  if (!monthInfo) return `Mes ${monthNumber}`;
  return `${monthInfo.month} ${monthInfo.year}`;
}
