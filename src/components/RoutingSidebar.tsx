import React from 'react';
import { Navigation, MapPin, Car, Footprints, Layers, Hexagon, LayoutGrid, Target, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LatLng } from './RouteController';
import { geocodeService } from '../services/geocodeService';

export interface RoutingSidebarProps {
    isOpen?: boolean; // For mobile toggle logic
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
    setVisibleLayers
}) => {
    const [originAddress, setOriginAddress] = React.useState<string>('');
    const [destAddress, setDestAddress] = React.useState<string>('');

    React.useEffect(() => {
        if (origin) {
            setOriginAddress('Buscando dirección...');
            geocodeService.reverseGeocode(origin.lat, origin.lng)
                .then(address => setOriginAddress(address))
                .catch(() => setOriginAddress(`${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}`));
        } else {
            setOriginAddress('');
        }
    }, [origin]);

    React.useEffect(() => {
        if (destination) {
            setDestAddress('Buscando dirección...');
            geocodeService.reverseGeocode(destination.lat, destination.lng)
                .then(address => setDestAddress(address))
                .catch(() => setDestAddress(`${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}`));
        } else {
            setDestAddress('');
        }
    }, [destination]);

    if (!isOpen) return null;

    return (
        <div className="w-80 h-full md:w-[320px] bg-[#F2F1E8] border-r border-[#8C3154]/10 flex flex-col shadow-2xl relative z-[1000] overflow-y-auto">
            {/* HEADER INSTITUCIONAL 2024-2030 */}
            <div className="p-8 border-b border-[#8C3154]/10 flex flex-col items-center justify-center bg-[#F2F1E8] shadow-sm">
                <div className="bg-white/50 p-2 rounded-2xl w-full">
                    <img
                        src="/logo.png"
                        alt="Instituto de Estudios Sociales de Morelos"
                        className="w-full h-auto mix-blend-multiply"
                    />
                </div>
            </div>

            <div className="p-4 space-y-6 flex-1">
                {/* CONFIGURACIÓN DE RUTA */}
                <section>
                    <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Configuración de Ruta</h2>
                    <div className="space-y-4">
                        {/* Origen */}
                        <div
                            onClick={!isRoutingActive ? onVerRuta : undefined}
                            className={`p-3 rounded-xl border cursor-pointer ${isRoutingActive && !origin ? 'border-[#8C3154] bg-[#8C3154]/5 shadow-sm' : 'border-[#8C3154]/20 bg-white hover:border-[#8C3154]/40'} flex items-center gap-3 transition-colors`}
                        >
                            <div className="bg-stone-100 p-2 rounded-full text-slate-400">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div className="flex-1 w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punto de Origen</p>
                                <p className="text-xs font-medium text-slate-600 mt-0.5 truncate" title={originAddress || (origin ? `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : '')}>
                                    {origin ? originAddress || `${origin.lat.toFixed(4)}, ${origin.lng.toFixed(4)}` : 'Selecciona un punto en el mapa'}
                                </p>
                            </div>
                        </div>

                        {/* Destino */}
                        <div
                            onClick={!isRoutingActive ? onVerRuta : undefined}
                            className={`p-3 rounded-xl border cursor-pointer ${isRoutingActive && origin && !destination ? 'border-[#7C4A36] bg-[#7C4A36]/5 shadow-sm' : 'border-stone-200 bg-white hover:border-[#7C4A36]/30'} flex items-center gap-3 transition-colors relative`}
                        >
                            <div className="bg-stone-100 p-2 rounded-full text-slate-400">
                                <MapPin className="w-4 h-4" />
                            </div>
                            <div className="flex-1 pr-8 w-0">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Punto de Destino</p>
                                <p className="text-xs font-medium text-slate-600 mt-0.5 truncate" title={destAddress || (destination ? `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : 'Haz clic en el mapa...')}>
                                    {destination ? destAddress || `${destination.lat.toFixed(4)}, ${destination.lng.toFixed(4)}` : (isRoutingActive ? 'Haz clic en el mapa...' : 'Falta origen')}
                                </p>
                            </div>

                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onUseMyLocationAsDestination();
                                }}
                                className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5 px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-600 text-[10px] font-semibold rounded-lg transition-colors"
                                title="Usar mi ubicación actual"
                            >
                                <MapPin className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* MODO DE VIAJE */}
                <section>
                    <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Modo de Viaje</h2>
                    <div className="flex gap-4">
                        <button
                            onClick={() => setTravelMode('driving')}
                            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all ${travelMode === 'driving'
                                ? 'bg-[#8C3154] text-white shadow-md'
                                : 'bg-white border border-[#8C3154]/10 text-[#8C3154]/60 hover:bg-[#8C3154]/5 hover:border-[#8C3154]/30'
                                }`}
                        >
                            <Car className="w-4 h-4 opacity-80" />
                            <span className="text-[10px] uppercase tracking-wider">Auto</span>
                        </button>
                        <button
                            onClick={() => setTravelMode('foot')}
                            className={`flex-1 flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold transition-all ${travelMode === 'foot'
                                ? 'bg-[#BC9B73] text-white shadow-md'
                                : 'bg-white border border-[#BC9B73]/10 text-[#BC9B73]/60 hover:bg-[#BC9B73]/5 hover:border-[#BC9B73]/30'
                                }`}
                        >
                            <Footprints className="w-4 h-4 opacity-80" />
                            <span className="text-[10px] uppercase tracking-wider">Caminando</span>
                        </button>
                    </div>
                </section>

                {/* VER RUTA / CANCELAR */}
                <section>
                    {!isRoutingActive ? (
                        <button
                            onClick={onVerRuta}
                            className="w-full bg-[#8C3154] hover:bg-[#7a2a49] text-white text-[11px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl shadow-lg shadow-[#8C3154]/20 transition-all active:scale-[0.98]"
                        >
                            Trazar Ruta
                        </button>
                    ) : (
                        <button
                            onClick={onCancelRouting}
                            className="w-full bg-[#7C4A36] hover:bg-[#633a2a] text-white text-[11px] font-black uppercase tracking-[0.2em] py-2.5 rounded-xl shadow-lg shadow-[#7C4A36]/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <X className="w-4 h-4" />
                            Cancelar Ruta
                        </button>
                    )}
                </section>

                {/* CAPAS DEL MAPA */}
                <section className="pt-4 border-t border-stone-100">
                    <h2 className="text-xs uppercase tracking-widest text-slate-500 font-bold mb-4">Capas del Mapa</h2>
                    <div className="flex flex-col gap-3">
                        <button
                            onClick={() => setVisibleLayers(p => ({ ...p, padron: !p.padron }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl font-bold transition-all ${visibleLayers.padron
                                ? 'bg-[#8C3154] text-white shadow-md'
                                : 'bg-white border border-[#8C3154]/10 text-stone-500 hover:bg-[#8C3154]/5'
                                }`}
                        >
                            <Target className="w-4 h-4 opacity-80" />
                            <span className="text-[10px] uppercase tracking-tight text-center">Secciones</span>
                        </button>

                        <button
                            onClick={() => setVisibleLayers(p => ({ ...p, nearManzanas: !p.nearManzanas }))}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl font-bold transition-all ${visibleLayers.nearManzanas
                                ? 'bg-[#BC9B73] text-white shadow-md'
                                : 'bg-white border border-[#BC9B73]/10 text-stone-500 hover:bg-[#BC9B73]/5'
                                }`}
                        >
                            <LayoutGrid className="w-4 h-4 opacity-80" />
                            <span className="text-[10px] uppercase tracking-tight text-center">5 Manzanas Cercanas</span>
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
};
