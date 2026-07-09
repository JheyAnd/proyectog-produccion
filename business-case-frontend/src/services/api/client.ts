import axios from 'axios';
import { useAuthStore } from '../../stores/authStore';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': 'true',
  },
});

// Adjuntar el JWT token desde el store en memoria (NO desde localStorage)
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token || localStorage.getItem('pcm_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de respuesta (opcional, por si quieres manejar otros errores globales)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("[BC] 401 Unauthorized interceptado. Detalles del error:", error.response?.data);
      // useAuthStore.getState().logout();
      // window.location.href = 'https://pandora.pcmejia.com';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
