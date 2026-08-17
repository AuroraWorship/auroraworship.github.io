/**
 * Comprobación en navegador real.
 *
 * Las pruebas de dominio no ven si la aplicación monta, si la transposición
 * llega a la pantalla o si los permisos filtran de verdad. Esto sí.
 *
 * Requiere `npm run build` y `npm run preview` corriendo en el puerto 4173.
 */
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const errors = [];

/**
 * Comprobación silenciosa.
 *
 * Callar en verde y gritar en rojo: sesenta líneas de `true` no informan de
 * nada y llenan la salida. Con `AURORA_SMOKE_VERBOSE=1` se imprimen todas,
 * que es lo que hace falta cuando se está depurando el propio script.
 */
const comprobaciones = [];
const verboso = process.env.AURORA_SMOKE_VERBOSE === '1';

function comprobar(etiqueta, ok, detalle = '') {
  comprobaciones.push({ etiqueta, ok: Boolean(ok) });
  if (!ok) console.log(`FALLA  ${etiqueta}${detalle ? ` ${detalle}` : ''}`);
  else if (verboso) console.log(`ok     ${etiqueta}${detalle ? ` ${detalle}` : ''}`);
}

/** Devuelve el código de salida: distinto de cero si algo falló. */
function resumen() {
  const fallos = comprobaciones.filter((c) => !c.ok);
  console.log(
    `\n${comprobaciones.length - fallos.length}/${comprobaciones.length} comprobaciones OK` +
      (fallos.length ? ` — FALLAN: ${fallos.map((c) => c.etiqueta).join(', ')}` : ''),
  );
  return fallos.length === 0 ? 0 : 1;
}
// El entorno cloud trae Chromium preinstalado con una versión distinta de la
// que espera el paquete; se apunta al binario existente en vez de descargar.
const executablePath =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));

const shots = new URL('./screenshots/', import.meta.url).pathname;
await mkdir(shots, { recursive: true });

await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Canciones');

// Esta comprobación recorre la aplicación cambiando de rol, así que necesita
// el build en modo demo. Con `.env` presente el build lleva autenticación real
// y el selector de rol no existe: mejor decirlo que morir en un timeout de 30 s
// treinta líneas más abajo.
if ((await page.getByLabel('Rol de demostración').count()) === 0) {
  console.log(
    'ABORTA: este build lleva autenticación real (VITE_SUPABASE_*), y la comprobación\n' +
      'recorre la app con el selector de rol de demostración. Compila sin esas variables\n' +
      '(mueve `.env` fuera) y vuelve a lanzarla.',
  );
  await browser.close();
  process.exit(1);
}

const songLinks = page.locator('main li a[href*="/canciones/"]');
console.log('LISTA:', await songLinks.count(), 'canciones');
await page.screenshot({ path: `${shots}/01-lista.png` });

await songLinks.first().click();
await page.waitForSelector('text=Tonalidad');
const title = await page.locator('h1').innerText();
console.log('DETALLE:', title);

// Acordes en la tonalidad original.
const before = await page.locator('.chord').allInnerTexts();
console.log('ACORDES ORIGINAL:', before.filter(Boolean).slice(0, 6).join(' '));
await page.screenshot({ path: `${shots}/02-cancion.png` });

// Digitaciones: al elegir instrumento, cada acorde abre su diagrama.
await page.selectOption('#diagram-instrument', 'acoustic-guitar');
const acorde = page.locator('button.chord').first();
const nombreAcorde = await acorde.innerText();
await acorde.click();
const ficha = page.locator('[role="dialog"]');
await ficha.waitFor({ state: 'visible' });
// El diagrama se calcula y se dibuja: no es una imagen guardada.
const puntos = await ficha.locator('svg circle').count();
comprobar('DIAGRAMA ABRE', await ficha.isVisible(), `(${nombreAcorde})`);
comprobar('DIAGRAMA SE DIBUJA', puntos > 0);
await page.screenshot({ path: `${shots}/02b-digitacion.png` });

// El teclado es otro dibujo distinto al mástil.
await page.selectOption('#diagram-instrument', 'piano');
await page.locator('button.chord').first().click();
comprobar('TECLADO SE DIBUJA', (await ficha.locator('svg rect').count()) > 0);
await ficha.locator('button[aria-label="Cerrar"]').click();
await page.selectOption('#diagram-instrument', '');

// Subir un semitono y comprobar que los acordes cambian de verdad.
await page.getByLabel('Subir un semitono').click();
await page.waitForTimeout(200);
const after = await page.locator('.chord').allInnerTexts();
console.log('ACORDES +1:', after.filter(Boolean).slice(0, 6).join(' '));
comprobar('TRANSPOSICION CAMBIA UI', JSON.stringify(before) !== JSON.stringify(after));
await page.screenshot({ path: `${shots}/03-transpuesta.png` });

// Servicio y permisos.
await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.waitForSelector('h1');
console.log('SERVICIO:', (await page.locator('h1').innerText()).trim());
await page.screenshot({ path: `${shots}/04-servicio.png` });

await page.selectOption('select[aria-label="Rol de demostración"]', 'public');
await page.waitForTimeout(300);
console.log('PUBLICO VE:', (await page.locator('main').innerText()).split('\n')[0]);

await page.goto('http://localhost:4173/#/ensayo', { waitUntil: 'networkidle' });
await page.screenshot({ path: `${shots}/05-ensayo.png` });

// --- Edición y persistencia -------------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.goto('http://localhost:4173/#/canciones/nueva', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Nueva canción');

const nuevoTitulo = `Prueba ${Date.now()}`;
await page.getByPlaceholder('Cómo se llama').fill(nuevoTitulo);
await page.locator('textarea').fill('# Coro\n[C]Cantaré [G]a mi Se[Am]ñor');
await page.screenshot({ path: `${shots}/06-editor.png` });

await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector(`text=${nuevoTitulo}`);
comprobar('GUARDADA', (await page.locator('h1').innerText()).trim() === nuevoTitulo);

// Recargar de cero: si sobrevive, la persistencia funciona de verdad.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Tonalidad');
comprobar('PERSISTE TRAS RECARGA', (await page.locator('h1').innerText()).trim() === nuevoTitulo);

// El músico no debe ver botones de edición.
await page.selectOption('select[aria-label="Rol de demostración"]', 'musician');
await page.waitForTimeout(300);
const editarVisible = await page.getByRole('link', { name: 'Editar' }).count();
// Se afirma la ausencia: el músico NO debe ver el botón de editar.
comprobar('MUSICO NO VE BOTON EDITAR', editarVisible === 0);

// --- Equipo y preparación personal ------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.goto('http://localhost:4173/#/equipo', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Equipo');
comprobar('EQUIPO ARRANCA VACIO', await page.isVisible('text=Todavía no hay integrantes'));

await page.getByRole('button', { name: 'Añadir' }).click();
await page.getByPlaceholder('Cómo aparece en el equipo').fill('Integrante de prueba');
await page.getByRole('button', { name: 'Piano', exact: true }).click();
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Integrante de prueba');
comprobar('INTEGRANTE CREADO', true);

await page.getByRole('button', { name: 'Soy yo' }).click();
await page.waitForSelector('text=soy yo');
await page.screenshot({ path: `${shots}/07-equipo.png` });

await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
const identidad = await page.locator('main p').first().innerText();
comprobar('PREPARACION RECONOCE IDENTIDAD', identidad.includes('Integrante de prueba'));
await page.screenshot({ path: `${shots}/08-preparacion.png` });

// La tonalidad por vocalista debe poder fijarse ahora que hay integrantes.
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await songLinks.first().click();
await page.getByRole('link', { name: 'Editar' }).click();
await page.waitForSelector('text=Tonalidad por vocalista');
const selectorVocalista = page.getByLabel('Tonalidad de Integrante de prueba');
comprobar('SELECTOR DE VOCALISTA PRESENTE', (await selectorVocalista.count()) === 1);
await selectorVocalista.selectOption('A');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Detalle');
await page.getByRole('tab', { name: 'Detalle' }).click();
await page.waitForSelector('text=Tonalidades por vocalista');
const detalle = await page.locator('main').innerText();
comprobar('TONALIDAD POR VOCALISTA GUARDADA', detalle.includes('Integrante de prueba'));

// --- Planificación y modo en vivo -------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.getByRole('link', { name: 'Planificar' }).click();
await page.waitForSelector('text=Planificar servicio');

await page.locator('input[type="date"]').fill('2026-09-05');
await page.waitForTimeout(300);

const primeraCancion = await page.locator('ol li p.font-medium').first().innerText();
await page.getByLabel(`Bajar ${primeraCancion}`).click();
await page.waitForTimeout(300);
const trasReordenar = await page.locator('ol li p.font-medium').first().innerText();
comprobar('REORDENAR REPERTORIO', trasReordenar !== primeraCancion);

await page.getByLabel('Integrante', { exact: true }).selectOption({ label: 'Integrante de prueba' });
await page.getByLabel('Instrumento').selectOption('piano');
await page.getByRole('button', { name: 'Añadir al servicio' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/09-planificar.png` });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Planificar servicio');
comprobar('FECHA PERSISTE', (await page.locator('input[type="date"]').inputValue()) === '2026-09-05');
// Se cuenta la fila de asignación, no el texto suelto: el nombre aparece
// también dentro de <option> invisibles y "text=" encontraría esos primero.
const asignaciones = await page.getByRole('button', { name: 'Quitar asignación' }).count();
comprobar('ASIGNACION PERSISTE', asignaciones === 1);

// El progreso se comprueba AQUÍ y no más abajo: «Mi preparación» muestra el
// próximo servicio, y más adelante se crea otro con fecha anterior que pasa a
// serlo. Ahí ya no habría asignaciones que mostrar, y la comprobación medía
// otra cosa de la que decía (estaba enmascarada por un `|| true`).
await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
const tieneProgreso = await page.isVisible('text=Tu progreso');
comprobar('MUESTRA PROGRESO SI HAY ASIGNACIONES', tieneProgreso);
if (tieneProgreso) {
  await page.getByRole('button', { name: /preparado/i }).first().click();
  await page.waitForTimeout(300);
  comprobar('MARCAR COMO PREPARADO CAMBIA EL ESTADO', await page.isVisible('text=✓ Preparado'));
}

await page.goto('http://localhost:4173/#/vivo?modo=servicio', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Modo servicio');
const tituloVivo = page.locator('h1');
const enVivo = await tituloVivo.innerText();
comprobar('MODO EN VIVO ABRE', enVivo.length > 0);
comprobar('NAV OCULTA EN VIVO', !(await page.getByRole('link', { name: 'Aprender' }).isVisible()));
await page.screenshot({ path: `${shots}/10-vivo.png` });

await page.getByRole('button', { name: 'Siguiente →' }).click();
await page.waitForTimeout(200);
comprobar('AVANZA DE CANCION', (await tituloVivo.innerText()) !== enVivo);

// --- PWA --------------------------------------------------------------------

const manifest = await page.evaluate(async () => {
  const res = await fetch('./manifest.webmanifest');
  return res.ok ? await res.json() : null;
});
console.log('MANIFIESTO:', manifest?.name ?? 'ausente');

const swRegistrado = await page.evaluate(async () => {
  if (!('serviceWorker' in navigator)) return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return Boolean(reg);
});
comprobar('SERVICE WORKER REGISTRADO', swRegistrado);

// --- Ensayos ----------------------------------------------------------------

// El bloque anterior deja el navegador en modo en vivo, que no tiene cabecera
// ni selector de rol — por diseño. Hay que salir antes de cambiar de rol.
await page.goto('http://localhost:4173/#/ensayo', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'music-director');
await page.waitForSelector('text=Ensayos');
comprobar('ENSAYOS ARRANCAN VACIOS', await page.isVisible('text=No hay ensayos programados'));

await page.getByRole('link', { name: 'Nuevo' }).click();
await page.waitForSelector('text=Nuevo ensayo');
const bloquesPorDefecto = await page.getByLabel(/^Nombre del bloque/).count();
comprobar('BLOQUES DEL MANUAL', bloquesPorDefecto === 6);

const fechaEnsayo = await page.locator('input[type="date"]').inputValue();
comprobar('PROPONE MIERCOLES', new Date(`${fechaEnsayo}T12:00:00`).getDay() === 3);

await page.getByLabel('Nombre del bloque 1').fill('Oración de apertura');
await page.getByLabel('Repertorio a ensayar').selectOption({ index: 1 });
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Ensayos');
await page.waitForTimeout(400);
comprobar('ENSAYO GUARDADO', await page.isVisible('text=Oración de apertura'));
await page.screenshot({ path: `${shots}/12-ensayos.png` });

await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
comprobar('PREPARACION MUESTRA ENSAYO', await page.isVisible('text=Próximo ensayo'));

// --- Varios servicios -------------------------------------------------------

await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.waitForSelector('text=Servicio');

await page.getByRole('link', { name: 'Nuevo servicio' }).click();
await page.waitForSelector('text=Nuevo servicio');
const fechaServicio = await page.locator('input[type="date"]').inputValue();
comprobar('PROPONE SABADO', new Date(`${fechaServicio}T12:00:00`).getDay() === 6);

await page.getByLabel('Evento').fill('Vigilia de prueba');
await page.waitForTimeout(400);
comprobar('PUEDE REPETIR REPERTORIO ANTERIOR', await page.isVisible('text=Repetir el repertorio anterior'));
await page.getByRole('button', { name: /Repetir el repertorio anterior/ }).click();
await page.waitForTimeout(500);
const cancionesCopiadas = await page.locator('ol li p.font-medium').count();
comprobar('REPERTORIO COPIADO', cancionesCopiadas > 0);
await page.screenshot({ path: `${shots}/17-nuevo-servicio.png` });

await page.goto('http://localhost:4173/#/servicios', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Todos los servicios');
const listaServicios = await page.locator('main li a').count();
comprobar('CONVIVEN VARIOS SERVICIOS', listaServicios >= 2);
comprobar('EL NUEVO APARECE', await page.isVisible('text=Vigilia de prueba'));

// El servicio anterior no se ha visto afectado. Se busca por nombre: la lista
// va por fecha, y el nuevo puede caer antes que el de ejemplo.
await page.locator('main li a', { hasText: 'Servicio de ejemplo' }).click();
// "h1" a secas ya existe en el DOM (lo tiene la propia lista): esperar solo
// eso resuelve antes de que la navegación SPA termine. Se espera el
// encabezado que solo aparece en ServicePage.
await page.getByRole('heading', { name: 'Servicio', exact: true }).waitFor();
const otroServicio = await page.locator('main').innerText();
comprobar('EL ANTERIOR SIGUE INTACTO', !otroServicio.includes('Vigilia de prueba'));

// --- Búsqueda avanzada, voces y partes --------------------------------------

await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.waitForSelector('text=Canciones');
const totalCanciones = await songLinks.count();

await page.getByRole('button', { name: /^Filtros/ }).click();
await page.getByLabel('Filtrar por tonalidad').selectOption('D');
await page.waitForTimeout(400);
const trasFiltrar = await songLinks.count();
comprobar('FILTRO POR TONALIDAD REDUCE', trasFiltrar > 0 && trasFiltrar < totalCanciones);

await page.getByLabel('BPM mínimo').fill('200');
await page.waitForTimeout(400);
comprobar('FILTRO DE TEMPO SIN RESULTADOS AVISA', await page.isVisible('text=Sin resultados'));

await page.getByRole('button', { name: 'Limpiar' }).click();
await page.waitForTimeout(400);
comprobar('LIMPIAR RESTAURA LA LISTA', (await songLinks.count()) === totalCanciones);
await page.screenshot({ path: `${shots}/15-filtros.png` });

// Voces y partes por instrumento, que antes solo existían en el modelo.
await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.locator('ol li a[href*="/canciones/"]').first().click();
await page.getByRole('link', { name: 'Editar' }).click();
await page.waitForSelector('text=Partes por instrumento');

await page.getByLabel('Añadir voz').selectOption('third');
await page.waitForTimeout(200);
await page.getByLabel('Intervalo de Tercera voz').fill('5ª abajo');
await page.getByRole('button', { name: 'Añadir parte' }).click();
await page.getByLabel('Instrucciones de la parte 1').fill('Entrar solo en el coro');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Detalle');
await page.getByRole('tab', { name: 'Detalle' }).click();
await page.waitForTimeout(300);
const detalleVoces = await page.locator('main').innerText();
comprobar('VOZ GUARDADA', detalleVoces.includes('5ª abajo'));
comprobar('PARTE GUARDADA', detalleVoces.includes('Entrar solo en el coro'));
await page.screenshot({ path: `${shots}/16-voces.png` });

// --- Tutoriales e historial -------------------------------------------------

await page.goto('http://localhost:4173/#/tutoriales', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'editor');
await page.waitForSelector('text=Aprender');
await page.getByRole('link', { name: 'Nuevo' }).click();
await page.waitForSelector('text=Nuevo tutorial');

await page.getByPlaceholder('Qué se aprende aquí').fill('Cejilla en guitarra');
await page.getByLabel('Categoría').selectOption('guitar');
await page.getByRole('button', { name: 'Añadir material' }).click();
await page.getByLabel('Título del material 1').fill('Clase en vídeo');
await page.getByLabel('Enlace del material 1').fill('https://ejemplo.test/cejilla');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Cejilla en guitarra');
comprobar('TUTORIAL CREADO', await page.isVisible('text=Clase en vídeo'));
const enlaceMaterial = await page.getByRole('link', { name: /Clase en vídeo/ }).getAttribute('href');
comprobar('MATERIAL ENLAZADO', enlaceMaterial === 'https://ejemplo.test/cejilla');
await page.screenshot({ path: `${shots}/14-tutoriales.png` });

// Guardar sin enlace debe avisar, no guardar a medias.
await page.getByRole('link', { name: 'Editar' }).first().click();
await page.waitForSelector('text=Editar tutorial');
await page.getByRole('button', { name: 'Añadir material' }).click();
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForTimeout(300);
comprobar('AVISA DE MATERIAL SIN ENLACE', await page.isVisible('text=Hay material sin enlace'));

// Historial: registrar el servicio y verlo en la canción.
await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.waitForSelector('text=Servicio');
await page.getByRole('button', { name: 'Registrar en el historial' }).click();
await page.waitForTimeout(400);
const textoBoton = await page.getByRole('button', { name: /Registradas|Ya estaba/ }).innerText();
comprobar('HISTORIAL REGISTRADO', /Registradas \d+ canciones/.test(textoBoton));

await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Registrar en el historial' }).click();
await page.waitForTimeout(400);
comprobar('NO DUPLICA AL REGISTRAR DOS VECES', await page.isVisible('text=Ya estaba registrado'));

// Se entra desde el servicio, no desde la biblioteca: solo las canciones del
// repertorio tienen historial, y la lista alfabética empieza por otra.
await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.locator('ol li a[href*="/canciones/"]').first().click();
await page.getByRole('tab', { name: 'Detalle' }).click();
await page.waitForSelector('text=Historial');
const detalleHistorial = await page.locator('main').innerText();
comprobar('HISTORIAL VISIBLE EN LA CANCION', !detalleHistorial.includes('Todavía no se ha registrado'));

// --- Academia -----------------------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'editor');
await page.goto('http://localhost:4173/#/academia', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Academia');
await page.getByRole('link', { name: 'Nuevo' }).click();
await page.waitForSelector('text=Nuevo curso');
await page.getByPlaceholder('Qué se aprende en este curso').fill('Piano para acompañar');
await page.getByLabel('Estado').selectOption('published');
await page.getByRole('button', { name: 'Añadir clase' }).click();
await page.getByPlaceholder('Clase 1').fill('Acordes básicos');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Piano para acompañar');
comprobar('CURSO CREADO', await page.isVisible('text=Piano para acompañar'));

// La misma identidad de "Integrante de prueba" sigue activa: se matricula y
// completa el curso como esa persona, no como un rol de demostración suelto.
await page.getByText('Piano para acompañar').click();
await page.waitForSelector('text=Empezar curso');
await page.getByRole('button', { name: 'Empezar curso' }).click();
await page.waitForTimeout(200);
await page.locator('button[aria-label^="Marcar"]').first().click();
await page.waitForTimeout(200);
comprobar('CERTIFICADO AL COMPLETAR', await page.isVisible('text=Certificado'));
await page.screenshot({ path: `${shots}/20-academia-certificado.png` });

// Quien gestiona cursos ve el progreso de quien se matriculó.
await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.reload({ waitUntil: 'networkidle' });
comprobar('PROGRESO DEL EQUIPO VISIBLE', await page.isVisible('text=Progreso del equipo'));
comprobar('MUESTRA A QUIEN COMPLETO', await page.isVisible('text=Integrante de prueba'));

// --- Historial global, estado y progreso ------------------------------------

await page.goto('http://localhost:4173/#/servicio', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.waitForSelector('text=Servicio');
await page.getByRole('link', { name: 'Historial' }).click();
// El h1 monta antes de que resuelva la carga asíncrona; se espera el texto
// de recuento ("N registros"), que solo aparece cuando entries ya no es null.
await page.waitForSelector('text=/\\d+ registros/');
comprobar('HISTORIAL GLOBAL MUESTRA REGISTROS', (await page.locator('main li a').count()) > 0);
await page.screenshot({ path: `${shots}/18-historial.png` });

await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await songLinks.first().click();
await page.getByRole('link', { name: 'Editar' }).click();
await page.waitForSelector('text=Estado');
await page.getByLabel('Estado').selectOption('archived');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Detalle');

await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /^Filtros/ }).click();
await page.getByLabel('Filtrar por estado').selectOption('archived');
await page.waitForTimeout(400);
comprobar('FILTRO POR ESTADO FUNCIONA', (await songLinks.count()) === 1);

await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.goto('http://localhost:4173/#/equipo', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Equipo');
await page.getByRole('button', { name: 'Soy yo' }).first().click();
await page.waitForTimeout(300);

await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
await page.screenshot({ path: `${shots}/19-preparacion-progreso.png` });

// --- Copia de datos ---------------------------------------------------------

await page.goto('http://localhost:4173/#/ajustes', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.waitForSelector('text=Copia de datos');
comprobar('AJUSTES ACCESIBLES PARA ADMIN', await page.isVisible('text=Descargar copia'));

// Exportar de verdad e interceptar la descarga.
const descarga = page.waitForEvent('download');
await page.getByRole('button', { name: 'Descargar copia' }).click();
const archivo = await descarga;
const ruta = `${shots}/../copia-prueba.json`;
await archivo.saveAs(ruta);
const contenido = JSON.parse(await readFile(ruta, 'utf8'));
console.log('COPIA DESCARGADA:', archivo.suggestedFilename());
comprobar('COPIA TRAE CANCIONES', contenido.datos.songs.length > 0);
comprobar('COPIA NO LLEVA FAVORITOS', !JSON.stringify(contenido).includes('favorites'));

// Borrar todo y restaurar desde el archivo.
await page.evaluate(async () => {
  const req = indexedDB.open('aurora', 1);
  const db = await new Promise((res) => { req.onsuccess = () => res(req.result); });
  await new Promise((res) => {
    const r = db.transaction('kv', 'readwrite').objectStore('kv').put([], 'songs');
    r.onsuccess = () => res(undefined);
  });
});
await page.reload({ waitUntil: 'networkidle' });
await page.setInputFiles('input[aria-label="Archivo de copia"]', ruta);
await page.waitForSelector('text=Esta copia contiene');
comprobar(
  'MUESTRA QUE CONTIENE ANTES DE SOBRESCRIBIR',
  await page.isVisible('text=Esta copia contiene'),
);
await page.screenshot({ path: `${shots}/13-copia.png` });
await page.getByRole('button', { name: 'Sustituir datos' }).click();
await page.waitForTimeout(2500);
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const tras = await page.locator('main li a[href*="/canciones/"]').count();
comprobar('RESTAURA LAS CANCIONES BORRADAS', tras > 0);

// El músico no debe poder ni exportar ni importar.
await page.selectOption('select[aria-label="Rol de demostración"]', 'musician');
await page.goto('http://localhost:4173/#/ajustes', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
comprobar('MUSICO BLOQUEADO EN COPIA', await page.isVisible('text=Sin acceso'));

// --- Sin conexión -----------------------------------------------------------

// Primera visita en línea para que el service worker cachee; después se corta
// la red y se comprueba que la aplicación sigue abriendo y mostrando datos.
// El rol se fija antes de cortar la red: escribirlo en localStorage no
// remonta la aplicación, y luego no habría forma de recargar para que lo lea.
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.evaluate((r) => localStorage.setItem('aurora.demo-role', r), 'leader');
await page.reload({ waitUntil: 'networkidle' });
// La precarga de las pantallas separadas se pide en tiempo ocioso, con un
// tope de 5 s. Se espera a que ocurra: cortar la red antes mediría el
// arranque, no el uso real.
await page.waitForTimeout(7000);
await page.context().setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Canciones', { timeout: 10000 });
const cancionesOffline = await page.locator('main li a[href*="/canciones/"]').count();
comprobar('ABRE SIN CONEXION', await page.isVisible('text=Canciones'));
comprobar('MUESTRA CANCIONES SIN CONEXION', cancionesOffline > 0);

// Las pantallas separadas se precargan cuando el navegador está ocioso, así
// que también deben abrir sin red. Si esto falla, dividir el paquete rompió
// el uso sin conexión.
await page.goto('http://localhost:4173/#/canciones/nueva', { waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Nueva canción', { timeout: 10000 }).catch(() => {});
comprobar('EDITOR ABRE SIN CONEXION', await page.isVisible('text=Nueva canción'));
await page.screenshot({ path: `${shots}/11-offline.png` });
await page.context().setOffline(false);

comprobar('SIN ERRORES DE CONSOLA', errors.length === 0, errors.join(' | '));
await browser.close();

// Salir con código de error si algo falló: así el flujo de CI se entera, en
// vez de terminar en verde con un `false` perdido en la salida.
process.exit(resumen());
