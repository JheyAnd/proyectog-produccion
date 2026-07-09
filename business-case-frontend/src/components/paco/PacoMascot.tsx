import clsx from 'clsx';

interface PacoMascotProps {
  size?: number;
  className?: string;
  /** Cuando es true, PaCo flota con animación suave */
  animated?: boolean;
  /**
   * 'contain' → imagen completa visible (avión con alas completas). DEFAULT.
   * 'cover'   → imagen llena el contenedor (recorta bordes). Para avatares pequeños.
   */
  fit?: 'cover' | 'contain';
}

export default function PacoMascot({
  size,
  className,
  animated = false,
  fit = 'contain',
}: PacoMascotProps) {
  return (
    <div
      className={clsx(
        'relative flex-shrink-0 transition-all duration-700',
        // Fondo azul degradado para que el SVG/PNG resalte (igual que la imagen original)
        'bg-gradient-to-br from-[#1a3a6b] to-[#0a1e3d]',
        animated && 'animate-paco-float',
        className,
      )}
      style={size ? { width: size, height: size } : undefined}
    >
      <img
        src="/images/paco-3d.png"
        alt="PaCo Mejía"
        draggable={false}
        className={clsx(
          'w-full h-full select-none pointer-events-none',
          fit === 'cover' ? 'object-cover object-center' : 'object-contain object-center',
          !animated && 'grayscale opacity-60',
        )}
      />

      <style>{`
        @keyframes paco-float {
          0%, 100% { transform: translateY(0px);  }
          50%       { transform: translateY(-8px); }
        }
        .animate-paco-float { animation: paco-float 3.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
