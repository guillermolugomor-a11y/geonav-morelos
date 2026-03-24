import React, { useMemo, useState } from 'react';
import { AlertCircle, Bell, ClipboardList, Clock, Edit2, Eye, MapPin, Trash2, User, X, CheckCircle2, RotateCcw, Search, ChevronRight } from 'lucide-react';
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
    <div className="flex flex-col h-full animate-in fade-in duration-700 font-sans">
      {/* Header - Digital Curator: Editorial Authority */}
      <div className="p-8 md:p-12 bg-surface border-b border-outline-variant/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 max-w-screen-xl mx-auto">
          <div className="space-y-2">
            <h3 className="text-3xl font-black text-on-surface flex items-center gap-4 tracking-tighter">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-white shadow-ambient">
                <ClipboardList className="w-6" />
              </div>
              Monitor de Tareas
            </h3>
            <p className="text-[14px] text-on-surface-variant font-medium opacity-60 pl-16">
              Editorial de seguimiento institucional • <span className="italic">Personal de campo</span>
            </p>
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
            className="flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary to-primary-container text-white text-[11px] font-black rounded-2xl hover:scale-[1.02] shadow-ambient uppercase tracking-[0.2em] transition-all"
          >
            <Clock className="w-4 h-4" />
            Activar Programadas
          </button>
        </div>

        {/* Filters & Search - Functional Elegance */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 max-w-screen-xl mx-auto">
          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <Search className="w-4 h-4 text-on-surface-variant opacity-40 group-focus-within:opacity-100 transition-opacity" />
            <input
              type="text"
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface placeholder:opacity-30"
            />
          </div>

          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <User className="w-4 h-4 text-on-surface-variant opacity-40" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface cursor-pointer"
            >
              <option value="">Filtro: Todo el Personal</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>{u.nombre}</option>
              ))}
            </select>
          </div>

          <div className="bg-white px-6 py-4 rounded-xl border border-outline-variant/15 flex items-center gap-4 shadow-sm group focus-within:ring-2 ring-primary/10 transition-all">
            <AlertCircle className="w-4 h-4 text-on-surface-variant opacity-40" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent border-none outline-none text-[13px] font-medium w-full text-on-surface cursor-pointer"
            >
              <option value="">Filtro: Cualquier Estado</option>
              <option value="pendiente">Pendiente</option>
              <option value="en_progreso">En Progreso</option>
              <option value="completada">Completada</option>
              <option value="programada">Programada</option>
            </select>
          </div>
        </div>
      </div>


      {/* Main Content Area - Digital Curator: Architectural White Space */}
      <div className="flex-1 overflow-y-auto p-6 md:p-12 lg:p-16 bg-surface-container-low animate-in fade-in slide-in-from-bottom-4 duration-1000">
        
        {/* Desktop View: Editorial Spread (Digital Curator) */}
        <div className="hidden md:block max-w-screen-xl mx-auto">
          {/* List Header - Synchronized Columns */}
          <div className="flex items-center px-8 mb-8 text-[11px] font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-90">
            <div className="w-[25%] pl-4 truncate">Operativo</div>
            <div className="w-[15%] px-2">Ubicación</div>
            <div className="w-[20%] px-2">Instrucción</div>
            <div className="w-[15%] text-center">Estado</div>
            <div className="w-[10%] text-center">Fecha</div>
            <div className="w-[15%] text-right pr-4">Gestión</div>
          </div>

          <div className="flex flex-col gap-6">
            {filteredTareas.length === 0 ? (
              <div className="py-32 text-center bg-white rounded-3xl shadow-sm border border-outline-variant/5">
                <div className="flex flex-col items-center gap-6 opacity-15">
                  <ClipboardList className="w-20 h-20 text-primary" />
                  <p className="text-[13px] font-black uppercase tracking-[0.4em] text-on-surface">Archivo Vacío</p>
                </div>
              </div>
            ) : (
              filteredTareas.map((tarea) => {
                const usuario = userMap.get(tarea.user_id);
                const poligono = polygonMap.get(tarea.polygon_id);
                const hasUnread = unreadTaskNotifications.has(tarea.id);

                return (
                  <div 
                    key={tarea.id} 
                    className="group bg-white rounded-[2rem] p-4 px-8 hover:shadow-ambient transition-all duration-500 relative"
                  >
                    <div className="flex items-center">
                      
                      {/* Column 1: Personal (25%) */}
                      <div className="w-[25%] flex items-center gap-5 pl-4 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-xs font-black text-primary border border-outline-variant/10 group-hover:bg-white transition-colors duration-500 shrink-0">
                          {usuario?.nombre.substring(0,2).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[17px] font-black text-on-surface tracking-tight leading-tight group-hover:text-primary transition-colors truncate">{usuario?.nombre}</span>
                          <span className="text-[12px] text-on-surface-variant font-medium tracking-tight opacity-50 italic truncate">{usuario?.email || 'institucional@morelos.gob.mx'}</span>
                        </div>
                      </div>

                      {/* Column 2: Ubicación (15%) */}
                      <div className="w-[15%] min-w-0 px-2">
                        <button
                          onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                          className="w-fit max-w-full flex items-center gap-2.5 px-4 py-2.5 bg-surface-container-low/50 rounded-2xl text-[11px] font-black text-primary hover:bg-primary-container hover:text-white transition-all shadow-sm group/loc overflow-hidden"
                        >
                          <MapPin className="w-4 h-4 shrink-0" />
                          <span className="truncate"><TaskLocationLabel task={tarea} poligono={poligono} /></span>
                        </button>
                      </div>

                      {/* Column 3: Instrucción (20%) */}
                      <div className="w-[20%] min-w-0 px-2">
                        <p className="text-[14px] text-on-surface-variant font-medium leading-relaxed italic border-l-3 border-outline-variant/10 pl-6 group-hover:border-primary/20 transition-all duration-700 truncate">
                          "{tarea.instruccion}"
                        </p>
                      </div>

                      {/* Column 4: Estado (15%) */}
                      <div className="w-[15%] flex justify-center min-w-0">
                        <span className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] shadow-sm truncate max-w-full ${
                          tarea.status === 'completada' ? 'bg-[#e0f2f1] text-[#00695c]' :
                          tarea.status === 'en_progreso' ? 'bg-secondary-container text-on-secondary-container' :
                          tarea.status === 'programada' ? 'bg-[#e8eaf6] text-[#283593]' :
                          'bg-surface-container-low text-on-surface-variant'
                        }`}>
                          {tarea.status === 'programada' ? <Clock className="w-3.5 h-3.5 shrink-0" /> : <div className={`w-2 h-2 rounded-full shrink-0 ${tarea.status === 'completada' ? 'bg-[#009688]' : tarea.status === 'en_progreso' ? 'bg-[#ff9800]' : 'bg-stone-300'}`} />}
                          {tarea.status === 'programada' ? 'Programada' : tarea.status.replace('_', ' ')}
                        </span>
                      </div>

                      {/* Column 5: Fecha (10%) */}
                      <div className="w-[10%] text-center min-w-0">
                        <span className="text-[12px] font-black text-on-surface-variant opacity-40 uppercase tracking-widest truncate">
                          {tarea.created_at ? new Date(tarea.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }) : '—'}
                        </span>
                      </div>

                      {/* Column 6: Gestión (15%) */}
                      <div className="w-[15%] flex justify-end items-center gap-1 opacity-30 group-hover:opacity-100 transition-all duration-500 pr-4 min-w-0">
                        {tarea.status === 'completada' && (
                          <div className="flex items-center gap-1 mr-2 pr-2 border-r border-outline-variant/10">
                            <button
                              onClick={() => handleApprove(tarea)}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-2xl transition-all hover:scale-110"
                              title="Aprobar"
                            >
                              <CheckCircle2 size={16} strokeWidth={3} />
                            </button>
                            <button
                              onClick={() => handleReject(tarea)}
                              className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all hover:scale-110"
                              title="Rechazar"
                            >
                              <RotateCcw size={16} strokeWidth={3} />
                            </button>
                          </div>
                        )}
                        <button onClick={() => onView(tarea)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-2xl transition-all"><Eye size={16} /></button>
                        <button onClick={() => onEdit(tarea)} className="p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container-low rounded-2xl transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => onDelete(tarea)} className="p-1.5 text-on-surface-variant hover:text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
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
