import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Edit2, Eye, Loader2, X, Clock, User, ChevronRight, Send, Map as MapIcon } from 'lucide-react';
import { Poligono, Tarea, TareaHistorial, UsuarioPerfil } from '../../types';
import { taskService } from '../../services/taskService';
import { TaskLocationLabel } from '../tasks/TaskLocationLabel';
import { useNotifications } from '../notifications/NotificationContext';

interface TaskModalsProps {
  perfil: UsuarioPerfil | null;
  usuarios: UsuarioPerfil[];
  poligonos: Poligono[];
  selectedTarea: Tarea | null;
  isViewModalOpen: boolean;
  isEditModalOpen: boolean;
  isDeleteModalOpen: boolean;
  editForm: Partial<Tarea>;
  setEditForm: React.Dispatch<React.SetStateAction<Partial<Tarea>>>;
  submitting: boolean;
  onCloseView: () => void;
  onCloseEdit: () => void;
  onCloseDelete: () => void;
  onSubmitEdit: (e: React.FormEvent) => void;
  onConfirmDelete: () => void;
  onRefresh?: () => void;
  onNavigateToMap?: (polygonId: number) => void;
}
export const TaskModals: React.FC<TaskModalsProps> = ({
  perfil,
  usuarios,
  poligonos,
  selectedTarea,
  isViewModalOpen,
  isEditModalOpen,
  isDeleteModalOpen,
  editForm,
  setEditForm,
  submitting,
  onCloseView,
  onCloseEdit,
  onCloseDelete,
  onSubmitEdit,
  onConfirmDelete,
  onRefresh,
  onNavigateToMap
}) => {
  const { markTaskNotificationsAsRead } = useNotifications();
  const [historial, setHistorial] = React.useState<TareaHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = React.useState(false);
  const [adminUpdate, setAdminUpdate] = React.useState('');
  const [savingUpdate, setSavingUpdate] = React.useState(false);

  const loadHistorial = React.useCallback(async () => {
    if (!selectedTarea) return;
    setLoadingHistorial(true);
    try {
      const history = await taskService.getTareaHistorial(selectedTarea.id);
      setHistorial(history);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  }, [selectedTarea]);

  React.useEffect(() => {
    if (isViewModalOpen && selectedTarea) {
      loadHistorial();
      // Marcamos como leídas las notificaciones de esta tarea
      markTaskNotificationsAsRead(selectedTarea.id);
    } else {
      setHistorial([]);
      setAdminUpdate('');
    }
  }, [isViewModalOpen, selectedTarea, loadHistorial, markTaskNotificationsAsRead]);

  const handleAdminUpdate = async () => {
    if (!selectedTarea || !adminUpdate.trim() || !perfil) return;

    setSavingUpdate(true);
    try {
      const success = await taskService.updateTareaStatus(
        selectedTarea.id,
        selectedTarea.status,
        adminUpdate.trim(),
        perfil.id
      );

      if (success) {
        // Recargamos el historial para ver el nuevo registro
        loadHistorial();
        setAdminUpdate('');
        onRefresh?.();
      } else {
        alert('Error al agregar el seguimiento');
      }
    } catch (err) {
      console.error('Error in handleAdminUpdate:', err);
    } finally {
      setSavingUpdate(false);
    }
  };

  const selectedPoligono = selectedTarea ? poligonos.find((p) => p.id === selectedTarea.polygon_id) : null;
  const selectedUsuario = selectedTarea ? usuarios.find((u) => u.id === selectedTarea.user_id) : null;

  const formatDateTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("es-MX", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  return (
    <AnimatePresence>
      {isViewModalOpen && selectedTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#2E3B2B]" />
                Detalles de la Tarea
              </h3>
              <button onClick={onCloseView} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar min-h-[400px]">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Usuario</span>
                  <p className="text-sm font-semibold text-slate-900">{selectedUsuario?.nombre}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Sección / Manzana</span>
                  <button
                    onClick={() => {
                      if (selectedTarea && onNavigateToMap) {
                        onNavigateToMap(selectedTarea.polygon_id);
                        onCloseView();
                      }
                    }}
                    className="flex items-center gap-1.5 text-sm font-semibold text-[#8C3154] hover:text-[#7a2a49] transition-colors group/loc-m"
                    title="Ver en mapa"
                  >
                    <TaskLocationLabel task={selectedTarea} poligono={selectedPoligono} />
                    <MapIcon className="w-3.5 h-3.5 opacity-0 group-hover/loc-m:opacity-100 transition-opacity" />
                  </button>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Estado</span>
                  <div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTarea.status === 'completada'
                          ? 'bg-[#8C3154]/10 text-[#8C3154]'
                          : selectedTarea.status === 'en_progreso'
                            ? 'bg-[#BC9B73]/10 text-[#BC9B73]'
                            : selectedTarea.status === 'programada'
                              ? 'bg-indigo-100 text-indigo-600'
                              : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {selectedTarea.status === 'programada' ? '\u23f0 Programada' : selectedTarea.status}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Asignado el</span>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedTarea.created_at
                      ? new Date(selectedTarea.created_at).toLocaleString('es-MX', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'Fecha pendiente'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Instrucciones</span>
                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">{selectedTarea.instruccion}</p>
              </div>

              {/* BLOQUE ADMIN: Detalles de Programación - solo visible para admins */}
              {perfil?.rol === 'admin' && selectedTarea.scheduled_at && (
                <div className="space-y-3 p-4 rounded-xl border border-indigo-200 bg-indigo-50">
                  <span className="text-[10px] uppercase font-bold text-indigo-700 tracking-wider flex items-center gap-1.5">
                    ⏰ Programación Automática
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-500 font-semibold uppercase">Fecha de Activación</span>
                      <p className="text-sm font-bold text-indigo-800">
                        {new Date(selectedTarea.scheduled_at).toLocaleString('es-MX', {
                          timeZone: 'America/Mexico_City',
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-500 font-semibold uppercase">Activación Auto</span>
                      <p className={`text-sm font-bold ${selectedTarea.auto_activate ? 'text-green-700' : 'text-slate-500'}`}>
                        {selectedTarea.auto_activate ? '✅ Activada' : '❌ Manual'}
                      </p>
                    </div>
                  </div>
                  {selectedTarea.status === 'programada' && (() => {
                    const now = new Date();
                    const activacion = new Date(selectedTarea.scheduled_at!);
                    const diffMs = activacion.getTime() - now.getTime();
                    const diffH = Math.floor(diffMs / 3600000);
                    const diffM = Math.floor((diffMs % 3600000) / 60000);
                    const vencio = diffMs < 0;
                    return (
                      <div className={`text-xs font-semibold px-3 py-2 rounded-lg ${vencio ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                        {vencio
                          ? '⚠️ Esta tarea debería haberse activado ya. Verifica el cron job.'
                          : `⏳ Se activará en ${diffH > 0 ? `${diffH}h ` : ''}${diffM}min`}
                      </div>
                    );
                  })()}
                </div>
              )}
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60 flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5" />
                  Historial de Avances
                </span>
                
                {loadingHistorial ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                  </div>
                ) : historial.length === 0 ? (
                  <p className="text-xs text-slate-400 italic bg-slate-50 p-4 rounded-xl border border-dashed border-slate-200 text-center">
                    No hay registros de seguimiento para esta tarea.
                  </p>
                ) : (
                  <div className="space-y-4 pr-2">
                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-slate-100">
                      {historial
                        .filter(item => !(perfil?.rol !== 'admin' && item.tipo === 'sistema' && (item.mensaje.toLowerCase().includes('scheduler') || item.mensaje.toLowerCase().includes('activada'))))
                        .map((item) => {
                        const autor = usuarios.find(u => u.id === item.user_id);
                        return (
                          <div key={item.id} className="relative pl-8">
                            <div className={`absolute left-1 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                              item.tipo === 'cambio_estado' ? 'bg-[#BC9B73]' : 'bg-[#8C3154]'
                            }`}>
                              {item.tipo === 'cambio_estado' ? <ChevronRight className="w-2.5 h-2.5 text-white" /> : <div className="w-1 h-1 bg-white rounded-full" />}
                            </div>
                            <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-[9px] font-bold text-slate-700 uppercase flex items-center gap-1">
                                  <User className="w-2.5 h-2.5" />
                                  {item.tipo === 'sistema' ? 'SISTEMA' : (item.perfil?.nombre || autor?.nombre || 'USUARIO DESCONOCIDO')}
                                </span>
                                <span className="text-[9px] text-slate-400 font-medium">
                                  {formatDateTime(item.created_at)}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {item.mensaje}
                              </p>
                              {item.estado_snapshot && (
                                <div className="mt-2 text-[8px] font-bold text-slate-400 uppercase tracking-tighter">
                                  Estado: <span className="text-[#BC9B73]">{item.estado_snapshot}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Input de Seguimiento para Admin */}
              <div className="space-y-3 pt-4 border-t border-slate-100 italic bg-stone-50 p-4 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-[#8C3154] tracking-wider">Responder / Agregar Seguimiento</span>
                <textarea
                  value={adminUpdate}
                  onChange={(e) => setAdminUpdate(e.target.value)}
                  placeholder="Escribe una respuesta o instrucción adicional..."
                  className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8C3154]/20 focus:border-[#8C3154] transition-all resize-none h-20"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAdminUpdate}
                    disabled={savingUpdate || !adminUpdate.trim()}
                    className="px-4 py-2 bg-[#8C3154] text-white text-xs font-bold rounded-lg hover:bg-[#7a2a49] transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingUpdate ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                    Enviar Seguimiento
                  </button>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50 flex justify-end">
              <button
                onClick={onCloseView}
                className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isEditModalOpen && selectedTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-[#BC9B73]" />
                Editar Tarea
              </h3>
              <button onClick={onCloseEdit} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={onSubmitEdit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Instrucciones</label>
                  <textarea
                    value={editForm.instruccion}
                    onChange={(e) => setEditForm((current) => ({ ...current, instruccion: e.target.value }))}
                    className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] outline-none transition-all min-h-[100px]"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((current) => ({ ...current, status: e.target.value as Tarea['status'] }))}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] outline-none transition-all"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Vencimiento</label>
                    <input
                      type="date"
                      value={editForm.fecha_limite?.split('T')[0] || ''}
                      onChange={(e) => setEditForm((current) => ({ ...current, fecha_limite: e.target.value }))}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] outline-none transition-all"
                    />
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="px-6 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-100 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2 bg-[#8C3154] text-white font-semibold rounded-xl hover:bg-[#7a2a49] transition-all disabled:opacity-50"
                >
                  {submitting ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isDeleteModalOpen && selectedTarea && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-[#7C4A36]/10 text-[#7C4A36] rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Tarea?</h3>
              <p className="text-slate-500 mb-6">
                Esta acción no se puede deshacer. Se eliminará la asignación para el usuario
                <span className="font-semibold text-slate-700"> {selectedUsuario?.nombre}</span>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={onCloseDelete}
                  className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirmDelete}
                  disabled={submitting}
                  className="flex-1 px-6 py-3 bg-[#7C4A36] text-white font-semibold rounded-xl hover:bg-[#633a2a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Eliminar'}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
