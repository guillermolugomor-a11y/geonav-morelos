import { useEffect, useState } from 'react';
import { authService } from './services/authService';
import { Login } from './components/Login';
import { Dashboard } from './pages/Dashboard';
import { UsuarioPerfil } from './types';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [perfil, setPerfil] = useState<UsuarioPerfil | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial session
    const checkSession = async () => {
      try {
        const user = await authService.getCurrentUser();
        if (user) {
          setSession(user);
          const profileData = await authService.ensurePerfil(user);
          console.log('App: Perfil cargado:', profileData);
          setPerfil(profileData);
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  const handleLoginSuccess = async () => {
    const user = await authService.getCurrentUser();
    if (user) {
      setSession(user);
      const profileData = await authService.ensurePerfil(user);
      setPerfil(profileData);
    }
  };

  const handleLogout = () => {
    setSession(null);
    setPerfil(null);
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-stone-500 font-medium">Iniciando GeoNav...</p>
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait">
      {!session ? (
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
          <Dashboard 
            perfil={perfil} 
            user={session} 
            onLogout={handleLogout} 
            onProfileUpdate={setPerfil}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
