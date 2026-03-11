import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { UsuarioPerfil, Poligono, Tarea } from '../types';
import { User, MapPin, ClipboardList, Send, CheckCircle, AlertCircle, Loader2, Eye, Edit2, Trash2, X, Calendar, Map as MapIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AdminPanelProps {
  onNavigateToMap?: (poligonoId: number) => void;
  viewMode?: 'gestion' | 'monitor';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onNavigateToMap, viewMode = 'gestion' }) => {
  // ⚠️ DEUDA TÉCNICA: Manejo de estado local excesivo.
  // Para una aplicación en producción, este estado debería manejarse con
  // React Query (para caché y re-fetching de datos del servidor) o Zustand.
  const [usuarios, setUsuarios] = useState<UsuarioPerfil[]>([]);
  const [poligonos, setPoligonos] = useState<Poligono[]>([]);
  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Modals state
  const [selectedTarea, setSelectedTarea] = useState<Tarea | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Tarea>>({});

  // Form state
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedPoligono, setSelectedPoligono] = useState('');
  const [tipoCapa, setTipoCapa] = useState('secciones');
  const [instruccion, setInstruccion] = useState('');
  const [fechaVencimiento, setFechaVencimiento] = useState('');

  // Filter state
  const [filterUser, setFilterUser] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Filtering logic
  const filteredTareas = React.useMemo(() => {
    return tareas.filter(t => {
      const matchUser = !filterUser || t.user_id === filterUser;
      const matchStatus = !filterStatus || t.status === filterStatus;
      return matchUser && matchStatus;
    });
  }, [tareas, filterUser, filterStatus]);

  const fetchData = async () => {
    setLoading(true);
    setMessage(null);
    try {
      // ⚠️ DEUDA TÉCNICA: Carga masiva de datos en paralelo.
      // Descargar todos los usuarios, polígonos y tareas al mismo tiempo
      // no es escalable. Se debe implementar paginación o carga diferida (lazy loading).
      const [usersData, polyData, tasksResponse] = await Promise.all([
        userService.getAssignableUsers(),
        poligonosService.getPoligonos(),
        taskService.getAllTareas()
      ]);

      console.log('Usuarios cargados desde DB:', usersData);

      if (usersData.length === 0) {
        console.warn('No se encontraron usuarios en la tabla usuarios_perfil.');
      }

      setUsuarios(usersData);
      setPoligonos(polyData);

      if (tasksResponse.error) {
        setMessage({ type: 'error', text: `Error al cargar tareas: ${tasksResponse.error.message}` });
      }
      setTareas(tasksResponse.data);
    } catch (error: any) {
      console.error('Error loading admin data:', error);
      setMessage({ type: 'error', text: `Error de conexión: ${error.message || 'No se pudo conectar con la base de datos'}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const refreshTasks = async () => {
    console.log('AdminPanel: Refrescando lista de tareas...');
    const tasksResponse = await taskService.getAllTareas();
    console.log('AdminPanel: Tareas recibidas de la DB:', tasksResponse.data);
    if (tasksResponse.data) {
      tasksResponse.data.forEach(t => {
        console.log(`Tarea ID: ${t.id}, User ID: ${t.user_id}, Status: ${t.status}`);
      });
    }
    if (tasksResponse.error) {
      setMessage({ type: 'error', text: `Error al refrescar tareas: ${tasksResponse.error.message}` });
    }
    setTareas(tasksResponse.data);
  };

  const handleDeleteTarea = async () => {
    if (!selectedTarea) return;

    setSubmitting(true);
    try {
      const { error } = await taskService.deleteTarea(selectedTarea.id);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Tarea eliminada correctamente.' });
      setIsDeleteModalOpen(false);
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error al eliminar: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsDeleteModalOpen(true);
  };

  const handleEditTarea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTarea) return;

    setSubmitting(true);
    try {
      const { error } = await taskService.updateTarea(selectedTarea.id, editForm);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Tarea actualizada correctamente.' });
      setIsEditModalOpen(false);
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error al actualizar: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setEditForm({
      instruccion: tarea.instruccion,
      status: tarea.status,
      fecha_limite: tarea.fecha_limite
    });
    setIsEditModalOpen(true);
  };

  const openViewModal = (tarea: Tarea) => {
    setSelectedTarea(tarea);
    setIsViewModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !selectedPoligono || !instruccion) {
      setMessage({ type: 'error', text: 'Por favor completa los campos obligatorios.' });
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const nuevaTarea: any = {
        user_id: selectedUser,
        polygon_id: Number(selectedPoligono),
        instruccion: instruccion,
        tipo_capa: tipoCapa,
        status: 'pendiente',
        fecha_limite: fechaVencimiento || undefined
      };

      console.log('Enviando tarea:', nuevaTarea);
      const { error } = await taskService.asignarTarea(nuevaTarea);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Tarea asignada correctamente.' });
      setInstruccion('');
      setSelectedPoligono('');
      refreshTasks();
    } catch (error: any) {
      setMessage({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-[#8C3154]" />
      </div>
    );
  }

  return (
    <div className="bg-[#F2F1E8] rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
      {viewMode === 'gestion' && (
        <>
          <div className="p-6 border-b border-[#8C3154]/10 bg-[#F2F1E8]">
            <h2 className="text-xl font-bold text-[#8C3154] flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Gestión de Tareas
            </h2>
            <p className="text-sm text-stone-500 mt-1">Asigna polígonos y tareas específicas al personal de campo.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {message && (
              <div className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success' ? 'bg-[#8C3154]/5 text-[#8C3154] border border-[#8C3154]/20' : 'bg-[#7C4A36]/5 text-[#7C4A36] border border-[#7C4A36]/20'
                }`}>
                {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                <span className="text-sm font-medium">{message.text}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Usuario */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider flex items-center gap-2">
                  <User className="w-3.5 h-3.5" /> Personal de Campo
                </label>
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                  required
                >
                  <option value="">Seleccionar usuario...</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.nombre} ({u.email || 'Sin email'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Polígono */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" /> Polígono (Sección/Manzana)
                </label>
                <select
                  value={selectedPoligono}
                  onChange={(e) => setSelectedPoligono(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                  required
                >
                  <option value="">Seleccionar polígono...</option>
                  {poligonos.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.nombre} - {p.municipio} (S:{p.metadata?.seccion || 'N/A'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipo de Capa */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider">Tipo de Capa</label>
                <select
                  value={tipoCapa}
                  onChange={(e) => setTipoCapa(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                >
                  <option value="secciones">Secciones</option>
                  <option value="manzanas">Manzanas</option>
                  <option value="localidades">Localidades</option>
                </select>
              </div>

              {/* Fecha Vencimiento */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider">Vencimiento (Opcional)</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full px-4 py-2 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all text-sm"
                />
              </div>
            </div>

            {/* Instrucciones */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider">Instrucciones de la Tarea</label>
              <textarea
                value={instruccion}
                onChange={(e) => setInstruccion(e.target.value)}
                placeholder="Ej: Realizar levantamiento de propaganda en esta sección..."
                className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#BC9B73] focus:border-transparent outline-none transition-all min-h-[120px] text-sm"
                required
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={submitting}
                className="w-full md:w-auto px-10 py-3.5 bg-[#8C3154] hover:bg-[#7a2a49] text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#8C3154]/20 uppercase tracking-widest text-xs"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
                Asignar Tarea
              </button>
            </div>
          </form>
        </>
      )}

      {viewMode === 'monitor' && (
        <div className="flex flex-col h-full">
          <div className="p-6 bg-[#F2F1E8] border-b border-[#8C3154]/10">
            <h3 className="text-xl font-bold text-[#8C3154] flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Monitor de Tareas
            </h3>
            <p className="text-sm text-stone-500 mt-2 mb-2">Seguimiento en tiempo real del personal de campo.</p>

            {/* Barra de Filtros */}
            <div className="flex flex-wrap items-center gap-6 mt-8 p-6 bg-white border border-stone-200 rounded-2xl shadow-sm mb-8">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#2E3B2B]" />
                <select
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                  className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider bg-transparent outline-none cursor-pointer hover:text-[#BC9B73] transition-colors"
                >
                  <option value="">Todos los Usuarios</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="w-px h-6 bg-stone-200 hidden md:block" />

              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#2E3B2B]" />
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider bg-transparent outline-none cursor-pointer hover:text-[#BC9B73] transition-colors"
                >
                  <option value="">Cualquier Estado</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_progreso">En Proceso</option>
                  <option value="completada">Completada</option>
                </select>
              </div>

              {(filterUser || filterStatus) && (
                <button
                  onClick={() => { setFilterUser(''); setFilterStatus(''); }}
                  className="ml-auto text-xs font-bold text-[#7C4A36] hover:text-[#633a2a] flex items-center gap-1 group"
                >
                  <X className="w-3.5 h-3.5 transition-transform group-hover:rotate-90" />
                  Limpiar Filtros
                </button>
              )}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50 text-stone-500 uppercase text-[10px] font-bold tracking-widest border-b border-stone-100">
                  <th className="px-4 py-5 font-bold">Usuario</th>
                  <th className="px-4 py-5 font-bold">Polígono</th>
                  <th className="px-4 py-5 font-bold">Instrucción</th>
                  <th className="px-4 py-5 font-bold">Estado</th>
                  <th className="px-4 py-5 font-bold">Asignado</th>
                  <th className="px-4 py-5 text-right font-bold w-40">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTareas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                      <div className="flex flex-col items-center gap-3">
                        <AlertCircle className="w-8 h-8 opacity-20" />
                        <p className="text-sm italic font-medium">No se encontraron registros activos.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTareas.map((t: any) => {
                    const usuario = usuarios.find(u => u.id === t.user_id);
                    const poligono = poligonos.find(p => p.id === t.polygon_id);

                    return (
                      <tr key={t.id} className="hover:bg-stone-50/50 transition-colors group">
                        <td className="px-4 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-[#2E3B2B]">{usuario?.nombre || 'Usuario Desconocido'}</span>
                            <span className="text-[10px] text-stone-500 font-medium tracking-wide">{usuario?.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-stone-700">{poligono?.nombre || `ID: ${t.polygon_id}`}</span>
                            <span className="text-[10px] text-[#BC9B73] font-black uppercase tracking-wider">
                              {poligono?.metadata?.seccion ? `Sección ${poligono.metadata.seccion}` : t.tipo_capa}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-6">
                          <p className="text-sm text-stone-600 line-clamp-2 max-w-xs font-medium leading-relaxed" title={t.instruccion}>
                            {t.instruccion}
                          </p>
                        </td>
                        <td className="px-4 py-6">
                          <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${t.status === 'completada' ? 'bg-[#8C3154]/10 text-[#8C3154]' :
                            t.status === 'en_progreso' ? 'bg-[#BC9B73]/10 text-[#BC9B73]' :
                              'bg-stone-100 text-stone-500'
                            }`}>
                            {t.status === 'completada' ? 'Completada' :
                              t.status === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="px-4 py-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                          {t.created_at ? (
                            new Date(t.created_at).toLocaleDateString("es-MX", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric"
                            })
                          ) : (
                            <span className="opacity-40 italic underline">Sin fecha</span>
                          )}
                        </td>
                        <td className="px-4 py-6 text-right">
                          <div className="flex justify-end gap-1.5">
                            {onNavigateToMap && (
                              <button
                                onClick={() => onNavigateToMap(t.polygon_id)}
                                className="p-2 text-stone-400 hover:text-[#8C3154] hover:bg-[#8C3154]/5 rounded-lg transition-all"
                                title="Ver en mapa"
                              >
                                <MapIcon className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => openViewModal(t)}
                              className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-all"
                              title="Ver detalles"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openEditModal(t)}
                              className="p-2 text-stone-400 hover:text-[#BC9B73] hover:bg-[#BC9B73]/5 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(t)}
                              className="p-2 text-stone-400 hover:text-[#7C4A36] hover:bg-[#7C4A36]/5 rounded-lg transition-all"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}


      {/* Modals */}
      <AnimatePresence>
        {isViewModalOpen && selectedTarea && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Eye className="w-5 h-5 text-[#2E3B2B]" />
                  Detalles de la Tarea
                </h3>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Usuario</span>
                    <p className="text-sm font-semibold text-slate-900">{usuarios.find(u => u.id === selectedTarea.user_id)?.nombre}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Polígono</span>
                    <p className="text-sm font-semibold text-slate-900">{poligonos.find(p => p.id === selectedTarea.polygon_id)?.nombre || selectedTarea.polygon_id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Estado</span>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedTarea.status === 'completada' ? 'bg-[#8C3154]/10 text-[#8C3154]' :
                        selectedTarea.status === 'en_progreso' ? 'bg-[#BC9B73]/10 text-[#BC9B73]' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                        {selectedTarea.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Asignado el</span>
                    <p className="text-sm font-semibold text-slate-900">
                      {selectedTarea.created_at
                        ? new Date(selectedTarea.created_at).toLocaleString("es-MX", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit"
                        })
                        : "Fecha pendiente"}
                    </p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Instrucciones</span>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedTarea.instruccion}
                  </p>
                </div>
                {selectedTarea.comentarios_usuario && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-[#2E3B2B] tracking-wider opacity-60">Comentarios del Trabajador</span>
                    <p className="text-sm text-slate-600 italic">"{selectedTarea.comentarios_usuario}"</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-50 flex justify-end">
                <button
                  onClick={() => setIsViewModalOpen(false)}
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
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-[#BC9B73]" />
                  Editar Tarea
                </h3>
                <button onClick={() => setIsEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <form onSubmit={handleEditTarea}>
                <div className="p-6 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Instrucciones</label>
                    <textarea
                      value={editForm.instruccion}
                      onChange={(e) => setEditForm({ ...editForm, instruccion: e.target.value })}
                      className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] outline-none transition-all min-h-[100px]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Estado</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
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
                        onChange={(e) => setEditForm({ ...editForm, fecha_limite: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-stone-200 rounded-xl focus:ring-2 focus:ring-[#8C3154] outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>
                <div className="p-6 bg-slate-50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
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
                  <span className="font-semibold text-slate-700"> {usuarios.find(u => u.id === selectedTarea.user_id)?.nombre}</span>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setIsDeleteModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 text-slate-700 font-semibold rounded-xl hover:bg-slate-200 transition-all"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleDeleteTarea}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-[#7C4A36] text-white font-semibold rounded-xl hover:bg-[#633a2a] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      'Eliminar'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div >
  );
};
