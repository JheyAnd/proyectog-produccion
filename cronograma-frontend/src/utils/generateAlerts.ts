/**
 * generateAlerts.ts — Motor centralizado de alertas del proyecto Patio Sur OE1035.
 *
 * Todas las alertas son dinámicas: se recalculan con cada actualización del
 * Cronograma (SPI) y el Caso de Negocio (CPI / EAC).
 *
 * SEGMENTOS (orden de prioridad gerencial):
 *   1. CRONOGRAMA    — Desvíos de plazo. Afectan contrato y penalidades.
 *   2. COSTOS        — EVM: CPI, VAC, EAC. Determinan la utilidad final.
 *   3. FLUJO DE CAJA — Liquidez y financiación. Causa raíz de problemas.
 *   4. CONTRATO      — Cumplimiento legal y exposición contractual.
 *   5. PROCURA       — Compras pendientes y riesgo de precio.
 */

import { formatCOP } from '@/utils/formatNumbers';
import {
  BAC_PATIO_SUR,
  FACTURADO_PATIO_SUR,
  COBRADO_PATIO_SUR,
  CREDITO_PUENTE_PATIO_SUR,
  TASA_CREDITO_EA_PATIO_SUR,
  INTERESES_CREDITO_PATIO_SUR,
  PENDIENTE_NEGOCIAR_PATIO_SUR,
  AHORRO_COMPRAS_PATIO_SUR,
  COSTO_COMP_REACTIVA,
  VENTA_COMP_REACTIVA,
  PERDIDA_COMP_REACTIVA,
  EAC_SIN_FIN_PATIO_SUR,
  SPI_CONTRACTUAL_PATIO_SUR,
  DIAS_REBASELINE_PATIO_SUR,
} from '@/constants/patioSur';

// ── Tipos ─────────────────────────────────────────────────────
export type AlertSeverity = 'critical' | 'warning' | 'info';

export type AlertSegment =
  | 'CRONOGRAMA'
  | 'COSTOS'
  | 'FLUJO DE CAJA'
  | 'CONTRATO'
  | 'PROCURA';

export interface ProjectAlert {
  id: string;
  segment: AlertSegment;
  severity: AlertSeverity;
  title: string;
  description: string;
  /** Por qué este indicador importa desde perspectiva gerencial */
  whyItMatters: string;
  /** Impacto concreto en el proyecto */
  impact: string;
  /** Acción recomendada */
  recommendation: string;
  /** Valor del indicador principal */
  metric?: string;
  metric_label?: string;
  /** Fuente del dato */
  source: string;
  /** Para ordenar dentro del segmento (1 = mayor prioridad) */
  priority: number;
  /** Si es true, el valor de la alerta se recalcula en tiempo real */
  isDynamic: boolean;
}

/** Metadatos de cada segmento para la UI */
export const SEGMENT_META: Record<AlertSegment, {
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  badgeClass: string;
  description: string;
  whyItMatters: string;
}> = {
  CRONOGRAMA: {
    icon: '🕐',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    badgeClass: 'bg-purple-100 text-purple-700 border-purple-200',
    description: 'Desviaciones de plazo vs línea base',
    whyItMatters: 'El cronograma define la viabilidad contractual. Un atraso acumulado genera costos de administración adicionales, afecta la relación con el cliente (Transmilenio S.A.) y puede derivar en penalidades o reclamaciones. Para un contrato EPC de precio fijo, cada día extra es costo no recuperable.',
  },
  COSTOS: {
    icon: '💰',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'EVM: CPI, VAC, ejecución presupuestal',
    whyItMatters: 'El control de costos determina la utilidad final del proyecto. El CPI (Índice de Costo) es el mejor predictor del EAC final — si el CPI actual se mantiene, el EAC proyectado puede calcularse como BAC/CPI. Cada punto por debajo de 1.0 en CPI impacta directamente el margen del proyecto.',
  },
  'FLUJO DE CAJA': {
    icon: '🏦',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Liquidez, cobros y financiación',
    whyItMatters: 'El flujo de caja es la principal vulnerabilidad del proyecto. Según el reporte del 7 de marzo, los problemas financieros de PC Mejía fueron la causa raíz del atraso en el inicio de actividades. Un proyecto puede ser rentable en papel pero quebrar por falta de liquidez.',
  },
  CONTRATO: {
    icon: '📋',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Cumplimiento legal y exposición contractual',
    whyItMatters: 'El contrato con Transmilenio S.A. (Marco: Otrosí No. 23 - Concesión No. 009 de 2010) establece obligaciones de plazo y calidad con consecuencias legales. El incumplimiento de la fecha contractual (3 Jul 2026) sin acuerdo formal expone al proyecto a penalidades y deterioro de la relación comercial.',
  },
  PROCURA: {
    icon: '🚚',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
    description: 'Compras pendientes y riesgo de precio',
    whyItMatters: 'El 40% del presupuesto de costo directo ($11,132M) aún no ha sido adjudicado. La volatilidad de precios en el mercado eléctrico (cables, transformadores) puede erosionar el ahorro logrado de $3,790M. Cada mes de retraso en adjudicar incrementa el riesgo de sobrecosto.',
  },
};

// ── Helpers ─────────────────────────────────────────────────────
function checkIsPatioSur(id?: string): boolean {
  if (!id) return false;
  const normalized = id.toLowerCase().replace(/[\s-]/g, '');
  return (
    normalized === 'patiosuroe1035' || 
    normalized === 'oe1035' || 
    normalized === 'patio-sur-oe1035' ||
    normalized === 'patiosur'
  );
}

// ── Función principal ──────────────────────────────────────────
export function generateAlerts(params: {
  spiReal: number;
  spiProg: number;
  spiLabel: string;
  spiDate: string;
  spiDesviacion: number;
  cpi: number;
  ev: number;
  ac: number;
  eacConFin: number;
  projectId?: string;
}): ProjectAlert[] {
  const {
    spiReal, spiProg, spiLabel, spiDate, spiDesviacion,
    cpi, ev, ac, eacConFin, projectId,
  } = params;

  if (!checkIsPatioSur(projectId)) {
    return [];
  }

  const alerts: ProjectAlert[] = [];

  // ────────────────────────────────────────────────────────────
  // SEGMENTO 1: CRONOGRAMA
  // ────────────────────────────────────────────────────────────

  // 1.1 — SPI Revisado (dinámico, desde Cronograma)
  const spiRevisado = spiProg > 0 ? spiReal / spiProg : 0;
  const spiRnd = Math.round(spiRevisado * 100) / 100;

  alerts.push({
    id: 'spi-revisado',
    segment: 'CRONOGRAMA',
    severity: spiRnd < 0.95 ? 'critical' : spiRnd < 1.0 ? 'warning' : 'info',
    title: spiRnd >= 1
      ? `Avance en tiempo: SPI ${spiRnd.toFixed(2)} (${spiLabel})`
      : spiRnd < 0.95
        ? `Atraso significativo: SPI ${spiRnd.toFixed(2)} (${spiLabel})`
        : `Leve atraso: SPI ${spiRnd.toFixed(2)} (${spiLabel})`,
    description: `Avance real ${spiReal.toFixed(1)}% vs planificado ${spiProg.toFixed(1)}% · Desviación: ${spiDesviacion >= 0 ? '+' : ''}${spiDesviacion.toFixed(1)}% · Semana ${spiLabel} (${spiDate}) · Línea base revisada 19 mar 2026`,
    whyItMatters: 'El SPI mide qué tan eficientemente el proyecto consume tiempo. Un SPI < 1.0 indica que el avance real está por debajo del planeado: se está haciendo menos trabajo del que debería haberse completado. En contratos de plazo fijo, esto se traduce directamente en días de retraso.',
    impact: spiRnd >= 1
      ? 'El proyecto avanza según la línea base revisada o por encima. Sin impacto inmediato en plazo.'
      : `Retraso de ${Math.abs(spiDesviacion).toFixed(1)} puntos porcentuales vs plan. Si persiste, el proyecto terminará después del 16 Sep 2026.`,
    recommendation: spiRnd >= 1
      ? 'Mantener ritmo. Monitorear actividades de ruta crítica próximas a iniciar.'
      : 'Revisar ruta crítica. Priorizar actividades con mayor peso en el avance global. Evaluar turnos adicionales.',
    metric: spiRnd.toFixed(2),
    metric_label: 'SPI Rev.',
    source: 'Cronograma (Curva S Base Revisada 19 mar)',
    priority: 1,
    isDynamic: true,
  });

  // 1.2 — SPI Contractual (fijo)
  alerts.push({
    id: 'spi-contractual',
    segment: 'CRONOGRAMA',
    severity: 'critical',
    title: `SPI Contractual = ${SPI_CONTRACTUAL_PATIO_SUR} — 27% de atraso vs Contrato`,
    description: `Avance real vs línea base original (27 nov 2024). Fecha contractual: 3 Jul 2026 · Fin revisado: 16 Sep 2026 · Desfase: ${DIAS_REBASELINE_PATIO_SUR} días adicionales sobre el contrato original`,
    whyItMatters: 'El SPI contractual mide el cumplimiento respecto a las obligaciones originales del contrato, no al re-baseline interno. El cliente (Transmilenio S.A.) evalúa el desempeño del contratista contra esta línea base, independientemente de los acuerdos internos de re-programación.',
    impact: `Incumplimiento de ${DIAS_REBASELINE_PATIO_SUR} días sobre el plazo contractual. Exposición a cláusulas de penalidad y deterioro de la calificación del contratista. El re-baseline NO está formalmente aprobado por el cliente.`,
    recommendation: 'Formalizar extensión de plazo ante Transmilenio S.A. con soporte técnico y justificación. Documentar causas de fuerza mayor o causas imputables al cliente.',
    metric: `${SPI_CONTRACTUAL_PATIO_SUR}`,
    metric_label: 'SPI Contr.',
    source: 'Cronograma (Línea Base 27 nov 2024)',
    priority: 2,
    isDynamic: false,
  });

  // 1.3 — Re-baseline (fijo)
  alerts.push({
    id: 'rebaseline',
    segment: 'CRONOGRAMA',
    severity: 'critical',
    title: `Re-baseline aprobado: +${DIAS_REBASELINE_PATIO_SUR} días — Fin revisado 16 Sep 2026`,
    description: `Cronograma re-baselineado de 405 a 453 días. Inicio: 20 Jun 2025 · Fin original: 30 Jul 2026 · Fin revisado: 16 Sep 2026 · Fecha contractual Transmilenio: 3 Jul 2026`,
    whyItMatters: 'Un re-baseline implica que el plan original fue inviable. Genera costos adicionales de administración de obra (personal, equipos, instalaciones) por los días extendidos. Para un proyecto EPC, cada día de extensión tiene un costo de overhead que reduce la utilidad proyectada.',
    impact: `${DIAS_REBASELINE_PATIO_SUR} días adicionales de costos de administración y financiación. Estimado de impacto en overhead: depende de tarifa diaria de administración. Adicionalmente, ${DIAS_REBASELINE_PATIO_SUR} días más de uso del crédito puente = ~${formatCOP(CREDITO_PUENTE_PATIO_SUR * TASA_CREDITO_EA_PATIO_SUR * DIAS_REBASELINE_PATIO_SUR / 365)} en intereses adicionales.`,
    recommendation: 'Gestionar ante cliente la aprobación formal del nuevo plazo. Evaluar medidas de aceleración para recuperar días y reducir costos de extensión.',
    metric: `+${DIAS_REBASELINE_PATIO_SUR}d`,
    metric_label: 'Extensión',
    source: 'Cronograma (Base Revisada 19 mar 2026)',
    priority: 3,
    isDynamic: false,
  });

  // ────────────────────────────────────────────────────────────
  // SEGMENTO 2: COSTOS
  // ────────────────────────────────────────────────────────────

  // 2.1 — CPI (dinámico)
  const cpiRnd = Math.round(cpi * 100) / 100;
  const eacPorCPI = cpiRnd > 0 ? BAC_PATIO_SUR / cpiRnd : 0;

  alerts.push({
    id: 'cpi',
    segment: 'COSTOS',
    severity: cpiRnd < 0.9 ? 'critical' : cpiRnd < 1.0 ? 'warning' : 'info',
    title: cpiRnd >= 1
      ? `CPI eficiente: ${cpiRnd.toFixed(2)} — ${((cpiRnd - 1) * 100).toFixed(0)}% bajo presupuesto`
      : `CPI ${cpiRnd < 0.9 ? 'crítico' : 'ajustado'}: ${cpiRnd.toFixed(2)}`,
    description: `EV: ${formatCOP(ev)} · AC: ${formatCOP(ac)} · BAC: ${formatCOP(BAC_PATIO_SUR)} · EAC proyectado por CPI: ${formatCOP(eacPorCPI)} · EAC planificado (con fin.): ${formatCOP(eacConFin)}`,
    whyItMatters: 'El CPI es el indicador EVM más predictivo del costo final. Estudios del PMI demuestran que el CPI al 20% de avance predice el EAC final con ±10% de precisión. Un CPI de 1.0 significa que se está ejecutando exactamente en presupuesto. Por encima: ahorro. Por debajo: sobrecosto acumulado.',
    impact: cpiRnd >= 1
      ? `Por cada $1 de AC ejecutado, se genera $${cpiRnd.toFixed(2)} de EV. Eficiencia favorable: el proyecto ejecuta valor por encima de su costo real.`
      : `EAC proyectado por CPI: ${formatCOP(eacPorCPI)} vs EAC planificado ${formatCOP(eacConFin)}. Diferencia: ${formatCOP(Math.abs(eacPorCPI - eacConFin))}.`,
    recommendation: cpiRnd >= 1
      ? 'Mantener control de costos. Documentar prácticas de ahorro. El margen proyectado es favorable.'
      : 'Analizar partidas con mayor desviación de costo. Revisar precios de materiales pendientes de compra.',
    metric: cpiRnd.toFixed(2),
    metric_label: 'CPI',
    source: 'Caso de Negocio + Flujo de Caja',
    priority: 1,
    isDynamic: true,
  });

  // 2.2 — Ejecución presupuestal (dinámica)
  const pctEjec = eacConFin > 0 ? (ac / eacConFin) * 100 : 0;
  const etcRestante = eacConFin - ac;

  alerts.push({
    id: 'ejecucion-presupuestal',
    segment: 'COSTOS',
    severity: pctEjec > 80 ? 'critical' : pctEjec > 50 ? 'warning' : 'info',
    title: `Ejecución presupuestal: ${pctEjec.toFixed(1)}% del EAC — Restante: ${formatCOP(etcRestante)}`,
    description: `AC ejecutado: ${formatCOP(ac)} · EAC con financiación: ${formatCOP(eacConFin)} · Avance físico: ${spiReal.toFixed(1)}% · Costo consumido vs avance: ${pctEjec.toFixed(1)}% consumido para ${spiReal.toFixed(1)}% de avance`,
    whyItMatters: 'La relación entre costo consumido y avance físico indica si el proyecto está "gastando al ritmo correcto". Si el porcentaje de costo ejecutado supera el porcentaje de avance físico, existe un desbalance que puede indicar ineficiencias o sobrecostos tempranos.',
    impact: pctEjec > 80
      ? `Más del 80% del presupuesto ejecutado. El ${(100 - pctEjec).toFixed(1)}% restante (${formatCOP(etcRestante)}) debe cubrir el ${(100 - spiReal).toFixed(1)}% del trabajo pendiente.`
      : `Quedan ${formatCOP(etcRestante)} por ejecutar para completar el ${(100 - spiReal).toFixed(1)}% del trabajo restante.`,
    recommendation: 'Proyectar mensualmente el costo de terminación (ETC) vs fondos disponibles. Confirmar que el presupuesto restante es suficiente para las actividades pendientes.',
    metric: `${pctEjec.toFixed(1)}%`,
    metric_label: 'Ejec. s/EAC',
    source: 'Flujo de Caja vs Caso de Negocio',
    priority: 2,
    isDynamic: true,
  });

  // 2.3 — VAC Positivo (informativa)
  const vac = BAC_PATIO_SUR - eacConFin;
  const vacPct = BAC_PATIO_SUR > 0 ? (vac / BAC_PATIO_SUR) * 100 : 0;

  alerts.push({
    id: 'vac',
    segment: 'COSTOS',
    severity: vac >= 0 ? 'info' : 'critical',
    title: vac >= 0
      ? `VAC positivo: ${formatCOP(vac)} — Margen proyectado ${vacPct.toFixed(1)}%`
      : `VAC negativo: ${formatCOP(Math.abs(vac))} — El proyecto proyecta pérdida`,
    description: `VAC = BAC − EAC = ${formatCOP(BAC_PATIO_SUR)} − ${formatCOP(eacConFin)} = ${formatCOP(vac)} · Incluye intereses crédito puente: ${formatCOP(INTERESES_CREDITO_PATIO_SUR)} · Ahorro en compras: ${formatCOP(AHORRO_COMPRAS_PATIO_SUR)}`,
    whyItMatters: 'El VAC (Variance at Completion) es la utilidad proyectada del proyecto. Un VAC positivo confirma que el proyecto generará ganancias para PC Mejía. Es el indicador financiero más importante para la dirección. Incluir los intereses del crédito en el EAC es crítico para una estimación real de la utilidad.',
    impact: vac >= 0
      ? `Utilidad proyectada de ${formatCOP(vac)} (${vacPct.toFixed(1)}% sobre el BAC). Neto de financiación e intereses. El proyecto es rentable según proyección actual.`
      : `Pérdida proyectada de ${formatCOP(Math.abs(vac))}. Revisar EAC urgentemente.`,
    recommendation: vac >= 0
      ? 'Proteger el margen evitando desviaciones en los capítulos con mayor costo pendiente. Especial atención a los $11,132M pendientes de negociar.'
      : 'Revisar y reducir el EAC. Negociar mejores precios en procura pendiente.',
    metric: `${vacPct.toFixed(1)}%`,
    metric_label: 'Margen VAC',
    source: 'Caso de Negocio (EAC Con Financiación)',
    priority: 3,
    isDynamic: true,
  });

  // 2.4 — Compensación Reactiva (fija, crítica)
  const margenReactiva = ((VENTA_COMP_REACTIVA - COSTO_COMP_REACTIVA) / VENTA_COMP_REACTIVA) * 100;

  alerts.push({
    id: 'comp-reactiva',
    segment: 'COSTOS',
    severity: 'critical',
    title: `Compensación Reactiva: margen negativo ${margenReactiva.toFixed(1)}% — Pérdida ${formatCOP(PERDIDA_COMP_REACTIVA)}`,
    description: `Costo estimado: ${formatCOP(COSTO_COMP_REACTIVA)} · Precio ofertado (venta): ${formatCOP(VENTA_COMP_REACTIVA)} · Pérdida confirmada: ${formatCOP(PERDIDA_COMP_REACTIVA)} · Este capítulo se ofertó por debajo del costo real de mercado`,
    whyItMatters: 'Una partida con margen negativo consume utilidad de otros capítulos. La compensación reactiva es un ejemplo de riesgo de oferta mal calculado: el precio ofertado no cubrió el costo de ejecución. En contratos de precio fijo, el contratista absorbe 100% de esta pérdida.',
    impact: `Pérdida directa de ${formatCOP(PERDIDA_COMP_REACTIVA)} que reduce el VAC del proyecto. Equivale al ${((PERDIDA_COMP_REACTIVA / vac) * 100).toFixed(1)}% de la utilidad proyectada total.`,
    recommendation: 'Negociar precio con proveedor de compensación reactiva o solicitar cambio de alcance al cliente. Documentar diferencia de costos para potencial reclamo contractual.',
    metric: `${margenReactiva.toFixed(1)}%`,
    metric_label: 'Margen',
    source: 'Caso de Negocio (Hoja Costo vs Venta)',
    priority: 4,
    isDynamic: false,
  });

  // ────────────────────────────────────────────────────────────
  // SEGMENTO 3: FLUJO DE CAJA
  // ────────────────────────────────────────────────────────────

  // 3.1 — Desfase cobro (cuasi-fijo, actualizable)
  const pendienteCobro = FACTURADO_PATIO_SUR - COBRADO_PATIO_SUR;
  const pctCobrado = (COBRADO_PATIO_SUR / FACTURADO_PATIO_SUR) * 100;

  alerts.push({
    id: 'desfase-cobro',
    segment: 'FLUJO DE CAJA',
    severity: 'critical',
    title: `Cartera vencida: ${formatCOP(pendienteCobro)} pendiente de cobro (${(100 - pctCobrado).toFixed(0)}% sin recaudar)`,
    description: `Facturado: ${formatCOP(FACTURADO_PATIO_SUR)} · Cobrado: ${formatCOP(COBRADO_PATIO_SUR)} (${pctCobrado.toFixed(1)}%) · Pendiente de cobro: ${formatCOP(pendienteCobro)} · Desfase de cobro estimado: 9 meses`,
    whyItMatters: 'La cartera pendiente de cobro es el mayor generador de necesidad de financiación. Si PC Mejía hubiera cobrado el 100% de lo facturado, el crédito puente habría sido innecesario o significativamente menor. El costo del crédito puente ($3,711M en intereses) es consecuencia directa de este desfase.',
    impact: `${formatCOP(pendienteCobro)} inmovilizados que se financian con el crédito puente al 13.66% EA. Costo de oportunidad diario: ~${formatCOP(pendienteCobro * TASA_CREDITO_EA_PATIO_SUR / 365)}/día.`,
    recommendation: 'Priorizar gestión de cobro de facturas certificadas. Verificar si existe disputa o proceso de aprobación demorado. Considerar descuento por pronto pago si el costo del descuento es menor al costo del crédito.',
    metric: `${(100 - pctCobrado).toFixed(0)}%`,
    metric_label: 'Sin cobrar',
    source: 'Flujo de Caja (Proyección de Pagos)',
    priority: 1,
    isDynamic: false,
  });

  // 3.2 — Crédito puente (fijo)
  const interesesMensuales = CREDITO_PUENTE_PATIO_SUR * (Math.pow(1 + TASA_CREDITO_EA_PATIO_SUR, 1/12) - 1);

  alerts.push({
    id: 'credito-puente',
    segment: 'FLUJO DE CAJA',
    severity: 'warning',
    title: `Crédito puente ${formatCOP(CREDITO_PUENTE_PATIO_SUR)} al ${(TASA_CREDITO_EA_PATIO_SUR * 100).toFixed(2)}% EA — Pago bullet Feb 2027`,
    description: `Desembolso: 6 Feb 2026 · Tasa: IBR+2.85% = ${(TASA_CREDITO_EA_PATIO_SUR * 100).toFixed(2)}% EA · Intereses totales estimados: ${formatCOP(INTERESES_CREDITO_PATIO_SUR)} · Interés mensual: ~${formatCOP(interesesMensuales)} · Vencimiento: Feb 2027`,
    whyItMatters: 'Un crédito bullet (capital + intereses al vencimiento) implica que no hay amortizaciones intermedias: el monto completo del capital más todos los intereses acumulados se pagan en una sola cuota. Para que el proyecto pueda pagar el bullet en Feb 2027, debe haber recaudado suficiente del cliente antes de esa fecha.',
    impact: `${formatCOP(INTERESES_CREDITO_PATIO_SUR)} en costos financieros que reducen la utilidad (${((INTERESES_CREDITO_PATIO_SUR / BAC_PATIO_SUR) * 100).toFixed(1)}% del BAC). En Feb 2027 se requerirá ${formatCOP(CREDITO_PUENTE_PATIO_SUR + INTERESES_CREDITO_PATIO_SUR)} en una sola cuota.`,
    recommendation: `Confirmar que los ingresos proyectados Oct 2026 (${formatCOP(17_714_279_534)}) y Nov 2026 (${formatCOP(16_207_000_000)}) estarán disponibles antes de Feb 2027. Evaluar pago parcial anticipado del crédito si se recaudan recursos antes.`,
    metric: `${(TASA_CREDITO_EA_PATIO_SUR * 100).toFixed(2)}% EA`,
    metric_label: 'Tasa crédito',
    source: 'Flujo de Caja (Proyección de Pagos)',
    priority: 2,
    isDynamic: false,
  });

  // 3.3 — Egresos proyectados Apr-Sep 2026 (fijo)
  const egresosPendientes = 4_390_000_000 + 3_626_000_000 + 2_646_000_000 + 2_017_135_279 + 2_052_859_877 + 584_499_127;
  const ingresosPendientes = 5_220_402_000 + 2_000_000_000;
  const brechaLiquidez = egresosPendientes - ingresosPendientes;

  alerts.push({
    id: 'brecha-liquidez',
    segment: 'FLUJO DE CAJA',
    severity: 'warning',
    title: `Brecha de liquidez Abr–Sep 2026: ${formatCOP(brechaLiquidez)} neto negativo`,
    description: `Egresos proyectados Abr–Sep: ${formatCOP(egresosPendientes)} · Ingresos proyectados Abr–Sep: ${formatCOP(ingresosPendientes)} · Brecha: ${formatCOP(brechaLiquidez)} · Esta brecha debe cubrirse con el crédito puente disponible`,
    whyItMatters: 'Una brecha de liquidez negativa sostenida en los próximos meses confirma la dependencia del crédito puente. Si ocurre un evento imprevisto (pago inesperado, devolución de anticipo, demora de ingreso) la empresa podría enfrentar incapacidad de pago a proveedores, deteniendo la obra.',
    impact: `Durante los próximos 6 meses, el proyecto requiere financiación neta de ${formatCOP(brechaLiquidez)} adicional a la ya desembolsada. El crédito puente de ${formatCOP(CREDITO_PUENTE_PATIO_SUR)} cubre esta brecha, pero con costo financiero.`,
    recommendation: 'Gestionar ingreso de la certificación de Abr 2026 ($5,220M) puntualmente. Confirmar disponibilidad del crédito. Monitorear flujo mensualmente.',
    metric: `−${formatCOP(brechaLiquidez).replace('$', '')}`,
    metric_label: 'Brecha neta',
    source: 'Flujo de Caja (FC X OBRAS)',
    priority: 3,
    isDynamic: false,
  });

  // ────────────────────────────────────────────────────────────
  // SEGMENTO 4: CONTRATO
  // ────────────────────────────────────────────────────────────

  // 4.1 — Problemas financieros (causa raíz)
  alerts.push({
    id: 'causa-raiz',
    segment: 'CONTRATO',
    severity: 'critical',
    title: 'Causa raíz documentada: retraso por problemas financieros de PC Mejía',
    description: `Reporte de seguimiento 7 mar 2026: "Retraso en inicio de actividades por problemas financieros de PC MEJÍA". Cobrado: ${formatCOP(COBRADO_PATIO_SUR)} de ${formatCOP(FACTURADO_PATIO_SUR)} facturados (${((COBRADO_PATIO_SUR / FACTURADO_PATIO_SUR) * 100).toFixed(1)}%). Esto impidió la compra oportuna de materiales.`,
    whyItMatters: 'La causa raíz documentada tiene implicaciones legales y contractuales: si el atraso es imputable a problemas internos del contratista (no al cliente), PC Mejía no tiene fundamento para reclamar compensación por días adicionales. Esto también afecta la posibilidad de invocar "excusable delay" para extender el plazo sin penalidad.',
    impact: 'Exposición contractual ante el cliente por el atraso de 48 días. Sin reconocimiento formal de extensión, riesgo de penalidades contractuales. Deterioro de la reputación como contratista EPC.',
    recommendation: 'Revisar contrato para identificar si existen causas imputables al cliente (cambios de alcance, demoras en permisos) que puedan compensar parcialmente el atraso. Documentar toda interacción con el cliente sobre el cronograma.',
    metric: `${((COBRADO_PATIO_SUR / FACTURADO_PATIO_SUR) * 100).toFixed(0)}%`,
    metric_label: 'Cobrado',
    source: 'Reporte seguimiento semanal (7 mar 2026)',
    priority: 1,
    isDynamic: false,
  });

  // 4.2 — Fecha contractual en riesgo
  alerts.push({
    id: 'fecha-contractual',
    segment: 'CONTRATO',
    severity: 'critical',
    title: 'Fecha contractual 3 Jul 2026 NO se cumplirá — Fin revisado 16 Sep 2026',
    description: `Fecha contractual Transmilenio S.A.: 3 Jul 2026 · Fin proyectado PC Mejía: 16 Sep 2026 · Diferencia: ${DIAS_REBASELINE_PATIO_SUR} días · Estado aprobación extensión: PENDIENTE DE FORMALIZAR`,
    whyItMatters: 'En contratos EPC bajo el marco de concesión de Transmilenio (Otrosí No. 23), el incumplimiento de plazos contractuales sin aprobación formal puede activar penalidades diarias, retención de pagos o resolución del contrato. La extensión interna del cronograma (re-baseline) no tiene valor contractual si no está firmada por el cliente.',
    impact: `${DIAS_REBASELINE_PATIO_SUR} días de incumplimiento contractual potencial. El impacto financiero depende de las cláusulas de penalidad del contrato. Riesgo de retención en la liquidación final del contrato.`,
    recommendation: 'Presentar formalmente solicitud de extensión de plazo ante Transmilenio S.A. con justificación técnica. Obtener aprobación escrita antes del 3 Jul 2026.',
    metric: '3 Jul 26',
    metric_label: 'Fecha contr.',
    source: 'Contrato OE 1035 — Otrosí No. 23',
    priority: 2,
    isDynamic: false,
  });

  // ────────────────────────────────────────────────────────────
  // SEGMENTO 5: PROCURA
  // ────────────────────────────────────────────────────────────

  // 5.1 — Pendiente de negociar (fijo)
  const pctPendiente = (PENDIENTE_NEGOCIAR_PATIO_SUR / EAC_SIN_FIN_PATIO_SUR) * 100;

  alerts.push({
    id: 'procura-pendiente',
    segment: 'PROCURA',
    severity: 'warning',
    title: `${pctPendiente.toFixed(0)}% del presupuesto de costo sin adjudicar — ${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR)} pendientes`,
    description: `Pendiente de negociar: ${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR)} de ${formatCOP(EAC_SIN_FIN_PATIO_SUR)} (EAC sin fin.) · Comprometido: ${formatCOP(13_159_418_623)} (${((13_159_418_623 / EAC_SIN_FIN_PATIO_SUR) * 100).toFixed(1)}%) · Pendientes críticos: Cables BT/DC, SPE/SPT, Compensación Reactiva`,
    whyItMatters: 'Los materiales eléctricos (cables, transformadores, celdas) están sujetos a alta volatilidad de precio en el mercado. Cada mes de retraso en la adjudicación expone el presupuesto a variaciones de precio. Además, si los materiales no se ordenan con suficiente anticipación, el plazo de entrega del proveedor puede impactar el cronograma.',
    impact: `${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR)} en contratos aún sin precio fijo. Un incremento del 5% en estos materiales costaría ${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR * 0.05)} adicionales, reduciendo el VAC en esa misma proporción.`,
    recommendation: 'Priorizar adjudicación inmediata de Cables BT/DC y SPE/SPT (mayor impacto en cronograma). Solicitar mínimo 3 cotizaciones por partida. Negociar precios fijos con cláusula de estabilidad por al menos 90 días.',
    metric: `${pctPendiente.toFixed(0)}%`,
    metric_label: 'Sin adjudicar',
    source: 'Caso de Negocio (Hoja Ejecución vs Caso de Negocio)',
    priority: 1,
    isDynamic: false,
  });

  // 5.2 — Ahorro en compras (informativa positiva)
  const pctAhorro = (AHORRO_COMPRAS_PATIO_SUR / EAC_SIN_FIN_PATIO_SUR) * 100;

  alerts.push({
    id: 'ahorro-compras',
    segment: 'PROCURA',
    severity: 'info',
    title: `Ahorro en compras logrado: ${formatCOP(AHORRO_COMPRAS_PATIO_SUR)} (${pctAhorro.toFixed(1)}% del costo proyectado)`,
    description: `Ahorro vs caso de negocio original en materiales ya adjudicados. Representa la diferencia entre el precio del caso de negocio y el precio real de compra. Demuestra gestión eficiente de procura en el ${((13_159_418_623 / EAC_SIN_FIN_PATIO_SUR) * 100).toFixed(0)}% ya comprometido.`,
    whyItMatters: 'El ahorro en compras es el principal contribuyente positivo al VAC del proyecto. Sin este ahorro, el margen proyectado sería significativamente menor. Indica que el equipo de procura ha negociado efectivamente. El reto es replicar este desempeño en el 40% pendiente.',
    impact: `${formatCOP(AHORRO_COMPRAS_PATIO_SUR)} en ahorro directo que mejora la utilidad del proyecto. Si el mismo nivel de ahorro proporcional se logra en los ${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR)} pendientes, el beneficio adicional sería ~${formatCOP(PENDIENTE_NEGOCIAR_PATIO_SUR * (AHORRO_COMPRAS_PATIO_SUR / 13_159_418_623))}.`,
    recommendation: 'Documentar estrategias de negociación exitosas. Aplicar las mismas palancas en los capítulos pendientes. Considerar compras en volumen para materiales similares.',
    metric: `+${formatCOP(AHORRO_COMPRAS_PATIO_SUR).replace('$', '')}`,
    metric_label: 'Ahorro',
    source: 'Caso de Negocio (Hoja Ejecución vs Caso de Negocio)',
    priority: 2,
    isDynamic: false,
  });

  return alerts;
}

// ── Helpers para la UI ────────────────────────────────────────
export const ALL_SEGMENTS: AlertSegment[] = [
  'CRONOGRAMA',
  'COSTOS',
  'FLUJO DE CAJA',
  'CONTRATO',
  'PROCURA',
];

export function groupBySegment(alerts: ProjectAlert[]): Record<AlertSegment, ProjectAlert[]> {
  const grouped = {} as Record<AlertSegment, ProjectAlert[]>;
  for (const seg of ALL_SEGMENTS) {
    grouped[seg] = alerts
      .filter(a => a.segment === seg)
      .sort((a, b) => a.priority - b.priority);
  }
  return grouped;
}
