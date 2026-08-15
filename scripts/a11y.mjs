/**
 * Auditoría de accesibilidad.
 *
 * Recorre las pantallas y comprueba tres cosas que se rompen sin avisar:
 * que todo lo pulsable tenga nombre accesible, que los objetivos táctiles
 * sean alcanzables con el pulgar, y que haya un solo h1 por pantalla.
 *
 * Requiere `npm run build` y `npm run preview` en el puerto 4173.
 */
import { chromium } from 'playwright';

const executablePath =
  process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const browser = await chromium.launch({ executablePath });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

// 44px es el mínimo recomendado por WCAG 2.5.5 para un objetivo táctil.
const MIN_TAP = 44;

const RUTAS = [
  ['/canciones', 'musician'],
  ['/preparacion', 'musician'],
  ['/servicio', 'leader'],
  ['/servicio/planificar', 'leader'],
  ['/ensayo', 'musician'],
  ['/tutoriales', 'musician'],
  ['/equipo', 'admin'],
  ['/canciones/nueva', 'leader'],
  ['/vivo?modo=servicio', 'musician'],
];

let problemas = 0;

for (const [ruta, rol] of RUTAS) {
  await page.goto('http://localhost:4173/#/canciones', { waitUntil: 'networkidle' });
  await page.evaluate((r) => localStorage.setItem('aurora.demo-role', r), rol);
  // Recarga completa: navegar solo cambiando el hash no remonta la aplicación
  // y el rol recién escrito no se leería.
  await page.goto(`http://localhost:4173/#${ruta}`, { waitUntil: 'networkidle' });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(400);

  const informe = await page.evaluate((minTap) => {
    const nombreDe = (el) =>
      (
        el.getAttribute('aria-label') ||
        (el.getAttribute('aria-labelledby') &&
          document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) ||
        el.textContent ||
        el.getAttribute('title') ||
        ''
      ).trim();

    const interactivos = [...document.querySelectorAll('button, a[href], select, input, textarea')];
    const visibles = interactivos.filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });

    const sinNombre = visibles
      .filter((el) => {
        if (el.tagName === 'INPUT' || el.tagName === 'SELECT' || el.tagName === 'TEXTAREA') {
          return !nombreDe(el) && !el.closest('label') && !el.getAttribute('placeholder');
        }
        return !nombreDe(el);
      })
      .map((el) => `${el.tagName}.${el.className.split(' ')[0] ?? ''}`);

    const pequenos = visibles
      .filter((el) => {
        const r = el.getBoundingClientRect();
        // Un enlace en línea dentro de una frase es texto, no un botón:
        // exigirle 44px de alto no tiene sentido.
        if (el.tagName === 'A' && getComputedStyle(el).display === 'inline') return false;
        return r.height < minTap;
      })
      .map((el) => `${el.tagName} "${nombreDe(el).slice(0, 24)}" ${Math.round(el.getBoundingClientRect().height)}px`);

    return {
      sinNombre,
      pequenos,
      h1: document.querySelectorAll('h1').length,
      lang: document.documentElement.lang,
      interactivos: visibles.length,
    };
  }, MIN_TAP);

  const fallos = [];
  if (informe.sinNombre.length) fallos.push(`sin nombre: ${informe.sinNombre.join(', ')}`);
  if (informe.pequenos.length) fallos.push(`objetivo pequeño: ${informe.pequenos.join(', ')}`);
  if (informe.h1 !== 1) fallos.push(`h1 = ${informe.h1} (debe ser 1)`);

  problemas += fallos.length;
  const estado = fallos.length === 0 ? 'OK' : 'REVISAR';
  console.log(`${estado.padEnd(8)} ${ruta.padEnd(24)} ${informe.interactivos} interactivos`);
  for (const f of fallos) console.log(`         → ${f}`);
}

console.log(`\nIdioma del documento: ${await page.evaluate(() => document.documentElement.lang)}`);
console.log(problemas === 0 ? 'Sin problemas de accesibilidad detectados.' : `${problemas} puntos a revisar.`);

await browser.close();
process.exit(problemas === 0 ? 0 : 1);
