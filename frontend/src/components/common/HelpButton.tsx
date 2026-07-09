import { useState, useRef, useEffect, useCallback } from 'react';
import { HelpCircle, X, ChevronRight } from 'lucide-react';

export interface LegendItem {
  color?: string;
  icon?: string;
  label: string;
  description: string;
}

export interface LegendSection {
  title: string;
  items: LegendItem[];
}

interface HelpButtonProps {
  pageTitle: string;
  description: string;
  sections: LegendSection[];
}

export default function HelpButton({ pageTitle, description, sections }: HelpButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    // Restore focus to trigger button on close
    triggerRef.current?.focus();
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close();
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen, close]);

  // Close on Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); return; }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last?.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, close]);

  // Move focus into panel when it opens
  useEffect(() => {
    if (!isOpen || !panelRef.current) return;
    const firstFocusable = panelRef.current.querySelector<HTMLElement>(
      'button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])'
    );
    firstFocusable?.focus();
  }, [isOpen]);

  return (
    <div className="relative">
      {/* Help Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label="Ayuda y leyenda de esta página"
        className={`
          flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200
          ${isOpen
            ? 'bg-primary-600 text-white shadow-md'
            : 'border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-950/50 hover:border-primary-300'
          }
        `}
      >
        <HelpCircle className="h-4 w-4" aria-hidden="true" />
        <span>Ayuda</span>
      </button>

      {/* Overlay backdrop for mobile */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 z-40 xl:hidden" onClick={close} aria-hidden="true" />
      )}

      {/* Slide-out Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={`Ayuda: ${pageTitle}`}
          className={`
            fixed right-0 top-0 h-full w-full sm:w-[460px] bg-white dark:bg-steel-900 shadow-2xl z-50
            border-l border-steel-200 dark:border-steel-700 flex flex-col
            animate-in slide-in-from-right duration-200
          `}
          style={{ animation: 'slideIn 0.25s ease-out' }}
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-primary-800 to-primary-900 text-white">
            <div>
              <h3 className="font-bold text-base">{pageTitle}</h3>
              <p className="text-primary-200 text-xs mt-0.5">Guia de metricas e indicadores</p>
            </div>
            <button
              onClick={close}
              aria-label="Cerrar panel de ayuda"
              className="rounded-lg p-1.5 hover:bg-white/15 transition focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto scrollbar-pcm">
            <div className="p-5 space-y-5">
              {/* Description */}
              <div className="rounded-xl bg-primary-50 dark:bg-primary-950/30 border border-primary-100 dark:border-primary-900 p-4">
                <p className="text-xs text-primary-800 dark:text-primary-200 leading-relaxed">{description}</p>
              </div>

              {/* Legend Sections */}
              {sections.map((section, sIdx) => (
                <div key={sIdx}>
                  <h4 className="text-xs font-bold text-steel-900 dark:text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                    <div className="h-1 w-5 bg-primary-400 rounded-full" />
                    {section.title}
                  </h4>
                  <div className="space-y-2">
                    {section.items.map((item, iIdx) => (
                      <div
                        key={iIdx}
                        className="flex items-start gap-3 p-3 rounded-lg bg-steel-50 dark:bg-steel-800 hover:bg-steel-100/80 dark:hover:bg-steel-700/60 transition group"
                      >
                        {item.color && (
                          <div
                            className="w-4 h-4 rounded-md flex-shrink-0 mt-0.5 border border-black/5 shadow-sm"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        {item.icon && !item.color && (
                          <span className="text-sm flex-shrink-0 mt-0.5">{item.icon}</span>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-steel-800 dark:text-steel-100">{item.label}</p>
                          <p className="text-[11px] text-steel-500 dark:text-steel-400 leading-relaxed mt-0.5">{item.description}</p>
                        </div>
                        <ChevronRight className="h-3 w-3 text-steel-300 dark:text-steel-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Panel Footer */}
          <div className="px-5 py-3 border-t border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-800/50">
            <p className="text-[10px] text-steel-400 dark:text-steel-500 text-center">
              PCMejia SA — Sistema de Gestion de Proyectos v1.0
            </p>
          </div>
        </div>
      )}

      {/* Slide-in animation */}
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
