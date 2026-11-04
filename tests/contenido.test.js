// tests/contenido.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { CODIGOS_ROJO, CODIGOS_AMARILLO, CODIGOS_NOTAS, evaluar } from '../plataforma/js/juridico/semaforo.js';
import { TIPOS_OBRA, crearFicha } from '../plataforma/js/juridico/ficha.js';
import { describir } from '../plataforma/js/juridico/textos.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const CAMPOS = ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino'];

const completa = (entrada, clave, conAccion = false) => {
  assert.ok(entrada, `falta la entrada ${clave}`);
  for (const campo of ['breve', 'completo', 'fuente']) assert.ok(entrada[campo]?.trim(), `${clave}.${campo} está vacío`);
  if (conAccion) assert.ok(entrada.accion?.trim(), `${clave}.accion está vacío`);
};

test('el contenido tiene nombre y aviso', () => {
  assert.ok(contenido.nombre.trim());
  assert.match(contenido.aviso, /educativo/i);
});

test('hay texto para cada campo de la ficha', () => {
  for (const campo of CAMPOS) completa(contenido.campos[campo], `campos.${campo}`);
});

test('hay texto para cada tipo de obra', () => {
  for (const codigo of Object.keys(TIPOS_OBRA)) completa(contenido.tiposObra[codigo], `tiposObra.${codigo}`);
});

test('hay texto y acción para cada regla, y texto para cada nota', () => {
  for (const codigo of [...CODIGOS_ROJO, ...CODIGOS_AMARILLO]) completa(contenido.reglas[codigo], `reglas.${codigo}`, true);
  for (const codigo of CODIGOS_NOTAS) completa(contenido.notas[codigo], `notas.${codigo}`);
});

test('las entradas pendientes de verificación están marcadas y se listan', () => {
  const pendientes = [];
  for (const [grupo, entradas] of Object.entries({ campos: contenido.campos, tiposObra: contenido.tiposObra, reglas: contenido.reglas, notas: contenido.notas })) {
    for (const [clave, entrada] of Object.entries(entradas)) {
      assert.ok(['verificada', 'pendiente'].includes(entrada.verificacion), `${grupo}.${clave}.verificacion debe ser verificada o pendiente`);
      if (entrada.verificacion === 'pendiente') pendientes.push(`${grupo}.${clave}`);
    }
  }
  console.log(`Entradas pendientes de verificación jurídica (${pendientes.length}): ${pendientes.join(', ')}`);
  assert.ok(pendientes.length > 0, 'el spec (sección 19) deja pendientes; si ya no hay, actualiza el spec');
});

test('describir agrega textos, fuente y acción con el nombre del autor', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: 'Camila', titular: 'otra_persona' };
  const resultado = evaluar(ficha, { destino: 'gratis' });
  const descrito = describir(resultado, ficha, contenido);
  assert.equal(descrito.color, 'rojo');
  assert.equal(descrito.razones[0].codigo, 'R02');
  assert.equal(descrito.razones[0].breve, contenido.reglas.R02.breve);
  assert.equal(descrito.razones[0].accion, 'Pide a Camila una cesión o una licencia por escrito.');
  assert.equal(descrito.razones[0].verificacion, 'verificada');
});

test('describir usa «esa persona» sin nombre y conserva las notas', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: '', titular: 'otra_persona' };
  const descrito = describir(evaluar(ficha, { destino: 'gratis' }), ficha, contenido);
  assert.equal(descrito.razones[0].accion, 'Pide a esa persona una cesión o una licencia por escrito.');
  const titulo = describir(evaluar(crearFicha('titulo'), { destino: 'gratis' }), crearFicha('titulo'), contenido);
  assert.equal(titulo.notas[0].codigo, 'N_TITULO');
  assert.equal(titulo.notas[0].breve, contenido.notas.N_TITULO.breve);
});

test('las fuentes dicen «por verificar» solo en las entradas pendientes', () => {
  for (const grupo of [contenido.campos, contenido.tiposObra, contenido.reglas, contenido.notas]) {
    for (const [clave, entrada] of Object.entries(grupo)) {
      const dice = /por verificar/i.test(entrada.fuente);
      assert.equal(dice, entrada.verificacion === 'pendiente', `${clave}: la fuente y la marca de verificación no coinciden`);
    }
  }
});

test('ningún texto hace las afirmaciones que el memo prohíbe', () => {
  const prohibido = /\bnula\b|gratuit|una sola obra|categoría autónoma|titular originario|se pueden ceder los morales/i;
  const textos = JSON.stringify(contenido);
  assert.ok(!prohibido.test(textos), `encontrado: ${textos.match(prohibido)?.[0]}`);
});

test('describir no falla con un código desconocido ni con una ficha ausente', () => {
  const d = describir({ color: 'amarillo', razones: ['A99'], notas: ['N_X'] }, null, contenido);
  assert.equal(d.razones[0].breve, 'A99');
  assert.equal(d.razones[0].verificacion, 'pendiente');
  assert.equal(d.notas[0].codigo, 'N_X');
});
