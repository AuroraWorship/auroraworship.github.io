import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HistoryEntry, Member, Song } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';
import { formatDate } from './RehearsalPage';

/**
 * Historial global: qué se tocó, cuándo y en qué tonalidad (§23).
 *
 * El detalle de cada canción ya muestra su propio historial; esta pantalla es
 * la vista al revés — por fecha, no por canción — para responder «¿qué
 * tocamos el mes pasado?» sin tener que abrir canción por canción.
 */
export function HistoryPage() {
  const { actor } = useSession();
  const [entries, setEntries] = useState<readonly HistoryEntry[] | null>(null);
  const [songs, setSongs] = useState<Map<string, Song>>(new Map());
  const [members, setMembers] = useState<readonly Member[]>([]);

  const allowed = can(actor, 'service:read');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const [history, allSongs, team] = await Promise.all([
        repository.listHistory(actor),
        repository.listSongs(actor),
        can(actor, 'member:read') ? repository.listMembers(actor) : Promise.resolve([]),
      ]);
      if (!active) return;
      setEntries(history);
      setSongs(new Map(allSongs.map((s) => [s.id, s])));
      setMembers(team);
    })();
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  if (!allowed) return <NoAccess />;

  return (
    <div className="space-y-4">
      <div>
        <Link to="/servicio" className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted">
          ← Servicio
        </Link>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Historial</h1>
        <p className="text-sm text-aurora-muted">
          {entries === null ? 'Cargando…' : `${entries.length} registros`}
        </p>
      </div>

      {entries?.length === 0 && (
        <EmptyState title="Todavía no hay historial">
          Se llena desde «Registrar en el historial», en la pantalla de cada servicio.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {entries?.map((entry) => {
          const song = songs.get(entry.songId);
          const vocalista = entry.leadVocalistId
            ? (members.find((m) => m.id === entry.leadVocalistId)?.displayName ?? 'Integrante retirado')
            : null;
          return (
            <li key={entry.id}>
              <Link
                to={song ? `/canciones/${song.id}` : '#'}
                className="flex items-center justify-between gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">{song?.title ?? 'Canción borrada'}</span>
                  <span className="block truncate text-sm text-aurora-muted">
                    {formatDate(entry.date)}
                    {vocalista ? ` · ${vocalista}` : ''}
                  </span>
                </span>
                <span className="shrink-0 rounded-lg bg-aurora-bg px-2.5 py-1 text-sm font-semibold text-aurora-ember">
                  {entry.key}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
