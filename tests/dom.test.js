// tests/dom.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic } from './ayudas/dom.js';
import { h, vaciar, conservarFoco, anunciar, descargar } from '../plataforma/js/ui/dom.js';

instalarDom();

test('h crea nodos con atributos, propiedades, eventos e hijos anidados', () => {
  let clics = 0;
  const nodo = h('button', { type: 'button', class: 'btn', disabled: true, dataset: { id: 'x' }, 'aria-label': 'Probar', onclick: () => { clics += 1; } },
    'Hola ', h('b', {}, 'mundo'), null, false, [' ', ['!']], 3);
  assert.equal(nodo.outerHTML, '<button type="button" class="btn" data-id="x" aria-label="Probar" disabled="">Hola <b>mundo</b> !3</button>');
  nodo.disabled = false;
  clic(nodo);
  assert.equal(clics, 1);
});

test('h fija value de un select después de sus opciones', () => {
  const select = h('select', { value: 'b' }, h('option', { value: 'a' }, 'A'), h('option', { value: 'b' }, 'B'));
  assert.equal(select.value, 'b');
});

test('vaciar quita todos los hijos y devuelve el nodo', () => {
  const nodo = h('div', {}, h('p'), 'texto');
  assert.equal(vaciar(nodo), nodo);
  assert.equal(nodo.childNodes.length, 0);
});

test('conservarFoco devuelve el foco al nodo con el mismo data-foco tras redibujar', () => {
  const contenedor = h('div', {}, h('button', { type: 'button', dataset: { foco: 'uno' } }, 'Uno'));
  document.body.append(contenedor);
  contenedor.querySelector('button').focus();
  conservarFoco(contenedor, () => {
    vaciar(contenedor).append(h('button', { type: 'button', dataset: { foco: 'cero' } }, 'Cero'), h('button', { type: 'button', dataset: { foco: 'uno' } }, 'Uno bis'));
  });
  assert.equal(document.activeElement.textContent, 'Uno bis');
  contenedor.remove();
});

test('anunciar escribe en una zona aria-live única', () => {
  anunciar('Guardado');
  anunciar('Listo');
  const zonas = document.querySelectorAll('#anuncios');
  assert.equal(zonas.length, 1);
  assert.equal(zonas[0].getAttribute('aria-live'), 'polite');
  assert.equal(zonas[0].textContent, 'Listo');
});

test('descargar crea un enlace con el nombre, lo pulsa y libera la URL', () => {
  const llamadas = [];
  const blob = new Blob(['hola'], { type: 'text/plain' });
  descargar(blob, 'copia.zip', {
    crearUrl: (b) => { llamadas.push(['crear', b.type]); return 'blob:x'; },
    liberarUrl: (url) => llamadas.push(['liberar', url]),
    pulsar: (enlace) => llamadas.push(['pulsar', enlace.download, enlace.href]),
  });
  assert.deepEqual(llamadas, [['crear', 'text/plain'], ['pulsar', 'copia.zip', 'blob:x'], ['liberar', 'blob:x']]);
  assert.equal(document.querySelector('a[download]'), null, 'el enlace no queda en el documento');
});
