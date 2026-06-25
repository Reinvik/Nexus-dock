-- Migración: create_drivers_and_vehicles
-- Ubicación: supabase/migrations/20260625185400_create_drivers_and_vehicles.sql

-- 1. Crear tabla de conductores
CREATE TABLE IF NOT EXISTS public.drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
  rut TEXT NOT NULL UNIQUE CHECK (char_length(rut) BETWEEN 5 AND 20),
  phone TEXT CHECK (char_length(phone) <= 20),
  default_tractor TEXT,
  default_trailer TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- 2. Crear tabla de vehículos
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plate TEXT NOT NULL UNIQUE CHECK (char_length(plate) BETWEEN 3 AND 15),
  type TEXT NOT NULL CHECK (type IN ('Tractor', 'Rampla')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indices de búsqueda
CREATE INDEX IF NOT EXISTS idx_drivers_rut ON public.drivers(rut);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);

-- 3. Modificar la tabla de operaciones para incluir el detalle de camiones (Tractor / Rampla) y chofer
-- Hacemos la patente (patent) anterior opcional (NULL)
ALTER TABLE public.yard_operations ALTER COLUMN patent DROP NOT NULL;
ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS driver_id UUID REFERENCES public.drivers(id) ON DELETE SET NULL;
ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS tractor_plate TEXT;
ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS trailer_plate TEXT;
ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS rut TEXT;
ALTER TABLE public.yard_operations ADD COLUMN IF NOT EXISTS phone TEXT;

-- Indices en yard_operations
CREATE INDEX IF NOT EXISTS idx_yard_operations_driver_id ON public.yard_operations(driver_id);
CREATE INDEX IF NOT EXISTS idx_yard_operations_tractor ON public.yard_operations(tractor_plate);

-- 4. Habilitar RLS y políticas públicas en las nuevas tablas
ALTER TABLE public.drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total para drivers" ON public.drivers
  FOR ALL TO public USING (true) WITH CHECK (true);

CREATE POLICY "Acceso total para vehicles" ON public.vehicles
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Deshabilitar RLS temporalmente para desarrollo ágil en staging
ALTER TABLE public.drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles DISABLE ROW LEVEL SECURITY;

GRANT ALL ON TABLE public.drivers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vehicles TO anon, authenticated, service_role;

-- 5. Insertar Conductores Semilla (ON CONFLICT actualiza teléfonos y patentes por defecto)
INSERT INTO public.drivers (name, rut, phone, default_tractor, default_trailer) VALUES
  ('Herme Sepúlveda', '8.546.885-5', '56979128140', 'DRCX-73', 'PWWK-59'),
  ('Fabián Marivil', '19.318.865-6', '56948630340', 'GXCD-53', 'KYPK-98'),
  ('Billy Pastén', '15.382.385-5', '56959102986', 'WB-1326', 'KYRD-20'),
  ('Claudio Carrasco', '9.671.766-0', '56961993838', 'CRBJ-42', 'HXFJ-11'),
  ('Miguel Gómez', '11.122.752-7', '56953040248', 'PW-3882', 'PXDJ-42'),
  ('Freddy Morales', '10.295.274-K', '56983102049', 'XT-9366', 'GRHF-55'),
  ('Oscar Inaipil', '16.280.152-K', '56930222736', 'CJKK-48', 'JWLD-34'),
  ('Guillermo Morales', '10.295.276-6', '56959067071', 'UY-3066', 'KYRR-48'),
  ('Ronald Vega', '15.901.216-6', '56962103182', 'KV-8798', 'JA-3188'),
  ('Yordan Vera', '15.068.357-2', '56975391067', 'LXDP-37', 'KYRR-49'),
  ('Pedro Cadenas', '27.900.183-4', '56955325297', 'KJSF-65', 'KDJX-19'),
  ('Rodrigo Ibarra', '17.248.800-5', '56955325297', 'GZSG-24', 'KDKT-14'),
  ('Moisés Marivil', '12.307.189-1', '976413066', 'GZSG-25', 'PXDJ-41'),
  ('Enrique Saravia', '14.318.229-0', '56957747212', 'KRKF-87', 'PTYY-87'),
  ('Eric Roa', '13.947.095-8', '56982913152', 'GGHJ-25', 'KYRR-47'),
  ('Pedro Godoy', '13.666.961-3', '998879641', 'GZSG-25', 'PXDJ-41')
ON CONFLICT (rut) DO UPDATE SET 
  phone = EXCLUDED.phone,
  default_tractor = EXCLUDED.default_tractor,
  default_trailer = EXCLUDED.default_trailer;

-- 6. Insertar Vehículos Semilla (Tractores y Ramplas)
INSERT INTO public.vehicles (plate, type) VALUES
  ('DRCX-73', 'Tractor'),
  ('GXCD-53', 'Tractor'),
  ('WB-1326', 'Tractor'),
  ('CRBJ-42', 'Tractor'),
  ('PW-3882', 'Tractor'),
  ('XT-9366', 'Tractor'),
  ('CJKK-48', 'Tractor'),
  ('UY-3066', 'Tractor'),
  ('KV-8798', 'Tractor'),
  ('LXDP-37', 'Tractor'),
  ('KJSF-65', 'Tractor'),
  ('GZSG-24', 'Tractor'),
  ('GZSG-25', 'Tractor'),
  ('KRKF-87', 'Tractor'),
  ('GGHJ-25', 'Tractor'),
  ('CRBC-73', 'Tractor'),
  ('PWWK-59', 'Rampla'),
  ('KYPK-98', 'Rampla'),
  ('KYRD-20', 'Rampla'),
  ('HXFJ-11', 'Rampla'),
  ('PXDJ-42', 'Rampla'),
  ('GRHF-55', 'Rampla'),
  ('JWLD-34', 'Rampla'),
  ('KYRR-48', 'Rampla'),
  ('JA-3188', 'Rampla'),
  ('KYRR-49', 'Rampla'),
  ('KDJX-19', 'Rampla'),
  ('KDKT-14', 'Rampla'),
  ('PXDJ-41', 'Rampla'),
  ('PTYY-87', 'Rampla'),
  ('KYRR-47', 'Rampla'),
  ('JG-5655', 'Rampla')
ON CONFLICT (plate) DO NOTHING;
