import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Loader2 } from 'lucide-react';
import apiClient from '../../services/api/client';

interface Props {
  children: React.ReactNode;
}

export default function SSOGuard({ children }: Props) {
  const { isAuthenticated, login } = useAuthStore();
  const [isValidating, setIsValidating] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) return;

    // Si tenemos un token residual guardado, intentamos usar ese primero
    const localToken = localStorage.getItem('pcm_access_token');
    
    if (localToken) {
      setIsValidating(true);
      apiClient.post('/auth/validate-token', { token: localToken })
        .then((response) => {
          login(response.data.access_token || localToken, response.data.user);
        })
        .catch((err) => {
          const status = err.response?.status;
          localStorage.removeItem('pcm_access_token'); // Limpiar token inválido
          if (status === 401 || status === 403) {
            // Token expirado o inválido: redirigir a Pandora para nuevo login
            window.location.href = 'https://pandora.pcmejia.com';
          } else {
            navigate('/404', { replace: true });
          }
        })
        .finally(() => setIsValidating(false));
      return;
    }

    // Protocolo Cerberus: Pedir token a la ventana padre (Pandora)
    if (window.opener) {
      setIsValidating(true);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'CERBERUS_SSO_TOKEN_DELIVERY') {
          window.removeEventListener('message', handleMessage);
          
          const ssoToken = event.data.token;
          if (ssoToken) {
            apiClient.post('/auth/validate-token', { token: ssoToken })
              .then((response) => {
                login(response.data.access_token || ssoToken, response.data.user);
                navigate(location.pathname, { replace: true });
              })
              .catch((err) => {
                console.error("Error validando token SSO de Pandora:", err);
                const status = err.response?.status;
                if (status === 401 || status === 403) {
                  window.location.href = 'https://pandora.pcmejia.com';
                } else {
                  navigate('/404', { replace: true });
                }
              })
              .finally(() => setIsValidating(false));
          } else {
            setHasFailed(true);
            setIsValidating(false);
          }
        }
      };

      window.addEventListener('message', handleMessage);
      
      // Enviar solicitud de token a Pandora
      window.opener.postMessage('CERBERUS_REQUEST_SSO_TOKEN', '*');

      // Timeout en caso de que Pandora no responda (ej. si la pestaña padre no es Pandora)
      const timeoutId = setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (!isAuthenticated) {
          setHasFailed(true);
          setIsValidating(false);
        }
      }, 3000);

      return () => {
        window.removeEventListener('message', handleMessage);
        clearTimeout(timeoutId);
      };
    } else {
      // No hay opener (fue abierto directamente en la barra de direcciones) y no hay token local
      setHasFailed(true);
    }
  }, [isAuthenticated, location, login, navigate]);

  if (isValidating) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-steel-50 dark:bg-steel-950">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-steel-800 dark:text-steel-200">
          Estableciendo enlace seguro con Pandora...
        </h2>
      </div>
    );
  }

  // Si falló el handshake de SSO o no hay credenciales, denegar acceso
  if (!isAuthenticated && hasFailed) {
    return <Navigate to="/403" replace />;
  }

  // Fallback (mientras se decide)
  if (!isAuthenticated) {
    return null; // Evitar renderizar contenido mientras decide
  }

  return <>{children}</>;
}
