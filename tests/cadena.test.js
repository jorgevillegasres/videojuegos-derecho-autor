// tests/cadena.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { proyectoPublicable } from './ayudas/proyecto.js';
import { agregarPersonaje, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { construir, creditos } from '../plataforma/js/juridico/cadena.js';

test('los créditos nombran al estudiante y copian el crédito escrito de cada pieza; lo hecho por mí no se repite', () => {
  const { p } = proyectoPublicable();
  assert.deepEqual(creditos(p), ['Camila R.: autor(a) del juego y de la historia', '«Tema» de Autora Ejemplo, CC BY-NC 4.0']);
});

test('los créditos nombran a cada persona con su aporte y declaran lo hecho con IA', () => {
  const { p, ana, olas, farero } = proyectoPublicable();
  Object.assign(p.fichas.historia, { autoria: 'otra_persona', autorNombre: 'Luis P.', titular: 'otra_persona', respaldo: 'cesion' });
  Object.assign(p.fichas[ana.id], { autoria: 'otra_persona', autorNombre: 'Luis P.', titular: 'yo', respaldo: 'cesion' });
  Object.assign(p.fichas[farero.retrato], { autoria: 'ia', herramientaIA: 'Generador X', reconoceSinDerechos: true });
  Object.assign(p.fichas[olas.id], { autoria: 'ia_con_aporte', herramientaIA: 'Sintetizador Y', aporteHumano: 'Mezcla y recorte' });
  const sinNombre = agregarElemento(p, { tipo: 'voz', nombre: '', archivo: 'v.ogg', origen: 'subido' });
  Object.assign(p.fichas[sinNombre.id], { autoria: 'otra_persona', autorNombre: '', titular: 'otra_persona' });
  assert.deepEqual(creditos(p), [
    'Camila R.: autor(a) del juego',
    'Historia: Luis P.',
    'Personaje «Ana»: Luis P.',
    'Retrato «Farero»: generado con IA (Generador X)',
    '«Tema» de Autora Ejemplo, CC BY-NC 4.0',
    'Efecto de sonido «Olas»: hecho con IA (Sintetizador Y) con aporte creativo de Camila R.',
    'Voz «sin nombre»: otra persona',
  ]);
  p.estudiante = ' ';
  assert.equal(creditos(p)[0], 'Sin nombre: autor(a) del juego');
});

test('construir arma el árbol: juego del estudiante, título, historia, personajes con su retrato y el resto de elementos, con el color de cada ficha', () => {
  const { p, ana, farero, tema, olas, muelle } = proyectoPublicable();
  const sinRetrato = agregarPersonaje(p, { nombre: 'Sombra' });
  p.juego.destino = 'venta';
  const arbol = construir(p);
  assert.equal(arbol.nombre, 'La llave del faro');
  assert.equal(arbol.estudiante, 'Camila R.');
  assert.deepEqual(arbol.hijos.map((n) => n.nombre), [
    'título', 'historia y escenas', 'personaje «Ana»', 'personaje «El farero»', 'personaje «Sombra»',
    'fondo «Muelle»', 'música «Tema»', 'efecto de sonido «Olas»',
  ]);
  const nodoAna = arbol.hijos[2];
  assert.equal(nodoAna.id, ana.id);
  assert.deepEqual(nodoAna.hijos.map((n) => n.id), [ana.retrato]);
  assert.equal(nodoAna.hijos[0].nombre, 'retrato «Ana»');
  assert.deepEqual(arbol.hijos[4].hijos, [], 'sin retrato no cuelga nada');
  assert.ok(sinRetrato);
  const nodoTema = arbol.hijos.find((n) => n.id === tema.id);
  assert.equal(nodoTema.color, 'rojo', 'destino venta con NC');
  assert.deepEqual([nodoTema.autoria, nodoTema.autorNombre, nodoTema.titular, nodoTema.respaldo, nodoTema.licencia], ['otra_persona', 'Autora Ejemplo', 'otra_persona', 'licencia', 'CC-BY-NC-4.0']);
  assert.equal(arbol.hijos[0].color, 'verde');
  assert.equal(arbol.hijos.find((n) => n.id === olas.id).color, 'verde');
  assert.equal(arbol.hijos.find((n) => n.id === farero.id).hijos.length, 1);
  assert.ok(muelle.fondo);
  const conMapa = construir(p, new Map([[tema.id, { color: 'amarillo' }]]));
  assert.equal(conMapa.hijos.find((n) => n.id === tema.id).color, 'amarillo', 'acepta semáforos ya calculados');
  assert.equal(conMapa.hijos[0].color, null, 'sin resultado, sin color');
});
