import React from 'react';
import { Shuffle, X, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TEAM_HEX_COLORS, buildUserColorMap } from '../../utils/teamColors';

export const MassFilterControl: React.FC = () => {
  const massVisualization = useStore(s => s.massVisualization);
  const massVisualizationFilter = useStore(s => s.massVisualizationFilter);
  const setMassVisualizationFilter = useStore(s => s.setMassVisualizationFilter);
  const setMassVisualization = useStore(s => s.setMassVisualization);
  const usuarios = useStore(s => s.usuarios);

  if (!massVisualization) return null;

  const userColorMap = buildUserColorMap(massVisualization.blocks);

  // Build sorted team list (Equipo 1 → Equipo 14) with name + color
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

  const handleClose = () => {
    setMassVisualizationFilter(null);
    setMassVisualization(null);
  };

  return (
    <div className="absolute top-4 left-4 z-[1000] bg-white/96 backdrop-blur-xl rounded-2xl civic-shadow border border-stone-100 px-4 py-3 flex flex-col gap-2.5 min-w-[260px] max-w-xs animate-in fade-in slide-in-from-top-3 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Shuffle className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-stone-500">
            Dispersión activa
          </span>
          <span className="text-[10px] font-black text-primary/70 bg-primary/8 px-2 py-0.5 rounded-full">
            {massVisualization.cantidadSecciones} secc.
          </span>
        </div>
        <button
          onClick={handleClose}
          className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-all"
          title="Cerrar visualización"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Color dots strip */}
      <div className="flex items-center gap-1 flex-wrap">
        {equipos.map(({ userId, color, blockId }) => (
          <button
            key={userId}
            onClick={() =>
              setMassVisualizationFilter(
                massVisualizationFilter === userId ? null : userId
              )
            }
            title={equipos[blockId]?.nombre}
            className={`w-4 h-4 rounded-full transition-all ring-offset-1 ${
              massVisualizationFilter === userId
                ? 'ring-2 ring-offset-1 scale-125'
                : massVisualizationFilter
                ? 'opacity-30 hover:opacity-70'
                : 'hover:scale-110'
            }`}
            style={{ backgroundColor: color, outlineColor: color }}
          />
        ))}
        {massVisualizationFilter && (
          <button
            onClick={() => setMassVisualizationFilter(null)}
            className="ml-1 text-[9px] font-black uppercase tracking-widest text-stone-400 hover:text-primary transition-colors"
          >
            ver todos
          </button>
        )}
      </div>

      {/* Select combobox */}
      <div className="relative">
        {activeColor && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full z-10"
            style={{ backgroundColor: activeColor }}
          />
        )}
        <select
          value={massVisualizationFilter ?? ''}
          onChange={e => setMassVisualizationFilter(e.target.value || null)}
          className={`w-full appearance-none bg-stone-50 border border-stone-200 rounded-xl py-2.5 pr-8 text-xs font-bold text-stone-700 outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all cursor-pointer ${activeColor ? 'pl-7' : 'pl-3'}`}
        >
          <option value="">Todos los equipos</option>
          {equipos.map(({ userId, nombre }) => (
            <option key={userId} value={userId}>
              {nombre}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400 pointer-events-none" />
      </div>
    </div>
  );
};
