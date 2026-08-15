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

console.log('ERRORES DE CONSOLA:', errors.length === 0 ? 'ninguno' : errors.join(' | '));
await browser.close();
