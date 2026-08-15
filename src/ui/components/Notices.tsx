import type { ReactNode } from 'react';

/**
 * Aviso de dato no confirmado.
 *
 * Aurora OS nunca rellena con suposiciones lo que el ministerio no ha
 * confirmado: lo dice en pantalla.
 */
export function PendingNotice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-4 text-sm">
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-aurora-ember">
        Información pendiente
      </p>
      <div className="text-aurora-text/90">{children}</div>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl border border-aurora-border bg-aurora-surface p-6 text-center">
      <p className="font-medium">{title}</p>
      {children && <div className="mt-1 text-sm text-aurora-muted">{children}</div>}
    </div>
  );
}

/** Bloqueo por permisos. Explica, en vez de mostrar una pantalla vacía. */
export function NoAccess() {
  return (
    <EmptyState title="Sin acceso">
      Tu rol actual no tiene permiso para ver esta sección. Cambia de perfil en la parte superior
      para comprobar cómo la ve el equipo.
    </EmptyState>
  );
}
