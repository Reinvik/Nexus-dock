-- Migración: create_docks_and_yard
-- Ubicación: supabase/migrations/20260625183000_create_docks_and_yard.sql

-- 1. Crear tabla de andenes (docks)
CREATE TABLE IF NOT EXISTS public.docks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
  status TEXT NOT NULL DEFAULT 'Disponible' CHECK (status IN ('Disponible', 'Ocupado', 'Mantenimiento')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Crear tabla de operaciones de patio (yard_operations)
CREATE TABLE IF NOT EXISTS public.yard_operations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  patent TEXT NOT NULL CHECK (char_length(patent) BETWEEN 3 AND 15),
  driver TEXT NOT NULL CHECK (char_length(driver) BETWEEN 1 AND 100),
  carrier TEXT DEFAULT 'Particular' CHECK (char_length(carrier) <= 100),
  type TEXT NOT NULL CHECK (type IN ('Carga', 'Descarga')),
  status TEXT NOT NULL DEFAULT 'espera' CHECK (status IN ('espera', 'anden', 'completado')),
  dock_id UUID REFERENCES public.docks(id) ON DELETE SET NULL,
  entry_time TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  start_time TIMESTAMPTZ,
  end_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices para optimizar consultas
CREATE INDEX IF NOT EXISTS idx_docks_status ON public.docks(status);
CREATE INDEX IF NOT EXISTS idx_yard_operations_status ON public.yard_operations(status);
CREATE INDEX IF NOT EXISTS idx_yard_operations_dock_id ON public.yard_operations(dock_id);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.docks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yard_operations ENABLE ROW LEVEL SECURITY;

-- 4. Crear políticas públicas temporales para desarrollo ágil (Acceso total público)
CREATE POLICY "Acceso total para docks" ON public.docks
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para yard_operations" ON public.yard_operations
  FOR ALL TO public USING (true) WITH CHECK (true);

-- 5. Insertar datos semilla (Docks)
INSERT INTO public.docks (name, status) VALUES
  ('Andén 1', 'Disponible'),
  ('Andén 2', 'Disponible'),
  ('Andén 3', 'Disponible'),
  ('Andén 4', 'Disponible'),
  ('Andén 5', 'Mantenimiento')
ON CONFLICT (name) DO NOTHING;

-- 6. Insertar datos semilla (Yard Operations de ejemplo)
-- Nota: Asociamos algunos camiones de prueba. Para asociar a andenes dinámicamente, usaremos consultas.
INSERT INTO public.yard_operations (patent, driver, carrier, type, status, entry_time) VALUES
  ('ABCD-12', 'Juan Pérez', 'TransCargo', 'Descarga', 'espera', NOW() - INTERVAL '45 minutes'),
  ('EFGH-34', 'Carlos Ruiz', 'LogiExpress', 'Carga', 'espera', NOW() - INTERVAL '15 minutes')
ON CONFLICT DO NOTHING;
