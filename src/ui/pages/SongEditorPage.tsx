import { useEffect, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  INSTRUMENTS,
  type Difficulty,
  type InstrumentId,
  type RightsStatus,
  type Song,
} from '../../domain/model';
import { COMMON_MAJOR_KEYS, COMMON_MINOR_KEYS, tryParseKey } from '../../domain/music/key';
import { emptySong } from '../../domain/song-factory';
import { can, type Scope } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { ChordSheet } from '../components/ChordSheet';
import { EmptyState, NoAccess } from '../components/Notices';

const ALL_KEYS = [...COMMON_MAJOR_KEYS, ...COMMON_MINOR_KEYS];

const RIGHTS_LABELS: Record<RightsStatus, string> = {
  own: 'Propio de Aurora',
  licensed: 'Autorizado por el titular',
  'public-domain': 'Dominio público',
  reference: 'Referencia externa (solo uso interno)',
};

const SCOPE_LABELS: Record<Scope, string> = {
  internal: 'Interno — solo el equipo',
  members: 'Miembros',
  public: 'Público',
};

export function SongEditorPage() {
  const { songId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();

  const isNew = !songId;
  const [song, setSong] = useState<Song | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const allowed = can(actor, 'song:write');

  useEffect(() => {
    if (!allowed) return;
    if (isNew) {
      setSong(emptySong());
      return;
    }
    let active = true;
    repository.getSong(actor, songId).then((found) => {
      if (active) setSong(found);
    });
    return () => {
      active = false;
    };
  }, [actor, songId, isNew, allowed]);

  if (!allowed) return <NoAccess />;
  if (song === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (song === null) return <EmptyState title="Canción no encontrada" />;

  const patch = (changes: Partial<Song>) => setSong({ ...song, ...changes });

  const save = async () => {
    if (!song.title.trim()) {
      setError('La canción necesita un título.');
      return;
    }
    if (!tryParseKey(song.originalKey) || !tryParseKey(song.currentKey)) {
      setError('Revisa las tonalidades: no se reconocen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await repository.saveSong(actor, { ...song, title: song.title.trim() });
      navigate(`/canciones/${song.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar.');
      setSaving(false);
    }
  };

  const toggleInstrument = (id: InstrumentId) => {
    const has = song.instruments.includes(id);
    patch({
      instruments: has ? song.instruments.filter((i) => i !== id) : [...song.instruments, id],
    });
  };

  return (
    <div className="space-y-5 pb-4">
      <div>
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm text-aurora-muted"
        >
          ← Cancelar
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {isNew ? 'Nueva canción' : 'Editar canción'}
        </h1>
      </div>

      <Field label="Título">
        <input
          value={song.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Cómo se llama"
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Artista">
          <input
            value={song.artist ?? ''}
            onChange={(e) => patch({ artist: e.target.value || null })}
            className={inputClass}
          />
        </Field>
        <Field label="Compositor">
          <input
            value={song.composer ?? ''}
            onChange={(e) => patch({ composer: e.target.value || null })}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tonalidad original">
          <select
            value={song.originalKey}
            onChange={(e) => patch({ originalKey: e.target.value })}
            className={inputClass}
          >
            {ALL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Tonalidad del equipo">
          <select
            value={song.currentKey}
            onChange={(e) => patch({ currentKey: e.target.value })}
            className={inputClass}
          >
            {ALL_KEYS.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="BPM">
          <input
            type="number"
            inputMode="numeric"
            value={song.bpm ?? ''}
            onChange={(e) => patch({ bpm: e.target.value ? Number(e.target.value) : null })}
            className={inputClass}
          />
        </Field>
        <Field label="Compás">
          <input
            value={song.meter ?? ''}
            onChange={(e) => patch({ meter: e.target.value || null })}
            placeholder="4/4"
            className={inputClass}
          />
        </Field>
        <Field label="Dificultad">
          <select
            value={song.difficulty ?? ''}
            onChange={(e) =>
              patch({ difficulty: e.target.value ? (Number(e.target.value) as Difficulty) : null })
            }
            className={inputClass}
          >
            <option value="">—</option>
            {[1, 2, 3, 4, 5].map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Etiquetas" hint="Separadas por comas">
        <input
          value={song.tags.join(', ')}
          onChange={(e) =>
            patch({
              tags: e.target.value
                .split(',')
                .map((t) => t.trim())
                .filter(Boolean),
            })
          }
          placeholder="himno, adoración"
          className={inputClass}
        />
      </Field>

      <Field label="Instrumentos">
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((instrument) => {
            const active = song.instruments.includes(instrument.id);
            return (
              <button
                key={instrument.id}
                type="button"
                onClick={() => toggleInstrument(instrument.id)}
                aria-pressed={active}
                className={[
                  'h-10 rounded-lg border px-3 text-sm',
                  active
                    ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
                    : 'border-aurora-border bg-aurora-surface text-aurora-muted',
                ].join(' ')}
              >
                {instrument.name}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Letra y acordes"
        hint="Una línea con # abre sección. Los acordes van entre corchetes: [C]"
      >
        <textarea
          value={song.body}
          onChange={(e) => patch({ body: e.target.value })}
          rows={12}
          spellCheck={false}
          className="w-full rounded-xl border border-aurora-border bg-aurora-surface p-3 font-mono text-sm leading-relaxed text-aurora-text"
        />
      </Field>

      {song.body.trim() && (
        <div className="rounded-xl border border-aurora-border bg-aurora-surface p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
            Vista previa
          </p>
          <ChordSheet body={song.body} fromKey={song.originalKey} toKey={song.currentKey} />
        </div>
      )}

      <Field label="Derechos" hint="Solo lo propio y el dominio público pueden hacerse públicos">
        <select
          value={song.rights.status}
          onChange={(e) =>
            patch({ rights: { ...song.rights, status: e.target.value as RightsStatus } })
          }
          className={inputClass}
        >
          {(Object.keys(RIGHTS_LABELS) as RightsStatus[]).map((status) => (
            <option key={status} value={status}>
              {RIGHTS_LABELS[status]}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Titular de los derechos">
        <input
          value={song.rights.holder ?? ''}
          onChange={(e) => patch({ rights: { ...song.rights, holder: e.target.value || null } })}
          className={inputClass}
        />
      </Field>

      <Field label="Visibilidad">
        <select
          value={song.scope}
          onChange={(e) => patch({ scope: e.target.value as Scope })}
          className={inputClass}
        >
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((scope) => (
            <option key={scope} value={scope}>
              {SCOPE_LABELS[scope]}
            </option>
          ))}
        </select>
      </Field>

      {song.scope === 'public' && song.rights.status !== 'own' && song.rights.status !== 'public-domain' && (
        <p className="rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-3 text-sm">
          Esta canción está marcada como pública pero sus derechos no permiten redistribuirla.
          Cambia la visibilidad o el estado de derechos antes de publicarla.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="sticky bottom-20 flex gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="h-12 flex-1 rounded-xl bg-aurora-violet font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Guardando…' : 'Guardar'}
        </button>
      </div>
    </div>
  );
}

const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-3 text-base text-aurora-text placeholder:text-aurora-muted';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-aurora-muted">{hint}</span>}
    </label>
  );
}
