// tests/subida.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
import { crearProyecto } from '../plataforma/js/estado/modelo.js';
import { crearSesion } from '../plataforma/js/editor/sesion.js';
import { mimeDe, validarSubida, nombreSugerido, subirElemento, TIPOS_POR_MEDIO, medioDeTipo } from '../plataforma/js/editor/subida.js';

const MB = 1024 * 1024;
let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `subida-${Date.now()}-${contador++}` });

/** Un File falso: solo lo que subida.js usa. */
const archivo = (name, type, size = 10) => ({
  name, type, size,
  arrayBuffer: async () => new TextEncoder().encode(`contenido de ${name}`).buffer,
});

function sesionDePrueba(almacen = abrir()) {
  return crearSesion({
    proyecto: crearProyecto({ titulo: 'Faro' }),
    almacen,
    planificar: () => 1,
    cancelar: () => {},
    crearUrl: (a) => `blob:${a.tipo}`,
    liberarUrl: () => {},
  });
}

test('mimeDe usa el tipo del navegador, normaliza sinónimos y cae a la extensión si no hay tipo', () => {
  assert.equal(mimeDe(archivo('a.png', 'image/png')), 'image/png');
  assert.equal(mimeDe(archivo('a.jpg', 'image/jpg')), 'image/jpeg');
  assert.equal(mimeDe(archivo('a.wav', 'audio/x-wav')), 'audio/wav');
  assert.equal(mimeDe(archivo('a.mp3', 'audio/mp3')), 'audio/mpeg');
  assert.equal(mimeDe(archivo('a.WEBP', '')), 'image/webp');
  assert.equal(mimeDe(archivo('a.ogg', 'audio/ogg; codecs=opus')), 'audio/ogg');
  assert.equal(mimeDe(archivo('raro', '')), 'application/octet-stream');
});

test('validarSubida acepta los formatos del spec y rechaza los demás y los que pasan el límite', () => {
  assert.deepEqual(validarSubida(archivo('f.png', 'image/png', 2 * MB)), { ok: true, mime: 'image/png', medio: 'imagen' });
  assert.deepEqual(validarSubida(archivo('m.mp3', 'audio/mpeg', 5 * MB)), { ok: true, mime: 'audio/mpeg', medio: 'audio' });
  assert.equal(validarSubida(archivo('w.webp', 'image/webp')).ok, true);
  const gif = validarSubida(archivo('a.gif', 'image/gif'));
  assert.equal(gif.ok, false);
  assert.match(gif.mensaje, /PNG, JPG o WebP/);
  assert.match(gif.mensaje, /MP3, OGG o WAV/);
  const grande = validarSubida(archivo('f.png', 'image/png', 2 * MB + 1));
  assert.equal(grande.ok, false);
  assert.match(grande.mensaje, /máximo para imágenes es 2 MB/);
  const audioGrande = validarSubida(archivo('m.ogg', 'audio/ogg', 7.5 * MB));
  assert.match(audioGrande.mensaje, /pesa 7\.5 MB y el máximo para audio es 5 MB/);
});

test('nombreSugerido limpia el nombre del archivo; medioDeTipo dice qué medio pide cada tipo de elemento', () => {
  assert.equal(nombreSugerido('fondo_muelle-noche.png'), 'fondo muelle noche');
  assert.equal(nombreSugerido('  .png'), 'Sin nombre');
  assert.equal(nombreSugerido(undefined), 'Sin nombre');
  assert.deepEqual(TIPOS_POR_MEDIO, { imagen: ['fondo', 'retrato'], audio: ['musica', 'efecto', 'voz'] });
  assert.equal(medioDeTipo('retrato'), 'imagen');
  assert.equal(medioDeTipo('voz'), 'audio');
  assert.equal(medioDeTipo('otro'), null);
});

test('subirElemento da de alta el elemento con origen subido, su ficha y su archivo', async () => {
  const almacen = abrir();
  const sesion = sesionDePrueba(almacen);
  const eventos = [];
  sesion.suscribir((e) => eventos.push(e));
  const elemento = await subirElemento(sesion, archivo('muelle_noche.PNG', 'image/png'), { tipo: 'fondo' });
  assert.equal(elemento.tipo, 'fondo');
  assert.equal(elemento.origen, 'subido');
  assert.equal(elemento.nombre, 'muelle noche');
  assert.equal(elemento.archivo, `${elemento.id}.png`);
  assert.equal(elemento.sello, null);
  assert.equal(sesion.proyecto.juego.elementos[0], elemento);
  assert.equal(sesion.proyecto.fichas[elemento.id].origen, 'subido');
  const guardado = await almacen.leerArchivo(elemento.id);
  assert.equal(guardado.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(guardado.datos), 'contenido de muelle_noche.PNG');
  assert.equal(sesion.resolverRecurso(elemento.id), 'blob:image/png');
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'subida', estructura: true });
  const conNombre = await subirElemento(sesion, archivo('v.ogg', 'audio/ogg'), { tipo: 'voz', nombre: 'Voz de Ana' });
  assert.equal(conNombre.nombre, 'Voz de Ana');
  assert.equal(conNombre.archivo, `${conNombre.id}.ogg`);
  await assert.rejects(subirElemento(sesion, archivo('f.png', 'image/png'), { tipo: 'musica' }), (e) => e.codigo === 'subida' && /imagen no puede ser musica/.test(e.message));
  await assert.rejects(subirElemento(sesion, archivo('x.gif', 'image/gif'), { tipo: 'fondo' }), (e) => e.codigo === 'subida');
  assert.equal(sesion.proyecto.juego.elementos.length, 2, 'los rechazos no agregan nada');
  await almacen.cerrar();
});

test('si el almacén no puede guardar el archivo, el elemento se retira y el error se propaga', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const almacen = { guardar: async () => {}, guardarArchivo: async () => { throw fallo; }, borrarArchivo: async () => {} };
  const sesion = sesionDePrueba(almacen);
  await assert.rejects(subirElemento(sesion, archivo('f.png', 'image/png'), { tipo: 'fondo' }), (e) => e === fallo);
  assert.deepEqual(sesion.proyecto.juego.elementos, []);
  assert.deepEqual(Object.keys(sesion.proyecto.fichas), ['titulo', 'historia']);
});
