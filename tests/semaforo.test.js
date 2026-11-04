// tests/semaforo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar, CODIGOS_ROJO, CODIGOS_AMARILLO } from '../plataforma/js/juridico/semaforo.js';

const casos = JSON.parse(readFileSync(new URL('./semaforo.casos.json', import.meta.url), 'utf8'));

for (const caso of casos) {
  test(`semáforo: ${caso.nombre}`, () => {
    const ficha = { ...crearFicha(caso.base.tipo, { origen: caso.base.origen ?? 'escrito', biblioteca: caso.base.biblioteca ?? null }), ...caso.ficha };
    const resultado = evaluar(ficha, caso.contexto ?? { destino: 'gratis' });
    assert.equal(resultado.color, caso.esperado.color, `color de «${caso.nombre}»`);
    assert.deepEqual(resultado.razones, caso.esperado.razones, `razones de «${caso.nombre}»`);
    assert.deepEqual(resultado.notas, caso.esperado.notas ?? [], `notas de «${caso.nombre}»`);
  });
}

test('la tabla de casos cubre todas las reglas rojas y amarillas', () => {
  const vistos = new Set(casos.flatMap((c) => c.esperado.razones));
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) assert.ok(vistos.has(codigo), `ningún caso dispara ${codigo}`);
});
