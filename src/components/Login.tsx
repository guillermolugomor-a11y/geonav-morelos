import React, { useState } from 'react';
import { authService } from '../services/authService';
import { LogIn, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

interface LoginProps {
  onLoginSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authService.login(email, password);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-surface-container-lowest rounded-3xl civic-shadow p-8 md:p-12"
      >
        <div className="flex flex-col items-center mb-10">
          <img
            src="/iesm-logo.png"
            alt="Instituto de Estudios Sociales de Morelos"
            className="w-64 h-auto mb-6 mix-blend-multiply opacity-90"
          />
          <h1 className="font-display text-2xl font-extrabold text-primary tracking-tight text-center leading-tight">
            Geonavegación <span className="text-primary-container">Morelos</span>
          </h1>
          <p className="text-on-surface-variant/60 mt-3 font-medium text-sm tracking-wide uppercase">Acceso Operativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/30 text-on-surface"
              placeholder="usuario@morelos.gob.mx"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-widest mb-2 ml-1">Contraseña</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 rounded-2xl bg-surface-container-low border-none focus:ring-2 focus:ring-primary/20 outline-none transition-all placeholder:text-on-surface-variant/30 text-on-surface"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <motion.div 
              initial={{ opacity: 0, x: -10 }} 
              animate={{ opacity: 1, x: 0 }}
              className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {error}
            </motion.div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full premium-gradient hover:opacity-90 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-3 civic-shadow disabled:opacity-50 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn size={18} strokeWidth={2.5} />
                  <span className="tracking-wide">Entrar al Sistema</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-10 pt-8 border-t border-on-surface-variant/5 text-center">
          <p className="text-[10px] text-on-surface-variant/40 font-medium leading-relaxed">
            Este es un sistema de uso restringido.<br />
            Si no tiene acceso, contacte al administrador.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
