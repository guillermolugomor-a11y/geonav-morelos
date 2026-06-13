import React, { useMemo } from 'react';
import { Users, ChevronDown, X } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TEAM_HEX_COLORS } from '../utils/teamColors';
import { isAdminUser } from '../constants/roles';

interface Props {
  tareas: any[];
}

export const MapTeamFilterControl: React.FC<Props> = ({ tareas }) => {
  const perfil = useStore(s => s.perfil);
  const usuarios = useStore(s => s.usuarios);
  const mapTeamFilter = useStore(s => s.mapTeamFilter);
  const setMapTeamFilter = useStore(s => s.setMapTeamFilter);
  const massVisualization = useStore(s => s.massVisualization);

  // Build sorted field users list with their assigned color index
  const fieldUsers = useMemo(() =>
    usuarios
      .filter(u => u.rol !== 'admin')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))
      .map((u, idx) => ({ ...u, color: TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length] })),
    [usuarios]
  );

  // Which users have at least one section assigned in the current task list
  const activeUserIds = useMemo(() => {
    const ids = new Set<string>();
    tareas.forEach(t => {
      if (['padron', 'seccion', 'secciones', 'Sección', 'manzana', 'manzanas'].includes(t.tipo_capa)) {
        if (t.user_id) ids.add(t.user_id);
      }
    });
    return ids;
  }, [tareas]);

  // Only for admins; hidden when mass-assignment visualization is active
  if (!isAdminUser(perfil) || massVisualization) return null;

  const teamsWithWork = fieldUsers.filter(u => activeUserIds.has(u.id));

  if (teamsWithWork.length === 0) return null;

  const activeTeam = mapTeamFilter
    ? teamsWithWork.find(u => u.id === mapTeamFilter)
    : null;

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white/96 backdrop-blur-xl rounded-2xl civic-shadow border border-stone-100 px-4 py-3 flex flex-col gap-2.5 min-w-[240px] max-w-xs animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Users className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            Equipos en campo
          </span>
          <span className="text-[10px] font-black text-primary/70 bg-primary/8 px-2 py-0.5 rounded-full">
            {teamsWithWork.length}
          </span>
        </div>
        {mapTeamFilter && (
          <button
            onClick={() => setMapTeamFilter(null)}
            className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
            title="Ver todos los equipos"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Color dots — one per team with active assignment */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {teamsWithWork.map(u => (
          <button
            key={u.id}
            onClick={() => setMapTeamFilter(mapTeamFilter === u.id ? null : u.id)}
            title={u.nombre}
            className="w-4 h-4 rounded-full transition-all hover:scale-110 focus:outline-none"
            style={{
              backgroundColor: u.color,
              transform: mapTeamFilter === u.id ? 'scale(1.35)' : undefined,
              outline: mapTeamFilter === u.id ? `2px solid ${u.color}` : undefined,
              outlineOffset: mapTeamFilter === u.id ? '2px' : undefined,
              opacity: mapTeamFilter && mapTeamFilter !== u.id ? 0.3 : 1,
            }}
          />
        ))}
        {mapTeamFilter && (
          <button
            onClick={() => setMapTeamFilter(null)}
            className="ml-1 text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-primary transition-colors"
          >
            todos
          </button>
        )}
      </div>

      {/* Combobox */}
      <div className="relative">
        {activeTeam && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10 pointer-events-none"
            style={{ backgroundColor: activeTeam.color }}
          />
        )}
        <select
          value={mapTeamFilter ?? ''}
          onChange={e => setMapTeamFilter(e.target.value || null)}
          className={`w-full appearance-none bg-stone-50 border border-stone-200 rounded-xl py-2.5 pr-8 text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all cursor-pointer ${activeTeam ? 'pl-7' : 'pl-3'}`}
        >
          <option value="">Todos los equipos</option>
          {teamsWithWork.map(u => (
            <option key={u.id} value={u.id}>{u.nombre}</option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-300 border border-slate-400/30 inline-block" />
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Sin asignar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm inline-block" style={{ background: 'linear-gradient(135deg, #3b82f6, #d946ef)' }} />
          <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest">Asignadas</span>
        </div>
      </div>
    </div>
  );
};
