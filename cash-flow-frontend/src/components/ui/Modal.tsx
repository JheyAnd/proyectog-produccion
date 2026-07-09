import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose?: () => void;
  children: React.ReactNode;
  className?: string;
  showClose?: boolean;
}

export default function Modal({ open, onClose, children, className, showClose = true }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-steel-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div 
        className={clsx(
          "bg-white dark:bg-steel-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-steel-200 dark:border-steel-700 animate-in zoom-in-95 duration-300 relative",
          className
        )}
      >
        {showClose && onClose && (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-steel-100 dark:hover:bg-steel-700 rounded-full transition-colors text-steel-500 dark:text-steel-400 z-10"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
