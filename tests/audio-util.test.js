// tests/audio-util.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cabeceraWav } from '../scripts/png-wav.js';
import { mezclarAMono, remuestrear, codificarWav, formaDeOnda, recortar, elegirFormato, FORMATOS_GRABACION } from '../plataforma/js/herramientas/audio-util.js';

test('mezclarAMono promedia los canales y con ninguno devuelve vacío', () => {
  const mono = mezclarAMono([new Float32Array([1, 0, -1]), new Float32Array([0, 0, 1])]);
  assert.deepEqual([...mono], [0.5, 0, 0]);
  assert.equal(mezclarAMono([]).length, 0);
});

test('remuestrear conserva la duración y los extremos', () => {
  const original = new Float32Array([0, 1, 0, -1]);
  const doble = remuestrear(original, 4, 8);
  assert.equal(doble.length, 8);
  assert.equal(doble[0], 0);
  assert.equal(doble[2], 1);
  assert.ok(Math.abs(doble[1] - 0.5) < 1e-6, 'punto medio interpolado');
  assert.equal(remuestrear(original, 4, 4), original, 'sin cambio devuelve la misma');
  assert.equal(remuestrear(new Float32Array(44100), 44100, 22050).length, 22050);
});

test('codificarWav escribe PCM 16 bits mono con cabecera y recorte', () => {
  const bytes = codificarWav(new Float32Array([0, 0.5, 2, -2]), 22050);
  assert.equal(bytes.byteLength, 44 + 8);
  assert.deepEqual(cabeceraWav(new Uint8Array(bytes)), { canales: 1, frecuencia: 22050, bits: 16, muestras: 4 });
  const vista = new DataView(bytes);
  assert.equal(vista.getInt16(44, true), 0);
  assert.equal(vista.getInt16(46, true), Math.round(0.5 * 32767));
  assert.equal(vista.getInt16(48, true), 32767);
  assert.equal(vista.getInt16(50, true), -32767);
});

test('formaDeOnda da el pico de cada columna', () => {
  const picos = formaDeOnda(new Float32Array([0.1, -0.9, 0.2, 0.3, 0, 0]), 3);
  assert.deepEqual([...picos].map((v) => Number(v.toFixed(2))), [0.9, 0.3, 0]);
  assert.deepEqual([...formaDeOnda(new Float32Array(0), 4)], [0, 0, 0, 0]);
  assert.equal(formaDeOnda(new Float32Array([1, 1]), 8).length, 8, 'más columnas que muestras no rompe');
});

test('recortar respeta los bordes y devuelve una copia', () => {
  const muestras = new Float32Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const medio = recortar(muestras, 10, 0.2, 0.5);
  assert.deepEqual([...medio], [2, 3, 4]);
  medio[0] = 99;
  assert.equal(muestras[2], 2, 'no toca el original');
  assert.deepEqual([...recortar(muestras, 10, -1, 99)], [...muestras]);
  assert.equal(recortar(muestras, 10, 0.8, 0.3).length, 0, 'fin antes del inicio: vacío');
});

test('elegirFormato prefiere WebM/Opus, cae a MP4 y devuelve vacío si nada se soporta', () => {
  assert.equal(elegirFormato(() => true), 'audio/webm;codecs=opus');
  assert.equal(elegirFormato((f) => f.startsWith('audio/mp4')), 'audio/mp4;codecs=mp4a.40.2');
  assert.equal(elegirFormato(() => false), '');
  assert.equal(elegirFormato(() => { throw new Error('sin MediaRecorder'); }), '');
  assert.equal(FORMATOS_GRABACION.length, 4);
});
