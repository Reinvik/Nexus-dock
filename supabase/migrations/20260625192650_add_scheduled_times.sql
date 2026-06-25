-- Migración: add_scheduled_times
-- Ubicación: supabase/migrations/20260625192650_add_scheduled_times.sql

ALTER TABLE public.yard_operations 
ADD COLUMN IF NOT EXISTS scheduled_entry_time TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS scheduled_end_time TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_yard_operations_scheduled_entry ON public.yard_operations(scheduled_entry_time);
