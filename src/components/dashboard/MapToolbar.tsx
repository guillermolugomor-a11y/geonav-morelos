import React, { useRef, useState } from 'react';
import { Search, MapPin, RotateCcw, Map, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DISTRITOS } from '../../constants/seccionesDistritos';

interface MapToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ searchTerm, setSearchTerm }) => {
  const selectedDistrito = useStore(s => s.selectedDistrito);
  const setSelectedDistrito = useStore(s => s.setSelectedDistrito);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') setSelectedDistrito(null);
    else setSelectedDistrito(Number(val));
  };

  const districtLabel =
    selectedDistrito === null ? 'Distrito' :
    selectedDistrito === 0 ? 'Todos' :
    `D-${selectedDistrito}`;

  const districtActive = selectedDistrito !== null && selectedDistrito !== 0;

  return (
    <div className="absolute top-4 right-4 z-[800] flex flex-col items-end gap-2">
      {/* ── Main HUD bar ── */}
      <div
        className="flex items-center h-12 rounded-2xl border transition-all duration-300"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderColor: searchFocused ? 'rgba(98,0,65,0.25)' : 'rgba(255,255,255,0.6)',
          boxShadow: searchFocused
            ? '0 8px 32px rgba(98,0,65,0.14), 0 2px 8px rgba(0,0,0,0.06)'
            : '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.05)',
        }}
      >
        {/* District selector */}
        <div className="relative flex items-center h-full">
          <div
            className="flex items-center gap-2 px-4 h-full pointer-events-none select-none"
            style={{ color: districtActive ? '#620041' : 'rgba(74,69,62,0.5)' }}
          >
            <Map className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {districtLabel}
            </span>
            {districtActive && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#620041' }} />
            )}
          </div>
          <select
            value={selectedDistrito === null ? '' : selectedDistrito}
            onChange={handleDistritoChange}
            className="absolute inset-0 opacity-0 cursor-pointer w-full"
            aria-label="Seleccionar distrito"
          >
            <option value="">Seleccionar...</option>
            <option value={0}>Todos los distritos</option>
            {DISTRITOS.map(d => (
              <option key={d} value={d}>Distrito {d}</option>
            ))}
          </select>
        </div>

        {/* Divider */}
        <div className="w-px h-6 shrink-0" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {/* Search input */}
        <div className="flex items-center gap-2 px-4 min-w-[160px] md:min-w-[200px]">
          <Search
            className="w-3.5 h-3.5 shrink-0 transition-colors duration-200"
            style={{ color: searchFocused || searchTerm ? '#620041' : 'rgba(74,69,62,0.3)' }}
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="Sección o Manzana..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            className="bg-transparent border-none outline-none ring-0 text-[12px] font-bold text-on-surface placeholder:font-medium w-full"
            style={{ caretColor: '#620041' }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); inputRef.current?.focus(); }}
              className="shrink-0 transition-opacity hover:opacity-70"
              style={{ color: 'rgba(74,69,62,0.4)' }}
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-6 shrink-0" style={{ background: 'rgba(0,0,0,0.08)' }} />

        {/* Action buttons */}
        <div className="flex items-center gap-1 px-2 h-full">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('reset-zoom'))}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all"
            style={{ color: 'rgba(74,69,62,0.4)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#620041'; (e.currentTarget as HTMLElement).style.background = 'rgba(98,0,65,0.07)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(74,69,62,0.4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            title="Restablecer vista"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('locate-user'))}
            className="w-8 h-8 flex items-center justify-center rounded-xl text-white transition-all hover:opacity-90 active:scale-95"
            style={{ background: '#620041' }}
            title="Mi ubicación"
          >
            <MapPin className="w-4 h-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Active district chip */}
      {districtActive && (
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl border animate-in fade-in slide-in-from-top-2 duration-200"
          style={{
            background: 'rgba(255,255,255,0.95)',
            backdropFilter: 'blur(16px)',
            borderColor: 'rgba(98,0,65,0.15)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <span className="text-[9px] font-black uppercase tracking-[0.25em]" style={{ color: '#620041' }}>
            Distrito {selectedDistrito} activo
          </span>
          <button
            onClick={() => setSelectedDistrito(null)}
            className="transition-opacity hover:opacity-70"
            style={{ color: 'rgba(74,69,62,0.4)' }}
            aria-label="Quitar filtro de distrito"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
