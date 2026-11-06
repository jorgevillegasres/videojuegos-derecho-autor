// tests/secuencia.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearPatron, alternar, fijarTempo, esVacio, duracionSegundos, frecuenciaDe, renderizar, PASOS, INSTRUMENTOS, GRADOS, TEMPO } from '../plataforma/js/herramientas/secuencia.js';

test('crearPatron deja dos compases de ocho pasos vacíos para cuatro instrumentos', () => {
  const patron = crearPatron();
  assert.equal(patron.tempo, TEMPO.defecto);
  assert.deepEqual(Object.keys(patron.pasos), INSTRUMENTOS);
  for (const instrumento of INSTRUMENTOS) assert.equal(patron.pasos[instrumento].length, PASOS);
  assert.ok(esVacio(patron));
  assert.equal(PASOS, 16);
});

test('alternar recorre los grados en círculo, la percusión se enciende y apaga, y lo inválido se ignora', () => {
  const patron = crearPatron();
  alternar(patron, 'melodia', 3);
  assert.equal(patron.pasos.melodia[3], 1);
  for (let i = 0; i < GRADOS; i += 1) alternar(patron, 'melodia', 3);
  assert.equal(patron.pasos.melodia[3], 0, 'después del quinto grado vuelve al silencio');
  alternar(patron, 'bajo', 0, -1);
  assert.equal(patron.pasos.bajo[0], GRADOS, 'hacia atrás desde el silencio llega al último grado');
  alternar(patron, 'percusion', 15);
  assert.equal(patron.pasos.percusion[15], true);
  alternar(patron, 'percusion', 15);
  assert.equal(patron.pasos.percusion[15], false);
  alternar(patron, 'violin', 0);
  alternar(patron, 'bajo', 16);
  alternar(patron, 'bajo', -1);
  assert.deepEqual(patron.pasos.bajo.slice(1), Array(15).fill(0));
  assert.ok(!esVacio(patron));
});

test('fijarTempo acota entre 80 y 160 y vuelve al tempo por defecto si no es un número', () => {
  const patron = crearPatron();
  assert.equal(fijarTempo(patron, 300).tempo, 160);
  assert.equal(fijarTempo(patron, 10).tempo, 80);
  assert.equal(fijarTempo(patron, '120.4').tempo, 120);
  assert.equal(fijarTempo(patron, 'rápido').tempo, TEMPO.defecto);
  assert.ok(Math.abs(duracionSegundos(fijarTempo(patron, 120)) - 4) < 1e-9, 'a 120 los dos compases duran 4 segundos');
});

test('frecuenciaDe sigue la pentatónica mayor y sube de octava', () => {
  assert.ok(Math.abs(frecuenciaDe('melodia', 1) - 220) < 1e-9);
  assert.ok(Math.abs(frecuenciaDe('melodia', 2) - 220 * 2 ** (2 / 12)) < 1e-9);
  assert.ok(Math.abs(frecuenciaDe('melodia', 6) - 440) < 1e-9, 'el sexto grado es la base una octava arriba');
  assert.ok(frecuenciaDe('bajo', 1) < frecuenciaDe('acorde', 1) && frecuenciaDe('acorde', 1) < frecuenciaDe('melodia', 1));
});

test('renderizar produce las muestras justas, silencio con el patrón vacío, sonido con notas y siempre lo mismo', () => {
  const vacio = crearPatron(120);
  const silencio = renderizar(vacio, 22050);
  assert.equal(silencio.length, Math.round(0.25 * 22050) * 16, 'dieciséis pasos de un cuarto de segundo, cada uno redondeado a muestras enteras');
  assert.ok(silencio.every((v) => v === 0));
  const patron = crearPatron(120);
  alternar(patron, 'bajo', 0);
  alternar(patron, 'melodia', 4);
  alternar(patron, 'acorde', 8);
  alternar(patron, 'percusion', 12);
  const a = renderizar(patron, 22050);
  const b = renderizar(patron, 22050);
  assert.deepEqual(a, b, 'determinista');
  let pico = 0;
  for (const v of a) pico = Math.max(pico, Math.abs(v));
  assert.ok(pico > 0.1 && pico <= 1);
  const largoPaso = Math.round(22050 * 0.25);
  const energia = (desde, hasta) => { let s = 0; for (let i = desde; i < hasta; i += 1) s += Math.abs(a[i]); return s; };
  assert.ok(energia(0, largoPaso) > 0, 'el bajo suena en el primer paso');
  assert.equal(energia(largoPaso * 2, largoPaso * 4), 0, 'los pasos 3 y 4 están en silencio');
  assert.ok(energia(largoPaso * 12, largoPaso * 13) > 0, 'la percusión suena en el paso 13');
});
