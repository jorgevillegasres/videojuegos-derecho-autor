// tests/semaforo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { evaluar, CODIGOS_ROJO, CODIGOS_AMARILLO, CODIGOS_NOTAS } from '../plataforma/js/juridico/semaforo.js';

const casos = JSON.parse(readFileSync(new URL('./semaforo.casos.json', import.meta.url), 'utf8'));

for (const caso of casos) {
  test(`semáforo: ${caso.nombre}`, () => {
    const ficha = Object.freeze({ ...crearFicha(caso.base.tipo, { origen: caso.base.origen ?? 'escrito', biblioteca: caso.base.biblioteca ?? null }), ...caso.ficha });
    const resultado = evaluar(ficha, caso.contexto ?? { destino: 'gratis' });
    assert.equal(resultado.color, caso.esperado.color, `color de «${caso.nombre}»`);
    assert.deepEqual(resultado.razones, caso.esperado.razones, `razones de «${caso.nombre}»`);
    assert.deepEqual(resultado.notas, caso.esperado.notas ?? [], `notas de «${caso.nombre}»`);
  });
}

test('la tabla de casos cubre todas las reglas y todas las notas', () => {
  const vistos = new Set(casos.flatMap((c) => c.esperado.razones));
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) assert.ok(vistos.has(codigo), `ningún caso dispara ${codigo}`);
  const notasVistas = new Set(casos.flatMap((c) => c.esperado.notas ?? []));
  for (const codigo of CODIGOS_NOTAS) assert.ok(notasVistas.has(codigo), `ningún caso produce la nota ${codigo}`);
});

test('los códigos esperados existen y los nombres de los casos son honestos', () => {
  const conocidos = new Set([...CODIGOS_ROJO, ...CODIGOS_AMARILLO]);
  for (const caso of casos) {
    for (const codigo of caso.esperado.razones) assert.ok(conocidos.has(codigo), `${caso.nombre}: código desconocido ${codigo}`);
    for (const codigo of caso.nombre.match(/\b[RA]\d\d\b/g) ?? []) {
      assert.ok(caso.esperado.razones.includes(codigo), `${caso.nombre}: el nombre menciona ${codigo} pero no está en lo esperado`);
    }
  }
});

test('un destino desconocido es un error, no un verde silencioso', () => {
  assert.throws(() => evaluar(crearFicha('fondo', { origen: 'creado' }), { destino: 'ventas' }), /Destino inválido/);
  assert.throws(() => evaluar(crearFicha('fondo', { origen: 'creado' }), {}), /Destino inválido/);
});
