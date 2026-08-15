import { describe, expect, it } from 'vitest';
import {
  chordsUsed,
  classifySection,
  formatSongBody,
  lyricsOf,
  parseSongBody,
} from '../../src/domain/music/song-body';

describe('classifySection', () => {
  const cases: Array<[string, string]> = [
    ['Intro', 'intro'],
    ['Verso 1', 'verse'],
    ['Estrofa 2', 'verse'],
    ['Pre-Coro', 'pre-chorus'],
    ['Coro', 'chorus'],
    ['Puente', 'bridge'],
    ['Instrumental', 'instrumental'],
    ['Outro', 'outro'],
    ['Algo raro', 'other'],
  ];

  it.each(cases)('"%s" → %s', (label, type) => {
    expect(classifySection(label)).toBe(type);
  });
});

describe('parseSongBody', () => {
  it('separa secciones por encabezado', () => {
    const body = parseSongBody('# Intro\n[C] [G]\n\n# Coro\n[Am]Santo');
    expect(body.sections).toHaveLength(2);
    expect(body.sections[0].label).toBe('Intro');
    expect(body.sections[1].label).toBe('Coro');
  });

  it('extrae acordes y letra por separado', () => {
    const body = parseSongBody('# Verso\n[C]Santo [G]eres Tú');
    expect(lyricsOf(body)).toBe('Santo eres Tú');
    expect(chordsUsed(body)).toEqual(['C', 'G']);
  });

  it('acepta letra antes del primer encabezado', () => {
    const body = parseSongBody('[C]Sin encabezado');
    expect(body.sections).toHaveLength(1);
    expect(lyricsOf(body)).toBe('Sin encabezado');
  });

  it('trata como letra un corchete que no es un acorde', () => {
    const body = parseSongBody('# Verso\n[repetir] dos veces');
    expect(lyricsOf(body)).toContain('[repetir]');
    expect(chordsUsed(body)).toEqual([]);
  });

  it('no pierde caracteres al reconstruir', () => {
    const source = '# Verso 1\n[C]Sublime [G]gracia del [Am]Señor\n[F]que a un pecador [C]salvó';
    expect(formatSongBody(parseSongBody(source))).toBe(source);
  });

  it('normaliza saltos de línea de Windows', () => {
    const body = parseSongBody('# Coro\r\n[C]Santo');
    expect(body.sections).toHaveLength(1);
    expect(lyricsOf(body)).toBe('Santo');
  });

  it('lista los acordes sin repetirlos', () => {
    const body = parseSongBody('# Coro\n[C]a [G]b [C]c [Am]d');
    expect(chordsUsed(body)).toEqual(['C', 'G', 'Am']);
  });

  it('soporta una sección solo de acordes', () => {
    const body = parseSongBody('# Instrumental\n[C] [Am] [F] [G]');
    expect(chordsUsed(body)).toEqual(['C', 'Am', 'F', 'G']);
    expect(lyricsOf(body).trim()).toBe('');
  });
});
