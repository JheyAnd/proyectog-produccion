/**
 * Constantes centralizadas del proyecto Patio Sur OE1035.
 * Fuente única de verdad — importar desde aquí en lugar de hardcodear por separado.
 */

// ── Presupuesto ───────────────────────────────────────────────
/** Presupuesto base (BAC) = Oferta Mercantil con AIU. Fuente: Caso de Negocio. */
export const BAC_PATIO_SUR = 41_012_884_481;

/** Valor del contrato original (precio de venta). */
export const CONTRATO_PATIO_SUR = 32_400_000_000;


/** EAC sin financiación. Fuente: Proyección de Pagos. */
export const EAC_SIN_FIN_PATIO_SUR = 28_082_164_388;

/** Presupuesto comprometido (contratos + OC adjudicadas). Fuente: Caso de Negocio. */
export const COMPROMETIDO_PATIO_SUR = 13_159_418_623;

/** Pendiente de negociar (sin adjudicar). */
export const PENDIENTE_NEGOCIAR_PATIO_SUR = 11_132_000_000;

/** Ahorro logrado en compras vs caso de negocio. */
export const AHORRO_COMPRAS_PATIO_SUR = 3_790_285_190;

// ── Ejecución (ACWP) ──────────────────────────────────────────
/** Total pagado acumulado (egresos efectivos realizados). Fuente: Flujo de Caja. */
export const TOTAL_PAGADO_PATIO_SUR = 9_943_379_508;

/** Desglose de Costo Real (ACWP) */
export const AC_MATERIALES_PATIO_SUR = 7_763_569_503;
export const AC_ADMINISTRATIVO_PATIO_SUR = 500_000_000;
export const AC_OTROS_PATIO_SUR = 478_000_000;

// ── Proyección (EAC) ──────────────────────────────────────────
/** EAC con financiación (Estimado a la Conclusión). Fuente: Proyección de Pagos. */
export const EAC_CON_FIN_PATIO_SUR = 29_457_164_387;

/** Desglose de EAC (Proyección Bottom-up) */
export const EAC_MATERIALES_PATIO_SUR = 21_511_513_454;
export const EAC_MANO_OBRA_PATIO_SUR = 1_681_443_883;
export const EAC_ADMINISTRATIVO_PATIO_SUR = 772_769_364;
export const EAC_INTERESES_CREDITO_PATIO_SUR = 3_158_392_500;
export const EAC_TOTAL_FIN_PATIO_SUR = EAC_MATERIALES_PATIO_SUR + EAC_MANO_OBRA_PATIO_SUR + EAC_ADMINISTRATIVO_PATIO_SUR + EAC_INTERESES_CREDITO_PATIO_SUR; // 27,124,119,201 (Ajustado según Excel)

// ── Flujo de Caja ─────────────────────────────────────────────
/** Facturado acumulado (certificaciones emitidas). Feb 2026. */
export const FACTURADO_PATIO_SUR = 16_745_324_701;

/** Cobrado efectivamente del cliente (recaudado). */
export const COBRADO_PATIO_SUR = 7_511_000_000;

/** Crédito puente contratado. Desembolso 6 Feb 2026. Vencimiento Feb 2027. */
export const CREDITO_PUENTE_PATIO_SUR = 17_000_000_000;

/** Tasa efectiva anual del crédito puente. */
export const TASA_CREDITO_EA_PATIO_SUR = 0.1366; // 13.66% EA

/** Intereses totales estimados del crédito (costo financiero). */
export const INTERESES_CREDITO_PATIO_SUR = 3_711_000_000;

/** Costo Financiero Neto = Total Deuda Bancaria − Créditos Bancarios Neto
 *  = Intereses + GMF + Comisión. Fuente: Flujo de Caja. */
export const COSTO_FINANCIERO_NETO_PATIO_SUR = 4_970_400_000;

// ── Capítulo Compensación Reactiva ────────────────────────────
/** Costo estimado compensación reactiva (capítulo con pérdida). */
export const COSTO_COMP_REACTIVA = 751_900_000;

/** Venta compensación reactiva (precio ofertado). */
export const VENTA_COMP_REACTIVA = 547_200_000;

/** Pérdida compensación reactiva = costo - venta. */
export const PERDIDA_COMP_REACTIVA = COSTO_COMP_REACTIVA - VENTA_COMP_REACTIVA; // $204.7M

// ── Cronograma ────────────────────────────────────────────────
/** SPI contractual (vs línea base original 27 nov 2024). */
export const SPI_CONTRACTUAL_PATIO_SUR = 0.73;

/** Extensión del re-baseline en días. */
export const DIAS_REBASELINE_PATIO_SUR = 48;
