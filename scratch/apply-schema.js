import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = 'postgresql://postgres:BNX6C1301708S@db.iuzpgljjfeobxlptmsma.supabase.co:5432/postgres';
const sqlFilePath = path.join(__dirname, '../supabase/migrations/20260625183000_create_docks_and_yard.sql');

async function main() {
  console.log('Leyendo archivo de migración...');
  if (!fs.existsSync(sqlFilePath)) {
    console.error('No se encontró el archivo de migración en:', sqlFilePath);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFilePath, 'utf8');
  console.log('Conectándose a Supabase Staging...');
  
  const client = new pg.Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Conectado con éxito. Ejecutando migración SQL...');
    await client.query(sql);
    console.log('✅ Migración aplicada exitosamente en Supabase Staging!');
  } catch (err) {
    console.error('❌ Error ejecutando la migración:', err);
  } finally {
    await client.end();
  }
}

main();
