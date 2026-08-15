import { useEffect, useState } from 'react';
import { TUTORIAL_CATEGORY_LABELS, type Tutorial } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

export function TutorialsPage() {
  const { actor } = useSession();
  const [tutorials, setTutorials] = useState<readonly Tutorial[] | null>(null);

  const allowed = can(actor, 'tutorial:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    repository.listTutorials(actor).then((result) => {
      if (active) setTutorials(result);
    });
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Aprender</h1>
        <p className="text-sm text-aurora-muted">Centro de tutoriales</p>
      </div>

      {tutorials?.length === 0 && (
        <EmptyState title="Todavía no hay tutoriales">
          El material de formación se cargará por categoría: piano, guitarra, bajo, batería, voz,
          armonía, teoría, sonido, secuencias y adoración.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {tutorials?.map((tutorial) => (
          <li
            key={tutorial.id}
            className="rounded-xl border border-aurora-border bg-aurora-surface p-4"
          >
            <p className="text-xs uppercase tracking-wide text-aurora-violet-soft">
              {TUTORIAL_CATEGORY_LABELS[tutorial.category]}
            </p>
            <p className="mt-1 font-medium">{tutorial.title}</p>
            {tutorial.description && (
              <p className="mt-1 text-sm text-aurora-muted">{tutorial.description}</p>
            )}
            {tutorial.resources.length === 0 && (
              <p className="mt-2 text-xs text-aurora-ember">Sin material adjunto todavía</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
