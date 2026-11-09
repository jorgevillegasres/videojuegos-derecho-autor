// tests/e2e/recorrido.spec.js
// El recorrido guiado del estudiante en Chromium (diseño del modo guiado, sección 12):
// arranque, fase 0 jugando el ejemplo, fases 1 a 7 reemplazando sus piezas con pixel art,
// una subida, la biblioteca y una grabación con micrófono falso, publicación, y el
// juego.html exportado jugado hasta los créditos. Sin errores de página.
import { test, expect } from '@playwright/test';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import JSZip from 'jszip';
import { png, lienzo } from '../../scripts/png-wav.js';

const ESTUDIANTE = 'Camila Rojas';
const TITULO = 'El faro de Camila';
const LINEAS = {
  muelle: ['La lluvia golpea la reja del faro.', '¿Quién abrió la reja?', 'Yo la dejé con candado. Alguien tiene otra llave.', '¿Bajas al sótano?'],
  torre: ['El sótano huele a sal. Hay un cofre abierto.', 'Lucía encuentra una carta. Mañana la leerá.'],
  amanecer: ['Volvamos cuando pare la lluvia.', 'Al amanecer, la reja está cerrada otra vez.'],
};

function pngDePrueba() {
  const l = lienzo(64, 64);
  l.rect(0, 0, 64, 64, [40, 60, 90]);
  l.circulo(32, 28, 14, [220, 180, 140]);
  return png(64, 64, l.rgba);
}

const banda = (page) => page.locator('.banda');
const siguiente = (page) => page.locator('[data-accion="guia-siguiente"]');
const seccion = (page, clave) => page.locator(`[data-seccion="${clave}"] button.entrada`);

async function elegir(page, foco, etiqueta) {
  await page.locator(`[data-foco="${foco}"]`).selectOption({ label: etiqueta });
}

async function pasarDeFase(page, nombre) {
  await expect(siguiente(page)).toBeEnabled();
  await siguiente(page).click();
  await expect(page.locator('.banda-fase')).toContainText(nombre);
}

/** Clic en la escena hasta los créditos; en una decisión elige la opción dada. */
async function jugarHastaCreditos(page, raiz, opcion = 0) {
  for (let i = 0; i < 20; i += 1) {
    if (await raiz.locator('.escenario-creditos:not([hidden])').count()) return;
    const opciones = raiz.locator(`.opcion[data-opcion="${opcion}"]`);
    if (await opciones.count()) await opciones.click();
    else await raiz.locator('.reproductor-escena').click();
  }
  await expect(raiz.locator('.escenario-creditos')).toBeVisible();
}

test('recorrido guiado: del juego de ejemplo al juego propio publicado y jugado', async ({ page }) => {
  const carpeta = mkdtempSync(join(tmpdir(), 'entrega-e2e-'));
  const errores = [];
  page.on('pageerror', (error) => errores.push(error.message));
  await page.setViewportSize({ width: 1280, height: 800 });

  // ---- Arranque ----
  await page.goto('/plataforma/');
  await expect(page.locator('.inicio-explicacion')).toContainText('Vas a recibir un juego terminado');
  await expect(page.locator('#inicio-titulo')).toHaveCount(0);
  await page.fill('#inicio-estudiante', ESTUDIANTE);
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText('La llave del faro');
  await expect(page.locator('.banda-fase')).toHaveText('Inicio · Conoce el ejemplo');
  await expect(siguiente(page)).toBeDisabled();
  await expect(page.locator('.entrada-muestra')).toHaveCount(2);

  // ---- Fase 0: jugar el ejemplo hasta los créditos ----
  await page.locator('[data-accion="guia-jugar"]').click();
  const reproductor = page.locator('.capa-reproductor');
  await expect(reproductor.locator('.escenario-texto')).toHaveText('La niebla cubre el muelle. La puerta del faro está abierta.');
  await jugarHastaCreditos(page, reproductor);
  await reproductor.locator('[data-accion="cerrar"]').click();
  await pasarDeFase(page, 'Tu historia');

  // ---- Fase 1: título, sinopsis y las ocho líneas ----
  await page.locator('[data-seccion="juego"] button.entrada').click();
  await page.locator('.propiedades [data-foco="titulo"]').fill(TITULO);
  await page.locator('.propiedades [data-foco="sinopsis"]').fill('Una guardiana descubre que alguien tiene otra llave del faro.');
  for (const [i, clave] of ['muelle', 'torre', 'amanecer'].entries()) {
    await seccion(page, 'escenas').nth(i).click();
    for (const [j, texto] of LINEAS[clave].entries()) await page.locator(`[data-foco="texto:${j}"]`).fill(texto);
  }
  await expect(banda(page)).not.toContainText('quedan');
  await pasarDeFase(page, 'Tus personajes');

  // ---- Fase 2: nombres y descripciones ----
  for (const [i, [nombre, descripcion]] of [['Lucía', 'Guardiana nueva del faro.'], ['El guardián', 'Conoce todas las llaves.']].entries()) {
    await seccion(page, 'personajes').nth(i).click();
    await page.locator('.propiedades [data-foco="nombre"]').fill(nombre);
    await page.locator('.propiedades [data-foco="descripcion"]').fill(descripcion);
  }
  await pasarDeFase(page, 'Sus retratos');

  // ---- Fase 3: un retrato con pixel art y otro subido ----
  await page.locator('[data-accion="crear-pixel"]').click();
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  const lienzoPixel = page.locator('.pixelart .pixel-lienzo');
  await expect(lienzoPixel).toBeVisible();
  await page.locator('.pixelart .pixel-color[data-color="3"]').click();
  const caja = await lienzoPixel.boundingBox();
  for (const [fx, fy] of [[0.3, 0.3], [0.5, 0.5], [0.7, 0.4]]) await page.mouse.click(caja.x + caja.width * fx, caja.y + caja.height * fy);
  await page.locator('.pixelart [data-accion="guardar"]').click();
  await seccion(page, 'personajes').nth(0).click();
  await elegir(page, 'retrato', 'Retrato creado 1');
  await expect(page.locator('.entrada-muestra')).toHaveCount(1);

  const [selector] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.inventario [data-accion="subir"]').click()]);
  await selector.setFiles({ name: 'guardian.png', mimeType: 'image/png', buffer: pngDePrueba() });
  await page.locator('.dialogo button[data-tipo="retrato"]').click();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha select[id$="-prueba"]').selectOption('original');
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await seccion(page, 'personajes').nth(1).click();
  await elegir(page, 'retrato', 'guardian');
  await expect(page.locator('.entrada-muestra')).toHaveCount(0);
  await pasarDeFase(page, 'El fondo');

  // ---- Fase 4: el fondo de la biblioteca se queda, con su ficha resuelta ----
  await seccion(page, 'elementos').filter({ hasText: 'Muelle de noche' }).click();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('amarillo');
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await pasarDeFase(page, 'Música y efectos');

  // ---- Fase 5: las fichas de la música y el efecto, y una pista más de la biblioteca ----
  await seccion(page, 'elementos').filter({ hasText: 'Fiesta en el muelle' }).click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await page.locator('.propiedades section.ficha').getByLabel('Acepto licenciar mi juego igual').check();
  await expect(page.locator('.propiedades .ficha-color')).toContainText('verde');
  await seccion(page, 'elementos').filter({ hasText: 'Puerta que cruje' }).click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await page.locator('[data-accion="biblioteca"]').click();
  await page.locator('.capa-biblioteca [data-filtro="musica"]').click();
  await page.locator('.biblioteca-pieza[data-pieza="bib_m03"] [data-accion="usar"]').click();
  await page.locator('.propiedades section.ficha').getByLabel('Leí la licencia').check();
  await seccion(page, 'escenas').nth(0).click();
  await elegir(page, 'musica', 'Persecución');
  await pasarDeFase(page, 'Una voz (opcional)');

  // ---- Fase 6: una voz grabada con micrófono falso, en el diálogo de Lucía ----
  await page.locator('[data-accion="crear-grabar"]').click();
  await page.locator('.dialogo button[data-tipo="voz"]').click();
  await page.locator('.grabador [data-accion="grabar"]').click();
  await page.waitForTimeout(1200);
  await page.locator('.grabador [data-accion="detener"]').click();
  await expect(page.locator('.grabador [data-accion="guardar"]')).toBeEnabled();
  await page.locator('.grabador [data-accion="guardar"]').click();
  await expect(page.locator('.grabador')).toHaveCount(0);
  await seccion(page, 'escenas').nth(0).click();
  await page.locator('[data-foco="texto:1"]').click();
  await elegir(page, 'voz', 'Grabación 1');
  await pasarDeFase(page, 'Destino y mapa');

  // ---- Fase 7: el mapa, todo en verde y sin muestra ----
  await page.locator('[data-accion="guia-mapa"]').click();
  await expect(page.locator('.mapa-tabla tbody tr')).toHaveCount(2 + 2 + 7);
  await expect(page.locator('.mapa-tabla tr.riesgo-muestra')).toHaveCount(0);
  await expect(page.locator('.mapa-resumen')).toHaveText('11 activos: 11 en verde, 0 en amarillo, 0 en rojo.');
  await page.locator('[data-accion="cerrar-mapa"]').click();
  await pasarDeFase(page, 'Publicar');

  // ---- Fase 8: publicar ----
  const publicar = page.locator('.barra button[data-accion="publicar"]');
  await expect(publicar).not.toHaveAttribute('aria-disabled', 'true');
  await page.locator('[data-accion="guia-publicar"]').click();
  await page.locator('.capa-publicar input[data-candidato="historia"]').check();
  await page.locator('.capa-publicar [data-decision="historia"] input[data-campo="prueba"]').fill('El guion guardado en la plataforma y en la copia descargada');
  await page.locator('.capa-publicar [data-accion="siguiente"]').click();
  await expect(page.locator('.publicar-resumen')).toContainText('entrega-camila-rojas-el-faro-de-camila.zip');
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.locator('.capa-publicar [data-accion="generar"]').click()]);
  const rutaZip = join(carpeta, descarga.suggestedFilename());
  await descarga.saveAs(rutaZip);
  await expect(page.locator('.banda-lista li.cumplida')).toHaveCount(1);

  // ---- El paquete ----
  const zip = await JSZip.loadAsync(await readFile(rutaZip));
  const proyecto = JSON.parse(await zip.file('proyecto.json').async('string'));
  expect(proyecto.guia).toEqual({ fase: 'publicar', jugado: true });
  expect(proyecto.juego.elementos.filter((e) => e.origen === 'muestra')).toHaveLength(0);
  writeFileSync(join(carpeta, 'juego.html'), await zip.file('juego.html').async('nodebuffer'));

  // ---- El juego exportado se juega hasta los créditos ----
  await page.goto(pathToFileURL(join(carpeta, 'juego.html')).href);
  await expect(page).toHaveTitle(TITULO);
  await expect(page.locator('.escenario-texto')).toHaveText(LINEAS.muelle[0]);
  await jugarHastaCreditos(page, page.locator('body'));
  await expect(page.locator('.escenario-creditos')).toContainText(`${ESTUDIANTE}: autor(a) del juego`);

  expect(errores, `errores de página: ${errores.join(' | ')}`).toEqual([]);
});
