import { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md';
  children: ReactNode;
}

const Badge = ({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: BadgeProps) => {
  const baseStyles = clsx(
    'inline-flex items-center gap-1.5',
    'rounded-full font-semibold',
    'transition-colors duration-200'
  );

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-caption',
    md: 'px-2.5 py-1 text-body-xs',
  };

  const variantStyles = {
    primary: clsx(
      'bg-primary-100 text-primary-700',
      'dark:bg-primary-950/30 dark:text-primary-300'
    ),
    secondary: clsx(
      'bg-steel-100 text-steel-700',
      'dark:bg-steel-700 dark:text-steel-300'
    ),
    success: clsx(
      'bg-success-50 text-success-700',
      'dark:bg-success-950/30 dark:text-success-300'
    ),
    warning: clsx(
      'bg-warning-50 text-warning-600',
      'dark:bg-warning-950/30 dark:text-warning-300'
    ),
    danger: clsx(
      'bg-danger-50 text-danger-700',
      'dark:bg-danger-950/30 dark:text-danger-300'
    ),
  };

  return (
    <span
      className={clsx(baseStyles, sizeStyles[size], variantStyles[variant], className)}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
