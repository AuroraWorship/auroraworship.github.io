/**
 * Sesión.
 *
 * Dos modos, elegidos en tiempo de arranque por `isAuthConfigured()`
 * (ADR-023):
 *
 * - Sin backend configurado: selector de rol de demostración, marcado como
 *   tal. Es el modo de hoy, sin cambios.
 * - Con backend configurado: sesión real de Supabase. Sin sesión, el actor
 *   ve la aplicación como cualquier visitante (`public`); con sesión, sus
 *   roles vienen de `profiles.roles` — vacío se trata igual que `public`
 *   hasta que alguien con `role:assign` le dé uno.
 *
 * El contrato de fuera (`Actor` con `id` + `roles`, consumido por
 * `can`/`canView`) es el mismo en los dos modos — por eso ninguna pantalla
 * de la aplicación necesita saber cuál está activo.
 */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type Actor, type Role } from '../domain/rbac/roles';
import {
  isAuthConfigured,
  onSessionChange,
  fetchProfile,
  signInWithPassword,
  signUp as authSignUp,
  signOut as authSignOut,
  updateOwnMemberId,
  type Profile,
} from '../data/auth';

interface AuthState {
  configured: boolean;
  /** Verdadero mientras se comprueba si ya hay sesión. Solo se da en modo real. */
  loading: boolean;
  profile: Profile | null;
  email: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

interface SessionValue {
  actor: Actor;
  role: Role;
  setRole: (role: Role) => void;
  memberId: string | null;
  setMemberId: (id: string | null) => void;
  auth: AuthState;
}

const SessionContext = createContext<SessionValue | null>(null);

const ROLE_KEY = 'aurora.demo-role';
const MEMBER_KEY = 'aurora.demo-member';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Sin almacenamiento disponible la elección simplemente no persiste.
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const configured = isAuthConfigured();

  // ---- Modo demo (sin backend configurado) --------------------------------
  const [role, setRoleState] = useState<Role>(() => (read(ROLE_KEY) as Role) ?? 'musician');
  const [demoMemberId, setDemoMemberIdState] = useState<string | null>(() => read(MEMBER_KEY));

  // ---- Modo real (backend configurado) -------------------------------------
  const [loading, setLoading] = useState(configured);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    if (!configured) return;
    let cancelado = false;
    let unsubscribe: (() => void) | null = null;
    onSessionChange((session) => {
      setEmail(session?.user.email ?? null);
      setUserId(session?.user.id ?? null);
      if (!session) {
        setProfile(null);
        setLoading(false);
      }
    }).then((fn) => {
      if (cancelado) fn();
      else unsubscribe = fn;
    });
    return () => {
      cancelado = true;
      unsubscribe?.();
    };
  }, [configured]);

  useEffect(() => {
    if (!configured || !userId) return;
    let active = true;
    // El trigger que crea el perfil tarda un instante tras registrarse; un
    // reintento corto es más simple que sincronizarlo con el propio insert.
    (async () => {
      for (let intento = 0; intento < 5; intento += 1) {
        const found = await fetchProfile(userId);
        if (!active) return;
        if (found) {
          setProfile(found);
          setLoading(false);
          return;
        }
        await new Promise((r) => setTimeout(r, 400));
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [configured, userId]);

  const auth = useMemo<AuthState>(
    () => ({
      configured,
      loading,
      profile,
      email,
      signIn: signInWithPassword,
      signUp: authSignUp,
      signOut: authSignOut,
    }),
    [configured, loading, profile, email],
  );

  const value = useMemo<SessionValue>(() => {
    if (configured) {
      // Sin sesión, o con sesión pero sin rol todavía: se ve como `public`,
      // igual que cualquier visitante — nunca más permisos que sin cuenta.
      const roles = profile?.roles.length ? profile.roles : (['public'] as const);
      const actor: Actor = { id: profile?.id ?? 'anonymous', roles };
      return {
        actor,
        role: roles[0],
        setRole: () => {},
        memberId: profile?.memberId ?? null,
        setMemberId: (id: string | null) => {
          if (profile) void updateOwnMemberId(profile.id, id).then(() => {
            setProfile((p) => (p ? { ...p, memberId: id } : p));
          });
        },
        auth,
      };
    }

    return {
      actor: { id: demoMemberId ?? `demo-${role}`, roles: [role] },
      role,
      setRole: (next: Role) => {
        setRoleState(next);
        write(ROLE_KEY, next);
      },
      memberId: demoMemberId,
      setMemberId: (next: string | null) => {
        setDemoMemberIdState(next);
        write(MEMBER_KEY, next);
      },
      auth,
    };
  }, [configured, profile, role, demoMemberId, auth]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return value;
}
