import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, CheckCircle2, AlertCircle, User, Award } from 'lucide-react';
import { Tarea, UsuarioPerfil } from '../../types';

interface UserStatsViewProps {
  usuarios: UsuarioPerfil[];
  tareas: Tarea[];
}

interface UserPerformance {
  user: UsuarioPerfil;
  total: number;
  completed: number;
  inProgress: number;
  pending: number;
  efficiency: number;
  lastActivity?: string;
}

export const UserStatsView: React.FC<UserStatsViewProps> = ({ usuarios, tareas }) => {
  const stats = useMemo(() => {
    return usuarios
      .filter(u => u.rol !== 'admin') // Enfocarnos en personal de campo
      .map(u => {
        const userTasks = tareas.filter(t => 
          t.user_id === u.id || (t.is_collaborative && t.collaborator_ids?.includes(u.id))
        );
        const completed = userTasks.filter(t => t.status === 'completada').length;
        const inProgress = userTasks.filter(t => t.status === 'en_progreso').length;
        const pending = userTasks.filter(t => t.status === 'pendiente').length;
        const total = userTasks.length;
        const efficiency = total > 0 ? Math.round((completed / total) * 100) : 0;

        return {
          user: u,
          total,
          completed,
          inProgress,
          pending,
          efficiency
        };
      })
      .sort((a, b) => b.efficiency - a.efficiency || b.total - a.total);
  }, [usuarios, tareas]);

  const globalStats = useMemo(() => {
    // Total de tareas únicas (sin duplicar colaboraciones en el conteo global)
    const total = tareas.length;
    const completed = tareas.filter(t => t.status === 'completada').length;
    const avgEfficiency = stats.length > 0 ? Math.round(stats.reduce((acc, curr) => acc + curr.efficiency, 0) / stats.length) : 0;
    
    return { total, completed, avgEfficiency };
  }, [stats]);

  const getEfficiencyColor = (eff: number) => {
    if (eff >= 80) return 'text-emerald-500 bg-emerald-50 border-emerald-100';
    if (eff >= 40) return 'text-amber-500 bg-amber-50 border-amber-100';
    return 'text-rose-500 bg-rose-50 border-rose-100';
  };

  const getProgressColor = (eff: number) => {
    if (eff >= 80) return 'bg-emerald-500';
    if (eff >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-4 md:px-6">
      {/* Resumen Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/50 p-4 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-[#8C3154]/10 flex items-center justify-center text-[#8C3154] shrink-0">
            <BarChart3 className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Tareas</p>
            <p className="text-3xl font-black text-stone-900">{globalStats.total}</p>
          </div>
        </div>
        
        <div className="bg-white/50 p-4 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
            <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Completadas</p>
            <p className="text-3xl font-black text-stone-900">{globalStats.completed}</p>
          </div>
        </div>

        <div className="bg-white/50 p-4 md:p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-4 md:gap-5">
          <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500 shrink-0">
            <TrendingUp className="w-6 h-6 md:w-7 md:h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Eficiencia Promedio</p>
            <p className="text-3xl font-black text-stone-900">{globalStats.avgEfficiency}%</p>
          </div>
        </div>
      </div>

      {/* Título de Sección */}
      <div className="flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-display font-black text-stone-900 tracking-tight">Ranking de Rendimiento</h2>
          <p className="text-stone-500 text-sm font-medium italic">Desempeño individual del personal de campo.</p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-stone-100 text-xs font-bold text-stone-400 flex items-center gap-2">
          <Award className="w-4 h-4 text-amber-500" />
          {stats.length} Usuarios Evaluados
        </div>
      </div>

      {/* Ranking Header - Synchronized Columns */}
      <div className="hidden md:flex items-center px-8 mb-4 text-[11px] font-black uppercase tracking-[0.25em] text-on-surface-variant opacity-80">
        <div className="w-[35%] pl-4">Operativos</div>
        <div className="w-[15%] text-center">Pend.</div>
        <div className="w-[15%] text-center">Prog.</div>
        <div className="w-[15%] text-center">Hechas</div>
        <div className="w-[20%] text-right pr-4">Eficiencia</div>
      </div>

      {/* Lista de Usuarios */}
      <div className="flex flex-col gap-6">
        {stats.map((s, index) => (
          <div 
            key={s.user.id} 
            className="group bg-white/70 backdrop-blur-md p-5 rounded-[2.5rem] shadow-sm border border-stone-100 hover:shadow-ambient transition-all duration-700 relative overflow-hidden"
          >
            <div className="flex flex-col md:flex-row md:items-center">
              
              {/* Column 1: Identity (35%) */}
              <div className="w-full md:w-[35%] flex items-center gap-5 pl-4 min-w-0">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-surface-container-low flex items-center justify-center text-primary font-black text-base md:text-lg border border-outline-variant/10 group-hover:bg-white transition-all duration-500">
                    {s.user.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-on-surface border-4 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm">
                    {index + 1}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-black text-on-surface tracking-tight leading-tight group-hover:text-primary transition-colors truncate">{s.user.nombre}</h3>
                  <p className="text-[12px] text-on-surface-variant font-medium tracking-tight opacity-50 italic truncate">{s.user.email || 'Sin correo'}</p>
                </div>
              </div>

              {/* Mobile Stats Grid / Desktop Columns */}
              <div className="flex-1 grid grid-cols-3 md:flex md:items-center mt-6 md:mt-0 border-t md:border-t-0 border-stone-100 pt-5 md:pt-0">
                {/* Column 2: Pendientes */}
                <div className="text-center px-1 border-r border-stone-100/50 md:border-r-0 md:w-[15%]">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] block mb-1">Pend.</span>
                  <p className="text-lg font-black text-stone-900 opacity-30 group-hover:opacity-100 transition-opacity">{s.pending}</p>
                </div>

                {/* Column 3: Progreso */}
                <div className="text-center px-1 border-r border-stone-100/50 md:border-r-0 md:w-[15%]">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] block mb-1">Prog.</span>
                  <p className="text-lg font-black text-blue-600 transition-all">{s.inProgress}</p>
                </div>

                {/* Column 4: Hechas */}
                <div className="text-center px-1 md:w-[15%]">
                  <span className="text-[9px] font-black text-stone-400 uppercase tracking-[0.15em] block mb-1">Hechas</span>
                  <p className="text-lg font-black text-emerald-600 transition-all">{s.completed}</p>
                </div>
              </div>

              {/* Column 5: Eficiencia (20%) */}
              <div className="w-full md:w-[20%] space-y-2 pr-4">
                <div className="flex justify-between items-end mb-1">
                  <span className="md:hidden text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">Eficiencia</span>
                  <span className={`text-[11px] font-black px-3 py-1 rounded-lg border shadow-sm ${getEfficiencyColor(s.efficiency)}`}>
                    {s.efficiency}%
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-container-low rounded-full overflow-hidden border border-outline-variant/5">
                  <div 
                    className={`h-full transition-all duration-1000 ${getProgressColor(s.efficiency)}`}
                    style={{ width: `${s.efficiency}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alerta de Rezago (Digital Curator Style) */}
            {s.total > 0 && s.efficiency < 30 && (
              <div className="mt-6 flex items-center gap-3 text-rose-600 bg-rose-50/50 p-3 rounded-2xl border border-rose-100/50 animate-pulse">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-wider">Usuario en riesgo de rezago institucional</span>
              </div>
            )}
          </div>
        ))}

        {stats.length === 0 && (
          <div className="py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
            <User className="w-12 h-12 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 font-display font-bold italic">No hay personal de campo registrado para evaluar.</p>
          </div>
        )}
      </div>
    </div>
  );
};
