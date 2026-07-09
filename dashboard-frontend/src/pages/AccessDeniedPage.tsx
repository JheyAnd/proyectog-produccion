import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen bg-steel-50 dark:bg-steel-950 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <div className="p-6 bg-red-100 dark:bg-red-900/30 rounded-full">
            <ShieldAlert className="w-20 h-20 text-red-600 dark:text-red-400" />
          </div>
        </div>
        
        <h1 className="text-6xl font-black text-steel-900 dark:text-white tracking-tight">
          403
        </h1>
        
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-steel-800 dark:text-steel-200">
            Acceso Denegado
          </h2>
          <p className="text-steel-600 dark:text-steel-400">
            Has iniciado sesión correctamente, pero no tienes los permisos necesarios para acceder a este módulo. 
            Es posible que tu cuenta esté desactivada o que no estés registrado en este proyecto.
          </p>
          <p className="text-sm font-semibold text-steel-500 mt-2">
            Contacta al administrador del sistema si crees que esto es un error.
          </p>
        </div>

        <div className="pt-8">
          <a
            href="https://pandora.pcmejia.com"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition shadow-lg shadow-primary-600/20"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a Pandora SSO
          </a>
        </div>
      </div>
    </div>
  );
}
