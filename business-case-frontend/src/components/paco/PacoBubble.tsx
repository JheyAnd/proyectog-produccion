/**
 * Burbuja flotante (minimizada) del asistente PaCo Mejía.
 */
import { useEffect, useState } from 'react';
import { usePacoStore } from '../../stores/pacoStore';
import { hasActiveKey, AI_CHANGED_EVENT } from '../../utils/aiClient';
import PacoMascot from './PacoMascot';
import clsx from 'clsx';

export default function PacoBubble() {
  const toggle = usePacoStore((s) => s.toggle);
  const isOpen = usePacoStore((s) => s.isOpen);

  const [hasKey, setHasKey] = useState(() => hasActiveKey());

  useEffect(() => {
    const checkKey = () => setHasKey(hasActiveKey());
    window.addEventListener(AI_CHANGED_EVENT, checkKey);
    return () => window.removeEventListener(AI_CHANGED_EVENT, checkKey);
  }, []);

  if (isOpen) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 group">
      {/* Tooltip */}
      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none mb-1">
        <div className="bg-steel-800 dark:bg-steel-700 text-white text-xs px-3 py-1.5 rounded-lg shadow-xl whitespace-nowrap relative">
          {hasKey ? (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              PaCo Mejía está listo
            </span>
          ) : (
            'Configura tu API en Analizador IA'
          )}
          <div className="absolute top-full right-4 w-2 h-2 bg-steel-800 dark:bg-steel-700 rotate-45 -translate-y-1" />
        </div>
      </div>

      {/* Botón burbuja: overflow-hidden + rounded para que la imagen llene el recuadro */}
      <button
        type="button"
        onClick={toggle}
        aria-label="Abrir PaCo Mejía"
        className={clsx(
          'relative rounded-[1.75rem] shadow-2xl overflow-hidden',
          'transition-all duration-300 hover:scale-105 active:scale-95',
          'w-20 h-20 sm:w-28 sm:h-28',
          hasKey
            ? 'ring-2 ring-primary-300/40 hover:ring-primary-300/70 dark:ring-primary-600/40 dark:hover:ring-primary-600/70'
            : 'opacity-70 grayscale ring-1 ring-steel-300/40 dark:ring-steel-600/40',
        )}
      >
        {/* PaCo — contain para ver el avión completo con alas */}
        <PacoMascot
          animated={hasKey}
          fit="contain"
          className="absolute inset-0 w-full h-full"
        />

        {/* Indicador de estado activo */}
        {hasKey && (
          <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow z-10 animate-pulse" />
        )}
      </button>
    </div>
  );
}
