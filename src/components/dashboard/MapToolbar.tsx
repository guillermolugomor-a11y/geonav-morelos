import React from 'react';
import { Database, MapPin } from 'lucide-react';

interface MapToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="absolute top-6 right-6 z-10 flex flex-col gap-2 items-end">
      <div className="bg-white/90 backdrop-blur-sm p-2 rounded-2xl shadow-xl border border-stone-200 flex items-center gap-2 w-64">
        <div className="bg-stone-100 p-2 rounded-xl">
          <Database size={18} className="text-[#8C3154]" />
        </div>
        <input
          type="text"
          placeholder="Ej: 188 o 188-5"
          className="bg-transparent border-none outline-none text-sm font-medium text-stone-800 w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('reset-zoom'))}
          className="bg-white hover:bg-stone-50 text-stone-700 p-3 rounded-full shadow-lg border border-stone-200 transition-all active:scale-95 flex items-center gap-2"
          title="Restablecer vista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('locate-user'))}
          className="bg-[#8C3154] hover:bg-[#7a2a49] text-white p-3 rounded-full shadow-lg transition-all active:scale-95 flex items-center gap-2"
          title="Mi ubicación"
        >
          <MapPin size={20} />
          <span className="text-xs font-bold pr-1">Mi Ubicación</span>
        </button>
      </div>
    </div>
  );
};
