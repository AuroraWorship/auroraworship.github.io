import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  isPending,
  VOICE_PART_LABELS,
  instrumentById,
  type Assignment,
  type Member,
  type Rehearsal,
  type Service,
  type Song,
} from '../../domain/model';
import { formatDate } from './RehearsalPage';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess, PendingNotice } from '../components/Notices';

interface Loaded {
  service: Service | null;
  rehearsal: Rehearsal | null;
  songs: readonly { song: Song; key: string; assignments: readonly Assignment[] }[];
  me: Member | null;
}

/**
 * Mi preparación.
 *
 * Responde a "¿qué me toca a mí?" sin obligar al músico a cruzar el
 * repertorio con la lista de asignaciones por su cuenta.
 */
export function PreparationPage() {
  const { actor, memberId } = useSession();
  const [data, setData] = useState<Loaded | null>(null);

  const allowed = can(actor, 'service:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;

    (async () => {
      const services = await repository.listServices(actor);
      const service = services[0] ?? null;
      const setlist = service?.setlistId
        ? await repository.getSetlist(actor, service.setlistId)
        : null;

      const songs: Array<Loaded['songs'][number]> = [];
      for (const entry of [...(setlist?.entries ?? [])].sort((a, b) => a.order - b.order)) {
        const song = await repository.getSong(actor, entry.songId);
        if (!song) continue;
        songs.push({
          song,
          key: entry.key ?? song.currentKey,
          assignments: (service?.assignments ?? []).filter(
            (a) => a.memberId === memberId && (a.songId === null || a.songId === song.id),
          ),
        });
      }

      // Próximo ensayo: el primero que no ha pasado todavía.
      const hoy = new Date().toISOString().slice(0, 10);
      const rehearsal = can(actor, 'rehearsal:read')
        ? ((await repository.listRehearsals(actor)).find((r) => r.date >= hoy) ?? null)
        : null;

      const me = memberId ? await repository.getMember(actor, memberId).catch(() => null) : null;
      if (active) setData({ service, rehearsal, songs, me });
    })();

    return () => {
      active = false;
    };
  }, [actor, memberId, allowed]);

  if (!allowed) return <NoAccess />;
  if (data === null) return <p className="text-aurora-muted">Cargando…</p>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mi preparación</h1>
        <p className="text-sm text-aurora-muted">
          {data.me ? data.me.displayName : 'Sin integrante seleccionado'}
        </p>
      </div>

      {!memberId && (
        <PendingNotice>
          Todavía no sabes quién eres dentro del equipo. Entra en{' '}
          <Link to="/equipo" className="underline underline-offset-2">
            Equipo
          </Link>{' '}
          y marca «soy yo» en tu nombre para que esta pantalla sepa qué mostrarte.
        </PendingNotice>
      )}

      {data.rehearsal && (
        <Link
          to="/ensayo"
          className="block rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
        >
          <p className="text-xs uppercase tracking-wide text-aurora-muted">Próximo ensayo</p>
          <p className="mt-0.5 font-medium">{formatDate(data.rehearsal.date)}</p>
          <p className="text-sm text-aurora-muted">
            {data.rehearsal.startTime}–{data.rehearsal.endTime}
          </p>
          {(() => {
            const mia = data.rehearsal.assignments.find((a) => a.memberId === memberId);
            if (!mia) return null;
            const parte =
              [
                mia.instrument ? instrumentById(mia.instrument)?.name : null,
                mia.voicePart ? VOICE_PART_LABELS[mia.voicePart] : null,
              ]
                .filter(Boolean)
                .join(' · ') || 'Sin detalle';
            return (
              <p className="mt-2 flex items-center gap-2 text-sm">
                <span className="rounded bg-aurora-violet/20 px-1.5 py-0.5 text-xs text-aurora-violet-soft">
                  Tu parte
                </span>
                {parte}
              </p>
            );
          })()}
        </Link>
      )}

      {!data.service && !data.rehearsal && (
        <EmptyState title="No hay servicios ni ensayos programados" />
      )}

      {data.service && (
        <>
          <div className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
            <p className="text-xs uppercase tracking-wide text-aurora-muted">Próximo servicio</p>
            <p className="mt-0.5 font-medium">{data.service.event}</p>
            <p className="text-sm text-aurora-muted">
              {isPending(data.service.date) ? 'Fecha sin confirmar' : data.service.date}
            </p>
          </div>

          {memberId && data.songs.every((s) => s.assignments.length === 0) && (
            <PendingNotice>
              No tienes ninguna asignación en este servicio todavía. Cuando el liderazgo reparta
              instrumentos y voces, aparecerán aquí junto a cada canción.
            </PendingNotice>
          )}

          <ol className="space-y-2">
            {data.songs.map(({ song, key, assignments }, index) => (
              <li key={song.id}>
                <Link
                  to={`/canciones/${song.id}`}
                  className="block rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-aurora-muted">Canción {index + 1}</p>
                      <p className="truncate font-medium">{song.title}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-aurora-surface-2 px-2.5 py-1 font-semibold text-aurora-violet-soft">
                      {key}
                    </span>
                  </div>

                  {assignments.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm">
                      {assignments.map((assignment, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="rounded bg-aurora-violet/20 px-1.5 py-0.5 text-xs text-aurora-violet-soft">
                            Tu parte
                          </span>
                          <span>
                            {[
                              assignment.instrument
                                ? instrumentById(assignment.instrument)?.name
                                : null,
                              assignment.voicePart ? VOICE_PART_LABELS[assignment.voicePart] : null,
                            ]
                              .filter(Boolean)
                              .join(' · ') || 'Sin detalle'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className="mt-2 text-sm text-aurora-muted">
                    {song.bpm ? `${song.bpm} BPM · ` : ''}
                    Tutorial:{' '}
                    {song.resources.length > 0 ? (
                      <span className="text-aurora-violet-soft">disponible</span>
                    ) : (
                      <span className="text-aurora-ember">pendiente</span>
                    )}
                  </p>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  );
}
