import { useMemo, useState } from 'react';
import { type Chord, formatChord } from '../../domain/music/chord';
import { parseKey } from '../../domain/music/key';
import { parseSongBody } from '../../domain/music/song-body';
import { transposeBodyToKey } from '../../domain/music/transpose';
import type { InstrumentId } from '../../domain/model';
import { ChordDiagram } from './ChordDiagram';

interface Props {
  body: string;
  fromKey: string;
  toKey: string;
  /** Oculta los acordes: la vista que pide un vocalista. */
  lyricsOnly?: boolean;
  /**
   * Instrumento para el que se dibuja la digitación al tocar un acorde.
   * Sin él la hoja se comporta como antes: los acordes son sólo texto.
   */
  instrument?: InstrumentId;
}

/**
 * Hoja de acordes.
 *
 * Cada acorde se coloca encima de la sílaba exacta donde entra, usando
 * inline-block por tramo. Así la línea fluye y se parte sola en una pantalla
 * estrecha sin desalinear el acorde de su sílaba.
 *
 * Si se pasa un instrumento, cada acorde se puede tocar para ver cómo se hace.
 * La ficha sale por abajo, que es donde llega el pulgar sosteniendo el móvil,
 * y no tapa la línea que se está leyendo.
 */
export function ChordSheet({ body, fromKey, toKey, lyricsOnly = false, instrument }: Props) {
  const [selected, setSelected] = useState<Chord | null>(null);

  const sections = useMemo(() => {
    const parsed = parseSongBody(body);
    try {
      return transposeBodyToKey(parsed, { from: parseKey(fromKey), to: parseKey(toKey) }).sections;
    } catch {
      // Una tonalidad ilegible no debe dejar al músico sin la letra.
      return parsed.sections;
    }
  }, [body, fromKey, toKey]);

  const interactive = Boolean(instrument) && !lyricsOnly;

  return (
    <div className="space-y-6">
      {sections.map((section, si) => (
        <section key={si}>
          {section.label && (
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-aurora-violet-soft">
              {section.label}
            </h3>
          )}
          <div className="space-y-1">
            {section.lines.map((line, li) => (
              <p key={li} className="leading-tight">
                {line.segments.map((seg, gi) => (
                  <span key={gi} className="inline-block whitespace-pre-wrap align-bottom">
                    {!lyricsOnly &&
                      (interactive && seg.chord ? (
                        <button
                          type="button"
                          data-inline-target="true"
                          onClick={() => setSelected(seg.chord ?? null)}
                          aria-label={`Ver ${formatChord(seg.chord)} en el instrumento`}
                          className="chord block rounded px-0.5 text-sm font-semibold text-aurora-ember underline decoration-aurora-ember/30 decoration-dotted underline-offset-2"
                        >
                          {formatChord(seg.chord)}
                        </button>
                      ) : (
                        <span className="chord block text-sm font-semibold text-aurora-ember">
                          {seg.chord ? formatChord(seg.chord) : ' '}
                        </span>
                      ))}
                    <span className="block text-[15px]">{seg.text || ' '}</span>
                  </span>
                ))}
              </p>
            ))}
          </div>
        </section>
      ))}

      {selected && instrument && (
        <ChordCard chord={selected} instrument={instrument} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

/** Ficha del acorde, anclada abajo para no tapar lo que se está leyendo. */
function ChordCard({
  chord,
  instrument,
  onClose,
}: {
  chord: Chord;
  instrument: InstrumentId;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-aurora-border bg-aurora-surface/98 backdrop-blur"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      role="dialog"
      aria-label={`Acorde ${formatChord(chord)}`}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3">
        <div className="min-w-0">
          <p className="chord text-xl font-semibold text-aurora-ember">{formatChord(chord)}</p>
          <p className="text-xs text-aurora-muted">Toca los puntos para ver otras posturas.</p>
        </div>

        <ChordDiagram chord={chord} instrument={instrument} />

        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-aurora-border text-aurora-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
