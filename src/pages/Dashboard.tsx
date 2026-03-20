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

interface DashboardProps {
  onLogout: () => void;
  onProfileUpdate: (updatedPerfil: UsuarioPerfil) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onLogout, onProfileUpdate }) => {
  const { user, perfil, usuarios, setUsuarios, selectedPoligono, setSelectedPoligono } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState<'map' | 'admin_gestion' | 'admin_monitor' | 'profile' | 'tasks'>('map');
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
      userService.getAssignableUsers().then(setUsuarios).catch(console.error);
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
    <div className="h-screen flex flex-col bg-stone-50 overflow-hidden">
      <Navbar perfil={perfil} user={user} onLogout={onLogout} currentView={view} onViewChange={setView} />

      <main className="flex-1 relative flex overflow-hidden">
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
          ) : (view === 'admin_gestion' || view === 'admin_monitor') && isAdmin ? (
            <motion.div
              key="admin-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex-1 p-8 overflow-y-auto"
            >
              <div className="max-w-4xl mx-auto">
                <AdminPanel
                  perfil={perfil}
                  viewMode={view === 'admin_gestion' ? 'gestion' : 'monitor'}
                  onNavigateToMap={handleNavigateToMap}
                />
              </div>
            </motion.div>
          ) : view === 'profile' && perfil ? (
            <UserProfile
              key="profile-view"
              perfil={perfil}
              onProfileUpdate={onProfileUpdate}
              onNavigateToMap={handleNavigateToMap}
            />
          ) : view === 'tasks' && perfil ? (
            <UserTasks
              key="tasks-view"
              perfil={perfil}
              onNavigateToMap={handleNavigateToMap}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-500">No tienes permisos para acceder a esta sección.</p>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};
