import { useMemo, useState } from 'react';
import {
  INSTRUMENTS,
  SONG_STATUS_LABELS,
  type Difficulty,
  type Member,
  type Song,
  type SongStatus,
} from '../../domain/model';
import type { SongQuery } from '../../data/repository';

interface Props {
  /** Todas las canciones visibles, para deducir qué filtros tienen sentido. */
  songs: readonly Song[];
  members: readonly Member[];
  query: SongQuery;
  onChange: (query: SongQuery) => void;
}

/**
 * Filtros del repertorio.
 *
 * Van plegados por defecto: la búsqueda por texto resuelve la mayoría de las
 * veces, y en un teléfono un panel abierto empuja la lista fuera de la
 * pantalla. Solo se ofrecen valores que existen en el repertorio — un filtro
 * que no devuelve nada es peor que no tenerlo.
 */
export function SongFilters({ songs, members, query, onChange }: Props) {
  const [abierto, setAbierto] = useState(false);

  const tonalidades = useMemo(
    () => [...new Set(songs.map((s) => s.currentKey))].sort(),
    [songs],
  );
  const etiquetas = useMemo(
    () => [...new Set(songs.flatMap((s) => s.tags))].sort((a, b) => a.localeCompare(b, 'es')),
    [songs],
  );
  const instrumentos = useMemo(
    () => INSTRUMENTS.filter((i) => songs.some((s) => s.instruments.includes(i.id))),
    [songs],
  );
  const dificultades = useMemo(
    () =>
      [...new Set(songs.map((s) => s.difficulty).filter((d): d is Difficulty => d !== null))].sort(),
    [songs],
  );
  const vocalistas = useMemo(
    () => members.filter((m) => songs.some((s) => s.vocalistKeys.some((v) => v.memberId === m.id))),
    [members, songs],
  );

  const activos = [
    query.key,
    query.tag,
    query.instrument,
    query.difficulty,
    query.vocalistId,
    query.bpmMin,
    query.bpmMax,
    query.status,
  ].filter((v) => v !== undefined && v !== '').length;

  const set = (cambios: Partial<SongQuery>) => onChange({ ...query, ...cambios });

  const limpiar = () => onChange({ text: query.text });

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          aria-expanded={abierto}
          onClick={() => setAbierto((v) => !v)}
          className={[
            'h-11 rounded-lg border px-3 text-sm',
            activos > 0
              ? 'border-aurora-violet bg-aurora-violet/20 text-aurora-violet-soft'
              : 'border-aurora-border bg-aurora-surface text-aurora-muted',
          ].join(' ')}
        >
          Filtros{activos > 0 ? ` (${activos})` : ''}
        </button>
        {activos > 0 && (
          <button
            type="button"
            onClick={limpiar}
            className="h-11 rounded-lg border border-aurora-border px-3 text-sm text-aurora-muted"
          >
            Limpiar
          </button>
        )}
      </div>

      {abierto && (
        <div className="mt-3 space-y-3 rounded-xl border border-aurora-border bg-aurora-surface p-3">
          {tonalidades.length > 1 && (
            <Campo etiqueta="Tonalidad">
              <select
                aria-label="Filtrar por tonalidad"
                value={query.key ?? ''}
                onChange={(e) => set({ key: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">Cualquiera</option>
                {tonalidades.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {instrumentos.length > 1 && (
            <Campo etiqueta="Instrumento">
              <select
                aria-label="Filtrar por instrumento"
                value={query.instrument ?? ''}
                onChange={(e) => set({ instrument: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">Cualquiera</option>
                {instrumentos.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {vocalistas.length > 0 && (
            <Campo etiqueta="Vocalista">
              <select
                aria-label="Filtrar por vocalista"
                value={query.vocalistId ?? ''}
                onChange={(e) => set({ vocalistId: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">Cualquiera</option>
                {vocalistas.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.displayName}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {etiquetas.length > 1 && (
            <Campo etiqueta="Etiqueta">
              <select
                aria-label="Filtrar por etiqueta"
                value={query.tag ?? ''}
                onChange={(e) => set({ tag: e.target.value || undefined })}
                className={selectClass}
              >
                <option value="">Cualquiera</option>
                {etiquetas.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          {dificultades.length > 1 && (
            <Campo etiqueta="Dificultad">
              <select
                aria-label="Filtrar por dificultad"
                value={query.difficulty ?? ''}
                onChange={(e) =>
                  set({ difficulty: e.target.value ? Number(e.target.value) : undefined })
                }
                className={selectClass}
              >
                <option value="">Cualquiera</option>
                {dificultades.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </Campo>
          )}

          <Campo etiqueta="Estado">
            <select
              aria-label="Filtrar por estado"
              value={query.status ?? ''}
              onChange={(e) => set({ status: (e.target.value || undefined) as SongStatus | undefined })}
              className={selectClass}
            >
              <option value="">Cualquiera</option>
              {(Object.keys(SONG_STATUS_LABELS) as SongStatus[]).map((s) => (
                <option key={s} value={s}>
                  {SONG_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo etiqueta="Tempo (BPM)">
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                aria-label="BPM mínimo"
                placeholder="Desde"
                value={query.bpmMin ?? ''}
                onChange={(e) => set({ bpmMin: e.target.value ? Number(e.target.value) : undefined })}
                className={`${selectClass} w-24`}
              />
              <span className="text-aurora-muted">–</span>
              <input
                type="number"
                inputMode="numeric"
                aria-label="BPM máximo"
                placeholder="Hasta"
                value={query.bpmMax ?? ''}
                onChange={(e) => set({ bpmMax: e.target.value ? Number(e.target.value) : undefined })}
                className={`${selectClass} w-24`}
              />
            </div>
          </Campo>
        </div>
      )}
    </div>
  );
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="text-sm text-aurora-muted">{etiqueta}</span>
      {children}
    </label>
  );
}

const selectClass =
  'h-11 rounded-lg border border-aurora-border bg-aurora-surface-2 px-2 text-base text-aurora-text';
