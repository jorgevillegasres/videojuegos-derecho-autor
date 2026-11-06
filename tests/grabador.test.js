// tests/grabador.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, escribir } from './ayudas/dom.js';
import { cabeceraWav } from '../scripts/png-wav.js';
import { crearGrabador, MAXIMO_SEGUNDOS } from '../plataforma/js/herramientas/grabador.js';

instalarDom();
const tick = () => new Promise((r) => setTimeout(r, 0));

function armar({ microfono = 'ok', decodifica = true, alSubirEnSuLugar = null } = {}) {
  const registro = [];
  const temporizadores = [];
  const stream = { getTracks: () => [{ stop: () => registro.push('pista-parada') }] };
  class GrabadoraFalsa {
    constructor(flujo, opciones) { this.state = 'inactive'; this.mimeType = opciones.mimeType ?? ''; registro.push(['grabadora', this.mimeType]); }
    start() { this.state = 'recording'; registro.push('start'); }
    stop() { this.state = 'inactive'; registro.push('stop'); this.ondataavailable?.({ data: new Blob(['audio'], { type: this.mimeType }) }); this.onstop?.(); }
  }
  const contenedor = document.createElement('div');
  contenedor.hidden = true;
  document.body.append(contenedor);
  const herramienta = crearGrabador(contenedor, {
    pedirMicrofono: async () => { if (microfono === 'ok') return stream; throw new Error('Permission denied'); },
    crearGrabadora: (flujo, opciones) => new GrabadoraFalsa(flujo, opciones),
    formatoSoportado: (tipo) => tipo === 'audio/webm;codecs=opus' || tipo === 'audio/webm',
    decodificar: async () => { if (!decodifica) throw new Error('no se pudo'); return { muestras: Float32Array.from({ length: 100 }, (_, i) => (i % 10) / 10), frecuencia: 100 }; },
    crearAudio: (url) => { registro.push(['audio', url]); return { play: () => { registro.push('play'); return Promise.resolve(); }, pause: () => registro.push('pause') }; },
    crearUrl: () => { registro.push('crear-url'); return 'blob:grabacion'; },
    liberarUrl: (url) => registro.push(['liberar', url]),
    planificar: (fn, ms) => { temporizadores.push({ fn, ms }); return temporizadores.length; },
    cancelar: (id) => registro.push(['cancelar', id]),
    crearContexto: () => null,
  });
  const q = (s) => contenedor.querySelector(s);
  return { contenedor, herramienta, registro, temporizadores, q, alSubirEnSuLugar };
}

test('grabar pide el micrófono, usa el formato preferido y detener deja la grabación lista; guardar sin recorte devuelve el blob original', async () => {
  const { contenedor, herramienta, registro, q } = armar();
  const pendiente = herramienta.abrir();
  assert.equal(contenedor.hidden, false);
  assert.match(q('.grabador-estado').textContent, /Pulsa Grabar/);
  assert.equal(q('[data-accion="detener"]').disabled, true);
  assert.equal(q('[data-accion="guardar"]').disabled, true);
  assert.equal(document.activeElement, q('[data-accion="grabar"]'));
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.deepEqual(registro.slice(0, 2), [['grabadora', 'audio/webm;codecs=opus'], 'start']);
  assert.match(q('.grabador-estado').textContent, /Grabando/);
  assert.equal(q('[data-accion="grabar"]').disabled, true);
  clic(q('[data-accion="detener"]'));
  await tick();
  assert.ok(registro.includes('pista-parada'));
  assert.match(q('.grabador-estado').textContent, /Grabación lista/);
  assert.equal(q('.grabador-tiempo').textContent, '1.0 s');
  assert.equal(q('[data-accion="recorte-fin"]').value, '1.0');
  assert.equal(q('[data-accion="guardar"]').disabled, false);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/webm;codecs=opus');
  assert.equal(await blob.text(), 'audio');
  assert.equal(contenedor.hidden, true);
});

test('con las manijas movidas, guardar decodifica, recorta, remuestrea y entrega un WAV', async () => {
  const { herramienta, q } = armar();
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  clic(q('[data-accion="detener"]'));
  await tick();
  escribir(q('[data-accion="recorte-inicio"]'), '0.25');
  escribir(q('[data-accion="recorte-fin"]'), '0.75');
  assert.match(q('.grabador-tiempo').textContent, /recorte: 0\.3 a 0\.8 s|recorte: 0\.2 a 0\.8 s|recorte: 0\.3 a 0\.7 s|recorte: 0\.2 a 0\.7 s/);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/wav');
  const cabecera = cabeceraWav(new Uint8Array(await blob.arrayBuffer()));
  assert.equal(cabecera.frecuencia, 22050);
  assert.equal(cabecera.muestras, Math.round(50 * (22050 / 100)), 'medio segundo remuestreado a 22050');
});

test('si el micrófono falla, explica cómo permitirlo y ofrece subir un archivo en su lugar', async () => {
  const llamadas = [];
  const { herramienta, q } = armar({ microfono: 'negado', alSubirEnSuLugar: () => llamadas.push('subir') });
  const pendiente = herramienta.abrir({ alSubirEnSuLugar: () => llamadas.push('subir') });
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.equal(q('.grabador-error').hidden, false);
  assert.match(q('.grabador-error').textContent, /Permission denied/);
  assert.match(q('.grabador-error').textContent, /Permite el micrófono para este sitio/);
  clic(q('[data-accion="subir"]'));
  assert.equal(await pendiente, null);
  assert.deepEqual(llamadas, ['subir']);
  const sinOpcion = armar({ microfono: 'negado' });
  const otra = sinOpcion.herramienta.abrir();
  clic(sinOpcion.q('[data-accion="grabar"]'));
  await tick();
  assert.equal(sinOpcion.q('[data-accion="subir"]'), null, 'sin alternativa no hay botón');
  clic(sinOpcion.q('[data-accion="cancelar"]'));
  assert.equal(await otra, null);
});

test('a los treinta segundos se detiene sola; si no se puede decodificar, se guarda completa sin recorte', async () => {
  const { herramienta, temporizadores, registro, q } = armar({ decodifica: false });
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  assert.equal(temporizadores.length, 1);
  assert.equal(temporizadores[0].ms, MAXIMO_SEGUNDOS * 1000);
  temporizadores[0].fn();
  await tick();
  assert.ok(registro.includes('stop'));
  assert.match(q('.grabador-estado').textContent, /No se pudo analizar/);
  assert.equal(q('[data-accion="recorte-inicio"]').disabled, true);
  clic(q('[data-accion="guardar"]'));
  const blob = await pendiente;
  assert.equal(blob.type, 'audio/webm;codecs=opus');
});

test('escuchar reproduce la grabación; cancelar libera la URL, detiene y devuelve null; Escape también', async () => {
  const { contenedor, herramienta, registro, q } = armar();
  const pendiente = herramienta.abrir();
  clic(q('[data-accion="grabar"]'));
  await tick();
  clic(q('[data-accion="detener"]'));
  await tick();
  clic(q('[data-accion="escuchar"]'));
  assert.deepEqual(registro.slice(-3), ['crear-url', ['audio', 'blob:grabacion'], 'play']);
  clic(q('[data-accion="cancelar"]'));
  assert.equal(await pendiente, null);
  assert.ok(registro.some((r) => Array.isArray(r) && r[0] === 'liberar' && r[1] === 'blob:grabacion'));
  assert.equal(contenedor.childNodes.length, 0);
  const otra = herramienta.abrir();
  teclear(q('.grabador'), 'Escape');
  assert.equal(await otra, null);
});
