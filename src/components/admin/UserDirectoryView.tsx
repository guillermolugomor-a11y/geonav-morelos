import React, { useState } from 'react';
import { User, Mail, Shield, Calendar, Search } from 'lucide-react';
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

  const getRoleBadgeColor = (rol: string) => {
    switch (rol) {
      case 'admin': return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'field_worker': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'campo': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-stone-100 text-stone-700 border-stone-200';
    }
  };

  const getRoleLabel = (rol: string) => {
    switch (rol) {
      case 'admin': return 'Administrador';
      case 'field_worker': return 'Personal de Campo';
      case 'campo': return 'Personal de Campo';
      default: return rol;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-stone-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-3xl font-display font-black text-stone-900 flex items-center gap-3 tracking-tight">
              <User className="w-8 h-8 text-[#8C3154]" />
              Directorio de Personal
            </h2>
            <p className="text-stone-500 mt-1 font-medium italic">Visualiza el equipo de trabajo registrado.</p>
          </div>

          <div className="relative group flex-1 md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-300 group-focus-within:text-[#8C3154] transition-colors" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-stone-50 border border-stone-100 rounded-2xl focus:ring-2 focus:ring-[#8C3154]/20 focus:border-[#8C3154] outline-none transition-all text-sm font-medium"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => (
              <div 
                key={u.id} 
                className="group relative bg-white border border-stone-100 p-6 rounded-[1.5rem] hover:shadow-xl hover:border-[#8C3154]/10 transition-all duration-300 overflow-hidden"
              >
                <div className="absolute -right-4 -top-4 w-24 h-24 bg-[#8C3154]/5 rounded-full blur-2xl group-hover:bg-[#8C3154]/10 transition-colors" />
                
                <div className="relative flex items-start gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-stone-100 to-stone-200 flex items-center justify-center text-stone-500 font-display font-black text-lg shadow-inner group-hover:scale-110 transition-transform">
                    {getInitials(u.nombre)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-stone-900 break-words pr-4">{u.nombre}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${getRoleBadgeColor(u.rol)}`}>
                        {getRoleLabel(u.rol)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center gap-3 text-stone-500">
                    <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium break-all">{u.email || 'Sin correo registrado'}</span>
                  </div>
                  
                  <div className="flex items-center gap-3 text-stone-500">
                    <div className="w-8 h-8 rounded-lg bg-stone-50 flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">Registro: {new Date(u.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-stone-50 rounded-3xl border border-dashed border-stone-200">
              <User className="w-12 h-12 text-stone-300 mx-auto mb-4" />
              <p className="text-stone-500 font-display font-bold italic">No se encontraron usuarios.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
