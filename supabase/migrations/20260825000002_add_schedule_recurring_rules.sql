-- Migración para reglas predeterminadas recurrentes semanales
CREATE SCHEMA IF NOT EXISTS dock;

CREATE TABLE IF NOT EXISTS dock.schedule_recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL, -- 0=Domingo, 1=Lunes, 2=Martes, 3=Miercoles, 4=Jueves, 5=Viernes, 6=Sabado
  hour INT NOT NULL,
  dock_id UUID, -- NULL significa todos los andenes
  restriction_type VARCHAR(50) NOT NULL DEFAULT 'mixto', -- 'mixto', 'congelado', 'refrigerado', 'bloqueado'
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_dock_recurring UNIQUE(day_of_week, hour, dock_id)
);

CREATE TABLE IF NOT EXISTS public.schedule_recurring_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL,
  hour INT NOT NULL,
  dock_id UUID,
  restriction_type VARCHAR(50) NOT NULL DEFAULT 'mixto',
  note TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_public_recurring UNIQUE(day_of_week, hour, dock_id)
);

GRANT ALL ON TABLE dock.schedule_recurring_rules TO postgres, anon, authenticated, service_role;
GRANT ALL ON TABLE public.schedule_recurring_rules TO postgres, anon, authenticated, service_role;
