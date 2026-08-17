# Historial de loops

Registro de lo construido en cada loop, del más reciente al más antiguo. **No hace falta leer
este archivo para trabajar**: `LOOP_STATUS.md` tiene el estado vivo y un índice de una línea por
loop. Esto existe para responder "¿cuándo y por qué se hizo X?" sin cargar la historia entera en
cada sesión.

Las decisiones con su razonamiento están en `DECISIONS.md` (ADR-001 a ADR-024).

## Añadido en LOOP 018

- [x] `src/data/auth.ts`: entrar, registrarse, salir, perfil, asignar roles — sobre
      `@supabase/supabase-js` cargado con `import()` para no pesarle a quien sigue en modo
      demo (~220 KB que solo se descargan si hay backend configurado)
- [x] `session.tsx`: con backend configurado, el actor sale de la sesión real de Supabase;
      sin sesión (o con sesión pero sin rol) se trata igual que `public` — nunca más acceso
      que un visitante anónimo
- [x] `AuthWidget`: entrar/registrarse/salir, reemplaza el selector de demostración en la
      cabecera solo cuando hay backend configurado
- [x] `AccountsAdmin` (en Ajustes): la pantalla real del permiso `role:assign`, que existía
      en RBAC desde el principio sin que nada la usara
- [x] `supabase/schema.sql`: la primera cuenta que exista se vuelve super-admin sola —
      si no, nadie podría asignar roles a nadie más
- [x] Despliegue (`deploy.yml`) ya pasa las dos claves al build desde secretos del
      repositorio — ver el punto 1 de arriba
- [x] Bug real encontrado y corregido: el modal de login se salía de la pantalla por el
      `backdrop-blur` del header (crea su propio contenedor para `fixed`); se resolvió con
      un portal a `document.body` (ADR-024)
- [x] 254 pruebas sin cambios; build separa Supabase en su propio trozo (main baja de
      ~322 KB a ~218 KB); accesibilidad y comprobación en navegador en modo demo, sin
      tocar ni una de las 60 comprobaciones existentes

## Añadido en LOOP 017

- [x] ADR-023: plan completo de autenticación (Supabase Auth + Postgres, `profiles` con roles,
      cómo se conecta a `session.tsx` sin tocar las pantallas) y de pagos (Stripe Checkout,
      dependiente de B-03, `Course.price` se añade recién cuando haya cuenta)
- [x] `supabase/schema.sql`: tabla `profiles`, RLS calcada de `role:assign`, trigger de alta —
      listo para ejecutar en cuanto exista un proyecto
- [x] `.env.example`: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, documentadas y vacías
- [x] Sin cambios de código de aplicación: nada que no se pueda probar se publica

## Añadido en LOOP 016

- [x] `Course`/`Lesson` en el modelo, mismo patrón de recursos y derechos que `Tutorial`
- [x] `course:read`/`course:write` en RBAC: super-admin, admin, leader, music-director y editor
      gestionan contenido; el resto (incluido público) solo lee lo publicado
- [x] Matrícula y progreso personal (`Enrollment`), guardado por actor — mismo patrón que
      favoritos y "preparado"; no viaja en la copia de datos (ADR-022)
- [x] `toggleLesson`: marca o desmarca una clase, certifica sola al completar todas, y no se
      rompe si una lección se borra del curso después de completarse
- [x] Certificado: panel imprimible con nombre, curso y fecha — sin PDF ni código de
      verificación, no se pidió que saliera del ecosistema
- [x] "Progreso del equipo" para quien enseña: exige `course:write` y `member:read` a la vez,
      no solo el primero
- [x] `CoursesPage`, `CoursePage`, `CourseEditorPage`; enlace desde Aprender
- [x] 254 pruebas (13 nuevas); accesibilidad y comprobación en navegador ampliadas a Academia,
      incluida la vuelta completa: crear curso → matricularse → certificarse → verlo el profesor

## Añadido en LOOP 015

- [x] `chord-tones.ts`: de la estructura del acorde a las notas que suenan, marcando cuáles se
      pueden omitir. La quinta justa es opcional; la alterada nunca, porque es el color del acorde.
- [x] `voicing.ts`: buscador de digitaciones con afinaciones de guitarra, bajo y ukelele, que
      puntúa cada postura como lo haría un guitarrista — fundamental en el bajo, sin omitir
      tercera ni séptima, mano abierta como mucho cuatro trastes, sin cuerdas muteadas en medio.
- [x] Piano aparte: no hay postura que buscar, se marcan las teclas que se pulsan.
- [x] `ChordDiagram.tsx`: mástil y teclado en SVG generado, hasta cuatro posturas por acorde.
- [x] Acordes de la hoja pulsables, con la ficha anclada abajo para no tapar lo que se lee.
- [x] Preferencia de instrumento guardada en el teléfono, no en los datos del ministerio.
- [x] 235 pruebas (16 nuevas). El algoritmo encuentra solo el Am estándar (x02210) y el Do
      estándar (x32010): no están escritos en ninguna parte.
- [x] Excepción de objetivo táctil marcada una a una en la auditoría, no por tipo de elemento:
      WCAG 2.5.5 exceptúa los objetivos dentro de un bloque de texto, y estirar el acorde a 44px
      lo despegaría de su sílaba.

## Añadido en LOOP 014

- [x] `SequencePlan` y `SequenceTrack` en `model.ts`, mismo patrón que `SongVersion` (ADR-018)
- [x] `Song.sequences`, análogo a `Song.versions`
- [x] `SetlistEntry.sequencePlanId`: qué plan toca cada servicio o ensayo concreto
- [x] 219 pruebas de dominio; typecheck y build en verde
- [x] Sin pantalla ni reproductor a propósito: la función es de fase posterior, solo el modelo
      tocaba a esta

## Añadido en LOOP 013

- [x] `/historial`: vista global de lo tocado, por fecha, enlazada desde Servicio
- [x] `SongStatus` (borrador/lista/archivada) — campo, filtro y editor
- [x] Progreso personal en Mi preparación: marcar cada parte como preparada, barra de avance
- [x] `listPrepared`/`togglePrepared` en el repositorio, personal por actor (mismo patrón que favoritos)
- [x] Fases 1-3 del brief completas — detalle en `BRIEF_COVERAGE.md`
- [x] 218 pruebas; comprobación en navegador y accesibilidad ampliadas

## Añadido en LOOP 012

- [x] `BRIEF_COVERAGE.md`: checklist de las 59 secciones del brief, para no re-auditar desde cero
- [x] Recursos (vídeo/audio/PDF/enlace) editables en canciones y en cada voz — antes solo en tutoriales
- [x] `ResourceListEditor` compartido por canción, voz y tutorial (ADR-017)
- [x] `SongVersion`: variantes de arreglo con su propio material, sin duplicar letra/acordes
- [x] Catálogo de instrumentos ampliable por el ministerio, `settings:write` (ADR-016)
- [x] Modo en vivo muestra la parte instrumental de cada sección, no solo acordes y letra
- [x] 212 pruebas; comprobación en navegador y accesibilidad ampliadas

## Añadido en LOOP 011

- [x] Varios servicios a la vez, cada uno con su propio repertorio
- [x] Lista completa de servicios, con los pasados atenuados
- [x] «Repetir el repertorio anterior», que copia canciones y tonalidades pero no quién cantó
- [x] Borrar un servicio, que se lleva su repertorio y deja los demás intactos
- [x] Servicio y ensayo proponen su día habitual: sábado y miércoles
- [x] «Mi preparación» y el modo en vivo apuntan al próximo servicio, no al primero de la lista
- [x] 206 pruebas; comprobación en navegador ampliada a varios servicios

## Añadido en LOOP 010

- [x] Filtros de repertorio: tonalidad, instrumento, vocalista, etiqueta, dificultad y rango de BPM
- [x] Los filtros solo ofrecen valores que existen en el repertorio
- [x] Editor de voces: melodía y armonías, con intervalo e indicaciones
- [x] Editor de partes por instrumento, con las secciones leídas del propio cuerpo de la canción
- [x] 189 pruebas; comprobación en navegador ampliada a filtros, voces y partes

## Añadido en LOOP 009

- [x] Nueve exportaciones muertas eliminadas
- [x] `isRedistributable` e `isPending` conectados donde las pantallas duplicaban su lógica a mano
- [x] Editores cargados aparte: arranque de 97 KB a 90 KB comprimidos (ADR-015)
- [x] El service worker precachea el JS y el CSS de arranque leyéndolos del `index.html`
- [x] Comprobado que los editores abren sin conexión

## Añadido en LOOP 008

- [x] Editor de tutoriales: categoría, descripción, vínculo a canción, instrumento o voz
- [x] Material por enlace (vídeo, audio, PDF, imagen, enlace, texto), con su tipo y sus derechos
- [x] Filtro por categoría, mostrando solo las que tienen contenido
- [x] Aviso al publicar un tutorial que enlaza material de terceros sin licencia
- [x] Historial: registrar un servicio tocado, sin duplicar si se pulsa dos veces
- [x] Historial visible en el detalle de la canción, con la tonalidad realmente usada
- [x] 184 pruebas; comprobación en navegador y accesibilidad ampliadas

## Añadido en LOOP 007

- [x] Exportar todos los datos del ministerio a un archivo JSON versionado
- [x] Importar con validación previa: se comprueba el archivo entero antes de tocar nada
- [x] Se muestra qué contiene la copia y se avisa de que sustituye, antes de confirmar
- [x] Permisos separados: el liderazgo exporta, solo admin y super admin importan (ADR-014)
- [x] Los favoritos no viajan en la copia: son personales
- [x] 173 pruebas; comprobación en navegador con descarga y restauración reales

## Añadido en LOOP 006

- [x] Ensayos reales: alta, edición y baja con fecha, horario y repertorio asignado
- [x] Bloques editables por ensayo — la estructura del manual se copia al crear, no se impone
- [x] Reparto de instrumentos y voces para el ensayo
- [x] Próximo ensayo y tu parte en él, dentro de «Mi preparación»
- [x] El modo ensayo usa el repertorio del ensayo, no el del servicio
- [x] Fecha propuesta: el próximo miércoles, según la costumbre del manual
- [x] 155 pruebas; comprobación en navegador y auditoría de accesibilidad ampliadas

## Añadido en LOOP 005

- [x] Favoritos personales, guardados por actor: marcar uno no toca el repertorio del ministerio
- [x] Filtro «solo mis favoritos» en la biblioteca
- [x] `npm run a11y`: auditoría de accesibilidad ejecutable sobre las nueve pantallas (ADR-013)
- [x] Auditoría de contraste de toda la paleta; un par incumplía AA y se corrigió (ADR-012)
- [x] Auditoría de secretos y de vectores de inyección: sin hallazgos
- [x] Comprobación real de funcionamiento sin conexión, cortando la red
- [x] 137 pruebas de dominio

## Añadido en LOOP 004

- [x] Planificación del servicio: fecha, evento, orden del repertorio, tonalidad por canción,
      voz principal y asignaciones por integrante
- [x] `saveSetlist` en el repositorio, con permiso exigido
- [x] Modo en vivo (servicio y ensayo): pantalla completa, texto grande, anterior/siguiente,
      aviso de la canción que viene y alternancia acordes/solo letra
- [x] Bloqueo de apagado de pantalla mientras el modo en vivo está abierto
- [x] PWA: manifiesto, iconos generados, service worker propio y offline (ADR-010)
- [x] 132 pruebas; comprobación en navegador ampliada a planificar, reordenar, modo en vivo y PWA

## Añadido en LOOP 003

- [x] Equipo: alta, edición y baja de integrantes, con instrumentos y tesitura cómoda
- [x] El modelo de integrante no guarda datos de contacto, y hay una prueba que lo vigila
- [x] `member:read` para los roles internos: un músico necesita saber quién canta
- [x] Identidad de sesión ("soy yo"), preparada para venir de la cuenta cuando haya auth
- [x] Tonalidad por vocalista, editable por canción y visible en el detalle
- [x] Vista "Mi preparación": próximo servicio, canciones, tonalidad y tu parte
- [x] `saveService` en el repositorio, con permiso exigido
- [x] 128 pruebas; comprobación en navegador ampliada a equipo, identidad y vocalistas

## Añadido en LOOP 002

- [x] Renombrado del producto a **Aurora Worship** (forma corta: Aurora)
- [x] `KeyValueStore` con IndexedDB, respaldo en localStorage y memoria para pruebas (ADR-008)
- [x] `StoredRepository`: siembra en el primer arranque, después manda lo guardado
- [x] Escritura con permiso exigido en el repositorio, no en la pantalla
- [x] Editor de canciones completo, con vista previa en vivo de la hoja de acordes
- [x] Borrado con confirmación, restringido a admin y super admin
- [x] Aviso cuando una canción se marca pública sin derechos que lo permitan
- [x] El rol público puede leer contenido público (ADR-009)
- [x] 121 pruebas; comprobación en navegador ampliada a crear, guardar y recargar

## Ajuste fuera de loop: fondo más claro

Se pidió aclarar el fondo un 15%. Tocarlo solo a él rompía la jerarquía visual y bajaba el
contraste del violeta usado como texto (comprobado con capturas de pantalla antes de tocar
nada). Se subió toda la escala oscura en la misma proporción en su lugar (ADR-020).
Comprobado en navegador y con `npm run a11y`; sin cambios en pruebas de dominio.

## Ajuste fuera de loop: más naranja

Se pidió más presencia del naranja. Las seis insignias de tonalidad repetidas por la
aplicación pasan de violeta a naranja (ADR-021): ahora "esto es un dato musical" se lee en
naranja en toda la app, no solo en los acordes. El primer intento (naranja translúcido)
fallaba contraste; se corrigió antes de subirlo. Comprobado en navegador, `npm run a11y` y
`npm run smoke`; sin cambios en pruebas de dominio.

## Completado

- [x] Entorno cloud inspeccionado (Node 22, npm 10, Chromium, registro npm accesible)
- [x] Stack elegido y justificado (ADR-001)
- [x] Estructura de proyecto y documentación base
- [x] Modelo de datos completo: canciones, voces, instrumentos, partes, repertorios, servicios,
      ensayos, historial, tutoriales, recursos, derechos
- [x] RBAC con 11 roles, 19 permisos y 3 ámbitos de visibilidad
- [x] Motor de notas con modelo diatónico (ADR-002)
- [x] Motor de acordes: mayores, menores, séptimas, sus, add, dim, aug, slash, alteraciones
- [x] Motor de transposición con preservación de estructura, letra y formato
- [x] Parser de cuerpo de canción (secciones + acordes inline)
- [x] Repositorio con filtrado por ámbito y búsqueda
- [x] UI mobile-first: canciones, búsqueda, hoja de acordes, selector de tonalidad, servicio,
      ensayo, tutoriales
- [x] 113 pruebas de dominio, todas en verde
- [x] Comprobación en navegador real: transposición visible en pantalla, permisos efectivos,
      cero errores de consola
- [x] Despliegue continuo a GitHub Pages configurado

## Errores corregidos en este loop

| Qué | Cómo se detectó |
|---|---|
| `Coro` se parseaba como acorde (`C` + sufijo `oro`) | Prueba `isChord('Coro')` |
| La búsqueda no encontraba palabras partidas por un acorde (`omnipo[A]tente`) | Prueba de búsqueda por letra |
| 404 de consola por favicon ausente | Comprobación en navegador |
| El rol público no podía leer nada, lo que hacía imposible la app pública | Refactor de persistencia (ADR-009) |
| El `textarea` del editor heredaba altura fija de la clase de input | Revisión del editor |
| El encabezado truncaba el nombre en pantalla de teléfono | Captura de la comprobación |
| `Loaded['songs']` era readonly y no admitía construcción incremental | Typecheck |
| El modo en vivo se superponía, dejando la navegación alcanzable por tabulador y lector de pantalla | Comprobación en navegador (ADR-011) |
| Faltaban los tipos de `vite/client` para `import.meta.env` | Typecheck |
| Dos aserciones de la comprobación eran frágiles: buscaban texto que también aparece en `<option>` invisibles | Falso negativo investigado leyendo IndexedDB |
| Blanco sobre violeta daba 4.23:1, por debajo de AA | Auditoría de contraste (ADR-012) |
| Once objetivos táctiles por debajo de 44px: selector de rol, reordenar repertorio, fichas de instrumento, enlaces de volver, cabecera del modo en vivo | `npm run a11y` |
| La propia auditoría contaba enlaces en línea como botones y no recargaba al cambiar de rol | Revisión de sus hallazgos |
| El modo ensayo cargaba el repertorio del servicio en lugar del propio ensayo | Revisión al conectar los ensayos |
| La comprobación intentaba cambiar de rol estando en modo en vivo, que no tiene cabecera | Ejecución de la comprobación |
| La comprobación del historial abría la primera canción alfabética, que no estaba en el repertorio del servicio | Falso negativo revisado |
| El JS y el CSS de arranque nunca entraban en la caché del service worker: se piden antes de que tome el control | Inspección de la caché tras dividir el paquete (ADR-015) |
| Calentar la caché desde la página dependía de ganar una carrera con `clients.claim()` | Tres arranques idénticos con resultados distintos |
| La comprobación offline fijaba el rol sin recargar, y la aplicación seguía con el anterior | Falso negativo revisado |
| La comprobación de varios servicios abría «el primero» de una lista ordenada por fecha, que ya era el nuevo | Falso negativo revisado |
| `waitForSelector('h1')` resolvía contra el h1 de la página vieja antes de que terminara la navegación SPA | Falso negativo revisado, se espera el encabezado específico |
| El historial global se comprobaba antes de que resolviera la carga asíncrona | Falso negativo revisado, se espera el texto de recuento |

## Bloqueos resueltos

### B-01 · Organización de GitHub `auroraworship` — resuelto

La organización se creó, el repositorio se transfirió y se renombró a `auroraworship.github.io`.
Confirmado por el remoto (`git remote -v` apunta a `AuroraWorship/auroraworship.github.io`) y
porque los PR de este loop se abrieron y combinaron sobre ese mismo repositorio.

### B-02 · Activar GitHub Pages — resuelto

El origen de Pages quedó en GitHub Actions. El flujo "Verificar y desplegar" se ejecuta solo al
combinar con `main` y ha terminado en éxito en cada uno de los últimos merges de este loop.

## Decisiones registradas

ADR-001 a ADR-007 en `DECISIONS.md`.
