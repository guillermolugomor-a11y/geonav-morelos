import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { GeoJSON, Pane } from 'react-leaflet';
import L from 'leaflet';
import { useStore } from '../../store/useStore';
import { MassAssignmentResult } from '../../hooks/useMassAssignment';
import { buildSectionColorMap, buildUserColorMap } from '../../utils/teamColors';
import { SECCIONES_POR_DISTRITO } from '../../constants/seccionesDistritos';
import { SECCIONES_POR_MUNICIPIO } from '../../constants/seccionesMunicipios';

interface Props {
  padronGeojson: any;
}

// Inner component: only rendered when massVisualization is guaranteed non-null
const MassAssignmentLayerInner: React.FC<Props & { massVisualization: MassAssignmentResult }> = ({
  padronGeojson,
  massVisualization,
}) => {
  const { massVisualizationFilter, setSelectedPoligono } = useStore();
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  const sectionColorMap = useMemo(
    () => buildSectionColorMap(massVisualization.blocks),
    [massVisualization.blocks]
  );

  const userColorMap = useMemo(
    () => buildUserColorMap(massVisualization.blocks),
    [massVisualization.blocks]
  );

  // Section IDs assigned to the currently filtered team (null = show all)
  const filteredSectionIds = useMemo(() => {
    if (!massVisualizationFilter) return null;
    const block = massVisualization.blocks.find(b =>
      b.userIds.includes(massVisualizationFilter)
    );
    return block ? new Set(block.sections.map(s => s.id)) : new Set<number>();
  }, [massVisualizationFilter, massVisualization.blocks]);

  const activeFilterColor = massVisualizationFilter
    ? (userColorMap.get(massVisualizationFilter) ?? '#3b82f6')
    : null;

  // GeoJSON filtered to la zona (distrito o municipio) de este assignment
  const distritoGeoJSON = useMemo(() => {
    const allowedSections = (
      typeof massVisualization.distrito === 'string'
        ? SECCIONES_POR_MUNICIPIO[massVisualization.distrito]
        : SECCIONES_POR_DISTRITO[massVisualization.distrito]
    ) ?? [];
    if (!allowedSections.length) return padronGeojson;
    return {
      ...padronGeojson,
      features: padronGeojson.features.filter((f: any) =>
        allowedSections.includes(Number(f.properties.SECCION))
      ),
    };
  }, [padronGeojson, massVisualization.distrito]);

  // Style function — extracted so setStyle() can reuse the same logic
  const computeStyle = useCallback(
    (feature: any): L.PathOptions => {
      if (!feature) return {};
      const seccionId = Number(feature.properties.SECCION);
      const teamColor = sectionColorMap.get(seccionId);

      if (massVisualizationFilter) {
        if (filteredSectionIds?.has(seccionId)) {
          // Active team: prominent fill with team color
          return {
            fillColor: activeFilterColor!,
            weight: 3,
            opacity: 1,
            color: activeFilterColor!,
            fillOpacity: 0.72,
          };
        }
        // Other assigned teams: completely hidden
        if (teamColor) {
          return { fillColor: '#9ca3af', weight: 0.5, opacity: 0.15, color: '#9ca3af', fillOpacity: 0 };
        }
        // Unassigned: ghost context
        return { fillColor: '#e5e7eb', weight: 0.5, opacity: 0.2, color: '#d1d5db', fillOpacity: 0.1 };
      }

      // "Todos" mode: each team colored, unassigned neutral
      if (teamColor) {
        return { fillColor: teamColor, weight: 2, opacity: 1, color: teamColor, fillOpacity: 0.55 };
      }
      return { fillColor: '#e5e7eb', weight: 1, opacity: 0.35, color: '#9ca3af', fillOpacity: 0.1 };
    },
    [sectionColorMap, massVisualizationFilter, filteredSectionIds, activeFilterColor]
  );

  // Update styles via setStyle() when filter changes — no layer remount needed
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle(computeStyle as any);
    }
  }, [massVisualizationFilter, computeStyle]);

  const onEachFeature = useCallback(
    (feature: any, layer: L.Layer) => {
      layer.on({
        click: () => {
          if (!feature.properties) return;
          const { SECCION, total, hombres, mujeres, fecha_actualizacion } = feature.properties;
          setSelectedPoligono({
            id: Number(SECCION),
            nombre: `Sección ${SECCION}`,
            municipio: typeof massVisualization.distrito === 'string'
              ? massVisualization.distrito
              : `Distrito ${massVisualization.distrito}`,
            tipo: 'Sección Electoral',
            metadata: {
              seccion: Number(SECCION),
              total,
              hombres,
              mujeres,
              fecha_actualizacion,
              padron: true,
            },
            geom: feature.geometry,
          });
        },
      });
    },
    [setSelectedPoligono, massVisualization.distrito]
  );

  return (
    <Pane name="mass-assignment-pane" style={{ zIndex: 450 }}>
      <GeoJSON
        ref={geoJsonRef}
        key={`mass-d${massVisualization.distrito}-${massVisualization.numEquipos}-${massVisualization.cantidadSecciones}`}
        data={distritoGeoJSON}
        style={computeStyle}
        onEachFeature={onEachFeature}
      />
    </Pane>
  );
};

// Public export: guards against null massVisualization so the inner component
// can safely assume it's always present.
export const MassAssignmentLayer: React.FC<Props> = (props) => {
  const massVisualization = useStore(s => s.massVisualization);
  if (!massVisualization || !props.padronGeojson) return null;
  return <MassAssignmentLayerInner {...props} massVisualization={massVisualization} />;
};
