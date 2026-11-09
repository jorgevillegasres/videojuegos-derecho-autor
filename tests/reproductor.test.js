// tests/reproductor.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, teclear, textos } from './ayudas/dom.js';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { jugar } from '../plataforma/js/motor/reproductor.js';

instalarDom();

// Muelle: narración, diálogo (efecto + voz), decisión → Torre | Playa. Torre: fin. Playa: diálogo con otra voz, narración.
function armar(opciones = {}) {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' });
  const muelle = p.juego.escenas[0];
  const torre = agregarEscena(p, 'La torre');
  const playa = agregarEscena(p, 'La playa');
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const el = (tipo, nombre) => agregarElemento(p, { tipo, nombre, archivo: `${nombre}.bin`, origen: 'subido' });
  const tema = el('musica', 'tema');
  const olas = el('efecto', 'olas');
  const voz1 = el('voz', 'voz1');
  const voz2 = el('voz', 'voz2');
  muelle.musica = tema.id;
  playa.musica = tema.id;
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?', efecto: olas.id, voz: voz1.id });
  agregarLinea(muelle, 'decision', { texto: '¿Subes?', opciones: [{ texto: 'Sí', escena: torre.id }, { texto: 'No', escena: playa.id }] });
  agregarLinea(torre, 'fin', { texto: 'Fin.' });
  agregarLinea(playa, 'dialogo', { personaje: ana.id, texto: 'Arena.', voz: voz2.id });
  agregarLinea(playa, 'narracion', { texto: 'Sin voz.' });
  const registro = [];
  const crearAudio = (url) => ({
    url, loop: false,
    play() { registro.push(['play', url, this.loop]); return Promise.resolve(); },
    pause() { registro.push(['pause', url]); },
  });
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const juego = jugar(contenedor, p.juego, (id) => `blob:${p.juego.elementos.find((e) => e.id === id)?.nombre ?? id}`, { crearAudio, creditos: ['Camila R.: autora', 'Tema: alguien'], ...opciones });
  const texto = () => contenedor.querySelector('.escenario-texto').textContent;
  const escena = () => contenedor.querySelector('.reproductor-escena');
  const raiz = () => contenedor.querySelector('.reproductor');
  return { p, contenedor, juego, registro, texto, escena, raiz };
}

test('jugar dibuja la primera línea, pone la música en bucle y deja el foco en el reproductor', () => {
  const { contenedor, registro, texto, raiz } = armar();
  assert.equal(texto(), 'Niebla.');
  assert.equal(contenedor.querySelector('.reproductor-titulo').textContent, 'La llave del faro');
  assert.deepEqual(registro, [['play', 'blob:tema', true]]);
  assert.equal(document.activeElement, raiz());
  assert.equal(contenedor.querySelector('button[data-accion="cerrar"]'), null, 'sin alCerrar no hay botón Cerrar');
  contenedor.remove();
});

test('clic, Espacio y Enter avanzan; el efecto y la voz suenan al llegar; las teclas 1 a 4 eligen', () => {
  const { contenedor, registro, texto, escena, raiz } = armar();
  clic(escena());
  assert.equal(texto(), '¿Quién?');
  assert.deepEqual(registro.slice(1), [['play', 'blob:olas', false], ['play', 'blob:voz1', false]]);
  teclear(raiz(), ' ');
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'Espacio llega a la decisión');
  teclear(raiz(), 'Enter');
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'en una decisión Enter no avanza');
  clic(escena());
  assert.equal(contenedor.querySelectorAll('.escenario-opciones button').length, 2, 'ni el clic');
  teclear(raiz(), '2');
  assert.equal(texto(), 'Arena.');
  assert.deepEqual(registro.at(-1), ['play', 'blob:voz2', false], 'la voz nueva corta la anterior y suena');
  assert.ok(registro.some((r) => r[0] === 'pause' && r[1] === 'blob:voz1'), 'la voz anterior se pausó');
  assert.equal(registro.filter((r) => r[1] === 'blob:tema').length, 1, 'la misma música no se reinicia al cambiar de escena');
  contenedor.remove();
});

test('la voz sigue sonando al pasar a una línea sin voz', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' '); teclear(raiz(), ' '); teclear(raiz(), '2');
  const antes = registro.length;
  teclear(raiz(), ' ');
  assert.equal(texto(), 'Sin voz.');
  assert.deepEqual(registro.slice(antes), [], 'ni se pausa la voz ni suena nada nuevo');
  contenedor.remove();
});

test('al terminar se muestran los créditos, se apaga la música y Reiniciar vuelve al inicio', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' '); teclear(raiz(), ' '); teclear(raiz(), '1');
  assert.equal(texto(), 'Fin.');
  teclear(raiz(), 'Enter');
  assert.deepEqual(textos(contenedor, '.escenario-creditos li'), ['Camila R.: autora', 'Tema: alguien']);
  assert.equal(registro.filter((r) => r[0] === 'pause' && r[1] === 'blob:tema').length, 1, 'la música se apagó al entrar a la torre, que no tiene música');
  assert.deepEqual(registro.at(-1), ['pause', 'blob:voz1'], 'la voz que seguía sonando se corta en los créditos');
  assert.equal(contenedor.querySelector('button[data-accion="creditos"]').hidden, true);
  assert.equal(contenedor.querySelector('button[data-accion="volver"]').hidden, true, 'terminado el juego no hay a dónde volver');
  clic(contenedor.querySelector('button[data-accion="reiniciar"]'));
  assert.equal(texto(), 'Niebla.');
  assert.deepEqual(registro.at(-1), ['play', 'blob:tema', true]);
  contenedor.remove();
});

test('el botón Créditos abre los créditos en cualquier momento y Volver regresa a la misma línea sin repetir el efecto', () => {
  const { contenedor, registro, texto, raiz } = armar();
  teclear(raiz(), ' ');
  const antes = registro.length;
  clic(contenedor.querySelector('button[data-accion="creditos"]'));
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'));
  assert.equal(contenedor.querySelector('button[data-accion="volver"]').hidden, false);
  teclear(raiz(), ' ');
  assert.ok(contenedor.querySelector('.escenario').classList.contains('en-creditos'), 'en los créditos Espacio no hace nada');
  clic(contenedor.querySelector('button[data-accion="volver"]'));
  assert.equal(texto(), '¿Quién?');
  const despues = registro.slice(antes).filter((r) => r[0] === 'play').map((r) => r[1]);
  assert.deepEqual(despues, ['blob:tema'], 'vuelve la música; el efecto y la voz no se repiten');
  contenedor.remove();
});

test('con alCerrar hay botón Cerrar y Escape; cerrar detiene el audio y vacía el contenedor; los botones no avanzan', () => {
  let cerrado = 0;
  const { contenedor, registro, texto, raiz } = armar({ alCerrar: () => { cerrado += 1; } });
  clic(contenedor.querySelector('button[data-accion="creditos"]'));
  clic(contenedor.querySelector('button[data-accion="volver"]'));
  assert.equal(texto(), 'Niebla.', 'pulsar botones de la barra no avanza la partida');
  teclear(raiz(), 'Escape');
  assert.equal(cerrado, 1);
  assert.equal(contenedor.childNodes.length, 0);
  assert.deepEqual(registro.at(-1), ['pause', 'blob:tema']);
  contenedor.remove();
});

test('alTerminar se llama una vez al llegar a los créditos, y otra vez tras reiniciar', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  agregarLinea(p.juego.escenas[0], 'narracion', { texto: 'Niebla.' });
  agregarLinea(p.juego.escenas[0], 'fin', { texto: 'Fin.' });
  const juego = p.juego;
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  let terminadas = 0;
  const { raiz } = jugar(contenedor, juego, () => null, { alTerminar: () => { terminadas += 1; }, crearAudio: () => ({ play() {}, pause() {} }) });
  const escena = raiz.querySelector('.reproductor-escena');
  for (let i = 0; i < 10 && !raiz.querySelector('.escenario-creditos:not([hidden])'); i += 1) clic(escena);
  assert.ok(raiz.querySelector('.escenario-creditos:not([hidden])'));
  clic(escena);
  assert.equal(terminadas, 1, 'quedarse en los créditos no vuelve a avisar');
  clic(raiz.querySelector('[data-accion="reiniciar"]'));
  for (let i = 0; i < 10 && !raiz.querySelector('.escenario-creditos:not([hidden])'); i += 1) clic(escena);
  assert.equal(terminadas, 2);
  contenedor.remove();
});
