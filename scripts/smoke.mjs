/**
 * Comprobación en navegador real.
 *
 * Las pruebas de dominio no ven si la aplicación monta, si la transposición
 * llega a la pantalla o si los permisos filtran de verdad. Esto sí.
 *
 * Requiere `npm run build` y `npm run preview` corriendo en el puerto 4173.
 */
import { mkdir } from 'node:fs/promises';
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

console.log('ERRORES DE CONSOLA:', errors.length === 0 ? 'ninguno' : errors.join(' | '));
await browser.close();
