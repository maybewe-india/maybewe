-- ============================================================================
-- MAYBEWE — DATABASE SCHEMA MIGRATION: 02_theme_preference.sql
-- Adds theme_preference column to public.users table
-- ============================================================================

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS theme_preference TEXT
CHECK (theme_preference IN ('dark', 'light'));

COMMENT ON COLUMN public.users.theme_preference IS 'User UI theme preference: dark or light';
