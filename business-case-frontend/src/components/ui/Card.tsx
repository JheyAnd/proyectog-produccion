import { ReactNode, HTMLAttributes } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

const Card = ({ className, children, ...props }: CardProps) => {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-steel-800',
        'border border-steel-200 dark:border-steel-700',
        'rounded-xl shadow-sm hover:shadow-card-hover',
        'overflow-hidden transition-shadow duration-200',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardHeader = ({ className, children, ...props }: CardHeaderProps) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 sm:px-4 sm:py-3',
        'border-b border-steel-200 dark:border-steel-700',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardContent = ({ className, children, ...props }: CardContentProps) => {
  return (
    <div
      className={clsx(
        'p-6 sm:p-4',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

const CardFooter = ({ className, children, ...props }: CardFooterProps) => {
  return (
    <div
      className={clsx(
        'px-6 py-4 sm:px-4 sm:py-3',
        'border-t border-steel-200 dark:border-steel-700',
        'bg-steel-50 dark:bg-steel-900/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export { Card, CardHeader, CardContent, CardFooter };
