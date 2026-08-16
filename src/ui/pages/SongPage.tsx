import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  VOICE_PART_LABELS,
  instrumentById,
  type HistoryEntry,
  type Member,
  type Song,
} from '../../domain/model';
import { formatDate } from './RehearsalPage';
import { can } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { ChordSheet } from '../components/ChordSheet';
import { KeySelector } from '../components/KeySelector';
import { EmptyState, NoAccess } from '../components/Notices';
import { DIAGRAM_INSTRUMENTS, useChordInstrument } from '../hooks/useChordInstrument';

type Tab = 'sheet' | 'lyrics' | 'detail';

const TABS: Array<[Tab, string]> = [
  ['sheet', 'Acordes'],
  ['lyrics', 'Letra'],
  ['detail', 'Detalle'],
];

export function SongPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();
  const [song, setSong] = useState<Song | null | undefined>(undefined);
  const [members, setMembers] = useState<readonly Member[]>([]);
  const [favorite, setFavorite] = useState(false);
  const [history, setHistory] = useState<readonly HistoryEntry[]>([]);
  const [key, setKey] = useState<string | null>(null);
  const [instrument, setInstrument] = useChordInstrument();
  const [tab, setTab] = useState<Tab>('sheet');

  const allowed = can(actor, 'song:read');

  useEffect(() => {
    if (!can(actor, 'member:read')) return;
    let active = true;
    repository.listMembers(actor).then((list) => {
      if (active) setMembers(list);
    });
    return () => {
      active = false;
    };
  }, [actor]);

  useEffect(() => {
    if (!songId || !can(actor, 'service:read')) return;
    let live = true;
    repository.listHistory(actor, songId).then((entries) => {
      if (live) setHistory(entries);
    });
    return () => {
      live = false;
    };
  }, [actor, songId]);

  useEffect(() => {
    if (!songId || !allowed) return;
    let live = true;
    repository.listFavorites(actor).then((ids) => {
      if (live) setFavorite(ids.includes(songId));
    });
    return () => {
      live = false;
    };
  }, [actor, songId, allowed]);

  useEffect(() => {
    if (!songId || !allowed) return;
    let active = true;
    repository.getSong(actor, songId).then((result) => {
      if (!active) return;
      setSong(result);
      // La tonalidad elegida se reinicia al abrir otra canción.
      setKey(result?.currentKey ?? null);
    });
    return () => {
      active = false;
    };
  }, [actor, songId, allowed]);

  if (!allowed) return <NoAccess />;
  if (song === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (song === null) {
    return (
      <EmptyState title="Canción no encontrada">
        <Link to="/canciones" className="text-aurora-violet-soft underline">
          Volver al repertorio
        </Link>
      </EmptyState>
    );
  }

  const activeKey = key ?? song.currentKey;

  return (
    <article className="space-y-4">
      <div>
        <Link to="/canciones" className="text-sm text-aurora-muted">
          ← Canciones
        </Link>
        <div className="mt-1 flex items-start justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{song.title}</h1>
          <button
            type="button"
            aria-pressed={favorite}
            aria-label={favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}
            onClick={async () => {
              const ids = await repository.toggleFavorite(actor, song.id);
              setFavorite(ids.includes(song.id));
            }}
            className={[
              'h-11 w-11 shrink-0 rounded-xl border text-lg',
              favorite
                ? 'border-aurora-ember/50 bg-aurora-ember/15 text-aurora-ember'
                : 'border-aurora-border text-aurora-muted',
            ].join(' ')}
          >
            {favorite ? '★' : '☆'}
          </button>
        </div>
        <p className="text-sm text-aurora-muted">
          {[song.artist, song.meter, song.bpm ? `${song.bpm} BPM` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>

      {(can(actor, 'song:write') || can(actor, 'song:delete')) && (
        <div className="flex gap-2">
          {can(actor, 'song:write') && (
            <Link
              to={`/canciones/${song.id}/editar`}
              className="flex h-11 flex-1 items-center justify-center rounded-xl border border-aurora-border bg-aurora-surface text-sm font-medium"
            >
              Editar
            </Link>
          )}
          {can(actor, 'song:delete') && (
            <button
              type="button"
              onClick={async () => {
                // Borrar una canción se lleva por delante su historial de uso;
                // una confirmación explícita es lo mínimo razonable.
                if (!confirm(`¿Borrar "${song.title}"? No se puede deshacer.`)) return;
                await repository.deleteSong(actor, song.id);
                navigate('/canciones');
              }}
              className="h-11 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300"
            >
              Borrar
            </button>
          )}
        </div>
      )}

      <KeySelector originalKey={song.originalKey} value={activeKey} onChange={setKey} />

      <div role="tablist" className="flex gap-1 rounded-xl border border-aurora-border bg-aurora-surface p-1">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={[
              'h-10 flex-1 rounded-lg text-sm font-medium transition-colors',
              tab === id ? 'bg-aurora-violet-solid text-white' : 'text-aurora-muted',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sheet' && (
        <div className="flex items-center gap-2">
          <label htmlFor="diagram-instrument" className="text-xs text-aurora-muted">
            Digitaciones
          </label>
          <select
            id="diagram-instrument"
            value={instrument ?? ''}
            onChange={(event) => setInstrument(event.target.value || null)}
            className="h-11 flex-1 rounded-xl border border-aurora-border bg-aurora-surface px-3 text-sm"
          >
            <option value="">Sin diagramas</option>
            {DIAGRAM_INSTRUMENTS.map((id) => (
              <option key={id} value={id}>
                {instrumentById(id)?.name ?? id}
              </option>
            ))}
          </select>
        </div>
      )}

      {tab !== 'detail' && (
        <ChordSheet
          body={song.body}
          fromKey={song.originalKey}
          toKey={activeKey}
          lyricsOnly={tab === 'lyrics'}
          instrument={instrument ?? undefined}
        />
      )}

      {tab === 'detail' && <SongDetail song={song} members={members} history={history} />}
    </article>
  );
}

function SongDetail({
  song,
  members,
  history,
}: {
  song: Song;
  members: readonly Member[];
  history: readonly HistoryEntry[];
}) {
  return (
    <div className="space-y-4 text-sm">
      <Block title="Instrumentos">
        {song.instruments.length === 0 ? (
          <p className="text-aurora-muted">Sin instrumentos definidos.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {song.instruments.map((id) => (
              <li
                key={id}
                className="rounded-lg border border-aurora-border bg-aurora-surface-2 px-2.5 py-1"
              >
                {instrumentById(id)?.name ?? id}
              </li>
            ))}
          </ul>
        )}
      </Block>

      {song.instrumentParts.length > 0 && (
        <Block title="Partes por instrumento">
          <ul className="space-y-2">
            {song.instrumentParts.map((part, i) => (
              <li key={i} className="rounded-lg border border-aurora-border bg-aurora-surface p-3">
                <p className="font-medium">
                  {instrumentById(part.instrument)?.name ?? part.instrument}
                  <span className="ml-2 text-xs uppercase tracking-wide text-aurora-violet-soft">
                    {part.section}
                  </span>
                </p>
                <p className="mt-1 text-aurora-muted">{part.instructions}</p>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Voces">
        {song.voices.length === 0 ? (
          <p className="text-aurora-muted">Sin voces definidas.</p>
        ) : (
          <ul className="space-y-1">
            {song.voices.map((voice, i) => (
              <li key={i} className="flex justify-between gap-3">
                <span>{VOICE_PART_LABELS[voice.part]}</span>
                <span className="text-aurora-muted">{voice.interval ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Tonalidades por vocalista">
        {song.vocalistKeys.length === 0 ? (
          <p className="text-aurora-muted">
            INFORMACIÓN PENDIENTE — Aurora aún no ha registrado qué vocalista canta esta canción ni
            en qué tonalidad.
          </p>
        ) : (
          <ul className="space-y-1">
            {song.vocalistKeys.map((vk) => (
              <li key={vk.memberId} className="flex justify-between">
                <span>
                  {members.find((m) => m.id === vk.memberId)?.displayName ?? 'Integrante retirado'}
                </span>
                <span className="font-semibold text-aurora-violet-soft">{vk.key}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title="Historial">
        {history.length === 0 ? (
          <p className="text-aurora-muted">
            Todavía no se ha registrado ninguna vez que se tocara esta canción.
          </p>
        ) : (
          <ul className="space-y-1">
            {history.slice(0, 8).map((entry) => (
              <li key={entry.id} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">
                  {formatDate(entry.date)}
                  {entry.leadVocalistId && (
                    <span className="text-aurora-muted">
                      {' · '}
                      {members.find((m) => m.id === entry.leadVocalistId)?.displayName ??
                        'Integrante retirado'}
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-aurora-violet-soft">{entry.key}</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      {song.versions.length > 0 && (
        <Block title="Otras versiones">
          <ul className="space-y-2">
            {song.versions.map((version) => (
              <li key={version.id}>
                <p className="font-medium">{version.label || 'Sin nombre'}</p>
                {version.notes && <p className="text-aurora-muted">{version.notes}</p>}
                {version.resources.map((r) => (
                  <a
                    key={r.id}
                    href={r.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 flex h-9 items-center text-aurora-violet-soft underline underline-offset-2"
                  >
                    {r.title || r.url}
                  </a>
                ))}
              </li>
            ))}
          </ul>
        </Block>
      )}

      {song.resources.length > 0 && (
        <Block title="Material">
          <ul className="space-y-1">
            {song.resources.map((r) => (
              <li key={r.id}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 items-center text-aurora-violet-soft underline underline-offset-2"
                >
                  {r.title || r.url}
                </a>
              </li>
            ))}
          </ul>
        </Block>
      )}

      <Block title="Derechos">
        <p className="text-aurora-muted">
          {song.rights.holder ?? 'Titular sin confirmar'} — {rightsLabel(song.rights.status)}
          {song.rights.notes ? ` · ${song.rights.notes}` : ''}
        </p>
      </Block>
    </div>
  );
}

function rightsLabel(status: Song['rights']['status']): string {
  switch (status) {
    case 'own':
      return 'contenido propio de Aurora';
    case 'licensed':
      return 'uso autorizado';
    case 'public-domain':
      return 'dominio público';
    case 'reference':
      return 'referencia externa, solo uso interno';
  }
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
        {title}
      </h2>
      {children}
    </section>
  );
}
