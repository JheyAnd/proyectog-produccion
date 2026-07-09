import React, { useState, useRef } from 'react';
import { 
  User, 
  Mail, 
  Shield, 
  Camera, 
  Save, 
  KeyRound, 
  Check, 
  AlertCircle,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/components/common/Toast';
import { updateProfileAPI } from '@/services/api/auth';
import clsx from 'clsx';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);
  const showToast = useToastStore((s) => s.showToast);
  
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [passwords, setPasswords] = useState({ new: '', confirm: '' });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isDeletingImage, setIsDeletingImage] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ¿Hay imagen actualmente visible? (preview o guardada)
  const hasImage = !!(imagePreview || user?.profile_image);
  // Imagen que se muestra (preview local tiene prioridad)
  const displayImage = imagePreview || user?.profile_image || null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      showToast('Formato no válido. Use JPG, PNG o WEBP', 'error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('La imagen no debe superar los 5MB', 'error');
      return;
    }

    setSelectedFile(file);
    // Si había confirmación de eliminar pendiente, cancelarla
    setShowDeleteConfirm(false);
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  /** Cancela la previsualización local sin tocar la BD */
  const handleCancelPreview = () => {
    setImagePreview(null);
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /** Elimina la imagen de perfil en la BD y en el disco del servidor */
  const handleDeleteImage = async () => {
    // Si hay solo preview local (imagen no guardada todavía), limpiar sin llamar API
    if (imagePreview && !user?.profile_image) {
      handleCancelPreview();
      setShowDeleteConfirm(false);
      return;
    }

    setIsDeletingImage(true);
    try {
      const response = await fetch('/api/v1/auth/profile/image', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al eliminar la imagen');
      }

      // Limpiar estado local
      setImagePreview(null);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';

      // Actualizar el store global
      updateProfile({ profile_image: null });
      setShowDeleteConfirm(false);
      showToast('Foto de perfil eliminada correctamente', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar la imagen', 'error');
    } finally {
      setIsDeletingImage(false);
    }
  };

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      showToast('El nombre no puede estar vacío', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.append('full_name', fullName);
      if (selectedFile) {
        formData.append('image', selectedFile);
      }

      const response = await fetch('/api/v1/auth/profile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error al actualizar perfil');
      }

      const result = await response.json();
      updateProfile({
        full_name: result.full_name,
        profile_image: result.profile_image
      });
      
      showToast('Perfil actualizado correctamente', 'success');
      setSelectedFile(null);
      setImagePreview(null);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwords.new || !passwords.confirm) {
      showToast('Completa ambos campos', 'error');
      return;
    }

    if (passwords.new !== passwords.confirm) {
      showToast('Las contraseñas no coinciden', 'error');
      return;
    }

    if (passwords.new.length < 8) {
      showToast('La contraseña debe tener al menos 8 caracteres', 'error');
      return;
    }

    if (!/[A-Z]/.test(passwords.new) || !/\d/.test(passwords.new)) {
      showToast('La contraseña debe incluir al menos una mayúscula y un número', 'error');
      return;
    }

    setIsChangingPassword(true);
    try {
      await updateProfileAPI({
        password: passwords.new,
        confirm_password: passwords.confirm
      });

      showToast('Contraseña actualizada correctamente', 'success');
      setPasswords({ new: '', confirm: '' });
    } catch (err: any) {
      showToast(err.response?.data?.detail || err.message, 'error');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getPasswordStrength = () => {
    if (!passwords.new) return 0;
    let strength = 0;
    if (passwords.new.length >= 8) strength++;
    if (/[A-Z]/.test(passwords.new)) strength++;
    if (/\d/.test(passwords.new)) strength++;
    if (/[^A-Za-z0-9]/.test(passwords.new)) strength++;
    return strength;
  };

  const strength = getPasswordStrength();

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white dark:bg-steel-900 p-8 rounded-2xl border border-steel-200 dark:border-steel-800 shadow-sm">
        <div className="relative group">
          {/* Avatar */}
          <div className="h-32 w-32 rounded-full overflow-hidden border-4 border-primary-50 dark:border-primary-900/30 bg-steel-100 dark:bg-steel-800 flex items-center justify-center">
            {displayImage ? (
              <img 
                src={displayImage} 
                alt="Foto de perfil" 
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-4xl font-bold text-steel-400 dark:text-steel-600">
                {user?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2) || 'U'}
              </span>
            )}
          </div>

          {/* Botón cámara (subir imagen) */}
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-1 right-1 p-2 bg-primary-600 text-white rounded-full shadow-lg hover:bg-primary-700 transition transform group-hover:scale-110"
            title="Cambiar foto"
            type="button"
          >
            <Camera className="h-4 w-4" />
          </button>

          {/* Botón eliminar — visible solo si hay imagen */}
          {hasImage && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition transform group-hover:scale-110 opacity-0 group-hover:opacity-100"
              title="Eliminar foto"
              type="button"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageChange} 
            className="hidden" 
            accept="image/jpeg,image/png,image/webp"
          />
        </div>

        {/* Info usuario */}
        <div className="text-center md:text-left flex-1">
          <h2 className="text-2xl font-bold text-steel-900 dark:text-white">{user?.full_name}</h2>
          <p className="text-steel-500 dark:text-steel-400 flex items-center justify-center md:justify-start gap-2 mt-1">
            <Mail className="h-4 w-4" /> {user?.email}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-2 mt-3">
            <span className="px-3 py-1 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs font-bold rounded-full border border-primary-100 dark:border-primary-800 uppercase tracking-wider">
              {user?.role}
            </span>
          </div>

          {/* Hint cuando hay preview pendiente de guardar */}
          {imagePreview && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>Nueva imagen seleccionada — haz clic en <strong>Guardar Cambios</strong> para aplicarla.</span>
              <button
                type="button"
                onClick={handleCancelPreview}
                className="ml-1 underline hover:no-underline text-steel-500"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-steel-900 rounded-2xl shadow-2xl border border-steel-200 dark:border-steel-700 p-8 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="p-4 bg-red-100 dark:bg-red-900/30 rounded-full">
                <Trash2 className="h-8 w-8 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-steel-900 dark:text-white">Eliminar foto de perfil</h3>
                <p className="text-sm text-steel-500 dark:text-steel-400 mt-1">
                  Tu foto será eliminada permanentemente del sistema. Se reemplazará por tus iniciales.
                </p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeletingImage}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-steel-200 dark:border-steel-700 text-steel-700 dark:text-steel-300 font-semibold hover:bg-steel-50 dark:hover:bg-steel-800 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleDeleteImage}
                  disabled={isDeletingImage}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isDeletingImage
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Trash2 className="h-4 w-4" />
                  }
                  {isDeletingImage ? 'Eliminando…' : 'Sí, eliminar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* General Data Section */}
        <section className="bg-white dark:bg-steel-900 p-8 rounded-2xl border border-steel-200 dark:border-steel-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-bold text-steel-800 dark:text-white">Datos Personales</h3>
          </div>
          
          <form onSubmit={handleSaveGeneral} className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-2">
              <label className="text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider">Nombre Completo</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider">Correo Electrónico (Solo Lectura)</label>
              <div className="w-full px-4 py-3 rounded-xl border border-steel-100 dark:border-steel-800 bg-steel-100/50 dark:bg-steel-800/50 text-steel-400 cursor-not-allowed flex items-center gap-3">
                <Mail className="h-4 w-4" />
                {user?.email}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider">Rol (Solo Lectura)</label>
              <div className="w-full px-4 py-3 rounded-xl border border-steel-100 dark:border-steel-800 bg-steel-100/50 dark:bg-steel-800/50 text-steel-400 cursor-not-allowed flex items-center gap-3">
                <Shield className="h-4 w-4" />
                {user?.role}
              </div>
            </div>

            <div className="mt-auto pt-6">
              <button 
                type="submit"
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 bg-primary-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-primary-700 transition shadow-lg shadow-primary-600/20 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}
                Guardar Cambios
              </button>
            </div>
          </form>
        </section>

        {/* Password Section */}
        <section className="bg-white dark:bg-steel-900 p-8 rounded-2xl border border-steel-200 dark:border-steel-800 shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-6">
            <KeyRound className="h-5 w-5 text-primary-600" />
            <h3 className="text-lg font-bold text-steel-800 dark:text-white">Cambiar Contraseña</h3>
          </div>

          <form onSubmit={handleUpdatePassword} className="space-y-6 flex-1 flex flex-col">
            <div className="space-y-2">
              <label className="text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider">Nueva Contraseña</label>
              <input 
                type="password" 
                value={passwords.new}
                onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
                placeholder="********"
                className="w-full px-4 py-3 rounded-xl border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
              />
              
              {/* Strength Indicator */}
              <div className="flex gap-1 mt-2 px-1">
                {[1, 2, 3, 4].map((step) => (
                  <div 
                    key={step}
                    className={clsx(
                      "h-1 flex-1 rounded-full transition-colors",
                      strength >= step 
                        ? (strength <= 1 ? "bg-red-500" : strength <= 2 ? "bg-amber-500" : strength <= 3 ? "bg-emerald-400" : "bg-emerald-600")
                        : "bg-steel-200 dark:bg-steel-700"
                    )}
                  />
                ))}
              </div>
              <p className="text-[10px] text-steel-400 mt-1">
                Mínimo 8 caracteres, 1 mayúscula y 1 número.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-steel-500 dark:text-steel-400 uppercase tracking-wider">Confirmar Contraseña</label>
              <input 
                type="password" 
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                placeholder="********"
                className="w-full px-4 py-3 rounded-xl border border-steel-200 dark:border-steel-700 bg-steel-50 dark:bg-steel-800 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition outline-none"
              />
            </div>

            <div className="bg-primary-50 dark:bg-primary-900/20 p-4 rounded-xl border border-primary-100 dark:border-primary-900/30 flex gap-3">
              <AlertCircle className="h-5 w-5 text-primary-600 shrink-0 mt-0.5" />
              <p className="text-xs text-primary-800 dark:text-primary-300">
                Al actualizar la contraseña, tu sesión seguirá activa. Asegúrate de recordar la nueva contraseña para tu próximo ingreso.
              </p>
            </div>

            <div className="mt-auto pt-6">
              <button 
                type="submit"
                disabled={isChangingPassword || !passwords.new}
                className="w-full flex items-center justify-center gap-2 bg-steel-800 dark:bg-steel-700 text-white py-3 px-6 rounded-xl font-bold hover:bg-steel-900 dark:hover:bg-steel-600 transition disabled:opacity-50"
              >
                {isChangingPassword ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-5 w-5" />}
                Actualizar Contraseña
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
