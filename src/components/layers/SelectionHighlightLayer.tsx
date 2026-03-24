import React from 'react';
import { GeoJSON, Pane } from 'react-leaflet';
import { useStore } from '../../store/useStore';

/**
 * Capa de alta prioridad para resaltar el polígono seleccionado actualmente.
 * Utiliza un Pane de Leaflet con zIndex elevado para asegurar que siempre sea visible
 * por encima de todas las demás geometrías.
 */
export const SelectionHighlightLayer: React.FC = () => {
    const { selectedPoligono } = useStore();

    if (!selectedPoligono || !selectedPoligono.geom) return null;

    // Estilo premium de resaltado: Cyan vibrante
    const selectionStyle = {
        fillColor: 'transparent',
        weight: 5,
        opacity: 1,
        color: '#06b6d4', // Cyan vibrante
        fillOpacity: 0,
        dashArray: '',
        lineCap: 'round' as const,
        lineJoin: 'round' as const,
        interactive: false // No interfiere con clics en otras capas
    };

    return (
        <Pane name="selection-pane" style={{ zIndex: 650, pointerEvents: 'none' }}>
            <GeoJSON 
                key={`selection-highlight-${selectedPoligono.id}`}
                data={selectedPoligono.geom}
                style={selectionStyle}
            />
        </Pane>
    );
};
