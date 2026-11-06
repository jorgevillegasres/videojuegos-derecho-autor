// tests/formulario.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearFicha } from '../plataforma/js/juridico/ficha.js';
import { visibles, aplicarCambio, ETIQUETAS, PREGUNTAS, LICENCIAS_ELEGIBLES } from '../plataforma/js/juridico/formulario.js';

const ocultos = (v) => Object.entries(v).filter(([k, valor]) => k !== 'soloLectura' && valor === false).map(([k]) => k);
const mostrados = (v) => Object.entries(v).filter(([k, valor]) => k !== 'soloLectura' && valor === true).map(([k]) => k);

test('la ficha del título no muestra ningún campo editable', () => {
  const v = visibles(crearFicha('titulo'));
  assert.deepEqual(mostrados(v), []);
  assert.deepEqual(v.soloLectura, []);
});

test('una ficha nueva hecha por mí muestra autoría, titular, obra ajena, crédito y prueba, y oculta el respaldo', () => {
  const v = visibles(crearFicha('fondo', { origen: 'creado' }));
  assert.deepEqual(mostrados(v), ['autoria', 'basadoEnObraAjena', 'titular', 'credito', 'prueba']);
  assert.ok(ocultos(v).includes('respaldo'));
});

test('otra persona con licencia «otra» y compartir igual abre nombre, respaldo, licencia, texto, condiciones y casillas', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', titular: 'otra_persona', respaldo: 'licencia', licencia: 'OTRA', condicionesOtra: ['BY', 'SA'] };
  const v = visibles(ficha);
  assert.deepEqual(mostrados(v), ['autoria', 'autorNombre', 'basadoEnObraAjena', 'titular', 'respaldo', 'licencia', 'licenciaTexto', 'condicionesOtra', 'licenciaLeida', 'aceptaCompartirIgual', 'modificado', 'credito', 'prueba']);
  ficha.licencia = 'CC-BY-4.0';
  assert.ok(!visibles(ficha).aceptaCompartirIgual, 'sin SA no se pide compartir igual');
  assert.ok(!visibles(ficha).licenciaTexto);
  ficha.basadoEnObraAjena = true;
  assert.ok(visibles(ficha).autorizacionDerivada);
  const ia = { ...crearFicha('musica', { origen: 'subido' }), autoria: 'ia' };
  assert.ok(visibles(ia).herramientaIA);
  assert.ok(visibles(ia).reconoceSinDerechos);
  assert.ok(!visibles(ia).aporteHumano);
  assert.ok(visibles(ia).respaldo, 'con IA el titular sigue siendo yo pero la autoría no: el respaldo se muestra');
  const conAporte = { ...ia, autoria: 'ia_con_aporte' };
  assert.ok(visibles(conAporte).aporteHumano);
  assert.ok(!visibles(conAporte).reconoceSinDerechos);
});

test('una ficha de biblioteca deja de solo lectura lo que viene del catálogo y ofrece «lo modifiqué»', () => {
  const ficha = crearFicha('musica', { origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-ND-4.0', creditoSugerido: 'Tema, CC BY-ND' } });
  const v = visibles(ficha);
  assert.deepEqual(v.soloLectura, ['autoria', 'autorNombre', 'titular', 'respaldo', 'licencia']);
  assert.ok(v.modificado);
  assert.ok(v.licenciaLeida);
  assert.ok(!v.aceptaCompartirIgual);
  assert.equal(aplicarCambio(ficha, 'autoria', 'yo').autoria, 'otra_persona', 'no se cambia lo que viene del catálogo');
  assert.equal(aplicarCambio(ficha, 'modificado', true).modificado, true);
});

test('aplicarCambio limpia lo que deja de aplicar', () => {
  const ficha = { ...crearFicha('retrato', { origen: 'subido' }), autoria: 'otra_persona', autorNombre: 'Camila', titular: 'otra_persona', respaldo: 'licencia', licencia: 'CC-BY-SA-4.0', licenciaLeida: true, aceptaCompartirIgual: true, modificado: true };
  aplicarCambio(ficha, 'licencia', 'OTRA');
  assert.equal(ficha.licenciaLeida, false, 'otra licencia: hay que volver a leerla');
  assert.equal(ficha.aceptaCompartirIgual, false);
  aplicarCambio(ficha, 'licenciaTexto', 'Permiso del colectivo');
  aplicarCambio(ficha, 'condicionesOtra', ['BY', 'XX']);
  assert.deepEqual(ficha.condicionesOtra, ['BY'], 'solo condiciones conocidas');
  aplicarCambio(ficha, 'licencia', 'CC-BY-4.0');
  assert.equal(ficha.licenciaTexto, '');
  assert.deepEqual(ficha.condicionesOtra, []);
  aplicarCambio(ficha, 'respaldo', 'cesion');
  assert.equal(ficha.licencia, null);
  assert.equal(ficha.modificado, false);
  aplicarCambio(ficha, 'autoria', 'ia');
  assert.equal(ficha.autorNombre, '', 'ya no es otra persona');
  aplicarCambio(ficha, 'herramientaIA', 'Generador X');
  aplicarCambio(ficha, 'reconoceSinDerechos', true);
  aplicarCambio(ficha, 'autoria', 'yo');
  assert.equal(ficha.herramientaIA, '');
  assert.equal(ficha.reconoceSinDerechos, false);
  assert.equal(ficha.respaldo, 'cesion', 'el titular sigue siendo otra persona: el respaldo se conserva');
  aplicarCambio(ficha, 'titular', 'yo');
  assert.equal(ficha.respaldo, 'ninguno', 'yo y yo: el respaldo se oculta y se limpia');
  aplicarCambio(ficha, 'basadoEnObraAjena', true);
  aplicarCambio(ficha, 'autorizacionDerivada', true);
  aplicarCambio(ficha, 'basadoEnObraAjena', false);
  assert.equal(ficha.autorizacionDerivada, false);
});

test('aplicarCambio ignora valores inválidos, campos fijos y la ficha del título', () => {
  const ficha = crearFicha('fondo', { origen: 'creado' });
  aplicarCambio(ficha, 'autoria', 'nadie');
  assert.equal(ficha.autoria, 'yo');
  aplicarCambio(ficha, 'prueba', 'sello_falso');
  assert.equal(ficha.prueba, 'sello');
  aplicarCambio(ficha, 'tipoObra', 'literaria');
  assert.equal(ficha.tipoObra, 'artistica');
  aplicarCambio(ficha, 'licenciaLeida', 'sí');
  assert.equal(ficha.licenciaLeida, false, 'una casilla solo acepta sí o no');
  aplicarCambio(ficha, 'credito', 7);
  assert.equal(ficha.credito, '', 'un texto solo acepta texto');
  const titulo = crearFicha('titulo');
  aplicarCambio(titulo, 'credito', 'x');
  assert.equal(titulo.credito, '');
  assert.deepEqual(Object.keys(ETIQUETAS), ['autoria', 'titular', 'respaldo', 'prueba', 'condiciones']);
  assert.deepEqual(Object.keys(PREGUNTAS), ['tipoObra', 'autoria', 'titular', 'respaldo', 'credito', 'prueba']);
  assert.ok(LICENCIAS_ELEGIBLES.includes('OTRA'));
  assert.ok(LICENCIAS_ELEGIBLES.includes('DESCONOCIDO'), '«encontrado en internet» es una respuesta honesta');
});
