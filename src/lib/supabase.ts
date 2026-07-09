import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en .env.local');
}

const getDbSchema = (): string => {
  if (typeof window === 'undefined') return 'public';

  // 1. Permitir forzar y probar cualquier esquema vía query parameter (?schema=nombre) en cualquier entorno
  const params = new URLSearchParams(window.location.search);
  const forcedSchema = params.get('schema');
  
  if (forcedSchema) {
    const knownSchemas = ['dock', 'lean', 'medical', 'crm', 'restaurant', 'garage', 'punto_nexus', 'network', 'flow', 'public'];
    if (knownSchemas.includes(forcedSchema.toLowerCase())) {
      return forcedSchema.toLowerCase();
    }
  }

  // 2. Por defecto usaremos 'public' de forma temporal para evitar errores 406.
  // Una vez que guardes los cambios del esquema 'dock' en tu dashboard de Supabase y verifiques que la URL 
  // https://dock.nexusnetwork.cl/?schema=dock cargue bien, reactivaremos la resolución automática.
  return 'public';
};

const resolvedSchema = getDbSchema();
console.log(`[Multi-Tenant] Esquema de base de datos resuelto contextualmente: "${resolvedSchema}"`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: resolvedSchema }
});
