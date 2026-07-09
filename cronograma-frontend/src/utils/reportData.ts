// Centralized report data for PDF/Excel generation
// Data is now primarily dynamic and should be fetched from the API or Context
import { formatCOPFull, formatPercent } from './formatNumbers';
import cronogramaBase from '@/data/cronogramaData';
import type { Activity } from '@/data/cronogramaData';
import apiClient from '@/services/api/client';
import parsedWeeks from '../data/updated_weeks.json';

// Default empty project info
export const projectInfo = {
  name: 'Cargando...',
  code: '—',
  client: '—',
  contractor: 'PCMejia SA',
  supervision: '—',
  directorProyectos: '—',
  ingenieroResidente: '—',
  supervisor: '—',
  tipoContrato: '—',
  fechaInicio: '—',
  fechaFinContractual: '—',
  fechaFinRevisada: '—',
  duracionOriginal: 0,
  duracionRevisada: 0,
  date: new Date().toLocaleDateString('es-CO', { timeZone: 'America/Bogota' }),
};

export function updateProjectInfo(data: Partial<typeof projectInfo>) {
  Object.assign(projectInfo, data);
}

export interface BudgetRow {
  capitulo: string;
  venta: number;
  costo: number;
  margen: number;
  isSubtotal?: boolean;
}

// budgetData and budgetTotals should be empty by default now
export const budgetData: BudgetRow[] = [];
export const budgetTotals = {
  costoDirecto: 0,
  administracion: 0,
  imprevistos: 0,
  utilidad: 0,
  ivaUtilidad: 0,
  financiacion: 0,
  totalOferta: 0,
  totalCosto: 0,
  margenGlobal: 0,
};

export interface CashFlowRow {
  periodo: string;
  ingresoProyectado: number;
  ingresoReal: number;
  egresoProyectado: number;
  egresoReal: number;
  netoProyectado: number;
  netoReal: number;
}

export const cashFlowData: CashFlowRow[] = [];

export const creditData = {
  monto: 0,
  tasa: 0,
  tasaNominal: 0,
  fechaDesembolso: '—',
  fechaVencimiento: '—',
  interesMensual: 0,
  interesTotal: 0,
  tipo: '—',
};

export const earnedValueData = {
  BAC: 0,
  PV: 0,
  EV: 0,
  AC: 0,
  CPI: 0,
  CPI_contractual: 0,
  SPI: 0,
  SPI_contractual: 0,
  EAC: 0,
  ETC: 0,
  VAC: 0,
  TCPI: 0,
  avanceFisico: 0,
  avancePlanificado: 0,
  avanceFinanciero: 0,
  facturado: 0,
  cobrado: 0,
  costoMateriales: 0,
  costoAdmin: 0,
  costoTotal: 0,
  utilidadActual: 0,
};

export interface ProcurementRow {
  capitulo: string;
  casoNegocio: number;
  negociado: number;
  pendiente: number;
  ahorro: number;
}

export const procurementData: ProcurementRow[] = [];
export const procurementTotals = {
  totalCasoNegocio: 0,
  totalNegociado: 0,
  totalPendiente: 0,
  totalProyectado: 0,
  ahorroCompra: 0,
  pctNegociado: 0,
  pctPendiente: 0,
};

// ==================== DYNAMIC DATA LOADERS ====================

export interface CustomWeekData { 
  weekNum: number; 
  label: string; 
  dateLabel: string; 
  values: Record<string, number>; 
  notes?: Record<string, string>; 
  projectId?: string 
}

export function loadCustomWeeks(projectId: string): CustomWeekData[] {
  if (!projectId) return [];
  const lsKey = `${projectId}_custom_weeks_v2`;
  let local: CustomWeekData[] = [];
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) local = JSON.parse(raw);
  } catch { /* ignore */ }

  const staticWeeks = (parsedWeeks as CustomWeekData[]).filter(
    w => w.projectId === projectId
  );

  const merged = [...local];
  staticWeeks.forEach(sw => {
    if (!merged.find(mw => mw.label === sw.label)) {
      merged.push(sw);
    }
  });

  return merged.sort((a, b) => a.weekNum - b.weekNum);
}

export async function fetchCustomWeeksFromDB(projectId: string): Promise<CustomWeekData[]> {
  if (!projectId) return [];
  try {
    const response = await apiClient.get<CustomWeekData[]>(`/preferences/${projectId}_custom_weeks_v2`);
    const data = response.data;
    if (data && Array.isArray(data) && data.length > 0) {
      localStorage.setItem(`${projectId}_custom_weeks_v2`, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn("Failed to load custom weeks from DB.", error);
  }
  return loadCustomWeeks(projectId);
}

export async function saveCustomWeeksToDB(projectId: string, data: CustomWeekData[]): Promise<boolean> {
  if (!projectId) return false;
  const lsKey = `${projectId}_custom_weeks_v2`;
  try {
    await apiClient.put(`/preferences/${lsKey}`, data);
    localStorage.setItem(lsKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save custom weeks to DB.", error);
    return false;
  }
}

export function loadActivityNotes(projectId: string): Record<string, string> {
  if (!projectId) return {};
  const lsKey = `${projectId}_activity_notes`;
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return {};
}

export async function fetchActivityNotesFromDB(projectId: string): Promise<Record<string, string>> {
  if (!projectId) return {};
  try {
    const response = await apiClient.get<Record<string, string>>(`/preferences/${projectId}_activity_notes`);
    const data = response.data;
    if (data && Object.keys(data).length > 0) {
      localStorage.setItem(`${projectId}_activity_notes`, JSON.stringify(data));
      return data;
    }
  } catch (error) {
    console.warn("Failed to load activity notes from DB.", error);
  }
  return loadActivityNotes(projectId);
}

export async function saveActivityNotesToDB(projectId: string, notes: Record<string, string>): Promise<boolean> {
  if (!projectId) return false;
  const lsKey = `${projectId}_activity_notes`;
  try {
    await apiClient.put(`/preferences/${lsKey}`, notes);
    localStorage.setItem(lsKey, JSON.stringify(notes));
    return true;
  } catch (error) {
    console.error("Failed to save activity notes to DB.", error);
    return false;
  }
}

export function loadEAC(projectId: string) {
  if (!projectId) return { sinFin: 0, conFin: 0 };
  const lsKey = `${projectId}_eac_caso_negocio`;
  try {
    const raw = localStorage.getItem(lsKey);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { sinFin: 0, conFin: 0 };
}

export async function fetchEACFromDB(projectId: string): Promise<{ sinFin: number, conFin: number }> {
  if (!projectId) return { sinFin: 0, conFin: 0 };
  try {
    const response = await apiClient.get<{ sinFin: number, conFin: number }>(`/preferences/${projectId}_eac_caso_negocio`);
    if (response.data) {
      localStorage.setItem(`${projectId}_eac_caso_negocio`, JSON.stringify(response.data));
      return response.data;
    }
  } catch (error) {
    console.warn("Failed to load EAC from DB.", error);
  }
  return loadEAC(projectId);
}

export async function saveEACToDB(projectId: string, data: { sinFin: number, conFin: number }): Promise<boolean> {
  if (!projectId) return false;
  const lsKey = `${projectId}_eac_caso_negocio`;
  try {
    await apiClient.put(`/preferences/${lsKey}`, data);
    localStorage.setItem(lsKey, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error("Failed to save EAC to DB.", error);
    return false;
  }
}

function applyOverrides(acts: Activity[], overrides: Record<string, number>): Activity[] {
  return acts.map(a => {
    if (a.children && a.children.length > 0) {
      const newChildren = applyOverrides(a.children, overrides);
      const totalPeso = newChildren.reduce((s, c) => s + c.peso, 0);
      const wReal = newChildren.reduce((s, c) => s + c.avanceReal * c.peso, 0);
      return { ...a, children: newChildren, avanceReal: totalPeso > 0 ? (wReal / totalPeso) : 0 };
    }
    return { ...a, avanceReal: overrides[a.code] !== undefined ? overrides[a.code] : a.avanceReal };
  });
}

function computeProjectReal(values: Record<string, number>): number {
  const tree = applyOverrides(cronogramaBase, values);
  const totalPeso = tree.reduce((s, a) => s + a.peso, 0);
  const weighted = tree.reduce((s, a) => s + a.avanceReal * a.peso, 0);
  return totalPeso > 0 ? Math.round(weighted / totalPeso * 100) / 100 : 0;
}

const weeklyProgMap = new Map<number, number>();

export interface LiveEVMData {
  BAC: number;
  PV: number;
  EV: number;
  AC: number;
  CPI: number;
  SPI: number;
  EAC: number;
  ETC: number;
  VAC: number;
  TCPI: number;
  avanceFisico: number;
  avancePlanificado: number;
  avanceFinanciero: number;
  weekLabel: string;
  weekDate: string;
}

/** Returns EVM metrics computed from the latest dynamic sources (localStorage) */
export function getLiveEarnedValueData(projectId: string = ''): LiveEVMData {
  if (!projectId) {
    return {
      BAC: 0, PV: 0, EV: 0, AC: 0, CPI: 0, SPI: 0, EAC: 0, ETC: 0, VAC: 0, TCPI: 0,
      avanceFisico: 0, avancePlanificado: 0, avanceFinanciero: 0,
      weekLabel: 'S-00', weekDate: '—'
    };
  }

  let latestWeekNum = 0;
  let latestReal = 0;
  let latestLabel = 'S-00';
  let latestDate = 'Sin iniciar';

  try {
    const weeks = loadCustomWeeks(projectId);
    const sorted = [...weeks].sort((a, b) => a.weekNum - b.weekNum);
    if (sorted.length > 0) {
      const last = sorted[sorted.length - 1];
      latestWeekNum = last.weekNum;
      latestReal = computeProjectReal(last.values);
      latestLabel = last.label;
      latestDate = last.dateLabel;
    }
  } catch { /* use defaults */ }

  const latestProg = weeklyProgMap.get(latestWeekNum) ?? 0;
  const spi = latestProg > 0 ? Math.round((latestReal / latestProg) * 100) / 100 : 0;

  const eacData = loadEAC(projectId);
  const eacConFin = eacData.conFin;
  
  const BAC = 0; 
  const AC = 0; 

  const PV = BAC * latestProg / 100;
  const EV_oferta = BAC * latestReal / 100;
  
  const bacCosto = eacConFin;
  const evCosto = bacCosto * latestReal / 100;
  const cpi = AC > 0 ? Math.round((evCosto / AC) * 100) / 100 : 0;

  const EAC = eacConFin;
  const ETC = EAC - AC;
  const VAC = BAC - EAC;
  const TCPI = (BAC - AC) > 0 ? Math.round(((BAC - EV_oferta) / (BAC - AC)) * 100) / 100 : 0;

  return {
    BAC,
    PV: Math.round(PV),
    EV: Math.round(EV_oferta),
    AC,
    CPI: cpi,
    SPI: spi,
    EAC,
    ETC,
    VAC,
    TCPI,
    avanceFisico: Math.round(latestReal * 10) / 10,
    avancePlanificado: Math.round(latestProg * 10) / 10,
    avanceFinanciero: BAC > 0 ? Math.round((AC / BAC) * 1000) / 10 : 0,
    weekLabel: latestLabel,
    weekDate: latestDate,
  };
}

// ==================== FORMAT HELPERS ====================
export const fmtCOP = formatCOPFull;

export const fmtNum = (v: number): string =>
  new Intl.NumberFormat('es-CO', { minimumFractionDigits: 0 }).format(v);

export const fmtPct = formatPercent;
