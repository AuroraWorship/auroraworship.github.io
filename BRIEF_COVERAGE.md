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
- §22 servicios — OK; campo de secuencias del servicio — OK (`SetlistEntry.sequencePlanId`,
  LOOP 014); la función que lo usa sigue **DIFERIDO** (ligada a §27)
- §23 historial — OK (LOOP 013: vista global en /historial)
- §24 ensayos — OK (LOOP 006)
- §25 «Mi preparación» — OK (LOOP 013: progreso personal por parte asignada, barra de avance)
- §26 tutoriales — OK (LOOP 008)
- §27 secuencias — arquitectura OK (LOOP 014: `SequencePlan`/`SequenceTrack`, ver ADR-018);
  pantalla, reproductor e integración con el modo en vivo — **DIFERIDO**, lo pide la propia fase
- §28 modo ensayo — OK (LOOP 004 pantalla, LOOP 012 parte instrumental)
- §29 modo servicio — OK, mismo componente que ensayo

## Uso (§30–32, §41)
- §30 búsqueda — OK: título/letra/tonalidad/instrumento/vocalista/etiqueta/dificultad/tempo/estado
  (LOOP 010 + LOOP 013)
- §31 favoritos — OK (LOOP 005)
- §32 notificaciones — **DIFERIDO**, el brief las marca «a futuro»
- §41 aplicación pública — el ámbito `public` filtra correctamente; no hay pantalla dedicada — **DIFERIDO** (fase 5)

## Fase 4 — Aurora Academy (§37, §54)
- §37 Academia — OK (LOOP 016: cursos, clases, matrícula, progreso, profesores,
  certificado imprimible — ADR-022)
- §54 pagos → **BLOQUEADO** B-06; plan listo (ADR-023: Stripe Checkout, depende de B-03)

## Bloqueado por acción humana
- §3 autenticación externa → **BLOQUEADO** B-03; plan y esquema listos (ADR-023, `supabase/schema.sql`)
- §53 dominio propio → **BLOQUEADO** B-01/B-02 (nota: la URL en `auroraworship.github.io` ya
  está resuelta, ver `LOOP_STATUS.md` § Bloqueos resueltos; falta un dominio propio si se quiere uno)
- §33 storage de archivos pesados → **BLOQUEADO** B-03 (hoy: enlaces, ADR-014-bis)
- §54 pagos de Academia → **BLOQUEADO** B-06; plan listo (ADR-023)
- §38 IA → **DIFERIDO**, fase 5 explícita del brief

## Estado general
Fases 1–3 completas desde el LOOP 013 (§1–36, §42–59). De la fase 4, Academia está
hecha (§37); solo falta pagos, bloqueado por la regla "sin gastos" del proyecto hasta que
el ministerio autorice expresamente contratar algo (ver B-06 en `LOOP_STATUS.md`). La
fase 5 sigue diferida por el propio brief.
