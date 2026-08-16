import { type ResourceKind, type ResourceRef } from '../../domain/model';
import type { Scope } from '../../domain/rbac/roles';
import { newId } from '../../domain/song-factory';

export const RESOURCE_KIND_LABELS: Record<ResourceKind, string> = {
  video: 'Vídeo',
  audio: 'Audio',
  pdf: 'PDF',
  image: 'Imagen',
  link: 'Enlace',
  text: 'Texto',
};

/**
 * Editor de recursos por enlace, compartido por canciones, voces y
 * tutoriales.
 *
 * Sin storage (bloqueo B-03) el material se referencia por URL, nunca se
 * sube. `ResourceRef` guarda igual una URL externa que una futura clave de
 * objeto, así que este editor no cambiará cuando llegue storage real.
 */
export function ResourceListEditor({
  resources,
  defaultScope,
  onChange,
  label = 'Material',
}: {
  resources: readonly ResourceRef[];
  defaultScope: Scope;
  onChange: (resources: readonly ResourceRef[]) => void;
  label?: string;
}) {
  const patch = (index: number, cambios: Partial<ResourceRef>) =>
    onChange(resources.map((r, i) => (i === index ? { ...r, ...cambios } : r)));

  return (
    <div>
      {resources.length === 0 && (
        <p className="mb-2 text-sm text-aurora-muted">Sin {label.toLowerCase()} adjunto.</p>
      )}
      <ul className="space-y-2">
        {resources.map((resource, index) => (
          <li key={resource.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
            <div className="flex gap-2">
              <input
                aria-label={`Título del material ${index + 1}`}
                value={resource.title}
                onChange={(e) => patch(index, { title: e.target.value })}
                placeholder="Cómo se llama"
                className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
              />
              <button
                type="button"
                aria-label={`Quitar material ${index + 1}`}
                onClick={() => onChange(resources.filter((_, i) => i !== index))}
                className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
              >
                ×
              </button>
            </div>
            <div className="mt-2 flex gap-2">
              <select
                aria-label={`Tipo del material ${index + 1}`}
                value={resource.kind}
                onChange={(e) => patch(index, { kind: e.target.value as ResourceKind })}
                className="h-11 w-32 shrink-0 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-sm"
              >
                {(Object.keys(RESOURCE_KIND_LABELS) as ResourceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {RESOURCE_KIND_LABELS[k]}
                  </option>
                ))}
              </select>
              <input
                aria-label={`Enlace del material ${index + 1}`}
                value={resource.url}
                onChange={(e) => patch(index, { url: e.target.value })}
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
          onChange([
            ...resources,
            {
              id: newId('resource'),
              kind: 'video',
              title: '',
              url: '',
              sizeBytes: null,
              rights: { status: 'reference', holder: null, notes: null },
              scope: defaultScope,
            },
          ])
        }
        className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
      >
        Añadir {label.toLowerCase()}
      </button>
    </div>
  );
}

/** Un recurso sin URL bloquea el guardado en vez de guardarse a medias. */
export function hasIncompleteResource(resources: readonly ResourceRef[]): boolean {
  return resources.some((r) => !r.url.trim());
}
