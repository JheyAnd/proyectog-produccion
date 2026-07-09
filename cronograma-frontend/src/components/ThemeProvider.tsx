import { ReactNode, useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

interface ThemeProviderProps {
  children: ReactNode;
}

export default function ThemeProvider({ children }: ThemeProviderProps) {
  const mode = useThemeStore((s) => s.mode);

  // Cada vez que el modo cambia en el store, sincronizar el DOM.
  // El store ya inicializa con el valor correcto desde localStorage,
  // así que esto solo necesita reaccionar a cambios posteriores.
  useEffect(() => {
    const html = document.documentElement;
    if (mode === 'dark') {
      html.classList.add('dark');
      html.style.colorScheme = 'dark';
    } else {
      html.classList.remove('dark');
      html.style.colorScheme = 'light';
    }
  }, [mode]);

  return <>{children}</>;
}
