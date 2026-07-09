import React, { createContext, useContext, ReactNode } from 'react';

/**
 * ProjectContext: Contexto global para el projectId seleccionado.
 *
 * Objetivo: Aislar datos entre proyectos.
 * - Cada página que implementa un módulo debe envolver su contenido con <ProjectProvider>
 * - Todos los submódulos usan useProject() para obtener el projectId actual
 * - Datos, localStorage, y API calls se filtran automáticamente por este projectId
 *
 * USO:
 * // En la página principal (ej: DashboardPage)
 * <ProjectProvider projectId={projectId}>
 *   <DashboardContent />
 * </ProjectProvider>
 *
 * // En un componente interno
 * const { projectId } = useProject();
 */

interface ProjectContextType {
  projectId: string;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

interface ProjectProviderProps {
  projectId: string;
  children: ReactNode;
}

/**
 * Proveedor de contexto de proyecto.
 * Envuelve la página y todos sus submódulos para compartir el projectId.
 */
export function ProjectProvider({ projectId, children }: ProjectProviderProps) {
  return (
    <ProjectContext.Provider value={{ projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook para acceder al projectId actual desde cualquier componente.
 * Usar este hook en lugar de useParams() para conseguir el projectId consistentemente.
 */
export function useProject(): ProjectContextType {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject() debe usarse dentro de <ProjectProvider>');
  }
  return context;
}
