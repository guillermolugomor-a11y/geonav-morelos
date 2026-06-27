import React from 'react';
import { MapPin, Car, Footprints, LayoutGrid, Target, X, Navigation } from 'lucide-react';
import { LatLng } from './RouteController';
import { geocodeService } from '../services/geocodeService';

export interface RoutingSidebarProps {
    isOpen?: boolean;
    isAdmin?: boolean;
    origin: LatLng | null;
    destination: LatLng | null;
    onUseMyLocationAsDestination: () => void;
    travelMode: 'driving' | 'foot';
    setTravelMode: (mode: 'driving' | 'foot') => void;
    onVerRuta: () => void;
    isRoutingActive: boolean;
    onCancelRouting: () => void;
    visibleLayers: {
        padron: boolean;
        nearManzanas: boolean;
    };
    setVisibleLayers: React.Dispatch<React.SetStateAction<{
        padron: boolean;
        nearManzanas: boolean;
    }>>;
}

const BORGONA = '#620041';
const DARK_BG = '#1E0014';
const CREAM = '#F5EDE8';
const GOLD = '#BC9B73';

export const RoutingSidebar: React.FC<RoutingSidebarProps> = ({
    isOpen = true,
    origin,
    destination,
    onUseMyLocationAsDestination,
    travelMode,
    setTravelMode,
    onVerRuta,
    isRoutingActive,
    onCancelRouting,
    visibleLayers,
    setVisibleLayers,
}) => {
    const [originAddress, setOriginAddress] = React.useState<string>('');
    const [destAddress, setDestAddress] = React.useState<string>('');

    React.useEffect(() => {
        if (origin) {
            setOriginAddress('Buscando dirección...');
            geocodeService.reverseGeocode(origin.lat, origin.lng)
                .then(addr => setOriginAddress(addr))
                .catch(() => setOriginAddress(`${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`));
        } else {
            setOriginAddress('');
        }
    }, [origin]);

    React.useEffect(() => {
        if (destination) {
            setDestAddress('Buscando dirección...');
            geocodeService.reverseGeocode(destination.lat, destination.lng)
                .then(addr => setDestAddress(addr))
                .catch(() => setDestAddress(`${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`));
        } else {
            setDestAddress('');
        }
    }, [destination]);

    if (!isOpen) return null;

    const waitingOrigin = isRoutingActive && !origin;
    const waitingDest   = isRoutingActive && !!origin && !destination;

    return (
        <div className="w-[260px] md:w-[300px] h-full bg-white flex flex-col relative z-[1000] overflow-hidden"
            style={{ boxShadow: '4px 0 24px rgba(0,0,0,0.08)' }}>

            {/* ── Mission Header ── */}
            <div className="relative overflow-hidden shrink-0" style={{ background: DARK_BG }}>
                <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
                    <defs>
                        <pattern id="sidebar-grid-minor" width="40" height="40" patternUnits="userSpaceOnUse">
                            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#BC9B73" strokeWidth="0.4" opacity="0.08" />
                        </pattern>
                        <pattern id="sidebar-grid-major" width="200" height="200" patternUnits="userSpaceOnUse">
                            <path d="M 200 0 L 0 0 0 200" fill="none" stroke="#BC9B73" strokeWidth="0.8" opacity="0.12" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#sidebar-grid-minor)" />
                    <rect width="100%" height="100%" fill="url(#sidebar-grid-major)" />
                </svg>

                <div className="relative z-10 px-6 pt-8 pb-6">
                    <img
                        src="/nuevologo.jpeg"
                        alt="Instituto Morelense de Estudios Sociodemográficos"
                        className="h-7 w-auto brightness-0 invert mb-5"
                        style={{ opacity: 0.35 }}
                    />
                    <p className="text-[9px] uppercase tracking-[0.35em] font-black mb-1.5" style={{ color: GOLD, opacity: 0.5 }}>
                        Sistema de Navegación
                    </p>
                    <h2 className="font-display font-black text-2xl leading-none tracking-tight" style={{ color: CREAM }}>
                        GeoNav
                    </h2>
                    <h2 className="font-display font-black text-2xl leading-none tracking-tight" style={{ color: GOLD }}>
                        Morelos
                    </h2>
                </div>

                <div className="relative z-10 h-px" style={{ background: 'linear-gradient(to right, rgba(188,155,115,0.3), transparent)' }} />
            </div>

            {/* ── Body ── */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-6">

                    {/* 01 · RUTA */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0"
                                style={{ background: BORGONA }}
                            >
                                01
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(28,28,23,0.5)' }}>
                                Ruta
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(98,0,65,0.08)' }} />
                        </div>

                        {/* Origin */}
                        <div
                            onClick={!isRoutingActive ? onVerRuta : undefined}
                            className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                                !isRoutingActive && !origin ? 'cursor-pointer hover:border-primary/30' : ''
                            }`}
                            style={{
                                borderColor: waitingOrigin
                                    ? `${BORGONA}55`
                                    : origin
                                    ? `${BORGONA}22`
                                    : 'rgba(28,28,23,0.08)',
                                boxShadow: waitingOrigin ? `0 0 0 3px rgba(98,0,65,0.08)` : undefined,
                            }}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: BORGONA }} />
                            <div className="flex items-center gap-3 pl-5 pr-4 py-3">
                                <div className="relative shrink-0">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{ background: 'rgba(98,0,65,0.09)' }}
                                    >
                                        <MapPin className="w-3.5 h-3.5" style={{ color: BORGONA }} />
                                    </div>
                                    {waitingOrigin && (
                                        <span
                                            className="absolute inset-0 rounded-lg animate-ping"
                                            style={{ background: 'rgba(98,0,65,0.18)' }}
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: `${BORGONA}88` }}>
                                        Origen
                                    </p>
                                    <p
                                        className="text-[11px] font-bold truncate mt-0.5"
                                        style={{ color: origin ? 'rgba(28,28,23,0.8)' : 'rgba(28,28,23,0.28)' }}
                                    >
                                        {origin
                                            ? originAddress || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`
                                            : waitingOrigin
                                            ? 'Haz clic en el mapa...'
                                            : 'Selecciona origen'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Destination */}
                        <div
                            onClick={!isRoutingActive ? onVerRuta : undefined}
                            className={`relative overflow-hidden rounded-2xl border transition-all duration-200 ${
                                !isRoutingActive && !destination ? 'cursor-pointer hover:border-tertiary/30' : ''
                            }`}
                            style={{
                                borderColor: waitingDest
                                    ? `${GOLD}88`
                                    : destination
                                    ? `${GOLD}33`
                                    : 'rgba(28,28,23,0.08)',
                                boxShadow: waitingDest ? `0 0 0 3px rgba(188,155,115,0.12)` : undefined,
                            }}
                        >
                            <div className="absolute left-0 top-0 bottom-0 w-1" style={{ background: GOLD }} />
                            <div className="flex items-center gap-3 pl-5 pr-3 py-3">
                                <div className="relative shrink-0">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center"
                                        style={{ background: 'rgba(188,155,115,0.1)' }}
                                    >
                                        <MapPin className="w-3.5 h-3.5" style={{ color: GOLD }} />
                                    </div>
                                    {waitingDest && (
                                        <span
                                            className="absolute inset-0 rounded-lg animate-ping"
                                            style={{ background: 'rgba(188,155,115,0.22)' }}
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: `${GOLD}99` }}>
                                        Destino
                                    </p>
                                    <p
                                        className="text-[11px] font-bold truncate mt-0.5"
                                        style={{ color: destination ? 'rgba(28,28,23,0.8)' : 'rgba(28,28,23,0.28)' }}
                                    >
                                        {destination
                                            ? destAddress || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`
                                            : waitingDest
                                            ? 'Haz clic en el mapa...'
                                            : 'Selecciona destino'}
                                    </p>
                                </div>
                                <button
                                    onClick={e => { e.stopPropagation(); onUseMyLocationAsDestination(); }}
                                    className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all hover:opacity-80 active:scale-95 shrink-0"
                                    style={{ background: BORGONA }}
                                    title="Usar mi ubicación"
                                >
                                    <Navigation className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    </section>

                    {/* 02 · TRANSPORTE */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0"
                                style={{ background: BORGONA }}
                            >
                                02
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(28,28,23,0.5)' }}>
                                Transporte
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(98,0,65,0.08)' }} />
                        </div>

                        <div
                            className="flex items-center gap-1 p-1.5 rounded-2xl"
                            style={{ background: 'rgba(28,28,23,0.05)' }}
                        >
                            <button
                                onClick={() => setTravelMode('driving')}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest"
                                style={travelMode === 'driving'
                                    ? { background: BORGONA, color: 'white', boxShadow: '0 2px 10px rgba(98,0,65,0.3)' }
                                    : { color: 'rgba(28,28,23,0.38)', background: 'transparent' }
                                }
                            >
                                <Car className="w-3.5 h-3.5" />
                                Auto
                            </button>
                            <button
                                onClick={() => setTravelMode('foot')}
                                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all text-[11px] font-black uppercase tracking-widest"
                                style={travelMode === 'foot'
                                    ? { background: GOLD, color: DARK_BG, boxShadow: '0 2px 10px rgba(188,155,115,0.4)' }
                                    : { color: 'rgba(28,28,23,0.38)', background: 'transparent' }
                                }
                            >
                                <Footprints className="w-3.5 h-3.5" />
                                Pie
                            </button>
                        </div>
                    </section>

                    {/* CTA */}
                    <div>
                        {!isRoutingActive ? (
                            <button
                                onClick={onVerRuta}
                                className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white transition-all hover:opacity-90 active:scale-[0.98]"
                                style={{
                                    background: `linear-gradient(135deg, ${BORGONA} 0%, #811B5A 100%)`,
                                    boxShadow: '0 4px 18px rgba(98,0,65,0.35)',
                                }}
                            >
                                Trazar Ruta
                            </button>
                        ) : (
                            <button
                                onClick={onCancelRouting}
                                className="w-full py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2.5"
                                style={{
                                    background: DARK_BG,
                                    color: CREAM,
                                    boxShadow: '0 4px 18px rgba(0,0,0,0.22)',
                                }}
                            >
                                <X className="w-4 h-4" />
                                Cancelar Ruta
                            </button>
                        )}
                    </div>

                    {/* 03 · CAPAS */}
                    <section className="space-y-3 pt-2" style={{ borderTop: '1px solid rgba(28,28,23,0.06)' }}>
                        <div className="flex items-center gap-2.5">
                            <span
                                className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black text-white shrink-0"
                                style={{ background: BORGONA }}
                            >
                                03
                            </span>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em]" style={{ color: 'rgba(28,28,23,0.5)' }}>
                                Capas del Mapa
                            </span>
                            <div className="flex-1 h-px" style={{ background: 'rgba(98,0,65,0.08)' }} />
                        </div>

                        <div className="space-y-1.5">
                            {/* Secciones */}
                            <div
                                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all"
                                style={{
                                    borderColor: visibleLayers.padron ? 'rgba(98,0,65,0.15)' : 'rgba(28,28,23,0.07)',
                                    background: visibleLayers.padron ? 'rgba(98,0,65,0.03)' : 'white',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                        style={{ background: visibleLayers.padron ? 'rgba(98,0,65,0.1)' : 'rgba(28,28,23,0.05)' }}
                                    >
                                        <Target
                                            className="w-3.5 h-3.5 transition-colors"
                                            style={{ color: visibleLayers.padron ? BORGONA : 'rgba(28,28,23,0.28)' }}
                                        />
                                    </div>
                                    <span
                                        className="text-[11px] font-black transition-colors"
                                        style={{ color: visibleLayers.padron ? 'rgba(28,28,23,0.85)' : 'rgba(28,28,23,0.35)' }}
                                    >
                                        Secciones
                                    </span>
                                </div>
                                <button
                                    onClick={() => setVisibleLayers(p => ({ ...p, padron: !p.padron }))}
                                    className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
                                    style={{ background: visibleLayers.padron ? BORGONA : 'rgba(28,28,23,0.12)' }}
                                >
                                    <span
                                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
                                        style={{ left: visibleLayers.padron ? '1.375rem' : '0.125rem' }}
                                    />
                                </button>
                            </div>

                            {/* Manzanas */}
                            <div
                                className="flex items-center justify-between gap-3 px-4 py-3 rounded-2xl border transition-all"
                                style={{
                                    borderColor: visibleLayers.nearManzanas ? 'rgba(188,155,115,0.25)' : 'rgba(28,28,23,0.07)',
                                    background: visibleLayers.nearManzanas ? 'rgba(188,155,115,0.04)' : 'white',
                                }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
                                        style={{ background: visibleLayers.nearManzanas ? 'rgba(188,155,115,0.12)' : 'rgba(28,28,23,0.05)' }}
                                    >
                                        <LayoutGrid
                                            className="w-3.5 h-3.5 transition-colors"
                                            style={{ color: visibleLayers.nearManzanas ? GOLD : 'rgba(28,28,23,0.28)' }}
                                        />
                                    </div>
                                    <span
                                        className="text-[11px] font-black transition-colors"
                                        style={{ color: visibleLayers.nearManzanas ? 'rgba(28,28,23,0.85)' : 'rgba(28,28,23,0.35)' }}
                                    >
                                        Manzanas
                                    </span>
                                </div>
                                <button
                                    onClick={() => setVisibleLayers(p => ({ ...p, nearManzanas: !p.nearManzanas }))}
                                    className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
                                    style={{ background: visibleLayers.nearManzanas ? GOLD : 'rgba(28,28,23,0.12)' }}
                                >
                                    <span
                                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200"
                                        style={{ left: visibleLayers.nearManzanas ? '1.375rem' : '0.125rem' }}
                                    />
                                </button>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
