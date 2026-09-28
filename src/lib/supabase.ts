import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno de Supabase en .env.local');
}

const getDbSchema = (): string => {
  if (typeof window === 'undefined') return 'public';

  const hostname = window.location.hostname;

  // 1. Permitir forzar y probar cualquier esquema vía query parameter (?schema=nombre) en cualquier entorno
  const params = new URLSearchParams(window.location.search);
  const forcedSchema = params.get('schema');
  
  if (forcedSchema) {
    const knownSchemas = ['dock', 'lean', 'medical', 'crm', 'restaurant', 'garage', 'punto_nexus', 'network', 'flow', 'public'];
    if (knownSchemas.includes(forcedSchema.toLowerCase())) {
      return forcedSchema.toLowerCase();
    }
  }
  
  // 2. En desarrollo local o fallback, usar dock por defecto
  if (
    hostname.includes('localhost') || 
    hostname.includes('127.0.0.1') || 
    hostname.startsWith('192.168.') || 
    hostname.startsWith('10.')
  ) {
    return 'dock';
  }

  // 3. En producción, extraer el primer subdominio (ej: dock.nexusnetwork.cl -> dock)
  const parts = hostname.split('.');
  if (parts.length > 2) {
    const sub = parts[0].toLowerCase();
    const knownSchemas = ['dock', 'lean', 'medical', 'crm', 'restaurant', 'garage', 'punto_nexus', 'network', 'flow'];
    if (knownSchemas.includes(sub)) {
      return sub;
    }
  }

  return 'dock';
};

const resolvedSchema = getDbSchema();
console.log(`[Multi-Tenant] Esquema de base de datos resuelto contextualmente: "${resolvedSchema}"`);

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: resolvedSchema }
});

// Clientes específicos para sincronización con despacho.nexusnetwork.cl (MAIN) y dock.nexusnetwork.cl (PROD)
export const MAIN_SUPABASE_URL = 'https://iuzpgljjfeobxlptmsma.supabase.co';
export const MAIN_SUPABASE_ANON_KEY = 'sb_publishable_SPDWhx5zkQ9y3SiG6FXUhA_1A6ylpl7';
export const PROD_SUPABASE_URL = 'https://qtzpzgwyjptbnipvyjdu.supabase.co';
export const PROD_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF0enB6Z3d5anB0Ym5pcHZ5amR1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4NDY4MDAsImV4cCI6MjA4MTQyMjgwMH0.An72d0glXpf6RZR5nwQ9OnLeU00loVqkZkNjUJhICA4';

export const supabaseMain = createClient(MAIN_SUPABASE_URL, MAIN_SUPABASE_ANON_KEY);
export const supabaseProd = createClient(PROD_SUPABASE_URL, PROD_SUPABASE_ANON_KEY);

