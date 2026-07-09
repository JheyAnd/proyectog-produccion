import { useState, useEffect, useCallback } from 'react';
import type { User } from '../stores/authStore';
import { logEdit } from '../utils/activityTracker';

export interface DocumentCategory {
  id: string;
  name: string;
}

export interface DocumentItem {
  id: string;
  name: string;
  type: string;
  category: string;
  size: string;
  uploadDate: string;
  uploadedBy: string;
  uploadedByRole?: string;
  uploadedAt?: string; // ISO timestamp
  projectId?: string;
  projectName?: string;
  status: 'approved' | 'pending' | 'revision';
  fileData?: string;
  docId: string; // Server ID
  sharepoint_url?: string;
  previewable: boolean;
  source?: 'v2' | 'blob';
}

/** Format ISO timestamp → "02-may-2026 15:30" */
function formatUploadDate(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
}

export const CATEGORIES_MAP: Record<string, string> = {
  '01 Caso de Negocio': '01_caso_de_negocio',
  '02 Plan de Gestión': '02_plan_de_gestion',
  '03 Aspectos Financieros': '03_aspectos_financieros',
  '04 Aspectos Legales': '04_aspectos_legales',
  '05 Talento Organizacional': '05_talento_organizacional',
  '06 Informes Periódicos': '06_informes_periodicos',
  '07 Cronogramas': '07_cronogramas',
  '08 Aprovisionamiento': '08_aprovisionamiento',
  '09 Diseño e Ingeniería': '09_diseno_e_ingenieria',
  '10 Gestión Predial': '10_gestion_predial',
  '11 Gestión Ambiental': '11_gestion_ambiental',
  '12 Calidad y SST': '12_calidad_y_sst',
  '13 Interesados - Plan de Comunicaciones': '13_interesados',
  '14 Fotografías del Proyecto': '14_fotografias',
  '15 Riesgos': '15_riesgos',
  '16. Grabaciones reuniones': '16_grabaciones',
  '17. App': '17_app',
  'Otros': 'otros'
};

const INV_MAP: Record<string, string> = {
  '01_caso_de_negocio': '01 Caso de Negocio',
  '02_plan_de_gestion': '02 Plan de Gestión',
  '03_aspectos_financieros': '03 Aspectos Financieros',
  '04_aspectos_legales': '04 Aspectos Legales',
  '05_talento_organizacional': '05 Talento Organizacional',
  '06_informes_periodicos': '06 Informes Periódicos',
  '07_cronogramas': '07 Cronogramas',
  '08_aprovisionamiento': '08 Aprovisionamiento',
  '09_diseno_e_ingenieria': '09 Diseño e Ingeniería',
  '10_gestion_predial': '10 Gestión Predial',
  '11_gestion_ambiental': '11 Gestión Ambiental',
  '12_calidad_y_sst': '12 Calidad y SST',
  '13_interesados': '13 Interesados - Plan de Comunicaciones',
  '14_fotografias': '14 Fotografías del Proyecto',
  '15_riesgos': '15 Riesgos',
  '16_grabaciones': '16. Grabaciones reuniones',
  '17_app': '17. App',
  'otros': 'Otros'
};

interface DocumentMeta {
  filename: string;
  previewable: boolean;
  sharepoint_url?: string;
  uploaded_by?: string;
  uploaded_by_id?: string;
  uploaded_by_role?: string;
  uploaded_at?: string;
  project_id?: string;
  project_name?: string;
}

export function useDocuments(projectContext?: { id?: string; name?: string }) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    
    try {
      // 1. Cargar categorías reales desde el backend (v2)
      const catResp = await fetch('/api/v1/v2/categories');
      let catMap: Record<string, string> = { ...INV_MAP };
      if (catResp.ok) {
        const cats = await catResp.json();
        setCategories([{ id: 'all', name: 'Todos' }, ...cats]);
        cats.forEach((c: any) => {
          catMap[c.id] = c.name;
        });
      }

      // 2. Determinar el Project ID (normalizado)
      const targetId = projectContext?.id === 'patio-sur-oe1035' 
        ? '86c9127f-1d2c-4764-a295-8a929d61216e' 
        : projectContext?.id;

      // 3. Cargar documentos usando el endpoint de v2
      let allDocs: DocumentItem[] = [];
      const fetchUrl = targetId 
        ? `/api/v1/v2/projects/${targetId}/documents`
        : `/api/v1/v2/documents`;

      const resp = await fetch(fetchUrl);
      if (resp.ok) {
        const data = await resp.json() as any[];
        data.forEach((doc: any) => {
          allDocs.push({
            id: doc.id,
            docId: doc.id,
            name: doc.filename,
            type: (doc.file_extension || '').toUpperCase(),
            category: doc.category_name || catMap[doc.category_id] || 'Otros',
            size: doc.file_size_bytes ? `${(doc.file_size_bytes / 1024).toFixed(1)} KB` : '---',
            uploadDate: formatUploadDate(doc.uploaded_at),
            uploadedAt: doc.uploaded_at,
            uploadedBy: doc.uploaded_by_name || 'Sistema',
            uploadedByRole: doc.uploaded_by_role,
            projectId: doc.project_id,
            status: doc.status,
            previewable: ['PDF', 'JPG', 'PNG', 'JPEG'].includes((doc.file_extension || '').toUpperCase()),
            sharepoint_url: doc.sharepoint_url,
            source: 'v2'
          } as DocumentItem);
        });
      }

      // 4. Cargar archivos rápidos de MySQL (project_files)
      if (projectContext?.id) {
        try {
          const filesResp = await fetch(`/api/v1/projects/${projectContext.id}/files`);
          if (filesResp.ok) {
            const filesData = await filesResp.json();
            filesData.forEach((f: any) => {
              allDocs.push({
                id: `pf_${f.id}`,
                docId: f.id.toString(),
                name: f.nombre,
                type: (f.tipo.split('/').pop() || f.nombre.split('.').pop() || '').toUpperCase(),
                category: f.categoria || 'Otros',
                size: f.tamano ? `${(f.tamano / 1024).toFixed(1)} KB` : '---',
                uploadDate: formatUploadDate(f.fecha),
                uploadedAt: f.fecha,
                uploadedBy: f.subido_por,
                projectId: projectContext.id,
                status: 'approved',
                previewable: f.tipo.includes('pdf') || f.tipo.includes('image'),
                sharepoint_url: '',
                source: 'blob'
              } as DocumentItem);
            });
          }
        } catch (err) {
          console.error("Error fetching project_files:", err);
        }
      }

      setDocuments(allDocs.sort((a, b) => {
        const da = a.uploadedAt || '';
        const db = b.uploadedAt || '';
        return db.localeCompare(da);
      }));
    } catch (err) {
      console.error("Error fetching docs:", err);
    } finally {
      setLoading(false);
    }
  }, [projectContext?.id]);

  /** Sube un documento. Registra en activity_log con detalles del usuario. */
  const addDocument = async (file: File, categoryName: string = 'Otros', user?: User | null) => {
    const catObj = categories.find(c => c.name === categoryName);
    const backendCat = catObj?.id || CATEGORIES_MAP[categoryName] || 'otros';
    
    const targetId = projectContext?.id === 'patio-sur-oe1035' 
      ? '86c9127f-1d2c-4764-a295-8a929d61216e' 
      : projectContext?.id || 'default-project';

    const docId = `doc_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const formData = new FormData();
    formData.append('doc_id', docId);
    formData.append('file', file);

    if (user) {
      formData.append('uploaded_by', user.full_name);
      formData.append('uploaded_by_id', user.id);
      formData.append('uploaded_by_role', user.role);
    }
    if (projectContext?.id) formData.append('project_id', projectContext.id);
    if (projectContext?.name) formData.append('project_name', projectContext.name);

    try {
      const resp = await fetch(`/api/v1/documents/upload/${backendCat}?project_id=${projectContext?.id || 'patio-sur-oe1035'}`, {
        method: 'POST',
        body: formData
      });

      if (resp.ok) {
        // Registrar en activity_log
        if (user) {
          const projectInfo = projectContext?.name ? ` (Proyecto: ${projectContext.name})` : '';
          logEdit(user, 'Documentos', `Cargó "${file.name}" en categoría "${categoryName}"${projectInfo}`);
        }
        await fetchAll();
        return true;
      } else {
        console.error("Upload failed with status:", resp.status);
        const text = await resp.text();
        console.error("Server error response:", text);
      }
    } catch (err) {
      console.error("Network upload error:", err);
    }
    return false;
  };

  /** Elimina un documento. Registra en activity_log. */
  const deleteDocument = async (id: string, category: string, user?: User | null, fileName?: string, source?: string) => {
    try {
      const pid = projectContext?.id || 'patio-sur-oe1035';
      let resp;
      
      if (source === 'blob') {
        // Eliminar del nuevo sistema project_files
        const fileId = id.startsWith('pf_') ? id.replace('pf_', '') : id;
        resp = await fetch(`/api/v1/projects/${pid}/files/${fileId}`, {
          method: 'DELETE'
        });
      } else {
        // Eliminar del sistema v2
        const backendCat = CATEGORIES_MAP[category] || 'varios';
        resp = await fetch(`/api/v1/documents/${backendCat}/${id}?project_id=${pid}`, {
          method: 'DELETE'
        });
      }

      if (resp.ok) {
        if (user) {
          const projectInfo = projectContext?.name ? ` (Proyecto: ${projectContext.name})` : '';
          const docName = fileName || id;
          logEdit(user, 'Documentos', `Eliminó "${docName}" de categoría "${category}"${projectInfo}`);
        }
        await fetchAll();
        return true;
      }
    } catch (err) {
      console.error("Delete error:", err);
    }
    return false;
  };

  /** Registra una descarga en activity_log. */
  const logDownload = (doc: DocumentItem, user?: User | null) => {
    if (!user) return;
    const projectInfo = projectContext?.name ? ` (Proyecto: ${projectContext.name})` : '';
    logEdit(user, 'Documentos', `Descargó "${doc.name}" de categoría "${doc.category}"${projectInfo}`);
  };

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { documents, categories, addDocument, deleteDocument, logDownload, loading, refresh: fetchAll };
}
