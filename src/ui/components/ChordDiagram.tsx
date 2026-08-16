/**
 * Diagrama de un acorde sobre un instrumento.
 *
 * Dibuja lo que devuelve `voicing.ts`: mástil con la digitación en los
 * instrumentos de cuerda, teclado con las teclas pulsadas en los de tecla, y
 * nada en los de percusión, que no tienen acordes que mostrar.
 *
 * Todo es SVG generado, no imágenes: pesa unos bytes, se ve nítido en
 * cualquier pantalla y hereda los colores del tema sin tener que mantener dos
 * juegos de archivos.
 */

import { useMemo, useState } from 'react';
import { type Chord, formatChord } from '../../domain/music/chord';
import { chordTones } from '../../domain/music/chord-tones';
import {
  type Tuning,
  type Voicing,
  findVoicings,
  keyboardVoicing,
  tuningFor,
} from '../../domain/music/voicing';
import { type InstrumentId, instrumentById } from '../../domain/model';

interface Props {
  chord: Chord;
  instrument: InstrumentId;
}

/** Geometría del mástil, en unidades de SVG. */
const PAD_X = 14;
const PAD_TOP = 26;
const STRING_GAP = 18;
const FRET_GAP = 24;

function Fretboard({ voicing, tuning }: { voicing: Voicing; tuning: Tuning }): React.JSX.Element {
  const strings = tuning.strings.length;
  const frets = tuning.visibleFrets;

  const width = PAD_X * 2 + (strings - 1) * STRING_GAP;
  const height = PAD_TOP + frets * FRET_GAP + 10;

  // Una postura abierta se dibuja desde la cejuela; una alta, desde su traste.
  const origin = voicing.baseFret <= 1 ? 0 : voicing.baseFret - 1;
  const x = (index: number): number => PAD_X + index * STRING_GAP;
  const y = (fret: number): number => PAD_TOP + fret * FRET_GAP;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="text-aurora-muted"
      aria-hidden="true"
    >
      <g stroke="currentColor" strokeWidth="1" opacity="0.55">
        {tuning.strings.map((_, index) => (
          <line key={index} x1={x(index)} y1={y(0)} x2={x(index)} y2={y(frets)} />
        ))}
        {Array.from({ length: frets }, (_, fret) => (
          <line key={fret} x1={x(0)} y1={y(fret + 1)} x2={x(strings - 1)} y2={y(fret + 1)} />
        ))}
      </g>

      {origin === 0 ? (
        <line
          x1={x(0)}
          y1={y(0)}
          x2={x(strings - 1)}
          y2={y(0)}
          stroke="currentColor"
          strokeWidth="3.5"
        />
      ) : (
        <text
          x={x(0) - 6}
          y={y(0) + FRET_GAP * 0.7}
          textAnchor="end"
          className="fill-aurora-muted"
          fontSize="10"
        >
          {origin + 1}
        </text>
      )}

      {/* Cuerdas al aire y muteadas, encima de la cejuela. */}
      {voicing.frets.map((fret, index) =>
        fret === null ? (
          <g key={index} stroke="currentColor" strokeWidth="1.4">
            <line x1={x(index) - 4} y1={y(0) - 14} x2={x(index) + 4} y2={y(0) - 6} />
            <line x1={x(index) + 4} y1={y(0) - 14} x2={x(index) - 4} y2={y(0) - 6} />
          </g>
        ) : fret === 0 ? (
          <circle
            key={index}
            cx={x(index)}
            cy={y(0) - 10}
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.4"
          />
        ) : null,
      )}

      {voicing.frets.map((fret, index) =>
        fret !== null && fret > 0 ? (
          <circle
            key={index}
            cx={x(index)}
            cy={y(fret - origin) - FRET_GAP / 2}
            r="6.5"
            className="fill-aurora-violet"
          />
        ) : null,
      )}
    </svg>
  );
}

/** Semitonos que ocupa cada tecla blanca dentro de la octava. */
const WHITE_KEYS = [0, 2, 4, 5, 7, 9, 11];

function Keyboard({ notes }: { notes: readonly number[] }): React.JSX.Element {
  const lowest = Math.min(...notes);
  const highest = Math.max(...notes);

  // Se empieza en el Do inmediatamente por debajo de la nota más grave.
  const start = Math.floor(lowest / 12) * 12;
  const octaves = Math.max(1, Math.ceil((highest - start + 1) / 12));

  const keyWidth = 15;
  const keyHeight = 62;
  const whiteCount = octaves * 7;
  const pressed = new Set(notes);

  const whites: React.JSX.Element[] = [];
  const blacks: React.JSX.Element[] = [];

  for (let octave = 0; octave < octaves; octave += 1) {
    WHITE_KEYS.forEach((semitone, index) => {
      const midi = start + octave * 12 + semitone;
      const position = octave * 7 + index;
      whites.push(
        <rect
          key={`w${midi}`}
          x={position * keyWidth}
          y={0}
          width={keyWidth - 1}
          height={keyHeight}
          rx="2"
          className={pressed.has(midi) ? 'fill-aurora-violet' : 'fill-aurora-surface-2'}
          stroke="currentColor"
          strokeWidth="0.7"
          opacity={pressed.has(midi) ? 1 : 0.85}
        />,
      );

      // La negra que sigue a esta blanca, si en el teclado existe.
      if (semitone === 4 || semitone === 11) return;
      const black = midi + 1;
      blacks.push(
        <rect
          key={`b${black}`}
          x={position * keyWidth + keyWidth * 0.62}
          y={0}
          width={keyWidth * 0.7}
          height={keyHeight * 0.62}
          rx="1.5"
          className={pressed.has(black) ? 'fill-aurora-violet' : 'fill-aurora-bg'}
          stroke="currentColor"
          strokeWidth="0.7"
        />,
      );
    });
  }

  return (
    <svg
      width={whiteCount * keyWidth}
      height={keyHeight}
      viewBox={`0 0 ${whiteCount * keyWidth} ${keyHeight}`}
      className="text-aurora-border"
      aria-hidden="true"
    >
      {whites}
      {blacks}
    </svg>
  );
}

/** Texto que lee un lector de pantalla en lugar del dibujo. */
function describe(voicing: Voicing, tuning: Tuning): string {
  return voicing.frets
    .map((fret, index) => {
      const cuerda = tuning.strings.length - index;
      if (fret === null) return `${cuerda}ª muteada`;
      if (fret === 0) return `${cuerda}ª al aire`;
      return `${cuerda}ª en el traste ${fret}`;
    })
    .join(', ');
}

export function ChordDiagram({ chord, instrument }: Props): React.JSX.Element | null {
  const [alternative, setAlternative] = useState(0);
  const tuning = tuningFor(instrument);

  const voicings = useMemo(
    () => (tuning ? findVoicings(chord, tuning, 4) : []),
    [chord, tuning],
  );

  const family = instrumentById(instrument)?.family;
  const symbol = formatChord(chord);

  if (family === 'keys') {
    return (
      <figure className="m-0 flex flex-col items-center gap-2">
        <Keyboard notes={keyboardVoicing(chord)} />
        <figcaption className="text-xs text-aurora-muted">
          {symbol} · {chordTones(chord).length} notas
        </figcaption>
      </figure>
    );
  }

  if (!tuning) {
    return (
      <p className="text-sm text-aurora-muted">
        {instrumentById(instrument)?.name ?? 'Este instrumento'} no lleva acordes.
      </p>
    );
  }

  if (voicings.length === 0) {
    return (
      <p className="text-sm text-aurora-muted">
        No hay una postura cómoda de {symbol} en este instrumento.
      </p>
    );
  }

  const current = voicings[Math.min(alternative, voicings.length - 1)];

  return (
    <figure className="m-0 flex flex-col items-center gap-2">
      <div role="img" aria-label={`${symbol}: ${describe(current, tuning)}`}>
        <Fretboard voicing={current} tuning={tuning} />
      </div>

      {voicings.length > 1 && (
        <div className="flex items-center gap-1" role="group" aria-label="Otras posturas">
          {voicings.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setAlternative(index)}
              aria-label={`Postura ${index + 1} de ${voicings.length}`}
              aria-pressed={index === alternative}
              className="grid h-11 w-11 place-items-center"
            >
              <span
                className={`block h-2 w-2 rounded-full ${
                  index === alternative ? 'bg-aurora-violet' : 'bg-aurora-border'
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </figure>
  );
}
