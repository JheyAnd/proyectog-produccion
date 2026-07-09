import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, X } from 'lucide-react';
import clsx from 'clsx';

interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
}

interface AlertsPanelProps {
  alerts: Alert[];
}

const severityConfig = {
  critical: {
    icon: AlertTriangle,
    bg: 'bg-red-50 border-red-200',
    iconColor: 'text-red-500',
    titleColor: 'text-red-800',
    badgeBg: 'bg-red-500',
  },
  warning: {
    icon: AlertCircle,
    bg: 'bg-amber-50 border-amber-200',
    iconColor: 'text-amber-500',
    titleColor: 'text-amber-800',
    badgeBg: 'bg-amber-500',
  },
  info: {
    icon: Info,
    bg: 'bg-primary-50 border-primary-200',
    iconColor: 'text-primary-500',
    titleColor: 'text-primary-800',
    badgeBg: 'bg-primary-500',
  },
};

function AlertItem({ alert }: { alert: Alert }) {
  const config = severityConfig[alert.severity];
  const Icon = config.icon;
  return (
    <div className={clsx('flex gap-3 rounded-xl border p-4', config.bg)}>
      <Icon className={clsx('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1">
        <p className={clsx('text-sm font-semibold', config.titleColor)}>
          {alert.title}
        </p>
        <p className="text-xs text-steel-600 mt-1 leading-relaxed">{alert.message}</p>
      </div>
    </div>
  );
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [showModal, setShowModal] = useState(false);
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-steel-200 bg-white p-6 shadow-card">
        <h3 className="text-base font-bold text-steel-800 mb-4">Alertas del Proyecto</h3>
        <p className="text-sm text-steel-400">No hay alertas activas.</p>
      </div>
    );
  }

  return (
    <>
      {/* Button */}
      <button
        onClick={() => setShowModal(true)}
        className="w-full rounded-xl border border-steel-200 bg-white p-6 shadow-card hover:shadow-lg hover:border-red-300 transition text-left group"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-red-500 group-hover:scale-110 transition" />
            <div>
              <h3 className="text-base font-bold text-steel-800 group-hover:text-red-700 transition">
                Alertas del Proyecto
              </h3>
              <p className="text-xs text-steel-400 mt-0.5">{criticalCount} críticas | {alerts.length} total</p>
            </div>
          </div>
          <span className="text-xs font-bold text-white bg-red-500 rounded-full px-3 py-1 group-hover:bg-red-600 transition">
            {alerts.length}
          </span>
        </div>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div aria-hidden="true" className="absolute inset-0" onClick={() => setShowModal(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="alerts-modal-title"
            className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="border-b border-steel-200 p-6 flex items-center justify-between">
              <div>
                <h2 id="alerts-modal-title" className="text-xl font-bold text-steel-900">Alertas del Proyecto</h2>
                <p className="text-xs text-steel-400 mt-1">Descripción detallada de {alerts.length} alerta{alerts.length !== 1 ? 's' : ''} activa{alerts.length !== 1 ? 's' : ''}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                aria-label="Cerrar panel de alertas"
                className="p-2 hover:bg-steel-100 rounded-lg transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <X className="h-5 w-5 text-steel-400" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {alerts.map((alert) => (
                <AlertItem key={alert.id} alert={alert} />
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-steel-200 p-6 bg-steel-50 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-lg border border-steel-300 text-steel-700 font-medium hover:bg-steel-100 transition focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
