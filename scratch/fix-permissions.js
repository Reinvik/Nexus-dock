import pg from 'pg';

const connectionString = 'postgresql://postgres:BNX6C1301708S@db.iuzpgljjfeobxlptmsma.supabase.co:5432/postgres';

async function main() {
  console.log('Conectándose a la base de datos para corregir permisos...');
  const client = new pg.Client({ connectionString });
  
  const sql = `
    -- Deshabilitar RLS temporalmente para desarrollo ágil en staging
    ALTER TABLE public.yard_operations DISABLE ROW LEVEL SECURITY;
    ALTER TABLE public.docks DISABLE ROW LEVEL SECURITY;

    -- Otorgar permisos de acceso total a los roles de API y anónimos
    GRANT ALL ON TABLE public.yard_operations TO anon, authenticated, service_role;
    GRANT ALL ON TABLE public.docks TO anon, authenticated, service_role;

    -- Otorgar permisos en el esquema public por si acaso
    GRANT USAGE ON SCHEMA public TO anon, authenticated;
  `;

  try {
    await client.connect();
    console.log('Conectado. Ejecutando SQL de reparación...');
    await client.query(sql);
    console.log('✅ Permisos corregidos y RLS deshabilitado con éxito en Supabase Staging!');
  } catch (err) {
    console.error('❌ Error aplicando reparación de permisos:', err);
  } finally {
    await client.end();
  }
}

main();
