import React from 'react';
import { authService } from '../services/authService';
import { UsuarioPerfil } from '../types';
import { LogOut, User, Map as MapIcon, ClipboardList, Bell, LayoutDashboard, TrendingUp } from 'lucide-react';
import { NotificationBell } from './notifications/NotificationBell';

interface NavbarProps {
  perfil: UsuarioPerfil | null;
  user: any;
  onLogout: () => void;
  currentView: 'map' | 'admin_gestion' | 'admin_monitor' | 'admin_users' | 'admin_stats' | 'profile' | 'tasks';
  onViewChange: (view: 'map' | 'admin_gestion' | 'admin_monitor' | 'admin_users' | 'admin_stats' | 'profile' | 'tasks') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ perfil, user, onLogout, currentView, onViewChange }) => {
  const isAdmin = perfil?.rol === 'admin';

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  return (
    <nav className="bg-surface/60 backdrop-blur-xl px-4 md:px-10 py-3 md:py-4 flex items-center justify-between sticky top-0 z-[100] civic-shadow">
      <div className="flex items-center gap-4 md:gap-6">
        <img
          src="/iesm-logo.png"
          alt="I.E.S.M."
          className="h-10 md:h-12 w-auto mix-blend-multiply opacity-90"
        />
        <div className="hidden sm:block">
          <span className="font-display font-extrabold text-sm md:text-xl text-primary tracking-tighter block leading-none">
            GeoNav <span className="text-primary-container/80">Morelos</span>
          </span>
          <span className="text-[9px] uppercase tracking-[0.25em] font-black text-on-surface-variant/40 mt-1 block">
            Instituto de Estudios Sociales
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-8">
        <div className="hidden lg:flex items-center bg-surface-container-low/50 p-1.5 rounded-2xl">
          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'map' ? 'bg-surface-container-lowest text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
              }`}
          >
            <MapIcon size={14} strokeWidth={2.5} />
            Mapa
          </button>
          {isAdmin ? (
            <>
              <button
                onClick={() => onViewChange('admin_gestion')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_gestion' ? 'bg-surface-container-lowest text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <ClipboardList size={14} strokeWidth={2.5} />
                Gestión
              </button>
              <button
                onClick={() => onViewChange('admin_monitor')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_monitor' ? 'bg-surface-container-lowest text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <LayoutDashboard size={14} strokeWidth={2.5} />
                Monitor
              </button>
              <button
                onClick={() => onViewChange('admin_stats')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_stats' ? 'bg-primary/5 text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <TrendingUp size={14} strokeWidth={2.5} />
                Estadísticas
              </button>
              <button
                onClick={() => onViewChange('admin_users')}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_users' ? 'bg-surface-container-lowest text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <User size={14} strokeWidth={2.5} />
                Usuarios
              </button>
            </>
          ) : (
            <button
              onClick={() => onViewChange('tasks')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${currentView === 'tasks' ? 'bg-surface-container-lowest text-primary civic-shadow' : 'text-on-surface-variant/40 hover:text-on-surface'
                }`}
            >
              <ClipboardList size={14} strokeWidth={2.5} />
              Mis Tareas
            </button>
          )}
        </div>

        <NotificationBell />

        {perfil && (
          <button
            onClick={() => onViewChange('profile')}
            className={`flex items-center gap-2 md:gap-4 px-2 md:px-4 py-2 rounded-2xl border-none transition-all ${currentView === 'profile'
              ? 'bg-primary/5'
              : 'hover:bg-surface-container-low/50'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${currentView === 'profile' ? 'premium-gradient text-white civic-shadow' : 'bg-surface-container-high text-on-surface-variant/50 group-hover:text-primary'
              }`}>
              <User size={20} strokeWidth={2.5} />
            </div>
            <div className="hidden xl:block text-left">
              <p className={`text-[13px] font-black leading-none tracking-tight ${currentView === 'profile' ? 'text-primary' : 'text-on-surface'}`}>
                {perfil.nombre}
              </p>
              <p className={`text-[9px] uppercase tracking-[0.2em] font-black mt-1.5 ${currentView === 'profile' ? 'text-primary/60' : 'text-on-surface-variant/30'}`}>
                {perfil.rol}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="group flex flex-col items-center justify-center gap-1 text-on-surface-variant/40 hover:text-red-600 transition-all"
          title="Cerrar Sesión"
        >
          <LogOut size={20} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform" />
          <span className="text-[9px] uppercase font-black tracking-widest hidden xs:block">Salir</span>
        </button>
      </div>
    </nav>
  );
};
