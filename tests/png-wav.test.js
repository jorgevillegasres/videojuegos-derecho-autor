// tests/png-wav.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { inflateSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { png, wav, lienzo, medidasPng, cabeceraWav } from '../scripts/png-wav.js';

test('png escribe un PNG RGBA válido: firma, IHDR y píxeles recuperables', () => {
  const l = lienzo(3, 2);
  l.relleno([10, 20, 30]);
  l.pinta(2, 1, [200, 100, 50, 128]);
  const bytes = png(3, 2, l.rgba);
  assert.deepEqual(medidasPng(bytes), { ancho: 3, alto: 2 });
  assert.equal(bytes.subarray(12, 16).toString('latin1'), 'IHDR');
  assert.equal(bytes[24], 8, '8 bits');
  assert.equal(bytes[25], 6, 'RGBA');
  const largoIdat = bytes.readUInt32BE(33);
  assert.equal(bytes.subarray(37, 41).toString('latin1'), 'IDAT');
  const filas = inflateSync(bytes.subarray(41, 41 + largoIdat));
  assert.equal(filas.length, (3 * 4 + 1) * 2);
  assert.equal(filas[0], 0, 'filtro ninguno');
  assert.deepEqual([...filas.subarray(1, 5)], [10, 20, 30, 255]);
  assert.deepEqual([...filas.subarray(13 + 9, 13 + 13)], [200, 100, 50, 128], 'último píxel de la segunda fila');
  assert.equal(bytes.subarray(bytes.length - 8, bytes.length - 4).toString('latin1'), 'IEND');
  assert.throws(() => png(2, 2, new Uint8Array(3)), /Se esperaban 16 bytes/);
});

test('wav escribe PCM 16 bits mono con la cabecera correcta y recorta lo que se sale', () => {
  const muestras = new Float32Array([0, 0.5, -0.5, 1.5, -1.5]);
  const bytes = wav(muestras, 22050);
  assert.deepEqual(cabeceraWav(bytes), { canales: 1, frecuencia: 22050, bits: 16, muestras: 5 });
  assert.equal(bytes.length, 44 + 10);
  assert.equal(bytes.readInt16LE(44), 0);
  assert.equal(bytes.readInt16LE(46), Math.round(0.5 * 32767));
  assert.equal(bytes.readInt16LE(48), Math.round(-0.5 * 32767));
  assert.equal(bytes.readInt16LE(50), 32767, 'recortado a 1');
  assert.equal(bytes.readInt16LE(52), -32767, 'recortado a -1');
});

test('el lienzo dibuja rectángulos, círculos y degradados tramados dentro de los bordes', () => {
  const l = lienzo(8, 8);
  l.rect(-2, -2, 4, 4, [1, 1, 1]);
  l.degradado(4, 8, [3, 3, 3], [4, 4, 4]);
  l.circulo(6, 6, 2, [2, 2, 2]);
  const en = (x, y) => l.rgba[(y * 8 + x) * 4];
  assert.equal(en(0, 0), 1);
  assert.equal(en(2, 2), 0, 'fuera del rectángulo recortado');
  assert.equal(en(6, 6), 2);
  assert.equal(en(4, 6), 2, 'borde del círculo');
  assert.ok([3, 4].includes(en(0, 5)));
  assert.equal(en(0, 7), 4, 'al final del degradado domina el color de abajo');
});

test('la paleta tiene dieciséis colores con nombre y hexadecimal distintos', () => {
  const paleta = JSON.parse(readFileSync(new URL('../plataforma/contenido/paleta.json', import.meta.url), 'utf8'));
  assert.equal(paleta.colores.length, 16);
  const hex = paleta.colores.map((c) => c.hex);
  assert.equal(new Set(hex).size, 16);
  for (const c of paleta.colores) {
    assert.match(c.hex, /^#[0-9a-f]{6}$/);
    assert.ok(c.nombre.trim());
  }
  assert.equal(new Set(paleta.colores.map((c) => c.nombre)).size, 16);
});
