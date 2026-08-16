# Cobertura del brief original

Checklist contra las 59 secciones del encargo inicial. Existe para no volver a
releer el brief entero y re-derivar los huecos cada vez — consultar esto
primero. Formato: `§N estado — qué falta, si falta algo`.

Estados: `OK` hecho · `PARCIAL` hecho a medias · `DIFERIDO` lo pidió el propio
brief para una fase posterior · `BLOQUEADO` depende de B-01/B-02/B-03.

## Núcleo (§1–13, §33–36, §42–59)
Arquitectura, RBAC, cloud-first, GitHub, docs persistentes, seguridad,
privacidad, copyright, diseño, MVP, calidad, testing, auto-recovery, deploy:
**OK**, ver `ARCHITECTURE.md` y `DECISIONS.md`.

## Canciones y motor musical (§14–21)
- §14 versiones — OK (LOOP 012: `SongVersion`, sin duplicar body/acordes)
- §14 recursos en canción — OK (LOOP 012)
- §15 motor de acordes — OK, ver ADR-002
- §16 transposición — OK, suite en `tests/domain/transpose.test.ts`
- §17 tonalidad por vocalista — OK (LOOP 003)
- §18 voces + recursos por voz — OK (LOOP 010 estructura, LOOP 012 recursos)
- §19 catálogo de instrumentos extensible — OK (LOOP 012: `settings:write`)
- §20 partes musicales — OK; PDF/MIDI/partitura — **DIFERIDO**, sin datos que lo pidan aún
- §21 repertorios — OK (LOOP 011: varios independientes)

## Servicios, ensayos, preparación (§22–29)
- §22 servicios — OK; campo de secuencias del servicio — **DIFERIDO** (ligado a §27)
- §23 historial — PARCIAL: por canción sí, vista global no (LOOP 013)
- §24 ensayos — OK (LOOP 006)
- §25 «Mi preparación» — PARCIAL: próximas canciones/ensayo sí; tareas y progreso no (LOOP 013)
- §26 tutoriales — OK (LOOP 008)
- §27 secuencias — **DIFERIDO**, el brief pide solo preparar arquitectura; ni eso se hizo
- §28 modo ensayo — OK (LOOP 004 pantalla, LOOP 012 parte instrumental)
- §29 modo servicio — OK, mismo componente que ensayo

## Uso (§30–32, §41)
- §30 búsqueda — PARCIAL: título/letra/tonalidad/instrumento/vocalista/etiqueta/dificultad/tempo
  sí (LOOP 010); por «estado» de canción no existe ese campo (LOOP 013)
- §31 favoritos — OK (LOOP 005)
- §32 notificaciones — **DIFERIDO**, el brief las marca «a futuro»
- §41 aplicación pública — el ámbito `public` filtra correctamente; no hay pantalla dedicada — **DIFERIDO** (fase 5)

## Bloqueado por acción humana
- §3 autenticación externa, §53 dominio propio → **BLOQUEADO** B-01/B-02/B-03
- §33 storage de archivos pesados → **BLOQUEADO** B-03 (hoy: enlaces, ADR-014-bis)
- §37 Academia, §54 pagos → **DIFERIDO**, fase 4 explícita del brief
- §38 IA → **DIFERIDO**, fase 5 explícita del brief

## Próximo barrido pendiente (LOOP 013)
Historial global, tareas/progreso en Mi preparación, campo de estado de
canción para búsqueda. Ninguno bloqueado; son los últimos huecos de fase 1-3.
