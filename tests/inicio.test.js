// tests/inicio.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { crearInicio } from '../plataforma/js/editor/inicio.js';

instalarDom();

function armar() {
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const inicio = crearInicio(contenedor, {
    nombreProducto: 'Mi primer videojuego',
    contenido: { aviso: 'Material educativo.', campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    alEmpezar: (datos) => llamadas.push(['empezar', datos]),
    alAbrirCopia: () => llamadas.push(['abrir-copia']),
  });
  return { contenedor, inicio, llamadas };
}

test('explica qué se hace, qué se entrega y que nada sale del navegador; pide nombre, título y destino', () => {
  const { contenedor, inicio } = armar();
  inicio.dibujar();
  assert.equal(contenedor.querySelector('h1').textContent, 'Mi primer videojuego');
  const parrafos = textos(contenedor, '.inicio-explicacion p');
  assert.equal(parrafos.length, 3);
  assert.match(parrafos[0], /aventura narrativa/);
  assert.match(parrafos[1], /paquete/);
  assert.match(parrafos[2], /^Nada sale de tu navegador/);
  assert.equal(contenedor.querySelector('.aviso-legal').textContent, 'Material educativo.');
  assert.deepEqual(textos(contenedor, 'label.campo-etiqueta'), ['Tu nombre', 'Título del juego']);
  assert.equal(contenedor.querySelector('legend').textContent, 'Destino del juego');
  assert.deepEqual(textos(contenedor, '.opcion-nombre'), ['Uso personal', 'Publicarlo gratis', 'Venderlo']);
  assert.equal(contenedor.querySelector('input[name="destino"]:checked').value, 'gratis');
  assert.equal(contenedor.querySelector('.ayuda').textContent, 'El destino delimita qué licencias sirven.');
  assert.equal(document.activeElement, contenedor.querySelector('#inicio-estudiante'), 'el foco arranca en el nombre');
  contenedor.remove();
});

test('Empezar exige el nombre; con nombre llama a alEmpezar con los datos recortados y el destino elegido', () => {
  const { contenedor, inicio, llamadas } = armar();
  inicio.dibujar();
  const formulario = contenedor.querySelector('form');
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, []);
  const error = contenedor.querySelector('.inicio-error');
  assert.equal(error.hidden, false);
  assert.equal(error.textContent, 'Escribe tu nombre para empezar.');
  escribir(contenedor.querySelector('#inicio-estudiante'), '  Camila R. ');
  escribir(contenedor.querySelector('#inicio-titulo'), ' La llave del faro ');
  contenedor.querySelector('input[name="destino"][value="venta"]').checked = true;
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, [['empezar', { estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'venta' }]]);
  assert.equal(error.hidden, true);
  contenedor.remove();
});

test('Abrir una copia avisa; mostrarError muestra un mensaje', () => {
  const { contenedor, inicio, llamadas } = armar();
  inicio.dibujar();
  clic(contenedor.querySelector('button[data-accion="abrir-copia"]'));
  assert.deepEqual(llamadas, [['abrir-copia']]);
  inicio.mostrarError('La copia está dañada.');
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'La copia está dañada.');
  contenedor.remove();
});
