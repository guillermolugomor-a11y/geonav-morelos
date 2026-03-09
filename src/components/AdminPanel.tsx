import React, { useState, useEffect } from 'react';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { poligonosService } from '../services/poligonosService';
import { UsuarioPerfil, Poligono, Tarea } from '../types';
import { User, MapPin, ClipboardList, Send, CheckCircle, AlertCircle, Loader2, Eye, Edit2, Trash2, X, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const AdminPanel: React.FC = () => {
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
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-6 border-bottom border-slate-100 bg-slate-50/50">
        <h2 className="text-xl font-semibold text-slate-900 flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-indigo-600" />
          Asignación de Tareas
        </h2>
        <p className="text-sm text-slate-500 mt-1">Asigna polígonos y tareas específicas al personal de campo.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {message && (
          <div className={`p-4 rounded-xl flex items-center gap-3 ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'
          }`}>
            {message.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Usuario */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4" /> Personal de Campo
            </label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4" /> Polígono (Sección/Manzana)
            </label>
            <select
              value={selectedPoligono}
              onChange={(e) => setSelectedPoligono(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
            <label className="text-sm font-medium text-slate-700">Tipo de Capa</label>
            <select
              value={tipoCapa}
              onChange={(e) => setTipoCapa(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            >
              <option value="secciones">Secciones</option>
              <option value="manzanas">Manzanas</option>
              <option value="localidades">Localidades</option>
            </select>
          </div>

          {/* Fecha Vencimiento */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Fecha de Vencimiento (Opcional)</label>
            <input
              type="date"
              value={fechaVencimiento}
              onChange={(e) => setFechaVencimiento(e.target.value)}
              className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
            />
          </div>
        </div>

        {/* Instrucciones */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Instrucciones de la Tarea</label>
          <textarea
            value={instruccion}
            onChange={(e) => setInstruccion(e.target.value)}
            placeholder="Ej: Realizar levantamiento de propaganda en esta sección..."
            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all min-h-[120px]"
            required
          />
        </div>

        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting}
            className="w-full md:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-200"
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

      {/* Lista de Tareas */}
      <div className="border-t border-slate-100">
        <div className="p-6 bg-slate-50/30">
          <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-indigo-600" />
            Tareas Asignadas
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <th className="px-6 py-3 border-b border-slate-100">Usuario</th>
                <th className="px-6 py-3 border-b border-slate-100">Polígono</th>
                <th className="px-6 py-3 border-b border-slate-100">Instrucción</th>
                <th className="px-6 py-3 border-b border-slate-100">Estado</th>
                <th className="px-6 py-3 border-b border-slate-100">Asignado</th>
                <th className="px-6 py-3 border-b border-slate-100 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tareas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center">
                    <p className="text-slate-400 text-sm italic mb-2">No hay tareas asignadas actualmente.</p>
                    <p className="text-xs text-amber-600 bg-amber-50 inline-block px-3 py-1 rounded-md border border-amber-100">
                      Si esperabas ver tareas, verifica las políticas RLS en Supabase para la tabla 'tareas'.
                    </p>
                  </td>
                </tr>
              ) : (
                tareas.map((t: any) => {
                  const usuario = usuarios.find(u => u.id === t.user_id);
                  const poligono = poligonos.find(p => p.id === t.polygon_id);
                  
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{usuario?.nombre || 'Usuario Desconocido'}</span>
                          <span className="text-[10px] text-slate-500">{usuario?.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">{poligono?.nombre || `ID: ${t.polygon_id}`}</span>
                          <span className="text-[10px] text-indigo-600 font-bold">
                            {poligono?.metadata?.seccion ? `S:${poligono.metadata.seccion}` : t.tipo_capa}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-600 line-clamp-2 max-w-xs" title={t.instruccion}>
                          {t.instruccion}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        t.status === 'completada' ? 'bg-emerald-100 text-emerald-700' :
                        t.status === 'en_progreso' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {t.status === 'completada' ? 'Completada' :
                         t.status === 'en_progreso' ? 'En Progreso' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => openViewModal(t)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Ver detalles"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openEditModal(t)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Editar tarea"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(t)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-4 h-4" />
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
                  <Eye className="w-5 h-5 text-indigo-600" />
                  Detalles de la Tarea
                </h3>
                <button onClick={() => setIsViewModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Usuario</span>
                    <p className="text-sm font-semibold text-slate-900">{usuarios.find(u => u.id === selectedTarea.user_id)?.nombre}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Polígono</span>
                    <p className="text-sm font-semibold text-slate-900">{poligonos.find(p => p.id === selectedTarea.polygon_id)?.nombre || selectedTarea.polygon_id}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Estado</span>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedTarea.status === 'completada' ? 'bg-emerald-100 text-emerald-700' :
                        selectedTarea.status === 'en_progreso' ? 'bg-amber-100 text-amber-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedTarea.status}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Asignado el</span>
                    <p className="text-sm font-semibold text-slate-900">{new Date(selectedTarea.created_at).toLocaleString()}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Instrucciones</span>
                  <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    {selectedTarea.instruccion}
                  </p>
                </div>
                {selectedTarea.comentarios_usuario && (
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Comentarios del Trabajador</span>
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
                  <Edit2 className="w-5 h-5 text-amber-600" />
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
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all min-h-[100px]"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Estado</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as any })}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                    className="px-6 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition-all disabled:opacity-50"
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
                <div className="w-16 h-16 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
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
                    className="flex-1 px-6 py-3 bg-rose-600 text-white font-semibold rounded-xl hover:bg-rose-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
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
    </div>
  );
};
