// tests/pixelart.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { png, medidasPng } from '../scripts/png-wav.js';
import { crearPixelArt, HERRAMIENTAS, ZOOMS } from '../plataforma/js/herramientas/pixelart.js';

instalarDom();
const paleta = JSON.parse(readFileSync(new URL('../plataforma/contenido/paleta.json', import.meta.url), 'utf8')).colores;
const rojo = paleta.findIndex((c) => c.nombre === 'rojo');
const cielo = paleta.findIndex((c) => c.nombre === 'cielo');
const tick = () => new Promise((r) => setTimeout(r, 0));

function armar(extra = {}) {
  const codificadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearPixelArt(contenedor, {
    paleta,
    crearContexto: () => null,
    codificarPng: async (rgba, ancho, alto) => { codificadas.push({ rgba, ancho, alto }); return new Blob([png(ancho, alto, new Uint8Array(rgba.buffer))], { type: 'image/png' }); },
    decodificarPng: async () => { throw new Error('sin decodificador'); },
    ...extra,
  });
  const q = (s) => contenedor.querySelector(s);
  const canvas = () => q('canvas.pixel-lienzo');
  const zoomActual = () => Number(q('[data-accion="zoom"]').value);
  const puntero = (tipo, x, y) => canvas().dispatchEvent(new window.MouseEvent(tipo, { clientX: x * zoomActual(), clientY: y * zoomActual(), bubbles: true }));
  const pixel = (rgba, ancho, x, y) => [...rgba.slice((y * ancho + x) * 4, (y * ancho + x) * 4 + 4)];
  return { contenedor, herramienta, codificadas, q, canvas, puntero, pixel };
}

test('abrir muestra el lienzo del tamaño del tipo, los dieciséis colores y las cuatro herramientas', async () => {
  const { contenedor, herramienta, q, canvas } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  assert.equal(contenedor.hidden, false);
  assert.equal(q('#pixelart-titulo').textContent, 'Pixel art: retrato');
  assert.equal(canvas().width, 64 * 6);
  assert.equal(canvas().height, 64 * 6);
  assert.equal(contenedor.querySelectorAll('.pixel-color').length, 16);
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, '0');
  assert.deepEqual([...contenedor.querySelectorAll('[data-herramienta]')].map((b) => b.textContent), Object.values(HERRAMIENTAS));
  assert.equal(q('[data-herramienta="lapiz"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-accion="deshacer"]').disabled, true);
  assert.equal(document.activeElement, canvas());
  assert.deepEqual(ZOOMS, [2, 4, 6, 8]);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.equal(contenedor.hidden, true);
  const fondo = herramienta.abrir({ tipo: 'fondo' });
  await tick();
  assert.equal(canvas().width, 192 * 4);
  assert.equal(q('#pixelart-titulo').textContent, 'Pixel art: fondo');
  teclear(q('.pixelart'), 'Escape');
  assert.equal(await fondo, null);
});

test('el lápiz pinta con el color elegido, deshacer y rehacer funcionan y guardar entrega el PNG', async () => {
  const { herramienta, codificadas, q, puntero, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  puntero('pointerdown', 3, 4);
  puntero('pointerup', 3, 4);
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, String(rojo));
  puntero('pointerdown', 10, 10);
  puntero('pointerup', 10, 10);
  assert.equal(q('[data-accion="deshacer"]').disabled, false);
  clic(q('[data-accion="deshacer"]'));
  assert.equal(q('[data-accion="rehacer"]').disabled, false);
  clic(q('[data-accion="rehacer"]'));
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'image/png');
  assert.deepEqual(medidasPng(new Uint8Array(await blob.arrayBuffer())), { ancho: 64, alto: 64 });
  const { rgba } = codificadas[0];
  assert.deepEqual(pixel(rgba, 64, 3, 4), [27, 31, 42, 255], 'noche (color 0)');
  assert.deepEqual(pixel(rgba, 64, 10, 10), [201, 42, 42, 255], 'rojo');
  assert.deepEqual(pixel(rgba, 64, 0, 0), [0, 0, 0, 0], 'transparente');
});

test('arrastrar pinta una línea sin huecos; el borrador borra; el relleno llena; el cuentagotas toma el color', async () => {
  const { herramienta, codificadas, q, puntero, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  clic(q(`.pixel-color[data-color="${cielo}"]`));
  puntero('pointerdown', 0, 0);
  puntero('pointermove', 5, 0);
  puntero('pointerup', 5, 0);
  clic(q('[data-herramienta="borrador"]'));
  assert.equal(q('[data-herramienta="borrador"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-herramienta="lapiz"]').getAttribute('aria-pressed'), 'false');
  puntero('pointerdown', 2, 0);
  puntero('pointerup', 2, 0);
  clic(q('[data-herramienta="cuentagotas"]'));
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  puntero('pointerdown', 1, 0);
  puntero('pointerup', 1, 0);
  assert.equal(q('.pixel-color[aria-pressed="true"]').dataset.color, String(cielo), 'el cuentagotas tomó el cielo');
  clic(q('[data-herramienta="relleno"]'));
  clic(q(`.pixel-color[data-color="${rojo}"]`));
  puntero('pointerdown', 30, 30);
  puntero('pointerup', 30, 30);
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  const { rgba } = codificadas[0];
  for (const x of [0, 1, 3, 4, 5]) assert.deepEqual(pixel(rgba, 64, x, 0), [76, 201, 240, 255], `celda ${x} celeste`);
  assert.deepEqual(pixel(rgba, 64, 2, 0), [201, 42, 42, 255], 'la celda borrada la llenó el relleno rojo');
  assert.deepEqual(pixel(rgba, 64, 30, 30), [201, 42, 42, 255]);
  assert.deepEqual(pixel(rgba, 64, 0, 1), [201, 42, 42, 255], 'el relleno cubre todo lo transparente conectado');
});

test('con el teclado las flechas mueven el cursor y Enter pinta; Escape cancela', async () => {
  const { contenedor, herramienta, codificadas, q, canvas, pixel } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  teclear(canvas(), 'ArrowLeft');
  teclear(canvas(), 'ArrowUp');
  teclear(canvas(), 'Enter');
  assert.equal(q('[data-accion="deshacer"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  assert.deepEqual(pixel(codificadas[0].rgba, 64, 31, 31), [27, 31, 42, 255], 'desde el centro (32, 32), una a la izquierda y una arriba');
  const segunda = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  teclear(q('.pixelart'), 'Escape');
  assert.equal(await segunda, null);
  assert.equal(contenedor.childNodes.length, 0);
});

test('reabrir con un archivo carga sus píxeles aproximados a la paleta; si no se puede leer, empieza en blanco', async () => {
  const rgba = new Uint8ClampedArray(64 * 64 * 4);
  rgba.set([250, 40, 40, 255], (5 * 64 + 7) * 4);
  rgba.set([70, 200, 240, 255], (6 * 64 + 7) * 4);
  const { herramienta, codificadas, q } = armar({ decodificarPng: async (archivo, ancho, alto) => { assert.equal(ancho, 64); assert.equal(alto, 64); assert.equal(archivo.tipo, 'image/png'); return rgba; } });
  const pendiente = herramienta.abrir({ tipo: 'retrato', archivo: { tipo: 'image/png', datos: new ArrayBuffer(4) } });
  await tick();
  clic(q('[data-accion="guardar"]'));
  await pendiente;
  const salida = codificadas[0].rgba;
  assert.deepEqual([...salida.slice((5 * 64 + 7) * 4, (5 * 64 + 7) * 4 + 4)], [201, 42, 42, 255], 'casi rojo → rojo de la paleta');
  assert.deepEqual([...salida.slice((6 * 64 + 7) * 4, (6 * 64 + 7) * 4 + 4)], [76, 201, 240, 255], 'casi celeste → cielo');
  const roto = armar();
  const otra = roto.herramienta.abrir({ tipo: 'retrato', archivo: { tipo: 'image/png', datos: new ArrayBuffer(1) } });
  await tick();
  clic(roto.q('[data-accion="guardar"]'));
  await otra;
  assert.ok(roto.codificadas[0].rgba.every((v) => v === 0), 'en blanco');
});

test('un trazo que no cambia nada no apila historial; el zoom cambia el tamaño del canvas', async () => {
  const { herramienta, q, canvas, puntero } = armar();
  const pendiente = herramienta.abrir({ tipo: 'retrato' });
  await tick();
  puntero('pointerdown', 1, 1);
  puntero('pointerup', 1, 1);
  puntero('pointerdown', 1, 1);
  puntero('pointerup', 1, 1);
  clic(q('[data-accion="deshacer"]'));
  assert.equal(q('[data-accion="deshacer"]').disabled, true, 'solo había un paso real');
  escribir(q('[data-accion="zoom"]'), '8');
  assert.equal(canvas().width, 64 * 8);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
});
