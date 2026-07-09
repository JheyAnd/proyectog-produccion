import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus } from 'lucide-react';
import ProjectsTrackingTable from '@/components/projects/ProjectsTrackingTable';
import NewProjectModal from '@/components/projects/NewProjectModal';
import { useProjectsTracking } from '@/data/projectsTracking';

export default function GlobalSummaryPage() {
  const navigate = useNavigate();
  const [projects, , , createProject] = useProjectsTracking();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const lastUpdated = new Date().toLocaleDateString('es-CO', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Bogota'
  });

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-steel-50/30 dark:bg-steel-950">
      {/* Page Header — Replicated Banner style from ProjectsPage for the button */}
      <div className="mx-6 mt-6 mb-4 bg-white dark:bg-steel-800 rounded-2xl border border-steel-200 dark:border-steel-700 shadow-sm overflow-hidden relative">
        <div className="bg-gradient-to-r from-primary-900 to-primary-700 px-6 sm:px-8 py-6 sm:py-8 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white drop-shadow-md">Proyectos</h1>
              <p className="text-primary-100 mt-2 text-sm sm:text-base drop-shadow max-w-2xl">
                Seguimiento a proyectos de Infraestructura de recarga eléctrica — PC Mejía Ingeniería
              </p>
              
              <div className="mt-4 flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-primary-200/80">
                <Calendar className="h-3.5 w-3.5 text-primary-300" />
                <span className="font-semibold">Última actualización:</span>
                <span className="font-medium text-white">{lastUpdated}</span>
              </div>
            </div>
            <div className="shrink-0">
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-3 px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/40 rounded-2xl text-white font-bold text-base transition-all active:scale-95 shadow-2xl group w-full md:w-auto justify-center"
              >
                <div className="h-6 w-6 rounded-lg bg-white/20 flex items-center justify-center group-hover:rotate-90 transition-transform duration-300">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <span>Nuevo Proyecto</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 px-6 pb-6">
        <ProjectsTrackingTable />
      </div>

      {/* Replicated Logic — Centralized NewProjectModal */}
      <NewProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async (data) => {
          const newP = await createProject(data);
          if (newP && newP.id) {
            navigate(`/projects/${newP.id}/dashboard`);
          }
        }}
      />
    </div>
  );
}
