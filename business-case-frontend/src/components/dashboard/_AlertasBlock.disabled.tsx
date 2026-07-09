// ============================================
// ALERTAS BLOCK — DESHABILITADO TEMPORALMENTE
// Para reintegrar: ver PROMPT DE POSICIONAMIENTO DASHBOARD
// Fecha de deshabilitación: 12 de Mayo de 2026
// ============================================

/**
 * ESTE ARCHIVO NO SE COMPILA — ES SÓLO PARA PRESERVACIÓN
 * 
 * Contenía el bloque grande de alertas que aparecía debajo de los KPIs.
 */

/*
// Bloque de Alertas — fila completa
<div>
  <KPICard
    title="Alertas Activas"
    value={dynamicAlerts.length}
    subtitle={`${dynamicAlerts.filter((a) => a.severity === 'critical').length} criticas · ${dynamicAlerts.filter((a) => a.severity === 'warning').length} advertencias · ${dynamicAlerts.filter((a) => a.severity === 'info').length} informativas`}
    icon={AlertTriangle}
    variant={dynamicAlerts.some((a) => a.severity === 'critical') ? 'danger' : 'warning'}
    onClick={() => navigate(`/projects/${projectId}/alerts`)}
    centered
    compact
  />
</div>
*/
