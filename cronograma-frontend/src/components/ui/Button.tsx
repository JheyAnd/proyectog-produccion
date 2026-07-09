import { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  fullWidth?: boolean;
  children: ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      fullWidth = false,
      className,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = clsx(
      'inline-flex items-center justify-center gap-2 rounded-lg',
      'font-semibold transition-all duration-200',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      'dark:focus:ring-offset-steel-900',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      fullWidth && 'w-full'
    );

    const sizeStyles = {
      sm: 'px-3 py-1 text-body-xs',
      md: 'px-4 py-2 text-body-sm',
      lg: 'px-6 py-3 text-body-md',
    };

    const variantStyles = {
      primary: clsx(
        'bg-primary-600 text-white',
        'hover:bg-primary-700',
        'active:scale-95',
        'dark:bg-primary-600 dark:hover:bg-primary-700'
      ),
      secondary: clsx(
        'bg-steel-100 text-steel-900',
        'hover:bg-steel-200',
        'dark:bg-steel-700 dark:text-steel-100 dark:hover:bg-steel-600'
      ),
      ghost: clsx(
        'bg-transparent text-primary-600',
        'hover:bg-primary-50',
        'dark:text-primary-400 dark:hover:bg-primary-950/30'
      ),
      danger: clsx(
        'bg-danger-600 text-white',
        'hover:bg-danger-700',
        'active:scale-95',
        'dark:bg-danger-600 dark:hover:bg-danger-700'
      ),
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando...
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
