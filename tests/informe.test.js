// tests/informe.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { generar } from '../plataforma/js/juridico/informe.js';
import { filas } from '../plataforma/js/juridico/mapa.js';
import { proyectoPublicable } from './ayudas/proyecto.js';

const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));
const HUELLA = 'sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const FECHA = '2026-11-06T15:30:00.000Z';

function armar(ajustar = () => {}) {
  const todo = proyectoPublicable();
  ajustar(todo);
  const html = generar(todo.p, { contenido, huella: HUELLA, fecha: FECHA });
  const { document } = new JSDOM(html).window;
  const q = (selector) => document.querySelector(selector);
  const qa = (selector) => [...document.querySelectorAll(selector)];
  const texto = (selector) => q(selector)?.textContent.replace(/\s+/g, ' ').trim();
  return { ...todo, html, document, q, qa, texto };
}

test('la portada trae estudiante, juego, destino, fecha, huella y la leyenda educativa', () => {
  const { html, q, texto } = armar();
  assert.ok(html.startsWith('<!DOCTYPE html>'));
  assert.equal(q('title').textContent, 'Informe jurídico: El faro de Camila');
  assert.equal(q('h1').textContent, 'El faro de Camila');
  const portada = texto('.portada');
  assert.ok(portada.includes('Camila R.'));
  assert.ok(portada.includes('Publicarlo gratis'));
  assert.ok(portada.includes(FECHA));
  assert.ok(portada.includes(HUELLA));
  assert.ok(portada.includes(contenido.nombre));
  assert.ok(texto('.aviso-legal').includes('Material educativo'));
  assert.ok(texto('footer').includes('Memo de verificación legal'));
  assert.ok(!html.includes('<script'), 'el informe no lleva scripts');
  assert.ok(html.includes('@media print'), 'está pensado para imprimirse');
});

test('el mapa de activos tiene una fila por ficha con creador, contrato, prueba, riesgo y acción', () => {
  const { p, qa, texto } = armar();
  const esperadas = filas(p, contenido);
  const filasHtml = qa('#mapa tbody tr');
  assert.equal(filasHtml.length, esperadas.length);
  esperadas.forEach((fila, i) => {
    const celdas = [...filasHtml[i].querySelectorAll('td')].map((td) => td.textContent.replace(/\s+/g, ' ').trim());
    assert.ok(celdas[0].includes(fila.activo), `activo ${fila.activo}`);
    assert.equal(celdas[1], fila.creador);
    assert.equal(celdas[2], fila.contrato);
    assert.equal(celdas[3], fila.prueba);
    assert.ok(celdas[4].includes(fila.color));
    if (fila.porVerificar) assert.ok(celdas[4].includes('Por verificar'));
  });
  assert.ok(texto('#mapa').includes('Nada por hacer'), 'un activo en verde no tiene acción');
});

test('la cadena de titularidad es un árbol: el retrato cuelga del personaje y cada nodo dice autoría, titular y respaldo', () => {
  const { q, texto } = armar();
  const arbol = q('#cadena ul.arbol');
  assert.ok(arbol);
  assert.ok(texto('#cadena > ul.arbol > li').startsWith('El faro de Camila'));
  const ana = [...arbol.querySelectorAll('li')].find((li) => li.firstChild.textContent.includes('personaje «Lucía»'));
  assert.ok(ana, 'nodo del personaje');
  assert.ok(ana.querySelector('ul li').textContent.includes('retrato «Lucía»'), 'el retrato cuelga del personaje');
  const tema = [...arbol.querySelectorAll('li')].find((li) => li.textContent.includes('música «Tema»'));
  const detalle = tema.textContent.replace(/\s+/g, ' ');
  assert.ok(detalle.includes('Otra persona') && detalle.includes('Autora Ejemplo') && detalle.includes('Licencia') && detalle.includes('verde'));
});

test('la decisión de registro muestra cada respuesta; sin decisiones lo dice; la explicación de la prueba se marca por verificar', () => {
  const vacio = armar();
  assert.ok(vacio.texto('#registro').includes('no dejó decisiones de registro'));
  const { ana, tema, texto } = armar(({ p, ana, tema }) => {
    p.registro = [
      { id: ana.id, registraria: 'si', aNombreDe: 'Camila R.', prueba: 'El archivo PNG con la fecha del sello', porque: 'Es mi personaje principal.' },
      { id: tema.id, registraria: 'no', aNombreDe: 'Autora Ejemplo', prueba: 'La licencia', porque: '' },
    ];
  });
  const seccion = texto('#registro');
  assert.ok(seccion.includes('Lucía') && seccion.includes('Sí lo registraría') && seccion.includes('Camila R.') && seccion.includes('El archivo PNG'));
  assert.ok(seccion.includes('Es mi personaje principal.'));
  assert.ok(seccion.includes('Tema') && seccion.includes('No lo registraría') && seccion.includes('Autora Ejemplo'));
  assert.ok(seccion.includes(contenido.campos.prueba.breve));
  assert.ok(seccion.includes('Por verificar'), 'campos.prueba está pendiente de verificación');
  assert.ok(ana && tema);
});

test('cada ficha completa: respuestas, licencia, crédito, prueba con sello, pieza de biblioteca, semáforo con razones y notas', () => {
  const { p, tema, olas, qa, document } = armar(({ p, tema, olas }) => {
    p.juego.elementos.find((e) => e.id === olas.id).sello = { fecha: '2026-11-05T10:00:00.000Z', huella: 'sha256:abc' };
    p.fichas[tema.id].credito = '«Tema» de Autora Ejemplo, CC BY-NC 4.0';
    p.fichas[olas.id].modificado = false;
  });
  const fichas = qa('#fichas article.ficha');
  assert.equal(fichas.length, Object.keys(p.fichas).length);
  const porId = (id) => document.querySelector(`#fichas article[data-ficha="${id}"]`).textContent.replace(/\s+/g, ' ');
  const titulo = porId('titulo');
  assert.ok(titulo.includes('Título: no es obra; puede ser marca') && titulo.includes(contenido.notas.N_TITULO.breve));
  assert.ok(!titulo.includes('¿Quién lo hizo?'), 'el título no pregunta autoría');
  const musica = porId(tema.id);
  assert.ok(musica.includes('Obra musical y grabación (fonograma)'));
  assert.ok(musica.includes('Otra persona') && musica.includes('Autora Ejemplo'));
  assert.ok(musica.includes('Creative Commons Atribución y no comercial 4.0'));
  assert.ok(musica.includes('Leí la licencia: sí'));
  assert.ok(musica.includes('«Tema» de Autora Ejemplo, CC BY-NC 4.0'));
  assert.ok(musica.includes('De la biblioteca') && musica.includes('bib_m1'));
  assert.ok(musica.includes('Semáforo: verde') && musica.includes('Ninguna regla aplica'));
  const efecto = porId(olas.id);
  assert.ok(efecto.includes('Sello de la plataforma') && efecto.includes('2026-11-05T10:00:00.000Z') && efecto.includes('sha256:abc'));
  assert.ok(efecto.includes(contenido.notas.N_SELLO.breve) && efecto.includes('Por verificar'));
  assert.ok(efecto.includes(contenido.notas.N_SELLO.fuente), 'las notas llevan su fuente');
});

test('una ficha en rojo muestra la razón con su acción, texto completo y fuente', () => {
  const { tema, document } = armar(({ p, tema }) => { p.juego.destino = 'venta'; p.fichas[tema.id].credito = 'x'; });
  const musica = document.querySelector(`#fichas article[data-ficha="${tema.id}"]`).textContent.replace(/\s+/g, ' ');
  assert.ok(musica.includes('Semáforo: rojo'));
  assert.ok(musica.includes(contenido.reglas.R03.breve));
  assert.ok(musica.includes(contenido.reglas.R03.accion));
  assert.ok(musica.includes(contenido.reglas.R03.completo));
  assert.ok(musica.includes(contenido.reglas.R03.fuente));
});

test('las explicaciones de los campos y los tipos de obra usados van una vez, y los textos pendientes se listan al final', () => {
  const { texto, qa } = armar();
  const explicaciones = texto('#explicaciones');
  for (const campo of ['autoria', 'titular', 'respaldo', 'credito', 'prueba', 'destino']) assert.ok(explicaciones.includes(contenido.campos[campo].completo), `campo ${campo}`);
  assert.ok(explicaciones.includes(contenido.tiposObra.artistica.completo));
  assert.ok(!explicaciones.includes(contenido.tiposObra.interpretacion.completo), 'sin voces, no se explica la interpretación');
  const pendientes = qa('#pendientes li').map((li) => li.textContent);
  assert.ok(pendientes.some((t) => t.includes('campos.prueba')));
  assert.ok(pendientes.some((t) => t.includes('notas.N_SELLO')));
  assert.ok(pendientes.some((t) => t.includes('tiposObra.musical_fonograma')));
  assert.ok(!pendientes.some((t) => t.includes('interpretacion')), 'solo lo que el informe usa');
});

test('escapa lo que escribe el estudiante y no deja undefined ni objetos sin formato', () => {
  const { html, document } = armar(({ p }) => {
    p.estudiante = '<b>Camila</b> & Eva';
    p.juego.titulo = '';
    p.juego.personajes[0].nombre = '';
  });
  assert.ok(html.includes('&lt;b&gt;Camila&lt;/b&gt; &amp; Eva'));
  assert.ok(!html.includes('<b>Camila</b>'));
  const cuerpo = document.body.textContent;
  assert.ok(!/undefined|\[object Object\]|\bnull\b|NaN/.test(cuerpo), cuerpo.match(/undefined|\[object Object\]|\bnull\b|NaN/)?.[0]);
  assert.ok(cuerpo.includes('Sin título') && cuerpo.includes('Sin nombre'));
});
