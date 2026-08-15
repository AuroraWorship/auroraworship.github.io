import { ROLES, ROLE_LABELS, type Role } from '../../domain/rbac/roles';
import { useSession } from '../session';

/**
 * Selector de rol de demostración.
 *
 * Va marcado visiblemente como demo a propósito: mientras no haya
 * autenticación real, nadie debe confundir esto con un inicio de sesión.
 */
export function RoleSwitcher() {
  const { role, setRole } = useSession();

  return (
    <label className="flex shrink-0 items-center gap-2">
      <span className="rounded bg-aurora-ember/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-aurora-ember">
        Demo
      </span>
      <select
        aria-label="Rol de demostración"
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-lg border border-aurora-border bg-aurora-surface px-2 py-1.5 text-sm text-aurora-text"
      >
        {ROLES.map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
    </label>
  );
}
