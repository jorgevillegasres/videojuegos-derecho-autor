// tests/almacen.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
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
