-- Migración: add_despacho_planta_2
-- Ubicación: supabase/migrations/20260825000000_add_despacho_planta_2.sql

-- 1. Añadir columnas a la tabla yard_operations en el esquema 'dock'
ALTER TABLE dock.yard_operations ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'patio_cd';
ALTER TABLE dock.yard_operations ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ;
ALTER TABLE dock.yard_operations ADD COLUMN IF NOT EXISTS plant_loading_time TIMESTAMPTZ;

-- Eliminar restricciones CHECK sobre status en esquema 'dock'
DO $$
DECLARE r record;
BEGIN
    FOR r IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'yard_operations' AND tc.table_schema = 'dock' AND tc.constraint_type = 'CHECK' AND ccu.column_name = 'status'
    LOOP
        EXECUTE 'ALTER TABLE dock.yard_operations DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- Aplicar nueva restricción CHECK de status en esquema 'dock'
ALTER TABLE dock.yard_operations 
  ADD CONSTRAINT yard_operations_status_check 
  CHECK (status IN ('cita', 'planta_carga', 'en_ruta', 'espera', 'anden', 'completado'));

-- 2. Añadir columnas a la tabla yard_operations en el esquema 'public' (solo si la tabla existe)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yard_operations') THEN
        ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS origin TEXT DEFAULT 'patio_cd';
        ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS dispatch_time TIMESTAMPTZ;
        ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS plant_loading_time TIMESTAMPTZ;

        ALTER TABLE public.yard_operations DROP CONSTRAINT IF EXISTS yard_operations_status_check;
        ALTER TABLE public.yard_operations 
          ADD CONSTRAINT yard_operations_status_check 
          CHECK (status IN ('cita', 'planta_carga', 'en_ruta', 'espera', 'anden', 'completado'));
    END IF;
END $$;

-- 3. Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_dock_yard_operations_origin ON dock.yard_operations(origin);
CREATE INDEX IF NOT EXISTS idx_dock_yard_operations_dispatch_time ON dock.yard_operations(dispatch_time);
