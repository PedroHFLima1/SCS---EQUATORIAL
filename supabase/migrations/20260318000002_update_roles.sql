-- Drop the existing check constraint on profile
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_check;

-- Update existing data to match new roles
UPDATE public.profiles SET profile = 'PARCEIRA' WHERE profile = 'PARCEIRO';
UPDATE public.profiles SET profile = 'GESTOR' WHERE profile = 'CONCESSIONARIA';

-- Add the new check constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_check CHECK (profile IN ('ADMIN', 'GESTOR', 'PARCEIRA'));

-- Update the trigger function to use smart role assignment
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  assigned_profile TEXT;
BEGIN
  -- LÓGICA ARQUITETURAL ESCALÁVEL:
  -- Define os perfis automaticamente com base no domínio do e-mail registrado.
  -- Adapte os domínios '@seudominio.com.br' para a realidade do seu projeto.
  
  IF NEW.email LIKE '%@seudominio.com.br' THEN
    assigned_profile := 'ADMIN';
  ELSIF NEW.email LIKE '%@equatorial.com.br' OR NEW.email LIKE '%@equatorialenergia.com.br' THEN
    assigned_profile := 'GESTOR';
  ELSE
    -- Mantém a segurança do Princípio do Menor Privilégio para acessos externos
    assigned_profile := COALESCE(NEW.raw_user_meta_data->>'profile', 'PARCEIRA');
  END IF;

  INSERT INTO public.profiles (id, name, email, profile, company, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    assigned_profile,
    NEW.raw_user_meta_data->>'company',
    'Ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
