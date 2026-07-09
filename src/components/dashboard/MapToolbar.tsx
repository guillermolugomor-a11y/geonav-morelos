import React, { useRef, useState } from 'react';
import { Search, MapPin, RotateCcw, Map, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { DISTRITOS } from '../../constants/seccionesDistritos';
import { MUNICIPIOS } from '../../constants/seccionesMunicipios';

interface MapToolbarProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
}

export const MapToolbar: React.FC<MapToolbarProps> = ({ searchTerm, setSearchTerm }) => {
  const selectedDistrito = useStore(s => s.selectedDistrito);
  const setSelectedDistrito = useStore(s => s.setSelectedDistrito);
  const selectedMunicipio = useStore(s => s.selectedMunicipio);
  const setSelectedMunicipio = useStore(s => s.setSelectedMunicipio);
  const mapZonaTipo = useStore(s => s.mapZonaTipo);
  const setMapZonaTipo = useStore(s => s.setMapZonaTipo);
  const [searchFocused, setSearchFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isMunicipioMode = mapZonaTipo === 'municipio';

  const handleDistritoChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === '') setSelectedDistrito(null);
    else setSelectedDistrito(Number(val));
  };

  const handleMunicipioChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedMunicipio(val === '' ? null : val);
  };

  const districtLabel =
    selectedDistrito === null ? 'Distrito' :
    selectedDistrito === 0 ? 'Todos' :
    `D-${selectedDistrito}`;

  const municipioLabel =
    selectedMunicipio === null ? 'Municipio' :
    selectedMunicipio === 'ALL' ? 'Todos' :
    selectedMunicipio;

  const districtActive = selectedDistrito !== null && selectedDistrito !== 0;
  const municipioActive = selectedMunicipio !== null && selectedMunicipio !== 'ALL';
  const zonaActive = isMunicipioMode ? municipioActive : districtActive;
  const zonaLabel = isMunicipioMode ? municipioLabel : districtLabel;

  return (
    <div className="absolute top-4 right-4 z-[800] flex flex-col items-end gap-2">
      {/* ── Zona type toggle ── */}
      <div
        className="flex items-center h-8 rounded-xl border overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(20px)',
          borderColor: 'rgba(255,255,255,0.6)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
        }}
      >
        <button
          type="button"
          onClick={() => setMapZonaTipo('distrito')}
          className="px-3 h-full text-[10px] font-black uppercase tracking-widest transition-all"
          style={{
            background: !isMunicipioMode ? 'rgba(98,0,65,0.1)' : 'transparent',
            color: !isMunicipioMode ? '#620041' : 'rgba(74,69,62,0.4)',
          }}
        >
          Distrito
        </button>
        <button
          type="button"
          onClick={() => setMapZonaTipo('municipio')}
          className="px-3 h-full text-[10px] font-black uppercase tracking-widest transition-all"
          style={{
            background: isMunicipioMode ? 'rgba(98,0,65,0.1)' : 'transparent',
            color: isMunicipioMode ? '#620041' : 'rgba(74,69,62,0.4)',
          }}
        >
          Municipio
        </button>
      </div>

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
        {/* Zona selector (Distrito o Municipio) */}
        <div className="relative flex items-center h-full">
          <div
            className="flex items-center gap-2 px-4 h-full pointer-events-none select-none"
            style={{ color: zonaActive ? '#620041' : 'rgba(74,69,62,0.5)' }}
          >
            <Map className="w-3.5 h-3.5 shrink-0" />
            <span className="text-[11px] font-black uppercase tracking-widest whitespace-nowrap">
              {zonaLabel}
            </span>
            {zonaActive && (
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: '#620041' }} />
            )}
          </div>
          {isMunicipioMode ? (
            <select
              value={selectedMunicipio === null ? '' : selectedMunicipio}
              onChange={handleMunicipioChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full"
              aria-label="Seleccionar municipio"
            >
              <option value="">Seleccionar...</option>
              <option value="ALL">Todos los municipios</option>
              {MUNICIPIOS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          ) : (
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
          )}
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

      {/* Active zona chip */}
      {zonaActive && (
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
            {isMunicipioMode ? `Municipio ${selectedMunicipio} activo` : `Distrito ${selectedDistrito} activo`}
          </span>
          <button
            onClick={() => isMunicipioMode ? setSelectedMunicipio(null) : setSelectedDistrito(null)}
            className="transition-opacity hover:opacity-70"
            style={{ color: 'rgba(74,69,62,0.4)' }}
            aria-label={isMunicipioMode ? 'Quitar filtro de municipio' : 'Quitar filtro de distrito'}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
};
