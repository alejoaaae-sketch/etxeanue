-- Crear enum para roles
CREATE TYPE public.app_role AS ENUM ('protegido', 'protector');

-- Crear tabla de perfiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  home_latitude DOUBLE PRECISION,
  home_longitude DOUBLE PRECISION,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Crear tabla de roles (separada por seguridad)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Crear tabla de vinculación protector-protegido
CREATE TABLE public.protector_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protegido_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  protector_phone TEXT NOT NULL,
  protector_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (protegido_user_id, protector_phone)
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protector_links ENABLE ROW LEVEL SECURITY;

-- Función para verificar rol (SECURITY DEFINER para evitar recursión)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Función para obtener el teléfono del usuario actual
CREATE OR REPLACE FUNCTION public.get_user_phone(_user_id UUID)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT phone FROM public.profiles WHERE user_id = _user_id
$$;

-- Políticas RLS para profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Protectores pueden ver perfiles de sus protegidos
CREATE POLICY "Protectors can view their protegidos profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.protector_links pl
      WHERE pl.protegido_user_id = profiles.user_id
        AND pl.protector_user_id = auth.uid()
        AND pl.is_confirmed = true
    )
  );

-- Políticas RLS para user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own role"
  ON public.user_roles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para protector_links
CREATE POLICY "Protegidos can view their own links"
  ON public.protector_links FOR SELECT
  USING (auth.uid() = protegido_user_id);

CREATE POLICY "Protegidos can create links"
  ON public.protector_links FOR INSERT
  WITH CHECK (auth.uid() = protegido_user_id);

CREATE POLICY "Protegidos can update their own links"
  ON public.protector_links FOR UPDATE
  USING (auth.uid() = protegido_user_id);

-- Protectores pueden ver links donde están asignados
CREATE POLICY "Protectors can view links where they are assigned"
  ON public.protector_links FOR SELECT
  USING (auth.uid() = protector_user_id);

-- Protectores pueden confirmar links donde el teléfono coincide
CREATE POLICY "Protectors can confirm links by phone"
  ON public.protector_links FOR UPDATE
  USING (
    protector_phone = public.get_user_phone(auth.uid())
  );

-- Función para vincular automáticamente protector cuando se registra
CREATE OR REPLACE FUNCTION public.auto_link_protector()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cuando un usuario añade su teléfono, buscar links pendientes
  UPDATE public.protector_links
  SET protector_user_id = NEW.user_id,
      is_confirmed = true,
      updated_at = now()
  WHERE protector_phone = NEW.phone
    AND protector_user_id IS NULL;
  
  RETURN NEW;
END;
$$;

-- Trigger para auto-vincular
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_link_protector();

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_protector_links_updated_at
  BEFORE UPDATE ON public.protector_links
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();