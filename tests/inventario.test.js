// tests/inventario.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearInventario } from '../plataforma/js/editor/inventario.js';

instalarDom();

function armar() {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, '');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const sinNombre = agregarPersonaje(p, { nombre: '' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'subido' });
  ana.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' }).id;
  agregarLinea(torre, 'dialogo', { personaje: null, texto: 'Sin quién.' });
  const selecciones = [];
  let subidas = 0;
  const contenedor = document.createElement('div');
  const inventario = crearInventario(contenedor, sesion, { alSeleccionar: (s) => selecciones.push(s), alSubir: () => { subidas += 1; } });
  return { sesion, eventos, p, muelle, torre, ana, sinNombre, fondo, contenedor, inventario, selecciones, subidas: () => subidas };
}

test('dibuja El juego, escenas, personajes y elementos con sus nombres y detalles, y marca la selección', () => {
  const { contenedor, inventario, muelle, fondo } = armar();
  inventario.dibujar({ tipo: 'escena', id: muelle.id });
  assert.deepEqual(textos(contenedor, 'h2'), ['Escenas', 'Personajes', 'Elementos']);
  assert.deepEqual(textos(contenedor, '.entrada-texto'), ['La llave del faro', 'El muelle', 'Escena 2', 'Ana', 'Sin nombre', 'Muelle', 'Ana']);
  assert.deepEqual(textos(contenedor, '.entrada-detalle'), ['El juego', 'inicial', 'sin retrato', 'Fondo', 'Retrato']);
  const activas = [...contenedor.querySelectorAll('[aria-current="true"]')];
  assert.equal(activas.length, 1);
  assert.equal(activas[0].querySelector('.entrada-texto').textContent, 'El muelle');
  inventario.dibujar({ tipo: 'elemento', id: fondo.id });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-texto').textContent, 'Muelle');
  inventario.dibujar({ tipo: 'linea', escena: muelle.id, indice: 0 });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-texto').textContent, 'El muelle', 'una línea seleccionada marca su escena');
  inventario.dibujar({ tipo: 'juego' });
  assert.equal(contenedor.querySelector('[aria-current="true"] .entrada-detalle').textContent, 'El juego');
});

test('las escenas con avisos llevan la marca gris con los mensajes; las limpias no', () => {
  const { contenedor, inventario, muelle } = armar();
  inventario.dibujar(null);
  let marcas = [...contenedor.querySelectorAll('.aviso-gris')];
  assert.equal(marcas.length, 2, 'el muelle no tiene líneas; la torre tiene un diálogo sin personaje');
  assert.match(marcas[0].title, /no tiene líneas/);
  assert.match(marcas[1].title, /no tiene personaje/);
  assert.match(marcas[1].getAttribute('aria-label'), /^1 aviso/);
  assert.equal(marcas[1].closest('li').querySelector('.entrada-texto').textContent, 'Escena 2');
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  inventario.dibujar(null);
  marcas = [...contenedor.querySelectorAll('.aviso-gris')];
  assert.equal(marcas.length, 1, 'con una línea, el muelle queda limpio');
  assert.equal(marcas[0].closest('li').querySelector('.entrada-texto').textContent, 'Escena 2');
});

test('Nueva escena y Nuevo personaje crean con nombre numerado, avisan con estructura y seleccionan lo nuevo', () => {
  const { contenedor, inventario, sesion, eventos, selecciones, p } = armar();
  inventario.dibujar(null);
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Nueva escena'));
  assert.equal(p.juego.escenas.length, 3);
  assert.equal(p.juego.escenas[2].nombre, 'Escena 3');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'inventario', estructura: true });
  assert.deepEqual(selecciones.at(-1), { tipo: 'escena', id: p.juego.escenas[2].id });
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Nuevo personaje'));
  assert.equal(p.juego.personajes.length, 3);
  assert.equal(p.juego.personajes[2].nombre, 'Personaje 3');
  assert.ok(sesion.proyecto.fichas[p.juego.personajes[2].id], 'el personaje nuevo tiene ficha');
  assert.deepEqual(selecciones.at(-1), { tipo: 'personaje', id: p.juego.personajes[2].id });
});

test('pulsar una entrada selecciona lo correcto y Subir archivo avisa', () => {
  const { contenedor, inventario, selecciones, subidas, muelle, ana, fondo } = armar();
  inventario.dibujar(null);
  const botones = [...contenedor.querySelectorAll('button.entrada')];
  clic(botones[0]);
  clic(botones[1]);
  clic(botones[3]);
  clic(botones[5]);
  assert.deepEqual(selecciones, [{ tipo: 'juego' }, { tipo: 'escena', id: muelle.id }, { tipo: 'personaje', id: ana.id }, { tipo: 'elemento', id: fondo.id }]);
  clic([...contenedor.querySelectorAll('button')].find((b) => b.textContent === 'Subir archivo'));
  assert.equal(subidas(), 1);
});

test('sin título, sin personajes ni elementos muestra textos de vacío', () => {
  const { sesion } = sesionDePrueba();
  sesion.proyecto.juego.titulo = '  ';
  const contenedor = document.createElement('div');
  crearInventario(contenedor, sesion, { alSeleccionar: () => {}, alSubir: () => {} }).dibujar(null);
  assert.equal(contenedor.querySelector('.entrada-texto').textContent, 'Sin título');
  assert.deepEqual(textos(contenedor, '.vacio'), ['Nada todavía.', 'Nada todavía.']);
  assert.equal(contenedor.querySelectorAll('.aviso-gris').length, 1, 'la escena inicial vacía avisa (sin líneas, sin fin)');
});

test('los puntos de semáforo de personajes y elementos llevan el color y un nombre accesible', () => {
  const { contenedor, inventario, ana, fondo } = armar();
  inventario.dibujar(null);
  const puntoAna = contenedor.querySelector(`.punto-semaforo[data-ficha="${ana.id}"]`);
  assert.ok(puntoAna.classList.contains('semaforo-verde'));
  assert.equal(puntoAna.getAttribute('aria-label'), 'Semáforo de Ana: verde');
  const puntoFondo = contenedor.querySelector(`.punto-semaforo[data-ficha="${fondo.id}"]`);
  assert.ok(puntoFondo.classList.contains('semaforo-amarillo'), 'subido, hecho por mí y sin prueba: A06');
  assert.equal(puntoFondo.getAttribute('aria-label'), 'Semáforo de Muelle: amarillo');
  assert.equal(contenedor.querySelectorAll('.punto-semaforo').length, 4, 'dos personajes y dos elementos');
});
