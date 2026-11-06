// tests/secuenciador.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { cabeceraWav } from '../scripts/png-wav.js';
import { crearSecuenciador } from '../plataforma/js/herramientas/secuenciador.js';

instalarDom();

function audioFalso() {
  const registro = [];
  const contexto = {
    destination: {},
    createBuffer: (canales, largo, frecuencia) => ({ canales, largo, frecuencia, datos: null, copyToChannel(muestras) { this.datos = muestras; } }),
    createBufferSource() {
      const fuente = { buffer: null, loop: false, connect: () => registro.push('connect'), start: () => registro.push(['start', fuente.buffer.largo, fuente.buffer.frecuencia, fuente.loop]), stop: () => registro.push('stop'), disconnect: () => {} };
      return fuente;
    },
    resume: async () => {},
    close: async () => { registro.push('close'); },
  };
  return { contexto, registro };
}

function armar() {
  const { contexto, registro } = audioFalso();
  let contextos = 0;
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearSecuenciador(contenedor, { crearAudioContext: () => { contextos += 1; return contexto; } });
  const q = (s) => contenedor.querySelector(s);
  const celda = (instrumento, paso) => q(`button[data-instrumento="${instrumento}"][data-paso="${paso}"]`);
  return { contenedor, herramienta, registro, contextos: () => contextos, q, celda };
}

test('abrir dibuja cuatro filas de dieciséis pasos, el tempo por defecto y Guardar deshabilitado; Cancelar devuelve null', async () => {
  const { contenedor, herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  assert.equal(contenedor.hidden, false);
  assert.equal(contenedor.querySelectorAll('.secuenciador-fila').length, 4);
  assert.equal(contenedor.querySelectorAll('button.paso').length, 64);
  assert.equal(celda('melodia', 0).textContent, '·');
  assert.equal(celda('percusion', 8).classList.contains('paso-compas'), true, 'el segundo compás se marca');
  assert.equal(q('[data-accion="tempo"]').value, '110');
  assert.equal(q('.secuenciador-tempo').textContent, '110 pulsos por minuto');
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  assert.equal(document.activeElement, celda('melodia', 0));
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.equal(contenedor.hidden, true);
});

test('las celdas suben de grado con clic, bajan con Mayús y flecha abajo, y la percusión alterna; Guardar entrega un WAV', async () => {
  const { herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('melodia', 2));
  assert.equal(celda('melodia', 2).textContent, '1');
  assert.equal(celda('melodia', 2).getAttribute('aria-pressed'), 'true');
  assert.match(celda('melodia', 2).getAttribute('aria-label'), /Melodía, paso 3: grado 1/);
  clic(celda('melodia', 2));
  assert.equal(celda('melodia', 2).textContent, '2');
  celda('melodia', 2).dispatchEvent(new window.MouseEvent('click', { bubbles: true, shiftKey: true }));
  assert.equal(celda('melodia', 2).textContent, '1');
  teclear(celda('melodia', 2), 'ArrowDown');
  assert.equal(celda('melodia', 2).textContent, '·');
  teclear(celda('bajo', 0), 'ArrowUp');
  assert.equal(celda('bajo', 0).textContent, '1');
  clic(celda('percusion', 4));
  assert.equal(celda('percusion', 4).textContent, '●');
  teclear(celda('percusion', 4), 'ArrowUp');
  assert.equal(celda('percusion', 4).textContent, '●', 'las flechas no cambian la percusión');
  assert.equal(q('[data-accion="guardar"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/wav');
  const cabecera = cabeceraWav(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(cabecera.frecuencia, 22050);
  assert.equal(cabecera.muestras, Math.round((60 / 110 / 2) * 22050) * 16);
});

test('Tocar en bucle crea el contexto una vez, arranca la fuente en bucle, se reinicia al editar y Parar la detiene', async () => {
  const { herramienta, registro, contextos, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('acorde', 0));
  clic(q('[data-accion="tocar"]'));
  assert.equal(contextos(), 1);
  assert.equal(q('[data-accion="tocar"]').getAttribute('aria-pressed'), 'true');
  assert.equal(q('[data-accion="tocar"]').textContent, 'Parar');
  assert.deepEqual(registro, ['connect', ['start', Math.round((60 / 110 / 2) * 22050) * 16, 22050, true]]);
  clic(celda('acorde', 4));
  assert.deepEqual(registro.slice(2), ['stop', 'connect', ['start', Math.round((60 / 110 / 2) * 22050) * 16, 22050, true]], 'editar reinicia el bucle');
  assert.equal(contextos(), 1, 'el contexto se reutiliza');
  clic(q('[data-accion="tocar"]'));
  assert.equal(registro.at(-1), 'stop');
  assert.equal(q('[data-accion="tocar"]').textContent, 'Tocar en bucle');
  clic(q('[data-accion="tocar"]'));
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.deepEqual(registro.slice(-2), ['stop', 'close'], 'cancelar para y cierra el contexto');
});

test('el tempo cambia la duración y se acota entre 80 y 160', async () => {
  const { herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('bajo', 0));
  escribir(q('[data-accion="tempo"]'), '140');
  assert.equal(q('.secuenciador-tempo').textContent, '140 pulsos por minuto');
  escribir(q('[data-accion="tempo"]'), '999');
  assert.equal(q('.secuenciador-tempo').textContent, '160 pulsos por minuto');
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(cabeceraWav(new Uint8Array(await blob.arrayBuffer())).muestras, Math.round((60 / 160 / 2) * 22050) * 16);
});

test('Limpiar vacía el patrón y deshabilita Guardar; Escape cancela', async () => {
  const { contenedor, herramienta, q, celda } = armar();
  const pendiente = herramienta.abrir();
  clic(celda('melodia', 1));
  clic(celda('percusion', 1));
  clic(q('[data-accion="limpiar"]'));
  assert.equal(celda('melodia', 1).textContent, '·');
  assert.equal(celda('percusion', 1).textContent, '·');
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  clic(q('[data-accion="guardar"]'));
  teclear(q('.secuenciador'), 'Escape');
  assert.equal(await pendiente, null);
  assert.equal(contenedor.childNodes.length, 0);
});
