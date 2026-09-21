-- RPCs para administración de usuarios y cambio de contraseñas por Nexus Owner
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.admin_get_users()
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  role VARCHAR(50),
  email_confirmed BOOLEAN,
  last_sign_in_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  is_banned BOOLEAN,
  app_metadata JSONB,
  user_metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::VARCHAR(255),
    COALESCE(u.raw_app_meta_data->>'role', u.role, 'user')::VARCHAR(50) AS role,
    (u.email_confirmed_at IS NOT NULL) AS email_confirmed,
    u.last_sign_in_at,
    u.created_at,
    (u.banned_until IS NOT NULL AND u.banned_until > NOW()) AS is_banned,
    COALESCE(u.raw_app_meta_data, '{}'::jsonb) AS app_metadata,
    COALESCE(u.raw_user_meta_data, '{}'::jsonb) AS user_metadata
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_password(
  target_user_id UUID,
  new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  encrypted_pw TEXT;
  user_rec RECORD;
BEGIN
  IF LENGTH(new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;

  SELECT id, email INTO user_rec FROM auth.users WHERE id = target_user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuario no encontrado');
  END IF;

  encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));

  UPDATE auth.users
  SET 
    encrypted_password = encrypted_pw,
    updated_at = NOW()
  WHERE id = target_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Contraseña actualizada exitosamente',
    'user_id', target_user_id,
    'email', user_rec.email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_create_user(
  new_email TEXT,
  new_password TEXT,
  new_role TEXT DEFAULT 'user'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
DECLARE
  new_uid UUID := gen_random_uuid();
  encrypted_pw TEXT;
  clean_mail TEXT := LOWER(TRIM(new_email));
BEGIN
  IF clean_mail = '' OR clean_mail IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'El correo es requerido');
  END IF;

  IF EXISTS (SELECT 1 FROM auth.users WHERE email = clean_mail) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Ya existe un usuario con este correo');
  END IF;

  IF LENGTH(new_password) < 6 THEN
    RETURN jsonb_build_object('success', false, 'error', 'La contraseña debe tener al menos 6 caracteres');
  END IF;

  encrypted_pw := extensions.crypt(new_password, extensions.gen_salt('bf'));

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud
  ) VALUES (
    new_uid,
    '00000000-0000-0000-0000-000000000000',
    clean_mail,
    encrypted_pw,
    NOW(),
    NOW(),
    NOW(),
    jsonb_build_object('provider', 'email', 'providers', array['email'], 'role', new_role),
    jsonb_build_object('role', new_role),
    false,
    'authenticated',
    'authenticated'
  );

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  ) VALUES (
    new_uid,
    new_uid,
    jsonb_build_object('sub', new_uid::text, 'email', clean_mail),
    'email',
    NOW(),
    NOW(),
    NOW()
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario creado y confirmado exitosamente',
    'user_id', new_uid,
    'email', clean_mail
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_toggle_user_ban(
  target_user_id UUID,
  should_ban BOOLEAN
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions
AS $$
BEGIN
  IF should_ban THEN
    UPDATE auth.users
    SET banned_until = '2099-01-01 00:00:00+00'::TIMESTAMPTZ,
        updated_at = NOW()
    WHERE id = target_user_id;
  ELSE
    UPDATE auth.users
    SET banned_until = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'is_banned', should_ban);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_get_users TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.admin_set_user_password TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.admin_create_user TO anon, authenticated, service_role, postgres;
GRANT EXECUTE ON FUNCTION public.admin_toggle_user_ban TO anon, authenticated, service_role, postgres;
