import { describe, expect, it } from 'vitest';
import {
  ANONYMOUS,
  type Actor,
  ROLES,
  type Role,
  can,
  canAll,
  canView,
  permissionsOf,
  scopeOf,
} from '../../src/domain/rbac/roles';

const actor = (...roles: Role[]): Actor => ({ id: 'test', roles });

describe('permisos por rol', () => {
  it('el super admin puede todo lo que exista', () => {
    const all = new Set(ROLES.flatMap((r) => [...permissionsOf(r)]));
    expect(canAll(actor('super-admin'), [...all])).toBe(true);
  });

  it('un músico lee pero no escribe', () => {
    const musician = actor('musician');
    expect(can(musician, 'song:read')).toBe(true);
    expect(can(musician, 'song:write')).toBe(false);
    expect(can(musician, 'song:delete')).toBe(false);
    expect(can(musician, 'role:assign')).toBe(false);
  });

  it('el líder organiza pero no reparte roles', () => {
    const leader = actor('leader');
    expect(can(leader, 'service:write')).toBe(true);
    expect(can(leader, 'setlist:write')).toBe(true);
    expect(can(leader, 'assignment:write')).toBe(true);
    expect(can(leader, 'role:assign')).toBe(false);
    expect(can(leader, 'song:delete')).toBe(false);
  });

  it('el director musical dirige ensayos, no servicios', () => {
    const director = actor('music-director');
    expect(can(director, 'rehearsal:write')).toBe(true);
    expect(can(director, 'service:write')).toBe(false);
  });

  it('solo super admin y admin asignan roles', () => {
    const allowed = ROLES.filter((r) => can(actor(r), 'role:assign'));
    expect(allowed).toEqual(['super-admin', 'admin']);
  });

  it('solo el super admin toca los ajustes', () => {
    const allowed = ROLES.filter((r) => can(actor(r), 'settings:write'));
    expect(allowed).toEqual(['super-admin']);
  });

  it('nadie salvo admin y super admin borra canciones', () => {
    const allowed = ROLES.filter((r) => can(actor(r), 'song:delete'));
    expect(allowed).toEqual(['super-admin', 'admin']);
  });

  it('el público lee canciones y tutoriales, y nada más', () => {
    // El alcance real lo recorta el ámbito: solo recibe lo marcado público.
    expect([...permissionsOf('public')].sort()).toEqual(['song:read', 'tutorial:read']);
    expect(can(ANONYMOUS, 'song:write')).toBe(false);
    expect(can(ANONYMOUS, 'service:read')).toBe(false);
    expect(can(ANONYMOUS, 'setlist:read')).toBe(false);
  });

  it('suma los permisos cuando hay varios roles', () => {
    const both = actor('musician', 'editor');
    expect(can(both, 'song:write')).toBe(true);
    expect(can(both, 'song:read')).toBe(true);
    expect(can(both, 'role:assign')).toBe(false);
  });
});

describe('ámbitos de visibilidad', () => {
  it('clasifica cada rol en su ámbito', () => {
    expect(scopeOf(actor('leader'))).toBe('internal');
    expect(scopeOf(actor('musician'))).toBe('internal');
    expect(scopeOf(actor('student'))).toBe('members');
    expect(scopeOf(actor('member'))).toBe('members');
    expect(scopeOf(ANONYMOUS)).toBe('public');
  });

  it('el ámbito interno alcanza todo lo de abajo', () => {
    const leader = actor('leader');
    expect(canView(leader, 'internal')).toBe(true);
    expect(canView(leader, 'members')).toBe(true);
    expect(canView(leader, 'public')).toBe(true);
  });

  it('un miembro no ve contenido interno', () => {
    const member = actor('member');
    expect(canView(member, 'internal')).toBe(false);
    expect(canView(member, 'members')).toBe(true);
    expect(canView(member, 'public')).toBe(true);
  });

  it('el anónimo solo ve lo público', () => {
    expect(canView(ANONYMOUS, 'internal')).toBe(false);
    expect(canView(ANONYMOUS, 'members')).toBe(false);
    expect(canView(ANONYMOUS, 'public')).toBe(true);
  });

  it('el ámbito sube al rol más alto que tenga el actor', () => {
    expect(scopeOf(actor('member', 'leader'))).toBe('internal');
  });
});
