// tests/pixel.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TAMANOS, TRANSPARENTE, crearLienzo, pintar, borrar, rellenar, tomar, linea, crearHistorial, aRgba, desdeRgba, hexARgb } from '../plataforma/js/herramientas/pixel.js';

const PALETA = ['#000000', '#ff0000', '#00ff00', '#0000ff'];

test('el lienzo nace transparente y el lápiz, el borrador y el cuentagotas trabajan por celda', () => {
  const l = crearLienzo(4, 3);
  assert.equal(l.celdas.length, 12);
  assert.ok(l.celdas.every((c) => c === TRANSPARENTE));
  assert.equal(pintar(l, 1, 2, 2), true);
  assert.equal(tomar(l, 1, 2), 2);
  assert.equal(pintar(l, 1, 2, 2), false, 'pintar lo mismo no cambia nada');
  assert.equal(pintar(l, 9, 9, 1), false, 'fuera del lienzo no pinta');
  assert.equal(pintar(l, 1.5, 0, 1), false, 'solo celdas enteras');
  assert.equal(tomar(l, -1, 0), TRANSPARENTE);
  assert.equal(borrar(l, 1, 2), true);
  assert.equal(tomar(l, 1, 2), TRANSPARENTE);
  assert.deepEqual(TAMANOS, { retrato: { ancho: 64, alto: 64 }, fondo: { ancho: 192, alto: 108 } });
  assert.deepEqual(hexARgb('#ff8000'), [255, 128, 0]);
});

test('rellenar cubre la zona contigua del mismo color sin cruzar otros colores', () => {
  const l = crearLienzo(5, 5);
  for (let y = 0; y < 5; y += 1) pintar(l, 2, y, 1); // una pared vertical roja
  assert.equal(rellenar(l, 0, 0, 3), true);
  assert.equal(tomar(l, 1, 4), 3, 'todo el lado izquierdo');
  assert.equal(tomar(l, 3, 0), TRANSPARENTE, 'el lado derecho no');
  assert.equal(tomar(l, 2, 2), 1, 'la pared sigue');
  assert.equal(rellenar(l, 0, 0, 3), false, 'rellenar con el mismo color no cambia nada');
  assert.equal(rellenar(l, 7, 7, 3), false);
});

test('linea une dos celdas sin huecos, en diagonal y hacia atrás', () => {
  const l = crearLienzo(8, 8);
  assert.equal(linea(l, 0, 0, 7, 3, 1), true);
  for (let x = 0; x < 8; x += 1) assert.ok([0, 1, 2, 3].some((y) => tomar(l, x, y) === 1), `columna ${x} pintada`);
  const l2 = crearLienzo(8, 8);
  linea(l2, 7, 7, 0, 0, 2);
  assert.equal(tomar(l2, 0, 0), 2);
  assert.equal(tomar(l2, 7, 7), 2);
  assert.equal(tomar(l2, 4, 4), 2);
  assert.equal(linea(l2, 0, 0, 0, 0, 2), false, 'un punto ya pintado no cambia');
});

test('el historial deshace y rehace hasta veinte pasos y olvida un registro vacío', () => {
  const l = crearLienzo(2, 2);
  const h = crearHistorial(l, 3);
  assert.equal(h.puedeDeshacer, false);
  h.registrar(); pintar(l, 0, 0, 1);
  h.registrar(); pintar(l, 1, 0, 2);
  h.registrar(); pintar(l, 0, 1, 3);
  h.registrar(); pintar(l, 1, 1, 1);
  assert.ok(h.deshacer());
  assert.equal(tomar(l, 1, 1), TRANSPARENTE);
  assert.ok(h.puedeRehacer);
  assert.ok(h.rehacer());
  assert.equal(tomar(l, 1, 1), 1);
  assert.ok(h.deshacer() && h.deshacer() && h.deshacer());
  assert.equal(h.deshacer(), false, 'el límite de tres dejó fuera el primer paso');
  assert.equal(tomar(l, 0, 0), 1, 'el primer trazo ya no se puede deshacer');
  h.registrar();
  h.olvidar();
  assert.equal(h.puedeDeshacer, false, 'un registro sin trazo se descarta');
  assert.equal(h.puedeRehacer, false, 'registrar borra lo rehacible');
  const grande = crearLienzo(1, 1);
  const hg = crearHistorial(grande);
  for (let i = 0; i < 25; i += 1) { hg.registrar(); pintar(grande, 0, 0, i % 4); }
  let pasos = 0;
  while (hg.deshacer()) pasos += 1;
  assert.equal(pasos, 20);
});

test('aRgba y desdeRgba van y vuelven: colores exactos, aproximados al más cercano y transparencia', () => {
  const l = crearLienzo(2, 2);
  pintar(l, 0, 0, 1);
  pintar(l, 1, 1, 3);
  const rgba = aRgba(l, PALETA);
  assert.deepEqual([...rgba.slice(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual([...rgba.slice(4, 8)], [0, 0, 0, 0], 'transparente');
  assert.deepEqual([...rgba.slice(12, 16)], [0, 0, 255, 255]);
  const vuelta = desdeRgba(rgba, 2, 2, PALETA);
  assert.deepEqual([...vuelta.celdas], [...l.celdas]);
  const aproximado = desdeRgba(new Uint8ClampedArray([250, 10, 10, 255, 20, 20, 20, 255, 0, 200, 0, 100, 0, 0, 0, 0]), 2, 2, PALETA);
  assert.deepEqual([...aproximado.celdas], [1, 0, TRANSPARENTE, TRANSPARENTE], 'casi rojo → rojo; casi negro → negro; alfa baja → transparente');
});
