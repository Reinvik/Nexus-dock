-- Migración para fijación de restricciones por tipo de temperatura en bloques horarios
CREATE SCHEMA IF NOT EXISTS dock;

CREATE TABLE IF NOT EXISTS dock.schedule_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date DATE NOT NULL,
  hour INT NOT NULL,
  dock_id UUID,
  restriction_type VARCHAR(50) NOT NULL DEFAULT 'mixto', -- 'mixto', 'congelado', 'refrigerado', 'bloqueado'
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dock_date_hour_dock UNIQUE(schedule_date, hour, dock_id)
);

CREATE TABLE IF NOT EXISTS public.schedule_restrictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_date DATE NOT NULL,
  hour INT NOT NULL,
  dock_id UUID,
  restriction_type VARCHAR(50) NOT NULL DEFAULT 'mixto',
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_public_date_hour_dock UNIQUE(schedule_date, hour, dock_id)
);

GRANT ALL ON TABLE dock.schedule_restrictions TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.schedule_restrictions TO postgres, anon, authenticated, service_role;
