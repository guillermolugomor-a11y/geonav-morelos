import React, { useState } from 'react';
import { authService } from '../services/authService';
import { LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { Button, Input, Card } from './ui';

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
        className="max-w-md w-full"
      >
        <Card padding="lg" shadow>
          <div className="flex flex-col items-center mb-10">
            <img
              src="/nuevologo.jpeg"
              alt="Instituto de Estudios Sociales de Morelos"
              className="w-64 h-auto mb-6 mix-blend-multiply opacity-90"
            />
            <h1 className="font-display text-2xl font-extrabold text-primary tracking-tight text-center leading-tight">
              Geonavegación <span className="text-primary-container">Morelos</span>
            </h1>
            <p className="text-on-surface-variant/60 mt-3 font-medium text-sm tracking-wide uppercase">
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
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
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

          <div className="mt-10 pt-8 border-t border-on-surface-variant/5 text-center">
            <p className="text-[10px] text-on-surface-variant/40 font-medium leading-relaxed">
              Este es un sistema de uso restringido.<br />
              Si no tiene acceso, contacte al administrador.
            </p>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
