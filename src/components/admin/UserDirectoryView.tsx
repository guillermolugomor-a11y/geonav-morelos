import React, { useState } from 'react';
import { Shield, Search } from 'lucide-react';
import { UsuarioPerfil } from '../../types';

interface UserDirectoryViewProps {
  usuarios: UsuarioPerfil[];
}

export const UserDirectoryView: React.FC<UserDirectoryViewProps> = ({ usuarios }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = usuarios.filter(u => 
    u.nombre.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const getRoleBadgeStyle = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-[#fef8f9] text-primary border-[#620b27]/10';
      case 'field_worker': 
      case 'campo': return 'bg-stone-50 text-stone-500 border-stone-100';
      default: return 'bg-stone-50 text-stone-400 border-stone-100';
    }
  };

  const getRoleLabel = (rol: string) => {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'field_worker': 
      case 'campo': return 'Operativo';
      default: return rol.charAt(0).toUpperCase() + rol.slice(1);
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Section - More Minimal */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-6 border-b border-outline-variant/10">
        <div>
          <h1 className="text-4xl font-black text-on-surface tracking-tight leading-none mb-2">Usuarios</h1>
          <p className="text-[13px] text-on-surface-variant font-medium opacity-50 italic">
            Visualización estratégica del equipo de trabajo.
          </p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant opacity-30 group-focus-within:text-primary group-focus-within:opacity-100 transition-all" />
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-6 py-3 bg-white border border-outline-variant/5 rounded-xl focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all text-xs font-medium shadow-sm"
          />
        </div>
      </div>

      {/* Grid: More compact columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredUsers.length > 0 ? (
          filteredUsers.map((u) => (
            <div 
              key={u.id} 
              className="group bg-white rounded-[1.5rem] p-6 border border-outline-variant/5 hover:shadow-ambient transition-all duration-500 relative flex flex-col gap-4 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
              
              {/* Top Row: Role Badge & Initials */}
              <div className="flex items-center justify-between">
                <div className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-[0.15em] ${getRoleBadgeStyle(u.rol)}`}>
                  {getRoleLabel(u.rol)}
                </div>
                <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-primary font-black text-[10px] border border-outline-variant/10 group-hover:bg-primary-container group-hover:text-primary transition-all duration-500">
                  {getInitials(u.nombre)}
                </div>
              </div>

              {/* Middle: Identity */}
              <div className="space-y-1 min-w-0">
                <h3 className="text-[18px] font-black text-on-surface leading-tight tracking-tight group-hover:text-primary transition-colors truncate">
                  {u.nombre}
                </h3>
                <p className="text-[11px] text-on-surface-variant font-medium italic opacity-70 truncate group-hover:opacity-100 transition-opacity">
                  {u.email || 'institucional@morelos.gob.mx'}
                </p>
              </div>

              {/* Bottom: Subtle Info */}
              <div className="mt-2 pt-4 border-t border-outline-variant/5 flex items-center justify-between opacity-60 group-hover:opacity-100 transition-opacity">
                <div className="flex gap-6">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-70">Registro</span>
                    <span className="text-[10px] font-bold text-on-surface">
                      {new Date(u.created_at).toLocaleDateString('es-MX', { year: '2-digit', month: '2-digit' })}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-black uppercase tracking-widest text-on-surface-variant opacity-70">Última Conexión</span>
                    <span className="text-[10px] font-bold text-primary italic">
                      {u.last_login 
                        ? new Date(u.last_login).toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
                        : 'Sin registro'
                      }
                    </span>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                  <Shield className="w-3.5 h-3.5 text-primary opacity-40 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-32 text-center bg-white rounded-[2rem] border border-outline-variant/5 border-dashed">
            <div className="opacity-15 flex flex-col items-center gap-4">
              <Search className="w-12 h-12 text-primary" />
              <p className="text-[12px] font-black uppercase tracking-[0.4em] text-on-surface">Sin Resultados</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
