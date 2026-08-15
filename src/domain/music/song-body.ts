/**
 * Cuerpo de la canción: letra + acordes + estructura.
 *
 * Formato de origen (pensado para escribirse desde el teléfono):
 *
 *   # Verso 1
 *   [C]Sublime [G]gracia del [Am]Señor
 *
 * Una línea que empieza por "#" abre una sección. Los acordes van entre
 * corchetes, pegados a la sílaba donde entran. Todo lo demás es letra y se
 * conserva carácter a carácter: transponer nunca reescribe la letra.
 */

import { type AccidentalPreference, type Interval, isUnison } from './note';
import { type Chord, formatChord, tryParseChord, transposeChord } from './chord';

export type SectionType =
  | 'intro'
  | 'verse'
  | 'pre-chorus'
  | 'chorus'
  | 'bridge'
  | 'instrumental'
  | 'outro'
  | 'other';

/** Un tramo de línea: el acorde que suena y la letra que va debajo. */
export interface Segment {
  /** null cuando el tramo es letra sin acorde encima (arranque de línea). */
  chord: Chord | null;
  text: string;
}

export interface Line {
  segments: Segment[];
}

export interface Section {
  type: SectionType;
  /** Etiqueta tal cual la escribió el usuario: "Verso 1", "Coro"… */
  label: string;
  lines: Line[];
}

export interface SongBody {
  sections: Section[];
}

const SECTION_KEYWORDS: ReadonlyArray<[RegExp, SectionType]> = [
  [/^(intro|introducci[oó]n)/i, 'intro'],
  [/^(pre-?coro|pre-?chorus)/i, 'pre-chorus'],
  [/^(coro|chorus|estribillo)/i, 'chorus'],
  [/^(verso|verse|estrofa)/i, 'verse'],
  [/^(puente|bridge)/i, 'bridge'],
  [/^(instrumental|solo|interludio)/i, 'instrumental'],
  [/^(outro|final|cierre)/i, 'outro'],
];

export function classifySection(label: string): SectionType {
  for (const [pattern, type] of SECTION_KEYWORDS) {
    if (pattern.test(label.trim())) return type;
  }
  return 'other';
}

/** Divide una línea en tramos acorde+letra sin perder ningún carácter. */
function parseLine(source: string): Line {
  const segments: Segment[] = [];
  const pattern = /\[([^\]]*)\]/g;
  let cursor = 0;
  let pending: Chord | null = null;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(source)) !== null) {
    const text = source.slice(cursor, match.index);
    if (text || pending || segments.length === 0) {
      segments.push({ chord: pending, text });
    }
    // Un corchete que no contiene un acorde válido se trata como letra: es
    // preferible mostrarlo tal cual a perderlo silenciosamente.
    const chord = tryParseChord(match[1]);
    if (chord) {
      pending = chord;
    } else {
      pending = null;
      segments.push({ chord: null, text: match[0] });
    }
    cursor = match.index + match[0].length;
  }

  const tail = source.slice(cursor);
  if (tail || pending) segments.push({ chord: pending, text: tail });
  if (segments.length === 0) segments.push({ chord: null, text: '' });

  return { segments };
}

export function parseSongBody(source: string): SongBody {
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const rawLine of source.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trimEnd();

    if (line.trimStart().startsWith('#')) {
      const label = line.trimStart().replace(/^#+\s*/, '').trim();
      current = { type: classifySection(label), label, lines: [] };
      sections.push(current);
      continue;
    }

    // Letra antes de cualquier encabezado: se acoge en una sección implícita.
    if (!current) {
      if (line.trim() === '') continue;
      current = { type: 'other', label: '', lines: [] };
      sections.push(current);
    }

    current.lines.push(parseLine(line));
  }

  return { sections };
}

/** Reconstruye el texto fuente, para poder reeditar la canción. */
export function formatSongBody(body: SongBody): string {
  return body.sections
    .map((section) => {
      const header = section.label ? `# ${section.label}` : null;
      const lines = section.lines.map((line) =>
        line.segments
          .map((seg) => (seg.chord ? `[${formatChord(seg.chord)}]` : '') + seg.text)
          .join(''),
      );
      return (header ? [header, ...lines] : lines).join('\n');
    })
    .join('\n\n');
}

/**
 * Transporta el cuerpo entero.
 *
 * Secciones, orden, saltos de línea y letra quedan idénticos; solo cambian
 * los acordes.
 */
export function transposeSongBody(
  body: SongBody,
  interval: Interval,
  preference: AccidentalPreference = 'sharp',
): SongBody {
  if (isUnison(interval)) return body;
  return {
    sections: body.sections.map((section) => ({
      ...section,
      lines: section.lines.map((line) => ({
        segments: line.segments.map((seg) => ({
          ...seg,
          chord: seg.chord ? transposeChord(seg.chord, interval, preference) : null,
        })),
      })),
    })),
  };
}

/** Lista única de acordes usados, en orden de aparición. */
export function chordsUsed(body: SongBody): string[] {
  const seen = new Set<string>();
  for (const section of body.sections) {
    for (const line of section.lines) {
      for (const seg of line.segments) {
        if (seg.chord) seen.add(formatChord(seg.chord));
      }
    }
  }
  return [...seen];
}

/** Solo la letra, sin acordes — para buscador y para vista de vocalista. */
export function lyricsOf(body: SongBody): string {
  return body.sections
    .map((s) => s.lines.map((l) => l.segments.map((seg) => seg.text).join('')).join('\n'))
    .join('\n\n')
    .trim();
}
