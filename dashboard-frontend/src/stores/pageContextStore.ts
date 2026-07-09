/**
 * Store global de contexto de página actual.
 * Cada página llama a `usePageContext(...)` (ver hooks/usePageContext.ts)
 * para registrar un resumen estructurado; PaCo lo lee al construir el prompt.
 *
 * Como fallback cuando una página no registra contexto explícito, usamos
 * la tabla `ROUTE_DESCRIPTIONS` más DOM scraping.
 */
import { create } from 'zustand';

export interface PageContext {
  title: string;
  description: string;
  /** Métricas relevantes serializables (CPI, SPI, totales...). */
  keyMetrics?: Record<string, unknown>;
  /** Resumen en texto libre para dar más contexto al LLM. */
  dataSummary?: string;
}

interface PageContextState {
  context: PageContext | null;
  /** El nombre del proyecto actual (ej: "Patio Sur"), cargado dinámicamente. */
  projectName: string | null;
  setContext: (c: PageContext) => void;
  setProjectName: (name: string | null) => void;
  clearContext: () => void;
}

export const usePageContextStore = create<PageContextState>((set) => ({
  context: null,
  projectName: null,
  setContext: (c) => set({ context: c }),
  setProjectName: (name) => set({ projectName: name }),
  clearContext: () => set({ context: null, projectName: null }),
}));

/**
 * Descripciones estáticas por ruta — fallback cuando la página no
 * ha registrado contexto explícito. Coinciden con las rutas declaradas
 * en `App.tsx`.
 */
export const ROUTE_DESCRIPTIONS: Array<{ pattern: RegExp; title: string; description: string }> = [
  {
    pattern: /^\/projects\/?$/,
    title: 'Resumen de Proyectos',
    description: 'Tabla maestra de proyectos agrupados por PCM (PC Mejía, obras EPC eléctricas) y PCS (PC Solar). Muestra contrato, costos, avance y director.',
  },
  {
    pattern: /^\/global-summary\/?$/,
    title: 'Resumen Global',
    description: 'Vista consolidada de todos los proyectos: KPIs cruzados, márgenes y estado general.',
  },
  {
    pattern: /^\/global-cash-flow\/?$/,
    title: 'Flujo de Caja Global (PCM)',
    description: 'Flujo de caja consolidado mensual de todos los proyectos PCM con ingresos, egresos y neto por período.',
  },
  {
    pattern: /^\/projects\/[^/]+\/dashboard\/?$/,
    title: 'Dashboard del Proyecto',
    description: 'KPIs del proyecto: avance físico, curva S, CPI/SPI, alertas y flujo de caja resumido.',
  },
  {
    pattern: /^\/projects\/[^/]+\/business-case\/?$/,
    title: 'Caso de Negocio',
    description: 'Análisis financiero detallado del proyecto: KPIs macro, costo vs venta, procurement y costos indirectos.',
  },
  {
    pattern: /^\/projects\/[^/]+\/cash-flow\/?$/,
    title: 'Flujo de Caja del Proyecto',
    description: 'Proyecciones mensuales y reales por categoría de egresos (materiales, mano de obra, admin).',
  },
  {
    pattern: /^\/projects\/[^/]+\/cronograma\/?$/,
    title: 'Cronograma',
    description: 'Seguimiento semanal del cronograma: avance planeado vs real, hitos y desviaciones.',
  },
  {
    pattern: /^\/projects\/[^/]+\/reports\/?$/,
    title: 'Reportes',
    description: 'Reportes generables (PDF/Excel) con datos consolidados del proyecto.',
  },
  {
    pattern: /^\/projects\/[^/]+\/documents\/?$/,
    title: 'Documentos',
    description: 'Gestión de documentos del proyecto: contratos, planos, certificaciones, actas.',
  },
  {
    pattern: /^\/projects\/[^/]+\/business-case\/?$/,
    title: 'Caso de Negocio',
    description: 'Justificación financiera del proyecto y análisis de escenarios (VPN, TIR).',
  },
  {
    pattern: /^\/projects\/[^/]+\/alerts\/?$/,
    title: 'Alertas',
    description: 'Alertas de riesgo y desviaciones de cronograma/presupuesto detectadas automáticamente.',
  },
  {
    pattern: /^\/settings\/?$/,
    title: 'Configuración',
    description: 'Personalización de tema, configuración de API keys para IA, y preferencias de la aplicación.',
  },
];

export function getRouteDescription(pathname: string): { title: string; description: string } {
  for (const r of ROUTE_DESCRIPTIONS) {
    if (r.pattern.test(pathname)) return { title: r.title, description: r.description };
  }
  return { title: 'Gestión de Proyectos', description: 'Página de la suite PC Mejía Ingeniería.' };
}
