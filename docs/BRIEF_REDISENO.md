# Encargo de rediseño visual — Aurora Worship

Documento de entrada para una sesión de diseño. Recoge el contexto que no se ve desde fuera del
código y las restricciones que ya están verificadas, para que el rediseño no choque con
decisiones tomadas a conciencia (ver `DECISIONS.md`).

---

## 1. Qué es Aurora, y para quién

Aplicación del Ministerio de Alabanza Aurora (iglesia Fuente de Vida, Santa Marta). La usan
**jóvenes voluntarios, en sus propios teléfonos**, para preparar y tocar en ensayos y servicios.

No es un producto SaaS. No tiene clientes, ni onboarding de pago, ni equipo de soporte. Es una
herramienta interna de un ministerio.

## 2. El contexto de uso que manda sobre todo lo demás

> **La aplicación se lee a un metro de distancia, en penumbra, con las manos ocupadas.**

Ese es el listón. Se usa sobre un atril, durante el ensayo del miércoles y el servicio del
sábado, con un instrumento en las manos y media luz de escenario. Cuando una decisión estética y
esa realidad se contradigan, gana la realidad.

De ahí sale que la interfaz sea oscura: **no es preferencia de estilo** (ADR-007). Una pantalla
blanca en un escenario a media luz deslumbra y estorba.

## 3. Lo que ya existe y funciona — no hay que reinventarlo

El rediseño debe vestir esto, no inventar un producto paralelo. Rutas reales:

**Navegación inferior (5 destinos):** Canciones `♪` · Yo `★` · Servicio `✦` · Ensayo `◷` ·
Aprender `◈`

| Zona | Pantallas |
|---|---|
| Canciones | lista con búsqueda y filtros, detalle (acordes / letra / detalle), editor |
| Yo | «Mi preparación»: qué me toca, en qué tonalidad, con barra de progreso |
| Servicio | próximo servicio, lista de servicios, planificador, historial |
| Ensayo | ensayos con bloques de tiempo editables |
| Aprender | tutoriales y Academia (cursos, clases, certificado) |
| Aparte | Equipo, Ajustes, **Modo en vivo** |

Ya construido y verificado: autenticación real con roles, transposición de acordes con
digitaciones calculadas por instrumento (mástil y teclado en SVG), favoritos, copia de datos,
PWA que funciona sin conexión.

## 4. La paleta actual, y por qué importan las relaciones más que los colores

Valores actuales (contraste ya verificado contra WCAG AA):

```
bg            #2e2447    fondo de página
surface       #362b5a    tarjetas
surface-2     #42326c    controles dentro de tarjetas
border        #513f7c    bordes
text          #ede9f6    texto principal
muted         #a297c4    texto secundario
violet        #a27cf8    texto y bordes de acento — 4.64:1 sobre bg
violet-solid  #7c3aed    relleno de botones primarios (texto blanco encima) — 5.70:1
violet-soft   #c4b5fd    acento claro
ember         #f97316    naranja
```

**Dos reglas que no son valores, son gramática. Si se rompen, la app se lee mal aunque cada
color por separado cumpla contraste:**

1. **Escala de profundidad:** `bg` < `surface` < `surface-2` < `border`, en claridad creciente.
   Ya se rompió una vez al aclarar solo el fondo: las tarjetas dejaron de leerse como tarjetas
   (ADR-020).
2. **El naranja significa «dato musical»; el violeta, «interfaz».** Acordes, tonalidades y
   favoritos van en naranja en toda la app. Navegación, botones y títulos, en violeta (ADR-021).

Al portar un sistema de diseño ajeno: **mapear por rol, no por parecido de color.**

La paleta es provisional y hereda morado y naranja del ministerio juvenil MARCADOS. Sustituirla
por una identidad propia de Aurora es bienvenido — es un bloqueo abierto del proyecto (B-04).

## 5. Restricciones duras

No negociables, porque están verificadas o son reglas del producto.

- **Objetivos táctiles de 44 px** de alto mínimo. Única excepción admitida: el acorde sobre su
  sílaba en la hoja (WCAG 2.5.5 exceptúa los objetivos dentro de un bloque de texto; estirarlo lo
  despegaría de la palabra a la que pertenece).
- **Contraste AA** en todo texto. Se comprueba, y ya se han encontrado tres fallos por esa vía.
- **Sin `hover` como mecanismo de interacción.** La app tiene cero usos hoy, a propósito: en
  táctil el hover no existe y al tocar se queda «pegado». Vale para una web de marketing en
  escritorio; dentro de la app es esfuerzo invertido en un estado que nadie dispara.
- **`prefers-reduced-motion` obligatorio** si entran animaciones. Hoy no hay ni una referencia:
  si se añade movimiento, hay que añadir también su desactivación.
- **Sin rankings ni métricas de vanidad.** Regla escrita del producto: Aurora entiende a sus
  integrantes como ministros de adoración, no como músicos que compiten. La app sirve para
  preparar y honrar, no para exhibir. Esto descarta un «panel de control» con estadísticas.
- **Sin librerías de animación.** Es una PWA que funciona sin conexión y con disciplina explícita
  de peso (el paquete principal se mantiene en ~218 KB a propósito). CSS y SVG bastan.
- **Nada de material de terceros en lo público.** Solo contenido propio o de dominio público
  puede salir al ámbito público. Una landing con repertorio real podría exponer material con
  derechos ajenos.

## 6. El modo en vivo merece párrafo propio

Es la pantalla más crítica y la que más fácil se estropea. Se usa **durante** el servicio, con el
instrumento en las manos. Solo admite tres gestos: anterior, siguiente, salir.

Sale del armazón por completo: sin cabecera, sin navegación, sin nada alcanzable por tabulador o
lector de pantalla que no sea el contenido (ADR-011). Mantiene la pantalla encendida.

**Aquí las animaciones no son «sutiles o llamativas»: sobran.** Si el rediseño toca esta pantalla,
la dirección es quitar, no añadir.

## 7. Decisiones abiertas — aquí el diseño manda

- Identidad propia de Aurora: color, logo, tipografía. Es un bloqueo abierto (B-04).
- Jerarquía tipográfica y ritmo vertical.
- Cómo se ve la hoja de acordes: es el corazón del producto y hoy es funcional pero sobria.
- Densidad de la lista de canciones y de los repertorios.
- Estados vacíos y de carga.
- **Modo claro: bienvenido como opción, no como igual.** Si entra, la comprobación de contraste
  tiene que cubrir los dos temas — hoy se hace a mano, y a mano se cuela lo que se coló tres
  veces ya.

## 8. Fuera de alcance por ahora

- **Entrada de marketing / landing pública.** El brief original la sitúa en una fase posterior y
  arrastra el riesgo de derechos del punto 5. Si se quiere prototipar, que sea explícitamente
  como pieza aparte, no como puerta de la app.
- **Panel de control con métricas.** Ver punto 5.
- Reproductor de audio y secuencias: el modelo de datos existe, la función no, y no toca todavía.

## 9. Qué entregar, y cómo se va a comprobar

Entregable útil: **las pantallas reales de la lista del punto 3**, en móvil primero, con los
tokens declarados como variables CSS y su mapeo por rol explícito.

Al portarlo al código se le pasará, sin excepción:

```bash
npm run typecheck   # tipos
npm test            # pruebas de dominio
npm run build       # compilación y peso
npm run a11y        # 16 pantallas: objetivos táctiles, etiquetas, idioma
npm run smoke       # navegador real, 59 comprobaciones
```

Un diseño que no pase `a11y` no entra. Es más barato saberlo en el prototipo.
