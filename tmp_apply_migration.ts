import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function run() {
  const sqlPath = path.resolve('supabase/migrations/20260409081500_add_multi_evidence.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  
  console.log('Ejecutando SQL:');
  console.log(sql);
  
  try {
    const res = await pool.query(sql);
    console.log('---');
    console.log('✅ ÉXITO: Migración aplicada.');
    console.log('Resultado:', res);
  } catch (err: any) {
    console.error('---');
    console.error('❌ ERROR CRÍTICO:', err.message);
    if (err.detail) console.error('Detalle:', err.detail);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
