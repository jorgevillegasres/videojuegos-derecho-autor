// tests/guion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearGuion } from '../plataforma/js/editor/guion.js';

instalarDom();

function armar({ confirmar = () => true } = {}) {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const farero = agregarPersonaje(p, { nombre: 'El farero' });
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: null }] });
  agregarLinea(muelle, 'narracion', { texto: 'Oculta.' });
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const guion = crearGuion(contenedor, sesion, { alSeleccionar: (i) => selecciones.push(i), confirmar });
  const bloques = () => [...contenedor.querySelectorAll('li.linea')];
  const boton = (li, accion) => li.querySelector(`button[data-accion="${accion}"]`);
  return { sesion, eventos, p, muelle, torre, ana, farero, contenedor, guion, selecciones, bloques, boton };
}

test('dibuja un bloque por línea con su tipo y su texto, avisa de las líneas tras el corte y marca la seleccionada', () => {
  const { contenedor, guion, muelle, bloques } = armar();
  guion.dibujar(muelle, 1);
  assert.equal(contenedor.querySelector('h2').textContent, 'El muelle');
  assert.equal(contenedor.querySelector('.guion-cuenta').textContent, '4 línea(s)');
  assert.deepEqual(textos(contenedor, '.linea-tipo'), ['Narración', 'Diálogo', 'Decisión', 'Narración']);
  assert.deepEqual([...contenedor.querySelectorAll('textarea')].map((t) => t.value), ['Niebla.', '¿Quién?', '¿Subes?', 'Oculta.']);
  const lista = bloques();
  assert.equal(lista[1].getAttribute('aria-current'), 'true');
  assert.ok(lista[1].classList.contains('seleccionada'));
  assert.ok(lista[3].classList.contains('tras-corte'));
  assert.equal(lista[3].querySelector('.aviso-gris').textContent, 'no se verá');
  assert.equal(contenedor.querySelectorAll('.aviso-gris').length, 1);
  guion.dibujar(null);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'Selecciona una escena para editar su guion.');
  contenedor.remove();
});

test('los botones «Línea» agregan cada tipo al final, el diálogo nuevo toma el primer personaje y se selecciona lo nuevo', () => {
  const { contenedor, guion, muelle, ana, eventos, selecciones } = armar();
  guion.dibujar(muelle);
  clic(contenedor.querySelector('button[data-agregar="dialogo"]'));
  assert.equal(muelle.lineas.length, 5);
  assert.equal(muelle.lineas[4].tipo, 'dialogo');
  assert.equal(muelle.lineas[4].personaje, ana.id);
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'guion', estructura: true });
  assert.equal(selecciones.at(-1), 4);
  clic(contenedor.querySelector('button[data-agregar="fin"]'));
  assert.equal(muelle.lineas[5].tipo, 'fin');
  clic(contenedor.querySelector('button[data-agregar="decision"]'));
  assert.equal(muelle.lineas[6].opciones.length, 2);
  contenedor.remove();
});

test('escribir cambia el texto sin redibujar y avisa sin estructura; enfocar un bloque lo selecciona', () => {
  const { contenedor, guion, muelle, eventos, selecciones } = armar();
  guion.dibujar(muelle);
  const area = contenedor.querySelector('textarea');
  escribir(area, 'Niebla espesa.');
  assert.equal(muelle.lineas[0].texto, 'Niebla espesa.');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'guion', estructura: false });
  assert.equal(contenedor.querySelector('textarea'), area, 'el nodo sigue siendo el mismo');
  contenedor.querySelectorAll('textarea')[2].focus();
  assert.equal(selecciones.at(-1), 2);
  contenedor.remove();
});

test('subir y bajar mueven y seleccionan; los extremos se deshabilitan; eliminar pide confirmación', () => {
  const { contenedor, guion, muelle, bloques, boton, selecciones } = armar();
  guion.dibujar(muelle);
  assert.equal(boton(bloques()[0], 'subir').disabled, true);
  assert.equal(boton(bloques()[3], 'bajar').disabled, true);
  clic(boton(bloques()[0], 'bajar'));
  assert.deepEqual(muelle.lineas.map((l) => l.texto), ['¿Quién?', 'Niebla.', '¿Subes?', 'Oculta.']);
  assert.equal(selecciones.at(-1), 1);
  guion.dibujar(muelle, 1);
  clic(boton(bloques()[3], 'eliminar'));
  assert.equal(muelle.lineas.length, 3);
  assert.equal(selecciones.at(-1), 2, 'queda seleccionada la última');
  const { contenedor: otro, guion: guion2, muelle: muelle2, boton: boton2, bloques: bloques2 } = armar({ confirmar: () => false });
  guion2.dibujar(muelle2);
  clic(boton2(bloques2()[0], 'eliminar'));
  assert.equal(muelle2.lineas.length, 4, 'con «no» no se elimina');
  contenedor.remove();
  otro.remove();
});

test('el diálogo elige personaje; la decisión edita opciones y destinos y respeta el mínimo y el máximo', () => {
  const { contenedor, guion, muelle, torre, ana, farero, bloques } = armar();
  guion.dibujar(muelle);
  const personaje = bloques()[1].querySelector('select');
  assert.deepEqual(textos(personaje, 'option'), ['Elige un personaje', 'Ana', 'El farero']);
  assert.equal(personaje.value, ana.id);
  escribir(personaje, farero.id);
  assert.equal(muelle.lineas[1].personaje, farero.id);
  const decision = bloques()[2];
  assert.deepEqual([...decision.querySelectorAll('input.opcion-texto')].map((i) => i.value), ['Sí', 'No']);
  const destinos = [...decision.querySelectorAll('select')];
  assert.deepEqual(destinos.map((s) => s.value), [torre.id, '']);
  assert.deepEqual(textos(destinos[1], 'option'), ['Elige una escena', 'El muelle', 'La torre']);
  escribir(destinos[1], muelle.id);
  assert.equal(muelle.lineas[2].opciones[1].escena, muelle.id);
  escribir(decision.querySelector('input.opcion-texto'), 'Sí, ahora');
  assert.equal(muelle.lineas[2].opciones[0].texto, 'Sí, ahora');
  assert.equal(decision.querySelector('button[data-accion="quitar-opcion"]').disabled, true, 'con dos opciones no se puede quitar');
  clic(decision.querySelector('button[data-accion="agregar-opcion"]'));
  clic(decision.querySelector('button[data-accion="agregar-opcion"]'));
  assert.equal(muelle.lineas[2].opciones.length, 4);
  guion.dibujar(muelle);
  const decision2 = bloques()[2];
  assert.equal(decision2.querySelector('button[data-accion="agregar-opcion"]').disabled, true, 'con cuatro no se agrega');
  clic(decision2.querySelectorAll('button[data-accion="quitar-opcion"]')[3]);
  assert.equal(muelle.lineas[2].opciones.length, 3);
  contenedor.remove();
});

test('marcarSeleccion cambia la línea marcada sin redibujar', () => {
  const { contenedor, guion, muelle, bloques } = armar();
  guion.dibujar(muelle, 0);
  const antes = bloques();
  guion.marcarSeleccion(2);
  const despues = bloques();
  assert.equal(antes[2], despues[2], 'mismos nodos');
  assert.equal(despues[0].getAttribute('aria-current'), null);
  assert.equal(despues[2].getAttribute('aria-current'), 'true');
  assert.ok(despues[2].classList.contains('seleccionada'));
  contenedor.remove();
});
