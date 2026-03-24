import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from '../components/Navbar';
import { MapView } from '../components/MapView';
import { AdminPanel } from '../components/AdminPanel';
import { UserProfile } from '../components/UserProfile';
import { UserTasks } from '../components/UserTasks';
import { PolygonSidebar } from '../components/PolygonSidebar';
import { UsuarioPerfil, Poligono } from '../types';
import { userService } from '../services/userService';
import { motion, AnimatePresence } from 'motion/react';
import { isAdminUser } from '../constants/roles';
import { MapToolbar } from '../components/dashboard/MapToolbar';
import { MapDebugCard } from '../components/dashboard/MapDebugCard';
import { useStore } from '../store/useStore';
import { debugError } from '../utils/debug';

interface DashboardProps {
  onLogout: () => void;
  onProfileUpdate: (updatedPerfil: UsuarioPerfil) => void;
}

import { BottomNav } from '../components/BottomNav';

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onProfileUpdate }) => {
  const { user, perfil, usuarios, setUsuarios, selectedPoligono, setSelectedPoligono } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'map' | 'admin_gestion' | 'admin_monitor' | 'admin_users' | 'admin_stats' | 'profile' | 'tasks'>('map');
  const [pendingFocusPolygonId, setPendingFocusPolygonId] = useState<number | null>(null);

  const isAdmin = isAdminUser(perfil);

  const handleFocusHandled = useCallback(() => {
    setPendingFocusPolygonId(null);
  }, []);

  const handleNavigateToMap = useCallback((poligonoId: number) => {
    setPendingFocusPolygonId(poligonoId);
    setView('map');
  }, []);

  useEffect(() => {
    if (isAdmin) {
      userService.getAssignableUsers().then(setUsuarios).catch(debugError);
    }
  }, [isAdmin, setUsuarios]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        const event = new CustomEvent('search-section', { detail: searchTerm });
        window.dispatchEvent(event);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  return (
    <div className="h-screen flex flex-col bg-[#F9F8F3] overflow-hidden font-jakarta">
      <Navbar perfil={perfil} user={user} onLogout={onLogout} currentView={view} onViewChange={setView} />

      <main className={`flex-1 relative flex overflow-hidden lg:px-8 lg:py-4 ${view !== 'map' ? 'pb-24 md:pb-0' : 'pb-20 md:pb-0'}`}>
        <AnimatePresence mode="wait">
          {view === 'map' ? (
            <motion.div
              key="map-view"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex-1 relative flex h-full"
            >
              <MapToolbar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
              <MapDebugCard user={user} perfil={perfil} />

              {/* Sidebar for details - Desktop */}
              <AnimatePresence>
                {selectedPoligono && (
                  <PolygonSidebar
                    poligono={selectedPoligono}
                    onClose={() => setSelectedPoligono(null)}
                  />
                )}
              </AnimatePresence>

              {/* Map Area */}
              <div className="flex-1 h-full">
                <MapView
                  focusPolygonId={pendingFocusPolygonId}
                  onFocusHandled={handleFocusHandled}
                />
              </div>
            </motion.div>
          ) : (view === 'admin_gestion' || view === 'admin_monitor' || view === 'admin_users' || view === 'admin_stats') && isAdmin ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex-1 px-4 py-8 md:p-8 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto mb-20 md:mb-0">
                <AdminPanel
                  perfil={perfil}
                  viewMode={
                    view === 'admin_gestion' ? 'gestion' : 
                    view === 'admin_monitor' ? 'monitor' : 
                    view === 'admin_stats' ? 'estadisticas' :
                    'usuarios'
                  }
                  onNavigateToMap={handleNavigateToMap}
                />
              </div>
            </motion.div>
          ) : view === 'profile' && perfil ? (
            <div className="flex-1 overflow-y-auto mb-20 md:mb-0">
              <UserProfile
                key="profile-view"
                perfil={perfil}
                onProfileUpdate={onProfileUpdate}
                onLogout={onLogout}
                onNavigateToMap={handleNavigateToMap}
              />
            </div>
          ) : view === 'tasks' && perfil ? (
            <div className="flex-1 overflow-y-auto mb-20 md:mb-0">
              <UserTasks
                key="tasks-view"
                perfil={perfil}
                onNavigateToMap={handleNavigateToMap}
              />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-stone-500 font-display italic">No tienes permisos para acceder a esta sección.</p>
            </div>
          )}
        </AnimatePresence>
      </main>

      <BottomNav
        currentView={view}
        onViewChange={setView}
        isAdmin={isAdmin}
      />
    </div>
  );
};
