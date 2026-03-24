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
        <span className="font-bold text-xl text-stone-900 tracking-tight">GeoNav <span className="text-[#8C3154]">Morelos</span></span>
      </div>

      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center bg-surface-container-low p-1 rounded-xl">
          <button
            onClick={() => onViewChange('map')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'map' ? 'bg-white text-primary shadow-sm' : 'text-stone-500 hover:text-stone-700'
              }`}
          >
            <MapIcon size={14} />
            Mapa
          </button>
          {isAdmin ? (
            <>
              <button
                onClick={() => onViewChange('admin_gestion')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'admin_gestion' ? 'bg-white text-primary shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <ClipboardList size={14} />
                Gestión
              </button>
              <button
                onClick={() => onViewChange('admin_monitor')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'admin_monitor' ? 'bg-white text-primary shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <LayoutDashboard size={14} />
                Monitor
              </button>
              <button
                onClick={() => onViewChange('admin_stats')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'admin_stats' ? 'bg-[#8C3154]/10 text-[#8C3154] shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <TrendingUp size={14} />
                Rendimiento
              </button>
              <button
                onClick={() => onViewChange('admin_users')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'admin_users' ? 'bg-white text-primary shadow-sm' : 'text-stone-500 hover:text-stone-700'
                  }`}
              >
                <User size={14} />
                Usuarios
              </button>
            </>
          ) : (
            <button
              onClick={() => onViewChange('tasks')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currentView === 'tasks' ? 'bg-white text-[#BC9B73] shadow-sm' : 'text-stone-500 hover:text-stone-700'
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
            className={`flex items-center gap-3 px-3 py-1.5 rounded-full border transition-all ${currentView === 'profile'
              ? 'bg-[#8C3154]/5 border-[#8C3154]/20 shadow-sm'
              : 'bg-stone-50 border-stone-100 hover:bg-stone-100'
              }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentView === 'profile' ? 'bg-[#8C3154]/10 text-[#8C3154]' : 'bg-stone-200 text-stone-500'
              }`}>
              <User size={18} />
            </div>
            <div className="hidden sm:block text-left">
              <p className={`text-sm font-semibold leading-none ${currentView === 'profile' ? 'text-[#8C3154]' : 'text-stone-800'}`}>
                {perfil.nombre}
              </p>
              <p className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 ${currentView === 'profile' ? 'text-[#8C3154]' : 'text-stone-500'}`}>
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
