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
    <nav className="bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <img
          src="https://rawcdn.githack.com/memolugo/DashboardATD/99fa30facd8b10adcd1bf684a1dbf5088248c303/Logoatd.svg"
          alt="ATD"
          className="h-10 w-auto"
        />
        <div className="h-6 w-px bg-stone-200 mx-1 hidden sm:block" />
        <span className="font-black text-xl text-on-surface tracking-tighter">GeoNav <span className="text-primary">Morelos</span></span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-surface-container-low p-1.5 rounded-2xl">
          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'map' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
              }`}
          >
            <MapIcon size={14} />
            Mapa
          </button>
          {isAdmin ? (
            <>
              <button
                onClick={() => onViewChange('admin_gestion')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_gestion' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <ClipboardList size={14} />
                Gestión
              </button>
              <button
                onClick={() => onViewChange('admin_monitor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_monitor' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <LayoutDashboard size={14} />
                Monitor
              </button>
              <button
                onClick={() => onViewChange('admin_stats')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_stats' ? 'bg-primary-container/10 text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <TrendingUp size={14} />
                Rendimiento
              </button>
              <button
                onClick={() => onViewChange('admin_users')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'admin_users' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                  }`}
              >
                <User size={14} />
                Usuarios
              </button>
            </>
          ) : (
            <button
              onClick={() => onViewChange('tasks')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${currentView === 'tasks' ? 'bg-white text-primary shadow-sm' : 'text-on-surface-variant/40 hover:text-on-surface'
                }`}
            >
              <ClipboardList size={14} />
              Mis Tareas
            </button>
          )}
        </div>

        <NotificationBell />

        {perfil && (
          <button
            onClick={() => onViewChange('profile')}
            className={`flex items-center gap-4 px-4 py-2 rounded-2xl border-none transition-all ${currentView === 'profile'
              ? 'bg-primary/5 shadow-sm'
              : 'bg-surface-container-low/50 hover:bg-surface-container-low'
              }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentView === 'profile' ? 'bg-primary text-white' : 'bg-white text-on-surface-variant/40 border border-outline-variant/10'
              }`}>
              <User size={20} strokeWidth={2.5} />
            </div>
            <div className="hidden sm:block text-left">
              <p className={`text-[13px] font-black leading-none tracking-tight ${currentView === 'profile' ? 'text-primary' : 'text-on-surface'}`}>
                {perfil.nombre}
              </p>
              <p className={`text-[9px] uppercase tracking-[0.2em] font-black mt-1.5 ${currentView === 'profile' ? 'text-primary/60' : 'text-on-surface-variant/40'}`}>
                {perfil.rol}
              </p>
            </div>
          </button>
        )}

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-stone-500 hover:text-red-600 transition-colors text-sm font-medium"
        >
          <LogOut size={18} />
          <span className="hidden sm:inline">Cerrar Sesión</span>
        </button>
      </div>
    </nav>
  );
};
