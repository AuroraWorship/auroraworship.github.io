# Arquitectura

## Principio

`SIMPLE → ROBUSTO → ESCALABLE`. Se construye la pieza más pequeña que resuelve el problema real,
con la costura ya prevista para crecer. Nada de capas que hoy no sirven a nadie.

## Capas

```
src/domain/     Reglas puras. Sin React, sin red, sin navegador.
  music/        Notas, acordes, tonalidades, transposición, cuerpo de canción.
  rbac/         Roles, permisos, ámbitos de visibilidad.
  model.ts      Entidades del sistema.
src/data/       Acceso a datos tras una interfaz. Hoy en memoria.
src/ui/         React. Consume el dominio; no toma decisiones de negocio.
tests/domain/   Pruebas del dominio y del repositorio.
scripts/        Comprobación en navegador real.
```

La dirección de dependencia es siempre `ui → data → domain`. El dominio no sabe que existe una
interfaz, y por eso se puede probar entero sin montar un navegador.

## El motor musical

La pieza con más riesgo del producto, y la que más pruebas tiene.

Una nota **no** se guarda como un número de semitono. Se guarda como `(letra, alteración)`. Esa
distinción es la que hace que transponer de C a D convierta `F#` en `G#` y no en `Ab`: la letra se
mueve por escalones diatónicos y la alteración se calcula después, como el ajuste necesario para
alcanzar la altura correcta.

Un acorde se descompone en raíz, calidad, extensión, alteraciones, añadidos, suspensión y bajo —
pero **conserva su sufijo textual original**. Al transponer se reescriben solo raíz y bajo; el
sufijo viaja intacto. Así `Cmaj7#11` sigue siendo un `maj7#11` y no un acorde reinterpretado por
nosotros.

El sufijo se valida contra una lista blanca de piezas admitidas. Sin ella, cualquier palabra que
empiece por A-G se colaría como acorde: `Coro` se leería como un `C` con sufijo `oro`. Importa de
verdad, porque el cuerpo de la canción decide qué hay dentro de cada corchete preguntando
precisamente si es un acorde.

El cuerpo de la canción se divide en secciones, líneas y tramos `(acorde, texto)`. Transponer mapea
los acordes y deja el resto igual carácter a carácter. Hay pruebas de ida y vuelta en las 12
tonalidades que lo garantizan.

## Permisos

Negar por defecto: un permiso existe solo si está escrito en la tabla de su rol. Aurora trabaja con
menores, así que la exposición accidental es el fallo caro.

Tres ámbitos —`internal`, `members`, `public`— se derivan de los roles, no al revés. Cada entidad
lleva su `scope`, y **el filtrado ocurre en el repositorio, no en la vista**: una pantalla que
olvide comprobar permisos no puede filtrar datos porque nunca los recibe.

## Datos

`AuroraRepository` es una interfaz. Hoy la implementa `InMemoryRepository` sobre `seed.ts`; mañana
una contra base de datos cloud, sin tocar las pantallas. Es la decisión que mantiene reversible el
resto (ADR-004).

Metadata y binarios van separados: el modelo guarda `ResourceRef` con una URL o clave de objeto,
nunca el archivo. Es la preparación para storage cloud sin migrar nada.

## Copyright

`Rights.status` distingue cuatro orígenes: `own`, `licensed`, `public-domain`, `reference`. Solo
los dos que `isRedistributable()` acepta pueden salir al ámbito público. No se asume que letras,
grabaciones o partituras de terceros puedan redistribuirse.

## Información no confirmada

`PENDING` (`INFORMACIÓN PENDIENTE`) es un valor del modelo, no un comentario. Lo que el ministerio
no ha confirmado se muestra como pendiente en pantalla en lugar de rellenarse con una suposición.

## Despliegue

Salida estática, servida por GitHub Pages. `HashRouter` en vez de `BrowserRouter` porque Pages no
reescribe rutas y recargar una ruta profunda daría 404 (ADR-003).

## Puntos de extensión previstos

Existen como hueco en el modelo, sin implementación: secuencias (click, pads, stems), tablatura y
partituras, academia, notificaciones, offline, IA. Se construyen cuando los datos estructurados que
necesitan ya existan — primero el dato, después el asistente.
