-- Migration: 20260318000000_initial_schema.sql
-- Description: Criação das tabelas iniciais para o sistema de gestão de projetos (perfis de usuários e processos).

-- 1. Tabela de Perfis de Usuários (Profiles)
-- Extensão da tabela auth.users do Supabase para armazenar dados adicionais.
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  company TEXT,
  profile TEXT NOT NULL CHECK (profile IN ('ADMIN', 'PARCEIRO', 'CONCESSIONARIA')),
  status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Inativo')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabela de Processos / Projetos
CREATE TABLE public.processes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  inscricao TEXT NOT NULL,
  projeto TEXT NOT NULL,
  tipo TEXT,
  module TEXT,
  partner TEXT NOT NULL,
  concessionaria TEXT NOT NULL,
  status TEXT NOT NULL,
  protocol TEXT,
  sla INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Habilitar Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Policies) para Profiles
-- Permitir que usuários autenticados vejam os perfis
CREATE POLICY "Perfis são visíveis para usuários autenticados" 
  ON public.profiles FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Permitir que usuários atualizem apenas o próprio perfil (Admins podem precisar de regras mais amplas depois)
CREATE POLICY "Usuários podem atualizar o próprio perfil" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 5. Políticas de Segurança (Policies) para Processes
-- Permitir leitura para usuários autenticados (A lógica de filtro por parceira/concessionária pode ser feita no app ou aqui no RLS)
CREATE POLICY "Processos são visíveis para usuários autenticados" 
  ON public.processes FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Permitir inserção para usuários autenticados
CREATE POLICY "Processos podem ser criados por usuários autenticados" 
  ON public.processes FOR INSERT 
  WITH CHECK (auth.role() = 'authenticated');

-- Permitir atualização para usuários autenticados
CREATE POLICY "Processos podem ser atualizados por usuários autenticados" 
  ON public.processes FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- Permitir exclusão (cancelamento lógico é preferido, mas caso precise deletar)
CREATE POLICY "Processos podem ser deletados por usuários autenticados" 
  ON public.processes FOR DELETE 
  USING (auth.role() = 'authenticated');

-- 6. Triggers para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_profiles_updated
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TRIGGER on_processes_updated
  BEFORE UPDATE ON public.processes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. Trigger para criar um profile automaticamente quando um usuário é criado no auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, profile, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário Novo'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'profile', 'PARCEIRO'),
    'Ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
