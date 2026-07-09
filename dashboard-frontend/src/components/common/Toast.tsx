import { create } from 'zustand';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

// ── Store de Toasts ──────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastState {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  removeToast: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  showToast: (message, type = 'success', duration = 3000) => {
    const id = Math.random().toString(36).substring(2, 9);
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }]
    }));
  },
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),
}));

// ── Componente Toast Individual ───────────────────────────────────

function ToastItem({ toast }: { toast: Toast }) {
  const removeToast = useToastStore((s) => s.removeToast);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => removeToast(toast.id), 300);
    }, toast.duration || 3000);
    return () => clearTimeout(timer);
  }, [toast, removeToast]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <AlertCircle className="w-5 h-5 text-rose-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />,
    warning: <AlertCircle className="w-5 h-5 text-amber-500" />,
  };

  const bgColors = {
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800',
    error: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800',
    info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800',
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800',
  };

  return (
    <div className={clsx(
      "flex items-center gap-3 p-4 rounded-xl border shadow-lg transition-all duration-300 transform",
      bgColors[toast.type],
      isExiting ? "opacity-0 translate-x-8" : "opacity-100 translate-x-0"
    )}>
      {icons[toast.type]}
      <p className="text-sm font-medium text-steel-700 dark:text-steel-200">
        {toast.message}
      </p>
      <button 
        onClick={() => { setIsExiting(true); setTimeout(() => removeToast(toast.id), 300); }}
        className="ml-auto p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
      >
        <X className="w-4 h-4 text-steel-400" />
      </button>
    </div>
  );
}

// ── Contenedor Global de Toasts ────────────────────────────────────

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 max-w-md w-full sm:w-auto">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}
