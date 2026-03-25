import { useEffect } from 'react';
import { authService } from './services/authService';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationProvider } from './components/notifications/NotificationContext';
import { useStore } from './store/useStore';

export default function App() {
  const user = useStore(s => s.user);
  const perfil = useStore(s => s.perfil);
  const appLoading = useStore(s => s.appLoading);
  const setUser = useStore(s => s.setUser);
  const setPerfil = useStore(s => s.setPerfil);
  const setAppLoading = useStore(s => s.setAppLoading);
  const logout = useStore(s => s.logout);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const currentUser = await authService.getCurrentUser();
        if (currentUser) {
          setUser(currentUser);
          const profileData = await authService.ensurePerfil(currentUser);
          setPerfil(profileData);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setAppLoading(false);
      }
    };

    checkSession();
  }, [setUser, setPerfil, setAppLoading]);

  const handleLoginSuccess = async () => {
    const currentUser = await authService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      const profileData = await authService.ensurePerfil(currentUser);
      setPerfil(profileData);
    }
  };

  const handleLogout = async () => {
    await authService.logout();
    logout();
  };

  if (appLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#8C3154] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">Iniciando I.E.S.M....</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!user ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <Login onLoginSuccess={handleLoginSuccess} />
        </motion.div>
      ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="h-screen"
        >
          <NotificationProvider userId={user?.id}>
            <Dashboard
              onLogout={handleLogout}
              onProfileUpdate={setPerfil}
            />
          </NotificationProvider>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
