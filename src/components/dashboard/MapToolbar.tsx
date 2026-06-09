import React from 'react';
import { Database, MapPin, Map, ChevronDown } from 'lucide-react';
import { useStore } from '../../store/useStore';

interface MapToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ searchTerm, setSearchTerm }) => {
  const selectedMunicipio = useStore(s => s.selectedMunicipio);
  const setSelectedMunicipio = useStore(s => s.setSelectedMunicipio);

  return (
    <div className="absolute top-24 md:top-8 z-[800] flex flex-col gap-4 items-end" style={{ right: '8rem' }}>
      {/* ComboBox Municipio */}
      <div className="bg-surface/95 backdrop-blur-xl p-4 rounded-3xl civic-shadow flex items-center gap-3 w-72 md:w-80 group border border-primary/5 transition-all focus-within:ring-2 focus-within:ring-primary/10 relative">
        <div className="premium-gradient p-3 rounded-2xl civic-shadow shadow-primary/20 text-white">
          <Map size={20} />
        </div>
        <div className="flex-1 flex flex-col min-w-0">
          <label className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest leading-none mb-1">
            Municipio a visualizar
          </label>
          <select
            value={selectedMunicipio || ''}
            onChange={(e) => setSelectedMunicipio(e.target.value || null)}
            className="bg-transparent border-none outline-none text-xs font-bold text-on-surface w-full appearance-none cursor-pointer pr-8 focus:ring-0"
          >
            <option value="" className="bg-surface text-on-surface">Seleccione Municipio...</option>
            <option value="Todos" className="bg-surface text-on-surface">Todos</option>
            <option value="Cuernavaca" className="bg-surface text-on-surface">Cuernavaca</option>
            <option value="Jiutepec" className="bg-surface text-on-surface">Jiutepec</option>
            <option value="Cuautla" className="bg-surface text-on-surface">Cuautla</option>
            <option value="Ayala" className="bg-surface text-on-surface">Ayala</option>
            <option value="Temixco" className="bg-surface text-on-surface">Temixco</option>
            <option value="Yautepec" className="bg-surface text-on-surface">Yautepec</option>
          </select>
        </div>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant/40">
          <ChevronDown size={16} />
        </div>
      </div>

      {/* Buscar Sección o Manzana */}
      <div className="bg-surface/95 backdrop-blur-xl p-4 rounded-3xl civic-shadow flex items-center gap-3 w-72 md:w-80 group transition-all focus-within:ring-2 focus-within:ring-primary/10">
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
