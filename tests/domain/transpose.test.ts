import { describe, expect, it } from 'vitest';
import { formatChord, parseChord, transposeChordSymbol } from '../../src/domain/music/chord';
import {
  COMMON_MAJOR_KEYS,
  accidentalPreferenceFor,
  intervalBetweenKeys,
  parseKey,
  semitoneOffset,
} from '../../src/domain/music/key';
import { formatSongBody, lyricsOf, parseSongBody } from '../../src/domain/music/song-body';
import { transposeBody, transposeChordToKey } from '../../src/domain/music/transpose';

function shift(symbol: string, from: string, to: string): string {
  return formatChord(
    transposeChordToKey(parseChord(symbol), { from: parseKey(from), to: parseKey(to) }),
  );
}

describe('los ejemplos del manual de Aurora', () => {
  it('C → D', () => expect(shift('C', 'C', 'D')).toBe('D'));
  it('G → A', () => expect(shift('G', 'G', 'A')).toBe('A'));
  it('Am → Bm', () => expect(shift('Am', 'Am', 'Bm')).toBe('Bm'));
  it('F → G', () => expect(shift('F', 'F', 'G')).toBe('G'));
});

describe('progresiones completas', () => {
  it('sube I-V-vi-IV de C a D', () => {
    const progression = ['C', 'G', 'Am', 'F'];
    const moved = progression.map((c) => shift(c, 'C', 'D'));
    expect(moved).toEqual(['D', 'A', 'Bm', 'G']);
  });

  it('sube I-V-vi-IV de G a A', () => {
    const moved = ['G', 'D', 'Em', 'C'].map((c) => shift(c, 'G', 'A'));
    expect(moved).toEqual(['A', 'E', 'F#m', 'D']);
  });

  it('baja de A a G', () => {
    const moved = ['A', 'E', 'F#m', 'D'].map((c) => shift(c, 'A', 'G'));
    expect(moved).toEqual(['G', 'D', 'Em', 'C']);
  });

  it('escoge bemoles cuando la tonalidad destino los usa', () => {
    const moved = ['C', 'G', 'Am', 'F'].map((c) => shift(c, 'C', 'Eb'));
    expect(moved).toEqual(['Eb', 'Bb', 'Cm', 'Ab']);
  });

  it('escoge sostenidos cuando la tonalidad destino los usa', () => {
    const moved = ['C', 'G', 'Am', 'F'].map((c) => shift(c, 'C', 'E'));
    expect(moved).toEqual(['E', 'B', 'C#m', 'A']);
  });
});

describe('conservación del sufijo', () => {
  const suffixes = ['maj7', 'm7', '7', 'sus4', 'sus2', 'add9', 'dim', 'aug', 'm7b5', '7#9', '13', '6'];

  it.each(suffixes)('mantiene "%s" intacto al transponer', (suffix) => {
    const result = shift(`C${suffix}`, 'C', 'D');
    expect(result).toBe(`D${suffix}`);
  });

  it('transporta también el bajo de un slash chord', () => {
    expect(shift('C/E', 'C', 'D')).toBe('D/F#');
    expect(shift('G/B', 'G', 'A')).toBe('A/C#');
    expect(shift('Bb/D', 'Bb', 'C')).toBe('C/E');
  });
});

describe('propiedades del motor', () => {
  it('transponer a la misma tonalidad no cambia nada', () => {
    for (const symbol of ['C', 'Am', 'F#m7', 'Bb/D', 'Cmaj7#11']) {
      expect(shift(symbol, 'G', 'G')).toBe(symbol);
    }
  });

  it('ida y vuelta devuelve el acorde original en las 12 tonalidades', () => {
    for (const key of COMMON_MAJOR_KEYS) {
      for (const symbol of ['C', 'Am', 'F', 'G7', 'Dm7', 'C/E']) {
        const moved = shift(symbol, 'C', key);
        const back = shift(moved, key, 'C');
        expect(back).toBe(symbol);
      }
    }
  });

  it('nunca produce alteraciones triples', () => {
    for (const key of COMMON_MAJOR_KEYS) {
      for (const symbol of ['C#', 'Bb', 'F#', 'Eb', 'B#', 'Cb']) {
        const moved = shift(symbol, 'C', key);
        expect(moved).not.toMatch(/#{3}|b{3}/);
      }
    }
  });

  it('el intervalo de una tonalidad a sí misma es unísono', () => {
    const interval = intervalBetweenKeys(parseKey('D'), parseKey('D'));
    expect(interval).toEqual({ letters: 0, semitones: 0 });
  });

  it('semitoneOffset informa la distancia corta con signo', () => {
    expect(semitoneOffset(parseKey('C'), parseKey('D'))).toBe(2);
    expect(semitoneOffset(parseKey('D'), parseKey('C'))).toBe(-2);
    expect(semitoneOffset(parseKey('C'), parseKey('C'))).toBe(0);
  });

  it('deduce la preferencia de grafía de la tonalidad', () => {
    expect(accidentalPreferenceFor(parseKey('Eb'))).toBe('flat');
    expect(accidentalPreferenceFor(parseKey('F'))).toBe('flat');
    expect(accidentalPreferenceFor(parseKey('E'))).toBe('sharp');
    expect(accidentalPreferenceFor(parseKey('A'))).toBe('sharp');
  });
});

describe('transposición del cuerpo de la canción', () => {
  const source = [
    '# Verso 1',
    '[C]Sublime [G]gracia del [Am]Señor',
    '[F]que a un pecador [C]salvó',
    '',
    '# Coro',
    '[F]Su gracia me [C]enseñó',
  ].join('\n');

  it('cambia los acordes y deja la letra intacta', () => {
    const original = parseSongBody(source);
    const moved = transposeBody(original, 'C', 'D');
    expect(lyricsOf(moved)).toBe(lyricsOf(original));
  });

  it('produce el texto esperado', () => {
    const moved = transposeBody(parseSongBody(source), 'C', 'D');
    expect(formatSongBody(moved)).toContain('[D]Sublime [A]gracia del [Bm]Señor');
    expect(formatSongBody(moved)).toContain('[G]que a un pecador [D]salvó');
  });

  it('conserva el número y el nombre de las secciones', () => {
    const original = parseSongBody(source);
    const moved = transposeBody(original, 'C', 'F#');
    expect(moved.sections.map((s) => s.label)).toEqual(original.sections.map((s) => s.label));
    expect(moved.sections.map((s) => s.type)).toEqual(['verse', 'chorus']);
  });

  it('conserva el número de líneas de cada sección', () => {
    const original = parseSongBody(source);
    const moved = transposeBody(original, 'C', 'Bb');
    original.sections.forEach((section, i) => {
      expect(moved.sections[i].lines.length).toBe(section.lines.length);
    });
  });

  it('ida y vuelta reconstruye el texto original', () => {
    const moved = transposeBody(parseSongBody(source), 'C', 'A');
    const back = transposeBody(moved, 'A', 'C');
    expect(formatSongBody(back)).toBe(formatSongBody(parseSongBody(source)));
  });
});

describe('atajo por intervalo', () => {
  it('transposeChordSymbol trabaja con texto plano', () => {
    const up = intervalBetweenKeys(parseKey('C'), parseKey('D'));
    expect(transposeChordSymbol('Am7', up)).toBe('Bm7');
  });
});
