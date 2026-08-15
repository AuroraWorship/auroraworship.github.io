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
