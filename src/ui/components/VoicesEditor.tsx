import {
  VOICE_PART_LABELS,
  instrumentById,
  type InstrumentId,
  type InstrumentPart,
  type SongVersion,
  type VoiceLine,
  type VoicePart,
} from '../../domain/model';
import { classifySection, parseSongBody } from '../../domain/music/song-body';
import { newId } from '../../domain/song-factory';
import type { Scope } from '../../domain/rbac/roles';
import { ResourceListEditor } from './ResourceListEditor';

const inputClass =
  'h-11 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base text-aurora-text';

/**
 * Voces de la canción.
 *
 * El intervalo va como texto libre ("3ª arriba", "6ª abajo") a propósito: es
 * como lo dice un equipo de alabanza, y forzarlo a un formato cerrado
 * obligaría a traducir mentalmente lo que ya saben decir.
 */
export function VoicesEditor({
  voices,
  onChange,
}: {
  voices: readonly VoiceLine[];
  onChange: (voices: readonly VoiceLine[]) => void;
}) {
  const usadas = new Set(voices.map((v) => v.part));
  const disponibles = (Object.keys(VOICE_PART_LABELS) as VoicePart[]).filter((p) => !usadas.has(p));

  const patch = (index: number, cambios: Partial<VoiceLine>) =>
    onChange(voices.map((v, i) => (i === index ? { ...v, ...cambios } : v)));

  return (
    <div>
      {voices.length === 0 && (
        <p className="mb-2 text-sm text-aurora-muted">
          Sin voces definidas. Añade la melodía y las armonías para que cada vocalista sepa qué le
          toca.
        </p>
      )}

      <ul className="space-y-2">
        {voices.map((voice, index) => (
          <li key={voice.part} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{VOICE_PART_LABELS[voice.part]}</span>
              <button
                type="button"
                aria-label={`Quitar ${VOICE_PART_LABELS[voice.part]}`}
                onClick={() => onChange(voices.filter((_, i) => i !== index))}
                className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
              >
                ×
              </button>
            </div>
            <input
              aria-label={`Intervalo de ${VOICE_PART_LABELS[voice.part]}`}
              value={voice.interval ?? ''}
              onChange={(e) => patch(index, { interval: e.target.value || null })}
              placeholder="Intervalo: 3ª arriba, 6ª abajo…"
              className={`${inputClass} mt-2`}
            />
            <input
              aria-label={`Notas de ${VOICE_PART_LABELS[voice.part]}`}
              value={voice.notes ?? ''}
              onChange={(e) => patch(index, { notes: e.target.value || null })}
              placeholder="Indicaciones para quien la canta"
              className={`${inputClass} mt-2 text-sm`}
            />
            <div className="mt-2">
              <ResourceListEditor
                resources={voice.resources}
                defaultScope="internal"
                label="Pista de referencia"
                onChange={(resources) => patch(index, { resources })}
              />
            </div>
          </li>
        ))}
      </ul>

      {disponibles.length > 0 && (
        <select
          aria-label="Añadir voz"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            onChange([
              ...voices,
              { part: e.target.value as VoicePart, interval: null, notes: null, resources: [] },
            ]);
          }}
          className={`${inputClass} mt-2`}
        >
          <option value="">Añadir voz…</option>
          {disponibles.map((part) => (
            <option key={part} value={part}>
              {VOICE_PART_LABELS[part]}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

/**
 * Qué toca cada instrumento en cada sección.
 *
 * Las secciones se leen del cuerpo de la canción en vez de pedirse a mano:
 * escribir "Coro" cuando la canción dice "Estribillo" crearía una parte que
 * no casa con nada.
 */
export function InstrumentPartsEditor({
  body,
  instruments,
  parts,
  onChange,
}: {
  body: string;
  instruments: readonly InstrumentId[];
  parts: readonly InstrumentPart[];
  onChange: (parts: readonly InstrumentPart[]) => void;
}) {
  const secciones = [
    ...new Set(
      parseSongBody(body)
        .sections.map((s) => s.label)
        .filter(Boolean),
    ),
  ];

  const patch = (index: number, cambios: Partial<InstrumentPart>) =>
    onChange(parts.map((p, i) => (i === index ? { ...p, ...cambios } : p)));

  if (instruments.length === 0) {
    return (
      <p className="text-sm text-aurora-muted">
        Marca antes qué instrumentos participan y podrás detallar aquí qué hace cada uno.
      </p>
    );
  }

  if (secciones.length === 0) {
    return (
      <p className="text-sm text-aurora-muted">
        La canción no tiene secciones todavía. Añade una línea que empiece por # en la letra —
        «# Intro», «# Coro» — y podrás asignar instrucciones a cada parte.
      </p>
    );
  }

  return (
    <div>
      <ul className="space-y-2">
        {parts.map((part, index) => (
          <li key={index} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
            <div className="flex gap-2">
              <select
                aria-label={`Instrumento de la parte ${index + 1}`}
                value={part.instrument}
                onChange={(e) => patch(index, { instrument: e.target.value as InstrumentId })}
                className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-sm"
              >
                {instruments.map((id) => (
                  <option key={id} value={id}>
                    {instrumentById(id)?.name ?? id}
                  </option>
                ))}
              </select>
              <select
                aria-label={`Sección de la parte ${index + 1}`}
                value={part.section}
                onChange={(e) => patch(index, { section: e.target.value })}
                className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-sm"
              >
                {/* Se conserva una sección que ya no exista en la letra, en vez
                    de perderla en silencio al renombrar una sección. */}
                {!secciones.includes(part.section) && (
                  <option value={part.section}>{part.section} (ya no existe)</option>
                )}
                {secciones.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <button
                type="button"
                aria-label={`Quitar parte ${index + 1}`}
                onClick={() => onChange(parts.filter((_, i) => i !== index))}
                className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
              >
                ×
              </button>
            </div>
            <input
              aria-label={`Instrucciones de la parte ${index + 1}`}
              value={part.instructions}
              onChange={(e) => patch(index, { instructions: e.target.value })}
              placeholder="Qué hace en esta sección"
              className={`${inputClass} mt-2 text-sm`}
            />
            <p className="mt-1 text-xs text-aurora-muted">
              {sectionHint(part.section)}
            </p>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          onChange([
            ...parts,
            { instrument: instruments[0], section: secciones[0], instructions: '' },
          ])
        }
        className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
      >
        Añadir parte
      </button>
    </div>
  );
}

/** Pista de qué clase de sección es, según la clasifique el motor. */
function sectionHint(label: string): string {
  const tipos: Record<string, string> = {
    intro: 'Entrada',
    verse: 'Verso',
    'pre-chorus': 'Antes del coro',
    chorus: 'Coro',
    bridge: 'Puente',
    instrumental: 'Instrumental',
    outro: 'Cierre',
    other: 'Sección libre',
  };
  return tipos[classifySection(label)] ?? 'Sección libre';
}

/** Otros arreglos de la misma canción: nombre, notas y su propia referencia. */
export function SongVersionsEditor({
  versions,
  defaultScope,
  onChange,
}: {
  versions: readonly SongVersion[];
  defaultScope: Scope;
  onChange: (versions: readonly SongVersion[]) => void;
}) {
  const patch = (index: number, cambios: Partial<SongVersion>) =>
    onChange(versions.map((v, i) => (i === index ? { ...v, ...cambios } : v)));

  return (
    <div>
      {versions.length === 0 && (
        <p className="mb-2 text-sm text-aurora-muted">Solo la versión que el equipo toca.</p>
      )}
      <ul className="space-y-2">
        {versions.map((version, index) => (
          <li key={version.id} className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
            <div className="flex gap-2">
              <input
                aria-label={`Nombre de la versión ${index + 1}`}
                value={version.label}
                onChange={(e) => patch(index, { label: e.target.value })}
                placeholder="Acústica, en vivo, del artista…"
                className="h-11 min-w-0 flex-1 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-base"
              />
              <button
                type="button"
                aria-label={`Quitar versión ${index + 1}`}
                onClick={() => onChange(versions.filter((_, i) => i !== index))}
                className="h-11 w-11 shrink-0 rounded-lg border border-red-500/40 text-red-300"
              >
                ×
              </button>
            </div>
            <input
              aria-label={`Notas de la versión ${index + 1}`}
              value={version.notes ?? ''}
              onChange={(e) => patch(index, { notes: e.target.value || null })}
              placeholder="Qué cambia en este arreglo"
              className="mt-2 h-11 w-full rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-sm"
            />
            <div className="mt-2">
              <ResourceListEditor
                resources={version.resources}
                defaultScope={defaultScope}
                label="Referencia"
                onChange={(resources) => patch(index, { resources })}
              />
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() =>
          onChange([...versions, { id: newId('version'), label: '', notes: null, resources: [] }])
        }
        className="mt-2 h-11 w-full rounded-xl border border-aurora-border text-sm"
      >
        Añadir versión
      </button>
    </div>
  );
}
