/**
 * Estado global del widget PaCo Mejía.
 * Persiste entre cambios de ruta (por eso vive en un store, no en el componente).
 */
import { create } from 'zustand';

export interface PacoMessage {
  role: 'user' | 'assistant';
  content: string;
  /** ISO timestamp para ordenar y mostrar horas si se quiere. */
  at: string;
}

interface PacoState {
  isOpen: boolean;
  history: PacoMessage[];
  streamText: string;
  streaming: boolean;

  open: () => void;
  close: () => void;
  toggle: () => void;

  appendUser: (content: string) => void;
  appendAssistant: (content: string) => void;
  setStreamText: (t: string) => void;
  setStreaming: (v: boolean) => void;
  clearHistory: () => void;
}

export const usePacoStore = create<PacoState>((set) => ({
  isOpen: false,
  history: [],
  streamText: '',
  streaming: false,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  toggle: () => set((s) => ({ isOpen: !s.isOpen })),

  appendUser: (content) =>
    set((s) => ({
      history: [...s.history, { role: 'user', content, at: new Date().toISOString() }],
    })),
  appendAssistant: (content) =>
    set((s) => ({
      history: [...s.history, { role: 'assistant', content, at: new Date().toISOString() }],
    })),
  setStreamText: (t) => set({ streamText: t }),
  setStreaming: (v) => set({ streaming: v }),
  clearHistory: () => set({ history: [], streamText: '', streaming: false }),
}));
