import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Rehearsal, Setlist } from '../../domain/model';
import { DEFAULT_BLOCKS, formatDuration, totalMinutes } from '../../domain/rehearsal-factory';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess, PendingNotice } from '../components/Notices';

export function RehearsalPage() {
  const { actor } = useSession();
  const [rehearsals, setRehearsals] = useState<readonly Rehearsal[] | null>(null);
  const [setlists, setSetlists] = useState<readonly Setlist[]>([]);

  const allowed = can(actor, 'rehearsal:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const list = await repository.listRehearsals(actor);
      const lists = can(actor, 'setlist:read') ? await repository.listSetlists(actor) : [];
      if (active) {
        setRehearsals(list);
        setSetlists(lists);
      }
    })();
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;

  const hoy = new Date().toISOString().slice(0, 10);
  const proximos = (rehearsals ?? []).filter((r) => r.date >= hoy);
  const pasados = (rehearsals ?? []).filter((r) => r.date < hoy).reverse();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Ensayos</h1>
          <p className="text-sm text-aurora-muted">
            {rehearsals === null
              ? 'Cargando…'
              : `${proximos.length} ${proximos.length === 1 ? 'programado' : 'programados'}`}
          </p>
        </div>
        {can(actor, 'rehearsal:write') && (
          <Link
            to="/ensayo/nuevo"
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Nuevo
          </Link>
        )}
      </div>

      <Link
        to="/vivo?modo=ensayo"
        className="flex h-12 items-center justify-center rounded-xl border border-aurora-violet/50 bg-aurora-violet/10 text-sm font-medium text-aurora-violet-soft"
      >
        Modo ensayo
      </Link>

      {rehearsals !== null && rehearsals.length === 0 && (
        <>
          <PendingNotice>
            No hay ensayos programados todavía. La estructura de abajo es la del manual de Aurora y
            se copia en cada ensayo nuevo, donde puedes ajustarla.
          </PendingNotice>
          <BlockList blocks={DEFAULT_BLOCKS} title="Estructura base" />
        </>
      )}

      {proximos.map((rehearsal) => (
        <RehearsalCard
          key={rehearsal.id}
          rehearsal={rehearsal}
          setlist={setlists.find((s) => s.id === rehearsal.setlistId) ?? null}
          editable={can(actor, 'rehearsal:write')}
        />
      ))}

      {pasados.length > 0 && (
        <section>
          <h2 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-widest text-aurora-muted">
            Anteriores
          </h2>
          <div className="space-y-2 opacity-70">
            {pasados.map((rehearsal) => (
              <RehearsalCard
                key={rehearsal.id}
                rehearsal={rehearsal}
                setlist={setlists.find((s) => s.id === rehearsal.setlistId) ?? null}
                editable={can(actor, 'rehearsal:write')}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function RehearsalCard({
  rehearsal,
  setlist,
  editable,
}: {
  rehearsal: Rehearsal;
  setlist: Setlist | null;
  editable: boolean;
}) {
  const total = totalMinutes(rehearsal.blocks);
  return (
    <article className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium">{formatDate(rehearsal.date)}</p>
          <p className="text-sm text-aurora-muted">
            {rehearsal.startTime}–{rehearsal.endTime} · {formatDuration(total)} en bloques
          </p>
        </div>
        {editable && (
          <Link
            to={`/ensayo/${rehearsal.id}`}
            className="flex h-11 shrink-0 items-center rounded-lg border border-aurora-border px-3 text-sm"
          >
            Editar
          </Link>
        )}
      </div>

      <p className="mt-2 text-sm text-aurora-muted">
        Repertorio:{' '}
        {setlist ? (
          <span className="text-aurora-text">
            {setlist.name} · {setlist.entries.length} canciones
          </span>
        ) : (
          <span className="text-aurora-ember">sin asignar</span>
        )}
      </p>

      <ol className="mt-3 space-y-1 text-sm">
        {rehearsal.blocks.map((block, i) => (
          <li key={i} className="flex justify-between gap-3">
            <span className="min-w-0 truncate">{block.title}</span>
            <span className="shrink-0 text-aurora-muted">{block.minutes} min</span>
          </li>
        ))}
      </ol>
    </article>
  );
}

function BlockList({ blocks, title }: { blocks: readonly typeof DEFAULT_BLOCKS[number][]; title: string }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
        {title} · {formatDuration(totalMinutes(blocks))}
      </h2>
      <ol className="space-y-2">
        {blocks.map((block, i) => (
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
    </section>
  );
}

/** Fecha legible en español, sin depender de librerías de fechas. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

export function EmptyRehearsals() {
  return <EmptyState title="No hay ensayos" />;
}
