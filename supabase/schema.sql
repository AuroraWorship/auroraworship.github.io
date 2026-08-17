-- Esquema para la autenticación real de Aurora Worship (B-03, ADR-023).
--
-- No se ejecuta todavía: no hay proyecto de Supabase creado. Queda listo aquí
-- para el día que lo haya, y así la primera sesión con backend no empieza en
-- blanco. Pensado para pegarse entero en el editor SQL de Supabase.
--
-- Cubre solo el login y los roles — reemplazar el selector de rol de
-- demostración. Sincronizar canciones, servicios, cursos, etc. a Postgres es
-- un paso posterior y más grande, no parte de este esquema.

-- Los mismos 11 roles de src/domain/rbac/roles.ts. Si esa lista cambia, este
-- tipo tiene que cambiar con ella — es la única duplicación real del esquema.
create type public.aurora_role as enum (
  'super-admin', 'admin', 'leader', 'music-director', 'musician',
  'vocalist', 'tech', 'editor', 'student', 'member', 'public'
);

-- Extiende auth.users (que ya trae Supabase) con lo que Aurora necesita:
-- nombre visible, roles, y un enlace opcional al Member de Equipo — la
-- versión "de verdad" de marcar "soy yo" a mano (LOOP 003).
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  roles public.aurora_role[] not null default '{}',
  member_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cualquiera con sesión ve su propio perfil: lo necesita para saber sus
-- propios permisos apenas entra.
create policy "leer el propio perfil"
  on public.profiles for select
  using (auth.uid() = id);

-- Solo super-admin y admin ven y editan perfiles ajenos — es la versión real
-- del permiso `role:assign` que ya existe en rbac/roles.ts pero que hoy nadie
-- comprueba porque no hay cuentas reales que asignar.
create policy "role:assign ve todos los perfiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid()
        and admin.roles && array['super-admin', 'admin']::public.aurora_role[]
    )
  );

create policy "role:assign edita cualquier perfil"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles admin
      where admin.id = auth.uid()
        and admin.roles && array['super-admin', 'admin']::public.aurora_role[]
    )
  );

-- Una cuenta nueva entra sin rol asignado (equivalente a `public` en
-- rbac/roles.ts) hasta que alguien con `role:assign` se lo dé — con una
-- excepción: la primera cuenta que exista se vuelve super-admin sola,
-- porque si no, nadie podría asignar roles a nadie más. Nadie después de
-- esa primera cuenta se autoasigna un rol interno al registrarse.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  es_la_primera_cuenta boolean;
begin
  select not exists (select 1 from public.profiles) into es_la_primera_cuenta;

  insert into public.profiles (id, display_name, roles)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    case when es_la_primera_cuenta then array['super-admin']::public.aurora_role[] else '{}' end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
