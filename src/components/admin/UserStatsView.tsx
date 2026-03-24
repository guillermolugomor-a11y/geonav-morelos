import React, { useMemo } from 'react';
import { BarChart3, TrendingUp, Clock, CheckCircle2, AlertCircle, User, Award } from 'lucide-react';
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
        const userTasks = tareas.filter(t => t.user_id === u.id);
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
    const total = stats.reduce((acc, curr) => acc + curr.total, 0);
    const completed = stats.reduce((acc, curr) => acc + curr.completed, 0);
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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12 px-1">
      {/* Resumen Global */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-[#8C3154]/10 flex items-center justify-center text-[#8C3154]">
            <BarChart3 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Total Tareas</p>
            <p className="text-3xl font-black text-stone-900">{globalStats.total}</p>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Completadas</p>
            <p className="text-3xl font-black text-stone-900">{globalStats.completed}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-stone-100 flex items-center gap-5">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-500">
            <TrendingUp className="w-7 h-7" />
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

      {/* Lista de Usuarios */}
      <div className="grid grid-cols-1 gap-4">
        {stats.map((s, index) => (
          <div 
            key={s.user.id} 
            className="group bg-white p-4 md:p-6 rounded-[1.5rem] shadow-sm border border-stone-100 hover:shadow-xl hover:border-[#8C3154]/10 transition-all duration-300"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
              {/* Información de Usuario */}
              <div className="flex items-center gap-4 min-w-[200px]">
                <div className="relative shrink-0">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-stone-100 flex items-center justify-center text-stone-500 font-display font-black text-base md:text-lg">
                    {s.user.nombre.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="absolute -top-2 -left-2 w-5 h-5 rounded-full bg-stone-900 border-2 border-white flex items-center justify-center text-[9px] font-black text-white">
                    {index + 1}
                  </div>
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-stone-900 leading-tight break-words">{s.user.nombre}</h3>
                  <p className="text-[10px] md:text-xs text-stone-400 mt-0.5 font-medium break-all">{s.user.email || 'Sin correo'}</p>
                </div>
              </div>

              {/* Métricas */}
              <div className="flex-1 grid grid-cols-3 gap-2 md:gap-4 md:px-6">
                <div className="text-center">
                  <p className="text-[8px] md:text-[9px] font-black text-stone-300 uppercase tracking-widest mb-1 flex items-center justify-center gap-1">
                    <Clock className="w-2 hs-2 md:w-2.5 md:h-2.5" /> Pend.
                  </p>
                  <p className="text-base md:text-lg font-black text-stone-700">{s.pending}</p>
                </div>
                <div className="text-center border-x border-stone-50">
                  <p className="text-[8px] md:text-[9px] font-black text-stone-300 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 text-blue-400">
                    <TrendingUp className="w-2 h-2 md:w-2.5 md:h-2.5" /> Prog.
                  </p>
                  <p className="text-base md:text-lg font-black text-blue-600">{s.inProgress}</p>
                </div>
                <div className="text-center">
                  <p className="text-[8px] md:text-[9px] font-black text-stone-300 uppercase tracking-widest mb-1 flex items-center justify-center gap-1 text-emerald-400">
                    <CheckCircle2 className="w-2 h-2 md:w-2.5 md:h-2.5" /> Hechas
                  </p>
                  <p className="text-base md:text-lg font-black text-emerald-600">{s.completed}</p>
                </div>
              </div>

              {/* Eficiencia Visual */}
              <div className="min-w-[140px] md:min-w-[180px] space-y-1 md:space-y-2">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] uppercase font-black text-stone-400 tracking-wider">Eficiencia</span>
                  <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${getEfficiencyColor(s.efficiency)}`}>
                    {s.efficiency}%
                  </span>
                </div>
                <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-1000 ${getProgressColor(s.efficiency)}`}
                    style={{ width: `${s.efficiency}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Alerta de Rezago */}
            {s.total > 0 && s.efficiency < 30 && (
              <div className="mt-4 flex items-center gap-2 text-rose-500 bg-rose-50/50 p-2 rounded-xl border border-rose-100">
                <AlertCircle className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-tight">Usuario en riesgo de rezago (Baja eficiencia)</span>
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
