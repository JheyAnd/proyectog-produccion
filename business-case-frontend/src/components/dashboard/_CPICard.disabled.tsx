// ============================================
// CPI CARD — DESHABILITADO TEMPORALMENTE
// Para reintegrar: ver PROMPT DE REINTEGRACIÓN CPI
// Fecha de deshabilitación: 12 de Mayo de 2026
// ============================================

/**
 * ESTE ARCHIVO NO SE COMPILA — ES SÓLO PARA PRESERVACIÓN
 * 
 * Contenía la lógica y UI del Índice de Rendimiento de Costo (CPI)
 * que fue removido del Dashboard principal.
 */

/* 
// 1. Lógica de cálculo (dentro de DashboardPage)
const dynamicCPI = useMemo(() => {
  const ev = initial.bac * dynamicSPI.real / 100;
  const ac = actualCostOverride !== null ? actualCostOverride : initial.actualCost;
  const cpi = ac > 0 ? ev / ac : 0;

  const { conFin = 0, sinFin = 0 } = eacData;

  return {
    cpi: Math.round(cpi * 100) / 100,
    ev,
    ac,
    bac: initial.bac,
    eacConFin: conFin || 1, // Evitar división por cero
    eacSinFin: sinFin || 1,
  };
}, [dynamicSPI, eacData, projectId]);

// 2. Componente UI (en el grid de KPIs)
<KPICard
  title="CPI (Indice de Costo)"
  value={dynamicCPI.cpi.toFixed(2)}
  subtitle={`EV/AC (${dynamicSPI.weekLabel}) · Ver detalle`}
  icon={Target}
  trend={dynamicCPI.cpi >= 1 ? 'up' : 'down'}
  variant={dynamicCPI.cpi >= 1 ? 'success' : 'danger'}
  onClick={() => setShowCPIDetail(true)}
/>

// 3. Modal de detalle (líneas 1091-1407 de DashboardPage.tsx)
{showCPIDetail && (
  <>
    <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowCPIDetail(false)} />
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowCPIDetail(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="modal-cpi-title" className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        ... completo en el historial de DashboardPage.tsx ...
      </div>
    </div>
  </>
)}
*/
