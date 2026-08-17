# Changelog

## [0.17.1] — LOOP 019 · Reducir el contexto

La documentación había crecido a 1.800 líneas y `LOOP_STATUS.md` —de lectura obligatoria en
cada sesión— pesaba 372. Se separa lo vivo de lo histórico sin borrar nada (ADR-025).

### Cambiado

- `LOOP_STATUS.md`: 372 → 91 líneas. El historial de los 18 loops pasa a `docs/HISTORIAL.md`.
- `CHANGELOG.md`: 440 → 126 líneas. Las versiones 0.1.0–0.14.0 pasan a
  `docs/CHANGELOG-ANTERIOR.md`.
- `DECISIONS.md`: índice de una línea por ADR, para leer uno suelto sin cargar el archivo.
- `ARCHITECTURE.md`: tabla «Dónde vive cada cosa», por carpeta.
- `CLAUDE.md`: ruta de lectura explícita, y qué **no** leer.

### Corregido

- `LOOP_STATUS.md` tenía dos secciones duplicadas literalmente y los loops desordenados.
- `npm run smoke` imprimía 67 líneas fijas; ahora calla en verde y solo grita lo que falla
  (`AURORA_SMOKE_VERBOSE=1` para verlo todo). Además **sale con código de error** cuando algo
  falla, en vez de terminar en verde.
- Tres comprobaciones del smoke eran tautológicas (`|| true`, `comprobar(..., true)`). Al
  hacerlas honestas, una empezó a fallar: se comprobaba el progreso personal después de crear
  un servicio con fecha anterior, que pasa a ser «el próximo» y no tiene asignaciones. Movida
  al punto donde el dato existe.
- `ARCHITECTURE.md` listaba la academia como no implementada; se construyó en el LOOP 016.

## [0.17.0] — LOOP 018 · Autenticación real: el código

Con el proyecto de Supabase ya creado (LOOP 017), esta versión escribe la autenticación de
verdad: entrar, registrarse, sesión real, y asignar roles a cuentas reales.

### Añadido

- Entrar / registrarse / salir, sobre Supabase Auth. Reemplaza el selector de demostración
  en la cabecera solo cuando hay backend configurado — sin configurar, todo sigue igual.
- Sesión real en `session.tsx`: sin cuenta, o con cuenta sin rol, el actor se trata como
  cualquier visitante (`public`), nunca con más acceso.
- "Cuentas y roles" en Ajustes: la pantalla real del permiso `role:assign`, que existía en
  el control de acceso desde el principio sin que nada la usara.
- La primera cuenta que se registra queda como super-admin sola.

### Límite de esta versión

El sandbox de esta sesión no tiene permiso de red para llegar al proyecto real de
Supabase (confirmado, no es un error de la app — ADR-024), así que el ciclo completo
—registrarse, confirmar correo, entrar, ver el rol— no se pudo probar de punta a punta
desde aquí. Sí se verificó todo lo demás: typecheck, pruebas, build, y las 60
comprobaciones existentes de accesibilidad y navegador en modo demo, todas en verde. Falta
que Aurora añada dos secretos en GitHub y confirme el ciclo completo una vez publicado —
el detalle exacto está en `LOOP_STATUS.md`.

### Interno

- `@supabase/supabase-js` se carga con `import()`: el paquete principal baja de ~322 KB a
  ~218 KB para quien sigue en modo demo.
- Bug real encontrado y corregido al probar el login: el modal se salía de la pantalla por
  el `backdrop-blur` del header; se resolvió con un portal a `document.body`.
- 254 pruebas de dominio, sin cambios.

## [0.16.1] — LOOP 017 · Autenticación y pagos: el plan

Aurora confirmó interés en resolver la autenticación real (B-03) y los pagos de Academia
(B-06). Ninguno se puede construir sin una cuenta externa que solo el ministerio puede
crear, así que este loop deja listo el plan y se detiene ahí — nada que no se pueda
comprobar en navegador se publica.

### Añadido

- ADR-023: plan de autenticación (Supabase) y de pagos (Stripe, dependiente de B-03).
- `supabase/schema.sql`: esquema listo para pegar en cuanto exista un proyecto —
  `profiles` con roles, RLS calcada del permiso `role:assign` ya existente.
- `.env.example` con las dos variables que hacen falta cuando llegue el momento.

### Sin construir a propósito

Ningún cliente de Supabase ni de Stripe: escribir esa integración sin nada real al otro
lado produciría código sin forma de probarse. Falta que Aurora cree el proyecto de
Supabase y pase dos datos (URL y clave pública) — el detalle exacto está en
`LOOP_STATUS.md`.

## [0.16.0] — LOOP 016 · Aurora Academy

Primer paso de la fase 4 del brief (§37). Cursos con clases propias, no enlaces sueltos
como en Tutoriales: matricularse, marcar clases vistas y certificado al terminar.

### Añadido

- **Cursos y clases** (`Course`/`Lesson`), con su propio material por enlace igual que
  canciones y tutoriales (`ResourceListEditor`, ADR-017).
- **Matrícula y progreso personal**: guardado por actor, mismo patrón que favoritos y
  "preparado" — no viaja en la copia de datos.
- **Certificado** al completar todas las clases de un curso: panel con nombre, curso y
  fecha, imprimible desde el navegador. No genera un PDF ni un código de verificación.
- **Progreso del equipo**, para quien enseña: qué integrante ha avanzado cuánto en cada
  curso. Exige `course:write` y `member:read` a la vez (ADR-022).
- Enlace a Academia desde Aprender.

### Sin construir a propósito

Pagos: la regla del proyecto es explícita — sin gastos ni integraciones de cobro sin
autorización expresa. El resto de la fase 4 (más cursos, contenido real) lo carga Aurora.

### Interno

- 254 pruebas de dominio (13 nuevas).

## [0.15.2] — Más naranja, con criterio

Se pidió más presencia del naranja. Las insignias de tonalidad que se repetían en cinco
pantallas (lista de canciones, servicio, historial, modo en vivo, mi preparación) y el
chip de "±N semitonos" del selector pasan de violeta a naranja, para que lo musical
(acordes, tonalidad) se lea siempre en naranja y la interfaz en violeta (ADR-021). El
primer intento con un naranja translúcido fallaba el contraste (3.3–3.7:1); el fondo
sólido final da 5.13:1, verificado antes de subir.

## [0.15.1] — Fondo más claro

Se pidió aclarar el fondo un 15%. Tocar solo ese color rompía la jerarquía visual
(las tarjetas dejaban de distinguirse del fondo) y el contraste del violeta usado como
texto. Se sube en su lugar toda la escala oscura —fondo, superficie, superficie-2,
borde— la misma proporción, y el violeta se reajusta para conservar su contraste
(ADR-020). Paleta provisional (B-04): sin cambios de comportamiento ni de datos.

## [0.15.0] — LOOP 015 · Digitaciones de acordes

Primera de las mejoras que pidió el ministerio tras ver la aplicación en uso. Tocar un
acorde en la hoja muestra cómo se hace en el instrumento propio.

### Añadido

- **Diagramas de acordes** por instrumento: mástil para guitarra, bajo y ukelele, teclado
  para piano. Hasta cuatro posturas alternativas por acorde.
- **Selector de instrumento** en la hoja de acordes, con la preferencia guardada en el
  teléfono. «Sin diagramas» deja la hoja exactamente como estaba.
- **Motor de notas del acorde** (`chord-tones.ts`), que además distingue qué notas se
  pueden omitir cuando no caben todas bajo la mano.

### Detalle

Ninguna digitación está guardada: se calculan desde la estructura del acorde y la
afinación del instrumento (ADR-019). Por eso funcionan igual con un `Am` que con un
`Am7b5`, y un instrumento de cuerda nuevo solo necesita su afinación.

### Interno

- 235 pruebas de dominio.

---

Versiones anteriores (0.1.0 a 0.14.0, LOOP 001 a 014): `docs/CHANGELOG-ANTERIOR.md`.
