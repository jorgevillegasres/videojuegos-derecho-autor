// tests/generar-ejemplo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { retratos } from '../scripts/generar-ejemplo.js';
import { medidasPng } from '../scripts/png-wav.js';

test('los retratos de muestra son PNG de 64×64, deterministas e iguales a los guardados en plataforma/ejemplo', () => {
  const generados = retratos();
  assert.deepEqual(Object.keys(generados), ['retrato-ana.png', 'retrato-farero.png']);
  for (const [nombre, bytes] of Object.entries(generados)) {
    assert.deepEqual(medidasPng(bytes), { ancho: 64, alto: 64 });
    assert.deepEqual(bytes, retratos()[nombre], 'la misma ejecución da los mismos bytes');
    assert.deepEqual(bytes, readFileSync(new URL(`../plataforma/ejemplo/${nombre}`, import.meta.url)), `${nombre}: correr node scripts/generar-ejemplo.js`);
  }
});
