// tests/validacion.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, agregarEscena, agregarPersonaje, agregarLinea, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { validar, escenasAlcanzables, cumpleMinimo, MINIMO, puedePublicar, nombreDe } from '../plataforma/js/estado/validacion.js';
import { evaluarTodo } from '../plataforma/js/juridico/semaforo.js';

function proyectoBase() {
  return crearProyecto({ estudiante: 'Camila R.', titulo: 'La llave del faro', destino: 'gratis' }, new Date('2026-11-04T20:00:00Z'));
}

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

test('B04: una decisión necesita entre dos y cuatro opciones', () => {
  const { p, muelle, torre } = juegoConTresEscenas();
  muelle.lineas[1].opciones = [{ texto: 'Única', escena: torre.id }];
  let aviso = validar(p.juego).find((a) => a.codigo === 'B04');
  assert.equal(aviso.nivel, 'bloqueante');
  assert.equal(aviso.escena, muelle.id);
  assert.equal(aviso.linea, 1);
  muelle.lineas[1].opciones = Array.from({ length: 5 }, (_, i) => ({ texto: `Opción ${i + 1}`, escena: torre.id }));
  aviso = validar(p.juego).find((a) => a.codigo === 'B04');
  assert.ok(aviso, 'cinco opciones también se bloquean');
  muelle.lineas[1].opciones = Array.from({ length: 4 }, (_, i) => ({ texto: `Opción ${i + 1}`, escena: torre.id }));
  assert.ok(!validar(p.juego).some((a) => a.codigo === 'B04'), 'cuatro opciones están bien');
});

test('con B01 no se agregan I01 ni I04 de rebote', () => {
  const { p } = juegoConTresEscenas();
  p.juego.escenaInicial = null;
  const codigos = validar(p.juego).map((a) => a.codigo);
  assert.ok(codigos.includes('B01'));
  assert.ok(!codigos.includes('I01'));
  assert.ok(!codigos.includes('I04'));
  assert.equal(escenasAlcanzables(p.juego).size, 0);
});

test('escenasAlcanzables termina con ciclos y validar no muta el juego', () => {
  const { p, muelle, torre } = juegoConTresEscenas();
  torre.lineas = [];
  agregarLinea(torre, 'decision', { texto: '¿Volver?', opciones: [{ texto: 'Sí', escena: muelle.id }, { texto: 'No', escena: muelle.id }] });
  const antes = structuredClone(p.juego);
  const alcanzables = escenasAlcanzables(p.juego);
  assert.ok(alcanzables.has(muelle.id) && alcanzables.has(torre.id));
  validar(p.juego);
  assert.deepEqual(p.juego, antes);
});

test('I05 señala la primera línea que no se verá y las escenas sin nombre se describen por posición', () => {
  const { p, muelle } = juegoConTresEscenas();
  agregarLinea(muelle, 'narracion', { texto: 'después' });
  const i05 = validar(p.juego).find((a) => a.codigo === 'I05');
  assert.equal(i05.linea, 2);
  const sinNombre = agregarEscena(p);
  const i03 = validar(p.juego).find((a) => a.codigo === 'I03' && a.escena === sinNombre.id);
  assert.match(i03.mensaje, /sin nombre \(n\.º 4\)/);
});


function juegoMinimoCompleto() {
  const { p, muelle, torre, amanecer } = juegoConTresEscenas();
  const ana = p.juego.personajes[0];
  const far = agregarPersonaje(p, { nombre: 'El farero' });
  ana.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'creado' }).id;
  far.retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Farero', archivo: 'f.png', origen: 'creado' }).id;
  muelle.fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' }).id;
  const bib = { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-NC-4.0', creditoSugerido: 'crédito' };
  muelle.musica = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'biblioteca', biblioteca: bib }).id;
  agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'creado' });
  return { p, muelle, torre, amanecer };
}

test('MINIMO refleja la tabla del spec', () => {
  assert.deepEqual(MINIMO, { escenas: 3, personajesConRetrato: 2, decisiones: 1, fondos: 1, musica: 1, efectos: 1, ajenos: 1 });
});

test('un juego que cumple el mínimo pasa', () => {
  const { p } = juegoMinimoCompleto();
  assert.deepEqual(cumpleMinimo(p), { ok: true, faltantes: [] });
});

test('cumpleMinimo lista cada carencia con actual y requerido', () => {
  const p = proyectoBase();
  p.juego.titulo = '  ';
  const { ok, faltantes } = cumpleMinimo(p);
  assert.equal(ok, false);
  const porCodigo = Object.fromEntries(faltantes.map((f) => [f.codigo, f]));
  assert.deepEqual(Object.keys(porCodigo).sort(), ['M_AJENOS', 'M_DECISIONES', 'M_EFECTOS', 'M_ESCENAS', 'M_FONDOS', 'M_MUSICA', 'M_PERSONAJES', 'M_TITULO']);
  assert.equal(porCodigo.M_ESCENAS.actual, 1);
  assert.equal(porCodigo.M_ESCENAS.requerido, 3);
  assert.equal(porCodigo.M_TITULO.actual, 0);
});

test('un elemento de otra persona cuenta como ajeno aunque no sea de biblioteca', () => {
  const { p } = juegoMinimoCompleto();
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  tema.origen = 'subido';
  p.fichas[tema.id].autoria = 'yo';
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_AJENOS'));
  p.fichas[tema.id].autoria = 'otra_persona';
  assert.equal(cumpleMinimo(p).ok, true);
});

test('un personaje sin retrato no cuenta', () => {
  const { p } = juegoMinimoCompleto();
  p.juego.personajes[1].retrato = null;
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_PERSONAJES' && f.actual === 1));
});

test('una decisión con una sola opción no cuenta para el mínimo', () => {
  const { p, muelle } = juegoMinimoCompleto();
  muelle.lineas[1].opciones = [{ texto: 'Única', escena: p.juego.escenas[1].id }];
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_DECISIONES' && f.actual === 0));
  p.juego.titulo = null;
  assert.ok(cumpleMinimo(p).faltantes.some((f) => f.codigo === 'M_TITULO' && f.mensaje === 'Título del juego'));
});


function dejarTodoEnVerde(p) {
  for (const ficha of Object.values(p.fichas)) {
    if (ficha.origen === 'biblioteca') ficha.licenciaLeida = true;
    if (ficha.origen === 'subido' && ficha.autoria === 'yo') ficha.prueba = 'original';
  }
}

test('evaluarTodo devuelve un resultado por ficha con el destino del juego', () => {
  const { p } = juegoMinimoCompleto();
  const semaforos = evaluarTodo(p);
  assert.equal(semaforos.size, Object.keys(p.fichas).length);
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  assert.equal(semaforos.get(tema.id).color, 'amarillo', 'la licencia de biblioteca no se ha leído');
  assert.equal(semaforos.get('titulo').color, 'verde');
});

test('nombreDe da un nombre legible para cualquier ficha', () => {
  const { p } = juegoMinimoCompleto();
  assert.equal(nombreDe(p, 'titulo'), 'Título del juego');
  assert.equal(nombreDe(p, 'historia'), 'Historia');
  assert.equal(nombreDe(p, p.juego.personajes[0].id), 'Ana');
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  assert.equal(nombreDe(p, tema.id), 'Tema');
  assert.equal(nombreDe(p, 'el_noexiste'), 'el_noexiste');
});

test('puedePublicar exige semáforos en verde, mínimo cumplido y sin bloqueantes', () => {
  const { p, muelle } = juegoMinimoCompleto();
  let decision = puedePublicar(p);
  assert.equal(decision.ok, false);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_SEMAFORO' && /Tema/.test(m.mensaje)));

  dejarTodoEnVerde(p);
  decision = puedePublicar(p);
  assert.deepEqual(decision, { ok: true, motivos: [], resumen: { semaforo: 0, minimo: 0, bloqueantes: 0 } });

  muelle.lineas[1].opciones[0].escena = null;
  decision = puedePublicar(p);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_BLOQUEANTE'));

  p.juego.titulo = '';
  decision = puedePublicar(p);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_MINIMO' && m.faltante === 'M_TITULO'));
});

test('cambiar el destino a venta pone en rojo la pieza no comercial y bloquea la publicación', () => {
  const { p } = juegoMinimoCompleto();
  dejarTodoEnVerde(p);
  assert.equal(puedePublicar(p).ok, true);
  p.juego.destino = 'venta';
  const tema = p.juego.elementos.find((e) => e.tipo === 'musica');
  const semaforos = evaluarTodo(p);
  assert.equal(semaforos.get(tema.id).color, 'rojo');
  assert.deepEqual(semaforos.get(tema.id).razones, ['R03']);
  const decision = puedePublicar(p);
  assert.equal(decision.ok, false);
  assert.ok(decision.motivos.some((m) => m.codigo === 'P_SEMAFORO' && m.id === tema.id && m.color === 'rojo'));
  assert.deepEqual(decision.resumen, { semaforo: 1, minimo: 0, bloqueantes: 0 });
});

test('nombreDe no devuelve nombres vacíos', () => {
  const { p } = juegoMinimoCompleto();
  const luis = agregarPersonaje(p);
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: '  ', archivo: 'x.png', origen: 'creado' });
  assert.equal(nombreDe(p, luis.id), 'Personaje sin nombre');
  assert.equal(nombreDe(p, fondo.id), 'Elemento sin nombre');
});
