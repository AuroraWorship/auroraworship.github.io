import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  INSTRUMENTS,
  TUTORIAL_CATEGORY_LABELS,
  VOICE_PART_LABELS,
  type InstrumentId,
  type ResourceKind,
  type ResourceRef,
  type RightsStatus,
  type Song,
  type Tutorial,
  type TutorialCategory,
  type VoicePart,
} from '../../domain/model';
import { newId } from '../../domain/song-factory';
import { can, type Scope } from '../../domain/rbac/roles';
import { repository } from '../../data/repository';
import { useSession } from '../session';
import { EmptyState, NoAccess } from '../components/Notices';

const KIND_LABELS: Record<ResourceKind, string> = {
  video: 'Vídeo',
  audio: 'Audio',
  pdf: 'PDF',
  image: 'Imagen',
  link: 'Enlace',
  text: 'Texto',
};

const SCOPE_LABELS: Record<Scope, string> = {
  internal: 'Interno — solo el equipo',
  members: 'Miembros',
  public: 'Público',
};

function emptyTutorial(): Tutorial {
  return {
    id: newId('tutorial'),
    title: '',
    category: 'worship',
    description: null,
    resources: [],
    songId: null,
    instrument: null,
    voicePart: null,
    rights: { status: 'reference', holder: null, notes: null },
    scope: 'internal',
  };
}

/**
 * Editor de tutoriales.
 *
 * El material se adjunta por enlace, no por subida: no hay storage todavía
 * (bloqueo B-03). Enlazar a donde el ministerio ya guarda sus vídeos funciona
 * hoy, y cuando haya storage el modelo no cambia — `ResourceRef` ya guarda una
 * URL o una clave de objeto indistintamente.
 */
export function TutorialEditorPage() {
  const { tutorialId } = useParams();
  const navigate = useNavigate();
  const { actor } = useSession();

  const isNew = !tutorialId;
  const [tutorial, setTutorial] = useState<Tutorial | null | undefined>(undefined);
  const [songs, setSongs] = useState<readonly Song[]>([]);
  const [error, setError] = useState<string | null>(null);

  const allowed = can(actor, 'tutorial:write');

  useEffect(() => {
    if (!allowed) return;
    let active = true;
    (async () => {
      const found = isNew ? emptyTutorial() : await repository.getTutorial(actor, tutorialId);
      const lista = can(actor, 'song:read') ? await repository.listSongs(actor) : [];
      if (!active) return;
      setTutorial(found);
      setSongs(lista);
    })();
    return () => {
      active = false;
    };
  }, [actor, tutorialId, isNew, allowed]);

  if (!allowed) return <NoAccess />;
  if (tutorial === undefined) return <p className="text-aurora-muted">Cargando…</p>;
  if (tutorial === null) return <EmptyState title="Tutorial no encontrado" />;

  const patch = (changes: Partial<Tutorial>) => setTutorial({ ...tutorial, ...changes });

  const patchResource = (index: number, changes: Partial<ResourceRef>) =>
    patch({
      resources: tutorial.resources.map((r, i) => (i === index ? { ...r, ...changes } : r)),
    });

  const save = async () => {
    if (!tutorial.title.trim()) {
      setError('El tutorial necesita un título.');
      return;
    }
    const sinUrl = tutorial.resources.some((r) => !r.url.trim());
    if (sinUrl) {
      setError('Hay material sin enlace. Complétalo o quítalo.');
      return;
    }
    setError(null);
    await repository.saveTutorial(actor, { ...tutorial, title: tutorial.title.trim() });
    navigate('/tutoriales');
  };

  const remove = async () => {
    if (!confirm(`¿Borrar "${tutorial.title}"?`)) return;
    await repository.deleteTutorial(actor, tutorial.id);
    navigate('/tutoriales');
  };

  return (
    <div className="space-y-5 pb-4">
      <div>
        <button
          type="button"
          onClick={() => navigate('/tutoriales')}
          className="-my-2.5 inline-flex h-11 items-center text-sm text-aurora-muted"
        >
          ← Aprender
        </button>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {isNew ? 'Nuevo tutorial' : 'Editar tutorial'}
        </h1>
      </div>

      <label className="block">
        <span className={labelClass}>Título</span>
        <input
          value={tutorial.title}
          onChange={(e) => patch({ title: e.target.value })}
          placeholder="Qué se aprende aquí"
          className={inputClass}
        />
      </label>

      <label className="block">
        <span className={labelClass}>Categoría</span>
        <select
          value={tutorial.category}
          onChange={(e) => patch({ category: e.target.value as TutorialCategory })}
          className={inputClass}
        >
          {(Object.keys(TUTORIAL_CATEGORY_LABELS) as TutorialCategory[]).map((c) => (
            <option key={c} value={c}>
              {TUTORIAL_CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Descripción</span>
        <textarea
          value={tutorial.description ?? ''}
          onChange={(e) => patch({ description: e.target.value || null })}
          rows={3}
          className="w-full rounded-xl border border-aurora-border bg-aurora-surface p-3 text-base text-aurora-text"
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className={labelClass}>Instrumento</span>
          <select
            value={tutorial.instrument ?? ''}
            onChange={(e) => patch({ instrument: (e.target.value || null) as InstrumentId | null })}
            className={inputClass}
          >
            <option value="">Ninguno</option>
            {INSTRUMENTS.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className={labelClass}>Voz</span>
          <select
            value={tutorial.voicePart ?? ''}
            onChange={(e) => patch({ voicePart: (e.target.value || null) as VoicePart | null })}
            className={inputClass}
          >
            <option value="">Ninguna</option>
            {(Object.keys(VOICE_PART_LABELS) as VoicePart[]).map((v) => (
              <option key={v} value={v}>
                {VOICE_PART_LABELS[v]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block">
        <span className={labelClass}>Canción relacionada</span>
        <select
          value={tutorial.songId ?? ''}
          onChange={(e) => patch({ songId: e.target.value || null })}
          className={inputClass}
        >
          <option value="">Ninguna</option>
          {songs.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
            Material
          </h2>
          <p className="text-xs text-aurora-muted">Por enlace</p>
        </div>

        {tutorial.resources.length === 0 && (
          <p className="mb-2 text-sm text-aurora-muted">
            Todavía no hay material. Añade enlaces a los vídeos, audios o PDF donde el ministerio ya
            los tenga guardados.
          </p>
        )}

        <ul className="space-y-2">
          {tutorial.resources.map((resource, index) => (
            <li key={resource.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
              <div className="flex gap-2">
                <input
                  aria-label={`Título del material ${index + 1}`}
                  value={resource.title}
                  onChange={(e) => patchResource(index, { title: e.target.value })}
                  placeholder="Cómo se llama"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
                />
                <button
                  type="button"
                  aria-label={`Quitar material ${index + 1}`}
                  onClick={() =>
                    patch({ resources: tutorial.resources.filter((_, i) => i !== index) })
                  }
                  className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
                >
                  ×
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <select
                  aria-label={`Tipo del material ${index + 1}`}
                  value={resource.kind}
                  onChange={(e) => patchResource(index, { kind: e.target.value as ResourceKind })}
                  className="h-11 w-32 shrink-0 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-sm"
                >
                  {(Object.keys(KIND_LABELS) as ResourceKind[]).map((k) => (
                    <option key={k} value={k}>
                      {KIND_LABELS[k]}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Enlace del material ${index + 1}`}
                  value={resource.url}
                  onChange={(e) => patchResource(index, { url: e.target.value })}
                  placeholder="https://…"
                  inputMode="url"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-sm"
                />
              </div>
            </li>
          ))}
        </ul>

        <button
          type="button"
          onClick={() =>
            patch({
              resources: [
                ...tutorial.resources,
                {
                  id: newId('resource'),
                  kind: 'video',
                  title: '',
                  url: '',
                  sizeBytes: null,
                  rights: { status: 'reference', holder: null, notes: null },
                  scope: tutorial.scope,
                },
              ],
            })
          }
          className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
        >
          Añadir material
        </button>
      </section>

      <label className="block">
        <span className={labelClass}>Derechos del material</span>
        <select
          value={tutorial.rights.status}
          onChange={(e) =>
            patch({ rights: { ...tutorial.rights, status: e.target.value as RightsStatus } })
          }
          className={inputClass}
        >
          <option value="own">Propio de Aurora</option>
          <option value="licensed">Autorizado por el titular</option>
          <option value="public-domain">Dominio público</option>
          <option value="reference">Referencia externa (solo uso interno)</option>
        </select>
      </label>

      <label className="block">
        <span className={labelClass}>Visibilidad</span>
        <select
          value={tutorial.scope}
          onChange={(e) => patch({ scope: e.target.value as Scope })}
          className={inputClass}
        >
          {(Object.keys(SCOPE_LABELS) as Scope[]).map((s) => (
            <option key={s} value={s}>
              {SCOPE_LABELS[s]}
            </option>
          ))}
        </select>
      </label>

      {tutorial.scope === 'public' && tutorial.rights.status === 'reference' && (
        <p className="rounded-xl border border-aurora-ember/40 bg-aurora-ember/10 p-3 text-sm">
          Este tutorial enlaza material de terceros sin licencia registrada. Publicarlo puede no ser
          legítimo: revisa los derechos o déjalo en interno.
        </p>
      )}

      {error && (
        <p role="alert" className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm">
          {error}
        </p>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={save}
          className="h-12 flex-1 rounded-xl bg-aurora-violet-solid font-medium text-white"
        >
          Guardar
        </button>
        {!isNew && (
          <button
            type="button"
            onClick={remove}
            className="h-12 rounded-xl border border-red-500/40 bg-red-500/10 px-4 text-sm font-medium text-red-300"
          >
            Borrar
          </button>
        )}
      </div>
    </div>
  );
}

const labelClass = 'mb-1.5 block text-xs font-semibold uppercase tracking-wide text-aurora-muted';
const inputClass =
  'h-12 w-full rounded-xl border border-aurora-border bg-aurora-surface px-3 text-base text-aurora-text';
