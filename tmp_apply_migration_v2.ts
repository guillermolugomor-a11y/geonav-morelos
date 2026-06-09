import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  console.log('--- Probando conexión ---');
  try {
    const test = await pool.query('SELECT NOW()');
    console.log('Conexión exitosa:', test.rows[0]);

    console.log('--- Aplicando ALTER TABLE ---');
    await pool.query('ALTER TABLE public.tareas ADD COLUMN IF NOT EXISTS evidencia_urls text[] DEFAULT \'{}\';');
    console.log('✅ ALTER TABLE exitoso.');

    console.log('--- Aplicando COMMENT ---');
    await pool.query('COMMENT ON COLUMN public.tareas.evidencia_urls IS \'Array de URLs de imágenes cargadas en Cloudinary como evidencia.\';');
    console.log('✅ COMMENT exitoso.');

  } catch (err: any) {
    console.error('❌ ERROR:', err.message);
    if (err.detail) console.error('Detalle:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
