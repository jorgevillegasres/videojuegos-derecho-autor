// tests/archivos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mimePorExtension, extensionPorMime, huellaSha256, crearSello, LIMITES } from '../plataforma/js/estado/archivos.js';

test('mimePorExtension reconoce los formatos del spec, sin importar mayúsculas', () => {
  assert.equal(mimePorExtension('fondo.png'), 'image/png');
  assert.equal(mimePorExtension('FOTO.JPG'), 'image/jpeg');
  assert.equal(mimePorExtension('a.jpeg'), 'image/jpeg');
  assert.equal(mimePorExtension('a.webp'), 'image/webp');
  assert.equal(mimePorExtension('tema.mp3'), 'audio/mpeg');
  assert.equal(mimePorExtension('tema.ogg'), 'audio/ogg');
  assert.equal(mimePorExtension('tema.wav'), 'audio/wav');
  assert.equal(mimePorExtension('voz.webm'), 'audio/webm');
  assert.equal(mimePorExtension('voz.m4a'), 'audio/mp4');
  assert.equal(mimePorExtension('raro.xyz'), 'application/octet-stream');
});

test('extensionPorMime ignora parámetros y devuelve una extensión por MIME', () => {
  assert.equal(extensionPorMime('audio/webm;codecs=opus'), 'webm');
  assert.equal(extensionPorMime('image/jpeg'), 'jpg');
  assert.equal(extensionPorMime('audio/mp4'), 'm4a');
  assert.equal(extensionPorMime('texto/raro'), 'bin');
});

test('huellaSha256 da el hash conocido de «hola»', async () => {
  const datos = new TextEncoder().encode('hola');
  assert.equal(await huellaSha256(datos), 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
  assert.equal(await huellaSha256(datos.buffer), 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79');
});

test('crearSello guarda fecha ISO y huella', async () => {
  const sello = await crearSello(new TextEncoder().encode('hola'), new Date('2026-11-04T20:10:00Z'));
  assert.deepEqual(sello, { fecha: '2026-11-04T20:10:00.000Z', huella: 'sha256:b221d9dbb083a7f33428d7c2a3c3198ae925614d70210e28716ccaa7cd4ddb79' });
});

test('los límites de tamaño son los del spec', () => {
  assert.equal(LIMITES.imagenBytes, 2 * 1024 * 1024);
  assert.equal(LIMITES.audioBytes, 5 * 1024 * 1024);
  assert.equal(LIMITES.avisoPaqueteBytes, 50 * 1024 * 1024);
});

test('alias image/jpg y espacios alrededor del nombre', () => {
  assert.equal(extensionPorMime('image/jpg'), 'jpg');
  assert.equal(mimePorExtension('a.PNG '), 'image/png');
});
