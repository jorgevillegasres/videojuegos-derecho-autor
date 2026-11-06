// tests/publicar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearPublicar, MAXIMO_REGISTRO } from '../plataforma/js/editor/publicar.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const tic = () => new Promise((r) => setTimeout(r, 0));

function armar({ limiteBytes = undefined, generar = async () => {} } = {}) {
  const todo = proyectoPublicable();
  const { sesion, eventos } = sesionDePrueba(todo.p);
  for (const [id, a] of todo.archivos) sesion.archivos.set(id, a);
  const llamadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const publicar = crearPublicar(contenedor, sesion, {
    contenido,
    limiteBytes,
    alGenerar: async () => { llamadas.push(['generar']); return generar(); },
    alCerrar: () => llamadas.push(['cerrar']),
  });
  const q = (selector) => contenedor.querySelector(selector);
  const qa = (selector) => [...contenedor.querySelectorAll(selector)];
  const casilla = (id) => q(`input[type="checkbox"][data-candidato="${id}"]`);
  const marcar = (id, valor = true) => { casilla(id).checked = valor; casilla(id).dispatchEvent(new window.Event('change', { bubbles: true })); };
  return { ...todo, sesion, eventos, publicar, contenedor, llamadas, q, qa, casilla, marcar };
}

test('abrir muestra el paso 1 con la explicación de la prueba, un candidato por activo (sin el título) y ninguno elegido', () => {
  const { p, contenedor, publicar, q, qa } = armar();
  publicar.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(publicar.abierto);
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  assert.ok(q('.publicar-explicacion').textContent.includes(contenido.campos.prueba.breve));
  assert.ok(q('.publicar-explicacion .por-verificar'), 'campos.prueba está pendiente y se marca');
  const candidatos = qa('input[type="checkbox"][data-candidato]');
  assert.equal(candidatos.length, 1 + p.juego.personajes.length + p.juego.elementos.length);
  assert.ok(!candidatos.some((c) => c.dataset.candidato === 'titulo'));
  assert.ok(candidatos.every((c) => !c.checked && !c.disabled));
  assert.deepEqual(textos(contenedor, '.publicar-candidato .candidato-nombre').slice(0, 3), ['Historia', 'Ana', 'El farero']);
  assert.equal(qa('.publicar-decision').length, 0);
  assert.equal(document.activeElement, q('button[data-accion="cerrar-publicar"]'));
  publicar.cerrar();
  contenedor.remove();
});

test('elegir un activo crea su decisión precargada; a los tres se deshabilitan los demás; desmarcar la quita', () => {
  const { sesion, ana, tema, olas, publicar, q, qa, casilla, marcar, contenedor } = armar();
  publicar.abrir();
  marcar(ana.id);
  assert.deepEqual(sesion.proyecto.registro, [{ id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'Ninguna', porque: '' }]);
  const decision = q(`.publicar-decision[data-decision="${ana.id}"]`);
  assert.ok(decision);
  assert.equal(decision.querySelector('h3').firstChild.textContent, 'Ana');
  assert.equal(decision.querySelector('input[type="radio"][value="si"]').checked, true);
  assert.equal(decision.querySelector('input[data-campo="aNombreDe"]').value, 'Camila R.');
  assert.equal(decision.querySelector('input[data-campo="prueba"]').value, 'Ninguna');
  marcar(tema.id);
  marcar(olas.id);
  const registro = sesion.proyecto.registro;
  assert.equal(registro.length, MAXIMO_REGISTRO);
  assert.equal(registro[1].aNombreDe, 'Autora Ejemplo', 'una pieza ajena se precarga con su autora');
  assert.equal(registro[2].prueba, 'Sello de la plataforma', 'lo creado dentro se precarga con el sello');
  assert.ok(casilla('historia').disabled, 'con tres elegidos los demás se deshabilitan');
  assert.ok(!casilla(ana.id).disabled);
  assert.equal(qa('.publicar-decision').length, 3);
  marcar(tema.id, false);
  assert.equal(sesion.proyecto.registro.length, 2);
  assert.ok(!casilla('historia').disabled);
  assert.equal(q(`.publicar-decision[data-decision="${tema.id}"]`), null);
  publicar.cerrar();
  contenedor.remove();
});

test('responder cambia la decisión en el proyecto con origen publicar y sin perder el foco', () => {
  const { sesion, eventos, ana, publicar, q, marcar, contenedor } = armar();
  publicar.abrir();
  marcar(ana.id);
  const decision = q(`.publicar-decision[data-decision="${ana.id}"]`);
  const nombre = decision.querySelector('input[data-campo="aNombreDe"]');
  nombre.focus();
  escribir(nombre, 'Camila Rojas');
  assert.equal(document.activeElement, nombre, 'escribir no redibuja');
  escribir(decision.querySelector('input[data-campo="prueba"]'), 'El archivo original');
  escribir(decision.querySelector('textarea[data-campo="porque"]'), 'Es mi personaje.');
  const no = decision.querySelector('input[type="radio"][value="no"]');
  no.checked = true;
  no.dispatchEvent(new window.Event('change', { bubbles: true }));
  assert.deepEqual(sesion.proyecto.registro[0], { id: ana.id, registraria: 'no', aNombreDe: 'Camila Rojas', prueba: 'El archivo original', porque: 'Es mi personaje.' });
  assert.ok(eventos.filter((e) => e.tipo === 'cambio').every((e) => e.origen === 'publicar'));
  publicar.cerrar();
  contenedor.remove();
});

test('Siguiente exige al menos una decisión; el paso 2 resume el paquete, el nombre y el peso; Volver conserva lo elegido', () => {
  const { p, ana, publicar, q, qa, marcar, contenedor } = armar();
  publicar.abrir();
  clic(q('button[data-accion="siguiente"]'));
  assert.match(q('.publicar-error').textContent, /al menos un activo/);
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: el paquete de entrega');
  const resumen = q('.publicar-resumen').textContent;
  assert.ok(resumen.includes('entrega-camila-r-la-llave-del-faro.zip'));
  assert.ok(resumen.includes(`${p.juego.elementos.length} archivos`));
  assert.ok(resumen.includes('juego.html') && resumen.includes('informe-juridico.html') && resumen.includes('proyecto.json'));
  assert.ok(q('.publicar-peso-ok'), 'con archivos pequeños no hay aviso de peso');
  assert.equal(q('.publicar-peso'), null);
  assert.equal(document.activeElement, q('button[data-accion="generar"]'));
  clic(q('button[data-accion="volver"]'));
  assert.equal(q('#publicar-titulo').textContent, 'Publicar: decisión de registro');
  assert.equal(qa('.publicar-decision').length, 1);
  publicar.cerrar();
  contenedor.remove();
});

test('con un paquete pesado el paso 2 lista los elementos que más pesan y deja seguir', () => {
  const { sesion, ana, tema, olas, publicar, q, qa, marcar, contenedor } = armar({ limiteBytes: 10_000 });
  sesion.archivos.set(tema.id, { tipo: 'audio/ogg', datos: new ArrayBuffer(9_000) });
  sesion.archivos.set(olas.id, { tipo: 'audio/wav', datos: new ArrayBuffer(4_000) });
  publicar.abrir();
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  const aviso = q('.publicar-peso');
  assert.ok(aviso);
  assert.match(aviso.textContent, /más de 0,0 MB|supera/);
  assert.deepEqual(textos(contenedor, '.publicar-peso tbody tr td:first-child').slice(0, 2), ['Tema', 'Olas']);
  assert.ok(!q('button[data-accion="generar"]').disabled, 'no se bloquea: el estudiante decide');
  assert.ok(qa);
  publicar.cerrar();
  contenedor.remove();
});

test('Generar llama a alGenerar, deshabilita el botón mientras tanto y cierra al terminar; si falla, lo dice y sigue abierta', async () => {
  let resolver;
  const { ana, publicar, q, marcar, llamadas, contenedor } = armar({ generar: () => new Promise((r) => { resolver = r; }) });
  publicar.abrir();
  marcar(ana.id);
  clic(q('button[data-accion="siguiente"]'));
  clic(q('button[data-accion="generar"]'));
  assert.deepEqual(llamadas, [['generar']]);
  assert.ok(q('button[data-accion="generar"]').disabled);
  assert.match(q('button[data-accion="generar"]').textContent, /Generando/);
  resolver();
  await tic();
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['generar'], ['cerrar']]);

  const roto = armar({ generar: async () => { throw new Error('No se pudo leer el motor.'); } });
  roto.publicar.abrir();
  roto.marcar(roto.ana.id);
  clic(roto.q('button[data-accion="siguiente"]'));
  clic(roto.q('button[data-accion="generar"]'));
  await tic();
  assert.equal(roto.contenedor.hidden, false);
  assert.match(roto.q('.publicar-error').textContent, /No se pudo leer el motor/);
  assert.ok(!roto.q('button[data-accion="generar"]').disabled);
  roto.publicar.cerrar();
  contenedor.remove();
  roto.contenedor.remove();
});

test('Escape y Cerrar cierran y avisan; al reabrir se descartan las decisiones de activos que ya no existen', () => {
  const { sesion, ana, publicar, q, llamadas, contenedor } = armar();
  publicar.abrir();
  teclear(q('.publicar'), 'Escape');
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar']]);
  publicar.abrir();
  clic(q('button[data-accion="cerrar-publicar"]'));
  assert.deepEqual(llamadas, [['cerrar'], ['cerrar']]);
  sesion.proyecto.registro = [{ id: 'per_fantasma', registraria: 'si', aNombreDe: '', prueba: '', porque: '' }, { id: ana.id, registraria: 'no', aNombreDe: 'Camila R.', prueba: 'x', porque: '' }];
  publicar.abrir();
  assert.deepEqual(sesion.proyecto.registro.map((d) => d.id), [ana.id]);
  assert.ok(q(`.publicar-decision[data-decision="${ana.id}"] input[type="radio"][value="no"]`).checked);
  publicar.cerrar();
  contenedor.remove();
});
