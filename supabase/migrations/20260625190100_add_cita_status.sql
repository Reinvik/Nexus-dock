-- Migración: add_cita_status
-- Ubicación: supabase/migrations/20260625190100_add_cita_status.sql

-- 1. Eliminar dinámicamente cualquier check constraint existente sobre la columna 'status' en 'yard_operations'
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'yard_operations'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'status'
    LOOP
        EXECUTE 'ALTER TABLE public.yard_operations DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name);
    END LOOP;
END $$;

-- 2. Agregar la nueva restricción CHECK con soporte para el estado 'cita'
ALTER TABLE public.yard_operations 
  ADD CONSTRAINT yard_operations_status_check 
  CHECK (status IN ('cita', 'espera', 'anden', 'completado'));

-- 3. Insertar citas semilla de ejemplo para hoy asociadas a conductores existentes
-- Buscaremos conductores conocidos de la semilla anterior para ligar el driver_id
DO $$
DECLARE
    herme_id UUID;
    billy_id UUID;
BEGIN
    SELECT id INTO herme_id FROM public.drivers WHERE rut = '8.546.885-5' LIMIT 1;
    SELECT id INTO billy_id FROM public.drivers WHERE rut = '15.382.385-5' LIMIT 1;

    -- Si existen los conductores, insertamos las citas
    IF herme_id IS NOT NULL THEN
        INSERT INTO public.yard_operations (driver_id, driver, rut, phone, tractor_plate, trailer_plate, carrier, type, status, entry_time)
        VALUES (herme_id, 'Herme Sepúlveda', '8.546.885-5', '56979128140', 'DRCX-73', 'PWWK-59', 'TransCargo', 'Descarga', 'cita', NOW());
    END IF;

    IF billy_id IS NOT NULL THEN
        INSERT INTO public.yard_operations (driver_id, driver, rut, phone, tractor_plate, trailer_plate, carrier, type, status, entry_time)
        VALUES (billy_id, 'Billy Pastén', '15.382.385-5', '56959102986', 'WB-1326', 'KYRD-20', 'LogiExpress', 'Carga', 'cita', NOW() + INTERVAL '30 minutes');
    END IF;
END $$;
