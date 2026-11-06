// tests/biblioteca-real.test.js
// El catálogo que de verdad lleva la plataforma: forma, mínimos, archivos y créditos en sincronía.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { validarCatalogo, faltantesDelMinimo, MINIMO_CATALOGO } from '../plataforma/js/biblioteca/catalogo.js';
import { medidasPng, cabeceraWav } from '../scripts/png-wav.js';
import { generarCreditos } from '../scripts/creditos-biblioteca.js';

const BIBLIOTECA = new URL('../plataforma/biblioteca/', import.meta.url);
const catalogo = JSON.parse(readFileSync(new URL('catalogo.json', BIBLIOTECA), 'utf8'));

test('el catálogo real está bien formado, cumple los mínimos y se declara provisional con honestidad', () => {
  assert.deepEqual(validarCatalogo(catalogo), []);
  assert.deepEqual(faltantesDelMinimo(catalogo), []);
  assert.equal(catalogo.provisional, true);
  assert.match(catalogo.nota, /provisional/i);
  for (const [tipo, minimo] of Object.entries(MINIMO_CATALOGO)) {
    assert.ok(catalogo.piezas.filter((p) => p.tipo === tipo).length >= minimo, `${tipo}: al menos ${minimo}`);
  }
  for (const p of catalogo.piezas) {
    if (p.licencia !== 'CC0') assert.ok(p.simulado, `${p.id} se presenta como ${p.licencia}: debe decir lo que es en realidad`);
    assert.ok(!/Ejemplo|Fulano|Autora de Prueba/.test(p.autor), 'no se inventan autores');
  }
});

test('cada archivo del catálogo existe y es una imagen o un audio con las medidas esperadas', () => {
  for (const p of catalogo.piezas) {
    const ruta = new URL(p.archivo, BIBLIOTECA);
    assert.ok(existsSync(ruta), `falta ${p.archivo}`);
    const bytes = readFileSync(ruta);
    if (p.tipo === 'fondo') assert.deepEqual(medidasPng(bytes), { ancho: 192, alto: 108 }, p.archivo);
    else if (p.tipo === 'retrato') assert.deepEqual(medidasPng(bytes), { ancho: 64, alto: 64 }, p.archivo);
    else {
      const cabecera = cabeceraWav(bytes);
      assert.equal(cabecera.canales, 1, p.archivo);
      assert.equal(cabecera.bits, 16, p.archivo);
      assert.ok(cabecera.muestras > 1000, `${p.archivo} está vacío`);
      assert.ok(bytes.length < 1024 * 1024, `${p.archivo} pesa más de 1 MB`);
    }
  }
});

test('CREDITOS.md sale del catálogo y LICENCIA-CURSO.md explica la licencia del curso', () => {
  const creditos = readFileSync(new URL('CREDITOS.md', BIBLIOTECA), 'utf8');
  assert.equal(creditos, generarCreditos(catalogo), 'CREDITOS.md está desactualizado: corre node scripts/creditos-biblioteca.js');
  assert.match(creditos, /## Lo que hay detrás de las piezas simuladas/);
  const licencia = readFileSync(new URL('LICENCIA-CURSO.md', BIBLIOTECA), 'utf8');
  assert.match(licencia, /dentro de la plataforma/);
  assert.match(licencia, /CC0/);
  assert.match(licencia, /R05/);
});
