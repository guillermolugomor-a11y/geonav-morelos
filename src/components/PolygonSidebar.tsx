import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, MapPin, Layers, Database, ClipboardList, Send, Clock, MessageSquare, ChevronRight, Globe, Navigation } from 'lucide-react';
import { Poligono } from '../types';
import { useTaskAssignment } from '../hooks/useTaskAssignment';
import { useNotifications } from './notifications/NotificationContext';
import { NotificationIndicator } from './notifications/NotificationIndicator';

import { useStore } from '../store/useStore';
import { isAdminUser } from '../constants/roles';

interface PolygonSidebarProps {
  poligono: Poligono;
  onClose: () => void;
}

export const PolygonSidebar: React.FC<PolygonSidebarProps> = ({
  poligono,
  onClose
}) => {
  const { user, perfil, usuarios } = useStore();
  const isAdmin = isAdminUser(perfil);
  const userId = user?.id;

  const { notifications, markTaskNotificationsAsRead } = useNotifications();

  const {
    activeTask,
    historial,
    loadingTask,
    loadingHistorial,
    updatingTask,
    assigningUser,
    setAssigningUser,
    assigningInstruction,
    setAssigningInstruction,
    assigningDate,
    setAssigningDate,
    assigningScheduledAt,
    setAssigningScheduledAt,
    assigningAutoActivate,
    setAssigningAutoActivate,
    isAssigning,
    fetchTask,
    updateTaskStatus,
    addUpdate,
    assignTask
  } = useTaskAssignment(poligono, () => {
    window.dispatchEvent(new CustomEvent('refresh-map-tasks'));
  });

  const [newUpdate, setNewUpdate] = React.useState('');

  const handleAddUpdate = async () => {
    if (!newUpdate.trim() || !perfil) return;
    const success = await addUpdate(newUpdate, perfil.id);
    if (success) {
      setNewUpdate('');
    }
  };

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  useEffect(() => {
    fetchTask(isAdmin, userId);
  }, [poligono, isAdmin, userId, fetchTask]);

  // Limpiar notificaciones cuando se ve la tarea activa en el sidebar
  useEffect(() => {
    if (activeTask && notifications.some(n => !n.leida && n.metadata?.tarea_id === activeTask.id)) {
      markTaskNotificationsAsRead(activeTask.id);
    }
  }, [activeTask, notifications, markTaskNotificationsAsRead]);

  return (
    <motion.div
      initial={{ x: -400 }}
      animate={{ x: 0 }}
      exit={{ x: -400 }}
      className="absolute md:left-[340px] left-4 top-4 bottom-4 w-80 bg-surface-container-lowest z-[900] rounded-2xl shadow-2xl border border-outline-variant/10 flex flex-col overflow-hidden"
    >
      <div className="p-5 premium-gradient text-white flex items-center justify-between">
        <div>
          <h2 className="font-bold text-lg leading-tight">{poligono.nombre}</h2>
          <p className="text-white/70 text-xs flex items-center gap-1 mt-1">
            <MapPin size={12} /> {poligono.municipio}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        <section>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-3 flex items-center gap-2">
            <Layers size={12} /> Información General
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
              <p className="text-[10px] text-on-surface-variant/50 uppercase font-bold">Tipo</p>
              <p className="text-sm font-semibold text-on-surface">{poligono.tipo === 'Sección Electoral' ? 'Sección' : poligono.tipo}</p>
            </div>
            <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
              <p className="text-[10px] text-on-surface-variant/50 uppercase font-bold">ID</p>
              <p className="text-sm font-semibold text-on-surface">#{poligono.id}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-3 flex items-center gap-2">
            <Database size={12} /> Datos Electorales
          </h3>
          <div className="space-y-2">
            {poligono.metadata && (
              <>
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Sección Electoral</span>
                  <span className="text-xs font-bold text-primary">{poligono.metadata.seccion}</span>
                </div>

                {poligono.metadata.padron && (
                  <>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                      <span className="text-xs text-on-surface-variant/60 font-bold uppercase tracking-tighter">Padrón Electoral</span>
                      <span className="text-sm font-black text-on-surface">{poligono.metadata.total?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                      <span className="text-xs text-blue-600 font-medium">Hombres</span>
                      <span className="text-xs font-bold text-blue-700">{poligono.metadata.hombres?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                      <span className="text-xs text-pink-600 font-medium">Mujeres</span>
                      <span className="text-xs font-bold text-pink-700">{poligono.metadata.mujeres?.toLocaleString()}</span>
                    </div>
                    {poligono.metadata.fecha_actualizacion && (
                      <div className="py-2 text-[10px] text-on-surface-variant/50 italic">
                        Actualización: {new Date(poligono.metadata.fecha_actualizacion).toLocaleDateString()}
                      </div>
                    )}
                  </>
                )}
                
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Supervisor de Campo</span>
                  <span className="text-xs font-bold text-primary">
                    {loadingTask ? (
                      <span className="text-on-surface-variant/50">Cargando...</span>
                    ) : activeTask ? (
                      isAdmin
                        ? usuarios.find(u => u.id === activeTask.user_id)?.nombre || 'Usuario Desconocido'
                        : perfil?.nombre || 'Mi Usuario'
                    ) : (
                      poligono.metadata.promotor || 'Sin asignar'
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Datos geográficos adicionales SOLO para manzanas */}
        {poligono.tipo?.includes('Manzana') && poligono.metadata?.isNearManzana && (
          <section>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant/50 mb-3 flex items-center gap-2">
              <Globe size={12} /> Datos Geográficos
            </h3>
            <div className="space-y-2">
              {poligono.metadata.manzana && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Manzana #</span>
                  <span className="text-xs font-bold text-on-surface">{poligono.metadata.manzana}</span>
                </div>
              )}
              {poligono.metadata.distrito_f && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Distrito Federal</span>
                  <span className="text-xs font-bold text-[#2563eb]">{poligono.metadata.distrito_f}</span>
                </div>
              )}
              {poligono.metadata.localidad !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Localidad</span>
                  <span className="text-xs font-bold text-on-surface">{poligono.metadata.localidad}</span>
                </div>
              )}
              {poligono.metadata.status !== undefined && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60">Tipo de Zona</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    poligono.metadata.status === 1 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {poligono.metadata.status === 1 ? 'Urbana' : 'Dispersa'}
                  </span>
                </div>
              )}
              {poligono.metadata.dist_m !== undefined && poligono.metadata.dist_m > 0 && (
                <div className="flex justify-between items-center py-2 border-b border-outline-variant/10">
                  <span className="text-xs text-on-surface-variant/60 flex items-center gap-1"><Navigation size={10}/> Dist. al centro</span>
                  <span className="text-xs font-bold text-on-surface">{poligono.metadata.dist_m.toLocaleString()} m</span>
                </div>
              )}
              {poligono.metadata.rank_near && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-xs text-on-surface-variant/60">Rango de cercanía</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    poligono.metadata.rank_near === 1 ? 'bg-red-100 text-red-700' :
                    poligono.metadata.rank_near === 2 ? 'bg-orange-100 text-orange-700' :
                    poligono.metadata.rank_near === 3 ? 'bg-amber-100 text-amber-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    #{poligono.metadata.rank_near} más cercana
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {loadingTask ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
          </div>
        ) : activeTask ? (
          <section className="mt-6 border-t border-outline-variant/10 pt-6">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-on-secondary-container mb-3 flex items-center gap-2">
              <ClipboardList size={12} /> Gestión de Tarea
            </h3>
            <div className="bg-secondary-container/5 p-4 rounded-xl border border-outline-variant/20 space-y-4">
              <div>
                <p className="text-[10px] text-on-secondary-container uppercase font-bold mb-1">Instrucciones</p>
                <p className="text-sm text-on-surface">{activeTask.instruccion}</p>
              </div>

              <div>
                <p className="text-[10px] text-on-secondary-container uppercase font-bold mb-1">Estado</p>
                <select
                  value={activeTask.status}
                  onChange={(e) => updateTaskStatus(activeTask.id, e.target.value as any, userId || perfil?.id)}
                  disabled={updatingTask || (isAdmin && activeTask.user_id !== userId)}
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm font-medium text-on-surface focus:ring-2 focus:ring-primary/20 outline-none disabled:bg-surface-container-low disabled:text-on-surface-variant/60"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Progreso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>

              <div className="pt-2 border-t border-outline-variant/20">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] text-on-secondary-container uppercase font-bold flex items-center gap-2">
                    <Clock size={12} /> Historial
                  </p>
                  <NotificationIndicator 
                    hasUnread={activeTask ? notifications.some(n => !n.leida && n.metadata?.tarea_id === activeTask.id) : false}
                    size="sm"
                    showText
                  />
                </div>
                
                <div className="space-y-3 max-h-[150px] overflow-y-auto mb-4 pr-1 custom-scrollbar">
                  {loadingHistorial ? (
                    <div className="flex justify-center py-2 text-on-surface-variant/50">
                      <Clock size={14} className="animate-spin" />
                    </div>
                  ) : historial.length === 0 ? (
                    <p className="text-[10px] text-on-surface-variant/50 italic">Sin avances registrados.</p>
                  ) : (
                    <div className="space-y-3 relative before:absolute before:inset-y-0 before:left-2 before:w-px before:bg-outline-variant/30">
                      {historial.map((item) => (
                        <div key={item.id} className="relative pl-6">
                           <div className={`absolute left-0.5 top-1 w-3 h-3 rounded-full border border-white shadow-sm flex items-center justify-center ${
                            item.tipo === 'cambio_estado' ? 'bg-secondary-container' : 'bg-primary'
                          }`}>
                            {item.tipo === 'cambio_estado' ? <ChevronRight size={8} className="text-white" /> : <div className="w-1 h-1 bg-white rounded-full" />}
                          </div>
                          <div className="bg-surface-container-lowest/80 rounded-xl p-2 border border-outline-variant/10">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase">
                                {item.user_id === perfil?.id ? 'Tú' : (item.perfil?.nombre || usuarios.find(u => u.id === item.user_id)?.nombre || 'Sistema')}
                              </span>
                              <span className="text-[8px] text-on-surface-variant/50">
                                {formatDateTime(item.created_at)}
                              </span>
                            </div>
                            <p className="text-[10px] text-on-surface-variant leading-tight">{item.mensaje}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-on-secondary-container uppercase font-bold mb-1 flex items-center gap-1">
                  <MessageSquare size={10} /> Nuevo Avance
                </p>
                <textarea
                  value={newUpdate}
                  onChange={(e) => setNewUpdate(e.target.value)}
                  disabled={updatingTask}
                  placeholder="Describe tu avance..."
                  className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-xs text-on-surface focus:ring-2 focus:ring-primary/20 outline-none min-h-[60px] resize-none disabled:bg-surface-container-low"
                />
                {(isAdmin || activeTask.user_id === userId) && (
                  <button
                    onClick={handleAddUpdate}
                    disabled={updatingTask || !newUpdate.trim()}
                    className="mt-2 w-full bg-on-secondary-container text-white py-2 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    Agregar Avance
                  </button>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 border-t border-outline-variant/10 pt-6">
            {isAdmin ? (
              <div>
                <h3 className="text-[10px] uppercase tracking-widest font-bold text-primary mb-3 flex items-center gap-2">
                  <Send size={12} /> Asignar Tarea
                </h3>
                <form onSubmit={(e) => assignTask(e, perfil?.id)} className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/20 space-y-4">
                  <div>
                    <label className="block text-[10px] text-on-surface-variant/60 uppercase font-bold mb-1">Usuario</label>
                    <select
                      required
                      value={assigningUser}
                      onChange={(e) => setAssigningUser(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    >
                      <option value="">Selecciona un usuario...</option>
                      {usuarios.map(u => (
                        <option key={u.id} value={u.id}>{u.nombre} ({u.email || 'Sin email'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] text-on-surface-variant/60 uppercase font-bold mb-1">Instrucciones</label>
                    <textarea
                      required
                      value={assigningInstruction}
                      onChange={(e) => setAssigningInstruction(e.target.value)}
                      placeholder="Describe la tarea a realizar..."
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none min-h-[80px] resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-on-surface-variant/60 uppercase font-bold mb-1">Fecha Límite (Opcional)</label>
                    <input
                      type="date"
                      value={assigningDate}
                      onChange={(e) => setAssigningDate(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                  </div>

                  {/* ── SCHEDULER: Programación Automática ── */}
                  <div className="pt-3 border-t border-outline-variant/10 space-y-3">
                    <label className="block text-[10px] text-primary uppercase font-bold">
                      ⏰ Programar Activación (Opcional)
                    </label>
                    <input
                      type="datetime-local"
                      value={assigningScheduledAt}
                      onChange={(e) => setAssigningScheduledAt(e.target.value)}
                      min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                      className="w-full bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-3 py-2 text-sm text-on-surface focus:ring-2 focus:ring-primary/20 outline-none"
                    />
                    {assigningScheduledAt && (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={assigningAutoActivate}
                            onChange={(e) => setAssigningAutoActivate(e.target.checked)}
                            className="w-3.5 h-3.5 accent-primary"
                          />
                          <span className="text-xs text-on-surface-variant">Activar automáticamente al llegar la hora</span>
                        </label>
                        <p className="text-[10px] text-primary bg-primary/5 rounded-lg px-2 py-1.5">
                          Estado al asignar: <strong>Programada</strong> → visible para el trabajador el{' '}
                          {new Date(assigningScheduledAt).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isAssigning || !assigningUser || !assigningInstruction}
                    className="w-full premium-gradient text-white py-2.5 rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2 civic-shadow"
                  >
                    {isAssigning ? (
                      <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : <Send className="w-4 h-4" />}
                    {assigningScheduledAt ? 'Programar Tarea' : 'Asignar Tarea'}
                  </button>
                </form>
              </div>
            ) : (
              <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/20 text-center">
                <ClipboardList className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-2" />
                <p className="text-sm font-bold text-on-surface-variant">Sin tarea asignada</p>
                <p className="text-xs text-on-surface-variant/60 mt-1">
                  No tienes ninguna tarea asignada en este polígono. Las tareas asignadas aparecerán en color rojo en el mapa.
                </p>
              </div>
            )}
          </section>
        )}
      </div>

      <div className="p-4 bg-surface-container-low border-t border-outline-variant/10">
        <button className="w-full bg-on-surface text-surface py-2.5 rounded-xl text-xs font-bold hover:opacity-90 transition-all">
          Generar Reporte de Zona
        </button>
      </div>
    </motion.div>
  );
};
