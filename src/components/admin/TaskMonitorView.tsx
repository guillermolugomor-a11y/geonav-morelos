import React, { useMemo, useState } from 'react';
import { AlertCircle, Bell, ClipboardList, Clock, Edit2, Eye, Map as MapIcon, MapPin, Trash2, User, X, CheckCircle2, RotateCcw, Search, ChevronRight } from 'lucide-react';
import { Poligono, Tarea, UsuarioPerfil } from '../../types';
import { TaskLocationLabel } from '../tasks/TaskLocationLabel';
import { useNotifications } from '../notifications/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationIndicator } from '../notifications/NotificationIndicator';
import { taskService } from '../../services/taskService';

interface TaskMonitorViewProps {
  usuarios: UsuarioPerfil[];
  poligonos: Poligono[];
  tareas: Tarea[];
  filterUser: string;
  setFilterUser: (value: string) => void;
  filterStatus: string;
  setFilterStatus: (value: string) => void;
  onNavigateToMap?: (polygonId: number) => void;
  onView: (tarea: Tarea) => void;
  onEdit: (tarea: Tarea) => void;
  onDelete: (tarea: Tarea) => void;
  onRefresh?: () => void;
}

export const TaskMonitorView: React.FC<TaskMonitorViewProps> = ({
  usuarios,
  poligonos,
  tareas,
  filterUser,
  setFilterUser,
  filterStatus,
  setFilterStatus,
  onNavigateToMap,
  onView,
  onEdit,
  onDelete,
  onRefresh
}) => {
  const { notifications } = useNotifications();
  const [searchTerm, setSearchTerm] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const userMap = useMemo(() => {
    const map = new Map<string, UsuarioPerfil>();
    usuarios.forEach(u => map.set(u.id, u));
    return map;
  }, [usuarios]);

  const polygonMap = useMemo(() => {
    const map = new Map<number, Poligono>();
    poligonos.forEach(p => map.set(p.id, p));
    return map;
  }, [poligonos]);

  const unreadTaskNotifications = useMemo(() => {
    const set = new Set<string>();
    notifications.forEach(n => {
      if (n.metadata?.tarea_id) set.add(n.metadata.tarea_id);
    });
    return set;
  }, [notifications]);

  const filteredTareas = useMemo(() => {
    return tareas.filter(t => {
      const usuario = userMap.get(t.user_id);
      const searchMatch = !searchTerm || 
        usuario?.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.instruccion.toLowerCase().includes(searchTerm.toLowerCase());
      return searchMatch;
    });
  }, [tareas, userMap, searchTerm]);

  const handleApprove = async (tarea: Tarea) => {
    if (!window.confirm('¿Aprobar esta tarea? Se registrará la validación final.')) return;
    setProcessingId(tarea.id);
    try {
      const success = await taskService.updateTareaStatus(tarea.id, 'completada', 'Tarea aprobada y validada por el administrador.');
      if (success && onRefresh) onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (tarea: Tarea) => {
    const reason = window.prompt('¿Por qué rechazas esta tarea? (Opcional):');
    if (reason === null) return;
    
    setProcessingId(tarea.id);
    try {
      const success = await taskService.updateTareaStatus(tarea.id, 'en_progreso', `Tarea rechazada por el administrador. Motivo: ${reason || 'Sin especificar'}.`);
      if (success && onRefresh) onRefresh();
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in duration-500 font-jakarta">
      {/* Header - Civic Nexus Style */}
      <div className="p-4 sm:p-8 bg-[#F2F1E8] border-b border-[#8C3154]/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-black text-stone-900 flex items-center gap-3 tracking-tight">
              <ClipboardList className="w-6 h-6 text-[#8C3154]" />
              Monitor de Tareas
            </h3>
            <p className="text-sm text-stone-500 mt-1 font-medium italic">Seguimiento institucional del personal de campo.</p>
          </div>
          
          <button
            onClick={async () => {
              if (!window.confirm('¿Deseas activar manualmente todas las tareas programadas?')) return;
              const btn = document.getElementById('btn-manual-activate');
              if (btn) btn.classList.add('animate-pulse', 'opacity-50');
              try {
                const { activadas, error } = await taskService.activateScheduledTasks();
                if (error) throw error;
                alert(`✅ Se activaron ${activadas} tareas correctamente.`);
                if (onRefresh) onRefresh();
              } catch (err: any) {
                alert(`❌ Error al activar: ${err.message}`);
              } finally {
                if (btn) btn.classList.remove('animate-pulse', 'opacity-50');
              }
            }}
            id="btn-manual-activate"
            className="flex items-center justify-center gap-2 px-6 py-3 bg-[#8C3154] text-white text-xs font-black rounded-2xl hover:bg-[#7a2a49] transition-all shadow-ambient uppercase tracking-widest whitespace-nowrap"
          >
            <Clock className="w-4 h-4" />
            Activar Programadas
          </button>
        </div>

        {/* Filters & Search - Tonal Stacking */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-3 shadow-sm group focus-within:ring-2 ring-[#8C3154]/10 transition-all">
            <Search className="w-4 h-4 text-stone-400 group-focus-within:text-[#8C3154]" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-medium w-full text-stone-700"
            />
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-3 shadow-sm">
            <User className="w-4 h-4 text-stone-400" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-stone-700 uppercase tracking-tighter w-full"
            >
              <option value="">Filtro: Todo el Personal</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-stone-100 flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-4 h-4 text-stone-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-sm font-bold text-stone-700 uppercase tracking-tighter w-full"
            >
              <option value="">Filtro: Cualquier Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="programada">Programada</option>
              <option value="en_progreso">En Proceso</option>
              <option value="completada">Completada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-stone-50/50">
        
        {/* Desktop View: Table */}
        <div className="hidden md:block bg-white rounded-3xl border border-stone-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-stone-50/50 text-stone-400 uppercase text-[10px] font-black tracking-widest border-b border-stone-100">
                <th className="px-6 py-5">Personal de Campo</th>
                <th className="px-6 py-5">Ubicación Institucional</th>
                <th className="px-6 py-5">Instrucción</th>
                <th className="px-6 py-5">Estado</th>
                <th className="px-6 py-5 text-right w-48">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50">
              {filteredTareas.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-30">
                      <ClipboardList className="w-12 h-12" />
                      <p className="text-sm font-bold uppercase tracking-widest">Sin registros que coincidan</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTareas.map((tarea) => {
                  const usuario = userMap.get(tarea.user_id);
                  const poligono = polygonMap.get(tarea.polygon_id);
                  const hasUnread = unreadTaskNotifications.has(tarea.id);

                  return (
                    <tr key={tarea.id} className="hover:bg-stone-50/50 transition-colors group">
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-[10px] font-black text-stone-500">
                            {usuario?.nombre.substring(0,2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-stone-900">{usuario?.nombre}</span>
                            <span className="text-[10px] text-stone-400 font-bold tracking-tight">{usuario?.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-6">
                        <button
                          onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-[#f7f3eb] rounded-xl text-xs font-bold text-[#8C3154] hover:bg-[#8C3154] hover:text-white transition-all shadow-sm group/loc"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <TaskLocationLabel task={tarea} poligono={poligono} />
                        </button>
                      </td>
                      <td className="px-6 py-6 max-w-xs">
                        <p className="text-xs text-stone-600 font-medium leading-relaxed italic border-l-2 border-stone-100 pl-3">
                          "{tarea.instruccion}"
                        </p>
                      </td>
                      <td className="px-6 py-6">
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                            tarea.status === 'completada' ? 'bg-emerald-50 text-emerald-600' :
                            tarea.status === 'en_progreso' ? 'bg-blue-50 text-blue-600' :
                            tarea.status === 'programada' ? 'bg-indigo-50 text-indigo-600' :
                            'bg-stone-100 text-stone-400'
                          }`}>
                            {tarea.status === 'programada' ? '⏰ Programada' : tarea.status.replace('_', ' ')}
                          </span>
                          <NotificationIndicator hasUnread={hasUnread} size="sm" />
                        </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {tarea.status === 'completada' && (
                            <>
                              <button
                                onClick={() => handleApprove(tarea)}
                                className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all"
                                title="Aprobar"
                              >
                                <CheckCircle2 size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => handleReject(tarea)}
                                className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                                title="Rechazar"
                              >
                                <RotateCcw size={16} strokeWidth={2.5} />
                              </button>
                            </>
                          )}
                          <div className="w-px h-4 bg-stone-100 mx-1" />
                          <button onClick={() => onView(tarea)} className="p-2 text-stone-400 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-all"><Eye size={16} /></button>
                          <button onClick={() => onEdit(tarea)} className="p-2 text-stone-400 hover:text-[#BC9B73] hover:bg-[#BC9B73]/5 rounded-xl transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => onDelete(tarea)} className="p-2 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View: Cards - Civic Nexus Redesign */}
        <div className="md:hidden space-y-4">
          {filteredTareas.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-stone-200">
               <ClipboardList className="w-12 h-12 text-stone-200 mx-auto mb-4" />
               <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">No hay tareas asignadas</p>
            </div>
          ) : (
            filteredTareas.map((tarea) => {
              const usuario = userMap.get(tarea.user_id);
              const poligono = polygonMap.get(tarea.polygon_id);
              const hasUnread = unreadTaskNotifications.has(tarea.id);

              return (
                <div key={tarea.id} className="bg-white rounded-3xl p-6 shadow-ambient border border-stone-100 relative overflow-hidden group">
                  {/* Status Strip */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                    tarea.status === 'completada' ? 'bg-emerald-500' :
                    tarea.status === 'en_progreso' ? 'bg-[#811B5A]' :
                    tarea.status === 'programada' ? 'bg-indigo-500' :
                    'bg-stone-200'
                  }`} />

                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <h4 className="font-black text-stone-900 leading-tight">
                        {usuario?.nombre || 'Usuario Desconocido'}
                      </h4>
                      <p className="text-[10px] text-stone-400 font-bold tracking-tight">{usuario?.email}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      tarea.status === 'completada' ? 'bg-emerald-50 text-emerald-600' :
                      tarea.status === 'en_progreso' ? 'bg-[#8C3154]/5 text-[#8C3154]' :
                      'bg-stone-100 text-stone-500'
                    }`}>
                      {tarea.status === 'programada' ? '⏰ Programada' : tarea.status.replace('_', ' ')}
                    </span>
                  </div>

                  <button
                    onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                    className="w-full flex items-center gap-2 p-3 bg-[#f7f3eb] rounded-2xl text-[11px] font-black text-[#8C3154] mb-4 shadow-sm active:scale-95 transition-all"
                  >
                    <MapPin size={14} className="shrink-0" />
                    <TaskLocationLabel task={tarea} poligono={poligono} />
                    <ChevronRight size={14} className="ml-auto opacity-30" />
                  </button>

                  <p className="text-sm text-stone-600 font-medium leading-relaxed mb-6 italic pl-4 border-l-2 border-[#f7f3eb]">
                    "{tarea.instruccion}"
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-stone-50">
                    <span className="text-[10px] font-black text-stone-300 uppercase tracking-widest flex items-center gap-1.5">
                      <Clock size={12} />
                      {tarea.created_at ? new Date(tarea.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : 'Pendiente'}
                    </span>

                    <div className="flex items-center gap-1">
                      {tarea.status === 'completada' && (
                        <>
                          <button onClick={() => handleApprove(tarea)} className="p-3 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle2 size={18} strokeWidth={2.5} /></button>
                          <button onClick={() => handleReject(tarea)} className="p-3 bg-rose-50 text-rose-600 rounded-xl ml-1"><RotateCcw size={18} strokeWidth={2.5} /></button>
                        </>
                      )}
                      <div className="w-px h-6 bg-stone-100 mx-2" />
                      <button onClick={() => onView(tarea)} className="p-3 bg-stone-50 text-stone-600 rounded-xl"><Eye size={18} /></button>
                      <button onClick={() => onEdit(tarea)} className="p-3 bg-stone-50 text-stone-600 rounded-xl"><Edit2 size={18} /></button>
                      <button onClick={() => onDelete(tarea)} className="p-3 bg-rose-50 text-rose-600 rounded-xl"><Trash2 size={18} /></button>
                    </div>
                  </div>

                  <NotificationIndicator hasUnread={hasUnread} className="absolute top-4 right-4" />
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
