import express from 'express';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Configuración de la base de datos
// Se recomienda usar la variable DATABASE_URL de Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Endpoint para Vector Tiles (MVT)
app.get('/api/tiles/:layer/:z/:x/:y.pbf', async (req, res) => {
  const { layer, z, x, y } = req.params;
  
  try {
    // Definimos qué tabla consultar según el parámetro 'layer'
    let table = '';
    let columns = '';
    
    if (layer === 'manzanas_completas') {
      table = 'manzanas_completas';
      columns = 'ogc_fid, manzana, status';
    } else if (layer === 'manzanas_5') {
      table = '"5_manzanas"';
      columns = 'ogc_fid, seccion, localidad';
    } else if (layer === 'secciones') {
      table = 'poligonos';
      columns = 'id, seccion, municipio';
    } else {
      return res.status(400).send('Capa no válida');
    }

    // SQL para generar el tile MVT
    // 1. Convertimos coordenadas z/x/y a un Bounding Box (BBOX)
    // 2. Filtramos geometrías que intersectan el BBOX
    // 3. Transformamos a coordenadas de tile y generamos el binario MVT
    const query = `
      WITH mvt_geom AS (
        SELECT 
          ST_AsMVTGeom(
            ST_Transform(wkb_geometry, 3857),
            ST_TileEnvelope($1, $2, $3),
            4096, 64, true
          ) AS geom,
          ${columns}
        FROM ${table}
        WHERE ST_Intersects(
          wkb_geometry, 
          ST_Transform(ST_TileEnvelope($1, $2, $3), 4326)
        )
      )
      SELECT ST_AsMVT(mvt_geom.*, $4) FROM mvt_geom;
    `;

    const result = await pool.query(query, [parseInt(z), parseInt(x), parseInt(y), layer]);
    
    if (result.rows[0].st_asmvt) {
      res.setHeader('Content-Type', 'application/x-protobuf');
      res.send(result.rows[0].st_asmvt);
    } else {
      res.status(204).send();
    }
  } catch (error) {
    console.error('Error generando tile:', error);
    res.status(500).send('Error interno del servidor');
  }
});

async function startServer() {
  // Vite middleware para desarrollo
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor GIS corriendo en http://localhost:${PORT}`);
  });
}

startServer();
