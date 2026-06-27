import React, { useState } from 'react';
import { authService } from '../services/authService';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input } from './ui';

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
    <div className="min-h-screen flex font-sans">
      {/* Left panel — cartographic identity, desktop only */}
      <div
        className="hidden lg:flex flex-col justify-between w-[42%] relative overflow-hidden"
        style={{ background: '#1E0014' }}
      >
        {/* Cartographic grid */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="minor-grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#BC9B73" strokeWidth="0.4" opacity="0.08" />
            </pattern>
            <pattern id="major-grid" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#BC9B73" strokeWidth="0.8" opacity="0.13" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#minor-grid)" />
          <rect width="100%" height="100%" fill="url(#major-grid)" />
        </svg>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative z-10 p-12 pt-14"
        >
          <img
            src="/nuevologo.jpeg"
            alt="Instituto Morelense de Estudios Sociodemográficos"
            className="h-10 w-auto brightness-0 invert opacity-45"
          />
        </motion.div>

        {/* Coordinate hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 px-12"
        >
          <p
            className="text-[9px] uppercase tracking-[0.35em] font-black mb-6"
            style={{ color: '#BC9B73', opacity: 0.55 }}
          >
            Coordenadas de trabajo
          </p>
          <p
            className="font-display font-extralight leading-none"
            style={{ fontSize: '4.25rem', color: '#F5EDE8' }}
          >
            18.9°N
          </p>
          <p
            className="font-display font-extralight leading-none mt-3"
            style={{ fontSize: '4.25rem', color: '#F5EDE8', opacity: 0.3 }}
          >
            99.2°O
          </p>
          <div className="mt-8 space-y-1">
            <p
              className="font-display font-bold text-xl tracking-tight"
              style={{ color: '#F5EDE8' }}
            >
              Estado de Morelos
            </p>
            <p className="text-sm" style={{ color: '#BC9B73', opacity: 0.65 }}>
              México · Zona Centro
            </p>
          </div>
        </motion.div>

        {/* Scale reference */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.4, ease: 'easeOut' }}
          className="relative z-10 p-12 pb-14"
        >
          <div
            className="h-px w-full mb-3"
            style={{ background: 'linear-gradient(to right, rgba(188,155,115,0.25), transparent)' }}
          />
          <div className="flex justify-between">
            {['0', '25', '50', '75 km'].map((label) => (
              <span
                key={label}
                className="text-[8px] font-black uppercase tracking-wider"
                style={{ color: '#BC9B73', opacity: 0.3 }}
              >
                {label}
              </span>
            ))}
          </div>
          <p
            className="text-[9px] uppercase tracking-[0.25em] font-black mt-6"
            style={{ color: '#BC9B73', opacity: 0.25 }}
          >
            Sistema de Información Geográfica
          </p>
        </motion.div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-sm"
        >
          {/* Mobile-only logo */}
          <div className="lg:hidden flex justify-center mb-10">
            <img
              src="/nuevologo.jpeg"
              alt="Instituto Morelense de Estudios Sociodemográficos"
              className="h-16 w-auto mix-blend-multiply opacity-90"
            />
          </div>

          <div className="mb-10">
            <h1
              className="font-display font-extrabold leading-none tracking-tight"
              style={{ fontSize: '2.75rem', color: '#620041' }}
            >
              GeoNav
            </h1>
            <h1
              className="font-display font-extrabold leading-none tracking-tight"
              style={{ fontSize: '2.75rem', color: '#BC9B73' }}
            >
              Morelos
            </h1>
            <p className="text-on-surface-variant/40 mt-4 text-[10px] font-black uppercase tracking-[0.25em]">
              Acceso Supervisor de Campo
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Correo Electrónico"
              type="email"
              required
              placeholder="usuario@instituto.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              label="Contraseña"
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="p-4 bg-red-50 text-red-700 text-xs font-bold rounded-2xl border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={<LogIn size={18} strokeWidth={2.5} />}
              >
                Entrar al Sistema
              </Button>
            </div>
          </form>

          <div className="mt-12 pt-8 border-t border-on-surface-variant/8">
            <p className="text-[10px] text-on-surface-variant/30 font-medium leading-relaxed">
              Sistema de uso restringido.<br />
              Sin acceso, contacte al administrador.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
