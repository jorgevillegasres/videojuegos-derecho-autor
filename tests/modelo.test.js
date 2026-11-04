// tests/modelo.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  crearProyecto, agregarEscena, eliminarEscena, agregarPersonaje, eliminarPersonaje,
  agregarElemento, eliminarElemento, crearLinea, agregarLinea, moverLinea,
} from '../plataforma/js/estado/modelo.js';

function proyectoBase() {
  return crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' }, new Date('2026-11-04T20:00:00Z'));
}

test('crearProyecto deja una escena inicial y las fichas de título e historia', () => {
  const p = proyectoBase();
  assert.equal(p.version, 1);
  assert.equal(p.estudiante, 'Camila R.');
  assert.equal(p.creado, '2026-11-04T20:00:00.000Z');
  assert.equal(p.juego.titulo, 'La llave del faro');
  assert.equal(p.juego.destino, 'gratis');
  assert.equal(p.juego.escenas.length, 1);
  assert.equal(p.juego.escenaInicial, p.juego.escenas[0].id);
  assert.deepEqual(p.juego.personajes, []);
  assert.deepEqual(p.juego.elementos, []);
  assert.equal(p.fichas.titulo.tipo, 'titulo');
  assert.equal(p.fichas.historia.tipo, 'historia');
  assert.deepEqual(p.registro, []);
  assert.equal(p.publicado, null);
  assert.throws(() => crearProyecto({ destino: 'alquiler' }), /Destino inválido/);
});

test('agregarEscena y eliminarEscena mantienen las referencias coherentes', () => {
  const p = proyectoBase();
  const inicial = p.juego.escenas[0];
  const torre = agregarEscena(p, 'La torre');
  assert.equal(p.juego.escenas.length, 2);
  assert.match(torre.id, /^esc_[a-f0-9]{8}$/);
  const decision = agregarLinea(inicial, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: null }] });
  eliminarEscena(p, torre.id);
  assert.equal(p.juego.escenas.length, 1);
  assert.equal(decision.opciones[0].escena, null, 'la opción que apuntaba a la escena borrada queda sin destino');
  eliminarEscena(p, inicial.id);
  assert.equal(p.juego.escenaInicial, null);
});

test('eliminar la escena inicial pasa el inicio a la siguiente', () => {
  const p = proyectoBase();
  const segunda = agregarEscena(p, 'Segunda');
  eliminarEscena(p, p.juego.escenaInicial);
  assert.equal(p.juego.escenaInicial, segunda.id);
});

test('agregarPersonaje crea su ficha y eliminarPersonaje la borra y limpia los diálogos', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana', descripcion: 'Farera' });
  assert.equal(p.fichas[ana.id].tipo, 'personaje');
  assert.equal(ana.retrato, null);
  const linea = agregarLinea(p.juego.escenas[0], 'dialogo', { personaje: ana.id, texto: 'Hola' });
  eliminarPersonaje(p, ana.id);
  assert.equal(p.juego.personajes.length, 0);
  assert.equal(p.fichas[ana.id], undefined);
  assert.equal(linea.personaje, null);
});

test('agregarElemento valida tipo y origen y crea la ficha con precargas', () => {
  const p = proyectoBase();
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'el_1.png', origen: 'creado', sello: { fecha: 'x', huella: 'sha256:abc' } });
  assert.equal(p.fichas[fondo.id].origen, 'creado');
  assert.equal(p.fichas[fondo.id].prueba, 'sello');
  const bib = { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: 'crédito' };
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'el_2.ogg', origen: 'biblioteca', biblioteca: bib });
  assert.equal(p.fichas[tema.id].licencia, 'CC-BY-NC-4.0');
  assert.equal(tema.biblioteca.id, 'bib_m1');
  assert.throws(() => agregarElemento(p, { tipo: 'video', nombre: 'x', archivo: 'x', origen: 'creado' }), /Tipo de elemento inválido/);
  assert.throws(() => agregarElemento(p, { tipo: 'fondo', nombre: 'x', archivo: 'x', origen: 'prestado' }), /Origen inválido/);
});

test('eliminarElemento limpia todas las referencias y la ficha', () => {
  const p = proyectoBase();
  const escena = p.juego.escenas[0];
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'r.png', origen: 'creado' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'f.png', origen: 'creado' });
  const musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'm.wav', origen: 'creado' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'creado' });
  ana.retrato = retrato.id;
  escena.fondo = fondo.id;
  escena.musica = musica.id;
  const linea = agregarLinea(escena, 'dialogo', { personaje: ana.id, texto: '…', efecto: olas.id, voz: olas.id });
  for (const el of [retrato, fondo, musica, olas]) eliminarElemento(p, el.id);
  assert.equal(p.juego.elementos.length, 0);
  assert.equal(ana.retrato, null);
  assert.equal(escena.fondo, null);
  assert.equal(escena.musica, null);
  assert.equal(linea.efecto, null);
  assert.equal(linea.voz, null);
  assert.equal(p.fichas[fondo.id], undefined);
});

test('crearLinea pone valores por defecto según el tipo', () => {
  assert.deepEqual(crearLinea('narracion'), { tipo: 'narracion', texto: '' });
  assert.deepEqual(crearLinea('dialogo'), { tipo: 'dialogo', personaje: null, texto: '', efecto: null, voz: null });
  assert.deepEqual(crearLinea('decision'), { tipo: 'decision', texto: '', opciones: [{ texto: '', escena: null }, { texto: '', escena: null }] });
  assert.deepEqual(crearLinea('fin', { texto: 'Fin' }), { tipo: 'fin', texto: 'Fin' });
  assert.throws(() => crearLinea('salto'), /Tipo de línea inválido/);
});

test('moverLinea reordena dentro de los límites', () => {
  const p = proyectoBase();
  const escena = p.juego.escenas[0];
  agregarLinea(escena, 'narracion', { texto: 'a' });
  agregarLinea(escena, 'narracion', { texto: 'b' });
  agregarLinea(escena, 'narracion', { texto: 'c' });
  moverLinea(escena, 0, 1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c']);
  moverLinea(escena, 2, 1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c'], 'no se sale del final');
  moverLinea(escena, 0, -1);
  assert.deepEqual(escena.lineas.map((l) => l.texto), ['b', 'a', 'c'], 'no se sale del inicio');
});

test('agregarElemento no deja un elemento huérfano si la ficha falla', () => {
  const p = proyectoBase();
  assert.throws(() => agregarElemento(p, { tipo: 'fondo', nombre: 'x', archivo: 'x.png', origen: 'biblioteca' }), /requiere la entrada de biblioteca/);
  assert.equal(p.juego.elementos.length, 0);
  assert.deepEqual(Object.keys(p.fichas), ['titulo', 'historia']);
});

test('eliminar un id inexistente no hace nada ni falla', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'f.png', origen: 'creado' });
  eliminarElemento(p, 'el_noexiste');
  eliminarPersonaje(p, 'per_noexiste');
  eliminarEscena(p, 'esc_noexiste');
  assert.equal(p.juego.elementos.length, 1);
  assert.equal(p.juego.personajes.length, 1);
  assert.equal(p.juego.escenas.length, 1);
  assert.ok(p.fichas[ana.id] && p.fichas[fondo.id]);
});

test('eliminar un personaje deja intactas las demás fichas; nombres vacíos por defecto', () => {
  const p = proyectoBase();
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const luis = agregarPersonaje(p);
  assert.equal(luis.nombre, '');
  assert.equal(agregarEscena(p).nombre, '');
  eliminarPersonaje(p, ana.id);
  assert.equal(p.fichas[luis.id].tipo, 'personaje');
  assert.equal(p.fichas.titulo.tipo, 'titulo');
});

// tests/modelo.test.js (agregar al final)
import { validar, escenasAlcanzables } from '../plataforma/js/estado/modelo.js';

function juegoConTresEscenas() {
  const p = proyectoBase();
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: 'Hola' });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: amanecer.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin' });
  agregarLinea(amanecer, 'narracion', { texto: 'Amanece.' });
  return { p, muelle, torre, amanecer, ana };
}

test('un juego bien armado no tiene avisos bloqueantes', () => {
  const { p } = juegoConTresEscenas();
  const avisos = validar(p.juego);
  assert.deepEqual(avisos.filter((a) => a.nivel === 'bloqueante'), []);
});

test('escenasAlcanzables sigue decisiones y el avance natural a la siguiente escena', () => {
  const { p, muelle, torre, amanecer } = juegoConTresEscenas();
  const extra = agregarEscena(p, 'Extra');
  agregarLinea(amanecer, 'narracion', { texto: 'sin decisión ni fin: sigue a la siguiente' });
  assert.deepEqual([...escenasAlcanzables(p.juego)].sort(), [muelle.id, torre.id, amanecer.id, extra.id].sort());
  agregarLinea(amanecer, 'fin', { texto: 'Fin' });
  assert.equal(escenasAlcanzables(p.juego).has(extra.id), false, 'con fin en Amanecer, Extra ya no se alcanza');
});

test('B01: sin escena inicial válida', () => {
  const { p } = juegoConTresEscenas();
  p.juego.escenaInicial = 'esc_noexiste';
  assert.ok(validar(p.juego).some((a) => a.codigo === 'B01' && a.nivel === 'bloqueante'));
});

test('B02: opción de decisión sin escena destino', () => {
  const { p, muelle } = juegoConTresEscenas();
  muelle.lineas[1].opciones[1].escena = null;
  const aviso = validar(p.juego).find((a) => a.codigo === 'B02');
  assert.equal(aviso.nivel, 'bloqueante');
  assert.equal(aviso.escena, muelle.id);
  assert.equal(aviso.linea, 1);
  assert.match(aviso.mensaje, /opción 2/);
});

test('B03: diálogo sin personaje', () => {
  const { p, muelle } = juegoConTresEscenas();
  muelle.lineas[0].personaje = null;
  assert.ok(validar(p.juego).some((a) => a.codigo === 'B03' && a.nivel === 'bloqueante'));
});

test('I01: escena inalcanzable', () => {
  const { p, amanecer } = juegoConTresEscenas();
  agregarLinea(amanecer, 'fin', { texto: 'Fin' });
  const perdida = agregarEscena(p, 'Perdida');
  const aviso = validar(p.juego).find((a) => a.codigo === 'I01');
  assert.equal(aviso.nivel, 'informativo');
  assert.equal(aviso.escena, perdida.id);
});

test('I02: personaje sin retrato; I03: escena sin líneas; I04: sin fin alcanzable; I05: líneas tras el corte', () => {
  const { p, torre, ana } = juegoConTresEscenas();
  const vacia = agregarEscena(p, 'Vacía');
  torre.lineas = [{ tipo: 'narracion', texto: 'Nunca termina' }];
  agregarLinea(p.juego.escenas[0], 'narracion', { texto: 'después de la decisión' });
  const codigos = validar(p.juego).map((a) => a.codigo);
  assert.ok(codigos.includes('I02'), 'Ana no tiene retrato');
  assert.ok(codigos.includes('I03'), `Vacía (${vacia.id}) no tiene líneas`);
  assert.ok(codigos.includes('I04'), 'ninguna escena alcanzable termina en fin');
  assert.ok(codigos.includes('I05'), 'hay una línea después de la decisión del muelle');
  assert.ok(!codigos.includes('B03'), `${ana.nombre} sigue existiendo`);
});
