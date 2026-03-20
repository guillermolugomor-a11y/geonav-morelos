import { useCallback, useEffect, useMemo, useState } from 'react';
import { Poligono } from '../types';
import { poligonosService } from '../services/poligonosService';
import { taskService } from '../services/taskService';
import { supabase } from '../lib/supabaseClient';
import { debugError, debugLog, debugWarn } from '../utils/debug';
import { useStore } from '../store/useStore';

interface UseMapDataParams {
  isAdmin: boolean;
  userId?: string;
}

export interface PadronManzanaRef {
  id: number;
  seccion: number;
  manzana: number;
  geom?: any;
  localidad?: number;
  entidad?: number;
  municipio?: number;
  distrito_f?: number;
  control?: string;
  status?: number;    // 1=Urbana, 0=Dispersa
  dist_m?: number;   // Distancia al centroide de sección
  rank_near?: number; // Rango de cercanía (1=más cercana)
}

export const useMapData = ({ isAdmin, userId }: UseMapDataParams) => {
  const poligonos = useStore(s => s.poligonos);
  const setPoligonos = useStore(s => s.setPoligonos);
  const tareas = useStore(s => s.tareas);
  const setTareas = useStore(s => s.setTareas);
  const setError = useStore(s => s.setError);

  const [loading, setLoading] = useState(true);
  const [tasksUpdateKey, setTasksUpdateKey] = useState(0);
  const [manzanasPadron, setManzanasPadron] = useState<PadronManzanaRef[]>([]);

  const loadTasks = useCallback(async () => {
    debugLog('MapView: Cargando tareas...', { isAdmin, userId });
    let tasksData: any[] = [];
    try {
      if (isAdmin) {
        const response = await taskService.getAllTareas();
        tasksData = response.data;
      } else if (userId) {
        tasksData = await taskService.getTareas(userId);
      }

      setTareas(tasksData);
      setTasksUpdateKey((prev) => prev + 1);
    } catch (err) {
      debugError('MapView: Error al cargar tareas:', err);
    }
  }, [isAdmin, userId, setTareas]);

  // Carga inicial completa de datos
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Cargar manzanas estáticas
        if (manzanasPadron.length === 0) {
          const mzResponse = await fetch('/manzanas_5_mas_cercanas_full.geojson');
          const mzData = await mzResponse.json();
          setManzanasPadron(
            mzData.features.map((feature: any) => ({
              id: feature.properties.ID,
              seccion: feature.properties.SECCION,
              manzana: feature.properties.MANZANA,
              geom: feature.geometry,
              localidad: feature.properties.LOCALIDAD,
              entidad: feature.properties.ENTIDAD,
              municipio: feature.properties.MUNICIPIO,
              distrito_f: feature.properties.DISTRITO_F,
              control: feature.properties.CONTROL,
              status: feature.properties.STATUS,
              dist_m: feature.properties.dist_m,
              rank_near: feature.properties.rank_near,
            }))
          );
        }

        // Cargar polígonos (todo) - Como estaba originalmente pero en el store
        const data = await poligonosService.getPoligonos();
        const parsedData = data.map((polygon) => ({
          ...polygon,
          geom: typeof polygon.geom === 'string' ? JSON.parse(polygon.geom) : polygon.geom
        }));
        setPoligonos(parsedData);

        // Cargar tareas
        await loadTasks();

      } catch (err: any) {
        debugError('Error en carga inicial useMapData:', err);
        setError(err.message || 'Error desconocido al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadTasks, setPoligonos, setError]); // Removido manzanasPadron.length para evitar re-ejecución si cambia internamente

  useEffect(() => {
    const handleRefresh = () => loadTasks();
    window.addEventListener('refresh-map-tasks', handleRefresh);
    return () => window.removeEventListener('refresh-map-tasks', handleRefresh);
  }, [loadTasks]);

  const secciones = useMemo(() => {
    const rawSecciones = poligonos.filter((polygon) => polygon.tipo === 'Sección');
    if (isAdmin) return rawSecciones;

    const seccionesAsignadas = new Set(
      tareas
        .filter((task) => ['padron', 'seccion', 'secciones', 'Sección'].includes(task.tipo_capa))
        .map((task) => Number(task.polygon_id))
    );

    tareas
      .filter((task) => ['manzana', 'manzanas'].includes(task.tipo_capa))
      .forEach((task) => {
        const manzana = manzanasPadron.find((item) => Number(item.id) === Number(task.polygon_id));
        if (manzana?.seccion) {
          const sectionPolygon = rawSecciones.find((section) => Number(section.id) === Number(manzana.seccion));
          if (sectionPolygon) seccionesAsignadas.add(sectionPolygon.id);
          return;
        }

        const polygon = poligonos.find((item) => Number(item.id) === Number(task.polygon_id));
        if (polygon?.metadata?.seccion) {
          const sectionPolygon = rawSecciones.find(
            (section) => Number(section.metadata?.seccion) === Number(polygon.metadata.seccion)
          );
          if (sectionPolygon) seccionesAsignadas.add(sectionPolygon.id);
        }
      });

    return rawSecciones.filter((section) => seccionesAsignadas.has(section.id));
  }, [isAdmin, manzanasPadron, poligonos, tareas]);

  return {
    poligonos,
    tareas,
    loading,
    tasksUpdateKey,
    manzanasPadron,
    secciones,
    loadTasks
  };
};
