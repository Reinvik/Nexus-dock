import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres:BNX6C1301708S@db.iuzpgljjfeobxlptmsma.supabase.co:5432/postgres';
const sqlFilePath = path.join(__dirname, '../supabase/migrations/20260625190100_add_cita_status.sql');

async function main() {
  console.log('Leyendo archivo de migración de citas...');
  if (!fs.existsSync(sqlFilePath)) {
    console.error('No se encontró el archivo de migración en:', sqlFilePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('Conectándose a Supabase Staging...');
  
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado con éxito. Ejecutando migración SQL para el estado cita...');
    await client.query(sql);
    console.log('✅ Migración del estado de citas aplicada exitosamente en Supabase Staging!');
  } catch (err) {
    console.error('❌ Error ejecutando la migración:', err);
  } finally {
    await client.end();
  }
}

main();
