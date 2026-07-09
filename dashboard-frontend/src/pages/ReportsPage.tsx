import { Download, Printer, CheckCircle2, Loader2, FileText, FileSpreadsheet, Database } from 'lucide-react';
import HelpButton from '@/components/common/HelpButton';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import { ProjectProvider } from '@/contexts/ProjectContext';
import { updateProjectInfo } from '@/utils/reportData';
import EmptyProjectState from '@/components/common/EmptyProjectState';

const reportsHelp = {
  pageTitle: 'Ayuda — Reportes e Informes',
  description:
    'Genera reportes gerenciales exportables con datos dinámicos del proyecto actual. ' +
    'Los reportes incluyen indicadores EVM, avance físico, costos y flujo de caja en formato profesional.',
  sections: [
    {
      title: 'Reportes Disponibles',
      items: [
        { icon: '📊', label: 'Estado General del Proyecto', description: 'Reporte ejecutivo completo: EVM (BAC, EV, AC, CPI, SPI), Curva S, alertas activas, resumen presupuestario y flujo de caja.' },
        { icon: '💵', label: 'Flujo de Caja Mensual', description: 'Ingresos vs egresos proyectados y reales por mes. Incluye análisis de liquidez, crédito puente e impacto de escenarios.' },
        { icon: '📉', label: 'Cuadro de Variación Presupuestaria', description: 'Comparativo caso de negocio vs costo real por capítulo. Muestra desviaciones y estado de negociación.' },
        { icon: '🎯', label: 'Reporte EAC — Costo a Terminación', description: 'Proyección del costo final del proyecto con análisis de margen, CPI, VAC y utilidad proyectada.' },
      ],
    },
    {
      title: 'Formatos de Exportación',
      items: [
        { color: '#DC2626', label: 'PDF', description: 'Documento profesional con logo de PC Mejía, tablas formateadas y análisis narrativo. Listo para presentar a gerencia o cliente.' },
        { color: '#16A34A', label: 'Excel', description: 'Datos tabulares exportables para análisis adicional, integración con otros sistemas o auditoría.' },
      ],
    },
    {
      title: 'Fuentes de Datos',
      items: [
        { icon: '🔄', label: 'Datos dinámicos', description: 'Los reportes incluyen las semanas personalizadas del Cronograma (S-41 en adelante) y los escenarios de ingreso del Flujo de Caja.' },
        { icon: '📅', label: 'Corte de información', description: 'Los KPIs de EVM se calculan con la última semana de corte registrada en el Cronograma.' },
      ],
    },
  ],
};
import { useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import {
  generateProjectStatusPDF,
  generateCashFlowPDF,
  generateBudgetVariancePDF,
  generateEACReportPDF,
} from '../utils/generatePDF';
import {
  generateProjectStatusExcel,
  generateCashFlowExcel,
  generateBudgetVarianceExcel,
  generateEACReportExcel,
} from '../utils/generateExcel';

type ReportFormat = 'PDF' | 'Excel';

interface ReportConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  formats: ReportFormat[];
  generatePDF: () => void | Promise<void>;
  generateExcel: () => void | Promise<void>;
}

const reports: ReportConfig[] = [
  {
    id: 'project-status',
    title: 'Estado General del Proyecto',
    description: 'Resumen ejecutivo con indicadores clave de desempeno, avance fisico y financiero. Incluye presupuesto por capitulo y metricas EVM.',
    icon: '📊',
    formats: ['PDF', 'Excel'],
    generatePDF: generateProjectStatusPDF,
    generateExcel: generateProjectStatusExcel,
  },
  {
    id: 'cash-flow-monthly',
    title: 'Flujo de Caja Mensual',
    description: 'Ingresos vs Egresos mensual, con acumulados y proyeccion. Incluye analisis de variaciones entre proyectado y real.',
    icon: '💰',
    formats: ['PDF', 'Excel'],
    generatePDF: generateCashFlowPDF,
    generateExcel: generateCashFlowExcel,
  },
  {
    id: 'budget-variance',
    title: 'Cuadro de Variacion Presupuestaria',
    description: 'Comparativo Presupuesto Original vs Vigente vs Real por cada partida. Detalla desviaciones, % de consumo y estructura AIU.',
    icon: '📋',
    formats: ['PDF', 'Excel'],
    generatePDF: generateBudgetVariancePDF,
    generateExcel: generateBudgetVarianceExcel,
  },
  {
    id: 'eac-report',
    title: 'Reporte de Costos a Terminacion (EAC)',
    description: 'Analisis de Valor Ganado completo: BAC, PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI. Incluye gestion de compras vs caso de negocio.',
    icon: '🎯',
    formats: ['PDF', 'Excel'],
    generatePDF: generateEACReportPDF,
    generateExcel: generateEACReportExcel,
  },
];

export default function ReportsPage() {
  const { projectId = '' } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [generating, setGenerating] = useState<string | null>(null);
  const [lastGenerated, setLastGenerated] = useState<string | null>(null);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
  });

  useEffect(() => {
    if (project) {
      updateProjectInfo({
        name: project.name,
        code: project.code,
        client: project.client_name,
      });
    }
  }, [project]);

  const handleDownload = useCallback(async (reportId: string, format: ReportFormat, generator: () => void | Promise<void>) => {
    const key = `${reportId}-${format}`;
    setGenerating(key);
    setLastGenerated(null);

    // Small delay to show loading state
    await new Promise((r) => setTimeout(r, 300));

    try {
      await (generator as (pid: string) => void | Promise<void>)(projectId);
      setLastGenerated(key);
      // Clear success after 3s
      setTimeout(() => setLastGenerated((prev) => (prev === key ? null : prev)), 3000);
    } catch (err) {
      console.error('Error generating report:', err);
      alert(`Error al generar el reporte: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setGenerating(null);
    }
  }, []);

  const handlePrint = useCallback((_reportId: string, generatePDF: (pid: string) => void | Promise<void>) => {
    void generatePDF(projectId);
  }, [projectId]);

  // Empty state for projects without data
  if (reports.length === 0) {
    return (
      <ProjectProvider projectId={projectId}>
        <EmptyProjectState
          module="Reportes"
          description="Este proyecto aún no tiene reportes disponibles. Los reportes se generan automáticamente cuando hay datos del cronograma y presupuesto."
          actionLabel="Ir a Dashboard"
          onAction={() => navigate(`/projects/${projectId}/dashboard`)}
          icon={Database}
        />
      </ProjectProvider>
    );
  }

  return (
    <ProjectProvider projectId={projectId}>
      <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-steel-900 dark:text-white">Reportes e Informes</h2>
          <p className="text-xs text-steel-400 dark:text-steel-500 mt-1">
            Genera reportes gerenciales exportables en PDF y Excel con formato profesional
          </p>
        </div>
        <div className="flex items-center gap-3">
          <HelpButton {...reportsHelp} />
          <div className="flex items-center gap-2 text-xs text-steel-400 dark:text-steel-500 bg-steel-50 dark:bg-steel-900 px-3 py-1.5 rounded-full border border-steel-200 dark:border-steel-700">
            <FileText className="h-3.5 w-3.5" />
            <span>{reports.length} reportes disponibles</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <div
            key={report.id}
            className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 p-6 shadow-card hover:shadow-card-hover transition"
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{report.icon}</span>
              <div className="flex-1">
                <h3 className="text-base font-bold text-steel-900 dark:text-white">{report.title}</h3>
                <p className="text-xs text-steel-400 dark:text-steel-500 mt-1.5 leading-relaxed">{report.description}</p>

                <div className="flex flex-wrap gap-2 mt-4">
                  {report.formats.map((format) => {
                    const key = `${report.id}-${format}`;
                    const isGenerating = generating === key;
                    const isSuccess = lastGenerated === key;
                    const generator = format === 'PDF' ? report.generatePDF : report.generateExcel;
                    const FormatIcon = format === 'PDF' ? FileText : FileSpreadsheet;

                    return (
                      <button
                        key={format}
                        disabled={isGenerating}
                        onClick={() => handleDownload(report.id, format, generator)}
                        className={clsx(
                          'flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition',
                          isSuccess
                            ? 'border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 dark:border-emerald-800'
                            : isGenerating
                              ? 'border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-900 text-steel-400 dark:text-steel-500 cursor-wait'
                              : format === 'PDF'
                                ? 'border-red-200 dark:border-red-800 bg-white dark:bg-steel-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-300'
                                : 'border-emerald-200 dark:border-emerald-800 bg-white dark:bg-steel-800 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:border-emerald-300'
                        )}
                      >
                        {isGenerating ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <FormatIcon className="h-3.5 w-3.5" />
                        )}
                        <Download className="h-3 w-3" />
                        {isGenerating ? 'Generando...' : isSuccess ? 'Descargado!' : `${format}`}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePrint(report.id, report.generatePDF)}
                    className="flex items-center gap-1.5 rounded-lg border border-primary-300 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 hover:bg-primary-100 transition"
                  >
                    <Printer className="h-3.5 w-3.5" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Info card */}
      <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50/50 dark:bg-primary-950/30 p-4">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-primary-800 dark:text-primary-300">Informacion sobre los reportes</p>
            <p className="text-[11px] text-primary-600 dark:text-primary-300 mt-1 leading-relaxed">
              Los reportes PDF incluyen encabezado corporativo con logo PC Mejia, tablas formateadas con colores
              condicionales y pie de pagina con paginacion. Los archivos Excel contienen multiples hojas con datos
              estructurados para analisis adicional. Todos los datos provienen del caso de negocio real del proyecto.
            </p>
          </div>
        </div>
      </div>
      </div>
    </ProjectProvider>
  );
}
