import { supabase } from '../lib/supabaseClient';
import { Poligono } from '../types';

export const poligonosService = {
  /**
   * Obtiene todos los polígonos convirtiendo la geometría a GeoJSON directamente en la consulta.
   */
  async getPoligonos(): Promise<Poligono[]> {
    try {
      console.log('Iniciando descarga completa de polígonos...');
      let allData: Poligono[] = [];
      let from = 0;
      let to = 999;
      let hasMore = true;

      while (hasMore) {
        const { data, error, status } = await supabase
          .from('poligonos_geojson')
          .select('*')
          .range(from, to);

        if (error) {
          console.error(`Error Supabase (Status ${status}):`, error.message);
          break;
        }

        if (data && data.length > 0) {
          allData = [...allData, ...data];
          console.log(`Descargados ${allData.length} polígonos...`);
          
          if (data.length < 1000) {
            hasMore = false;
          } else {
            from += 1000;
            to += 1000;
          }
        } else {
          hasMore = false;
        }
      }

      return allData;
    } catch (err) {
      console.error('Error inesperado en el servicio:', err);
      return [];
    }
  },

  /**
   * Consulta en qué polígono cae una coordenada.
   */
  async findPoligonoByCoords(lat: number, lon: number): Promise<Poligono | null> {
    const { data, error } = await supabase.rpc('get_poligono_by_coords', {
      lat,
      lon
    });

    if (error) {
      console.error('Error in spatial query:', error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  }
};

