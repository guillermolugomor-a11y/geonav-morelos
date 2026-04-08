import React from 'react';
import { Database, MapPin } from 'lucide-react';

interface MapToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ searchTerm, setSearchTerm }) => {
  return (
    <div className="absolute top-24 md:top-8 right-4 md:right-10 z-[1000] flex flex-col gap-4 items-end">
      <div className="bg-surface/95 backdrop-blur-xl p-2.5 rounded-3xl civic-shadow flex items-center gap-3 w-72 md:w-80 group transition-all focus-within:ring-2 focus-within:ring-primary/10">
        <div className="premium-gradient p-3 rounded-2xl civic-shadow shadow-primary/20">
          <Database size={20} className="text-white" />
        </div>
        <input
          type="text"
          placeholder="Buscar Sección o Manzana..."
          className="bg-transparent border-none outline-none text-sm font-bold text-on-surface w-full placeholder:text-on-surface-variant/30"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('reset-zoom'))}
          className="bg-surface/95 backdrop-blur-md text-on-surface-variant/60 p-4 rounded-2xl civic-shadow hover:text-primary transition-all active:scale-95 flex items-center justify-center"
          title="Restablecer vista"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6" />
            <path d="M9 21H3v-6" />
            <path d="M21 3l-7 7" />
            <path d="M3 21l7-7" />
          </svg>
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('locate-user'))}
          className="premium-gradient text-white px-6 py-4 rounded-2xl civic-shadow transition-all active:scale-95 flex items-center gap-3 group"
          title="Mi ubicación"
        >
          <MapPin size={20} strokeWidth={2.5} className="group-hover:animate-bounce" />
          <span className="text-xs font-black uppercase tracking-widest pr-1">Mi Ubicación</span>
        </button>
      </div>
    </div>
  );
};
