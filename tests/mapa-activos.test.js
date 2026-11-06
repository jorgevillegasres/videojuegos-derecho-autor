// tests/mapa-activos.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { crearMapaActivos } from '../plataforma/js/editor/mapa-activos.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

function armar() {
  const { p, tema } = proyectoPublicable();
  const { sesion } = sesionDePrueba(p);
  const llamadas = [];
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const mapa = crearMapaActivos(contenedor, sesion, {
    contenido,
    alSeleccionar: (seleccion, enfocar) => llamadas.push(['seleccionar', seleccion, enfocar]),
    alCerrar: () => llamadas.push(['cerrar']),
  });
  return { sesion, p, tema, contenedor, mapa, llamadas };
}

test('abrir dibuja la tabla con una fila por ficha, el resumen y el foco en Cerrar', () => {
  const { contenedor, mapa, p } = armar();
  mapa.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(mapa.abierto);
  assert.deepEqual(textos(contenedor, 'thead th'), ['Activo', '¿Quién lo creó?', 'Contrato o licencia', 'Prueba', 'Riesgo', 'Acción', '']);
  assert.equal(contenedor.querySelectorAll('tbody tr').length, 9);
  assert.equal(contenedor.querySelector('.mapa-resumen').textContent, '9 activos: 9 en verde, 0 en amarillo, 0 en rojo.');
  const filaTema = contenedor.querySelector('tbody tr:nth-child(8)');
  assert.deepEqual(textos(filaTema, 'td').slice(0, 4), ['TemaMúsica', 'Autora Ejemplo', 'Creative Commons Atribución y no comercial 4.0', 'Ninguna']);
  assert.equal(filaTema.querySelector('.punto-semaforo').getAttribute('aria-label'), 'Riesgo de Tema: verde');
  assert.equal(filaTema.querySelectorAll('td')[5].textContent, 'Nada por hacer');
  assert.ok(contenedor.querySelector('tbody tr:first-child .por-verificar'), 'el título tiene un texto por verificar');
  assert.equal(document.activeElement, contenedor.querySelector('button[data-accion="cerrar-mapa"]'));
  p.juego.destino = 'venta';
  mapa.dibujar();
  assert.equal(contenedor.querySelector('.mapa-resumen').textContent, '9 activos: 8 en verde, 0 en amarillo, 1 en rojo.');
  assert.deepEqual(textos(contenedor.querySelector('tbody tr:nth-child(8)'), '.mapa-acciones li'), [contenido.reglas.R03.accion]);
  contenedor.remove();
});

test('«Ver ficha» cierra el mapa y pide la selección con el foco en la ficha', () => {
  const { contenedor, mapa, llamadas, tema, p } = armar();
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:first-child button[data-accion="ver-ficha"]'));
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['seleccionar', { tipo: 'juego' }, 'ficha:titulo']]);
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:nth-child(8) button[data-accion="ver-ficha"]'));
  assert.deepEqual(llamadas.at(-1), ['seleccionar', { tipo: 'elemento', id: tema.id }, `ficha:${tema.id}`]);
  mapa.abrir();
  clic(contenedor.querySelector('tbody tr:nth-child(3) button[data-accion="ver-ficha"]'));
  assert.deepEqual(llamadas.at(-1), ['seleccionar', { tipo: 'personaje', id: p.juego.personajes[0].id }, `ficha:${p.juego.personajes[0].id}`]);
  contenedor.remove();
});

test('Cerrar y Escape cierran y avisan; cerrado, dibujar no hace nada', () => {
  const { contenedor, mapa, llamadas } = armar();
  mapa.dibujar();
  assert.equal(contenedor.childNodes.length, 0);
  mapa.abrir();
  clic(contenedor.querySelector('button[data-accion="cerrar-mapa"]'));
  assert.equal(contenedor.hidden, true);
  assert.equal(contenedor.childNodes.length, 0);
  assert.deepEqual(llamadas, [['cerrar']]);
  mapa.cerrar();
  assert.deepEqual(llamadas, [['cerrar']], 'cerrar dos veces no avisa dos veces');
  mapa.abrir();
  teclear(contenedor.querySelector('.mapa'), 'Escape');
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['cerrar']]);
  contenedor.remove();
});
