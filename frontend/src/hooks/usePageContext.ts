/**
 * Registra el contexto de la página actual en `pageContextStore` para que
 * PaCo pueda consultarlo. Las páginas lo llaman así:
 *
 *   usePageContext({
 *     title: 'Dashboard — Patio Sur OE1035',
 *     description: 'KPIs de ejecución, curva S, CPI, SPI.',
 *     keyMetrics: { cpi, spi },
 *     dataSummary: 'Total ejecutado: $X / Planeado: $Y',
 *   });
 *
 * Al desmontarse, el contexto se limpia para evitar leaks entre páginas.
 */
import { useEffect } from 'react';
import { usePageContextStore, type PageContext } from '@/stores/pageContextStore';

export function usePageContext(ctx: PageContext): void {
  // Serializamos como dep para evitar loops cuando el llamador crea el objeto inline.
  const serialized = JSON.stringify(ctx);

  useEffect(() => {
    usePageContextStore.getState().setContext(ctx);
    return () => {
      // Solo limpiamos si todavía somos el contexto activo
      // (la siguiente página sobreescribe en su mount).
      const cur = usePageContextStore.getState().context;
      if (cur && JSON.stringify(cur) === serialized) {
        usePageContextStore.getState().clearContext();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialized]);
}
