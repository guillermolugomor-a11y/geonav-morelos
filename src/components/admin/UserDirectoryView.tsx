import React, { useMemo, useState } from 'react';
import { Shield, Search, Users } from 'lucide-react';
import { UsuarioPerfil } from '../../types';
import { TEAM_HEX_COLORS } from '../../utils/teamColors';

interface UserDirectoryViewProps {
  usuarios: UsuarioPerfil[];
}

export const UserDirectoryView: React.FC<UserDirectoryViewProps> = ({ usuarios }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const fieldWorkerColorMap = useMemo(() => {
    const map = new Map<string, string>();
    usuarios
      .filter(u => u.rol !== 'admin')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es-MX', { sensitivity: 'base' }))
      .forEach((u, idx) => map.set(u.id, TEAM_HEX_COLORS[idx % TEAM_HEX_COLORS.length]));
    return map;
  }, [usuarios]);

  const filteredUsers = usuarios
    .filter(u =>
      u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, undefined, { numeric: true, sensitivity: 'base' }));

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);

  const admins = filteredUsers.filter(u => u.rol === 'admin');
  const fieldWorkers = filteredUsers.filter(u => u.rol !== 'admin');
  const adminCount = usuarios.filter(u => u.rol === 'admin').length;
  const fieldCount = usuarios.filter(u => u.rol !== 'admin').length;

  return (
    <div className="animate-in fade-in duration-500">
      {/* ── Mission Header ── */}
      <div className="relative overflow-hidden rounded-[2rem] mb-6" style={{ background: '#1E0014' }}>
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <defs>
            <pattern id="users-grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#BC9B73" strokeWidth="0.4" opacity="0.08" />
            </pattern>
            <pattern id="users-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
              <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#BC9B73" strokeWidth="0.8" opacity="0.12" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#users-grid-minor)" />
          <rect width="100%" height="100%" fill="url(#users-grid-major)" />
        </svg>
        <div className="relative z-10 p-8 md:p-10 flex items-end justify-between gap-8">
          <div>
            <p className="text-[9px] uppercase tracking-[0.35em] font-black mb-4" style={{ color: '#BC9B73', opacity: 0.55 }}>
              Panel de Administración
            </p>
            <h2 className="font-display font-black text-3xl md:text-4xl leading-none tracking-tight" style={{ color: '#F5EDE8' }}>
              Registro de
            </h2>
            <h2 className="font-display font-black text-3xl md:text-4xl leading-none tracking-tight" style={{ color: '#BC9B73' }}>
              Personal
            </h2>
            <p className="text-sm mt-4" style={{ color: '#F5EDE8', opacity: 0.35 }}>
              Directorio del equipo institucional de trabajo.
            </p>
          </div>
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
            <p className="text-[9px] uppercase tracking-[0.25em] font-black" style={{ color: '#BC9B73', opacity: 0.4 }}>
              Equipo
            </p>
            <p className="font-display font-extralight text-3xl" style={{ color: '#F5EDE8', opacity: 0.7 }}>
              {usuarios.length}
            </p>
            <p className="text-[10px]" style={{ color: '#BC9B73', opacity: 0.4 }}>
              {adminCount} admin · {fieldCount} campo
            </p>
          </div>
        </div>
        <div className="relative z-10 h-px" style={{ background: 'linear-gradient(to right, rgba(188,155,115,0.3), transparent)' }} />
      </div>

      {/* Search + Count */}
      <div className="flex items-center justify-between gap-4 mb-8">
        <div className="relative group flex-1 max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <input
            type="text"
            placeholder="Buscar por nombre o correo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-5 py-3 bg-white border border-outline-variant/10 rounded-xl focus:ring-2 focus:ring-primary/15 outline-none transition-all text-[13px] font-medium shadow-sm"
          />
        </div>
        <span className="text-[11px] font-black text-on-surface-variant/30 uppercase tracking-widest whitespace-nowrap">
          {filteredUsers.length} {filteredUsers.length === 1 ? 'persona' : 'personas'}
        </span>
      </div>

      <div className="space-y-10">
        {/* ── Administración ── */}
        {admins.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-primary/40">Administración</p>
              <div className="flex-1 h-px" style={{ background: 'rgba(98,0,65,0.1)' }} />
            </div>
            <div className="space-y-2">
              {admins.map((u) => (
                <div
                  key={u.id}
                  className="group bg-white rounded-2xl flex items-center gap-5 px-6 py-5 border border-primary/8 hover:border-primary/20 hover:shadow-[0_4px_20px_rgba(98,0,65,0.08)] transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: '#620041' }} />
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-sm"
                    style={{ background: 'linear-gradient(135deg, #620041 0%, #811B5A 100%)' }}
                  >
                    {getInitials(u.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <p className="font-black text-on-surface text-[15px] tracking-tight truncate">{u.nombre}</p>
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-primary bg-primary/8 px-2 py-1 rounded-lg shrink-0">
                        Administrador
                      </span>
                    </div>
                    <p className="text-[11px] text-on-surface-variant/50 font-medium truncate mt-0.5">
                      {u.email || 'correo@instituto.org'}
                    </p>
                  </div>
                  <div className="hidden md:flex items-center gap-6 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity">
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Registro</span>
                      <span className="text-[11px] font-bold text-on-surface/70">
                        {new Date(u.created_at).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-0.5">
                      <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Último acceso</span>
                      <span className="text-[11px] font-bold text-primary/70">
                        {u.last_login
                          ? new Date(u.last_login).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
                          : '—'}
                      </span>
                    </div>
                    <Shield className="w-4 h-4 text-primary/30 group-hover:text-primary/60 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Supervisores de Campo ── */}
        {fieldWorkers.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-on-surface-variant/30">
                Supervisores de Campo
              </p>
              <div className="flex-1 h-px bg-on-surface-variant/8" />
              <span className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/20">
                {fieldWorkers.length}
              </span>
            </div>
            <div className="space-y-1.5">
              {fieldWorkers.map((u, idx) => {
                const color = fieldWorkerColorMap.get(u.id) ?? '#808080';
                return (
                  <div
                    key={u.id}
                    className="group bg-white rounded-2xl flex items-center gap-4 px-6 py-4 border border-outline-variant/8 hover:border-outline-variant/20 hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-300 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ background: color }} />
                    <span className="text-[10px] font-black text-on-surface-variant/20 w-5 text-right shrink-0 tabular-nums">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-[11px] text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {getInitials(u.nombre)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-on-surface text-[14px] tracking-tight truncate group-hover:text-primary transition-colors">
                        {u.nombre}
                      </p>
                      <p className="text-[10px] text-on-surface-variant/40 font-medium truncate">
                        {u.email || 'correo@instituto.org'}
                      </p>
                    </div>
                    <div className="hidden md:flex items-center gap-6 shrink-0 opacity-30 group-hover:opacity-100 transition-opacity">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Registro</span>
                        <span className="text-[11px] font-bold text-on-surface/70">
                          {new Date(u.created_at).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant/40">Último acceso</span>
                        <span className="text-[11px] font-bold" style={{ color }}>
                          {u.last_login
                            ? new Date(u.last_login).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit' })
                            : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {filteredUsers.length === 0 && (
          <div className="py-24 text-center bg-white rounded-2xl border border-dashed border-outline-variant/15">
            <div className="opacity-20 flex flex-col items-center gap-4">
              <Users className="w-12 h-12 text-primary" />
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-on-surface">Sin resultados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
