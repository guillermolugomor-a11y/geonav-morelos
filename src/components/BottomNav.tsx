import React from 'react';
import { Map, ClipboardList, LayoutDashboard, User, TrendingUp, UserCircle } from 'lucide-react';

interface BottomNavProps {
  currentView: 'map' | 'admin_gestion' | 'admin_monitor' | 'admin_users' | 'admin_stats' | 'profile' | 'tasks';
  onViewChange: (view: any) => void;
  isAdmin: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onViewChange, isAdmin }) => {
  return (
    <div className="md:hidden fixed bottom-6 left-4 right-4 bg-surface/90 backdrop-blur-xl rounded-[32px] flex items-center justify-around px-4 py-4 z-[5000] civic-shadow border border-primary/5">
      <button
        onClick={() => onViewChange('map')}
        className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
          currentView === 'map' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
        }`}
      >
        <Map className={`w-5 h-5 ${currentView === 'map' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Mapa</span>
      </button>

      {isAdmin ? (
        <>
          <button
            onClick={() => onViewChange('admin_gestion')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
              currentView === 'admin_gestion' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
            }`}
          >
            <ClipboardList className={`w-5 h-5 ${currentView === 'admin_gestion' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Gestión</span>
          </button>
          <button
            onClick={() => onViewChange('admin_monitor')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
              currentView === 'admin_monitor' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
            }`}
          >
            <LayoutDashboard className={`w-5 h-5 ${currentView === 'admin_monitor' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Monitor</span>
          </button>
          <button
            onClick={() => onViewChange('admin_stats')}
            className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
              currentView === 'admin_stats' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
            }`}
          >
            <TrendingUp className={`w-5 h-5 ${currentView === 'admin_stats' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
            <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Estadística</span>
          </button>
        </>
      ) : (
        <button
          onClick={() => onViewChange('tasks')}
          className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
            currentView === 'tasks' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
          }`}
        >
          <ClipboardList className={`w-5 h-5 ${currentView === 'tasks' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Tareas</span>
        </button>
      )}

      <button
        onClick={() => onViewChange('profile')}
        className={`flex flex-col items-center gap-1.5 transition-all duration-500 ${
          currentView === 'profile' ? 'text-primary scale-110' : 'text-on-surface-variant/40'
        }`}
      >
        <UserCircle className={`w-5 h-5 ${currentView === 'profile' ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
        <span className="text-[8px] font-black uppercase tracking-[0.2em] font-display">Perfil</span>
      </button>
    </div>
  );
};
