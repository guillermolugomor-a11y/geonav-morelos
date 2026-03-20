import React, { useMemo } from 'react';
import { AlertCircle, Bell, ClipboardList, Clock, Edit2, Eye, Map as MapIcon, MapPin, Trash2, User, X } from 'lucide-react';
import { Poligono, Tarea, UsuarioPerfil } from '../../types';
import { TaskLocationLabel } from '../tasks/TaskLocationLabel';
import { useNotifications } from '../notifications/NotificationContext';
import { motion } from 'motion/react';
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

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 bg-[#F2F1E8] border-b border-[#8C3154]/10">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[#8C3154] flex items-center gap-2">
              <ClipboardList className="w-5 h-5" />
              Monitor de Tareas
            </h3>
            <p className="text-sm text-stone-500 mt-2 mb-2">Seguimiento en tiempo real del personal de campo.</p>
          </div>
          
          <button
            onClick={async () => {
              if (!window.confirm('¿Deseas activar manualmente todas las tareas programadas cuya hora ya llegó?')) return;
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
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm"
            title="Activar tareas programadas ahora"
          >
            <Clock className="w-4 h-4" />
            ACTIVAR PROGRAMADAS
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-8 p-6 bg-white border border-stone-200 rounded-2xl shadow-sm mb-8">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#2E3B2B]" />
            <select
              value={filterUser}
              onChange={(e) => setFilterUser(e.target.value)}
              className="text-xs font-bold text-[#2E3B2B] uppercase tracking-wider bg-transparent outline-none cursor-pointer hover:text-[#BC9B73] transition-colors"
            >
              <option value="">Todos los Usuarios</option>
              {usuarios.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
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
              <option value="programada">Programada</option>
              <option value="en_progreso">En Proceso</option>
              <option value="completada">Completada</option>
            </select>
          </div>

          {(filterUser || filterStatus) && (
            <button
              onClick={() => {
                setFilterUser('');
                setFilterStatus('');
              }}
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
              <th className="px-4 py-5 font-bold">Ubicación / Geometría</th>
              <th className="px-4 py-5 font-bold">Instrucción</th>
              <th className="px-4 py-5 font-bold">Estado</th>
              <th className="px-4 py-5 font-bold">Asignado</th>
              <th className="px-4 py-5 text-right font-bold w-40">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {tareas.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-stone-400">
                  <div className="flex flex-col items-center gap-3">
                    <AlertCircle className="w-8 h-8 opacity-20" />
                    <p className="text-sm italic font-medium">No se encontraron registros activos.</p>
                  </div>
                </td>
              </tr>
            ) : (
              tareas.map((tarea) => {
                const usuario = userMap.get(tarea.user_id);
                const poligono = polygonMap.get(tarea.polygon_id);
                const hasUnread = unreadTaskNotifications.has(tarea.id);

                return (
                  <tr key={tarea.id} className="hover:bg-stone-50/50 transition-colors group">
                    <td className="px-4 py-6">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-bold text-[#2E3B2B]">{usuario?.nombre || 'Usuario Desconocido'}</span>
                        <span className="text-[10px] text-stone-500 font-medium tracking-wide">{usuario?.email}</span>
                      </div>
                    </td>
                    <td className="px-4 py-6">
                      <button
                        onClick={() => onNavigateToMap?.(tarea.polygon_id)}
                        className="flex items-start gap-2 hover:bg-[#8C3154]/5 p-2 rounded-xl transition-all text-left group/loc"
                        title="Ir a esta ubicación en el mapa"
                      >
                        <div className="p-1.5 bg-[#8C3154]/10 rounded-lg group-hover/loc:bg-[#8C3154] transition-colors">
                          <MapPin className="w-3.5 h-3.5 text-[#8C3154] group-hover/loc:text-white" />
                        </div>
                        <div className="text-sm font-bold text-stone-800 group-hover/loc:text-[#8C3154]">
                          <TaskLocationLabel task={tarea} poligono={poligono} />
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-6">
                      <p className="text-sm text-stone-600 line-clamp-2 max-w-xs font-medium leading-relaxed" title={tarea.instruccion}>
                        {tarea.instruccion}
                      </p>
                    </td>
                    <td className="px-4 py-6">
                      <span
                        className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          tarea.status === 'completada'
                            ? 'bg-[#8C3154]/10 text-[#8C3154]'
                            : tarea.status === 'en_progreso'
                              ? 'bg-[#BC9B73]/10 text-[#BC9B73]'
                              : tarea.status === 'programada'
                                ? 'bg-indigo-100 text-indigo-600'
                                : 'bg-stone-100 text-stone-500'
                        }`}
                      >
                        {tarea.status === 'completada'
                          ? 'Completada'
                          : tarea.status === 'en_progreso'
                            ? 'En Progreso'
                            : tarea.status === 'programada'
                              ? '⏰ Programada'
                              : 'Pendiente'}
                        
                        <NotificationIndicator 
                          hasUnread={hasUnread}
                          size="sm"
                          pulse={false}
                          className="ml-2"
                        />
                      </span>
                    </td>
                    <td className="px-4 py-6 text-[10px] font-bold text-stone-400 uppercase tracking-widest">
                      {tarea.created_at ? (
                        new Date(tarea.created_at).toLocaleDateString('es-MX', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })
                      ) : (
                        <span className="opacity-40 italic underline">Sin fecha</span>
                      )}
                    </td>
                    <td className="px-4 py-6 text-right">
                      <div className="flex justify-end gap-1.5">
                        {onNavigateToMap && (
                          <button
                            onClick={() => onNavigateToMap(tarea.polygon_id)}
                            className="p-2 text-stone-400 hover:text-[#8C3154] hover:bg-[#8C3154]/5 rounded-lg transition-all"
                            title="Ver en mapa"
                          >
                            <MapIcon className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onView(tarea)}
                          className="p-2 text-stone-400 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-all"
                          title="Ver detalles"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onEdit(tarea)}
                          className="p-2 text-stone-400 hover:text-[#BC9B73] hover:bg-[#BC9B73]/5 rounded-lg transition-all"
                          title="Editar"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDelete(tarea)}
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
  );
};
