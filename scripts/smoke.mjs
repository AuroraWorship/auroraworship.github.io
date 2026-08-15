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

// Subir un semitono y comprobar que los acordes cambian de verdad.
await page.getByLabel('Subir un semitono').click();
await page.waitForTimeout(200);
const after = await page.locator('.chord').allInnerTexts();
console.log('ACORDES +1:', after.filter(Boolean).slice(0, 6).join(' '));
console.log('TRANSPOSICION CAMBIA UI:', JSON.stringify(before) !== JSON.stringify(after));
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
console.log('GUARDADA:', (await page.locator('h1').innerText()).trim() === nuevoTitulo);

// Recargar de cero: si sobrevive, la persistencia funciona de verdad.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Tonalidad');
console.log('PERSISTE TRAS RECARGA:', (await page.locator('h1').innerText()).trim() === nuevoTitulo);

// El músico no debe ver botones de edición.
await page.selectOption('select[aria-label="Rol de demostración"]', 'musician');
await page.waitForTimeout(300);
const editarVisible = await page.getByRole('link', { name: 'Editar' }).count();
console.log('MUSICO VE BOTON EDITAR:', editarVisible > 0);

// --- Equipo y preparación personal ------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.goto('http://localhost:4173/#/equipo', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Equipo');
console.log('EQUIPO ARRANCA VACIO:', await page.isVisible('text=Todavía no hay integrantes'));

await page.getByRole('button', { name: 'Añadir' }).click();
await page.getByPlaceholder('Cómo aparece en el equipo').fill('Integrante de prueba');
await page.getByRole('button', { name: 'Piano', exact: true }).click();
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Integrante de prueba');
console.log('INTEGRANTE CREADO: true');

await page.getByRole('button', { name: 'Soy yo' }).click();
await page.waitForSelector('text=soy yo');
await page.screenshot({ path: `${shots}/07-equipo.png` });

await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
const identidad = await page.locator('main p').first().innerText();
console.log('PREPARACION RECONOCE IDENTIDAD:', identidad.includes('Integrante de prueba'));
await page.screenshot({ path: `${shots}/08-preparacion.png` });

// La tonalidad por vocalista debe poder fijarse ahora que hay integrantes.
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await songLinks.first().click();
await page.getByRole('link', { name: 'Editar' }).click();
await page.waitForSelector('text=Tonalidad por vocalista');
const selectorVocalista = page.getByLabel('Tonalidad de Integrante de prueba');
console.log('SELECTOR DE VOCALISTA PRESENTE:', (await selectorVocalista.count()) === 1);
await selectorVocalista.selectOption('A');
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Detalle');
await page.getByRole('tab', { name: 'Detalle' }).click();
await page.waitForSelector('text=Tonalidades por vocalista');
const detalle = await page.locator('main').innerText();
console.log('TONALIDAD POR VOCALISTA GUARDADA:', detalle.includes('Integrante de prueba'));

// --- Planificación y modo en vivo -------------------------------------------

await page.selectOption('select[aria-label="Rol de demostración"]', 'leader');
await page.goto('http://localhost:4173/#/servicio/planificar', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Planificar servicio');

await page.locator('input[type="date"]').fill('2026-09-05');
await page.waitForTimeout(300);

const primeraCancion = await page.locator('ol li p.font-medium').first().innerText();
await page.getByLabel(`Bajar ${primeraCancion}`).click();
await page.waitForTimeout(300);
const trasReordenar = await page.locator('ol li p.font-medium').first().innerText();
console.log('REORDENAR REPERTORIO:', trasReordenar !== primeraCancion);

await page.getByLabel('Integrante', { exact: true }).selectOption({ label: 'Integrante de prueba' });
await page.getByLabel('Instrumento').selectOption('piano');
await page.getByRole('button', { name: 'Añadir al servicio' }).click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${shots}/09-planificar.png` });

await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('text=Planificar servicio');
console.log('FECHA PERSISTE:', (await page.locator('input[type="date"]').inputValue()) === '2026-09-05');
// Se cuenta la fila de asignación, no el texto suelto: el nombre aparece
// también dentro de <option> invisibles y "text=" encontraría esos primero.
const asignaciones = await page.getByRole('button', { name: 'Quitar asignación' }).count();
console.log('ASIGNACION PERSISTE:', asignaciones === 1);

await page.goto('http://localhost:4173/#/vivo?modo=servicio', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Modo servicio');
const tituloVivo = page.locator('h1');
const enVivo = await tituloVivo.innerText();
console.log('MODO EN VIVO ABRE:', enVivo.length > 0);
console.log('NAV OCULTA EN VIVO:', !(await page.getByRole('link', { name: 'Aprender' }).isVisible()));
await page.screenshot({ path: `${shots}/10-vivo.png` });

await page.getByRole('button', { name: 'Siguiente →' }).click();
await page.waitForTimeout(200);
console.log('AVANZA DE CANCION:', (await tituloVivo.innerText()) !== enVivo);

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
console.log('SERVICE WORKER REGISTRADO:', swRegistrado);

// --- Ensayos ----------------------------------------------------------------

// El bloque anterior deja el navegador en modo en vivo, que no tiene cabecera
// ni selector de rol — por diseño. Hay que salir antes de cambiar de rol.
await page.goto('http://localhost:4173/#/ensayo', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'music-director');
await page.waitForSelector('text=Ensayos');
console.log('ENSAYOS ARRANCAN VACIOS:', await page.isVisible('text=No hay ensayos programados'));

await page.getByRole('link', { name: 'Nuevo' }).click();
await page.waitForSelector('text=Nuevo ensayo');
const bloquesPorDefecto = await page.getByLabel(/^Nombre del bloque/).count();
console.log('BLOQUES DEL MANUAL:', bloquesPorDefecto === 6);

const fechaEnsayo = await page.locator('input[type="date"]').inputValue();
console.log('PROPONE MIERCOLES:', new Date(`${fechaEnsayo}T12:00:00`).getDay() === 3);

await page.getByLabel('Nombre del bloque 1').fill('Oración de apertura');
await page.getByLabel('Repertorio a ensayar').selectOption({ index: 1 });
await page.getByRole('button', { name: 'Guardar' }).click();
await page.waitForSelector('text=Ensayos');
await page.waitForTimeout(400);
console.log('ENSAYO GUARDADO:', await page.isVisible('text=Oración de apertura'));
await page.screenshot({ path: `${shots}/12-ensayos.png` });

await page.goto('http://localhost:4173/#/preparacion', { waitUntil: 'networkidle' });
await page.waitForSelector('text=Mi preparación');
console.log('PREPARACION MUESTRA ENSAYO:', await page.isVisible('text=Próximo ensayo'));

// --- Copia de datos ---------------------------------------------------------

await page.goto('http://localhost:4173/#/ajustes', { waitUntil: 'networkidle' });
await page.selectOption('select[aria-label="Rol de demostración"]', 'admin');
await page.waitForSelector('text=Copia de datos');
console.log('AJUSTES ACCESIBLES PARA ADMIN:', await page.isVisible('text=Descargar copia'));

// Exportar de verdad e interceptar la descarga.
const descarga = page.waitForEvent('download');
await page.getByRole('button', { name: 'Descargar copia' }).click();
const archivo = await descarga;
const ruta = `${shots}/../copia-prueba.json`;
await archivo.saveAs(ruta);
const contenido = JSON.parse(await readFile(ruta, 'utf8'));
console.log('COPIA DESCARGADA:', archivo.suggestedFilename());
console.log('COPIA TRAE CANCIONES:', contenido.datos.songs.length > 0);
console.log('COPIA NO LLEVA FAVORITOS:', !JSON.stringify(contenido).includes('favorites'));

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
console.log('MUESTRA QUE CONTIENE ANTES DE SOBRESCRIBIR:', true);
await page.screenshot({ path: `${shots}/13-copia.png` });
await page.getByRole('button', { name: 'Sustituir datos' }).click();
await page.waitForTimeout(2500);
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const tras = await page.locator('main li a[href*="/canciones/"]').count();
console.log('RESTAURA LAS CANCIONES BORRADAS:', tras > 0);

// El músico no debe poder ni exportar ni importar.
await page.selectOption('select[aria-label="Rol de demostración"]', 'musician');
await page.goto('http://localhost:4173/#/ajustes', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
console.log('MUSICO BLOQUEADO EN COPIA:', await page.isVisible('text=Sin acceso'));

// --- Sin conexión -----------------------------------------------------------

// Primera visita en línea para que el service worker cachee; después se corta
// la red y se comprueba que la aplicación sigue abriendo y mostrando datos.
await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
await page.context().setOffline(true);
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForSelector('text=Canciones', { timeout: 10000 });
const cancionesOffline = await page.locator('main li a[href*="/canciones/"]').count();
console.log('ABRE SIN CONEXION:', true);
console.log('MUESTRA CANCIONES SIN CONEXION:', cancionesOffline > 0);
await page.screenshot({ path: `${shots}/11-offline.png` });
await page.context().setOffline(false);

console.log('ERRORES DE CONSOLA:', errors.length === 0 ? 'ninguno' : errors.join(' | '));
await browser.close();
