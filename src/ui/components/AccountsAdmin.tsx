import { useEffect, useState } from 'react';
import { ROLES, ROLE_LABELS, can, type Role } from '../../domain/rbac/roles';
import { assignRoles, listProfiles, type ProfileRow } from '../../data/auth';
import { useSession } from '../session';

/**
 * Asignar roles a cuentas reales (ADR-023).
 *
 * Solo aparece con backend configurado y `role:assign` — hoy super-admin y
 * admin. La política RLS de `profiles` exige lo mismo del lado del
 * servidor, así que esta pantalla no es la única barrera.
 */
export function AccountsAdmin() {
  const { actor, auth } = useSession();
  const [profiles, setProfiles] = useState<readonly ProfileRow[] | null>(null);

  const puedeAsignar = auth.configured && can(actor, 'role:assign');

  const recargar = () => void listProfiles().then(setProfiles);

  useEffect(() => {
    if (puedeAsignar) recargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeAsignar]);

  if (!puedeAsignar) return null;

  const alternar = async (profile: ProfileRow, role: Role) => {
    const next = profile.roles.includes(role)
      ? profile.roles.filter((r) => r !== role)
      : [...profile.roles, role];
    await assignRoles(profile.id, next);
    recargar();
  };

  return (
    <section className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
      <h2 className="font-medium">Cuentas y roles</h2>
      <p className="mt-1 text-sm text-aurora-muted">
        Una cuenta nueva entra sin rol — se ve como visitante hasta que le des uno.
      </p>

      {profiles === null ? (
        <p className="mt-3 text-sm text-aurora-muted">Cargando…</p>
      ) : profiles.length === 0 ? (
        <p className="mt-3 text-sm text-aurora-muted">Nadie se ha registrado todavía.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {profiles.map((profile) => (
            <li key={profile.id} className="rounded-lg border border-aurora-border p-3">
              <p className="font-medium">{profile.displayName || 'Sin nombre'}</p>
              {profile.roles.length === 0 && (
                <p className="text-xs text-aurora-ember">Sin rol — ve la app como visitante</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ROLES.map((role) => {
                  const marcado = profile.roles.includes(role);
                  return (
                    <button
                      key={role}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => void alternar(profile, role)}
                      className={[
                        'h-9 rounded-lg border px-2.5 text-xs',
                        marcado
                          ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
                          : 'border-aurora-border text-aurora-muted',
                      ].join(' ')}
                    >
                      {ROLE_LABELS[role]}
                    </button>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
