import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  hydrateFromStorage: () => void;
  applyTheme: (mode: ThemeMode) => void;
}

const STORAGE_KEY = 'app_theme_mode';

// Lee el modo guardado de forma SÍNCRONA al cargar el módulo,
// para que el store ya parta con el valor correcto desde el primer render.
const readStoredMode = (): ThemeMode => {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
};

// Aplica la clase dark al <html> directamente (sin React).
const applyThemeToDom = (mode: ThemeMode) => {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  if (mode === 'dark') {
    html.classList.add('dark');
    html.style.colorScheme = 'dark';
  } else {
    html.classList.remove('dark');
    html.style.colorScheme = 'light';
  }
};

// Inicializar el DOM inmediatamente al importar el módulo
// (antes de que React monte cualquier componente)
const initialMode = readStoredMode();
applyThemeToDom(initialMode);

export const useThemeStore = create<ThemeStore>((set, get) => ({
  mode: initialMode, // ← parte con el valor real, no con 'light'

  setMode: (mode: ThemeMode) => {
    set({ mode });
    localStorage.setItem(STORAGE_KEY, mode);
    applyThemeToDom(mode);
  },

  toggleMode: () => {
    const currentMode = get().mode;
    const newMode = currentMode === 'light' ? 'dark' : 'light';
    get().setMode(newMode);
  },

  applyTheme: (mode: ThemeMode) => {
    applyThemeToDom(mode);
  },

  hydrateFromStorage: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const mode: ThemeMode = stored === 'dark' ? 'dark' : 'light';
    set({ mode });
    applyThemeToDom(mode);
  },
}));
