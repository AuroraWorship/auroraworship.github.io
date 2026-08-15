import { commonKeysFor, parseKey, semitoneOffset, tryParseKey } from '../../domain/music/key';

interface Props {
  originalKey: string;
  value: string;
  onChange: (key: string) => void;
}

/**
 * Selector de tonalidad.
 *
 * Muestra siempre las dos tonalidades que Aurora distingue: la original de la
 * canción y la que se está tocando. Los botones ±1 semitono existen porque en
 * un ensayo se ajusta al vuelo, no abriendo un desplegable.
 */
export function KeySelector({ originalKey, value, onChange }: Props) {
  const original = tryParseKey(originalKey);
  const current = tryParseKey(value);
  const mode = current?.mode ?? original?.mode ?? 'major';
  const options = commonKeysFor(mode);
  const offset = original && current ? semitoneOffset(original, current) : 0;

  const step = (delta: number) => {
    const index = options.indexOf(value);
    const base = index >= 0 ? index : 0;
    const next = options[(base + delta + options.length) % options.length];
    onChange(next);
  };

  return (
    <div className="rounded-xl border border-aurora-border bg-aurora-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-aurora-muted">Tonalidad</p>
          <p className="text-sm">
            <span className="text-aurora-muted">Original {originalKey}</span>
            {offset !== 0 && (
              <span className="ml-2 rounded bg-aurora-violet/20 px-1.5 py-0.5 text-xs text-aurora-violet-soft">
                {offset > 0 ? `+${offset}` : offset} semitonos
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => step(-1)}
            aria-label="Bajar un semitono"
            className="h-11 w-11 rounded-lg border border-aurora-border bg-aurora-surface-2 text-lg"
          >
            −
          </button>
          <select
            aria-label="Tonalidad actual"
            value={options.includes(value) ? value : ''}
            onChange={(e) => onChange(e.target.value)}
            className="h-11 rounded-lg border border-aurora-border bg-aurora-surface-2 px-3 text-lg font-semibold"
          >
            {!options.includes(value) && <option value="">{value}</option>}
            {options.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => step(1)}
            aria-label="Subir un semitono"
            className="h-11 w-11 rounded-lg border border-aurora-border bg-aurora-surface-2 text-lg"
          >
            +
          </button>
        </div>
      </div>

      {value !== originalKey && (
        <button
          type="button"
          onClick={() => onChange(originalKey)}
          className="mt-3 text-xs text-aurora-violet-soft underline underline-offset-2"
        >
          Volver a la tonalidad original ({originalKey})
        </button>
      )}
    </div>
  );
}

/** Reexportado para que las pruebas de humo compartan la validación. */
export const isValidKey = (key: string) => {
  try {
    parseKey(key);
    return true;
  } catch {
    return false;
  }
};
