import React from 'react';
import { Map, ClipboardList, LayoutDashboard, User, TrendingUp, UserCircle } from 'lucide-react';

interface BottomNavProps {
  currentView: 'map' | 'admin_gestion' | 'admin_monitor' | 'admin_users' | 'admin_stats' | 'profile' | 'tasks';
  onViewChange: (view: any) => void;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, isAdmin }) => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#F2F1E8]/95 backdrop-blur-xl border-t border-[#8C3154]/10 flex items-center justify-around px-2 py-3 z-[100] shadow-ambient">
      <button
        onClick={() => onViewChange('map')}
        className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
          currentView === 'map' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
        }`}
      >
        <Map className={`w-5 h-5 ${currentView === 'map' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Mapa</span>
      </button>

      {isAdmin ? (
        <>
          <button
            onClick={() => onViewChange('admin_gestion')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              currentView === 'admin_gestion' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${currentView === 'admin_gestion' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Gestión</span>
          </button>
          <button
            onClick={() => onViewChange('admin_monitor')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              currentView === 'admin_monitor' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${currentView === 'admin_monitor' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Monitor</span>
          </button>
          <button
            onClick={() => onViewChange('admin_stats')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              currentView === 'admin_stats' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${currentView === 'admin_stats' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Ranking</span>
          </button>
          <button
            onClick={() => onViewChange('admin_users')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
              currentView === 'admin_users' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
            }`}
          >
            <User className={`w-5 h-5 ${currentView === 'admin_users' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Gente</span>
          </button>
        </>
      ) : (
        <button
          onClick={() => onViewChange('tasks')}
          className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
            currentView === 'tasks' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
          }`}
        >
          <ClipboardList className={`w-5 h-5 ${currentView === 'tasks' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
          <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Tareas</span>
        </button>
      )}

      <button
        onClick={() => onViewChange('profile')}
        className={`flex flex-col items-center gap-1.5 transition-all duration-300 ${
          currentView === 'profile' ? 'text-[#8C3154] scale-110' : 'text-stone-400 opacity-60'
        }`}
      >
        <UserCircle className={`w-5 h-5 ${currentView === 'profile' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        <span className="text-[9px] font-black uppercase tracking-[0.1em] font-jakarta">Perfil</span>
      </button>
    </div>
  );
};
