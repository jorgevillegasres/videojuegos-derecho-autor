// tests/barra.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearBarra } from '../plataforma/js/editor/barra.js';

instalarDom();

function armar(proyecto) {
  const { sesion } = sesionDePrueba(proyecto);
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const barra = crearBarra(contenedor, sesion, {
    alJugar: () => llamadas.push('jugar'),
    alGuardarCopia: () => llamadas.push('guardar-copia'),
    alAbrirCopia: () => llamadas.push('abrir-copia'),
    alNuevoJuego: () => llamadas.push('nuevo-juego'),
    alPublicar: () => llamadas.push('publicar'),
  });
  const boton = (accion) => contenedor.querySelector(`button[data-accion="${accion}"]`);
  return { sesion, contenedor, barra, llamadas, boton };
}

test('muestra título y estudiante (o sus alternativas) y cada botón llama a su manejador', () => {
  const { sesion, contenedor, barra, llamadas, boton } = armar();
  barra.dibujar();
  assert.equal(contenedor.querySelector('.barra-juego').textContent, 'La llave del faro');
  assert.equal(contenedor.querySelector('.barra-estudiante').textContent, 'Camila R.');
  for (const accion of ['jugar', 'guardar-copia', 'abrir-copia', 'nuevo-juego']) clic(boton(accion));
  assert.deepEqual(llamadas, ['jugar', 'guardar-copia', 'abrir-copia', 'nuevo-juego']);
  sesion.proyecto.juego.titulo = ' ';
  sesion.proyecto.estudiante = '';
  barra.dibujar();
  assert.equal(contenedor.querySelector('.barra-juego').textContent, 'Sin título');
  assert.equal(contenedor.querySelector('.barra-estudiante').textContent, 'Sin nombre');
  contenedor.remove();
});

test('Publicar lleva candado y dice qué falta mientras no se cumplan las condiciones; no publica', () => {
  const { contenedor, barra, llamadas, boton } = armar();
  barra.dibujar();
  const publicar = boton('publicar');
  assert.equal(publicar.getAttribute('aria-disabled'), 'true');
  assert.ok(publicar.querySelector('.candado'));
  assert.equal(publicar.getAttribute('aria-describedby'), 'publicar-falta');
  const falta = contenedor.querySelector('#publicar-falta');
  assert.match(falta.querySelector('p').textContent, /^Falta para publicar \(7\)/);
  const motivos = textos(falta, 'li');
  assert.ok(motivos.includes('Escenas: 1 de 3.'));
  assert.ok(motivos.includes('Personajes con retrato: 0 de 2.'));
  clic(publicar);
  assert.deepEqual(llamadas, []);
  contenedor.remove();
});

test('con más de ocho motivos resume el resto; con un proyecto publicable se abre y publica', () => {
  const { sesion, contenedor, barra } = armar();
  sesion.proyecto.juego.titulo = '';
  agregarLinea(sesion.proyecto.juego.escenas[0], 'dialogo', { personaje: null, texto: 'x' });
  barra.dibujar();
  assert.equal(contenedor.querySelectorAll('#publicar-falta li').length, 8);
  assert.equal(contenedor.querySelector('#publicar-falta p:last-child').textContent, 'y 1 más.');
  contenedor.remove();

  const { p } = proyectoPublicable();
  const listo = armar(p);
  listo.barra.dibujar();
  const publicar = listo.boton('publicar');
  assert.equal(publicar.getAttribute('aria-disabled'), null);
  assert.equal(publicar.querySelector('.candado'), null);
  assert.equal(listo.contenedor.querySelector('#publicar-falta').textContent, 'Todo listo para publicar.');
  clic(publicar);
  assert.deepEqual(listo.llamadas, ['publicar']);
  listo.contenedor.remove();
});
