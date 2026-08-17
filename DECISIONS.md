# Decisiones

Registro de decisiones con su razón. Existe para no volver a analizar lo ya analizado.

**No hace falta leer este archivo entero.** El índice de abajo dice qué decide cada ADR; para
leer uno suelto, `grep -n "^## ADR-0NN" DECISIONS.md` y luego `sed -n 'inicio,finp'`.

| ADR | Decide |
|---|---|
| 001 | Stack: Vite + React + TypeScript + Tailwind |
| 002 | La nota se guarda como (letra, alteración), no como semitono |
| 003 | `HashRouter` en lugar de `BrowserRouter` |
| 004 | La UI habla con una interfaz de repositorio, nunca con un backend |
| 005 | El filtrado por permisos vive en el repositorio, no en las pantallas |
| 006 | Solo dominio público en los datos de arranque |
| 007 | Interfaz oscura (se usa sobre un atril, en penumbra) |
| 008 | Persistencia local (IndexedDB) tras la interfaz de repositorio |
| 009 | El rol público puede leer; el ámbito decide qué |
| 010 | Service worker escrito a mano, sin generador |
| 011 | El modo en vivo sale del armazón, no se superpone |
| 012 | Dos violetas: uno para texto, otro para relleno |
| 013 | Auditoría de accesibilidad ejecutable, no una lista de buenos propósitos |
| 014 | Copia y restauración antes que sincronización |
| 015 | Las pantallas de edición se cargan aparte, y el worker las precachea |
| 016 | El catálogo de instrumentos se resuelve por caché, no por prop |
| 017 | Recursos y versiones no se implementan tres veces |
| 018 | Secuencias: solo el modelo, no la pantalla |
| 019 | Las digitaciones de acordes se calculan, no se guardan |
| 020 | Un fondo más claro sube toda la escala, no solo el fondo |
| 021 | El naranja marca lo musical, el violeta marca la interfaz |
| 022 | Academia: progreso personal por actor, certificado sin PDF, sin pagos |
| 023 | Autenticación y pagos: el plan (Supabase, Stripe) |
| 024 | Autenticación real: el código, y qué no se pudo verificar |
| 025 | La documentación viva se separa de la histórica |

---

## ADR-001 — Stack: Vite + React + TypeScript + Tailwind

**Contexto.** El usuario trabaja desde el teléfono y no dispone de máquina local. Hace falta algo
que compile rápido en la nube, se despliegue como estático y no exija infraestructura de pago.

**Alternativas.** Next.js (mejor para SSR y auth, pero pide servidor o adaptador para Pages);
HTML+JS a mano (cero dependencias, pero sin tipos ni componentes se degrada rápido); Astro (buena
salida estática, ecosistema menor para la parte de aplicación).

**Decisión.** Vite + React + TypeScript + Tailwind v4 + Vitest.

**Razón.** Salida estática directa, arranque de segundos, tipado fuerte donde más importa (el motor
musical), y un único artefacto desplegable sin servidor.

**Consecuencias.** No hay renderizado en servidor ni rutas de API. Cuando entre autenticación real
habrá que añadir backend (Supabase u otro), no reemplazar el frontend.

---

## ADR-002 — La nota se guarda como (letra, alteración), no como semitono

**Contexto.** Transponer es la función central del producto y la que un músico detecta mal al
instante.

**Alternativas.** Guardar la clase de altura 0-11 y elegir grafía por tabla — simple, pero produce
`Ab` donde debe decir `G#`, y en tonalidades con sostenidos se lee mal.

**Decisión.** Modelo diatónico: letra + alteración, transposición por intervalo `(letras,
semitonos)`.

**Razón.** Es lo único que preserva la ortografía correcta. La grafía no es cosmética: un guitarrista
leyendo `Ab` en tonalidad de A pierde tiempo.

**Consecuencias.** Más código y más pruebas. A cambio, ida y vuelta en las 12 tonalidades devuelve
exactamente el acorde original.

---

## ADR-003 — HashRouter en lugar de BrowserRouter

**Contexto.** El destino de despliegue es GitHub Pages, que sirve archivos estáticos.

**Alternativas.** BrowserRouter con un `404.html` que reinyecta la ruta — funciona, pero es un
truco que rompe de formas raras y ensucia el historial.

**Decisión.** `HashRouter`.

**Razón.** Recargar `/canciones/x` debe funcionar siempre. Con hash, Pages nunca ve la ruta.

**Consecuencias.** URLs con `#`. Aceptable para una aplicación interna; revisable si algún día hay
contenido público que deba indexarse.

---

## ADR-004 — La UI habla con una interfaz de repositorio, nunca con un backend

**Contexto.** No hay base de datos todavía y la elección de proveedor está bloqueada por requerir
cuenta externa.

**Alternativas.** Cablear los datos semilla en los componentes y refactorizar después.

**Decisión.** `AuroraRepository` como interfaz; `InMemoryRepository` como implementación actual.

**Razón.** Permite construir y probar todas las pantallas hoy, y cambiar de origen de datos sin
tocarlas.

**Consecuencias.** Los métodos son `async` aunque hoy resuelvan al instante. Es deliberado: cuando
haya red, las pantallas ya están escritas para esperar.

---

## ADR-005 — El filtrado por permisos vive en el repositorio

**Contexto.** Aurora trabaja con jóvenes; exponer contenido interno es el fallo caro.

**Alternativas.** Comprobar permisos en cada pantalla.

**Decisión.** El repositorio filtra por `scope` antes de devolver nada. Las pantallas comprueban
permisos solo para decidir qué enseñan, no para proteger.

**Razón.** Una pantalla que olvide la comprobación no puede filtrar datos, porque nunca los recibe.
La seguridad no depende de recordar.

**Consecuencias.** El repositorio necesita el actor en cada llamada. Es intencionado.

---

## ADR-006 — Solo dominio público en los datos de arranque

**Contexto.** Hacen falta canciones reales para ejercitar el motor, pero copiar repertorio de
terceros crea un problema legal desde el primer commit.

**Decisión.** Dos himnos de dominio público comprobado (Newton 1779; Heber/Dykes 1826/1861), con su
estado de derechos declarado en el modelo.

**Consecuencias.** El repertorio real lo carga Aurora, con el estado de derechos que corresponda a
cada obra.

---

## ADR-007 — Interfaz oscura

**Contexto.** La aplicación se usa sobre un atril, en penumbra, durante ensayo y servicio.

**Decisión.** Fondo oscuro por defecto, acentos violeta y naranja.

**Razón.** No es preferencia estética: una pantalla blanca en un escenario a media luz deslumbra y
estorba.

**Consecuencias.** La paleta es **provisional**. Hereda el morado y naranja de MARCADOS para que se
lean como familia, pero la identidad oficial de Aurora está pendiente de confirmación.

---

## ADR-008 — Persistencia local tras la interfaz de repositorio

**Contexto.** La aplicación necesitaba dejar de ser de solo lectura, pero la base de datos cloud
está bloqueada por requerir cuenta externa (B-03). Sin persistencia, editar no sirve de nada.

**Alternativas.** Esperar a tener backend (deja el producto inservible mientras tanto);
`localStorage` a secas (simple, pero techo de ~5 MB y sin transacciones).

**Decisión.** Interfaz `KeyValueStore` con tres implementaciones: IndexedDB, `localStorage` como
respaldo y memoria para las pruebas. `StoredRepository` la usa sin saber cuál está activa.

**Razón.** El ministerio puede empezar a cargar su repertorio hoy, en su propio teléfono. Cuando
llegue el backend, se añade una implementación más; las pantallas no cambian.

**Consecuencias.** Los datos viven por dispositivo y aún no se sincronizan entre integrantes. Es
una limitación conocida y aceptada para esta fase, no un descuido. La sincronización llega con el
backend.

---

## ADR-009 — El rol público puede leer; el ámbito decide qué

**Contexto.** El rol `public` arrancó sin ningún permiso. Al construir la persistencia se vio que
eso hacía imposible la aplicación pública prevista en el roadmap: sin `song:read` no hay nada que
enseñar a un visitante, ni siquiera lo marcado como público.

**Decisión.** `public` tiene `song:read` y `tutorial:read`. El filtro de `scope` le entrega
únicamente el contenido marcado como público.

**Razón.** Permiso y ámbito son ejes distintos y conviene no mezclarlos: el permiso dice qué acción
se puede intentar, el ámbito dice sobre qué registros. Confundirlos obliga a duplicar reglas.

**Consecuencias.** Ninguna filtración: el contenido interno sigue fuera de su alcance por ámbito,
y sigue sin poder escribir nada.

---

## ADR-010 — Service worker escrito a mano, sin generador

**Contexto.** La aplicación debe funcionar sin conexión: en el templo puede no haber datos, y un
músico no puede quedarse sin la hoja de acordes por eso.

**Alternativas.** `vite-plugin-pwa` con Workbox — potente, pero añade dependencia y configuración
para un estático de tres archivos.

**Decisión.** Un service worker propio, con red primero para la navegación y caché primero para los
recursos.

**Razón.** El bundle es pequeño y la estrategia cabe en 80 líneas legibles. Menos dependencias es
menos que mantener y menos que auditar.

**Consecuencias.** No hay precacheo de los assets con hash: la primera visita necesita conexión, y
a partir de ahí funciona sin ella. Los datos del ministerio no dependen de esto — viven en
IndexedDB, que ya es offline por su cuenta.

---

## ADR-011 — El modo en vivo sale del armazón, no se superpone

**Contexto.** El modo servicio/ensayo empezó como una capa `fixed` sobre la aplicación.

**Problema.** Tapar no es ocultar: la cabecera y la navegación seguían en el DOM debajo,
alcanzables con el tabulador y anunciadas por un lector de pantalla. Sobre un atril, ese ruido es
exactamente lo que hay que eliminar.

**Decisión.** El armazón mira la ruta: en `/vivo` no renderiza cabecera ni navegación en absoluto.

**Consecuencias.** La comprobación en navegador verifica que la navegación no existe en modo en
vivo, no solo que no se ve.

---

## ADR-012 — Dos violetas: uno para texto, otro para relleno

**Contexto.** La auditoría de contraste encontró que el blanco sobre el violeta de marca daba
4.23:1, por debajo del 4.5:1 que exige WCAG AA para texto normal. Afectaba a todos los botones
primarios de la aplicación.

**Alternativas.** Poner texto oscuro sobre el violeta claro (se ve mal y rompe la jerarquía);
agrandar el texto para acogerse al umbral de texto grande (esconde el problema en vez de
resolverlo).

**Decisión.** Dos tokens: `violet` (#8b5cf6) para texto, bordes y tintes sobre el fondo oscuro, y
`violet-solid` (#7c3aed) como relleno de los botones con texto blanco.

**Razón.** 5.70:1 con blanco. La diferencia entre los dos violetas no se aprecia a simple vista, y
el botón pasa a leerse bien también con poca luz o con la pantalla al mínimo — que es exactamente
la condición de uso en el atril.

**Consecuencias.** Al añadir un botón sólido hay que usar `violet-solid`. Hay una comprobación de
contraste que vigila la paleta.

---

## ADR-013 — Auditoría de accesibilidad ejecutable, no una lista de buenos propósitos

**Contexto.** La aplicación se usa con el instrumento en las manos y con prisa. Un botón de 36px se
falla al pulsarlo, y eso en mitad de un servicio es un problema real.

**Decisión.** `npm run a11y` recorre las nueve pantallas en un navegador y falla si algo pulsable
mide menos de 44px de alto, si a algo le falta nombre accesible o si una pantalla no tiene
exactamente un `h1`.

**Razón.** Una regla que no se ejecuta se incumple sin que nadie se entere. Esta encontró once
puntos en su primera pasada, incluidos los botones de reordenar el repertorio y las fichas de
instrumento.

**Consecuencias.** La comprobación también se equivoca: contaba enlaces en línea dentro de una
frase como si fueran botones, y no recargaba al cambiar de rol, lo que producía un falso «h1 = 0».
Se corrigió la comprobación, no el producto.

---

## ADR-014 — Copia y restauración antes que sincronización

**Contexto.** Sin backend, los datos viven en cada teléfono por separado. Es la limitación más
seria del producto: el líder carga el repertorio y el equipo no lo ve. La sincronización real
depende de un bloqueo humano (B-03) que puede tardar.

**Alternativas.** Esperar al backend, dejando el problema abierto; sincronizar por un servicio de
terceros, que reintroduce el bloqueo de cuenta y de coste.

**Decisión.** Exportar e importar un archivo JSON versionado. El liderazgo saca la copia y la
comparte por el medio que ya use el ministerio; el equipo la importa.

**Razón.** Resuelve hoy el 80% del problema con cero infraestructura, y de paso da copia de
seguridad a un repertorio que puede costar meses de cargar. No pretende ser sincronización: es lo
que permite trabajar hasta que llegue.

**Consecuencias.** La importación **sustituye**, no fusiona. Fusionar exigiría resolver conflictos
por registro, y hacerlo mal perdería datos en silencio — que es peor que avisar y sobrescribir. Por
eso el archivo se valida entero antes de tocar nada y se muestra su contenido para confirmar.

Exportar lo puede hacer el liderazgo; importar, solo admin y super admin. Sobrescribir el trabajo
de todos no es una acción de uso diario.

---

## ADR-015 — Las pantallas de edición se cargan aparte, y el worker las precachea

**Contexto.** El paquete llegó a 97 KB comprimidos. La mitad son pantallas de edición que solo abre
el liderazgo, y que el músico —el usuario más frecuente, con el teléfono en el atril— nunca toca.

**Decisión.** Los seis editores se cargan bajo demanda. Y, porque dividir el paquete rompería el
uso sin conexión, se precargan cuando el navegador está ocioso.

**Lo que apareció al comprobarlo.** El JS y el CSS de arranque nunca llegaban a la caché del
service worker: la página los pide antes de que el worker tome el control, y `clients.claim()` es
asíncrono. Funcionaban sin conexión solo por la caché HTTP del navegador, que puede vaciarse —
así que el modo offline era más frágil de lo que aparentaba.

Se intentó primero calentar la caché desde la página, pero eso dependía de haber ganado la carrera:
en tres arranques idénticos, unas veces cacheaba y otras no.

**Decisión final.** El worker lee `index.html` en su instalación, extrae de ahí los nombres con
hash del JS y el CSS, y los precachea él mismo. No depende de la página ni del momento.

**Consecuencias.** Arranque de 90 KB en vez de 97, y un modo sin conexión que ya no descansa sobre
una caché que no controlamos. Verificado en tres arranques limpios seguidos.

---

## ADR-016 — El catálogo de instrumentos se resuelve por caché, no por prop

**Contexto.** §19 pedía un catálogo extensible. `instrumentById(id)` se llama de forma
síncrona en más de diez sitios solo para mostrar un nombre en una lista.

**Alternativas.** Enhebrar el catálogo completo como prop desde cada pantalla hasta cada
componente que muestra un nombre de instrumento — correcto, pero una cascada de cambios
por un dato que casi nunca cambia en la sesión.

**Decisión.** `repository.listInstruments()` guarda lo añadido por el ministerio en una
caché de módulo (`registerCustomInstruments`), y `instrumentById` la consulta como
segundo escalón tras el catálogo de fábrica. Los dos puntos donde de verdad se *elige*
un instrumento (Equipo, editor de canción) cargan el catálogo combinado; el resto de
pantallas sigue leyendo `instrumentById` sin cambios.

**Consecuencias.** Impureza deliberada y documentada: el nombre de un instrumento
personalizado no se ve hasta que algo haya llamado a `listInstruments` una vez en la
sesión. Aceptable porque Equipo y el editor de canciones —los puntos de entrada— ya lo
hacen al montar.

## ADR-017 — Recursos y versiones no se implementan tres veces

**Contexto.** Canción, voz y tutorial ya tenían cada uno una lista de `ResourceRef` en
el modelo (§14, §18, §26), pero solo tutoriales tenía editor — copiado a mano.

**Decisión.** `ResourceListEditor` único, parametrizado por ámbito y etiqueta, usado por
los tres. `SongVersion` (§14) reutiliza el mismo componente para el material de cada
variante en vez de inventar un cuarto editor de recursos.

**Consecuencias.** Un solo sitio que arreglar cuando llegue storage real (B-03): el
componente cambia una vez y las tres pantallas lo heredan.

## ADR-018 — Secuencias: solo el modelo, no la pantalla

**Contexto.** El brief (§27) diferís explícitamente la función de secuencias (click, pads,
loops, stems) a una fase posterior, pero pide preparar su arquitectura ya. `BRIEF_COVERAGE.md`
llevaba trece loops marcando esto como pendiente: "ni eso se hizo".

**Decisión.** Se añade `SequencePlan` y `SequenceTrack` a `model.ts`, con el mismo patrón que
`SongVersion`: una canción puede tener más de un plan (distinta banda, distinto arreglo), y
`SequenceTrack.resource` es un `ResourceRef` — nunca el binario en el modelo (ADR-004), porque
subir audio pesado necesita storage real y sigue bloqueado por B-03. `SetlistEntry.sequencePlanId`
elige qué plan toca cada ocasión, igual que `key` ya elige la tonalidad de esa ocasión. No se
construye pantalla de edición, reproductor ni integración con el modo en vivo: eso es la función
en sí, que el brief pide para más adelante.

**Alternativas consideradas.** Esperar a tener storage real para tocar el modelo entero de una
vez. Se descarta: el propio brief separa "preparar arquitectura" de "construir la función", y
tener el hueco ya tipado evita una migración de datos cuando llegue la fase 3 tardía o la 4.

**Consecuencias.** `Song.sequences` y `SetlistEntry.sequencePlanId` viajan vacíos/nulos en todas
partes hasta que exista una pantalla que los rellene. Ningún flujo actual los usa, así que no hay
riesgo de mostrar algo a medio construir.

## ADR-019 — Las digitaciones se calculan, no se guardan

**Contexto.** El ministerio pidió que al tocar un acorde aparezca cómo se hace en el
instrumento seleccionado. La vía obvia es un archivo de diagramas: unas cuantas imágenes
por acorde y por instrumento.

**Decisión.** No hay ni una digitación guardada. Se buscan a partir de las notas del
acorde y de la afinación del instrumento, puntuando cada postura posible.

**Motivo.** Aurora ya guarda los acordes como estructura musical y no como texto
(ADR-002), así que las notas de cualquier acorde son un dato disponible. Un archivo de
imágenes cubriría los treinta acordes previsibles y fallaría justo en los que hacen falta
—un `Am7b5`, un `F#7#9`, un slash chord—, que son los que nadie se sabe de memoria. Y
habría que rehacerlo entero al añadir un instrumento al catálogo, cosa que el ministerio
puede hacer desde ajustes (ADR-016).

**Consecuencias.** Un instrumento de cuerda nuevo se soporta añadiendo su afinación: seis
números. Los diagramas heredan el tema y pesan bytes, porque son SVG generado. A cambio,
el buscador tiene que puntuar bien: las reglas están en `voicing.ts`, y las pruebas las
fijan comprobando que el algoritmo encuentra solo las posturas estándar de Am y Do — que
es la verificación de que no se ha inventado nada.

## ADR-020 — Un fondo más claro sube toda la escala, no solo el fondo

**Contexto.** Se pidió aclarar el color de fondo un 15%. Aplicado solo a
`--color-aurora-bg`, el fondo pasaba de 5.9% a 20.9% de luminosidad — más claro que
`--color-aurora-surface-2` (16.1%) y casi tan claro como `--color-aurora-border` (21.6%).
Capturado en el navegador, las tarjetas dejaban de leerse como tarjetas: parecían huecos
más oscuros sobre una página más clara, al revés de la jerarquía que el diseño usa en
todas partes (fondo < superficie < borde).

**Decisión.** Se sube un 15% de luminosidad la escala completa —fondo, superficie,
superficie-2 y borde— para conservar la misma distancia relativa entre capas. Además,
`--color-aurora-violet` (el único color que se usa como texto sobre el fondo, no solo
como borde) sube de 66.3% a 72.9% de luminosidad para mantener el mismo 4.6:1 de
contraste que tenía antes; el resto de la paleta (texto, muted, violet-soft, ember) ya
quedaba por encima de AA sin tocarlo.

**Motivo.** "Más claro" pedía un fondo menos oscuro, no una paleta distinta. Tocar un solo
token rompía tanto la jerarquía visual como el contraste que ADR-012 ya había afinado una
vez; subir la escala entera mantiene el mismo diseño, solo que un peldaño más arriba.

**Consecuencias.** La paleta sigue siendo provisional (B-04): cuando el ministerio
confirme colores e identidad propios, esta escala se sustituye entera, no se ajusta color
a color.

## ADR-021 — El naranja marca lo musical, el violeta marca la interfaz

**Contexto.** Se pidió más presencia del color naranja. El naranja ya tenía dos usos: los
acordes de la hoja y el estado "favorito". El violeta cubría todo lo demás, incluidas las
insignias de tonalidad repetidas en cinco pantallas (lista de canciones, servicio,
historial, modo en vivo, mi preparación) y el chip de "±N semitonos" del selector de
tonalidad.

**Decisión.** Esas seis insignias de tonalidad pasan de violeta a naranja, para que "esto
es un dato musical" (acorde, tonalidad) se lea siempre en naranja y "esto es
navegación/interfaz" se lea en violeta. El primer intento usó un naranja translúcido sobre
la tarjeta (`bg-aurora-ember/15`), pero el cálculo de contraste dio 3.3–3.7:1 con texto del
mismo color de fondo tras la mezcla — por debajo de AA, y empeora cuanto más opaco. Se
cambió a fondo sólido `bg-aurora-bg` (el más oscuro de la escala), que da 5.13:1 con
cualquier tarjeta encima, verificado antes de subir.

**Consecuencias.** Si se añade una insignia de tonalidad nueva en otra pantalla, debe
seguir este mismo patrón (`bg-aurora-bg` + `text-aurora-ember`) y no el translúcido, que
falla contraste sobre superficies claras.

## ADR-022 — Academia: progreso personal por actor, certificado sin PDF, sin pagos

**Contexto.** Fase 4 del brief (§37): cursos, clases, estudiantes y progreso, profesores,
certificados y pagos. Es la primera vez que se toca esta fase — fases 1-3 ya estaban
completas (`BRIEF_COVERAGE.md`).

**Decisión.**
- `Course`/`Lesson` en el modelo, con `rights` y `scope` igual que `Tutorial`: contenido
  del ministerio, no personal.
- Matrícula y progreso (`Enrollment`) se guardan por actor bajo `academy:{id}`, el mismo
  patrón que favoritos (§31) y "preparado" (LOOP 013). No viajan en la copia de datos
  (ADR-014), igual que esos dos.
- "Profesores" no es un rol nuevo de RBAC: `Course.teacherIds` referencia `Member`, como ya
  hace `leadVocalistId` en un repertorio. Añadir un profesor no es un permiso distinto de
  gestionar el curso.
- "Progreso del equipo" (vista de quien enseña) lee `academy:{memberId}` para cada
  integrante — funciona porque la identidad de sesión ya vincula actor y `Member`
  (LOOP 003). Exige `course:write` y `member:read` a la vez: gestionar contenido no da
  automáticamente acceso al listado de integrantes.
- El certificado no es un archivo: es el mismo panel de "curso completo" con un botón
  "Imprimir" que usa el diálogo de impresión del navegador. No hay generador de PDF ni
  código de verificación — no se ha pedido que el certificado salga del ecosistema Aurora.
- Sin pagos. La regla del proyecto ("Sin gastos", `CLAUDE.md`) es explícita: no se activa
  ni se prepara integración de cobro sin autorización expresa del ministerio.

**Motivo.** Nada de esto necesita datos nuevos ni una capa de permisos distinta: reutiliza
tres patrones que ya existían (recursos con `ResourceListEditor`, progreso personal por
actor, referencia a `Member` sin rol dedicado). Construir Academia como una cuarta
variación de patrones probados es más barato que inventar uno nuevo, y mantiene la promesa
de `ARCHITECTURE.md` de que los puntos de extensión se construyen cuando el dato ya existe.

**Consecuencias.** El certificado no imprime nada verificable fuera de la aplicación —
correcto para uso interno, insuficiente si el ministerio algún día necesita certificados
que un tercero pueda validar. La vista de progreso del equipo solo ve a integrantes con
`Member` real y "soy yo" marcado; un actor sin identidad asignada avanza el curso pero
ningún profesor puede verlo en el roster, mismo límite que ya tenía "Mi preparación".

## ADR-023 — Autenticación real: el plan, no todavía el código

**Contexto.** El ministerio confirmó interés en resolver B-03 (autenticación) y B-06 (pagos
de Academia). Ninguno de los dos se puede construir de verdad sin una cuenta externa: no
existe ni un proyecto de Supabase ni una cuenta de cobro, y esta sesión no puede crearlas
—necesitan que una persona pase por un formulario web y acepte términos de servicio—.

**Decisión.** Esta sesión deja listo el plan y el esquema, no el código de sesión. Nada se
conecta a un backend que no existe todavía, porque no se puede comprobar en el navegador
(regla de este proyecto: nada se da por terminado sin esa comprobación).

Plan de autenticación, en el orden en que se construirá en cuanto haya proyecto:

1. **Proveedor:** Supabase (ya apuntado en ADR-001: "cuando entre autenticación real habrá
   que añadir backend, no reemplazar el frontend"). Auth + Postgres en el plan gratuito
   alcanza para el tamaño de Aurora.
2. **Esquema** (`supabase/schema.sql`, en este commit): tabla `profiles` que extiende
   `auth.users` de Supabase con `display_name`, `roles` (el mismo `Role[]` de
   `rbac/roles.ts`) y `member_id` opcional, para enlazar la cuenta con su `Member` de
   Equipo — la misma idea que "soy yo" (LOOP 003), ya no elegida a mano sino heredada del
   login. RLS activado desde el primer `CREATE TABLE`: nadie lee `profiles` de otra
   persona salvo quien ya tiene `role:assign`.
3. **Cliente:** `@supabase/supabase-js` en `src/data/auth.ts`, detrás de
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`. Sin esas variables, la aplicación sigue
   exactamente como hoy — el selector de rol de demostración no desaparece hasta que haya
   algo real que lo sustituya.
4. **Sesión:** `session.tsx` gana una rama que, si hay proyecto configurado, pide la
   sesión real a Supabase y construye el `Actor` desde `profiles.roles` en vez de
   `localStorage`. El contrato (`Actor` con `id` + `roles`, consumido por `can`/`canView`)
   no cambia — por eso ADR-004 podía prometer esto sin tocar las pantallas, y se cumple.
5. **Datos del ministerio:** login es la primera pieza, no toda la migración. Sincronizar
   canciones/servicios/cursos de IndexedDB a Postgres es un loop propio y más grande,
   posterior a que el login esté probado en el navegador de verdad.

Plan de pagos de Academia (B-06), aparte y más corto porque depende del anterior:

1. Requiere que el ministerio elija proveedor (Stripe es lo habitual para cursos: pago
   único o suscripción, checkout alojado por ellos, así que Aurora nunca toca tarjetas) y
   cree la cuenta — otra vez, un paso solo suyo.
2. Solo entonces se añade `Course.price` al modelo. No antes: un precio en pantalla sin
   una forma real de cobrarlo confundiría más de lo que ayuda.
3. El cobro pasa por Stripe Checkout (redirección), no por una integración de tarjetas a
   medida — más simple, y ninguna clave secreta de pago pasa por el cliente ni por este
   repositorio.

**Motivo.** Escribir el cliente de Supabase o de Stripe ahora, sin nada real al otro lado,
produciría código que nadie puede probar y que este proyecto no publica sin comprobación en
navegador. El esquema SQL sí es útil ya: es texto, no código de la aplicación, y ahorra la
primera vuelta de ida y vuelta el día que exista el proyecto.

**Consecuencias.** Falta exactamente una cosa para seguir con el código: que el ministerio
cree el proyecto de Supabase (gratis, cinco minutos) y pase la URL y la clave `anon` — nunca
la clave de servicio — por variable de entorno, nunca en el repositorio (regla del
proyecto). En cuanto lleguen, `auth.ts` y la rama de `session.tsx` se escriben y se
verifican en el mismo loop.

## ADR-024 — Autenticación real: el código, con un límite de verificación que hay que conocer

**Contexto.** Aurora creó el proyecto de Supabase y pasó URL y clave pública (ADR-023 ya
resuelto). Se escribió el código real: `src/data/auth.ts`, la rama nueva de `session.tsx`,
`AuthWidget` (entrar/salir) y `AccountsAdmin` (asignar roles). Al probarlo contra el
proyecto real desde esta sesión, el entorno sandbox devolvió un 403 de política de red al
intentar llegar a `*.supabase.co` — confirmado con `curl .../__agentproxy/status`, que
registra el rechazo explícito. No es un error de la aplicación: es que este entorno no
tiene permiso para salir a ese host.

**Decisión.** Se construye y se verifica todo lo que sí se puede verificar sin esa
conexión — typecheck, las 254 pruebas de dominio (sin cambios, ninguna toca auth real),
build, y el modo demo completo (`npm run a11y` + `npm run smoke`, las 60 comprobaciones
existentes, sin exportar `.env`) para confirmar que nada de lo existente se rompió. La
pantalla de entrar/registrarse se probó hasta donde el sandbox lo permitió: se encontró y
corrigió un fallo real ahí (el modal quedaba mal posicionado por el `backdrop-blur` del
header, que crea su propio contenedor para `position: fixed`; se resolvió con un portal a
`document.body`). Lo que no se pudo probar aquí — el viaje de ida y vuelta real contra
Supabase, signup → confirmación de correo → entrar → ver el rol — se deja documentado como
lo único pendiente de que Aurora confirme, con pasos concretos en `LOOP_STATUS.md`.

**Motivo.** Publicar sin decir que una parte no se verificó en este entorno sería romper la
regla del propio proyecto ("nada se da por terminado sin comprobación en navegador") por la
puerta de atrás. Mejor ser explícito sobre qué sí y qué no se pudo comprobar, y pedirle a
quien tiene la cuenta real que sea quien cierre esa última verificación — es su proyecto de
Supabase, y el sandbox nunca va a poder alcanzarlo.

**Decisiones de construcción, en breve:**
- `@supabase/supabase-js` se carga con `import()`, no en el bloque principal: sin backend
  configurado, nadie descarga sus ~220 KB (mismo cuidado de peso que LOOP 009).
- Sin sesión (o con sesión pero sin rol asignado), el actor se trata como `public` — nunca
  más acceso que un visitante anónimo, nunca menos.
- La primera cuenta que exista se vuelve `super-admin` sola (el `handle_new_user` de
  `supabase/schema.sql` lo revisa); nadie más se autoasigna nada.
- `AccountsAdmin` (en Ajustes) es la pantalla real de `role:assign`, que existía en RBAC
  desde el principio sin que nada la usara.
- El despliegue (`.github/workflows/deploy.yml`) ya pasa `VITE_SUPABASE_URL` y
  `VITE_SUPABASE_ANON_KEY` al build, leyéndolas de secretos del repositorio — sin
  configurarlos ahí, el sitio publicado sigue en modo demo, no se rompe.

**Consecuencias.** Dos cosas quedan en manos de Aurora, ninguna de código: confirmar el
correo de la primera cuenta y probar el ciclo completo una vez publicado (esta sesión no
puede hacerlo por el bloqueo de red), y añadir las dos claves como secretos del
repositorio de GitHub para que el sitio en vivo las use. Ver `LOOP_STATUS.md` para los
pasos exactos.

## ADR-025 — La documentación viva se separa de la histórica

**Contexto.** A los dieciocho loops la documentación pesaba 1.800 líneas (~14.000 palabras).
`LOOP_STATUS.md`, que `CLAUDE.md` obliga a leer **entero en cada sesión**, había llegado a 372
líneas de las cuales unas 280 eran historial de loops ya cerrados. Además tenía dos secciones
duplicadas literalmente y los loops desordenados: síntomas de un archivo al que se le añade por
arriba sin releerlo nunca. Cada sesión pagaba ese coste antes de escribir una sola línea.

**Decisión.** Separar lo vivo de lo histórico, sin borrar nada:

- `LOOP_STATUS.md` (372 → 91 líneas): loop actual, qué falta, bloqueos abiertos y un índice de
  una línea por loop. Es lo único de lectura obligatoria.
- `docs/HISTORIAL.md`: el detalle de los 18 loops, los errores corregidos y los bloqueos ya
  resueltos. Se consulta solo si la pregunta es histórica.
- `docs/CHANGELOG-ANTERIOR.md`: versiones 0.1.0 a 0.14.0. `CHANGELOG.md` (440 → 126) conserva
  las recientes, que son las que se comparan al escribir la siguiente.
- `DECISIONS.md`: se mantiene en un solo archivo pero con un **índice de una línea por ADR** al
  principio, para poder leer un ADR suelto en vez de las 540 líneas.
- `ARCHITECTURE.md`: tabla «Dónde vive cada cosa», por carpeta y no por archivo, para no
  explorar el árbol a ciegas ni quedarse obsoleta al añadir una pantalla.
- `CLAUDE.md`: ruta de lectura explícita, y —más importante— qué **no** leer.

**Alternativas descartadas, con su razón.** Fragmentar `DECISIONS.md` en 24 archivos
`docs/adr/NNN.md`: costaría *más* lecturas para responder «¿por qué X?», porque habría que
buscar entre archivos en vez de saltar dentro de uno. Fusionar `BRIEF_COVERAGE.md` en
`ROADMAP.md`: se solapan en contenido pero no en propósito — `BRIEF_COVERAGE` conserva la
numeración §N del encargo original, que es la trazabilidad, y `ROADMAP` no la tiene. Recortar
los comentarios del código: es el activo del proyecto y este mismo archivo exige el porqué
escrito.

**Consecuencias.** La lectura obligatoria por sesión baja de ~437 líneas (`LOOP_STATUS` +
`CLAUDE`) a ~165. El riesgo es que el historial se convierta en un vertedero que nadie mantiene;
se acepta a cambio de que el archivo caliente quede legible, y `CLAUDE.md` ahora dice
explícitamente que el detalle del loop va al historial y no a `LOOP_STATUS`.

**De paso.** Comprimir la salida de `npm run smoke` (67 líneas fijas → las informativas más un
resumen) destapó una comprobación falsa: `MUESTRA PROGRESO SI HAY ASIGNACIONES` estaba escrita
como `tieneProgreso || true`, así que pasaba siempre. Al hacerla honesta empezó a fallar, y la
causa era el propio guion: se comprobaba después de crear un servicio con fecha anterior, que
pasa a ser «el próximo» y no tiene asignaciones. Movida al punto donde el dato existe, y otras
dos tautologías (`comprobar(..., true)`) convertidas en aserciones reales. Ahora `smoke` también
sale con código distinto de cero cuando algo falla, en vez de terminar en verde con un `false`
perdido en la salida.
