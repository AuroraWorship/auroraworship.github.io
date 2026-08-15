import type { RehearsalBlock } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { useSession } from '../session';
import { NoAccess, PendingNotice } from '../components/Notices';

/**
 * Estructura de ensayo por defecto.
 *
 * Refleja la del manual de Aurora (miércoles, 4:00–6:00 PM), pero vive como
 * dato editable y no como regla del software: si el ministerio cambia el día
 * o los bloques, la aplicación no debe estorbar.
 */
const DEFAULT_BLOCKS: readonly RehearsalBlock[] = [
  { title: 'Oración y reflexión', minutes: 20, description: 'Abrir el ensayo buscando a Dios, no el sonido.' },
  { title: 'Preparación', minutes: 15, description: 'Montaje, afinación y prueba de sonido.' },
  { title: 'Ejercicios', minutes: 20, description: 'Técnica, vocalización y tiempo.' },
  { title: 'Repertorio', minutes: 45, description: 'Canciones del próximo servicio.' },
  { title: 'Revisión', minutes: 15, description: 'Qué salió, qué falta, quién repasa qué.' },
  { title: 'Cierre', minutes: 5, description: 'Acuerdos y oración final.' },
];

export function RehearsalPage() {
  const { actor } = useSession();
  if (!can(actor, 'rehearsal:read')) return <NoAccess />;

  const total = DEFAULT_BLOCKS.reduce((sum, block) => sum + block.minutes, 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ensayo</h1>
        <p className="text-sm text-aurora-muted">
          Estructura base · {Math.floor(total / 60)} h {total % 60 ? `${total % 60} min` : ''}
        </p>
      </div>

      <PendingNotice>
        No hay ensayos programados todavía. Los bloques de abajo son la estructura del manual de
        Aurora, editable; el calendario real y las tareas por integrante quedan pendientes de que el
        ministerio los cargue.
      </PendingNotice>

      <ol className="space-y-2">
        {DEFAULT_BLOCKS.map((block, i) => (
          <li
            key={block.title}
            className="flex gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-4"
          >
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-aurora-surface-2 text-sm text-aurora-violet-soft">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium">{block.title}</p>
                <p className="shrink-0 text-sm text-aurora-muted">{block.minutes} min</p>
              </div>
              {block.description && (
                <p className="mt-1 text-sm text-aurora-muted">{block.description}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
