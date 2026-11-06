// tests/creados.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sesionDePrueba } from './ayudas/sesion.js';
import { huellaSha256 } from '../plataforma/js/estado/archivos.js';
import { evaluar } from '../plataforma/js/juridico/semaforo.js';
import { crearElementoCreado, reemplazarArchivoCreado } from '../plataforma/js/editor/creados.js';

const blobDe = (texto, tipo) => new Blob([texto], { type: tipo });

test('crearElementoCreado mete el elemento con origen creado, sello con fecha y huella, archivo y ficha en verde', async () => {
  const { sesion, eventos } = sesionDePrueba();
  const ahora = new Date('2026-11-06T15:00:00Z');
  const elemento = await crearElementoCreado(sesion, blobDe('png falso', 'image/png'), { tipo: 'retrato', nombre: 'Retrato creado 1', ahora });
  assert.equal(elemento.origen, 'creado');
  assert.equal(elemento.tipo, 'retrato');
  assert.equal(elemento.nombre, 'Retrato creado 1');
  assert.equal(elemento.archivo, `${elemento.id}.png`);
  assert.equal(elemento.sello.fecha, '2026-11-06T15:00:00.000Z');
  assert.equal(elemento.sello.huella, await huellaSha256(new TextEncoder().encode('png falso')));
  const ficha = sesion.proyecto.fichas[elemento.id];
  assert.equal(ficha.origen, 'creado');
  assert.equal(ficha.prueba, 'sello');
  assert.equal(ficha.autoria, 'yo');
  assert.deepEqual(evaluar(ficha, { destino: 'venta' }), { color: 'verde', razones: [], notas: ['N_SELLO'] });
  const archivo = sesion.archivos.get(elemento.id);
  assert.equal(archivo.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(archivo.datos), 'png falso');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'herramienta', estructura: true });
  const wav = await crearElementoCreado(sesion, blobDe('wav', 'audio/wav'), { tipo: 'musica', nombre: 'Pista 1' });
  assert.equal(wav.archivo, `${wav.id}.wav`);
  const webm = await crearElementoCreado(sesion, blobDe('webm', 'audio/webm;codecs=opus'), { tipo: 'voz', nombre: 'Grabación 1' });
  assert.equal(webm.archivo, `${webm.id}.webm`);
  assert.equal(sesion.archivos.get(webm.id).tipo, 'audio/webm;codecs=opus');
});

test('si el almacén falla al guardar, el elemento se retira y el error se propaga', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const { sesion } = sesionDePrueba(undefined, { almacen: { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} } });
  await assert.rejects(crearElementoCreado(sesion, blobDe('x', 'image/png'), { tipo: 'fondo', nombre: 'Fondo creado 1' }), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});

test('reemplazarArchivoCreado cambia el archivo y recalcula el sello; con un id desconocido falla sin guardar nada', async () => {
  const { sesion } = sesionDePrueba();
  const elemento = await crearElementoCreado(sesion, blobDe('v1', 'image/png'), { tipo: 'fondo', nombre: 'Fondo creado 1', ahora: new Date('2026-11-06T15:00:00Z') });
  const huellaAntes = elemento.sello.huella;
  const cambiado = await reemplazarArchivoCreado(sesion, elemento.id, blobDe('v2', 'image/png'), { ahora: new Date('2026-11-06T16:00:00Z') });
  assert.equal(cambiado, elemento);
  assert.equal(elemento.sello.fecha, '2026-11-06T16:00:00.000Z');
  assert.notEqual(elemento.sello.huella, huellaAntes);
  assert.equal(elemento.sello.huella, await huellaSha256(new TextEncoder().encode('v2')));
  assert.equal(new TextDecoder().decode(sesion.archivos.get(elemento.id).datos), 'v2');
  await assert.rejects(reemplazarArchivoCreado(sesion, 'el_nadie', blobDe('v3', 'image/png')), /ya no existe/);
  assert.equal(sesion.archivos.has('el_nadie'), false);
});
