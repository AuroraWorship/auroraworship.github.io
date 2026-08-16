import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Member, Song } from '../../domain/model';
import { can } from '../../domain/rbac/roles';
import { repository, type SongQuery } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';
import { SongFilters } from '../components/SongFilters';

export function SongsPage() {
  const { actor } = useSession();
  const [query, setQuery] = useState<SongQuery>({});
  const [songs, setSongs] = useState<readonly Song[] | null>(null);
  /** Sin filtrar: los filtros necesitan saber qué valores existen de verdad. */
  const [todas, setTodas] = useState<readonly Song[]>([]);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [favorites, setFavorites] = useState<readonly string[]>([]);
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  const allowed = can(actor, 'song:read');

  useEffect(() => {
    if (!allowed) {
      setSongs([]);
      return;
    }
    let active = true;
    repository.listSongs(actor, query).then((result) => {
      if (active) setSongs(result);
    });
    return () => {
      active = false;
    };
  }, [actor, query, allowed]);

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const [completas, ids, equipo] = await Promise.all([
        repository.listSongs(actor),
        repository.listFavorites(actor),
        can(actor, 'member:read') ? repository.listMembers(actor) : Promise.resolve([]),
      ]);
      if (!active) return;
      setTodas(completas);
      setFavorites(ids);
      setMembers(equipo);
    })();
    return () => {
      active = false;
    };
  }, [actor, allowed]);

  const shown = useMemo(
    () => (onlyFavorites ? (songs ?? []).filter((s) => favorites.includes(s.id)) : songs),
    [songs, favorites, onlyFavorites],
  );
  const count = shown?.length ?? 0;

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
            className="flex h-11 shrink-0 items-center rounded-xl bg-aurora-violet-solid px-4 text-sm font-medium text-white"
          >
            Nueva
          </Link>
        )}
      </div>

      <input
        type="search"
        value={query.text ?? ''}
        onChange={(e) => setQuery({ ...query, text: e.target.value })}
        placeholder="Buscar por título, letra o etiqueta"
        aria-label="Buscar canciones"
        className="h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-4 text-base placeholder:text-aurora-muted"
      />

      <div className="flex flex-wrap gap-2">
        {favorites.length > 0 && (
          <button
            type="button"
            aria-pressed={onlyFavorites}
            onClick={() => setOnlyFavorites((v) => !v)}
            className={[
              'h-11 rounded-lg border px-3 text-sm',
              onlyFavorites
                ? 'border-aurora-ember/50 bg-aurora-ember/15 text-aurora-ember'
                : 'border-aurora-border bg-aurora-surface text-aurora-muted',
            ].join(' ')}
          >
            ★ Favoritos ({favorites.length})
          </button>
        )}
        <SongFilters songs={todas} members={members} query={query} onChange={setQuery} />
      </div>

      {shown !== null && shown.length === 0 && (
        <EmptyState title="Sin resultados">
          Prueba con otra palabra o quita algún filtro.
        </EmptyState>
      )}

      <ul className="space-y-2">
        {shown?.map((song) => (
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
              <span className="shrink-0 rounded-lg bg-aurora-bg px-2.5 py-1 text-sm font-semibold text-aurora-ember">
                {song.currentKey}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
