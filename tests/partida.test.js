// tests/partida.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearPartida, vistaActual, vistaDeLinea, avanzar, elegir, reiniciar } from '../plataforma/js/motor/partida.js';

// Muelle: narración, diálogo (Ana, efecto, voz), decisión → Torre | Amanecer, narración oculta tras el corte.
// Torre: fin. Amanecer: narración sin corte (sigue con Vacía). Vacía: sin líneas (se salta). Final: narración, última de la lista.
function juegoDePrueba() {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const amanecer = agregarEscena(p, 'Amanecer');
  const vacia = agregarEscena(p, 'Vacía');
  const final = agregarEscena(p, 'Final');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'ana.png', origen: 'creado' });
  ana.retrato = retrato.id;
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'muelle.png', origen: 'creado' });
  const musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 'tema.ogg', origen: 'subido' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'olas.wav', origen: 'subido' });
  const voz = agregarElemento(p, { tipo: 'voz', nombre: 'Voz de Ana', archivo: 'ana.webm', origen: 'creado' });
  muelle.fondo = fondo.id;
  muelle.musica = musica.id;
  agregarLinea(muelle, 'narracion', { texto: 'La niebla cubre el muelle.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién dejó la puerta abierta?', efecto: olas.id, voz: voz.id });
  agregarLinea(muelle, 'decision', { texto: '¿Subes a la torre?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: '', escena: amanecer.id }] });
  agregarLinea(muelle, 'narracion', { texto: 'Nunca se ve.' });
  agregarLinea(torre, 'fin', { texto: 'Fin en la torre.' });
  agregarLinea(amanecer, 'narracion', { texto: 'Amanece.' });
  agregarLinea(final, 'narracion', { texto: 'Última escena de la lista.' });
  return { p, juego: p.juego, muelle, torre, amanecer, vacia, final, ana, retrato, fondo, musica, olas, voz };
}

test('la partida empieza en la primera línea de la escena inicial con su fondo y su música', () => {
  const { juego, muelle, fondo, musica } = juegoDePrueba();
  const partida = crearPartida(juego);
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'linea');
  assert.equal(vista.escena, muelle);
  assert.equal(vista.indice, 0);
  assert.equal(vista.texto, 'La niebla cubre el muelle.');
  assert.equal(vista.personaje, null);
  assert.equal(vista.retrato, null);
  assert.equal(vista.fondo, fondo.id);
  assert.equal(vista.musica, musica.id);
  assert.equal(vista.efecto, null);
  assert.equal(vista.voz, null);
});

test('un diálogo resuelve el personaje, su retrato, el efecto y la voz', () => {
  const { juego, ana, retrato, olas, voz } = juegoDePrueba();
  const partida = avanzar(crearPartida(juego));
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'linea');
  assert.equal(vista.personaje, ana);
  assert.equal(vista.retrato, retrato.id);
  assert.equal(vista.efecto, olas.id);
  assert.equal(vista.voz, voz.id);
  assert.equal(vista.texto, '¿Quién dejó la puerta abierta?');
});

test('una decisión detiene el avance; elegir lleva a la escena de la opción y lo que sigue al corte nunca se ve', () => {
  const { juego, torre } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida);
  avanzar(partida);
  const decision = vistaActual(partida);
  assert.equal(decision.tipo, 'decision');
  assert.deepEqual(decision.opciones.map((o) => o.texto), ['Sí', '']);
  avanzar(partida);
  assert.equal(vistaActual(partida).tipo, 'decision', 'avanzar no mueve una decisión');
  elegir(partida, 5);
  assert.equal(vistaActual(partida).tipo, 'decision', 'una opción inexistente se ignora');
  elegir(partida, 0);
  const vista = vistaActual(partida);
  assert.equal(vista.tipo, 'fin');
  assert.equal(vista.escena, torre);
  assert.equal(vista.texto, 'Fin en la torre.');
});

test('fin pasa a los créditos y los créditos no avanzan más', () => {
  const { juego } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 0);
  avanzar(partida);
  assert.deepEqual(vistaActual(partida), { tipo: 'creditos' });
  avanzar(partida);
  elegir(partida, 0);
  assert.deepEqual(vistaActual(partida), { tipo: 'creditos' });
});

test('una escena sin corte sigue con la siguiente de la lista, salta las vacías y la última termina en créditos', () => {
  const { juego, amanecer, final } = juegoDePrueba();
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 1);
  assert.equal(vistaActual(partida).escena, amanecer);
  avanzar(partida);
  assert.equal(vistaActual(partida).escena, final, 'la escena vacía se salta');
  assert.equal(vistaActual(partida).texto, 'Última escena de la lista.');
  avanzar(partida);
  assert.equal(vistaActual(partida).tipo, 'creditos');
});

test('una opción con destino inexistente termina el juego con los créditos', () => {
  const { juego, muelle } = juegoDePrueba();
  muelle.lineas[2].opciones[0].escena = 'esc_fantasma';
  const partida = crearPartida(juego);
  avanzar(partida); avanzar(partida); elegir(partida, 0);
  assert.equal(vistaActual(partida).tipo, 'creditos');
});

test('sin escena inicial válida la partida va directo a los créditos; reiniciar vuelve al inicio elegido', () => {
  const { juego, torre } = juegoDePrueba();
  const rota = crearPartida({ ...juego, escenaInicial: null });
  assert.equal(vistaActual(rota).tipo, 'creditos');
  const desdeTorre = crearPartida(juego, { escenaInicial: torre.id });
  assert.equal(vistaActual(desdeTorre).tipo, 'fin');
  avanzar(desdeTorre);
  assert.equal(vistaActual(desdeTorre).tipo, 'creditos');
  reiniciar(desdeTorre);
  assert.equal(vistaActual(desdeTorre).escena, torre, 'reiniciar respeta la escena inicial pedida');
  const normal = crearPartida(juego);
  avanzar(normal); avanzar(normal); elegir(normal, 0);
  reiniciar(normal);
  assert.equal(vistaActual(normal).indice, 0);
  assert.equal(vistaActual(normal).escena.nombre, 'El muelle');
});

test('vistaDeLinea sirve para la vista previa: línea concreta o escena vacía', () => {
  const { juego, muelle, vacia, fondo } = juegoDePrueba();
  const decision = vistaDeLinea(juego, muelle, 2);
  assert.equal(decision.tipo, 'decision');
  assert.equal(decision.fondo, fondo.id);
  assert.equal(vistaDeLinea(juego, muelle, 1).personaje.nombre, 'Ana');
  const sinLineas = vistaDeLinea(juego, vacia, 0);
  assert.equal(sinLineas.tipo, 'vacia');
  assert.equal(sinLineas.escena, vacia);
  assert.equal(vistaDeLinea(juego, muelle, 99).tipo, 'vacia', 'un índice fuera de rango también es vacía');
});
