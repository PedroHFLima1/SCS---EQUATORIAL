-- Migration: 20260318000003_add_password_reset_tracking.sql
-- Description: Adiciona coluna para rastrear a última vez que a senha foi alterada

ALTER TABLE public.profiles ADD COLUMN last_password_reset TIMESTAMP WITH TIME ZONE;
