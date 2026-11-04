// tests/ficha.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LICENCIAS, condicionesDe } from '../plataforma/js/juridico/licencias.js';
import { TIPOS_FICHA, TIPOS_OBRA, tipoObraPara, crearFicha } from '../plataforma/js/juridico/ficha.js';

test('el catálogo de licencias tiene los ocho códigos del spec más OTRA', () => {
  assert.deepEqual(Object.keys(LICENCIAS).sort(), [
    'CC-BY-4.0', 'CC-BY-NC-4.0', 'CC-BY-ND-4.0', 'CC-BY-SA-4.0', 'CC0', 'CURSO', 'DESCONOCIDO', 'DP', 'OTRA',
  ]);
  assert.deepEqual(LICENCIAS['CC-BY-NC-4.0'].condiciones, ['BY', 'NC']);
  assert.deepEqual(LICENCIAS.CC0.condiciones, []);
});

test('condicionesDe lee el código o, con OTRA, las condiciones escritas en la ficha', () => {
  assert.deepEqual(condicionesDe({ licencia: 'CC-BY-SA-4.0' }), ['BY', 'SA']);
  assert.deepEqual(condicionesDe({ licencia: 'OTRA', condicionesOtra: ['BY', 'ND'] }), ['BY', 'ND']);
  assert.deepEqual(condicionesDe({ licencia: 'OTRA' }), []);
  assert.deepEqual(condicionesDe({ licencia: null }), []);
  assert.deepEqual(condicionesDe({ licencia: 'INVENTADA' }), []);
});

test('cada tipo de ficha tiene un tipo de obra conocido', () => {
  assert.deepEqual(TIPOS_FICHA, ['titulo', 'historia', 'personaje', 'fondo', 'retrato', 'musica', 'efecto', 'voz']);
  for (const tipo of TIPOS_FICHA) {
    const codigo = tipoObraPara(tipo);
    assert.ok(TIPOS_OBRA[codigo], `${tipo} → ${codigo} debe existir en TIPOS_OBRA`);
  }
  assert.equal(tipoObraPara('historia'), 'literaria');
  assert.equal(tipoObraPara('retrato'), 'artistica');
  assert.equal(tipoObraPara('musica'), 'musical_fonograma');
  assert.equal(tipoObraPara('voz'), 'interpretacion');
  assert.equal(tipoObraPara('titulo'), 'titulo');
  assert.throws(() => tipoObraPara('mapa'), /Tipo de ficha inválido/);
});

test('una ficha creada dentro de la plataforma precarga autoría propia y sello', () => {
  const f = crearFicha('fondo', { origen: 'creado' });
  assert.equal(f.tipo, 'fondo');
  assert.equal(f.tipoObra, 'artistica');
  assert.equal(f.origen, 'creado');
  assert.equal(f.autoria, 'yo');
  assert.equal(f.titular, 'yo');
  assert.equal(f.respaldo, 'ninguno');
  assert.equal(f.licencia, null);
  assert.equal(f.prueba, 'sello');
  assert.equal(f.credito, '');
  assert.equal(f.licenciaLeida, false);
  assert.equal(f.reconoceSinDerechos, false);
});

test('una ficha subida no precarga prueba', () => {
  const f = crearFicha('musica', { origen: 'subido' });
  assert.equal(f.prueba, 'ninguna');
  assert.equal(f.autoria, 'yo');
});

test('una ficha de biblioteca precarga autor, licencia y crédito sugerido', () => {
  const entrada = { id: 'bib_f1', autor: 'Autora Ejemplo', licencia: 'CC-BY-4.0', creditoSugerido: '«Muelle» de Autora Ejemplo, CC BY 4.0' };
  const f = crearFicha('fondo', { origen: 'biblioteca', biblioteca: entrada });
  assert.equal(f.autoria, 'otra_persona');
  assert.equal(f.autorNombre, 'Autora Ejemplo');
  assert.equal(f.titular, 'otra_persona');
  assert.equal(f.respaldo, 'licencia');
  assert.equal(f.licencia, 'CC-BY-4.0');
  assert.equal(f.credito, '«Muelle» de Autora Ejemplo, CC BY 4.0');
  assert.equal(f.licenciaLeida, false);
  assert.equal(f.prueba, 'ninguna');
});

test('las fichas escritas (título, historia, personaje) tienen origen escrito', () => {
  assert.equal(crearFicha('titulo').origen, 'escrito');
  assert.equal(crearFicha('historia').origen, 'escrito');
  assert.equal(crearFicha('personaje').basadoEnObraAjena, false);
  assert.throws(() => crearFicha('fondo', { origen: 'robado' }), /Origen inválido/);
});
