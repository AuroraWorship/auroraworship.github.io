# Decisiones

Registro de decisiones con su razón. Existe para no volver a analizar lo ya analizado.

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
