import React, { useState, useEffect, useMemo } from 'react';
import { UsuarioPerfil, Tarea, TareaHistorial } from '../types';
import { taskService } from '../services/taskService';
import { CheckSquare, Loader2, ArrowRight, Edit3, X, Save, MessageSquare, Clock, User, ChevronRight, Bell, Users, Camera, Image as ImageIcon, Trash2 } from 'lucide-react';
import { cloudinaryService } from '../services/cloudinaryService';
import { motion, AnimatePresence } from 'motion/react';
import { TaskLocationLabel } from './tasks/TaskLocationLabel';
import { useNotifications } from './notifications/NotificationContext';
import { NotificationIndicator } from './notifications/NotificationIndicator';

interface UserTasksProps {
  perfil: UsuarioPerfil;
  onNavigateToMap?: (poligonoId: number) => void;
}

export const UserTasks: React.FC<UserTasksProps> = ({ perfil, onNavigateToMap }) => {
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [editingTask, setEditingTask] = useState<Tarea | null>(null);
  const [historial, setHistorial] = useState<TareaHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editStatus, setEditStatus] = useState<Tarea['status']>('pendiente');
  const [newUpdate, setNewUpdate] = useState('');
  const [savingTask, setSavingTask] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  
  const { notifications, markTaskNotificationsAsRead } = useNotifications();

  // OPTIMIZACIÓN: Pre-calcular tareas con notificaciones no leídas (O(n))
  const tareasConNotificaciones = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach(n => {
      if (!n.leida && n.metadata?.tarea_id) {
        set.add(n.metadata.tarea_id);
      }
    });
    return set;
  }, [notifications]);

  const hasChanges = useMemo(() => {
    if (!editingTask) return false;
    
    const statusChanged = editStatus !== editingTask.status;
    const messageChanged = newUpdate.trim().length > 0;
    
    const originalUrls = editingTask.evidencia_urls || [];
    const evidenceUrlsChanged = JSON.stringify(evidenceUrls) !== JSON.stringify(originalUrls);
    const filesSelected = selectedFiles.length > 0;
    
    return statusChanged || messageChanged || evidenceUrlsChanged || filesSelected;
  }, [editingTask, editStatus, newUpdate, evidenceUrls, selectedFiles]);

  const fetchTasks = async () => {
    setLoadingTasks(true);
    try {
      const userTasks = await taskService.getTareas(perfil.id);
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

  const handleEditClick = async (tarea: Tarea) => {
    setEditingTask(tarea);
    setEditStatus(tarea.status);
    setNewUpdate('');
    setEvidenceUrls(tarea.evidencia_urls || (tarea.evidencia_url ? [tarea.evidencia_url] : []));
    setSelectedFiles([]);
    setPreviewUrls([]);
    
    // Cargar historial
    setLoadingHistorial(true);
    try {
      const history = await taskService.getTareaHistorial(tarea.id);
      setHistorial(history);
      
      // Marcar notificaciones como leídas
      markTaskNotificationsAsRead(tarea.id);
    } catch (error) {
      console.error('Error cargando historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingTask(null);
    setEditStatus('pendiente');
    setNewUpdate('');
    setHistorial([]);
    setSelectedFiles([]);
    setPreviewUrls([]);
    setUploadProgress(0);
    setIsUploading(false);
    setEvidenceUrls([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      const remainingSlots = 5 - (evidenceUrls.length + selectedFiles.length);
      const filesToAdd = newFiles.slice(0, remainingSlots);
      
      if (filesToAdd.length < newFiles.length) {
        alert("Máximo 5 fotos por tarea");
      }

      if (filesToAdd.length > 0) {
        setSelectedFiles(prev => [...prev, ...filesToAdd] as File[]);
        const urls = filesToAdd.map(file => URL.createObjectURL(file as File));
        setPreviewUrls(prev => [...prev, ...urls]);
      }
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTask) return;
    setSavingTask(true);
    let finalEvidenceUrls = [...evidenceUrls];

    try {
      // 1. Subir archivos nuevos secuencialmente
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const totalFiles = selectedFiles.length;
        
        for (let i = 0; i < selectedFiles.length; i++) {
          const uploadedUrl = await cloudinaryService.uploadImage(selectedFiles[i], (progress) => {
            const overallProgress = ((i * 100) + progress) / totalFiles;
            setUploadProgress(overallProgress);
          });
          
          if (uploadedUrl) {
            finalEvidenceUrls.push(uploadedUrl);
          } else {
            throw new Error(`Error al subir la imagen ${i + 1} de ${totalFiles}`);
          }
        }
      }

      // 2. Actualizar tarea con la nueva lista de evidencias
      const success = await taskService.updateTareaStatus(
        editingTask.id, 
        editStatus, 
        newUpdate.trim() || undefined, 
        perfil.id,
        finalEvidenceUrls[0] || null, // Compatibilidad (primera foto)
        finalEvidenceUrls // Lista completa
      );
      
      if (success) {
        const history = await taskService.getTareaHistorial(editingTask.id);
        setHistorial(history);
        setNewUpdate('');
        setSelectedFiles([]);
        setPreviewUrls([]);
        setEvidenceUrls(finalEvidenceUrls);
        setUploadProgress(0);
        setIsUploading(false);
        await fetchTasks();
      } else {
        alert('No se pudo guardar la tarea');
      }
    } catch (error: any) {
      console.error('Error al guardar reporte:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setSavingTask(false);
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="flex-1 p-4 md:p-8 overflow-y-auto bg-stone-50"
    >
      <div className="max-w-5xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-stone-900 tracking-tight">Mis Tareas</h1>
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
                      {tarea.is_collaborative && (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary flex items-center gap-1.5 animate-pulse">
                          <Users className="w-3 h-3" /> Colaborativa
                        </span>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-400 bg-white px-2 py-1 rounded-md border border-stone-100">
                          <TaskLocationLabel task={tarea} compact />
                        </span>
                        <button
                          onClick={() => handleEditClick(tarea)}
                          className="p-1 text-stone-400 hover:text-[#8C3154] hover:bg-stone-50 rounded-md transition-colors relative"
                          title="Documentar tarea"
                        >
                          <Edit3 className="w-4 h-4" />
                          <NotificationIndicator 
                            hasUnread={tareasConNotificaciones.has(tarea.id)}
                            size="sm"
                            className="absolute -top-1 -right-1"
                          />
                        </button>
                      </div>
                    </div>

                    <p className="text-sm text-stone-700 font-medium mb-4 flex-1">
                      {tarea.instruccion}
                    </p>

                    {tarea.comentarios_usuario && (
                      <div className="mb-4 p-3 bg-stone-100 rounded-lg text-[10px] text-stone-500 border border-stone-200 line-clamp-2">
                        <span className="font-bold text-[#8C3154] uppercase mr-1">Último avance:</span>
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
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 pb-32 sm:pb-4 bg-stone-900/60 backdrop-blur-sm shadow-2xl overflow-hidden"
          >
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col h-[75vh] sm:h-auto sm:max-h-[92vh] border border-stone-100"
            >
              <div className="flex justify-between items-center p-5 md:p-8 border-b border-stone-50">
                <div className="flex flex-col">
                  <h3 className="text-xl md:text-2xl font-black text-stone-900 tracking-tight">Reportar Avance</h3>
                  <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest mt-0.5">Gestión de Tarea Técnica</p>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="text-stone-400 hover:text-stone-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 md:space-y-8 min-h-0 custom-scrollbar bg-white">
                {/* Visual Header in Body */}
                <div className="bg-[#f7f3eb] rounded-2xl p-4 flex items-center gap-4 border border-stone-100">
                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#8C3154] shadow-sm">
                      <CheckSquare className="w-5 h-5" />
                   </div>
                   <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase text-[#8C3154]/60 tracking-tighter mb-0.5">Instrucción actual</p>
                      <p className="text-sm font-bold text-stone-800 truncate">"{editingTask.instruccion}"</p>
                   </div>
                </div>
                {/* Equipo Colaborador - Solo si es tarea colaborativa */}
                {editingTask.is_collaborative && (
                  <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 animate-in fade-in zoom-in-95">
                    <label className="block text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                       <Users className="w-3.5 h-3.5" /> Equipo en esta Tarea
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-primary/20">
                         <div className="w-5 h-5 bg-primary text-white rounded-full flex items-center justify-center text-[10px] font-black">
                           {perfil.nombre.charAt(0)}
                         </div>
                         <span className="text-[11px] font-bold text-primary">Tú (Responsable)</span>
                      </div>
                      {/* Aquí idealmente mostraríamos los nombres de los compañeros. 
                          Si no los tenemos en el prop, podemos mostrar "X colaboradores más" 
                          o ajustar el servicio para traer los nombres. */}
                      {editingTask.collaborator_ids && editingTask.collaborator_ids.length > 1 && (
                        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100/50 rounded-xl text-[10px] font-bold text-stone-500 italic">
                          + {editingTask.collaborator_ids.length - 1} compañeros participando
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Historial Timeline */}
                <div>
                  <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5" />
                    Historial de Avances
                  </label>
                  
                  {loadingHistorial ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-stone-400" />
                    </div>
                  ) : historial.length === 0 ? (
                    <div className="text-center py-6 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                      <p className="text-xs text-stone-400 italic">No hay registros de historial aún.</p>
                    </div>
                  ) : (
                    <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-3 before:w-px before:bg-stone-200">
                      {historial
                        .filter(item => !(perfil.rol !== 'admin' && item.tipo === 'sistema' && (item.mensaje.toLowerCase().includes('scheduler') || item.mensaje.toLowerCase().includes('activada'))))
                        .map((item) => (
                        <div key={item.id} className="relative pl-8">
                          <div className={`absolute left-1 top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm flex items-center justify-center ${
                            item.tipo === 'cambio_estado' ? 'bg-[#BC9B73]' : 'bg-[#8C3154]'
                          }`}>
                            {item.tipo === 'cambio_estado' ? <ChevronRight className="w-2.5 h-2.5 text-white" /> : <div className="w-1 h-1 bg-white rounded-full" />}
                          </div>
                          <div className="bg-stone-50 rounded-lg p-3 border border-stone-100">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-[10px] font-bold text-[#8C3154] uppercase flex items-center gap-1">
                                <User className="w-2.5 h-2.5" />
                                {item.tipo === 'sistema' ? 'SISTEMA' : (item.user_id === perfil.id ? 'Tú' : (item.perfil?.nombre || 'SISTEMA'))}
                              </span>
                              <span className="text-[10px] text-stone-400 font-medium">
                                {formatDateTime(item.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-stone-700 leading-relaxed">
                              {item.mensaje}
                            </p>
                            {item.estado_snapshot && (
                              <div className="mt-2 text-[9px] font-bold text-stone-400 uppercase tracking-tighter">
                                Estado: <span className="text-[#BC9B73]">{item.estado_snapshot}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-stone-100">
                  <div className="mb-4">
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
                      Cambiar Estado
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
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Nuevo Avance
                    </label>
                    <textarea
                      value={newUpdate}
                      onChange={(e) => setNewUpdate(e.target.value)}
                      placeholder="Escribe una actualización de esta tarea..."
                      className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-700 focus:outline-none focus:ring-2 focus:ring-[#8C3154]/20 focus:border-[#8C3154] transition-all resize-none h-24"
                    />
                  </div>

                  {/* Subida de Evidencia */}
                  <div>
                    <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2 flex items-center justify-between gap-2">
                       <span className="flex items-center gap-2">
                          <Camera className="w-3.5 h-3.5" />
                          Evidencia Fotográfica ({evidenceUrls.length + selectedFiles.length}/5)
                       </span>
                       {isUploading && (
                          <span className="text-[10px] text-[#8C3154] animate-pulse">Subiendo... {Math.round(uploadProgress)}%</span>
                       )}
                    </label>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-2">
                      {/* Fotos ya guardadas en la tarea */}
                      {evidenceUrls.map((url, index) => (
                        <div key={`ev-${index}`} className="relative h-28 rounded-xl overflow-hidden border border-stone-200 bg-stone-50 group shadow-sm">
                          <img 
                            src={url} 
                            alt={`Evidencia ${index + 1}`} 
                            className="w-full h-full object-cover"
                          />
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setEvidenceUrls(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute top-1.5 right-1.5 p-2 bg-white/80 backdrop-blur-md rounded-full text-[#8C3154] shadow-md transition-all active:scale-90"
                            title="Remover foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Previsualización de fotos nuevas seleccionadas */}
                      {previewUrls.map((url, index) => (
                        <div key={`prev-${index}`} className="relative h-28 rounded-xl overflow-hidden border-2 border-[#8C3154]/30 bg-stone-50 group shadow-sm ring-4 ring-[#8C3154]/5">
                          <img 
                            src={url} 
                            alt={`Previsualización ${index + 1}`} 
                            className="w-full h-full object-cover brightness-90"
                          />
                          <div className="absolute inset-0 bg-stone-900/10 flex items-center justify-center">
                             <div className="bg-white/90 px-2 py-0.5 rounded text-[8px] font-black text-[#8C3154] uppercase tracking-tighter">Pendiente</div>
                          </div>
                          <button 
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFiles(prev => prev.filter((_, i) => i !== index));
                              setPreviewUrls(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="absolute top-1.5 right-1.5 p-2 bg-white/80 backdrop-blur-md rounded-full text-[#8C3154] shadow-md transition-all active:scale-90"
                            title="Remover foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {/* Ranura para añadir más (si hay espacio) */}
                      {(evidenceUrls.length + selectedFiles.length) < 5 && (
                        <label className="flex flex-col items-center justify-center h-28 border-2 border-dashed border-stone-200 rounded-xl bg-stone-50 hover:bg-stone-100 hover:border-[#8C3154]/30 transition-all cursor-pointer group shadow-sm">
                          <input 
                            type="file" 
                            accept="image/*" 
                            capture="environment"
                            multiple
                            onChange={handleFileChange} 
                            className="hidden" 
                          />
                          <div className="w-10 h-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                            <ImageIcon className="w-5 h-5 text-stone-400 group-hover:text-[#8C3154]" />
                          </div>
                          <span className="text-[10px] font-black text-stone-500 uppercase tracking-tighter">Añadir Foto</span>
                        </label>
                      )}
                    </div>

                    {isUploading && (
                      <div className="mt-3 bg-stone-50 p-3 rounded-xl border border-stone-100">
                        <div className="flex justify-between text-[9px] font-black text-stone-400 uppercase mb-2">
                          <span>Subiendo archivos...</span>
                          <span>{Math.round(uploadProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-200 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            className="h-full bg-gradient-to-r from-[#8C3154] to-[#BC9B73] rounded-full"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 p-5 md:p-8 border-t border-stone-50 bg-stone-50/50 backdrop-blur-sm shrink-0">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 text-sm font-black text-stone-500 uppercase tracking-widest bg-stone-100/50 hover:bg-stone-100 rounded-xl transition-all"
                  disabled={savingTask}
                >
                  Regresar
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={savingTask || !hasChanges}
                  className="flex items-center gap-2 px-6 py-2 bg-[#8C3154] hover:bg-[#7a2a49] text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
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
