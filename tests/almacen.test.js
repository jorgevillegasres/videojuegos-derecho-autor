// tests/almacen.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen, traducirError } from '../plataforma/js/estado/almacen.js';
import { crearProyecto } from '../plataforma/js/estado/modelo.js';

let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `prueba-${Date.now()}-${contador++}` });

test('cargar devuelve null cuando no hay proyecto', async () => {
  const almacen = abrir();
  assert.equal(await almacen.cargar(), null);
  await almacen.cerrar();
});

test('guardar y cargar devuelven el mismo proyecto', async () => {
  const almacen = abrir();
  const proyecto = crearProyecto({ estudiante: 'Camila', titulo: 'Faro' });
  await almacen.guardar(proyecto);
  assert.deepEqual(await almacen.cargar(), proyecto);
  proyecto.juego.titulo = 'Faro 2';
  await almacen.guardar(proyecto);
  assert.equal((await almacen.cargar()).juego.titulo, 'Faro 2', 'guardar reemplaza, no duplica');
  await almacen.cerrar();
});

test('los archivos se guardan, leen, listan y borran por id', async () => {
  const almacen = abrir();
  const datos = new TextEncoder().encode('png falso').buffer;
  await almacen.guardarArchivo('el_1', { tipo: 'image/png', datos });
  const leido = await almacen.leerArchivo('el_1');
  assert.equal(leido.tipo, 'image/png');
  assert.equal(new TextDecoder().decode(leido.datos), 'png falso');
  assert.deepEqual(await almacen.listarArchivos(), ['el_1']);
  await almacen.borrarArchivo('el_1');
  assert.equal(await almacen.leerArchivo('el_1'), null);
  assert.deepEqual(await almacen.listarArchivos(), []);
  await almacen.cerrar();
});

test('borrarTodo vacía proyecto y archivos', async () => {
  const almacen = abrir();
  await almacen.guardar(crearProyecto({ titulo: 'x' }));
  await almacen.guardarArchivo('el_1', { tipo: 'audio/wav', datos: new ArrayBuffer(4) });
  await almacen.borrarTodo();
  assert.equal(await almacen.cargar(), null);
  assert.deepEqual(await almacen.listarArchivos(), []);
  await almacen.cerrar();
});

test('sin IndexedDB, abrirAlmacen explica el problema', () => {
  assert.throws(() => abrirAlmacen({ nombre: 'x', indexedDB: null }), /IndexedDB no disponible/);
});

test('guardar un archivo con el mismo id lo reemplaza y la lista sale ordenada', async () => {
  const almacen = abrir();
  const datos = (texto) => new TextEncoder().encode(texto).buffer;
  await almacen.guardarArchivo('c', { tipo: 'image/png', datos: datos('c') });
  await almacen.guardarArchivo('a', { tipo: 'image/png', datos: datos('a') });
  await almacen.guardarArchivo('b', { tipo: 'image/png', datos: datos('b') });
  await almacen.guardarArchivo('a', { tipo: 'image/webp', datos: datos('a2') });
  assert.deepEqual(await almacen.listarArchivos(), ['a', 'b', 'c']);
  const a = await almacen.leerArchivo('a');
  assert.equal(a.tipo, 'image/webp');
  assert.equal(new TextDecoder().decode(a.datos), 'a2');
  await almacen.cerrar();
});

test('guardarArchivo rechaza lo que no sea ArrayBuffer y las llamadas tras cerrar fallan', async () => {
  const almacen = abrir();
  await assert.rejects(almacen.guardarArchivo('x', { tipo: 'image/png', datos: 'texto' }), /ArrayBuffer/);
  await almacen.cerrar();
  await assert.rejects(almacen.cargar());
});

test('traducirError convierte la falta de espacio en un mensaje con código', () => {
  const e = traducirError({ name: 'QuotaExceededError' });
  assert.equal(e.codigo, 'sin_espacio');
  assert.match(e.message, /Guarda una copia/);
  assert.equal(traducirError(null).message, 'Transacción cancelada');
  const otro = new Error('x');
  assert.equal(traducirError(otro), otro);
});

test('reemplazarTodo deja exactamente el proyecto y los archivos nuevos', async () => {
  const almacen = abrir();
  await almacen.guardar(crearProyecto({ titulo: 'viejo' }));
  await almacen.guardarArchivo('viejo_1', { tipo: 'image/png', datos: new ArrayBuffer(2) });
  const nuevo = crearProyecto({ titulo: 'nuevo' });
  const archivos = new Map([['n_1', { tipo: 'audio/wav', datos: new TextEncoder().encode('a').buffer }], ['n_2', { tipo: 'image/png', datos: new TextEncoder().encode('b').buffer }]]);
  await almacen.reemplazarTodo(nuevo, archivos);
  assert.equal((await almacen.cargar()).juego.titulo, 'nuevo');
  assert.deepEqual(await almacen.listarArchivos(), ['n_1', 'n_2']);
  const leidos = await almacen.leerArchivos();
  assert.deepEqual([...leidos.keys()], ['n_1', 'n_2']);
  assert.equal(leidos.get('n_1').tipo, 'audio/wav');
  assert.equal(new TextDecoder().decode(leidos.get('n_2').datos), 'b');
  await almacen.cerrar();
});

test('reemplazarTodo rechaza archivos que no sean ArrayBuffer sin tocar lo guardado; los errores de arranque llevan código', async () => {
  const almacen = abrir();
  await almacen.guardar(crearProyecto({ titulo: 'intacto' }));
  await assert.rejects(almacen.reemplazarTodo(crearProyecto({ titulo: 'x' }), new Map([['a', { tipo: 'image/png', datos: 'texto' }]])), /ArrayBuffer/);
  assert.equal((await almacen.cargar()).juego.titulo, 'intacto');
  await almacen.cerrar();
  try {
    abrirAlmacen({ nombre: 'x', indexedDB: null });
    assert.fail('debía lanzar');
  } catch (e) {
    assert.equal(e.codigo, 'sin_indexeddb');
  }
});
