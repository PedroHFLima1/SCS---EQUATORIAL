-- Migration: 20260318000001_partners.sql
-- Description: Criação da tabela de parceiras e inserção dos dados iniciais.

CREATE TABLE public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Permitir leitura para usuários autenticados
CREATE POLICY "Parceiras são visíveis para usuários autenticados" 
  ON public.partners FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Inserir as duas parceiras solicitadas
INSERT INTO public.partners (name) VALUES ('Afaplan'), ('Aplus');
