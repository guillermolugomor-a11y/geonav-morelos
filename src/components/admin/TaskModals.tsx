import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertCircle, Edit2, Eye, Loader2, X, Clock, User, ChevronRight, Send, Map as MapIcon, MapPin } from 'lucide-react';
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
        <div className="fixed inset-0 z-[110] flex items-end md:items-center justify-center p-0 md:p-6 bg-on-surface/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="bg-surface rounded-t-[2.5rem] md:rounded-[2rem] shadow-[0_24px_60px_rgb(28,28,23,0.15)] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]"
          >
            <div className="p-8 border-b border-primary/5 flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-display font-bold text-primary flex items-center gap-3 tracking-tight">
                  <Eye className="w-6 h-6" />
                  Detalles de la Tarea
                </h3>
              </div>
              <button 
                onClick={onCloseView} 
                className="p-3 bg-surface-container-low hover:bg-white rounded-2xl transition-all shadow-sm"
              >
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            
            <div className="p-8 space-y-8 overflow-y-auto flex-1 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-stone-400 tracking-[0.2em]">Responsable</span>
                  <div className="flex items-center gap-3 bg-surface-container-low p-4 rounded-2xl">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">{selectedUsuario?.nombre}</p>
                      <p className="text-[10px] text-stone-400 font-medium">{selectedUsuario?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-black text-stone-400 tracking-[0.2em]">Ubicación</span>
                  <div className="bg-surface-container-low p-4 rounded-2xl h-full flex items-center">
                    <button
                      onClick={() => {
                        if (selectedTarea && onNavigateToMap) {
                          onNavigateToMap(selectedTarea.polygon_id);
                          onCloseView();
                        }
                      }}
                      className="flex items-center gap-3 text-sm font-bold text-primary hover:scale-[1.02] transition-transform text-left"
                    >
                      <div className="p-2 bg-white rounded-lg shadow-sm">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <TaskLocationLabel task={selectedTarea} poligono={selectedPoligono} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <span className="text-[10px] uppercase font-black text-stone-400 tracking-[0.2em]">Instrucciones</span>
                <div className="bg-white p-6 rounded-[2rem] border border-stone-100 shadow-sm">
                  <p className="text-base text-stone-600 font-medium italic leading-relaxed">"{selectedTarea.instruccion}"</p>
                </div>
              </div>

              {/* BLOQUE ADMIN: Programación */}
              {perfil?.rol === 'admin' && selectedTarea.scheduled_at && (
                <div className="p-6 rounded-[2rem] border-2 border-dashed border-primary/10 bg-primary/5 space-y-4">
                  <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em] flex items-center gap-2">
                    <Clock className="w-4 h-4" /> Programación Automática
                  </span>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Activación</span>
                      <p className="text-sm font-bold text-primary mt-1">
                        {new Date(selectedTarea.scheduled_at).toLocaleString('es-MX', {
                          dateStyle: 'medium',
                          timeStyle: 'short'
                        })}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-primary/60 font-black uppercase tracking-widest">Modo</span>
                      <p className="text-sm font-bold text-primary mt-1">
                        {selectedTarea.auto_activate ? '✅ Automático' : '📍 Manual'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-6">
                <span className="text-[10px] uppercase font-black text-on-surface tracking-[0.2em] flex items-center gap-3">
                  <div className="w-8 h-px bg-stone-100" />
                  Historial de Avances
                  <div className="flex-1 h-px bg-stone-100" />
                </span>
                
                {loadingHistorial ? (
                  <div className="flex justify-center py-8">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
                  </div>
                ) : historial.length === 0 ? (
                  <div className="bg-surface-container-low p-8 rounded-3xl border border-dashed border-white text-center">
                    <p className="text-xs text-stone-400 italic font-medium">No hay registros de seguimiento.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {historial
                      .filter(item => !(perfil?.rol !== 'admin' && item.tipo === 'sistema' && (item.mensaje.toLowerCase().includes('scheduler') || item.mensaje.toLowerCase().includes('activada'))))
                      .map((item) => {
                      const autor = usuarios.find(u => u.id === item.user_id);
                      return (
                        <div key={item.id} className="relative pl-10 group">
                          <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${
                            item.tipo === 'cambio_estado' ? 'bg-[#BC9B73]' : 'bg-primary'
                          }`}>
                            <div className="w-1.5 h-1.5 bg-white rounded-full" />
                          </div>
                          <div className="absolute left-[11px] top-6 bottom-[-24px] w-0.5 bg-stone-100 group-last:hidden" />
                          
                          <div className="bg-white rounded-2xl p-5 shadow-sm border border-stone-100">
                            <div className="flex justify-between items-start mb-2">
                              <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                                {item.tipo === 'sistema' ? 'Sistema' : (item.perfil?.nombre || autor?.nombre || 'Desconocido')}
                              </span>
                              <span className="text-[10px] text-stone-300 font-bold">
                                {formatDateTime(item.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-stone-600 font-medium leading-relaxed">
                              {item.mensaje}
                            </p>
                            {item.estado_snapshot && (
                              <div className="mt-3">
                                <span className="inline-block px-2 py-1 bg-surface-container-low rounded-lg text-[9px] font-black text-primary uppercase tracking-widest">
                                  {item.estado_snapshot}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Input seguimiento Premium */}
              <div className="bg-surface-container-low p-6 rounded-[2rem] space-y-4">
                <span className="text-[10px] uppercase font-black text-primary tracking-[0.2em] px-2">Nuevo Seguimiento</span>
                <textarea
                  value={adminUpdate}
                  onChange={(e) => setAdminUpdate(e.target.value)}
                  placeholder="Instrucciones adicionales o respuesta..."
                  className="w-full px-5 py-4 bg-white rounded-2xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none transition-all shadow-sm min-h-[100px]"
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleAdminUpdate}
                    disabled={savingUpdate || !adminUpdate.trim()}
                    className="flex items-center gap-3 px-8 py-3 bg-primary text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                  >
                    {savingUpdate ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Registrar
                  </button>
                </div>
              </div>
            </div>
            
            <div className="p-8 bg-surface-container-low/30 md:flex md:justify-end">
              <button
                onClick={onCloseView}
                className="w-full md:w-auto px-10 py-4 bg-white border border-stone-200 text-stone-900 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-stone-50 transition-all shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {isEditModalOpen && selectedTarea && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-on-surface/40 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-surface rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-auto"
          >
            <div className="p-8 border-b border-primary/5 flex items-center justify-between">
              <h3 className="text-2xl font-display font-bold text-primary flex items-center gap-3 tracking-tight">
                <Edit2 className="w-6 h-6" />
                Editar Tarea
              </h3>
              <button 
                onClick={onCloseEdit} 
                className="p-3 hover:bg-stone-100 rounded-2xl transition-all"
              >
                <X className="w-6 h-6 text-stone-400" />
              </button>
            </div>
            <form onSubmit={onSubmitEdit} className="p-8 space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Instrucciones</label>
                  <textarea
                    value={editForm.instruccion}
                    onChange={(e) => setEditForm((current) => ({ ...current, instruccion: e.target.value }))}
                    className="w-full px-6 py-5 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all min-h-[120px] text-sm font-medium"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Estado</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm((current) => ({ ...current, status: e.target.value as Tarea['status'] }))}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                    >
                      <option value="pendiente">Pendiente</option>
                      <option value="en_progreso">En Progreso</option>
                      <option value="completada">Completada</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-xs font-black text-stone-400 uppercase tracking-widest">Vencimiento</label>
                    <input
                      type="date"
                      value={editForm.fecha_limite?.split('T')[0] || ''}
                      onChange={(e) => setEditForm((current) => ({ ...current, fecha_limite: e.target.value }))}
                      className="w-full px-5 py-4 bg-surface-container-low rounded-2xl focus:ring-2 focus:ring-primary outline-none transition-all text-sm font-bold"
                    />
                  </div>
                </div>
              <div className="flex gap-4 pt-4">
                <button
                  type="button"
                  onClick={onCloseEdit}
                  className="flex-1 py-4 bg-white border border-stone-200 text-stone-500 font-black uppercase tracking-widest text-xs rounded-2xl hover:bg-stone-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-4 bg-primary text-white font-black uppercase tracking-widest text-xs rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
                >
                  {submitting ? 'Guardando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {isDeleteModalOpen && selectedTarea && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-xl">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden p-10 text-center"
          >
            <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
              <AlertCircle className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-display font-bold text-on-surface mb-3 tracking-tight">¿Confirmar eliminación?</h3>
            <p className="text-stone-500 mb-8 leading-relaxed font-medium">
              Esta acción es irreversible. Se borrará la tarea de <span className="text-on-surface font-bold font-display">{selectedUsuario?.nombre}</span> de forma permanente.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirmDelete}
                disabled={submitting}
                className="w-full py-4 bg-red-600 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl shadow-lg shadow-red-200 hover:bg-red-700 transition-all"
              >
                {submitting ? 'Eliminando...' : 'Sí, eliminar permanentemente'}
              </button>
              <button
                onClick={onCloseDelete}
                className="w-full py-4 text-stone-400 font-bold uppercase tracking-widest text-[10px] hover:text-stone-600 transition-colors"
              >
                Descartar
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
