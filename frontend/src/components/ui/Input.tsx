import { InputHTMLAttributes, forwardRef, ReactNode } from 'react';
import clsx from 'clsx';
import { AlertCircle } from 'lucide-react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: ReactNode;
  fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, fullWidth = true, className, ...props }, ref) => {
    return (
      <div className={fullWidth ? 'w-full' : ''}>
        {label && (
          <label
            htmlFor={props.id}
            className="block text-body-xs font-semibold text-steel-900 dark:text-white mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            className={clsx(
              'w-full px-4 py-2 rounded-lg',
              'border border-steel-300 dark:border-steel-600',
              'bg-white dark:bg-steel-800',
              'text-steel-900 dark:text-white',
              'placeholder-steel-400 dark:placeholder-steel-500',
              'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              'disabled:bg-steel-50 dark:disabled:bg-steel-900/50',
              'transition-all duration-150',
              error && 'border-danger-500 focus:ring-danger-500/20 focus:border-danger-500',
              className
            )}
            {...props}
          />
          {error && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-danger-600 dark:text-danger-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-body-xs text-danger-600 dark:text-danger-400 flex items-center gap-1">
            {error}
          </p>
        )}
        {helper && !error && (
          <p className="mt-1 text-body-xs text-steel-500 dark:text-steel-400">
            {helper}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
