import React from 'react';
import { UsuarioPerfil } from '../../types';

interface MapDebugCardProps {
  user: any;
  perfil: UsuarioPerfil | null;
}

export const MapDebugCard: React.FC<MapDebugCardProps> = ({ user, perfil }) => {
  return (
    <div className="absolute bottom-4 left-4 z-50 opacity-10 hover:opacity-100 transition-opacity">
      <div className="bg-black/80 text-white p-3 rounded-lg text-[10px] font-mono">
        <p>User ID: {user?.id}</p>
        <p>Profile ID: {perfil?.id}</p>
        <p>Rol: {perfil?.rol}</p>
      </div>
    </div>
  );
};
