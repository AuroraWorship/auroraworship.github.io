/**
 * Autenticación real (B-03, ADR-023).
 *
 * Envuelve Supabase Auth detrás de un contrato reducido: sesión actual,
 * entrar, registrarse, salir, y el perfil (`roles`, `member_id`) que
 * `session.tsx` traduce a un `Actor`. Sin `VITE_SUPABASE_URL` y
 * `VITE_SUPABASE_ANON_KEY`, `isAuthConfigured()` devuelve falso y la
 * aplicación sigue exactamente como con el selector de demostración —
 * ninguna pantalla necesita saber si el backend existe todavía.
 *
 * `@supabase/supabase-js` se importa con `import()`, no arriba del archivo:
 * son ~220 KB que nadie en modo demo tiene por qué descargar (LOOP 009 ya
 * cuidó el peso del paquete una vez; esto sigue la misma regla).
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import type { Role } from '../domain/rbac/roles';

export interface Profile {
  id: string;
  displayName: string;
  roles: readonly Role[];
  memberId: string | null;
}

const URL = import.meta.env.VITE_SUPABASE_URL;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isAuthConfigured(): boolean {
  return Boolean(URL && ANON_KEY);
}

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;

/** No se llama nunca si `isAuthConfigured()` es falso: ver `session.tsx`. */
function supabase(): Promise<SupabaseClient> {
  if (client) return Promise.resolve(client);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(URL, ANON_KEY);
      return client;
    });
  }
  return clientPromise;
}

export async function onSessionChange(callback: (session: Session | null) => void): Promise<() => void> {
  const sb = await supabase();
  sb.auth.getSession().then(({ data }) => callback(data.session));
  const { data: subscription } = sb.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => subscription.subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string): Promise<string | null> {
  const sb = await supabase();
  const { error } = await sb.auth.signInWithPassword({ email, password });
  return error?.message ?? null;
}

/**
 * Alta de cuenta. El primer perfil que se crea queda como super-admin sin
 * que nadie lo pida (`handle_new_user` en `supabase/schema.sql`); el resto
 * arranca sin rol hasta que alguien con `role:assign` se lo dé.
 */
export async function signUp(
  email: string,
  password: string,
  displayName: string,
): Promise<string | null> {
  const sb = await supabase();
  const { error } = await sb.auth.signUp({
    email,
    password,
    options: { data: { display_name: displayName } },
  });
  return error?.message ?? null;
}

export async function signOut(): Promise<void> {
  const sb = await supabase();
  await sb.auth.signOut();
}

/** `null` si el perfil todavía no se ha creado — el trigger tarda un instante. */
export async function fetchProfile(userId: string): Promise<Profile | null> {
  const sb = await supabase();
  const { data, error } = await sb
    .from('profiles')
    .select('id, display_name, roles, member_id')
    .eq('id', userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    roles: data.roles ?? [],
    memberId: data.member_id,
  };
}

export async function updateOwnDisplayName(userId: string, displayName: string): Promise<string | null> {
  const sb = await supabase();
  const { error } = await sb.from('profiles').update({ display_name: displayName }).eq('id', userId);
  return error?.message ?? null;
}

/** La versión real de "soy yo" (LOOP 003): enlaza la cuenta con su `Member` de Equipo. */
export async function updateOwnMemberId(userId: string, memberId: string | null): Promise<string | null> {
  const sb = await supabase();
  const { error } = await sb.from('profiles').update({ member_id: memberId }).eq('id', userId);
  return error?.message ?? null;
}

/** Solo funciona para quien ya tiene `role:assign`: lo exige la política RLS, no este código. */
export async function assignRoles(
  targetUserId: string,
  roles: readonly Role[],
): Promise<string | null> {
  const sb = await supabase();
  const { error } = await sb.from('profiles').update({ roles }).eq('id', targetUserId);
  return error?.message ?? null;
}

export interface ProfileRow {
  id: string;
  displayName: string;
  roles: readonly Role[];
}

/** Lista de cuentas visibles para quien tiene `role:assign` (política RLS lo filtra si no). */
export async function listProfiles(): Promise<ProfileRow[]> {
  const sb = await supabase();
  const { data, error } = await sb.from('profiles').select('id, display_name, roles');
  if (error || !data) return [];
  return data
    .map((row) => ({ id: row.id, displayName: row.display_name, roles: row.roles ?? [] }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'));
}
