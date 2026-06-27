import React, { useMemo } from 'react';
import { AlertCircle, User } from 'lucide-react';
import { Tarea, UsuarioPerfil } from '../../types';
import { TEAM_HEX_COLORS } from '../../utils/teamColors';

interface UserStatsViewProps {
  usuarios: UsuarioPerfil[];
  tareas: Tarea[];
}

export const UserStatsView: React.FC<UserStatsViewProps> = ({ usuarios, tareas }) => {
  const fieldWorkerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    usuarios
      .filter(u => u.rol !== 'admin')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX', { sensitivity: 'base' }))
      .forEach((u, idx) => map.set(u.id, TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length]));
    return map;
  }, [usuarios]);

  const stats = useMemo(() => {
    return usuarios
      .filter(u => u.rol !== 'admin')
      .map(u => {
        const userTasks = tareas.filter(t =>
          t.user_id === u.id || (t.is_collaborative && t.collaborator_ids?.includes(u.id))
        );
        const completed = userTasks.filter(t => t.status === 'completada').length;
        const inProgress = userTasks.filter(t => t.status === 'en_progreso').length;
        const pending = userTasks.filter(t => t.status === 'pendiente').length;
        const total = userTasks.length;
        const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { user: u, total, completed, inProgress, pending, efficiency };
      })
      .sort((a, b) => b.efficiency - a.efficiency || b.total - a.total);
  }, [usuarios, tareas]);

  const globalStats = useMemo(() => {
    const total = tareas.length;
    const completed = tareas.filter(t => t.status === 'completada').length;
    const avgEfficiency = stats.length > 0
      ? Math.round(stats.reduce((acc, s) => acc + s.efficiency, 0) / stats.length)
      : 0;
    return { total, completed, avgEfficiency };
  }, [stats, tareas]);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Mission Header ── */}
      <div className="relative overflow-hidden rounded-[2rem] mb-6" style={{ background: '#1E0014' }}>
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="stats-grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#BC9B73" strokeWidth="0.4" opacity="0.08" />
            </pattern>
            <pattern id="stats-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#BC9B73" strokeWidth="0.8" opacity="0.12" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#stats-grid-minor)" />
          <rect width="100%" height="100%" fill="url(#stats-grid-major)" />
        </svg>
        <div className="relative z-10 p-8 md:p-10 flex items-end justify-between gap-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] font-black mb-4" style={{ color: '#BC9B73', opacity: 0.55 }}>
              Panel de Administración
            </p>
            <h2 className="font-display font-black text-3xl md:text-4xl leading-none tracking-tight" style={{ color: '#F5EDE8' }}>
              Estadísticas de
            </h2>
            <h2 className="font-display font-black text-3xl md:text-4xl leading-none tracking-tight" style={{ color: '#BC9B73' }}>
              Operación
            </h2>
            <p className="text-sm mt-4" style={{ color: '#F5EDE8', opacity: 0.35 }}>
              Rendimiento individual del personal de campo.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
            <p className="text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: '#BC9B73', opacity: 0.4 }}>
              Eficiencia promedio
            </p>
            <p className="font-display font-extralight text-4xl" style={{ color: '#F5EDE8', opacity: 0.8 }}>
              {globalStats.avgEfficiency}%
            </p>
          </div>
        </div>
        <div className="relative z-10 h-px" style={{ background: 'linear-gradient(to right, rgba(188,155,115,0.3), transparent)' }} />
      </div>

      {/* ── KPI Banner ── */}
      <div className="rounded-[2rem] mb-8 overflow-hidden" style={{ background: '#2D0020' }}>
        <div className="grid grid-cols-3" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
          {[
            { value: globalStats.total, label: 'Total de Tareas', sub: 'acumuladas' },
            { value: globalStats.completed, label: 'Completadas', sub: 'finalizadas' },
            { value: `${globalStats.avgEfficiency}%`, label: 'Eficiencia', sub: 'promedio de campo' },
          ].map(({ value, label, sub }, i) => (
            <div
              key={label}
              className="px-6 md:px-10 py-8 md:py-10 flex flex-col gap-1"
              style={i > 0 ? { borderLeft: '1px solid rgba(255,255,255,0.05)' } : {}}
            >
              <p className="font-display font-black text-4xl md:text-5xl leading-none" style={{ color: '#F5EDE8' }}>
                {value}
              </p>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] mt-3" style={{ color: '#BC9B73', opacity: 0.7 }}>
                {label}
              </p>
              <p className="text-[9px] font-medium" style={{ color: '#F5EDE8', opacity: 0.2 }}>
                {sub}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Leaderboard ── */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">Ranking de Rendimiento</p>
          <div className="flex-1 h-px" style={{ background: 'rgba(98,0,65,0.1)' }} />
          <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/20">
            {stats.length} evaluados
          </span>
        </div>

        {/* Desktop column headers */}
        <div
          className="hidden md:grid items-center px-6 text-[9px] font-black uppercase tracking-[0.25em] text-on-surface-variant/30 gap-4"
          style={{ gridTemplateColumns: '2.5rem 1fr 5rem 5rem 5rem 8rem' }}
        >
          <div className="text-center">#</div>
          <div>Supervisor</div>
          <div className="text-center">Pend.</div>
          <div className="text-center">Prog.</div>
          <div className="text-center">Hechas</div>
          <div className="text-right pr-1">Eficiencia</div>
        </div>

        <div className="space-y-2">
          {stats.map((s, index) => {
            const color = fieldWorkerColorMap.get(s.user.id) ?? '#808080';
            const isAtRisk = s.total > 0 && s.efficiency < 30;
            const effColor = s.efficiency >= 80 ? '#10b981' : s.efficiency >= 40 ? '#f59e0b' : '#ef4444';
            const isFirst = index === 0;

            return (
              <div
                key={s.user.id}
                className={`group bg-white rounded-2xl relative overflow-hidden border transition-all duration-300 hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)] ${
                  isAtRisk
                    ? 'border-red-200 hover:border-red-300'
                    : isFirst
                    ? 'border-amber-200/60 hover:border-amber-300/80'
                    : 'border-outline-variant/8 hover:border-outline-variant/20'
                }`}
              >
                <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />

                {/* Desktop row */}
                <div
                  className="hidden md:grid items-center px-6 py-4 gap-4"
                  style={{ gridTemplateColumns: '2.5rem 1fr 5rem 5rem 5rem 8rem' }}
                >
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black shrink-0 mx-auto"
                    style={isFirst
                      ? { background: 'rgba(251,191,36,0.15)', color: '#b45309' }
                      : { background: 'rgba(0,0,0,0.04)', color: 'rgba(28,28,23,0.3)' }
                    }
                  >
                    {index + 1}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {getInitials(s.user.nombre)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-on-surface text-[14px] tracking-tight truncate group-hover:text-primary transition-colors">
                        {s.user.nombre}
                      </p>
                      {isAtRisk && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="text-[9px] font-black text-red-500 uppercase tracking-wider">Riesgo de rezago</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-center">
                    <span className="text-[16px] font-black text-on-surface/25">{s.pending}</span>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[16px] font-black text-blue-500">{s.inProgress}</span>
                  </div>
                  <div className="flex justify-center">
                    <span className="text-[16px] font-black text-emerald-500">{s.completed}</span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 pr-1">
                    <span className="text-[13px] font-black" style={{ color: effColor }}>
                      {s.efficiency}%
                    </span>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${s.efficiency}%`, backgroundColor: effColor }}
                      />
                    </div>
                    <span className="text-[8px] font-bold text-on-surface-variant/25 uppercase tracking-widest">
                      {s.completed}/{s.total} tareas
                    </span>
                  </div>
                </div>

                {/* Mobile row */}
                <div className="md:hidden px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0"
                      style={isFirst
                        ? { background: 'rgba(251,191,36,0.15)', color: '#b45309' }
                        : { background: 'rgba(0,0,0,0.04)', color: 'rgba(28,28,23,0.3)' }
                      }
                    >
                      {index + 1}
                    </div>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {getInitials(s.user.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-on-surface text-[14px] tracking-tight truncate">{s.user.nombre}</p>
                      {isAtRisk && (
                        <div className="flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-red-500 shrink-0" />
                          <span className="text-[9px] font-black text-red-500 uppercase">Rezago</span>
                        </div>
                      )}
                    </div>
                    <span className="text-[15px] font-black shrink-0" style={{ color: effColor }}>
                      {s.efficiency}%
                    </span>
                  </div>
                  <div className="mt-3 pt-3 border-t border-outline-variant/8 flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-on-surface-variant/30 uppercase tracking-wider">Pend</span>
                      <span className="text-[13px] font-black text-on-surface/30">{s.pending}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-blue-400 uppercase tracking-wider">Prog</span>
                      <span className="text-[13px] font-black text-blue-500">{s.inProgress}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[8px] font-black text-emerald-400 uppercase tracking-wider">Hech</span>
                      <span className="text-[13px] font-black text-emerald-500">{s.completed}</span>
                    </div>
                    <div className="flex-1 flex items-center gap-2 ml-1">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${s.efficiency}%`, backgroundColor: effColor }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {stats.length === 0 && (
          <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-outline-variant/15">
            <div className="opacity-20 flex flex-col items-center gap-4">
              <User className="w-12 h-12 text-primary" />
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-on-surface">Sin datos disponibles</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
