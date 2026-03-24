import React from 'react';

interface StateBoundaryLayerProps {
    isRoutingActive: boolean;
    isAdmin: boolean;
    userId?: string;
}

/**
 * Capa de contorno del estado. 
 * Actualmente desactivada a petición del usuario para evitar confusión con las secciones electorales.
 */
export const StateBoundaryLayer: React.FC<StateBoundaryLayerProps> = () => {
    return null;
};
