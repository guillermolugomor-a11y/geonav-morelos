import React, { useMemo, useState } from 'react';
import { Users, X, MapPin, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../store/useStore';
import { TEAM_HEX_COLORS } from '../utils/teamColors';
import { isAdminUser } from '../constants/roles';

const DARK_BG = 'rgba(30,0,20,0.90)';
const DARK_BORDER = 'rgba(188,155,115,0.18)';
const DARK_SHADOW = '0 12px 40px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.15)';
const CREAM = '#F5EDE8';
const GOLD = '#BC9B73';

interface Props {
  tareas: any[];
}

export const MapTeamFilterControl: React.FC<Props> = ({ tareas }) => {
  const perfil = useStore(s => s.perfil);
  const usuarios = useStore(s => s.usuarios);
  const mapTeamFilter = useStore(s => s.mapTeamFilter);
  const setMapTeamFilter = useStore(s => s.setMapTeamFilter);
  const massVisualization = useStore(s => s.massVisualization);
  const showRank1Pins = useStore(s => s.showRank1Pins);
  const setShowRank1Pins = useStore(s => s.setShowRank1Pins);
  const [expanded, setExpanded] = useState(false);

  const fieldUsers = useMemo(() =>
    usuarios
      .filter(u => u.rol !== 'admin')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }))
      .map((u, idx) => ({ ...u, color: TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length] })),
    [usuarios]
  );

  const activeUserIds = useMemo(() => {
    const ids = new Set<string>();
    tareas.forEach(t => {
      if (['padron', 'seccion', 'secciones', 'Sección', 'manzana', 'manzanas'].includes(t.tipo_capa)) {
        if (t.user_id) ids.add(t.user_id);
      }
    });
    return ids;
  }, [tareas]);

  if (!isAdminUser(perfil) || massVisualization) return null;

  const teamsWithWork = fieldUsers.filter(u => activeUserIds.has(u.id));
  if (teamsWithWork.length === 0) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className="absolute top-4 left-4 z-[1000] animate-in fade-in duration-300">

      {/* ── Collapsed pill ── */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2.5 pl-3 pr-4 h-12 rounded-2xl border transition-all hover:opacity-90 active:scale-[0.97]"
          style={{
            background: DARK_BG,
            backdropFilter: 'blur(20px)',
            borderColor: DARK_BORDER,
            boxShadow: DARK_SHADOW,
          }}
        >
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD, opacity: 0.65 }} />
            <span className="text-[10px] font-black tabular-nums" style={{ color: CREAM, opacity: 0.5 }}>
              {teamsWithWork.length}
            </span>
          </div>

          {/* Color dots */}
          <div className="flex items-center gap-1">
            {teamsWithWork.slice(0, 8).map(u => (
              <span
                key={u.id}
                className="w-2.5 h-2.5 rounded-full shrink-0 transition-all"
                style={{
                  backgroundColor: u.color,
                  opacity: mapTeamFilter.length > 0 && !mapTeamFilter.includes(u.id) ? 0.25 : 1,
                  transform: mapTeamFilter.includes(u.id) ? 'scale(1.4)' : undefined,
                  outline: mapTeamFilter.includes(u.id) ? `1.5px solid ${u.color}` : undefined,
                  outlineOffset: '1.5px',
                }}
              />
            ))}
            {teamsWithWork.length > 8 && (
              <span className="text-[8px] font-black ml-0.5" style={{ color: GOLD, opacity: 0.45 }}>
                +{teamsWithWork.length - 8}
              </span>
            )}
          </div>

          <ChevronDown className="w-3 h-3" style={{ color: GOLD, opacity: 0.35 }} />
        </button>
      )}

      {/* ── Expanded panel ── */}
      {expanded && (
        <div
          className="w-64 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: DARK_BG,
            backdropFilter: 'blur(20px)',
            borderColor: DARK_BORDER,
            boxShadow: DARK_SHADOW,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: `1px solid ${DARK_BORDER}` }}
          >
            <div className="flex items-center gap-2">
              <Users className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD, opacity: 0.6 }} />
              <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: CREAM, opacity: 0.45 }}>
                Equipos en campo
              </span>
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(188,155,115,0.15)', color: GOLD }}
              >
                {teamsWithWork.length}
              </span>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
              style={{ color: CREAM, opacity: 0.4 }}
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Team list */}
          <div className="max-h-56 overflow-y-auto py-1.5 px-1.5 space-y-0.5 custom-scrollbar">
            {/* All teams row */}
            <button
              onClick={() => setMapTeamFilter([])}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                background: mapTeamFilter.length === 0 ? 'rgba(188,155,115,0.14)' : 'transparent',
              }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{
                  background: mapTeamFilter.length === 0 ? 'rgba(188,155,115,0.25)' : 'rgba(255,255,255,0.06)',
                }}
              >
                <Users
                  className="w-3 h-3"
                  style={{ color: mapTeamFilter.length === 0 ? GOLD : `${CREAM}40` }}
                />
              </div>
              <span
                className="text-[11px] font-black flex-1 text-left"
                style={{ color: mapTeamFilter.length === 0 ? CREAM : `${CREAM}55` }}
              >
                Todos los equipos
              </span>
              {mapTeamFilter.length === 0 && (
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
              )}
            </button>

            {/* Individual team rows */}
            {teamsWithWork.map(u => {
              const isActive = mapTeamFilter.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => {
                    if (isActive) {
                      setMapTeamFilter(mapTeamFilter.filter(id => id !== u.id));
                    } else {
                      setMapTeamFilter([...mapTeamFilter, u.id]);
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
                  style={{
                    background: isActive ? `${u.color}20` : 'transparent',
                    opacity: mapTeamFilter.length > 0 && !isActive ? 0.4 : 1,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[8px] font-black text-white"
                    style={{ backgroundColor: u.color }}
                  >
                    {getInitials(u.nombre)}
                  </div>
                  <span
                    className="text-[11px] font-black truncate flex-1"
                    style={{ color: isActive ? CREAM : `${CREAM}60` }}
                  >
                    {u.nombre}
                  </span>
                  {isActive && (
                    <X className="w-3 h-3 shrink-0 transition-opacity" style={{ color: u.color, opacity: 0.8 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div
            className="px-4 py-3 space-y-2.5"
            style={{ borderTop: `1px solid ${DARK_BORDER}` }}
          >
            {/* Legend */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ background: 'rgba(160,160,160,0.35)', border: '1px solid rgba(160,160,160,0.2)' }}
                />
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}35` }}>
                  Sin asignar
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm inline-block"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #d946ef)' }}
                />
                <span className="text-[8px] font-black uppercase tracking-widest" style={{ color: `${CREAM}35` }}>
                  Asignadas
                </span>
              </div>
            </div>

            {/* Rank-1 pins toggle */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3" style={{ color: '#3b82f6', opacity: 0.75 }} />
                <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: `${CREAM}38` }}>
                  Pines prioritarios
                </span>
              </div>
              <button
                onClick={() => setShowRank1Pins(!showRank1Pins)}
                className="relative w-8 h-4 rounded-full shrink-0 transition-colors duration-200"
                style={{ background: showRank1Pins ? '#3b82f6' : 'rgba(255,255,255,0.12)' }}
              >
                <span
                  className="absolute top-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-200"
                  style={{ left: showRank1Pins ? '1rem' : '0.125rem' }}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
