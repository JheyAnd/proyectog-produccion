import { Upload, FileText, File, Download, Trash2, Search, FolderOpen, Eye, ChevronDown, Database } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import HelpButton from '@/components/common/HelpButton';
import { CATEGORIES_MAP, useDocuments } from '@/data/documentsData';
import type { DocumentItem } from '@/data/documentsData';
import { useAuthStore } from '@/stores/authStore';
import { useQuery } from '@tanstack/react-query';
import { projectsApi } from '@/services/api/projects';
import { ProjectProvider } from '@/contexts/ProjectContext';
import EmptyProjectState from '@/components/common/EmptyProjectState';

const documentsHelp = {
  pageTitle: 'Ayuda — Documentos del Proyecto',
  description:
    'Repositorio centralizado de documentos del proyecto actual. ' +
    'Permite subir, buscar, filtrar y descargar archivos de todas las disciplinas del proyecto.',
  sections: [
    {
      title: 'Categorías de Documentos',
      items: [
        { icon: '📁', label: '01 Caso de Negocio', description: 'Documentos iniciales y justificación del proyecto.' },
        { icon: '📁', label: '02 Plan de Gestión', description: 'Planes generales de gestión del proyecto.' },
        { icon: '📁', label: '03 Aspectos Financieros', description: 'Presupuestos, flujos de caja y análisis financiero.' },
        { icon: '📁', label: '04 Aspectos Legales', description: 'Contratos, pólizas, garantías y temas jurídicos.' },
        { icon: '📁', label: '05 Talento Organizacional', description: 'Organigramas y gestión de recursos humanos.' },
        { icon: '📁', label: '06 Informes Periódicos', description: 'Informes mensuales, semanales y reportes de avance.' },
        { icon: '📁', label: '07 Cronogramas', description: 'Programación de obra y cronogramas base.' },
        { icon: '📁', label: '08 Aprovisionamiento', description: 'Compras, logística y suministro de materiales.' },
        { icon: '📁', label: '09 Diseño e Ingeniería', description: 'Planos, memorias de cálculo y especificaciones técnicas.' },
        { icon: '📁', label: '10 Gestión Predial', description: 'Temas de predios, topografía y servidumbres.' },
        { icon: '📁', label: '11 Gestión Ambiental', description: 'Planes de manejo ambiental y permisos.' },
        { icon: '📁', label: '12 Calidad y SST', description: 'Planes de calidad, seguridad y salud en el trabajo.' },
        { icon: '📁', label: '13 Interesados - Plan de Comunicaciones', description: 'Gestión de stakeholders y comunicaciones.' },
        { icon: '📁', label: '14 Fotografías del Proyecto', description: 'Registro fotográfico del avance de obra.' },
        { icon: '📁', label: '15 Riesgos', description: 'Matriz de riesgos y planes de mitigación.' },
        { icon: '📁', label: '16. Grabaciones reuniones', description: 'Actas y grabaciones de comités.' },
        { icon: '📁', label: '17. App', description: 'Documentación relacionada con la aplicación.' },
        { icon: '📁', label: 'Otros', description: 'Documentos varios.' }
      ],
    },
    {
      title: 'Estados de Documentos',
      items: [
        { color: '#16A34A', label: 'Aprobado', description: 'Documento revisado y aprobado por la dirección del proyecto. Versión vigente.' },
        { color: '#D97706', label: 'Pendiente', description: 'En proceso de revisión o aprobación interna.' },
        { color: '#3B82F6', label: 'En revisión', description: 'Siendo revisado actualmente por el equipo técnico o el cliente.' },
      ],
    },
    {
      title: 'Acciones',
      items: [
        { icon: '⬆️', label: 'Subir documento', description: 'Arrastra archivos al área indicada o usa el botón "Subir Documento". Formatos soportados: PDF, XLSX, DWG, JPG, PNG.' },
        { icon: '🔍', label: 'Buscar y filtrar', description: 'Usa el buscador por nombre o el selector de categoría para encontrar documentos rápidamente.' },
        { icon: '⬇️', label: 'Descargar', description: 'Botón de descarga disponible en cada fila. Los diseños DWG requieren AutoCAD o visor compatible.' },
      ],
    },
  ],
};

// Categorías dinámicas desde el hook

const statusConfig: Record<string, { label: string; color: string }> = {
  approved: { label: 'Aprobado', color: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800' },
  pending: { label: 'Pendiente', color: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800' },
  revision: { label: 'En Revision', color: 'bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800' },
};

export default function DocumentsPage() {
  const { projectId: urlProjectId } = useParams<{ projectId: string }>();
  const projectId = urlProjectId || '';
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => (projectId ? projectsApi.getById(projectId) : null),
    enabled: !!projectId,
  });

  // Contexto de proyecto: nombre legible cuando estamos dentro de un proyecto
  const projectContext = projectId
    ? { id: projectId, name: project?.name || projectId }
    : undefined;
  const { documents, categories, addDocument, deleteDocument, logDownload, loading } = useDocuments(projectContext);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [searchTerm, setSearchTerm] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredDocs = documents.filter((doc) => {
    const matchesCategory = selectedCategory === 'Todos' || doc.category === selectedCategory;
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const cat = selectedCategory === 'Todos' ? 'Otros' : selectedCategory;
      await addDocument(file, cat, user);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDownload = (doc: DocumentItem) => {
    if (doc.source === 'blob') {
      window.open(`/api/v1/projects/${projectId}/files/${doc.docId}`, '_blank');
    } else {
      const cat = CATEGORIES_MAP[doc.category] || 'otros';
      const link = document.createElement('a');
      link.href = `/api/v1/documents/${cat}/${doc.docId}/download`;
      link.download = doc.name;
      link.click();
    }
    // Registrar descarga en activity_log
    logDownload(doc, user);
  };

  const handleDelete = async (doc: DocumentItem) => {
    if (!confirm(`¿Eliminar el documento "${doc.name}"?\n\nEsta acción no se puede deshacer.`)) return;
    await deleteDocument(doc.id, doc.category, user, doc.name, doc.source);
  };

  const handleView = (doc: DocumentItem) => {
    if (doc.source === 'blob') {
      window.open(`/api/v1/projects/${projectId}/files/${doc.docId}`, '_blank');
      return;
    }
    if (doc.sharepoint_url) {
      window.open(doc.sharepoint_url, '_blank');
      return;
    }
    const cat = CATEGORIES_MAP[doc.category] || 'otros';
    window.open(`/api/v1/documents/${cat}/${doc.docId}/preview`, '_blank');
  };

  // Empty state for projects without documents
  if (documents.length === 0 && !loading) {
    return (
      <ProjectProvider projectId={projectId}>
        <EmptyProjectState
          module="Documentos"
          description="Este proyecto aún no tiene documentos cargados. Comienza subiendo los documentos necesarios del proyecto."
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
          <h2 className="text-xl font-bold text-steel-900 dark:text-white">Documentos del Proyecto</h2>
          <p className="text-xs text-steel-400 dark:text-steel-500 mt-1">
            Gestion documental {project?.name ? `— ${project.name}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <HelpButton {...documentsHelp} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-primary-700 shadow-sm transition"
          >
            <Upload className="h-4 w-4" />
            Subir Documento
          </button>
        </div>
      </div>

      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
      />

      {/* Upload area */}
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-steel-300 dark:border-steel-700 bg-steel-50 dark:bg-steel-900 p-8 text-center hover:border-primary-400 hover:bg-primary-50/30 transition cursor-pointer"
      >
        <Upload className="h-10 w-10 text-steel-300 dark:text-steel-600 mx-auto mb-3" />
        <p className="text-sm font-medium text-steel-600 dark:text-steel-300">
          Arrastra archivos aqui o haz clic para seleccionar
        </p>
        <p className="text-xs text-steel-400 dark:text-steel-500 mt-1">
          PDF, DWG, XLSX, DOCX hasta 50MB
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-steel-300 dark:text-steel-600" />
          <input
            type="text"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-steel-300 dark:border-steel-700 bg-white dark:bg-steel-800 text-steel-800 dark:text-steel-100 pl-10 pr-4 py-2 text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 placeholder:text-steel-300 dark:placeholder:text-steel-600"
          />
        </div>
        
        {/* Category Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
            className="flex items-center justify-between min-w-[220px] rounded-xl border border-steel-300 dark:border-steel-700 bg-white dark:bg-steel-800 px-4 py-2 text-sm font-medium text-steel-700 dark:text-steel-200 hover:bg-steel-50 dark:hover:bg-steel-700 transition shadow-sm"
          >
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-primary-500" />
              <span className="truncate max-w-[160px]">{selectedCategory}</span>
            </div>
            <ChevronDown className="h-4 w-4 text-steel-400" />
          </button>
          
          {isCategoryDropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl bg-white dark:bg-steel-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50 border border-steel-200 dark:border-steel-700 overflow-hidden">
              <div className="max-h-[320px] overflow-y-auto scrollbar-pcm">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setSelectedCategory(cat.name);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={clsx(
                      'w-full text-left px-4 py-2.5 text-xs font-medium transition',
                      selectedCategory === cat.name
                        ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400'
                        : 'text-steel-600 dark:text-steel-300 hover:bg-steel-50 dark:hover:bg-steel-700/50'
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Documents count */}
      <div className="flex items-center justify-between text-xs text-steel-400 dark:text-steel-500">
        <div className="flex items-center gap-2">
          <FolderOpen className="h-4 w-4" />
          <span>{filteredDocs.length} documento(s) encontrado(s)</span>
        </div>
        {loading && (
          <div className="flex items-center gap-2 text-primary-500 animate-pulse">
            <div className="h-2 w-2 rounded-full bg-primary-500"></div>
            <span>Sincronizando con servidor...</span>
          </div>
        )}
      </div>

      {/* Documents table */}
      <div className="rounded-xl border border-steel-200 dark:border-steel-700 bg-white dark:bg-steel-800 shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-primary-900 text-white">
                <th className="px-4 py-3 text-left font-semibold text-xs">Documento</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Categoria</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Tipo</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Fecha de Carga</th>
                <th className="px-4 py-3 text-left font-semibold text-xs">Subido por</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Estado</th>
                <th className="px-4 py-3 text-center font-semibold text-xs">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-steel-100 dark:divide-steel-700/50">
              {filteredDocs.length > 0 ? (
                filteredDocs.map((doc) => {
                  const status = statusConfig[doc.status];
                  return (
                    <tr key={doc.id} className="hover:bg-steel-50/50 dark:hover:bg-steel-700/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {doc.type === 'PDF' ? (
                            <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                          ) : (
                            <File className="h-5 w-5 text-primary-500 flex-shrink-0" />
                          )}
                          <span className="font-medium text-steel-800 dark:text-steel-100 truncate max-w-xs text-xs">
                            {doc.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-steel-100 dark:bg-steel-700 border border-steel-200 dark:border-steel-600 px-2.5 py-0.5 text-[10px] font-medium text-steel-600 dark:text-steel-300">
                          {doc.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-primary-600 font-medium">{doc.type}</td>
                      <td className="px-4 py-3 text-steel-600 dark:text-steel-300 text-xs font-medium">{doc.uploadDate}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-col">
                          <span className="font-medium text-steel-700 dark:text-steel-200">{doc.uploadedBy}</span>
                          {doc.uploadedByRole && (
                            <span className="text-[10px] text-steel-400 dark:text-steel-500 capitalize">{doc.uploadedByRole}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={clsx('rounded-full px-2.5 py-0.5 text-[10px] font-semibold', status.color)}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button 
                            onClick={() => handleView(doc)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 text-steel-400 dark:text-steel-500 hover:text-primary-600 transition" 
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button 
                            onClick={() => handleDownload(doc)}
                            className="p-1.5 rounded-lg hover:bg-primary-50 dark:hover:bg-primary-950/30 text-steel-400 dark:text-steel-500 hover:text-primary-600 transition" 
                            title="Descargar"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-steel-400 dark:text-steel-500 hover:text-red-600 transition"
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <FolderOpen className="h-10 w-10 text-steel-200 dark:text-steel-700" />
                      <p className="text-sm text-steel-400 dark:text-steel-500">No hay documentos en esta categoría</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </ProjectProvider>
  );
}
