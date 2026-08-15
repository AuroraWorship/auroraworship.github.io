/**
 * Control de acceso basado en roles.
 *
 * Aurora trabaja con menores de edad, así que el modelo parte de negar por
 * defecto: un permiso existe solo si está escrito. Los tres ámbitos del
 * sistema (interno, miembros, público) se derivan de los permisos, no al
 * revés.
 */

export type Role =
  | 'super-admin'
  | 'admin'
  | 'leader'
  | 'music-director'
  | 'musician'
  | 'vocalist'
  | 'tech'
  | 'editor'
  | 'student'
  | 'member'
  | 'public';

export const ROLES: readonly Role[] = [
  'super-admin', 'admin', 'leader', 'music-director', 'musician',
  'vocalist', 'tech', 'editor', 'student', 'member', 'public',
];

export const ROLE_LABELS: Record<Role, string> = {
  'super-admin': 'Super Admin',
  admin: 'Admin Aurora',
  leader: 'Líder',
  'music-director': 'Director Musical',
  musician: 'Músico',
  vocalist: 'Vocalista',
  tech: 'Técnico',
  editor: 'Editor',
  student: 'Estudiante',
  member: 'Miembro',
  public: 'Público',
};

/** Ámbito de visibilidad de un contenido. */
export type Scope = 'internal' | 'members' | 'public';

export type Permission =
  | 'song:read' | 'song:write' | 'song:delete'
  | 'setlist:read' | 'setlist:write'
  | 'service:read' | 'service:write'
  | 'rehearsal:read' | 'rehearsal:write'
  | 'tutorial:read' | 'tutorial:write'
  | 'member:read' | 'member:write'
  | 'assignment:read' | 'assignment:write'
  | 'file:upload'
  | 'role:assign'
  | 'settings:write';

/** Permisos de cada rol. La herencia es explícita: se leen tal cual. */
const READ_ONLY_INTERNAL: readonly Permission[] = [
  'song:read', 'setlist:read', 'service:read', 'rehearsal:read',
  'tutorial:read', 'assignment:read',
  // Incluye `member:read` porque un músico necesita saber quién canta y en qué
  // tonalidad. El modelo de `Member` no guarda teléfonos ni correos, así que
  // leerlo no expone datos personales: solo nombre visible e instrumentos.
  'member:read',
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  'super-admin': [
    'song:read', 'song:write', 'song:delete',
    'setlist:read', 'setlist:write',
    'service:read', 'service:write',
    'rehearsal:read', 'rehearsal:write',
    'tutorial:read', 'tutorial:write',
    'member:read', 'member:write',
    'assignment:read', 'assignment:write',
    'file:upload', 'role:assign', 'settings:write',
  ],
  admin: [
    'song:read', 'song:write', 'song:delete',
    'setlist:read', 'setlist:write',
    'service:read', 'service:write',
    'rehearsal:read', 'rehearsal:write',
    'tutorial:read', 'tutorial:write',
    'member:read', 'member:write',
    'assignment:read', 'assignment:write',
    'file:upload', 'role:assign',
  ],
  leader: [
    'song:read', 'song:write',
    'setlist:read', 'setlist:write',
    'service:read', 'service:write',
    'rehearsal:read', 'rehearsal:write',
    'tutorial:read', 'tutorial:write',
    'member:read',
    'assignment:read', 'assignment:write',
    'file:upload',
  ],
  'music-director': [
    'song:read', 'song:write',
    'setlist:read', 'setlist:write',
    'service:read',
    'rehearsal:read', 'rehearsal:write',
    'tutorial:read', 'tutorial:write',
    'member:read',
    'assignment:read', 'assignment:write',
    'file:upload',
  ],
  editor: [
    'song:read', 'song:write',
    'setlist:read',
    'service:read',
    'rehearsal:read',
    'tutorial:read', 'tutorial:write',
    'assignment:read',
    'file:upload',
  ],
  musician: READ_ONLY_INTERNAL,
  vocalist: READ_ONLY_INTERNAL,
  tech: READ_ONLY_INTERNAL,
  student: ['tutorial:read', 'song:read'],
  member: ['song:read', 'tutorial:read'],
  // Permiso y ámbito son ejes distintos: el público puede leer canciones y
  // tutoriales, pero el filtro de `scope` solo le entrega los marcados como
  // públicos. Sin este permiso no habría aplicación pública posible.
  public: ['song:read', 'tutorial:read'],
};

export interface Actor {
  id: string;
  roles: readonly Role[];
}

export function permissionsOf(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}

/** Un actor puede tener varios roles; los permisos se suman. */
export function can(actor: Actor, permission: Permission): boolean {
  return actor.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export function canAny(actor: Actor, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => can(actor, p));
}

export function canAll(actor: Actor, permissions: readonly Permission[]): boolean {
  return permissions.every((p) => can(actor, p));
}

/** Ámbito máximo que un actor alcanza. Rige qué contenido se le muestra. */
export function scopeOf(actor: Actor): Scope {
  if (actor.roles.some((r) => INTERNAL_ROLES.has(r))) return 'internal';
  if (actor.roles.some((r) => MEMBER_ROLES.has(r))) return 'members';
  return 'public';
}

const INTERNAL_ROLES = new Set<Role>([
  'super-admin', 'admin', 'leader', 'music-director', 'musician', 'vocalist', 'tech', 'editor',
]);

const MEMBER_ROLES = new Set<Role>(['student', 'member']);

const SCOPE_RANK: Record<Scope, number> = { public: 0, members: 1, internal: 2 };

/** ¿Puede este actor ver un contenido marcado con este ámbito? */
export function canView(actor: Actor, contentScope: Scope): boolean {
  return SCOPE_RANK[scopeOf(actor)] >= SCOPE_RANK[contentScope];
}

export const ANONYMOUS: Actor = { id: 'anonymous', roles: ['public'] };
