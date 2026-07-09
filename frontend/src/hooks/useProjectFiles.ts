import { useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';

export interface ProjectFile {
  id: number;
  nombre: string;
  tipo: string;
  tamano: number;
  fecha: string;
  categoria: string;
  subido_por: string;
}

export function useProjectFiles(projectId: string) {
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const fetchFiles = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/projects/${projectId}/files`);
      if (resp.ok) {
        const data = await resp.json();
        setFiles(data);
      }
    } catch (err) {
      console.error("Error fetching project files:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const uploadFile = async (file: File, categoria: string = 'general') => {
    if (!projectId) return false;
    
    // Validar tamaño 16MB
    if (file.size > 16 * 1024 * 1024) {
      alert("El archivo excede el límite de 16 MB");
      return false;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('categoria', categoria);

    try {
      const token = useAuthStore.getState().token;
      const url = `/api/v1/projects/${projectId}/files`;
      
      console.log(`[useProjectFiles] Intentando POST a: ${url}`);
      
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (resp.ok) {
        await fetchFiles();
        return true;
      } else {
        const errorData = await resp.json().catch(() => ({ detail: "Error desconocido" }));
        console.error("[useProjectFiles] Server Error:", resp.status, errorData);
        alert(`Error al subir archivo: ${errorData.detail || resp.statusText}`);
      }
    } catch (err) {
      console.error("[useProjectFiles] Network/Connection Error:", err);
      alert("Error de conexión al intentar subir el archivo. Verifica que el servidor backend esté corriendo en el puerto 8025.");
    }
    return false;
  };

  const deleteFile = async (fileId: number) => {
    if (!projectId) return false;
    try {
      const token = useAuthStore.getState().token;
      const resp = await fetch(`/api/v1/projects/${projectId}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (resp.ok) {
        await fetchFiles();
        return true;
      } else {
        const errorData = await resp.json().catch(() => ({ detail: "Error al eliminar" }));
        alert(`Error: ${errorData.detail}`);
      }
    } catch (err) {
      console.error("Error deleting file:", err);
      alert("Error de conexión al intentar eliminar el archivo.");
    }
    return false;
  };

  const getFileUrl = useCallback((fileId: number) => {
    return `/api/v1/projects/${projectId}/files/${fileId}`;
  }, [projectId]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  return { files, loading, uploadFile, deleteFile, getFileUrl, refresh: fetchFiles };
}
