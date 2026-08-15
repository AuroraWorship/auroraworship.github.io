import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TUTORIAL_CATEGORY_LABELS,
  type ResourceKind,
  type Tutorial,
  type TutorialCategory,
} from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const KIND_ICONS: Record<ResourceKind, string> = {
  video: '▶',
  audio: '♫',
  pdf: '▤',
  image: '▣',
  link: '↗',
  text: '¶',
};

export function TutorialsPage() {
  const { actor } = useSession();
  const [tutorials, setTutorials] = useState<readonly Tutorial[] | null>(null);
  const [categoria, setCategoria] = useState<TutorialCategory | 'todas'>('todas');

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

  // Solo se ofrecen las categorías que tienen algo: un filtro vacío es ruido.
  const categorias = useMemo(() => {
    const usadas = new Set((tutorials ?? []).map((t) => t.category));
    return (Object.keys(TUTORIAL_CATEGORY_LABELS) as TutorialCategory[]).filter((c) =>
      usadas.has(c),
    );
  }, [tutorials]);

  const mostrados = useMemo(
    () =>
      categoria === 'todas'
        ? tutorials
        : (tutorials ?? []).filter((t) => t.category === categoria),
    [tutorials, categoria],
  );

  if (!allowed) return <NoAccess />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aprender</h1>
          <p className="text-sm text-aurora-muted">
            {tutorials === null ? 'Cargando…' : `${mostrados?.length ?? 0} tutoriales`}
          </p>
        </div>
        {can(actor, 'tutorial:write') && (
          <Link
            to="/tutoriales/nuevo"
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Nuevo
          </Link>
        )}
      </div>

      {categorias.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <FilterChip active={categoria === 'todas'} onClick={() => setCategoria('todas')}>
            Todas
          </FilterChip>
          {categorias.map((c) => (
            <FilterChip key={c} active={categoria === c} onClick={() => setCategoria(c)}>
              {TUTORIAL_CATEGORY_LABELS[c]}
            </FilterChip>
          ))}
        </div>
      )}

      {mostrados?.length === 0 && (
        <EmptyState title="Todavía no hay tutoriales aquí">
          El material se organiza por categoría: piano, guitarra, bajo, batería, voz, armonía,
          teoría, sonido, secuencias y adoración.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {mostrados?.map((tutorial) => (
          <li
            key={tutorial.id}
            className="rounded-xl border border-aurora-border bg-aurora-surface p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-wide text-aurora-violet-soft">
                  {TUTORIAL_CATEGORY_LABELS[tutorial.category]}
                </p>
                <p className="mt-1 font-medium">{tutorial.title}</p>
              </div>
              {can(actor, 'tutorial:write') && (
                <Link
                  to={`/tutoriales/${tutorial.id}`}
                  className="flex h-11 shrink-0 items-center rounded-lg border border-aurora-border px-3 text-sm"
                >
                  Editar
                </Link>
              )}
            </div>

            {tutorial.description && (
              <p className="mt-1 text-sm text-aurora-muted">{tutorial.description}</p>
            )}

            {tutorial.resources.length > 0 ? (
              <ul className="mt-3 space-y-1">
                {tutorial.resources.map((resource) => (
                  <li key={resource.id}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-11 items-center gap-2 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-sm"
                    >
                      <span aria-hidden className="text-aurora-violet-soft">
                        {KIND_ICONS[resource.kind]}
                      </span>
                      <span className="min-w-0 truncate">{resource.title || resource.url}</span>
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-aurora-ember">Sin material adjunto todavía</p>
            )}

            {tutorial.rights.status === 'reference' && (
              <p className="mt-2 text-xs text-aurora-muted">
                Material externo · solo uso interno
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={[
        'h-11 rounded-lg border px-3 text-sm',
        active
          ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
          : 'border-aurora-border bg-aurora-surface text-aurora-muted',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
