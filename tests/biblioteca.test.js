// tests/biblioteca.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { catalogoDePrueba } from './ayudas/catalogo.js';
import { crearCatalogo } from '../plataforma/js/biblioteca/catalogo.js';
import { tomarPieza, crearBiblioteca } from '../plataforma/js/editor/biblioteca.js';

instalarDom();

async function catalogoCargado(datos = catalogoDePrueba()) {
  const fetchFalso = async (url) => {
    const texto = String(url);
    if (texto.endsWith('catalogo.json')) return { ok: true, json: async () => datos };
    if (texto.endsWith('.png') || texto.endsWith('.wav')) return { ok: true, arrayBuffer: async () => new TextEncoder().encode(`bytes de ${texto}`).buffer };
    return { ok: false, status: 404 };
  };
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchFalso });
  await catalogo.cargar();
  return catalogo;
}

test('tomarPieza mete la pieza como elemento de biblioteca con su ficha precargada y su archivo', async () => {
  const catalogo = await catalogoCargado();
  const { sesion, eventos } = sesionDePrueba();
  const pieza = catalogo.piezaDe('bib_m3');
  const elemento = await tomarPieza(sesion, catalogo, pieza);
  assert.equal(elemento.tipo, 'musica');
  assert.equal(elemento.origen, 'biblioteca');
  assert.equal(elemento.nombre, 'Pista 3');
  assert.equal(elemento.archivo, `${elemento.id}.wav`);
  assert.deepEqual(elemento.biblioteca, { id: 'bib_m3', autor: 'Autora de Prueba', licencia: 'CC-BY-NC-4.0', creditoSugerido: '«Pista 3», Autora de Prueba, CC-BY-NC-4.0' });
  const ficha = sesion.proyecto.fichas[elemento.id];
  assert.equal(ficha.origen, 'biblioteca');
  assert.equal(ficha.licencia, 'CC-BY-NC-4.0');
  assert.equal(ficha.autorNombre, 'Autora de Prueba');
  assert.equal(ficha.credito, '«Pista 3», Autora de Prueba, CC-BY-NC-4.0');
  const archivo = sesion.archivos.get(elemento.id);
  assert.equal(archivo.tipo, 'audio/wav');
  assert.equal(new TextDecoder().decode(archivo.datos), 'bytes de http://localhost/plataforma/biblioteca/musica/bib_m3.wav');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'biblioteca', estructura: true });
});

test('si el almacén no puede guardar el archivo, tomarPieza retira el elemento y propaga el error', async () => {
  const catalogo = await catalogoCargado();
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const { sesion } = sesionDePrueba(undefined, { almacen: { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} } });
  await assert.rejects(tomarPieza(sesion, catalogo, catalogo.piezaDe('bib_f1')), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});

test('abrir muestra los filtros con sus cuentas y las tarjetas del tipo activo, con vista previa, autor y licencia', async () => {
  const catalogo = await catalogoCargado();
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: () => {} });
  biblioteca.abrir();
  assert.equal(contenedor.hidden, false);
  assert.ok(biblioteca.abierto);
  assert.deepEqual(textos(contenedor, '[role="tab"]'), ['Fondos (8)', 'Retratos (8)', 'Música (6)', 'Efectos (12)']);
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'fondo');
  assert.equal(document.activeElement, contenedor.querySelector('[data-filtro="fondo"]'));
  const tarjetas = [...contenedor.querySelectorAll('.biblioteca-pieza')];
  assert.equal(tarjetas.length, 8);
  assert.equal(tarjetas[0].querySelector('img').getAttribute('src'), 'http://localhost/plataforma/biblioteca/fondos/bib_f1.png');
  assert.equal(tarjetas[0].querySelector('h3').textContent, 'Fondo 1');
  assert.equal(tarjetas[0].querySelector('.biblioteca-autor').textContent, 'Autora de Prueba');
  assert.deepEqual(textos(tarjetas[0], '.chip'), ['CC BY', 'BY']);
  assert.deepEqual(textos(tarjetas[2], '.chip'), ['CC BY-SA', 'BY', 'SA']);
  assert.deepEqual(textos(tarjetas[7], '.chip'), ['Autor desconocido']);
  assert.match(contenedor.querySelector('.mapa-resumen').textContent, /34 piezas con licencias reales/);
  clic(contenedor.querySelector('[data-filtro="musica"]'));
  assert.equal(contenedor.querySelectorAll('.biblioteca-pieza').length, 6);
  assert.equal(contenedor.querySelector('.biblioteca-pieza audio').getAttribute('src'), 'http://localhost/plataforma/biblioteca/musica/bib_m1.wav');
  assert.equal(document.activeElement, contenedor.querySelector('[data-filtro="musica"]'), 'el foco sigue en el filtro');
  contenedor.remove();
});

test('«Usar esta pieza» cierra y avisa cuál; Cerrar y Escape cierran y avisan una sola vez', async () => {
  const catalogo = await catalogoCargado();
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: (p) => llamadas.push(['elegir', p.id]), alCerrar: () => llamadas.push(['cerrar']) });
  biblioteca.abrir('retrato');
  clic(contenedor.querySelector('.biblioteca-pieza[data-pieza="bib_r2"] button[data-accion="usar"]'));
  assert.equal(contenedor.hidden, true);
  assert.deepEqual(llamadas, [['cerrar'], ['elegir', 'bib_r2']]);
  biblioteca.abrir();
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'retrato', 'recuerda el último filtro');
  clic(contenedor.querySelector('button[data-accion="cerrar-biblioteca"]'));
  assert.deepEqual(llamadas.at(-1), ['cerrar']);
  biblioteca.cerrar();
  assert.equal(llamadas.length, 3, 'cerrar dos veces no avisa dos veces');
  biblioteca.abrir('nada');
  assert.equal(contenedor.querySelector('[role="tab"][aria-selected="true"]').dataset.filtro, 'retrato', 'un tipo desconocido no cambia el filtro');
  teclear(contenedor.querySelector('.biblioteca'), 'Escape');
  assert.equal(contenedor.hidden, true);
  contenedor.remove();
});

test('un catálogo provisional lo dice en la cabecera; sin piezas del tipo muestra el vacío', async () => {
  const datos = catalogoDePrueba();
  datos.provisional = true;
  datos.piezas = datos.piezas.filter((p) => p.tipo !== 'efecto');
  const catalogo = await catalogoCargado(datos);
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const biblioteca = crearBiblioteca(contenedor, catalogo, { alElegir: () => {} });
  biblioteca.abrir('efecto');
  assert.match(contenedor.querySelector('.mapa-resumen').textContent, /provisional/);
  assert.equal(contenedor.querySelector('.vacio').textContent, 'No hay piezas de este tipo.');
  assert.ok(textos(contenedor, '[role="tab"]').includes('Efectos (0)'));
  contenedor.remove();
});
