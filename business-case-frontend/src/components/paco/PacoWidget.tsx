/**
 * Orquestador del widget PaCo Mejía.
 * Muestra la burbuja minimizada o el panel expandido según `pacoStore.isOpen`.
 *
 * Se monta una sola vez en `App.tsx` dentro de `<ProtectedRoute>`, por lo que
 * no aparece en `/login` y persiste a través de cambios de ruta.
 */
import { usePacoStore } from '@/stores/pacoStore';
import PacoBubble from './PacoBubble';
import PacoPanel from './PacoPanel';

export default function PacoWidget() {
  const isOpen = usePacoStore((s) => s.isOpen);
  return isOpen ? <PacoPanel /> : <PacoBubble />;
}
