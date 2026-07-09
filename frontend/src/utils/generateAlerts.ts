/**
 * generateAlerts.ts — Motor centralizado de alertas del proyecto.
 * Todas las alertas son dinámicas: se recalculan con cada actualización.
 */

import { formatCOP } from '@/utils/formatNumbers';

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
  whyItMatters: string;
  impact: string;
  recommendation: string;
  metric?: string;
  metric_label?: string;
  source: string;
  priority: number;
  isDynamic: boolean;
}

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
    whyItMatters: 'El cronograma define la viabilidad contractual.',
  },
  COSTOS: {
    icon: '💰',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeClass: 'bg-rose-100 text-rose-700 border-rose-200',
    description: 'EVM: CPI, VAC, ejecución presupuestal',
    whyItMatters: 'El control de costos determina la utilidad final.',
  },
  'FLUJO DE CAJA': {
    icon: '🏦',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeClass: 'bg-amber-100 text-amber-700 border-amber-200',
    description: 'Liquidez, cobros y financiación',
    whyItMatters: 'El flujo de caja es la principal vulnerabilidad.',
  },
  CONTRATO: {
    icon: '📋',
    color: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    badgeClass: 'bg-orange-100 text-orange-700 border-orange-200',
    description: 'Cumplimiento legal y exposición contractual',
    whyItMatters: 'Obligaciones contractuales de plazo y calidad.',
  },
  PROCURA: {
    icon: '🚚',
    color: 'text-teal-700',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    badgeClass: 'bg-teal-100 text-teal-700 border-teal-200',
    description: 'Compras pendientes y riesgo de precio',
    whyItMatters: 'Riesgo de volatilidad en compras.',
  },
};

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
  bac?: number;
}): ProjectAlert[] {
  const {
    spiReal, spiProg, spiLabel, spiDate, spiDesviacion,
    cpi, ev, ac, eacConFin, bac = 0
  } = params;

  const alerts: ProjectAlert[] = [];

  // CRONOGRAMA: SPI Revisado
  const spiRevisado = spiProg > 0 ? spiReal / spiProg : 0;
  const spiRnd = Math.round(spiRevisado * 100) / 100;

  alerts.push({
    id: 'spi-revisado',
    segment: 'CRONOGRAMA',
    severity: spiRnd < 0.95 ? 'critical' : spiRnd < 1.0 ? 'warning' : 'info',
    title: spiRnd >= 1
      ? `Avance en tiempo: SPI ${spiRnd.toFixed(2)} (${spiLabel})`
      : `Atraso: SPI ${spiRnd.toFixed(2)} (${spiLabel})`,
    description: `Avance real ${spiReal.toFixed(1)}% vs planificado ${spiProg.toFixed(1)}% · Desviación: ${spiDesviacion >= 0 ? '+' : ''}${spiDesviacion.toFixed(1)}%`,
    whyItMatters: 'El SPI mide la eficiencia en el uso del tiempo.',
    impact: spiRnd >= 1 ? 'Avanza según plan.' : 'Posibles sobrecostos por retraso.',
    recommendation: spiRnd >= 1 ? 'Mantener ritmo.' : 'Revisar ruta crítica.',
    metric: spiRnd.toFixed(2),
    metric_label: 'SPI Rev.',
    source: 'EVM',
    priority: 1,
    isDynamic: true,
  });

  // COSTOS: CPI
  const cpiRnd = Math.round(cpi * 100) / 100;
  
  alerts.push({
    id: 'cpi',
    segment: 'COSTOS',
    severity: cpiRnd < 0.9 ? 'critical' : cpiRnd < 1.0 ? 'warning' : 'info',
    title: cpiRnd >= 1
      ? `CPI eficiente: ${cpiRnd.toFixed(2)}`
      : `CPI ajustado: ${cpiRnd.toFixed(2)}`,
    description: `EV: ${formatCOP(ev)} · AC: ${formatCOP(ac)}`,
    whyItMatters: 'El CPI es el predictor más fuerte del costo final.',
    impact: cpiRnd >= 1 ? 'Eficiencia favorable.' : 'Posible sobrecosto.',
    recommendation: cpiRnd >= 1 ? 'Mantener control.' : 'Analizar desviaciones de costo.',
    metric: cpiRnd.toFixed(2),
    metric_label: 'CPI',
    source: 'EVM',
    priority: 1,
    isDynamic: true,
  });

  // COSTOS: Ejecución
  if (eacConFin > 0) {
    const pctEjec = (ac / eacConFin) * 100;
    alerts.push({
      id: 'ejecucion-presupuestal',
      segment: 'COSTOS',
      severity: pctEjec > 80 ? 'critical' : pctEjec > 50 ? 'warning' : 'info',
      title: `Ejecución presupuestal: ${pctEjec.toFixed(1)}% del EAC`,
      description: `AC ejecutado: ${formatCOP(ac)} · EAC: ${formatCOP(eacConFin)}`,
      whyItMatters: 'Indica si se está gastando al ritmo del avance.',
      impact: 'Riesgo de exceder presupuesto si no se controla.',
      recommendation: 'Proyectar el costo de terminación restante.',
      metric: `${pctEjec.toFixed(1)}%`,
      metric_label: 'Ejec.',
      source: 'EVM',
      priority: 2,
      isDynamic: true,
    });
  }

  return alerts;
}

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
