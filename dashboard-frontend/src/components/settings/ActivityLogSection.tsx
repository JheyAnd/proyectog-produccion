import { useState, useEffect, useMemo } from 'react';
import { History, Search, Filter, Loader2, RefreshCw, Download, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { getActivityLogFromServer, ActivityEntry } from '@/utils/activityTracker';

const VisualValue = ({ value, isAfter, otherValue }: { value: any, isAfter?: boolean, otherValue?: any }) => {
  if (!value) return <span className="text-steel-300 dark:text-steel-600 text-xs italic">—</span>;

  let parsed: any = value;
  let otherParsed: any = otherValue;

  try {
    if (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('['))) {
      parsed = JSON.parse(value);
    }
  } catch { /* not json */ }

  try {
    if (typeof otherValue === 'string' && (otherValue.trim().startsWith('{') || otherValue.trim().startsWith('['))) {
      otherParsed = JSON.parse(otherValue);
    }
  } catch { /* not json */ }

  // If not an object (or null), render as simple text
  if (typeof parsed !== 'object' || parsed === null) {
    return <span className="break-words font-medium">{String(parsed)}</span>;
  }

  // If it's an object, show a clean list of fields
  const entries = Object.entries(parsed);
  
  // Diff logic: if we have both sides, only show fields that differ
  let displayEntries = entries;
  if (otherParsed && typeof otherParsed === 'object' && !Array.isArray(parsed) && !Array.isArray(otherParsed)) {
     displayEntries = entries.filter(([key, val]) => {
       const otherVal = otherParsed[key];
       return JSON.stringify(val) !== JSON.stringify(otherVal);
     });
     // Safety: if objects are identical or something went wrong, show first few keys
     if (displayEntries.length === 0) displayEntries = entries.slice(0, 3);
  } else if (entries.length > 8) {
     // If too many fields and no comparison, show a summary
     displayEntries = entries.slice(0, 5);
  }

  const formatCOP = (num: number) => 
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(num);

  return (
    <div className="flex flex-wrap gap-1.5 py-1">
      {displayEntries.map(([key, val]) => {
        const isFinancial = key.toLowerCase().includes('valor') || 
                          key.toLowerCase().includes('costo') || 
                          key.toLowerCase().includes('venta') || 
                          key.toLowerCase().includes('presupuesto');
        const displayVal = (typeof val === 'number' && isFinancial) ? formatCOP(val) : String(val);
        
        return (
          <div key={key} className={clsx(
            "flex flex-col px-2 py-1 rounded border shadow-sm transition-all text-[10px]",
            isAfter 
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300" 
              : "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/50 text-red-800 dark:text-red-300"
          )}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="font-bold uppercase opacity-50 text-[9px] tracking-wider truncate max-w-[180px]">
                {key.replace(/_/g, ' ')}
              </span>
            </div>
            <div className="font-bold truncate max-w-[350px] leading-tight" title={String(val)}>
              {displayVal}
            </div>
          </div>
        );
      })}
      {entries.length > displayEntries.length && (
        <div className="px-2 py-1 text-[9px] text-steel-400 dark:text-steel-500 self-center font-medium italic">
          + {entries.length - displayEntries.length} campos
        </div>
      )}
    </div>
  );
};

export default function ActivityLogSection() {
  const [logs, setLogs] = useState<ActivityEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigate = useNavigate();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedModule, setSelectedModule] = useState<string>('all');

  const loadData = async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    else setIsLoading(true);
    
    try {
      const data = await getActivityLogFromServer(1000);
      setLogs(data);
    } catch (error) {
      console.error("Error loading activity log:", error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute unique roles and modules from data for the dropdowns
  const availableRoles = useMemo(() => Array.from(new Set(logs.map(l => l.userRole))).filter(Boolean), [logs]);
  const availableModules = useMemo(() => Array.from(new Set(logs.map(l => l.module || l.page))).filter(Boolean), [logs]);

  // Apply filters
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Role filter
      if (selectedRole !== 'all' && log.userRole !== selectedRole) return false;
      // Module filter
      if (selectedModule !== 'all' && (log.module || log.page) !== selectedModule) return false;
      // Search text (Name, action, or module)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const textMatch = 
          (log.userName || '').toLowerCase().includes(q) ||
          (log.action || '').toLowerCase().includes(q) ||
          (log.page || '').toLowerCase().includes(q) ||
          (log.module || '').toLowerCase().includes(q);
        if (!textMatch) return false;
      }
      return true;
    });
  }, [logs, selectedRole, selectedModule, searchQuery]);

  const formatDate = (isoString?: string) => {
    if (!isoString) return 'Desconocido';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-CO', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        timeZone: 'America/Bogota'
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const handleExportCSV = () => {
    const headers = ['Fecha y Hora', 'Usuario', 'Rol', 'Módulo', 'Acción', 'Antes', 'Después'];
    const csvRows = filteredLogs.map(log => {
      const date = formatDate(log.timestamp).replace(/,/g, '');
      const user = `"${(log.userName || '').replace(/"/g, '""')}"`;
      const role = `"${(log.userRole || '').replace(/"/g, '""')}"`;
      const module = `"${(log.module || log.page || '').replace(/"/g, '""')}"`;
      const action = `"${(log.action || '').replace(/"/g, '""')}"`;
      const before = `"${(log.before || '').replace(/"/g, '""')}"`;
      const after = `"${(log.after || '').replace(/"/g, '""')}"`;
      return [date, user, role, module, action, before, after].join(',');
    });
    const csvString = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob(['\uFEFF' + csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `registro_actividades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-screen max-h-[calc(100vh-120px)]">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <History className="w-5 h-5 text-orange-600 dark:text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-steel-900 dark:text-white">Registro de Actividades</h2>
            <p className="text-sm text-steel-500 dark:text-steel-400">Auditoría completa con detalle de cambios (MySQL)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 hover:bg-steel-50 dark:hover:bg-steel-700 rounded-lg text-sm font-semibold text-steel-700 dark:text-steel-300 transition"
            title="Exportar a Excel (CSV)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
          <button 
            onClick={() => loadData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-2 p-2 bg-white dark:bg-steel-800 border border-steel-200 dark:border-steel-700 hover:bg-steel-50 dark:hover:bg-steel-700 rounded-lg text-steel-600 dark:text-steel-300 transition"
            title="Actualizar datos"
          >
            <RefreshCw className={clsx("w-4 h-4", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Franja de Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 bg-steel-50 dark:bg-steel-800/50 rounded-xl mb-4 border border-steel-200 dark:border-steel-700">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
          <input
            type="text"
            placeholder="Buscar por usuario, acción o módulo..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-lg text-sm text-steel-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
        
        <div className="flex gap-3">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="pl-9 pr-8 py-2 appearance-none bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-lg text-sm text-steel-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Cualquier Rol</option>
              {availableRoles.map(role => (
                <option key={role} value={role} className="capitalize">{role}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-steel-400" />
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="pl-9 pr-8 py-2 appearance-none bg-white dark:bg-steel-900 border border-steel-200 dark:border-steel-700 rounded-lg text-sm text-steel-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">Todos los Módulos</option>
              {availableModules.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="flex-1 bg-white dark:bg-steel-800 rounded-xl border border-steel-200 dark:border-steel-700 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-steel-500 dark:text-steel-400">
            <History className="w-12 h-12 mb-3 opacity-20" />
            <p className="text-lg font-medium">No se encontraron registros</p>
            <p className="text-sm">Intenta ajustar los filtros de búsqueda.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="w-full text-left text-sm text-steel-600 dark:text-steel-300">
              <thead className="sticky top-0 bg-steel-100 dark:bg-steel-900/80 backdrop-blur-md text-xs uppercase font-bold text-steel-500 dark:text-steel-400 border-b border-steel-200 dark:border-steel-700">
                <tr>
                  <th className="px-4 py-3 whitespace-nowrap">Fecha y Hora</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Módulo</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Antes</th>
                  <th className="px-4 py-3">Después</th>
                  <th className="px-4 py-3 text-center">Ir</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
                {filteredLogs.map(log => {
                  const computedLink = log.link || (() => {
                    const pageStr = (log.page || '').toLowerCase();
                    const moduleStr = (log.module || '').toLowerCase();
                    const basePath = '/projects/patio-sur-oe1035';
                    
                    if (pageStr.includes('cronograma') || moduleStr.includes('cronograma')) return `${basePath}/cronograma`;
                    if (pageStr.includes('dashboard') || moduleStr.includes('dashboard')) return `${basePath}/dashboard`;
                    if (pageStr.includes('cash') || pageStr.includes('flujo') || moduleStr.includes('flujo')) return `${basePath}/cash-flow`;
                    if (pageStr.includes('report') || moduleStr.includes('report')) return `${basePath}/reports`;
                    if (pageStr.includes('document') || moduleStr.includes('document')) return `${basePath}/documents`;
                    if (pageStr.includes('business') || pageStr.includes('financiero') || moduleStr.includes('financiero')) return `${basePath}/business-case`;
                    if (pageStr.includes('alert') || moduleStr.includes('alert')) return `${basePath}/alerts`;
                    if (pageStr.includes('ai') || pageStr.includes('ia') || moduleStr.includes('ia')) return `/settings`;
                    
                    return null;
                  })();

                  return (
                  <tr 
                    key={log.id} 
                    className={clsx(
                      "group transition",
                      computedLink ? "cursor-pointer hover:bg-primary-50/30 dark:hover:bg-primary-950/10" : "hover:bg-steel-50/50 dark:hover:bg-steel-800/50"
                    )}
                    onClick={() => computedLink && navigate(computedLink)}
                  >
                    <td className="px-4 py-4 whitespace-nowrap text-steel-500 dark:text-steel-400 text-[10px] font-medium">
                      {formatDate(log.timestamp)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-steel-900 dark:text-white truncate max-w-[200px]" title={log.userName}>{log.userName}</div>
                      <div className="text-[10px] uppercase font-bold tracking-wider text-steel-400 dark:text-steel-500 mt-0.5">
                        {log.userRole}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-steel-100 dark:bg-steel-700 text-[10px] font-bold text-steel-600 dark:text-steel-300 uppercase tracking-tight">
                        {log.module || log.page}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-steel-900 dark:text-white font-medium text-[11px] max-w-[150px] break-words line-clamp-2" title={log.action}>
                        {log.action}
                      </div>
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      <VisualValue value={log.before} otherValue={log.after} />
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      <VisualValue value={log.after} isAfter otherValue={log.before} />
                    </td>
                    <td className="px-4 py-4 text-center">
                      {computedLink && (
                        <div className="inline-flex p-1.5 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-steel-500 dark:text-steel-400 italic">
          * Haz clic en una fila para navegar directamente a la sección modificada.
        </p>
        <p className="text-xs font-bold text-steel-500 dark:text-steel-400">
          Mostrando {filteredLogs.length} registros
        </p>
      </div>
    </div>
  );
}
