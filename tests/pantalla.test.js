// tests/pantalla.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { vistaDeLinea } from '../plataforma/js/motor/partida.js';
import { crearPantalla } from '../plataforma/js/motor/pantalla.js';

instalarDom();

function armar() {
  const p = crearProyecto({ titulo: 'Faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  const vacia = agregarEscena(p, 'Vacía');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'subido' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' });
  ana.retrato = retrato.id;
  muelle.fondo = fondo.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: vacia.id }, { texto: '  ', escena: null }] });
  agregarLinea(vacia, 'fin', { texto: 'Se acabó.' });
  const urls = new Map([[retrato.id, 'blob:retrato'], [fondo.id, 'blob:fondo']]);
  const contenedor = document.createElement('div');
  const pantalla = crearPantalla(contenedor, { juego: p.juego, resolverRecurso: (id) => urls.get(id) ?? null });
  return { p, muelle, vacia, contenedor, pantalla, urls, retrato, fondo };
}

test('un diálogo muestra fondo, retrato, nombre y texto; el fondo creado dentro se marca como pixel', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 1));
  const fondo = contenedor.querySelector('.escenario-fondo img');
  assert.equal(fondo.getAttribute('src'), 'blob:fondo');
  assert.ok(fondo.classList.contains('pixel'));
  const retrato = contenedor.querySelector('.escenario-retrato img');
  assert.equal(retrato.getAttribute('src'), 'blob:retrato');
  assert.ok(!retrato.classList.contains('pixel'), 'un retrato subido no se pixela');
  const nombre = contenedor.querySelector('.escenario-nombre');
  assert.equal(nombre.hidden, false);
  assert.equal(nombre.textContent, 'Ana');
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, '¿Quién?');
});

test('una narración no muestra nombre ni retrato', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 0));
  assert.equal(contenedor.querySelector('.escenario-nombre').hidden, true);
  assert.equal(contenedor.querySelector('.escenario-retrato img'), null);
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Niebla.');
});

test('una decisión dibuja un botón por opción con su número y avisa cuál se eligió', () => {
  const { p, muelle, contenedor, pantalla } = armar();
  const elegidas = [];
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 2), { alElegir: (i) => elegidas.push(i) });
  const botones = contenedor.querySelectorAll('.escenario-opciones button');
  assert.equal(botones.length, 2);
  assert.deepEqual(textos(contenedor, '.escenario-opciones kbd'), ['1', '2']);
  assert.equal(botones[1].textContent.trim(), '2 Opción 2', 'una opción sin texto muestra su número');
  clic(botones[1]);
  clic(botones[0]);
  assert.deepEqual(elegidas, [1, 0]);
});

test('sin URL para el recurso no se dibuja la imagen; sin alElegir los botones no fallan', () => {
  const { p, muelle, contenedor } = armar();
  const pantalla = crearPantalla(contenedor, { juego: p.juego, resolverRecurso: () => null });
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 1));
  assert.equal(contenedor.querySelector('img'), null);
  pantalla.mostrar(vistaDeLinea(p.juego, muelle, 2));
  clic(contenedor.querySelector('.escenario-opciones button'));
});

test('los créditos muestran el título y una línea por entrada; volver a mostrar una vista los oculta', () => {
  const { p, vacia, contenedor, pantalla } = armar();
  pantalla.mostrarCreditos('Faro', ['Camila R.: autora del juego', 'Tema: CC BY']);
  const creditos = contenedor.querySelector('.escenario-creditos');
  assert.equal(creditos.hidden, false);
  assert.equal(creditos.querySelector('.creditos-titulo').textContent, 'Faro');
  assert.deepEqual(textos(creditos, 'li'), ['Camila R.: autora del juego', 'Tema: CC BY']);
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  pantalla.mostrar(vistaDeLinea(p.juego, vacia, 0));
  assert.equal(creditos.hidden, true);
  assert.ok(!contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  assert.ok(contenedor.querySelector('.escenario').classList.contains('es-fin'));
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Se acabó.');
});

test('una vista vacía explica que la escena no tiene líneas', () => {
  const { p, contenedor, pantalla } = armar();
  const sinLineas = { ...p.juego.escenas[0], lineas: [] };
  pantalla.mostrar(vistaDeLinea(p.juego, sinLineas, 0));
  assert.equal(contenedor.querySelector('.escenario-texto').textContent, 'Esta escena no tiene líneas todavía.');
  assert.ok(contenedor.querySelector('.escenario').classList.contains('vacia'));
  assert.equal(contenedor.querySelector('.escenario-fondo img').getAttribute('src'), 'blob:fondo', 'el fondo de la escena sí se ve');
});
