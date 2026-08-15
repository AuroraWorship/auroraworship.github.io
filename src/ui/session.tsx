/**
 * Sesión local.
 *
 * ATENCIÓN: esto NO es autenticación. Es un selector de perfil que permite
 * recorrer la aplicación con distintos roles y comprobar que los permisos
 * filtran de verdad. La autenticación real necesita un proveedor externo y
 * está documentada como bloqueo en LOOP_STATUS.md.
 *
 * El contrato de esta capa (un `Actor` que atraviesa el repositorio) es el
 * mismo que usará la sesión autenticada, así que sustituirla no obliga a
 * tocar las pantallas.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { type Actor, type Role } from '../domain/rbac/roles';

interface SessionValue {
  actor: Actor;
  role: Role;
  setRole: (role: Role) => void;
  /**
   * A qué integrante corresponde quien está usando la aplicación.
   *
   * Lo necesita "Mi preparación" para saber qué mostrar. Con autenticación
   * real vendrá de la cuenta; hoy se elige a mano.
   */
  memberId: string | null;
  setMemberId: (id: string | null) => void;
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
  const [role, setRoleState] = useState<Role>(() => (read(ROLE_KEY) as Role) ?? 'musician');
  const [memberId, setMemberIdState] = useState<string | null>(() => read(MEMBER_KEY));

  const value = useMemo<SessionValue>(
    () => ({
      role,
      memberId,
      actor: { id: memberId ?? `demo-${role}`, roles: [role] },
      setRole: (next: Role) => {
        setRoleState(next);
        write(ROLE_KEY, next);
      },
      setMemberId: (next: string | null) => {
        setMemberIdState(next);
        write(MEMBER_KEY, next);
      },
    }),
    [role, memberId],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return value;
}
