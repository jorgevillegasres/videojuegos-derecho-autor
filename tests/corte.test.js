// tests/corte.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { indiceCorte } from '../plataforma/js/estado/corte.js';
import { indiceCorte as desdeModelo, crearEscena, agregarLinea } from '../plataforma/js/estado/modelo.js';

test('indiceCorte vive en estado/corte.js y modelo.js lo reexporta', () => {
  assert.equal(desdeModelo, indiceCorte);
  const escena = crearEscena('x');
  assert.equal(indiceCorte(escena), -1);
  agregarLinea(escena, 'narracion', { texto: 'a' });
  agregarLinea(escena, 'decision', { texto: '¿?' });
  agregarLinea(escena, 'fin', { texto: 'fin' });
  assert.equal(indiceCorte(escena), 1);
});

test('el motor no importa el modelo (arrastraría fichas y licencias al juego exportado)', () => {
  for (const ruta of ['motor/partida.js', 'motor/pantalla.js', 'motor/reproductor.js', 'ui/dom.js', 'estado/corte.js']) {
    const codigo = readFileSync(new URL(`../plataforma/js/${ruta}`, import.meta.url), 'utf8');
    assert.ok(!/from '\.\.\/estado\/modelo\.js'|from '\.\/modelo\.js'/.test(codigo), `${ruta} importa modelo.js`);
    assert.ok(!/juridico\//.test(codigo), `${ruta} importa algo jurídico`);
  }
});
