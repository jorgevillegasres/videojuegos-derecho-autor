// tests/e2e/recorrido.spec.js
// El recorrido completo del estudiante en Chromium (spec, sección 18): arranque, armar
// el juego mínimo con pixel art, una subida, una pieza de biblioteca y una grabación con
// micrófono falso, llenar fichas, ver el semáforo cambiar con el destino, publicar, y
// abrir el juego.html exportado para jugarlo hasta los créditos.
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { png, lienzo } from '../../scripts/png-wav.js';

const ESTUDIANTE = 'Camila Rojas';
const TITULO = 'La llave del faro';

function pngDePrueba() {
  const l = lienzo(192, 108);
  l.rect(0, 0, 192, 108, [40, 60, 90]);
  l.rect(20, 70, 150, 30, [200, 180, 90]);
  return png(192, 108, l.rgba);
}

/** Dibuja un retrato con la herramienta de pixel art y lo guarda. */
async function crearRetratoConPixelArt(page) {
  await page.locator('[data-accion="crear-pixel"]').click();
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  const lienzoPixel = page.locator('.pixelart .pixel-lienzo');
  await expect(lienzoPixel).toBeVisible();
  await page.locator('.pixelart .pixel-color[data-color="3"]').click();
  const caja = await lienzoPixel.boundingBox();
  for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.4], [0.5, 0.8]]) {
    await page.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  }
  await page.locator('.pixelart [data-accion="guardar"]').click();
  await expect(page.locator('.pixelart')).toHaveCount(0);
}

/** Asigna un valor a un control del panel de propiedades (o del guion) por su data-foco. */
async function elegir(page, foco, etiqueta) {
  await page.locator(`[data-foco="${foco}"]`).selectOption({ label: etiqueta });
}

test('recorrido completo: del arranque al juego exportado y jugado', async ({ page }) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'entrega-e2e-'));
  const errores = [];
  page.on('pageerror', (error) => errores.push(error.message));

  // ---- Arranque (spec 3, paso 1) ----
  await page.goto('/plataforma/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Mi primer videojuego');
  await expect(page.locator('.privacidad')).toContainText('Nada sale de tu navegador');
  await page.fill('#inicio-estudiante', ESTUDIANTE);
  await page.fill('#inicio-titulo', TITULO);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText(TITULO);
  const publicar = page.locator('button[data-accion="publicar"]');
  await expect(publicar).toHaveAttribute('aria-disabled', 'true');

  // ---- Escenas y personajes ----
  await page.getByRole('button', { name: 'Nueva escena' }).click();
  await page.getByRole('button', { name: 'Nueva escena' }).click();
  const escenas = page.locator('.inventario-seccion').nth(0).locator('button.entrada');
  await expect(escenas).toHaveCount(3);
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  await page.locator('.propiedades [data-foco="nombre"]').fill('Ana');
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  await page.locator('.propiedades [data-foco="nombre"]').fill('El farero');
  const personajes = page.locator('.inventario-seccion').nth(1).locator('button.entrada');
  await expect(personajes).toHaveCount(2);

  // ---- Pixel art: dos retratos creados dentro, con ficha en verde ----
  await crearRetratoConPixelArt(page);
  await expect(page.locator('.propiedades h2')).toHaveText('Retrato');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await crearRetratoConPixelArt(page);
  await personajes.nth(0).click();
  await elegir(page, 'retrato', 'Retrato creado 1');
  await personajes.nth(1).click();
  await elegir(page, 'retrato', 'Retrato creado 2');

  // ---- Subir un archivo: el fondo, con ficha amarilla hasta elegir la prueba ----
  const [selector] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-accion="subir"]').click()]);
  await selector.setFiles({ name: 'muelle.png', mimeType: 'image/png', buffer: pngDePrueba() });
  await page.locator('.dialogo button[data-tipo="fondo"]').click();
  await expect(page.locator('.propiedades h2')).toHaveText('Fondo');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha select[id$="-prueba"]').selectOption('original');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Biblioteca: una pieza no comercial, con ficha precargada ----
  await page.locator('[data-accion="biblioteca"]').click();
  await page.locator('.capa-biblioteca [data-filtro="musica"]').click();
  await page.locator('.biblioteca-pieza[data-pieza="bib_m03"] [data-accion="usar"]').click();
  await expect(page.locator('.propiedades h2')).toHaveText('Música');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Grabador con micrófono falso: un efecto ----
  await page.locator('[data-accion="crear-grabar"]').click();
  await page.locator('.dialogo button[data-tipo="efecto"]').click();
  await expect(page.locator('.grabador')).toBeVisible();
  await page.locator('.grabador [data-accion="grabar"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.grabador [data-accion="detener"]').click();
  await expect(page.locator('.grabador [data-accion="guardar"]')).toBeEnabled();
  await page.locator('.grabador [data-accion="guardar"]').click();
  await expect(page.locator('.grabador')).toHaveCount(0);
  await expect(page.locator('.propiedades h2')).toHaveText('Efecto');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');

  // ---- Escena 1: fondo, música, un diálogo con efecto y una decisión ----
  await escenas.nth(0).click();
  await elegir(page, 'fondo', 'muelle');
  await elegir(page, 'musica', 'Persecución');
  await page.locator('button[data-agregar="dialogo"]').click();
  await elegir(page, 'personaje:0', 'Ana');
  await page.locator('[data-foco="texto:0"]').fill('¿Quién dejó la puerta abierta?');
  await elegir(page, 'efecto', 'Efecto grabado 1');
  await page.locator('button[data-agregar="decision"]').click();
  await page.locator('[data-foco="texto:1"]').fill('¿Subes a la torre?');
  await page.locator('[data-foco="opcion:1:0"]').fill('Sí');
  await elegir(page, 'destino:1:0', 'Escena 2');
  await page.locator('[data-foco="opcion:1:1"]').fill('No');
  await elegir(page, 'destino:1:1', 'Escena 3');
  await escenas.nth(1).click();
  await page.locator('button[data-agregar="fin"]').click();
  await page.locator('[data-foco="texto:0"]').fill('Alguien apagó el faro a propósito. Fin.');
  await escenas.nth(2).click();
  await page.locator('button[data-agregar="fin"]').click();
  await page.locator('[data-foco="texto:0"]').fill('Amanece sin respuestas. Fin.');

  // ---- El destino cambia el semáforo (spec 12.4): venta pone en rojo la pieza no comercial ----
  await page.locator('.inventario button.entrada').first().click();
  await expect(page.locator('.propiedades h2')).toHaveText('El juego');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(0);
  await elegir(page, 'destino', 'Venderlo');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(1);
  await expect(publicar).toHaveAttribute('aria-disabled', 'true');
  await elegir(page, 'destino', 'Publicarlo gratis');
  await expect(page.locator('.inventario .punto-semaforo.semaforo-rojo')).toHaveCount(0);

  // ---- Mapa de activos y Publicar habilitado ----
  await page.locator('[data-accion="mapa"]').click();
  await expect(page.locator('.mapa-tabla tbody tr')).toHaveCount(2 + 2 + 5);
  await page.locator('[data-accion="cerrar-mapa"]').click();
  await expect(publicar).not.toHaveAttribute('aria-disabled', 'true');

  // ---- Jugar dentro del editor ----
  await page.locator('[data-accion="jugar"]').click();
  await expect(page.locator('.capa-reproductor .escenario-texto')).toHaveText('¿Quién dejó la puerta abierta?');
  await page.locator('.capa-reproductor [data-accion="cerrar"]').click();

  // ---- Publicar: decisión de registro y paquete (spec 12.7 y 14) ----
  await publicar.click();
  await expect(page.locator('#publicar-titulo')).toHaveText('Publicar: decisión de registro');
  await page.locator('.capa-publicar input[data-candidato="historia"]').check();
  await page.locator('.capa-publicar [data-decision="historia"] input[data-campo="prueba"]').fill('El guion guardado en la plataforma y en la copia descargada');
  await page.locator('.capa-publicar [data-decision="historia"] textarea[data-campo="porque"]').fill('Es lo más mío del juego.');
  await page.locator('.capa-publicar [data-accion="siguiente"]').click();
  await expect(page.locator('#publicar-titulo')).toHaveText('Publicar: el paquete de entrega');
  await expect(page.locator('.publicar-resumen')).toContainText('entrega-camila-rojas-la-llave-del-faro.zip');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('.capa-publicar [data-accion="generar"]').click()]);
  expect(descarga.suggestedFilename()).toBe('entrega-camila-rojas-la-llave-del-faro.zip');
  const rutaZip = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(rutaZip);
  await expect(page.locator('.capa-publicar')).toBeHidden();
  await expect(page.locator('.aviso').filter({ hasText: 'Paquete descargado' })).toBeVisible();

  // ---- El paquete trae las piezas; el proyecto se puede volver a abrir ----
  const zip = await JSZip.loadAsync(await import('node:fs/promises').then((fs) => fs.readFile(rutaZip)));
  const nombres = Object.keys(zip.files).filter((n) => !zip.files[n].dir).sort();
  expect(nombres).toContain('juego.html');
  expect(nombres).toContain('informe-juridico.html');
  expect(nombres).toContain('proyecto.json');
  expect(nombres.filter((n) => n.startsWith('archivos/'))).toHaveLength(5);
  const proyecto = JSON.parse(await zip.file('proyecto.json').async('string'));
  expect(proyecto.estudiante).toBe(ESTUDIANTE);
  expect(proyecto.publicado).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(proyecto.registro).toHaveLength(1);
  writeFileSync(join(carpeta, 'juego.html'), await zip.file('juego.html').async('nodebuffer'));
  writeFileSync(join(carpeta, 'informe-juridico.html'), await zip.file('informe-juridico.html').async('nodebuffer'));

  // ---- El juego exportado se abre sin servidor y se juega hasta los créditos ----
  await page.goto(pathToFileURL(join(carpeta, 'juego.html')).href);
  await expect(page).toHaveTitle(TITULO);
  await expect(page.locator('.escenario-nombre')).toHaveText('Ana');
  await expect(page.locator('.escenario-texto')).toHaveText('¿Quién dejó la puerta abierta?');
  await expect(page.locator('.escenario-fondo img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(page.locator('.escenario-retrato img')).toHaveClass(/pixel/);
  await page.locator('.reproductor-escena').click();
  await expect(page.locator('.escenario-texto')).toHaveText('¿Subes a la torre?');
  await page.locator('.opcion[data-opcion="0"]').click();
  await expect(page.locator('.escenario-texto')).toHaveText('Alguien apagó el faro a propósito. Fin.');
  await page.locator('.reproductor-escena').click();
  await expect(page.locator('.escenario-creditos')).toContainText(`${ESTUDIANTE}: autor(a) del juego`);
  await expect(page.locator('.escenario-creditos')).toContainText('Persecución');

  // ---- El informe se abre y trae lo esencial ----
  await page.goto(pathToFileURL(join(carpeta, 'informe-juridico.html')).href);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(TITULO);
  await expect(page.locator('.portada')).toContainText(ESTUDIANTE);
  await expect(page.locator('#mapa tbody tr')).toHaveCount(9);
  await expect(page.locator('#registro')).toContainText('Es lo más mío del juego.');
  await expect(page.locator('#fichas article.ficha')).toHaveCount(9);

  expect(errores, `errores de página: ${errores.join(' | ')}`).toEqual([]);
});
