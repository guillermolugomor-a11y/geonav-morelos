import React, { useState, useEffect } from 'react';
import { UsuarioPerfil, Tarea } from '../types';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { User, Mail, Shield, Save, CheckCircle, AlertCircle, Loader2, MapPin, CheckSquare, Clock, LogOut } from 'lucide-react';
import { motion } from 'motion/react';

interface UserProfileProps {
  perfil: UsuarioPerfil;
  onProfileUpdate: (updatedPerfil: UsuarioPerfil) => void;
  onLogout: () => void;
  onNavigateToMap?: (poligonoId: number) => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ perfil, onProfileUpdate, onLogout, onNavigateToMap }) => {
  const [nombre, setNombre] = useState(perfil.nombre);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Estadísticas de tareas
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const userTasks = await taskService.getTareas(perfil.id);
        setTareas(userTasks);
      } catch (error) {
        console.error('Error cargando estadísticas:', error);
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [perfil.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setMessage({ type: 'error', text: 'El nombre no puede estar vacío.' });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updated = await userService.updatePerfil(perfil.id, { nombre: nombre.trim() });
      if (updated) {
        onProfileUpdate(updated);
        setMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
      }
    } catch (error: any) {
      setMessage({
        type: 'error',
        text: error.message?.includes('RLS')
          ? 'Error de permisos (RLS). Asegúrate de que las políticas de Supabase permitan a los usuarios hacer UPDATE en su propio registro de usuarios_perfil.'
          : `Error al actualizar: ${error.message}`
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const tareasPendientes = tareas.filter(t => t.status === 'pendiente' || t.status === 'en_progreso').length;
  const tareasCompletadas = tareas.filter(t => t.status === 'completada').length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 p-4 md:p-8 overflow-y-auto bg-stone-50"
    >
      <div className="max-w-3xl mx-auto space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Mi Perfil</h1>
          <p className="text-stone-500 mt-1">Gestiona tu información personal y revisa tus estadísticas.</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl flex items-start gap-3 ${message.type === 'success' ? 'bg-stone-50 text-[#8C3154] border border-[#8C3154]/20' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
            <p className="text-sm font-medium">{message.text}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Formulario de Perfil */}
          <div className="md:col-span-2 bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50">
              <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
                <User className="w-5 h-5 text-[#8C3154]" />
                Información Personal
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-3 text-stone-800 font-medium focus:ring-2 focus:ring-[#8C3154] focus:border-[#8C3154] transition-all outline-none"
                  placeholder="Tu nombre"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5" /> Correo Electrónico
                  </label>
                  <div className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-stone-500 font-medium cursor-not-allowed">
                    {perfil.email || 'No registrado'}
                  </div>
                  <p className="text-[10px] text-stone-400">El correo no se puede modificar.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" /> Rol en el Sistema
                  </label>
                  <div className="w-full bg-stone-100 border border-stone-200 rounded-xl px-4 py-3 text-stone-500 font-medium cursor-not-allowed uppercase">
                    {perfil.rol === 'admin' ? 'Administrador' : 'Trabajador de Campo'}
                  </div>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting || nombre === perfil.nombre}
                  className="bg-[#8C3154] hover:bg-[#7a2a49] disabled:bg-stone-300 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>

          {/* Estadísticas */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#8C3154]" />
                Resumen de Trabajo
              </h3>
              
              {loadingStats ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-stone-300" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-stone-100 p-2 rounded-lg text-[#8C3154]">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-stone-400">Total Asignado</p>
                        <p className="text-lg font-bold text-stone-800 leading-none">{tareas.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-200/50 p-2 rounded-lg text-amber-700">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#BC9B73]">Pendientes</p>
                        <p className="text-lg font-bold text-[#BC9B73] leading-none">{tareasPendientes}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#8C3154]/10 p-2 rounded-lg text-[#8C3154]">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-[10px] uppercase font-bold text-[#8C3154]">Completadas</p>
                        <p className="text-lg font-bold text-[#8C3154] leading-none"> {tareasCompletadas}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Acciones Adicionales */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-200 p-6">
              <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-stone-400" />
                Seguridad y Cuenta
              </h3>
              <p className="text-xs text-stone-500 mb-6 leading-relaxed">
                Asegúrate de haber guardado tus cambios antes de salir del sistema.
              </p>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 border border-red-100 rounded-xl text-sm font-bold transition-all active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
