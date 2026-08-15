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
}

const SessionContext = createContext<SessionValue | null>(null);

const STORAGE_KEY = 'aurora.demo-role';

function readStoredRole(): Role {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return (stored as Role) ?? 'musician';
  } catch {
    return 'musician';
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>(readStoredRole);

  const value = useMemo<SessionValue>(
    () => ({
      role,
      actor: { id: `demo-${role}`, roles: [role] },
      setRole: (next: Role) => {
        setRoleState(next);
        try {
          localStorage.setItem(STORAGE_KEY, next);
        } catch {
          // Sin almacenamiento disponible el rol simplemente no persiste.
        }
      },
    }),
    [role],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession debe usarse dentro de <SessionProvider>');
  return value;
}
