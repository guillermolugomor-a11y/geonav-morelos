import React, { useState, useEffect } from 'react';
import { UsuarioPerfil, Tarea } from '../types';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { CheckSquare, Loader2, ArrowRight, Edit3, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface UserTasksProps {
  perfil: UsuarioPerfil;
  onNavigateToMap?: (poligonoId: number) => void;
}

export const UserTasks: React.FC<UserTasksProps> = ({ perfil, onNavigateToMap }) => {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  const [editStatus, setEditStatus] = useState<Tarea['status']>('pendiente');
  const [editComments, setEditComments] = useState('');
  const [savingTask, setSavingTask] = useState(false);

  const fetchTasks = async () => {
    console.log('UserTasks: Iniciando fetchTasks para perfil:', perfil.id, perfil.nombre);
    setLoadingTasks(true);
    try {
      const userTasks = await taskService.getTareas(perfil.id);
      console.log('UserTasks: Tareas recibidas:', userTasks.length);
      setTareas(userTasks);
    } catch (error) {
      console.error('Error cargando tareas:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [perfil.id]);

  const handleEditClick = (tarea: Tarea) => {
    setEditingTask(tarea);
    setEditStatus(tarea.status);
    setEditComments(tarea.comentarios_usuario || '');
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditStatus('pendiente');
    setEditComments('');
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;

    setSavingTask(true);
    try {
      const success = await taskService.updateTareaStatus(editingTask.id, editStatus, editComments);
      if (success) {
        await fetchTasks();
        handleCancelEdit();
      } else {
        alert('Error al actualizar la tarea');
      }
    } catch (error) {
      console.error('Error saving task:', error);
      alert('Error al actualizar la tarea');
    } finally {
      setSavingTask(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 p-8 overflow-y-auto bg-stone-50"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Mis Tareas</h1>
          <p className="text-stone-500 mt-1">Visualiza y gestiona las tareas que te han sido asignadas.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-6 border-b border-stone-100 bg-stone-50/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-stone-800 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#8C3154]" />
              Lista de Tareas
            </h2>
            <button
              onClick={fetchTasks}
              className="text-xs font-bold text-[#8C3154] hover:text-[#7a2a49] flex items-center gap-1"
              disabled={loadingTasks}
            >
              {loadingTasks ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckSquare className="w-3 h-3" />}
              Actualizar
            </button>
          </div>

          <div className="p-6">
            {loadingTasks ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#8C3154]" />
              </div>
            ) : tareas.length === 0 ? (
              <div className="text-center py-16">
                <CheckSquare className="w-16 h-16 text-stone-200 mx-auto mb-4" />
                <p className="text-stone-500 font-medium text-lg">No tienes tareas asignadas en este momento.</p>
                <p className="text-stone-400 text-sm mt-2">Cuando un administrador te asigne una tarea, aparecerá aquí.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tareas.map(tarea => (
                  <div key={tarea.id} className="bg-stone-50 border border-stone-200 rounded-xl p-5 flex flex-col hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${tarea.status === 'completada' ? 'bg-[#8C3154]/10 text-[#8C3154]' :
                        tarea.status === 'en_progreso' ? 'bg-[#BC9B73]/10 text-[#BC9B73]' :
                          'bg-stone-200 text-stone-600'
                        }`}>
                        {tarea.status.replace('_', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-400 bg-white px-2 py-1 rounded-md border border-stone-100">
                          Polígono #{tarea.polygon_id}
                        </span>
                        <button
                          onClick={() => handleEditClick(tarea)}
                          className="p-1 text-stone-400 hover:text-[#8C3154] hover:bg-stone-50 rounded-md transition-colors"
                          title="Documentar tarea"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-stone-700 font-medium mb-4 flex-1">
                      {tarea.instruccion}
                    </p>

                    {tarea.comentarios_usuario && (
                      <div className="mb-4 p-3 bg-stone-100 rounded-lg text-xs text-stone-600 italic border border-stone-200">
                        "{tarea.comentarios_usuario}"
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-auto pt-4 border-t border-stone-200">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-stone-400 uppercase font-bold">Asignada el</span>
                        <span className="text-xs text-stone-600 font-medium">
                          {tarea.created_at
                            ? new Date(tarea.created_at).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })
                            : "Fecha pendiente"}
                        </span>
                      </div>
                      {onNavigateToMap && (
                        <button
                          onClick={() => onNavigateToMap(tarea.polygon_id)}
                          className="flex items-center gap-1.5 text-xs font-bold text-white bg-[#8C3154] hover:bg-[#7a2a49] px-3 py-1.5 rounded-lg transition-colors"
                        >
                          Ver en mapa <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Edición */}
      <AnimatePresence>
        {editingTask && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="flex justify-between items-center p-6 border-b border-stone-100">
                <h3 className="text-lg font-bold text-stone-800">Documentar Tarea</h3>
                <button
                  onClick={handleCancelEdit}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Estado de la Tarea
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as Tarea['status'])}
                    className="w-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-xl text-sm font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#8C3154]/20 focus:border-[#8C3154] transition-all"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_progreso">En Progreso</option>
                    <option value="completada">Completada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                    Comentarios / Documentación
                  </label>
                  <textarea
                    value={editComments}
                    onChange={(e) => setEditComments(e.target.value)}
                    placeholder="Describe lo que se realizó o los hallazgos..."
                    className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#8C3154]/20 focus:border-[#8C3154] transition-all resize-none h-32"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 p-6 border-t border-stone-100 bg-stone-50">
                <button
                  onClick={handleCancelEdit}
                  className="px-4 py-2 text-sm font-bold text-stone-600 hover:text-stone-800 transition-colors"
                  disabled={savingTask}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingTask}
                  className="flex items-center gap-2 px-6 py-2 bg-[#8C3154] hover:bg-[#7a2a49] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
                >
                  {savingTask ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
