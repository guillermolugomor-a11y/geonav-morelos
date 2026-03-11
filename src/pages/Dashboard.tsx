import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { MapView } from '../components/MapView';
import { AdminPanel } from '../components/AdminPanel';
import { UserProfile } from '../components/UserProfile';
import { UserTasks } from '../components/UserTasks';
import { UsuarioPerfil, Poligono, Tarea } from '../types';
import { poligonosService } from '../services/poligonosService';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { motion, AnimatePresence } from 'motion/react';
import { X, MapPin, Layers, Database, LayoutDashboard, Map as MapIcon, ClipboardList, Send } from 'lucide-react';

interface DashboardProps {
  perfil: UsuarioPerfil | null;
  user: any;
  onLogout: () => void;
  onProfileUpdate: (updatedPerfil: UsuarioPerfil) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ perfil, user, onLogout, onProfileUpdate }) => {
  const [selectedPoligono, setSelectedPoligono] = useState<Poligono | null>(null);
  const [activeTask, setActiveTask] = useState<Tarea | null>(null);
  const [loadingTask, setLoadingTask] = useState(false);
  const [taskComments, setTaskComments] = useState('');
  const [updatingTask, setUpdatingTask] = useState(false);

  // Admin assignment state
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [assigningUser, setAssigningUser] = useState('');
  const [assigningInstruction, setAssigningInstruction] = useState('');
  const [assigningDate, setAssigningDate] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'map' | 'admin_gestion' | 'admin_monitor' | 'profile' | 'tasks'>('map');
  const [pendingFocusPolygonId, setPendingFocusPolygonId] = useState<number | null>(null);

  // ⚠️ DEUDA TÉCNICA: Los correos de administrador están hardcodeados en el frontend.
  // Esto debe migrarse a una validación basada en el rol de la base de datos (perfil.rol === 'admin')
  // o preferiblemente usando Custom JWT Claims en Supabase.
  const adminEmails = [
    'guillermo.lugo.mor@gmail.com',
    'guillermo.lugo@morelos.gob.mx',
    'daniel.sotelo@morelos.gob.mx'
  ];
  const isAdmin = perfil?.rol === 'admin' ||
    (perfil?.email && adminEmails.includes(perfil.email)) ||
    (user?.email && adminEmails.includes(user.email));

  useEffect(() => {
    if (isAdmin) {
      userService.getAssignableUsers().then(setUsuarios).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    const fetchTask = async () => {
      if (selectedPoligono && user) {
        setLoadingTask(true);
        setActiveTask(null);
        try {
          const tasks = await taskService.getTareasByPoligono(
            selectedPoligono.id,
            isAdmin ? undefined : user.id
          );
          if (tasks.length > 0) {
            setActiveTask(tasks[0]);
            setTaskComments(tasks[0].comentarios_usuario || '');
          }
        } catch (error) {
          console.error(error);
        } finally {
          setLoadingTask(false);
        }
      } else {
        setActiveTask(null);
      }
    };
    fetchTask();
  }, [selectedPoligono, isAdmin, user]);

  const handleUpdateTaskStatus = async (taskId: string, newStatus: 'pendiente' | 'en_progreso' | 'completada') => {
    setUpdatingTask(true);
    try {
      const { error } = await taskService.updateTarea(taskId, { status: newStatus });
      if (!error) {
        setActiveTask(prev => prev ? { ...prev, status: newStatus } : null);
        window.dispatchEvent(new CustomEvent('refresh-map-tasks'));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleSaveComments = async (taskId: string) => {
    setUpdatingTask(true);
    try {
      const { error } = await taskService.updateTarea(taskId, { comentarios_usuario: taskComments });
      if (!error) {
        setActiveTask(prev => prev ? { ...prev, comentarios_usuario: taskComments } : null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTask(false);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPoligono || !assigningUser || !assigningInstruction) return;

    setIsAssigning(true);
    try {
      let tipoCapa = 'secciones';
      if (selectedPoligono.tipo === 'Manzana' || selectedPoligono.tipo === 'Manzana Completa') {
        tipoCapa = 'manzanas';
      } else if (selectedPoligono.tipo === 'Localidad') {
        tipoCapa = 'localidades';
      }

      const { data, error } = await taskService.asignarTarea({
        polygon_id: selectedPoligono.id,
        user_id: assigningUser,
        instruccion: assigningInstruction,
        tipo_capa: tipoCapa,
        status: 'pendiente',
        fecha_limite: assigningDate || undefined
      });

      if (!error && data) {
        setActiveTask(data);
        setAssigningUser('');
        setAssigningInstruction('');
        setAssigningDate('');
        window.dispatchEvent(new CustomEvent('refresh-map-tasks'));
      } else if (error) {
        console.error('Error al asignar tarea:', error);
        alert(`Error al asignar tarea: ${error.message || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsAssigning(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        const event = new CustomEvent('search-section', { detail: searchTerm });
        window.dispatchEvent(event);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      <Navbar perfil={perfil} user={user} onLogout={onLogout} currentView={view} onViewChange={setView} />

      <main className="flex-1 relative flex overflow-hidden">
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative flex h-full"
            >
              {/* Search Bar Overlay */}
              <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 items-end">
                <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-stone-200 flex items-center gap-2 w-64">
                  <div className="bg-stone-100 p-2 rounded-xl">
                    <Database size={18} className="text-[#8C3154]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Ej: 188 o 188-5"
                    className="bg-transparent border-none outline-none text-sm font-medium text-stone-800 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('reset-zoom'))}
                    className="bg-white hover:bg-stone-50 text-stone-700 p-3 rounded-full shadow-lg border border-stone-200 transition-all active:scale-95 flex items-center gap-2"
                    title="Restablecer vista"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6" /><path d="M9 21H3v-6" /><path d="M21 3l-7 7" /><path d="M3 21l7-7" /></svg>
                  </button>
                  <button
                    onClick={() => window.dispatchEvent(new CustomEvent('locate-user'))}
                    className="bg-[#8C3154] hover:bg-[#7a2a49] text-white p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2"
                    title="Mi ubicación"
                  >
                    <MapPin size={20} />
                    <span className="text-xs font-bold pr-1">Mi Ubicación</span>
                  </button>
                </div>
              </div>

              {/* Debug Info (Solo visible en desarrollo o para admins) */}
              <div className="absolute bottom-4 left-4 z-50 opacity-10 hover:opacity-100 transition-opacity">
                <div className="bg-black/80 text-white p-3 rounded-lg text-[10px] font-mono">
                  <p>User ID: {user?.id}</p>
                  <p>Profile ID: {perfil?.id}</p>
                  <p>Rol: {perfil?.rol}</p>
                </div>
              </div>

              {/* Sidebar for details - Desktop */}
              <AnimatePresence>
                {selectedPoligono && (
                  <motion.div
                    initial={{ x: -400 }}
                    animate={{ x: 0 }}
                    exit={{ x: -400 }}
                    className="absolute md:left-[340px] left-4 top-4 bottom-4 w-80 bg-white z-20 rounded-2xl shadow-2xl border border-stone-200 flex flex-col overflow-hidden"
                  >
                    <div className="p-5 bg-[#8C3154] text-white flex items-center justify-between">
                      <div>
                        <h2 className="font-bold text-lg leading-tight">{selectedPoligono.nombre}</h2>
                        <p className="text-stone-100 text-xs flex items-center gap-1 mt-1">
                          <MapPin size={12} /> {selectedPoligono.municipio}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedPoligono(null)}
                        className="p-1.5 hover:bg-[#5d634a] rounded-lg transition-colors"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                      <section>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-3 flex items-center gap-2">
                          <Layers size={12} /> Información General
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                            <p className="text-[10px] text-stone-400 uppercase font-bold">Tipo</p>
                            <p className="text-sm font-semibold text-stone-800">{selectedPoligono.tipo}</p>
                          </div>
                          <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                            <p className="text-[10px] text-stone-400 uppercase font-bold">ID</p>
                            <p className="text-sm font-semibold text-stone-800">#{selectedPoligono.id}</p>
                          </div>
                        </div>
                      </section>

                      <section>
                        <h3 className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mb-3 flex items-center gap-2">
                          <Database size={12} /> Datos Electorales
                        </h3>
                        <div className="space-y-2">
                          {selectedPoligono.metadata && (
                            <>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Sección</span>
                                <span className="text-xs font-bold text-[#8C3154]">{selectedPoligono.metadata.seccion}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Manzana</span>
                                <span className="text-xs font-bold text-[#BC9B73]">{selectedPoligono.metadata.manzana}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Localidad</span>
                                <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.localidad}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Distrito Federal</span>
                                <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.distrito_federal}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Distrito Local</span>
                                <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.distrito_local}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Entidad</span>
                                <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.entidad}</span>
                              </div>
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Control</span>
                                <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.control}</span>
                              </div>
                              {selectedPoligono.metadata.status !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                  <span className="text-xs text-stone-500">Status</span>
                                  <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.status}</span>
                                </div>
                              )}
                              {selectedPoligono.metadata.disperso && (
                                <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                  <span className="text-xs text-stone-500">Disperso</span>
                                  <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.disperso}</span>
                                </div>
                              )}
                              {selectedPoligono.metadata.caso_captu !== undefined && (
                                <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                  <span className="text-xs text-stone-500">Caso Captu</span>
                                  <span className="text-xs font-medium text-stone-800">{selectedPoligono.metadata.caso_captu}</span>
                                </div>
                              )}
                              <div className="flex justify-between items-center py-2 border-b border-stone-100">
                                <span className="text-xs text-stone-500">Promotor Asignado</span>
                                <span className="text-xs font-bold text-[#8C3154]">
                                  {loadingTask ? (
                                    <span className="text-stone-400">Cargando...</span>
                                  ) : activeTask ? (
                                    isAdmin
                                      ? usuarios.find(u => u.id === activeTask.user_id)?.nombre || 'Usuario Desconocido'
                                      : perfil?.nombre || 'Mi Usuario'
                                  ) : (
                                    selectedPoligono.metadata.promotor || 'Sin asignar'
                                  )}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </section>

                      {loadingTask ? (
                        <div className="flex justify-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8C3154]"></div>
                        </div>
                      ) : activeTask ? (
                        <section className="mt-6 border-t border-stone-100 pt-6">
                          <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#BC9B73] mb-3 flex items-center gap-2">
                            <ClipboardList size={12} /> Gestión de Tarea
                          </h3>
                          <div className="bg-[#BC9B73]/5 p-4 rounded-xl border border-[#BC9B73]/20 space-y-4">
                            <div>
                              <p className="text-[10px] text-[#BC9B73] uppercase font-bold mb-1">Instrucciones</p>
                              <p className="text-sm text-stone-700">{activeTask.instruccion}</p>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#BC9B73] uppercase font-bold mb-1">Estado</p>
                              <select
                                value={activeTask.status}
                                onChange={(e) => handleUpdateTaskStatus(activeTask.id, e.target.value as any)}
                                disabled={updatingTask || (isAdmin && activeTask.user_id !== user.id)}
                                className="w-full bg-white border border-[#BC9B73]/20 rounded-lg px-3 py-2 text-sm font-medium text-stone-800 focus:ring-2 focus:ring-[#BC9B73] outline-none disabled:bg-stone-100 disabled:text-stone-500"
                              >
                                <option value="pendiente">Pendiente</option>
                                <option value="en_progreso">En Progreso</option>
                                <option value="completada">Completada</option>
                              </select>
                            </div>

                            <div>
                              <p className="text-[10px] text-[#BC9B73] uppercase font-bold mb-1">Mis Comentarios</p>
                              <textarea
                                value={taskComments}
                                onChange={(e) => setTaskComments(e.target.value)}
                                disabled={updatingTask || (isAdmin && activeTask.user_id !== user.id)}
                                placeholder="Agrega notas sobre tu avance..."
                                className="w-full bg-white border border-[#BC9B73]/20 rounded-lg px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-[#BC9B73] outline-none min-h-[80px] resize-none disabled:bg-stone-100 disabled:text-stone-500"
                              />
                              {(!isAdmin || activeTask.user_id === user.id) && (
                                <button
                                  onClick={() => handleSaveComments(activeTask.id)}
                                  disabled={updatingTask || taskComments === activeTask.comentarios_usuario}
                                  className="mt-2 w-full bg-[#BC9B73] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#a68965] disabled:bg-[#d9c8b3] transition-colors"
                                >
                                  Guardar Comentarios
                                </button>
                              )}
                            </div>
                          </div>
                        </section>
                      ) : (
                        <section className="mt-6 border-t border-stone-100 pt-6">
                          {isAdmin ? (
                            <div>
                              <h3 className="text-[10px] uppercase tracking-widest font-bold text-[#8C3154] mb-3 flex items-center gap-2">
                                <Send size={12} /> Asignar Tarea
                              </h3>
                              <form onSubmit={handleAssignTask} className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-4">
                                <div>
                                  <label className="block text-[10px] text-stone-500 uppercase font-bold mb-1">Usuario</label>
                                  <select
                                    required
                                    value={assigningUser}
                                    onChange={(e) => setAssigningUser(e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-[#8C3154] outline-none"
                                  >
                                    <option value="">Selecciona un usuario...</option>
                                    {usuarios.map(u => (
                                      <option key={u.id} value={u.id}>{u.nombre} ({u.email || 'Sin email'})</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-[10px] text-stone-500 uppercase font-bold mb-1">Instrucciones</label>
                                  <textarea
                                    required
                                    value={assigningInstruction}
                                    onChange={(e) => setAssigningInstruction(e.target.value)}
                                    placeholder="Describe la tarea a realizar..."
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-[#8C3154] outline-none min-h-[80px] resize-none"
                                  />
                                </div>

                                <div>
                                  <label className="block text-[10px] text-stone-500 uppercase font-bold mb-1">Fecha Límite (Opcional)</label>
                                  <input
                                    type="date"
                                    value={assigningDate}
                                    onChange={(e) => setAssigningDate(e.target.value)}
                                    className="w-full bg-white border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-800 focus:ring-2 focus:ring-[#8C3154] outline-none"
                                  />
                                </div>

                                <button
                                  type="submit"
                                  disabled={isAssigning || !assigningUser || !assigningInstruction}
                                  className="w-full bg-[#8C3154] text-white py-2 rounded-lg text-xs font-bold hover:bg-[#7a2a49] disabled:bg-[#aab09d] transition-colors flex items-center justify-center gap-2"
                                >
                                  {isAssigning ? (
                                    <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : <Send className="w-4 h-4" />}
                                  Asignar Tarea
                                </button>
                              </form>
                            </div>
                          ) : (
                            <div className="bg-stone-50 p-6 rounded-xl border border-stone-200 text-center">
                              <ClipboardList className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                              <p className="text-sm font-bold text-stone-600">Sin tarea asignada</p>
                              <p className="text-xs text-stone-500 mt-1">
                                No tienes ninguna tarea asignada en este polígono. Las tareas asignadas aparecerán en color rojo en el mapa.
                              </p>
                            </div>
                          )}
                        </section>
                      )}
                    </div>

                    <div className="p-4 bg-stone-50 border-t border-stone-100">
                      <button className="w-full bg-stone-900 text-white py-2.5 rounded-xl text-xs font-bold hover:bg-stone-800 transition-colors">
                        Generar Reporte de Zona
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Map Area */}
              <div className="flex-1 h-full">
                <MapView
                  onPoligonoSelect={setSelectedPoligono}
                  isAdmin={isAdmin}
                  userId={user?.id}
                  focusPolygonId={pendingFocusPolygonId}
                  onFocusHandled={() => setPendingFocusPolygonId(null)}
                />
              </div>
            </motion.div>
          ) : (view === 'admin_gestion' || view === 'admin_monitor') && isAdmin ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto">
                <AdminPanel
                  viewMode={view === 'admin_gestion' ? 'gestion' : 'monitor'}
                  onNavigateToMap={(poligonoId) => {
                    setPendingFocusPolygonId(poligonoId);
                    setView('map');
                  }}
                />
              </div>
            </motion.div>
          ) : view === 'profile' && perfil ? (
            <UserProfile
              key="profile-view"
              perfil={perfil}
              onProfileUpdate={onProfileUpdate}
              onNavigateToMap={(poligonoId) => {
                setPendingFocusPolygonId(poligonoId);
                setView('map');
              }}
            />
          ) : view === 'tasks' && perfil ? (
            <UserTasks
              key="tasks-view"
              perfil={perfil}
              onNavigateToMap={(poligonoId) => {
                setPendingFocusPolygonId(poligonoId);
                setView('map');
              }}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
