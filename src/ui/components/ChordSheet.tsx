import { useMemo } from 'react';
import { formatChord } from '../../domain/music/chord';
import { parseKey } from '../../domain/music/key';
import { parseSongBody } from '../../domain/music/song-body';
import { transposeBodyToKey } from '../../domain/music/transpose';

interface Props {
  body: string;
  fromKey: string;
  toKey: string;
  /** Oculta los acordes: la vista que pide un vocalista. */
  lyricsOnly?: boolean;
}

/**
 * Hoja de acordes.
 *
 * Cada acorde se coloca encima de la sílaba exacta donde entra, usando
 * inline-block por tramo. Así la línea fluye y se parte sola en una pantalla
 * estrecha sin desalinear el acorde de su sílaba.
 */
export function ChordSheet({ body, fromKey, toKey, lyricsOnly = false }: Props) {
  const sections = useMemo(() => {
    const parsed = parseSongBody(body);
    try {
      return transposeBodyToKey(parsed, { from: parseKey(fromKey), to: parseKey(toKey) }).sections;
    } catch {
      // Una tonalidad ilegible no debe dejar al músico sin la letra.
      return parsed.sections;
    }
  }, [body, fromKey, toKey]);

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
                    {!lyricsOnly && (
                      <span className="chord block text-sm font-semibold text-aurora-ember">
                        {seg.chord ? formatChord(seg.chord) : ' '}
                      </span>
                    )}
                    <span className="block text-[15px]">{seg.text || ' '}</span>
                  </span>
                ))}
              </p>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
