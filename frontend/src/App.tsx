import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import ProjectGuard from './components/common/ProjectGuard';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import SSOGuard from './components/auth/SSOGuard';
import NotFoundPage from './pages/NotFoundPage';
import AccessDeniedPage from './pages/AccessDeniedPage';
import MicrofrontendErrorBoundary from './components/common/MicrofrontendErrorBoundary';

// Remotos de negocio
const CashFlowPage = lazy(() => import('cashFlowApp/CashFlowPage'));
const GlobalCashFlowPage = lazy(() => import('cashFlowApp/GlobalCashFlowPage'));
const BusinessCasePage = lazy(() => import('businessCaseApp/BusinessCasePage'));
const CronogramaPage = lazy(() => import('cronogramaApp/CronogramaPage'));

// Remotos de dashboardApp (Páginas Globales)
const DashboardPage = lazy(() => import('dashboardApp/DashboardPage'));
const ProjectsPage = lazy(() => import('dashboardApp/ProjectsPage'));
const GlobalSummaryPage = lazy(() => import('dashboardApp/GlobalSummaryPage'));
const GlobalDashboardHubPage = lazy(() => import('dashboardApp/GlobalDashboardHubPage'));
const GlobalPortfolioDashboardPage = lazy(() => import('dashboardApp/GlobalPortfolioDashboardPage'));
const ReportsPage = lazy(() => import('dashboardApp/ReportsPage'));
const AlertsPage = lazy(() => import('dashboardApp/AlertsPage'));
const DocumentsPage = lazy(() => import('dashboardApp/DocumentsPage'));
const ProjectTrackingPage = lazy(() => import('dashboardApp/ProjectTrackingPage'));

const SuspenseWrapper = ({ children, moduleName = 'Módulo' }: { children: React.ReactNode, moduleName?: string }) => (
  <MicrofrontendErrorBoundary moduleName={moduleName}>
    <Suspense fallback={<div className="p-8 text-center text-steel-500">Cargando {moduleName}...</div>}>
      {children}
    </Suspense>
  </MicrofrontendErrorBoundary>
);

export default function App() {
  return (
    <Routes>
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/403" element={<AccessDeniedPage />} />
      
      <Route
        path="/"
        element={
          <SSOGuard>
            <MainLayout />
          </SSOGuard>
        }
      >
        <Route index element={<Navigate to="/global-dashboard" replace />} />
        
        {/* Páginas Globales Remotas */}
        <Route path="projects" element={<SuspenseWrapper moduleName="Proyectos"><ProjectsPage /></SuspenseWrapper>} />
        <Route path="global-summary" element={<SuspenseWrapper moduleName="Portafolio"><GlobalSummaryPage /></SuspenseWrapper>} />
        <Route path="global-dashboard" element={<SuspenseWrapper moduleName="Dashboard Global"><GlobalDashboardHubPage /></SuspenseWrapper>} />
        <Route path="global-dashboard/portfolio" element={<SuspenseWrapper moduleName="Resumen de Portafolio"><GlobalPortfolioDashboardPage /></SuspenseWrapper>} />
        <Route path="global-dashboard/fcg" element={<SuspenseWrapper moduleName="Flujo de Caja Global"><GlobalCashFlowPage /></SuspenseWrapper>} />
        
        {/* Páginas Locales del Shell */}
        <Route path="settings" element={<SettingsPage />} />
        <Route path="profile" element={<ProfilePage />} />

        {/* Rutas de proyecto (Remotas) */}
        <Route path="projects/:projectId" element={<ProjectGuard />}>
          <Route path="dashboard" element={<SuspenseWrapper moduleName="Dashboard"><DashboardPage /></SuspenseWrapper>} />
          <Route path="cash-flow" element={<SuspenseWrapper moduleName="Flujo de Caja"><CashFlowPage /></SuspenseWrapper>} />
          <Route path="business-case" element={<SuspenseWrapper moduleName="Caso de Negocio"><BusinessCasePage /></SuspenseWrapper>} />
          <Route path="cronograma" element={<SuspenseWrapper moduleName="Cronograma"><CronogramaPage /></SuspenseWrapper>} />
          <Route path="documents" element={<SuspenseWrapper moduleName="Documentos"><DocumentsPage /></SuspenseWrapper>} />
          <Route path="alerts" element={<SuspenseWrapper moduleName="Alertas"><AlertsPage /></SuspenseWrapper>} />
          <Route path="reports" element={<SuspenseWrapper moduleName="Reportes"><ReportsPage /></SuspenseWrapper>} />
          <Route path="tracking" element={<SuspenseWrapper moduleName="Seguimiento"><ProjectTrackingPage /></SuspenseWrapper>} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
