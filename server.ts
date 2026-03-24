import express from 'express';
import { createServer as createViteServer } from 'vite';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

// Inicializar cliente Supabase para el servidor
const supabase = createClient(
  process.env.VITE_SUPABASE_URL || '',
  process.env.VITE_SUPABASE_ANON_KEY || ''
);

const app = express();
const port = Number(process.env.PORT) || 3002;
const __dirname = path.resolve();

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  next();
});

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

// Endpoint persistente para estado básico (Health Check)
app.get('/api/status', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), scheduler: 'active' });
});

// --- AUTOMATIZACIÓN DE TAREAS PROGRAMADAS (Solución de Raíz via RPC) ---
// --- Scheduler Diagnostics ---
let schedulerHistory: any[] = [];
function addLog(msg: string, details?: any) {
  schedulerHistory.unshift({ time: new Date().toISOString(), msg, details });
  if (schedulerHistory.length > 10) schedulerHistory.pop();
}

async function runTaskActivation() {
  const now = new Date();
  try {
    const { data: count, error } = await supabase.rpc('activate_scheduled_tasks');
    
    if (error) {
      console.error(`[Scheduler] ❌ Error:`, error.message);
      addLog('Error en RPC', error.message);
      return;
    }

    if (count && count > 0) {
      console.log(`[Scheduler] ✅ ÉXITO: Activadas ${count} tareas.`);
      addLog('Éxito', { count });
    } else {
      addLog('Check: 0 tareas para activar');
    }
  } catch (err: any) {
    console.error('[Scheduler] ❌ Fallo crítico:', err);
    addLog('Fallo crítico', err.message);
  }
}

// Nueva ruta de diagnóstico
app.get('/api/scheduler-debug', (req, res) => {
  res.json({
    active: true,
    last_runs: schedulerHistory,
    env: {
      has_url: !!process.env.VITE_SUPABASE_URL,
      has_key: !!process.env.VITE_SUPABASE_ANON_KEY
    }
  });
});


function initTaskScheduler() {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY ? 'Presente' : 'FALTANTE';
  
  console.log('--------------------------------------------------');
  console.log('[Scheduler] ⏰ Iniciando servicio de auto-activación...');
  console.log(`[Scheduler] 🔗 URL: ${url || 'FALTANTE'}`);
  console.log(`[Scheduler] 🔑 Key: ${key}`);
  console.log('--------------------------------------------------');
  
  if (!url || key === 'FALTANTE') {
    console.warn('[Scheduler] ⚠️ Error: No se puede iniciar el scheduler sin variables de entorno.');
    return;
  }

  // Ejecutar cada minuto
  setInterval(runTaskActivation, 60000);
  // Ejecutar la primera vez después de 1 segundo para prueba inmediata
  setTimeout(runTaskActivation, 1000);
}

// 1. Iniciar el servidor Express de inmediato en el puerto 3002
app.listen(port, '0.0.0.0', () => {
  console.log(`--------------------------------------------------`);
  console.log(`🚀 SERVIDOR BACKEND ACTIVO: http://0.0.0.0:${port}`);
  console.log(`⏰ SISTEMA DE ACTIVACIÓN: Iniciado`);
  console.log(`--------------------------------------------------`);
});

// 2. Iniciar el scheduler
initTaskScheduler();

// 3. Cargar Vite de forma asíncrona pero sin bloquear el proceso principal
async function startViteMiddleware() {
  if (process.env.NODE_ENV !== 'production') {
    try {
      console.log('[Server] 🛠️  Cargando middleware de Vite...');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('[Server] ✅ Vite cargado correctamente.');
    } catch (err) {
      console.error('[Server] ❌ Error cargando Vite:', err);
    }
  } else {
    app.use(express.static('dist'));
  }

  // Manejar rutas de React (Fase 1) - Movido aquí para ser el final de la cadena
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  });
}

startViteMiddleware();
