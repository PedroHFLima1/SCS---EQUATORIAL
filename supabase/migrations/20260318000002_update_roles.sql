-- Drop the existing check constraint on profile
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_profile_check;

-- Update existing data to match new roles
UPDATE public.profiles SET profile = 'PARCEIRA' WHERE profile = 'PARCEIRO';
UPDATE public.profiles SET profile = 'GESTOR' WHERE profile = 'CONCESSIONARIA';

-- Add the new check constraint
ALTER TABLE public.profiles ADD CONSTRAINT profiles_profile_check CHECK (profile IN ('ADMIN', 'GESTOR', 'PARCEIRA'));

-- Update the trigger function to use the new default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, profile, company, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'profile', 'PARCEIRA'),
    NEW.raw_user_meta_data->>'company',
    'Ativo'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
