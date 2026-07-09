import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import { ChevronRight } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  onClick?: () => void;
  centered?: boolean;
  compact?: boolean;
}

const variantBorderColor: Record<string, string | undefined> = {
  primary: '#1b5eab',
  success: '#10b981',
  warning: '#f59e0b',
  danger:  '#ef4444',
};

const iconStyles = {
  default: 'bg-primary-50 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400',
  primary: 'bg-primary-100 text-primary-600 dark:bg-primary-950/30 dark:text-primary-400',
  success: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400',
  danger:  'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400',
};

const detailBadgeStyles = {
  default: 'text-primary-500 border-primary-100 bg-primary-50/60 dark:text-primary-300 dark:border-primary-700 dark:bg-primary-950/40',
  primary: 'text-primary-600 border-primary-100 bg-primary-50/60 dark:text-primary-300 dark:border-primary-700 dark:bg-primary-950/40',
  success: 'text-emerald-600 border-emerald-100 bg-emerald-50/60 dark:text-emerald-300 dark:border-emerald-700 dark:bg-emerald-950/40',
  warning: 'text-amber-600 border-amber-100 bg-amber-50/60 dark:text-amber-300 dark:border-amber-700 dark:bg-amber-950/40',
  danger:  'text-red-500 border-red-100 bg-red-50/60 dark:text-red-300 dark:border-red-700 dark:bg-red-950/40',
};

const trendColorMap: Record<string, Record<string, string>> = {
  primary: { neutral: 'text-primary-600' },
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  variant = 'default',
  onClick,
  centered = false,
  compact = false,
}: KPICardProps) {
  const leftBorder = variantBorderColor[variant];

  const sharedClasses = clsx(
    'w-full rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-card transition-all hover:shadow-card-hover flex flex-col text-left',
    onClick
      ? 'cursor-pointer hover:ring-2 hover:ring-primary-200 dark:hover:ring-primary-700 active:scale-[0.98] shadow-[0_4px_18px_-2px_rgba(27,94,171,0.10)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-steel-900'
      : '',
    !leftBorder && 'hover:border-primary-300 dark:hover:border-primary-700',
  );

  const cardContent = (
    <>
      {/* Main content */}
      <div className={clsx(
        compact ? 'py-3 px-5' : 'p-5',
        'flex-1',
        centered && 'flex flex-col items-center justify-center text-center'
      )}>
        <div className={clsx('flex items-start', centered ? (compact ? 'flex-col gap-1 items-center' : 'flex-col gap-2 items-center') : 'justify-between')}>
          {centered && (
            <div className={clsx(compact ? 'rounded-lg p-2' : 'rounded-xl p-3', iconStyles[variant])}>
              <Icon className={clsx(compact ? 'h-4 w-4' : 'h-5 w-5')} aria-hidden="true" />
            </div>
          )}
          <div className={clsx('flex-1', centered && 'flex flex-col items-center')}>
            {/* If compact and centered, show Value then Title. Otherwise Title then Value */}
            {centered && compact ? (
              <>
                <p className="text-2xl font-bold text-steel-900 dark:text-white leading-tight">{value}</p>
                <p className="text-[10px] font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider mt-0.5">{title}</p>
              </>
            ) : (
              <>
                <p className="text-xs font-medium text-steel-500 dark:text-steel-400 uppercase tracking-wide">{title}</p>
                <p className="mt-1.5 text-2xl font-bold text-steel-900 dark:text-white">{value}</p>
              </>
            )}
            
            {subtitle && (
              <p className={clsx(
                compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs',
                'text-steel-500 dark:text-steel-400'
              )}>
                {subtitle}
              </p>
            )}
            {trendValue && (
              <p
                className={clsx(
                  'mt-1 text-sm font-semibold',
                  trend === 'up' && 'text-emerald-600',
                  trend === 'down' && 'text-red-600',
                  trend === 'neutral' && (trendColorMap[variant]?.neutral || 'text-steel-500'),
                )}
              >
                {trend === 'up' && '+'}{trendValue}
              </p>
            )}
          </div>
          {!centered && (
            <div className={clsx('rounded-xl p-3', iconStyles[variant])}>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </div>
          )}
        </div>
      </div>

      {/* "Ver detalle" strip */}
      {onClick && (
          <span
            aria-hidden="true"
            className={clsx(
              'flex items-center px-5 rounded-b-xl border-t border-steel-100 dark:border-steel-700 text-[10px] font-semibold tracking-wide w-full',
              compact ? 'py-1.5' : 'py-2',
              centered ? 'justify-center gap-1' : 'justify-between',
              detailBadgeStyles[variant],
            )}
          >
            <span>Ver detalle</span>
            <ChevronRight className={clsx(compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />
          </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`${title}: ${value}. Ver detalle`}
        style={leftBorder ? { borderLeftWidth: 4, borderLeftColor: leftBorder } : undefined}
        className={sharedClasses}
      >
        {cardContent}
      </button>
    );
  }

  return (
    <div
      style={leftBorder ? { borderLeftWidth: 4, borderLeftColor: leftBorder } : undefined}
      className={sharedClasses}
    >
      {cardContent}
    </div>
  );
}
