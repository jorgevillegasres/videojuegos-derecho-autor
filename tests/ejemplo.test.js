// tests/ejemplo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ejemploArmado, catalogoReal, cargarDelDisco } from './ayudas/ejemplo.js';
import { crearEjemplo } from '../plataforma/js/guia/ejemplo.js';
import { PIEZAS_BIBLIOTECA, TEXTOS_MUESTRA, piezasDeMuestra } from '../plataforma/js/guia/muestra.js';
import { cumpleMinimo, validar } from '../plataforma/js/estado/validacion.js';
import { validarEstructura } from '../plataforma/js/estado/copias.js';
import { crearPartida, vistaActual, avanzar, elegir } from '../plataforma/js/motor/partida.js';

test('el ejemplo arma «La llave del faro»: tres escenas, dos personajes con retrato de muestra, tres piezas de biblioteca y la guía en la fase 0', async () => {
  const { proyecto, archivos } = await ejemploArmado({ estudiante: 'Camila R.', destino: 'venta' });
  const { juego } = proyecto;
  assert.equal(proyecto.estudiante, 'Camila R.');
  assert.equal(juego.titulo, TEXTOS_MUESTRA.titulo);
  assert.equal(juego.destino, 'venta');
  assert.deepEqual(juego.escenas.map((e) => e.nombre), ['El muelle', 'La torre', 'Amanecer']);
  assert.equal(juego.escenaInicial, juego.escenas[0].id);
  assert.deepEqual(juego.personajes.map((p) => [p.nombre, p.descripcion]), [['Ana', 'Farera en su primer turno.'], ['El farero', 'Lleva treinta años cuidando la luz.']]);
  const retratos = juego.personajes.map((p) => juego.elementos.find((e) => e.id === p.retrato));
  assert.deepEqual(retratos.map((e) => e.origen), ['muestra', 'muestra']);
  assert.deepEqual(juego.elementos.filter((e) => e.origen === 'biblioteca').map((e) => e.biblioteca.id), ['bib_f01', 'bib_m05', 'bib_e02']);
  for (const e of juego.elementos) assert.ok(archivos.get(e.id)?.datos.byteLength > 0, `${e.nombre} tiene archivo`);
  assert.deepEqual(proyecto.guia, { fase: 'conocer', jugado: false });
  assert.deepEqual(validarEstructura(proyecto), []);
  assert.deepEqual(validar(juego).filter((a) => a.nivel === 'bloqueante'), []);
  assert.equal(piezasDeMuestra(proyecto).total, 14);
});

test('el ejemplo cumple el mínimo salvo los retratos y las piezas de muestra', async () => {
  const { proyecto } = await ejemploArmado();
  assert.deepEqual(cumpleMinimo(proyecto).faltantes.map((f) => f.codigo), ['M_PERSONAJES', 'M_MUESTRA']);
});

test('el ejemplo se juega con el motor hasta los créditos por las dos ramas', async () => {
  const { proyecto } = await ejemploArmado();
  for (const [opcion, final] of [[0, TEXTOS_MUESTRA.lineas[5]], [1, TEXTOS_MUESTRA.lineas[7]]]) {
    const partida = crearPartida(proyecto.juego);
    const vistos = [];
    for (let paso = 0; paso < 20 && vistaActual(partida).tipo !== 'creditos'; paso += 1) {
      const vista = vistaActual(partida);
      vistos.push(vista.texto);
      if (vista.tipo === 'decision') elegir(partida, opcion);
      else avanzar(partida);
    }
    assert.equal(vistaActual(partida).tipo, 'creditos');
    assert.equal(vistos.at(-1), final);
  }
});

test('las tres piezas del ejemplo existen en el catálogo real, con el título que nombra el error', async () => {
  const catalogo = await catalogoReal();
  for (const { id, titulo } of Object.values(PIEZAS_BIBLIOTECA)) assert.equal(catalogo.piezaDe(id)?.titulo, titulo, id);
});

test('si falta una pieza en el catálogo, el ejemplo no se arma y el error la nombra', async () => {
  const real = await catalogoReal();
  const catalogo = { ...real, piezaDe: (id) => (id === 'bib_f01' ? null : real.piezaDe(id)) };
  await assert.rejects(crearEjemplo({ estudiante: 'Camila R.', destino: 'gratis' }, { catalogo, cargar: cargarDelDisco }), { message: 'No se pudo preparar el ejemplo: falta la pieza «Muelle de noche» de la biblioteca.' });
  await assert.rejects(crearEjemplo({ estudiante: 'Camila R.', destino: 'gratis' }, { catalogo: null, cargar: cargarDelDisco }), { message: 'No se pudo preparar el ejemplo: la biblioteca no está disponible.' });
});
