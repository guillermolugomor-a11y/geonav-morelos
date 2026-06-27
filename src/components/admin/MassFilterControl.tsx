import React from 'react';
import { Shuffle, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TEAM_HEX_COLORS, buildUserColorMap } from '../../utils/teamColors';

const DARK_BG = 'rgba(30,0,20,0.90)';
const DARK_BORDER = 'rgba(188,155,115,0.18)';
const DARK_SHADOW = '0 12px 40px rgba(0,0,0,0.28), 0 4px 12px rgba(0,0,0,0.15)';
const CREAM = '#F5EDE8';
const GOLD = '#BC9B73';

export const MassFilterControl: React.FC = () => {
  const massVisualization = useStore(s => s.massVisualization);
  const massVisualizationFilter = useStore(s => s.massVisualizationFilter);
  const setMassVisualizationFilter = useStore(s => s.setMassVisualizationFilter);
  const setMassVisualization = useStore(s => s.setMassVisualization);
  const usuarios = useStore(s => s.usuarios);

  if (!massVisualization) return null;

  const userColorMap = buildUserColorMap(massVisualization.blocks);

  const equipos = massVisualization.blocks
    .map(block => {
      const userId = block.userIds[0];
      const user = usuarios.find(u => u.id === userId);
      return {
        userId,
        nombre: user?.nombre ?? `Equipo ${block.blockId + 1}`,
        color: TEAM_HEX_COLORS[block.blockId % TEAM_HEX_COLORS.length],
        blockId: block.blockId,
      };
    })
    .sort((a, b) =>
      a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' })
    );

  const activeColor = massVisualizationFilter
    ? (userColorMap.get(massVisualizationFilter) ?? '#3b82f6')
    : null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div
      className="absolute top-4 left-4 z-[1000] w-64 rounded-2xl border overflow-hidden animate-in fade-in slide-in-from-top-3 duration-300"
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
          <Shuffle className="w-3.5 h-3.5 shrink-0" style={{ color: GOLD, opacity: 0.6 }} />
          <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: CREAM, opacity: 0.45 }}>
            Dispersión activa
          </span>
          <span
            className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
            style={{ background: 'rgba(188,155,115,0.15)', color: GOLD }}
          >
            {massVisualization.cantidadSecciones} secc.
          </span>
        </div>
        <button
          onClick={() => { setMassVisualizationFilter(null); setMassVisualization(null); }}
          className="w-6 h-6 flex items-center justify-center rounded-lg transition-all hover:bg-white/10"
          style={{ color: CREAM, opacity: 0.4 }}
          title="Cerrar visualización"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color dots */}
      <div className="px-4 py-2.5 flex items-center gap-1 flex-wrap">
        {equipos.map(({ userId, color }) => (
          <button
            key={userId}
            onClick={() => setMassVisualizationFilter(massVisualizationFilter === userId ? null : userId)}
            className="w-3 h-3 rounded-full transition-all hover:scale-110 focus:outline-none"
            style={{
              backgroundColor: color,
              opacity: massVisualizationFilter && massVisualizationFilter !== userId ? 0.25 : 1,
              transform: massVisualizationFilter === userId ? 'scale(1.4)' : undefined,
              outline: massVisualizationFilter === userId ? `1.5px solid ${color}` : undefined,
              outlineOffset: '1.5px',
            }}
            title={equipos.find(e => e.userId === userId)?.nombre}
          />
        ))}
        {massVisualizationFilter && (
          <button
            onClick={() => setMassVisualizationFilter(null)}
            className="ml-1 text-[9px] font-black uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: GOLD, opacity: 0.55 }}
          >
            ver todos
          </button>
        )}
      </div>

      {/* Team list */}
      <div
        className="max-h-52 overflow-y-auto py-1.5 px-1.5 space-y-0.5 custom-scrollbar"
        style={{ borderTop: `1px solid ${DARK_BORDER}` }}
      >
        {/* All teams */}
        <button
          onClick={() => setMassVisualizationFilter(null)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
          style={{ background: massVisualizationFilter === null ? 'rgba(188,155,115,0.14)' : 'transparent' }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: massVisualizationFilter === null ? 'rgba(188,155,115,0.25)' : 'rgba(255,255,255,0.06)' }}
          >
            <Shuffle
              className="w-3 h-3"
              style={{ color: massVisualizationFilter === null ? GOLD : `${CREAM}40` }}
            />
          </div>
          <span
            className="text-[11px] font-black flex-1"
            style={{ color: massVisualizationFilter === null ? CREAM : `${CREAM}55` }}
          >
            Todos los equipos
          </span>
          {massVisualizationFilter === null && (
            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: GOLD }} />
          )}
        </button>

        {equipos.map(({ userId, nombre, color }) => {
          const isActive = massVisualizationFilter === userId;
          return (
            <button
              key={userId}
              onClick={() => setMassVisualizationFilter(isActive ? null : userId)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
              style={{
                background: isActive ? `${color}20` : 'transparent',
                opacity: massVisualizationFilter && !isActive ? 0.4 : 1,
              }}
            >
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-[8px] font-black text-white"
                style={{ backgroundColor: color }}
              >
                {getInitials(nombre)}
              </div>
              <span
                className="text-[11px] font-black truncate flex-1"
                style={{ color: isActive ? CREAM : `${CREAM}60` }}
              >
                {nombre}
              </span>
              {isActive && (
                <X className="w-3 h-3 shrink-0" style={{ color, opacity: 0.8 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
