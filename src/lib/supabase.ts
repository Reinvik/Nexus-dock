import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en .env.local');
}

const getDbSchema = (): string => {
  if (typeof window === 'undefined') return 'public';

  const hostname = window.location.hostname;
  
  // 1. En entorno de desarrollo (localhost, localhost IP, o IP de red local)
  if (
    hostname.includes('localhost') || 
    hostname.includes('127.0.0.1') || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    const params = new URLSearchParams(window.location.search);
    return params.get('schema') || 'public';
  }

  // 2. En producción, extraer el primer subdominio (ej: dock.nexusnetwork.cl -> dock)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const sub = parts[0].toLowerCase();
    const knownSchemas = ['dock', 'lean', 'medical', 'crm', 'restaurant', 'garage', 'punto_nexus', 'network', 'flow'];
    if (knownSchemas.includes(sub)) {
      return sub;
    }
  }

  return 'public';
};

const resolvedSchema = getDbSchema();
console.log(`[Multi-Tenant] Esquema de base de datos resuelto contextualmente: "${resolvedSchema}"`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: resolvedSchema }
});
