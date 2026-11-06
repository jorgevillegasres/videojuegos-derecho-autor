// tests/sesion.test.js
import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { abrirAlmacen } from '../plataforma/js/estado/almacen.js';
import { crearProyecto, agregarEscena } from '../plataforma/js/estado/modelo.js';
import { crearSesion, CAMBIOS_PARA_RECORDAR } from '../plataforma/js/editor/sesion.js';

let contador = 0;
const abrir = () => abrirAlmacen({ nombre: `sesion-${Date.now()}-${contador++}` });

/** Temporizador controlado: correr() ejecuta lo pendiente. */
function reloj() {
  const pendientes = new Map();
  let n = 0;
  return {
    pendientes,
    planificar: (fn, ms) => { n += 1; pendientes.set(n, { fn, ms }); return n; },
    cancelar: (id) => pendientes.delete(id),
    correr() { const lista = [...pendientes.values()]; pendientes.clear(); for (const { fn } of lista) fn(); },
  };
}

const bytes = (texto) => new TextEncoder().encode(texto).buffer;

function armar(extra = {}) {
  const almacen = extra.almacen ?? abrir();
  const tiempo = reloj();
  const eventos = [];
  const liberadas = [];
  const sesion = crearSesion({
    proyecto: crearProyecto({ estudiante: 'Camila', titulo: 'Faro' }),
    almacen,
    planificar: tiempo.planificar,
    cancelar: tiempo.cancelar,
    crearUrl: (archivo) => `blob:${archivo.tipo}:${new TextDecoder().decode(archivo.datos)}`,
    liberarUrl: (url) => liberadas.push(url),
  });
  sesion.suscribir((evento) => eventos.push(evento));
  const tipos = () => eventos.map((e) => e.tipo);
  return { almacen, tiempo, sesion, eventos, tipos, liberadas };
}

test('cambiar aplica la mutación, devuelve lo creado, avisa con el detalle y guarda una sola vez tras la espera', async () => {
  const { almacen, tiempo, sesion, eventos, tipos } = armar();
  const escena = sesion.cambiar((p) => agregarEscena(p, 'Torre'), { origen: 'inventario', estructura: true });
  assert.equal(escena.nombre, 'Torre');
  sesion.cambiar((p) => { p.juego.titulo = 'Faro 2'; }, { origen: 'propiedades' });
  sesion.cambiar((p) => agregarEscena(p, 'Playa'));
  assert.deepEqual(eventos[0], { tipo: 'cambio', origen: 'inventario', estructura: true });
  assert.deepEqual(tipos(), ['cambio', 'cambio', 'cambio']);
  assert.equal(tiempo.pendientes.size, 1, 'tres cambios seguidos programan un solo guardado');
  assert.equal(await almacen.cargar(), null, 'todavía no se guardó');
  tiempo.correr();
  await sesion.esperarGuardado();
  const guardado = await almacen.cargar();
  assert.equal(guardado.juego.titulo, 'Faro 2');
  assert.equal(guardado.juego.escenas.length, 3);
  assert.deepEqual(tipos().filter((t) => t === 'guardado'), ['guardado']);
  assert.equal(sesion.cambiosSinCopia, 3);
  await almacen.cerrar();
});

test('guardarAhora cancela la espera y guarda de inmediato; marcarCopiaGuardada reinicia el contador', async () => {
  const { almacen, tiempo, sesion, tipos } = armar();
  sesion.cambiar((p) => { p.juego.titulo = 'Ya'; });
  await sesion.guardarAhora();
  assert.equal(tiempo.pendientes.size, 0);
  assert.equal((await almacen.cargar()).juego.titulo, 'Ya');
  assert.deepEqual(tipos(), ['cambio', 'guardado']);
  sesion.marcarCopiaGuardada();
  assert.equal(sesion.cambiosSinCopia, 0);
  await almacen.cerrar();
});

test('a los 50 cambios sin copia avisa una sola vez', () => {
  const { sesion, tipos } = armar({ almacen: { guardar: async () => {} } });
  for (let i = 0; i < CAMBIOS_PARA_RECORDAR + 5; i += 1) sesion.cambiar(() => {});
  const recordatorios = tipos().map((t, i) => [t, i]).filter(([t]) => t === 'recordatorio');
  assert.equal(recordatorios.length, 1);
  assert.equal(recordatorios[0][1], CAMBIOS_PARA_RECORDAR, 'justo después del evento del cambio 50');
});

test('agregarArchivo guarda en el almacén; resolverRecurso crea la URL una vez; quitar y reemplazar liberan', async () => {
  const { almacen, sesion, liberadas } = armar();
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('uno') });
  assert.equal((await almacen.leerArchivo('el_1')).tipo, 'image/png');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:uno');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:uno', 'misma URL la segunda vez');
  assert.equal(sesion.resolverRecurso('no_existe'), null);
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('dos') });
  assert.deepEqual(liberadas, ['blob:image/png:uno'], 'reemplazar el archivo libera la URL vieja');
  assert.equal(sesion.resolverRecurso('el_1'), 'blob:image/png:dos');
  await sesion.quitarArchivo('el_1');
  assert.equal(await almacen.leerArchivo('el_1'), null);
  assert.equal(sesion.archivos.has('el_1'), false);
  assert.deepEqual(liberadas, ['blob:image/png:uno', 'blob:image/png:dos']);
  assert.equal(sesion.resolverRecurso('el_1'), null);
  await almacen.cerrar();
});

test('si el almacén falla al guardar, la sesión avisa con el error y sigue viva', async () => {
  const fallo = Object.assign(new Error('No hay espacio'), { codigo: 'sin_espacio' });
  const almacen = { guardar: async () => { throw fallo; } };
  const { sesion, eventos } = armar({ almacen });
  sesion.cambiar((p) => { p.juego.titulo = 'x'; });
  await sesion.guardarAhora();
  assert.equal(eventos.at(-1).tipo, 'error');
  assert.equal(eventos.at(-1).error, fallo);
  sesion.cambiar((p) => { p.juego.titulo = 'y'; });
  assert.equal(sesion.proyecto.juego.titulo, 'y');
});

test('reemplazar cambia proyecto y archivos en el almacén, libera las URLs, reinicia el contador y avisa', async () => {
  const { almacen, sesion, tipos, liberadas } = armar();
  await sesion.agregarArchivo('el_1', { tipo: 'image/png', datos: bytes('uno') });
  sesion.resolverRecurso('el_1');
  sesion.cambiar((p) => { p.juego.titulo = 'Viejo'; });
  const nuevo = crearProyecto({ estudiante: 'Otra', titulo: 'Nuevo' });
  await sesion.reemplazar(nuevo, new Map([['el_9', { tipo: 'audio/ogg', datos: bytes('nueve') }]]));
  assert.equal(sesion.proyecto, nuevo);
  assert.equal((await almacen.cargar()).juego.titulo, 'Nuevo');
  assert.deepEqual(await almacen.listarArchivos(), ['el_9']);
  assert.deepEqual(liberadas, ['blob:image/png:uno']);
  assert.equal(sesion.resolverRecurso('el_1'), null);
  assert.equal(sesion.resolverRecurso('el_9'), 'blob:audio/ogg:nueve');
  assert.equal(sesion.cambiosSinCopia, 0);
  assert.equal(tipos().at(-1), 'reemplazo');
  await almacen.cerrar();
});
