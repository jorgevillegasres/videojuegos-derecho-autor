// tests/inicio.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { crearInicio } from '../plataforma/js/editor/inicio.js';

instalarDom();

function armar({ alEmpezar = async () => {}, ejemploDisponible = true } = {}) {
  const llamadas = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const inicio = crearInicio(contenedor, {
    nombreProducto: 'Mi primer videojuego',
    contenido: { aviso: 'Material educativo.', campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    ejemploDisponible,
    alEmpezar: (datos) => { llamadas.push(['empezar', datos]); return alEmpezar(datos); },
    alAbrirCopia: () => llamadas.push(['abrir-copia']),
  });
  return { contenedor, inicio, llamadas };
}

test('explica que recibe un juego terminado para hacerlo suyo, qué entrega y que nada sale del navegador; pide nombre y destino', () => {
  const { contenedor, inicio } = armar();
  inicio.dibujar();
  assert.equal(contenedor.querySelector('h1').textContent, 'Mi primer videojuego');
  const parrafos = textos(contenedor, '.inicio-explicacion p');
  assert.equal(parrafos.length, 3);
  assert.match(parrafos[0], /^Vas a recibir un juego terminado, «La llave del faro», y a hacerlo tuyo pieza por pieza/);
  assert.match(parrafos[1], /Cuando no quede nada del ejemplo y todas las fichas estén en verde/);
  assert.match(parrafos[2], /^Nada sale de tu navegador/);
  assert.deepEqual(textos(contenedor, 'label.campo-etiqueta'), ['Tu nombre']);
  assert.equal(contenedor.querySelector('#inicio-titulo'), null);
  assert.equal(contenedor.querySelector('legend').textContent, 'Destino del juego');
  assert.equal(document.activeElement, contenedor.querySelector('#inicio-estudiante'));
  contenedor.remove();
});

test('Empezar exige el nombre; con nombre llama a alEmpezar con nombre y destino y muestra «Preparando el ejemplo…» mientras espera', async () => {
  let terminar;
  const { contenedor, inicio, llamadas } = armar({ alEmpezar: () => new Promise((r) => { terminar = r; }) });
  inicio.dibujar();
  const formulario = contenedor.querySelector('form');
  const boton = contenedor.querySelector('button[type="submit"]');
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, []);
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'Escribe tu nombre para empezar.');
  escribir(contenedor.querySelector('#inicio-estudiante'), '  Camila R. ');
  contenedor.querySelector('input[name="destino"][value="venta"]').checked = true;
  formulario.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  assert.deepEqual(llamadas, [['empezar', { estudiante: 'Camila R.', destino: 'venta' }]]);
  assert.equal(boton.disabled, true);
  assert.equal(boton.textContent, 'Preparando el ejemplo…');
  terminar();
  contenedor.remove();
});

test('si el ejemplo no se pudo preparar, muestra el error y vuelve a habilitar Empezar', async () => {
  const { contenedor, inicio } = armar({ alEmpezar: async () => { throw new Error('No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.'); } });
  inicio.dibujar();
  escribir(contenedor.querySelector('#inicio-estudiante'), 'Camila R.');
  contenedor.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 0));
  const boton = contenedor.querySelector('button[type="submit"]');
  assert.equal(boton.disabled, false);
  assert.equal(boton.textContent, 'Empezar');
  assert.equal(contenedor.querySelector('.inicio-error').textContent, 'No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.');
  contenedor.remove();
});

test('sin biblioteca no se puede armar el ejemplo: Empezar queda deshabilitado y se ofrece abrir una copia', () => {
  const { contenedor, inicio } = armar({ ejemploDisponible: false });
  inicio.dibujar();
  assert.equal(contenedor.querySelector('button[type="submit"]').disabled, true);
  assert.equal(contenedor.querySelector('.inicio-sin-ejemplo').textContent, 'No se puede preparar el juego de ejemplo porque la biblioteca no está disponible. Si tienes una copia de tu proyecto, ábrela.');
  assert.ok(contenedor.querySelector('[data-accion="abrir-copia"]'));
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
