import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

export function SongsPage() {
  const { actor } = useSession();
  const [text, setText] = useState('');
  const [songs, setSongs] = useState<readonly Song[] | null>(null);

  const allowed = can(actor, 'song:read');

  useEffect(() => {
    if (!allowed) {
      setSongs([]);
      return;
    }
    let active = true;
    repository.listSongs(actor, { text }).then((result) => {
      if (active) setSongs(result);
    });
    return () => {
      active = false;
    };
  }, [actor, text, allowed]);

  const count = useMemo(() => songs?.length ?? 0, [songs]);

  if (!allowed) return <NoAccess />;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Canciones</h1>
          <p className="text-sm text-aurora-muted">
            {songs === null ? 'Cargando…' : `${count} ${count === 1 ? 'canción' : 'canciones'}`}
          </p>
        </div>
        {can(actor, 'song:write') && (
          <Link
            to="/canciones/nueva"
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet px-4 text-sm font-medium text-white"
          >
            Nueva
          </Link>
        )}
      </div>

      <input
        type="search"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Buscar por título, letra o etiqueta"
        aria-label="Buscar canciones"
        className="h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-4 text-base placeholder:text-aurora-muted"
      />

      {songs !== null && songs.length === 0 && (
        <EmptyState title="Sin resultados">
          Prueba con otra palabra, o revisa el repertorio completo dejando la búsqueda vacía.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {songs?.map((song) => (
          <li key={song.id}>
            <Link
              to={`/canciones/${song.id}`}
              className="flex items-center justify-between gap-3 rounded-xl border border-aurora-border bg-aurora-surface p-4 active:bg-aurora-surface-2"
            >
              <span className="min-w-0">
                <span className="block truncate font-medium">{song.title}</span>
                <span className="block truncate text-sm text-aurora-muted">
                  {song.artist ?? 'Sin artista'}
                  {song.bpm ? ` · ${song.bpm} BPM` : ''}
                </span>
              </span>
              <span className="shrink-0 rounded-lg bg-aurora-surface-2 px-2.5 py-1 text-sm font-semibold text-aurora-violet-soft">
                {song.currentKey}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
