// tests/capacidades.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comprobar, NAVEGADORES } from '../plataforma/js/ui/capacidades.js';

const completa = () => ({ indexedDB: {}, crypto: { subtle: {} }, URL: { createObjectURL: () => 'blob:' }, Blob: class {}, JSZip: class {} });

test('con todo lo necesario la comprobación pasa', () => {
  assert.deepEqual(comprobar(completa()), { ok: true, faltantes: [] });
  assert.match(NAVEGADORES, /Chrome/);
});

test('enumera lo que falta con un texto para el estudiante', () => {
  const ventana = completa();
  delete ventana.indexedDB;
  delete ventana.JSZip;
  ventana.crypto = {};
  const resultado = comprobar(ventana);
  assert.equal(resultado.ok, false);
  assert.deepEqual(resultado.faltantes, [
    'guardar en el navegador (IndexedDB)',
    'calcular huellas (Web Crypto; hace falta HTTPS o localhost)',
    'comprimir copias (JSZip no cargó)',
  ]);
});
