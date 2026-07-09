// ============================================================
// EGRESOS POR CATEGORÍA — Estructura extraída del Excel
// "Flujo de caja patio sur 6 abril (1).xlsx" — Hoja "FC X Obras"
// ============================================================
import { useState, useEffect } from 'react';
import { socketService } from '@/services/socketService';
import apiClient from '@/services/api/client';

const cashFlowApi = {
  get: (url: string) => apiClient.get(url, { baseURL: '/' }),
  post: (url: string, data?: any) => apiClient.post(url, data, { baseURL: '/' }),
  put: (url: string, data?: any) => apiClient.put(url, data, { baseURL: '/' }),
  patch: (url: string, data?: any) => apiClient.patch(url, data, { baseURL: '/' }),
  delete: (url: string) => apiClient.delete(url, { baseURL: '/' }),
};


export type CategoriaGrupo = 'materiales' | 'servicios' | 'mano_obra' | 'administracion' | 'intereses' | 'ingreso';

export interface EgresoCategoria {
  id: string;
  grupo: CategoriaGrupo;
  nombre: string;
  incluirEnGrafico?: boolean; // Si es false, se omite de los totales y gráficos
  // valores mensuales: key = "YYYY-MM"
  valores: Record<string, number>;
  mesesConDetalle?: string[];
}
// ... (EXCEL_MONTHS y MES_NOMBRES se mantienen igual)
export const EXCEL_MONTHS: string[] = [
  '2025-10', '2025-11', '2025-12',
  '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06',
  '2026-07', '2026-08', '2026-09', '2026-10', '2026-11', '2026-12',
  '2027-01', '2027-02', '2027-03', '2027-04', '2027-05', '2027-06',
  '2027-07', '2027-08', '2027-09', '2027-10', '2027-11', '2027-12',
  '2028-01', '2028-02', '2028-03', '2028-04', '2028-05', '2028-06',
  '2028-07', '2028-08', '2028-09', '2028-10', '2028-11', '2028-12',
];

export const MES_NOMBRES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export function formatMonthKey(key: string): string {
  const [y, m] = key.split('-').map(Number);
  return `${MES_NOMBRES[m - 1]} ${y}`;
}

export function monthLabelToKey(label: string): string {
  const [mName, yFull] = label.split(' ');
  const mIdx = MES_NOMBRES.indexOf(mName) + 1;
  return `${yFull}-${mIdx.toString().padStart(2, '0')}`;
}

export function formatMonthHeaderDate(key: string): Date {
  const [y, m] = key.split('-').map(Number);
  // último día del mes (coincide con el template FC X Obras)
  return new Date(y, m, 0);
}

export const GRUPO_LABELS: Record<CategoriaGrupo, string> = {
  materiales: 'MATERIALES',
  servicios: 'SERVICIOS',
  mano_obra: 'MANO DE OBRA',
  administracion: 'ADMINISTRATIVOS DIRECTIVOS',
  intereses: 'INTERESES',
  ingreso: 'INGRESO',
};

export const DEFAULT_MATERIALES = [
  "Cables eléctricos (BT, MT, DC solar)",
  "Tuberías, ductos y canalizaciones",
  "Tableros y gabinetes",
  "Luminarias e iluminación",
  "Equipos activos de red (switches, routers, APs)",
  "Infraestructura de comunicaciones (racks, patch panels, cableado Cat 6A / FO)",
  "Equipos de seguridad electrónica (CCTV, VMS, BMS, Control Acceso, Intrusión, Megafonía)",
  "Paneles fotovoltaicos",
  "Transformadores y Subestaciones",
  "Inversores",
  "Estructuras",
  "Aparatos eléctricos (tomas, suiches, conectores)",
  "Equipos de medida, protección y conexión a red",
  "Equipos especiales (UPS, capacitores, DPS, electrobarras)",
  "Puestas a Tierra",
  "Dotación",
  "Seguridad Industrial",
  "Materiales y accesorios generales"
];

export const DEFAULT_SERVICIOS = [
  "Montaje electromecánico (estructuras, pórticos)",
  "Alquiler Herramienta, equipo pesado y transporte",
  "Dirección de obra y supervisión técnica",
  "Ingeniería de detalle, memorias y certificación RETIE",
  "Servicios de Obras civiles (zanjas, cimentaciones, cerramiento)",
  "Pruebas, ensayos y comisionamiento eléctrico",
  "Certificación de cableado estructurado y fibra óptica",
  "Programación y puesta en marcha de sistemas especiales",
  "Operadores de Red",
  "Red de Media Tensión",
  "Trámites regulatorios (Operador de Red, UPME, permisos)",
  "Servicios de Control y Programación",
  "Seguros y pólizas (TRC, cumplimiento, generación)",
  "Mantenimiento, soporte y postventa"
];

// ============================================================
// Datos iniciales extraídos del Excel
// ============================================================
export const INITIAL_EGRESOS_CATEGORIAS: EgresoCategoria[] = [
  ...DEFAULT_MATERIALES.map((name, i) => ({
    id: `mat-def-${i+1}`,
    grupo: 'materiales' as CategoriaGrupo,
    nombre: name,
    incluirEnGrafico: true,
    valores: {}
  })),
  ...DEFAULT_SERVICIOS.map((name, i) => ({
    id: `serv-def-${i+1}`,
    grupo: 'servicios' as CategoriaGrupo,
    nombre: name,
    incluirEnGrafico: true,
    valores: {}
  }))
];

// Total acumulado por categoría
export function totalCategoria(cat: EgresoCategoria): number {
  return Object.values(cat.valores).reduce((s, v) => s + (v || 0), 0);
}

// Total mensual por grupo
export function totalMesGrupo(cats: EgresoCategoria[], grupo: CategoriaGrupo, mes: string): number {
  return cats.filter(c => c.grupo === grupo).reduce((s, c) => s + (c.valores[mes] || 0), 0);
}

// Total por grupo
export function totalGrupo(cats: EgresoCategoria[], grupo: CategoriaGrupo): number {
  return cats.filter(c => c.grupo === grupo).reduce((s, c) => s + totalCategoria(c), 0);
}

// ============================================================
// PAGOS REALES — valores efectivamente pagados por mes
// Provistos por el usuario (cierre a Abr 2026)
// ============================================================
export const REAL_PAGOS_MENSUALES: Record<string, number> = {
  '2025-12': 117_756_762,
  '2026-02': 7_551_845_375,
  '2026-03': 1_654_214_247,
  '2026-04':   393_226_447,
};

export function totalRealPagado(): number {
  return Object.values(REAL_PAGOS_MENSUALES).reduce((s, v) => s + v, 0);
}

// ============================================================
// Hook compartido — persiste en MySQL vía /api/v1/egresos
// Sincroniza entre componentes vía window event 'egresos:updated'
// ============================================================
const UPDATE_EVENT = 'egresos:updated';

// Flag para evitar que el socket recargue mientras estamos guardando localmente
let isSavingLocally = false;

/**
 * Ordena categorías por sort_order (BD) o por orden del seed (fallback).
 * NO mezcla con seed: la BD es la única fuente de verdad después del primer seed.
 */
function sortCategorias(apiData: EgresoCategoria[]): EgresoCategoria[] {
  return [...apiData].sort((a, b) => {
    // 1. Primero ordenar por grupo para mantener consistencia transitiva
    if (a.grupo !== b.grupo) {
      return (a.grupo || '').localeCompare(b.grupo || '');
    }

    // 2. Si son del mismo grupo, usar el orden de la lista por defecto
    if (a.grupo === 'materiales') {
      const idxA = DEFAULT_MATERIALES.indexOf(a.nombre);
      const idxB = DEFAULT_MATERIALES.indexOf(b.nombre);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }

    if (a.grupo === 'servicios') {
      const idxA = DEFAULT_SERVICIOS.indexOf(a.nombre);
      const idxB = DEFAULT_SERVICIOS.indexOf(b.nombre);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }

    // 3. Fallback: alfabéticamente si no coinciden
    return (a.nombre || '').localeCompare(b.nombre || '');
  });
}

/** Normaliza respuesta de la API (incluirEnGrafico → incluirEnGrafico) */
function normalizeApiResponse(raw: any[]): EgresoCategoria[] {
  const sortedRaw = [...raw].sort((a, b) => {
    const aOrder = a.sort_order ?? 999;
    const bOrder = b.sort_order ?? 999;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return (a.nombre || '').localeCompare(b.nombre || '');
  });

  let matCount = 0;
  let servCount = 0;

  const normalized = sortedRaw.map(r => {
    let finalNombre = r.nombre;
    if (r.grupo === 'materiales' && matCount < DEFAULT_MATERIALES.length) {
      finalNombre = DEFAULT_MATERIALES[matCount];
      matCount++;
    } else if (r.grupo === 'servicios' && servCount < DEFAULT_SERVICIOS.length) {
      finalNombre = DEFAULT_SERVICIOS[servCount];
      servCount++;
    }

    return {
      id: r.id,
      grupo: r.grupo as CategoriaGrupo,
      nombre: finalNombre,
      incluirEnGrafico: r.incluirEnGrafico ?? r.incluir_en_grafico ?? true,
      valores: r.valores ?? {},
      mesesConDetalle: r.mesesConDetalle ?? r.meses_con_detalle ?? [],
    };
  });

  // Agregar los materiales faltantes
  while (matCount < DEFAULT_MATERIALES.length) {
    normalized.push({
      id: `mat-def-${matCount+1}`,
      grupo: 'materiales',
      nombre: DEFAULT_MATERIALES[matCount],
      incluirEnGrafico: true,
      valores: {},
      mesesConDetalle: []
    });
    matCount++;
  }

  // Agregar los servicios faltantes
  while (servCount < DEFAULT_SERVICIOS.length) {
    normalized.push({
      id: `serv-def-${servCount+1}`,
      grupo: 'servicios',
      nombre: DEFAULT_SERVICIOS[servCount],
      incluirEnGrafico: true,
      valores: {},
      mesesConDetalle: []
    });
    servCount++;
  }

  return normalized;
}

// ============================================================
// Cola de saves granulares (PATCH por celda) con debounce
// Sustituye el PUT completo (1521 valores → 1 valor)
// + Fallback al endpoint legacy si v2 falla
// + Feedback visual de errores via window event 'cashflow:save-status'
// ============================================================
const SAVE_DEBOUNCE_MS = 400;
export const SAVE_STATUS_EVENT = 'cashflow:save-status';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface PendingSave {
  categoriaId: string;
  mesKey: string;
  valor: number;
  projectId: string;
  // Contexto para auto-create con datos correctos en el backend
  catNombre?: string;
  catGrupo?: string;
  // snapshot completo (para fallback PUT al endpoint legacy)
  snapshot?: EgresoCategoria[];
}

const pendingSaves = new Map<string, PendingSave>();
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let lastSnapshot: EgresoCategoria[] | null = null;

function emitStatus(status: SaveStatus, detail?: string) {
  window.dispatchEvent(new CustomEvent(SAVE_STATUS_EVENT, { detail: { status, detail } }));
}

async function trySaveOne(
  projectId: string,
  categoriaId: string,
  mesKey: string,
  valor: number,
  catNombre?: string,
  catGrupo?: string,
): Promise<boolean> {
  // 1. Intento PATCH granular v2 (con contexto para auto-create correcto)
  try {
    await cashFlowApi.put(
      `/api/v1/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}/valores`,
      {
        mes_key: mesKey,
        nuevo_valor: valor,
        cat_nombre: catNombre,
        cat_grupo: catGrupo,
      }
    );
    return true;
  } catch (err: any) {
    const status = err?.response?.status;
    console.warn(`[CashFlow v2] fail (${status}):`, categoriaId, mesKey, err?.message);
    // 2. Si falla, fallback al endpoint legacy (PUT completo con todo el array)
    if (lastSnapshot) {
      try {
        await cashFlowApi.put(`/api/v1/egresos/${projectId}`, lastSnapshot);
        return true;
      } catch (err2: any) {
        console.error('[CashFlow legacy] fallback fail:', err2?.message);
        return false;
      }
    }
    return false;
  }
}

async function flushPendingSaves() {
  if (pendingSaves.size === 0) return;
  const batch = Array.from(pendingSaves.values());
  pendingSaves.clear();

  emitStatus('saving', `Guardando ${batch.length} cambio(s)...`);

  const results = await Promise.all(
    batch.map(({ projectId, categoriaId, mesKey, valor, catNombre, catGrupo }) =>
      trySaveOne(projectId, categoriaId, mesKey, valor, catNombre, catGrupo)
    )
  );

  const failed = results.filter(r => !r).length;
  if (failed > 0) {
    emitStatus('error', `❌ ${failed} valor(es) NO se guardaron. Revisa la consola.`);
  } else {
    emitStatus('saved', `✅ ${batch.length} cambio(s) guardado(s)`);
    setTimeout(() => emitStatus('idle'), 1500);
  }
}

function queueSave(
  projectId: string,
  categoriaId: string,
  mesKey: string,
  valor: number,
  catNombre?: string,
  catGrupo?: string,
) {
  const key = `${categoriaId}:${mesKey}`;
  pendingSaves.set(key, { projectId, categoriaId, mesKey, valor, catNombre, catGrupo });
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(flushPendingSaves, SAVE_DEBOUNCE_MS);
}

/**
 * Crea una categoría en BD vía endpoint v2.
 * Si falla, hace fallback al endpoint legacy.
 */
async function createCategoriaInDB(projectId: string, cat: EgresoCategoria): Promise<boolean> {
  isSavingLocally = true;
  emitStatus('saving', `Creando categoría '${cat.nombre}'...`);
  try {
    await cashFlowApi.post(`/api/v1/v2/projects/${projectId}/cash-flow/categorias`, {
      id: cat.id,
      nombre: cat.nombre,
      grupo: cat.grupo,
      incluir_en_grafico: cat.incluirEnGrafico ?? true,
      sort_order: 999,
      valores: cat.valores || {},
    });
    emitStatus('saved', `✓ Categoría '${cat.nombre}' creada`);
    setTimeout(() => emitStatus('idle'), 1500);
    return true;
  } catch (err: any) {
    const errorMsg = err?.response?.data?.detail || err?.message || 'Error desconocido';
    console.warn(`[CashFlow v2] crear categoría '${cat.id}' falló:`, errorMsg);
    emitStatus('error', `❌ Error: ${errorMsg}`);
    // Alerta visual para que el usuario pueda reportar el error exacto
    alert(`Error al guardar la categoría en el servidor:\n${errorMsg}`);
    if (lastSnapshot) {
      try {
        await cashFlowApi.put(`/api/v1/egresos/${projectId}`, lastSnapshot);
        emitStatus('saved', '✓ Sincronizado (fallback)');
        return true;
      } catch (err2: any) {
        console.error('[CashFlow legacy] fallback fail crear:', err2?.message);
        return false;
      }
    }
    return false;
  } finally {
    setTimeout(() => { isSavingLocally = false; }, 2000);
  }
}

/**
 * Elimina una categoría en BD vía endpoint v2 (con fallback legacy).
 */
async function deleteCategoriaInDB(projectId: string, categoriaId: string): Promise<boolean> {
  isSavingLocally = true;
  emitStatus('saving', 'Eliminando categoría...');
  try {
    await cashFlowApi.delete(`/api/v1/v2/projects/${projectId}/cash-flow/categorias/${categoriaId}`);
    emitStatus('saved', '✓ Categoría eliminada');
    setTimeout(() => emitStatus('idle'), 1500);
    return true;
  } catch (err: any) {
    console.warn(`[CashFlow v2] eliminar categoría '${categoriaId}' falló:`, err?.message);
    emitStatus('error', '❌ Error al eliminar categoría');
    if (lastSnapshot) {
      try {
        await cashFlowApi.put(`/api/v1/egresos/${projectId}`, lastSnapshot);
        emitStatus('saved', '✓ Sincronizado (fallback)');
        return true;
      } catch {
        return false;
      }
    }
    return false;
  } finally {
    setTimeout(() => { isSavingLocally = false; }, 2000);
  }
}

/**
 * Actualiza nombre/grupo/etc de una categoría en BD.
 */
async function updateCategoriaInDB(projectId: string, cat: EgresoCategoria): Promise<boolean> {
  isSavingLocally = true;
  emitStatus('saving', `Guardando '${cat.nombre}'...`);
  try {
    await cashFlowApi.put(`/api/v1/v2/projects/${projectId}/cash-flow/categorias/${cat.id}`, {
      nombre: cat.nombre,
      grupo: cat.grupo,
      incluir_en_grafico: cat.incluirEnGrafico ?? true,
    });
    emitStatus('saved', `✓ Preferencia '${cat.nombre}' guardada`);
    setTimeout(() => emitStatus('idle'), 1500);
    return true;
  } catch (err: any) {
    console.warn(`[CashFlow v2] update categoría '${cat.id}' falló:`, err?.message);
    emitStatus('error', `❌ Error al guardar preferencia`);
    return false;
  } finally {
    // Liberar el flag después de que el servidor procese y el socket pueda escuchar de nuevo
    setTimeout(() => { isSavingLocally = false; }, 2000);
  }
}

/**
 * Detecta diferencias entre 2 listas y procesa:
 * - Categorías NUEVAS → POST crear en BD
 * - Categorías ELIMINADAS → DELETE en BD
 * - Categorías MODIFICADAS (nombre/grupo) → PUT update
 * - Valores cambiados → PATCH granular
 */
function diffAndQueue(projectId: string, prev: EgresoCategoria[], next: EgresoCategoria[]) {
  const prevMap = new Map(prev.map(c => [c.id, c]));
  const nextMap = new Map(next.map(c => [c.id, c]));

  // 1. Detectar categorías NUEVAS
  for (const cat of next) {
    if (!prevMap.has(cat.id)) {
      createCategoriaInDB(projectId, cat).catch(err => console.error('[CashFlow] Error creando categoria:', err));
    }
  }

  // 2. Detectar categorías ELIMINADAS
  for (const cat of prev) {
    if (!nextMap.has(cat.id)) {
      deleteCategoriaInDB(projectId, cat.id).catch(err => console.error('[CashFlow] Error eliminando categoria:', err));
    }
  }

  // 3. Categorías que CAMBIARON DE NOMBRE/GRUPO + diff de valores
  for (const cat of next) {
    const before = prevMap.get(cat.id);
    if (!before) continue;

    // 3a. Detectar cambios de metadata (nombre, grupo, incluirEnGrafico)
    if (
      before.nombre !== cat.nombre ||
      before.grupo !== cat.grupo ||
      (before.incluirEnGrafico ?? true) !== (cat.incluirEnGrafico ?? true)
    ) {
      updateCategoriaInDB(projectId, cat);
    }

    // 3b. Diff de valores mensuales (envía contexto para auto-create con nombre real)
    const allMeses = new Set([
      ...Object.keys(before.valores || {}),
      ...Object.keys(cat.valores || {}),
    ]);
    for (const mes of allMeses) {
      const valBefore = before.valores[mes];
      const valAfter = cat.valores[mes];
      if (valBefore !== valAfter) {
        queueSave(projectId, cat.id, mes, valAfter ?? 0, cat.nombre, cat.grupo);
      }
    }
  }
}

export function useEgresosCategorias(projectId: string = 'patio-sur-oe1035') {
  const [categorias, setCategoriasState] = useState<EgresoCategoria[]>(INITIAL_EGRESOS_CATEGORIAS);
  const [isLoaded, setIsLoaded] = useState(false);

  const apiBase = `/api/v1/v2/projects/${projectId}/cash-flow/categorias`;

  // ── Carga inicial desde MySQL (BD = ÚNICA fuente de verdad) ──
  useEffect(() => {
    let cancelled = false;

    async function loadOrSeed() {
      try {
        const saved = await cashFlowApi.get(apiBase);
        const data = Array.isArray(saved.data) ? saved.data : [];

        if (data.length > 0) {
          // Caso A: BD ya tiene datos → usar SOLO BD (no mezclar con seed)
          const normalized = normalizeApiResponse(data);
          if (!cancelled) {
            setCategoriasState(sortCategorias(normalized));
            lastSnapshot = sortCategorias(normalized);
          }
        } else {
          // Caso B: BD vacía → No hacer seed automático
          console.log(`[CashFlow] BD vacía para proyecto ${projectId}.`);
          if (!cancelled) {
            setCategoriasState([]);
            lastSnapshot = [];
          }
        }
      } catch (err: any) {
        console.warn('[CashFlow] Error cargando categorías:', err?.message);
        // Fallback: usar seed local (sin tocar BD)
        if (!cancelled) {
          setCategoriasState([]);
        }
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    }

    loadOrSeed();

    // ── Escuchar actualizaciones en tiempo real vía Socket.io ──
    const onPreferenceUpdate = ({ key, data }: { key: string; data: any }) => {
      // Solo recargamos si la llave coincide, el proyecto coincide y NO estamos guardando localmente
      if (key === 'egresos_categorias' && data?.project_key === projectId && !isSavingLocally) {
        cashFlowApi.get(apiBase)
          .then(saved => {
            const data = Array.isArray(saved.data) ? saved.data : [];
            if (data.length > 0 && !cancelled) {
              const normalized = normalizeApiResponse(data);
              setCategoriasState(sortCategorias(normalized));
            }
          }).catch(() => {});
      }
    };

    socketService.connect();
    socketService.onPreferenceUpdated(onPreferenceUpdate);

    return () => { 
      cancelled = true; 
    };
  }, [projectId, apiBase]);

  // Optimistic: actualiza UI INMEDIATAMENTE + encola saves granulares
  const setCategorias = (updater: EgresoCategoria[] | ((prev: EgresoCategoria[]) => EgresoCategoria[])) => {
    isSavingLocally = true;

    setCategoriasState(prev => {
      const next = typeof updater === 'function' ? (updater as (p: EgresoCategoria[]) => EgresoCategoria[])(prev) : updater;
      lastSnapshot = next;

      setTimeout(() => {
        try {
          diffAndQueue(projectId, prev, next);
          window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
        } finally {
          setTimeout(() => { isSavingLocally = false; }, 3000);
        }
      }, 0);

      return next;
    });
  };

  // Escucha cambios de otros componentes en la misma pestaña
  useEffect(() => {
    const handler = (e: any) => {
      if (e.detail && Array.isArray(e.detail)) {
        setCategoriasState(e.detail);
        return;
      }

      cashFlowApi.get(apiBase)
        .then(saved => {
          const data = Array.isArray(saved.data) ? saved.data : [];
          if (data.length > 0) {
            const normalized = normalizeApiResponse(data);
            setCategoriasState(sortCategorias(normalized));
          }
        }).catch(() => {});
    };
    window.addEventListener(UPDATE_EVENT, handler as EventListener);
    return () => {
      window.removeEventListener(UPDATE_EVENT, handler as EventListener);
    };
  }, [apiBase]);

  // ── Toggle rápido de inclusión/exclusión ──
  const toggleCategoriaInclusion = async (id: string) => {
    let targetCat: EgresoCategoria | undefined;
    setCategoriasState(prev => {
      const next = prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, incluirEnGrafico: c.incluirEnGrafico === false ? true : false };
          targetCat = updated;
          return updated;
        }
        return c;
      });
      lastSnapshot = next;
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: next }));
      }, 0);
      return next;
    });

    if (!targetCat) return;
    const catToSave = targetCat;
    isSavingLocally = true;
    emitStatus('saving', 'Guardando preferencia...');
    try {
      await cashFlowApi.patch(
        `/api/v1/egresos/${projectId}/${catToSave.id}/toggle-inclusion`
      );
      const lbl = catToSave.incluirEnGrafico !== false ? 'incluida' : 'excluida';
      emitStatus('saved', `Guardado: ${catToSave.nombre} ${lbl} del grafico`);
      setTimeout(() => emitStatus('idle'), 1500);
    } catch (err: any) {
      console.warn('[Toggle] fallo guardar', catToSave.id, err?.response?.status, err?.message);
      emitStatus('error', `Error al guardar preferencia. Cod: ${err?.response?.status ?? 0}`);
      setCategoriasState(prev => prev.map(c => c.id === id ? { ...c, incluirEnGrafico: !(catToSave.incluirEnGrafico ?? true) } : c));
    } finally {
      setTimeout(() => { isSavingLocally = false; }, 2000);
    }
  };
  
  // ── Toggle para subcategorías (detalles de celda) ──
  const toggleDetailInclusion = async (detailId: string) => {
    emitStatus('saving', 'Guardando preferencia de detalle...');
    try {
      await cashFlowApi.patch(
        `/api/v1/v2/projects/${projectId}/cash-flow/cell-details/${detailId}/toggle-inclusion`
      );
      emitStatus('saved', 'Preferencia de detalle guardada');
      setTimeout(() => emitStatus('idle'), 1500);
      
      // Forzamos recarga de categorías para que los totales se actualicen
      const saved = await cashFlowApi.get(apiBase);
      const data = Array.isArray(saved.data) ? saved.data : [];
      if (data.length > 0) {
        const normalized = normalizeApiResponse(data);
        setCategoriasState(sortCategorias(normalized));
      }
      return true;
    } catch (err: any) {
      console.error('[ToggleDetail] error:', err);
      emitStatus('error', 'Error al guardar preferencia de detalle');
      return false;
    }
  };

  return [categorias, setCategorias, isLoaded, toggleCategoriaInclusion, toggleDetailInclusion] as const;
}
