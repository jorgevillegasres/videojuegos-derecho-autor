// tests/panel-ficha.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { crearProyecto, agregarPersonaje, agregarElemento } from '../plataforma/js/estado/modelo.js';
import { aplicarCambio } from '../plataforma/js/juridico/formulario.js';
import { vaciar } from '../plataforma/js/ui/dom.js';
import { panelFicha } from '../plataforma/js/editor/panel-ficha.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

function armar() {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const ana = agregarPersonaje(p, { nombre: 'Ana' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  ana.retrato = retrato.id;
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'subido' });
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'biblioteca', biblioteca: { id: 'bib_m1', autor: 'Autora Ejemplo', licencia: 'CC-BY-ND-4.0', creditoSugerido: '«Tema» de Autora Ejemplo, CC BY-ND 4.0' } });
  const piezas = {
    bib_m1: { id: 'bib_m1', tipo: 'musica', titulo: 'Tema del muelle', autor: 'Autora Ejemplo', fuente: 'https://ejemplo.test/tema', licencia: 'CC-BY-ND-4.0', simulado: { licencia: 'CC0', autor: 'Generada por programa', fuente: 'scripts/x.js' } },
  };
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const dibujar = (id) => { vaciar(contenedor).append(panelFicha(sesion, id, { contenido, alSeleccionar: (s) => selecciones.push(s), piezaDe: (idPieza) => piezas[idPieza] ?? null })); return contenedor; };
  const q = (s) => contenedor.querySelector(s);
  const qa = (s) => [...contenedor.querySelectorAll(s)];
  const control = (id, campo, extra = '') => q(`[data-foco="ficha:${id}:${campo}${extra ? `:${extra}` : ''}"]`);
  const marcar = (nodo) => { nodo.checked = true; nodo.dispatchEvent(new window.Event('change', { bubbles: true })); };
  const color = () => q('.ficha-color strong').textContent;
  const codigos = () => qa('.ficha-razones li').map((li) => li.dataset.codigo);
  return { sesion, eventos, p, ana, retrato, fondo, olas, tema, contenedor, dibujar, q, qa, control, marcar, color, codigos, selecciones };
}

test('la ficha del título es informativa: tipo de obra, verde, nota de marca marcada «por verificar» y ningún control', () => {
  const { dibujar, q, qa, color } = armar();
  dibujar('titulo');
  assert.equal(qa('fieldset').length, 1);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-fijo').textContent, 'Título: no es obra; puede ser marca');
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_TITULO"] .por-verificar'));
  assert.equal(qa('input, select, textarea').length, 0);
  assert.equal(q('.ficha-ok').textContent, 'Ninguna regla aplica.');
});

test('una ficha creada dentro muestra las preguntas en orden con sus explicaciones, «ver más» con fuente, prueba sello y nota del sello', () => {
  const { dibujar, q, qa, control, fondo, olas, color } = armar();
  dibujar(fondo.id);
  assert.deepEqual(textos(q('.ficha'), 'legend'), ['Qué obra es', '¿Quién lo hizo?', '¿Quién es titular de los derechos patrimoniales?', '¿Cómo se acredita?', '¿Qué prueba la fecha?']);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-breve').textContent.trim(), contenido.tiposObra.artistica.breve);
  assert.equal(q('fieldset[data-campo="autoria"] .ficha-breve').textContent.trim(), contenido.campos.autoria.breve);
  assert.equal(q('fieldset[data-campo="tipoObra"] details summary').textContent, 'Ver más');
  assert.match(q('fieldset[data-campo="tipoObra"] .ficha-fuente').textContent, /^Fuente: /);
  assert.equal(control(fondo.id, 'autoria', 'yo').checked, true);
  assert.equal(control(fondo.id, 'prueba').value, 'sello');
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_SELLO"] .por-verificar'), 'la nota del sello está pendiente');
  assert.equal(qa('fieldset[data-campo="prueba"] .por-verificar').length, 1, 'el campo prueba también');
  dibujar(olas.id);
  assert.ok(q('fieldset[data-campo="tipoObra"] .ficha-breve .por-verificar'), 'fonograma: texto por verificar');
});

test('elegir «otra persona» abre el nombre y el respaldo; el semáforo pasa a rojo; escribir el nombre no redibuja y actualiza la acción', () => {
  const { dibujar, q, control, marcar, eventos, olas, color, codigos } = armar();
  dibujar(olas.id);
  assert.equal(q('fieldset[data-campo="respaldo"]'), null, 'yo y yo: sin respaldo');
  marcar(control(olas.id, 'autoria', 'otra_persona'));
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'ficha' });
  dibujar(olas.id);
  assert.ok(q('fieldset[data-campo="respaldo"]'));
  const nombre = control(olas.id, 'autorNombre');
  assert.ok(nombre);
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R02', 'A08']);
  escribir(nombre, 'Luis');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades' });
  assert.equal(control(olas.id, 'autorNombre'), nombre, 'el campo sigue siendo el mismo nodo');
  assert.deepEqual(codigos(), ['R02'], 'A08 desaparece en el lugar');
  assert.equal(q('.razon[data-codigo="R02"] .accion').textContent, 'Qué hacer: Pide a Luis una cesión o una licencia por escrito.');
});

test('con respaldo «licencia» aparece la lista; cada licencia abre sus casillas; «otra» pide texto y condiciones; cambiar el respaldo limpia', () => {
  const { dibujar, q, qa, control, marcar, olas, p, codigos } = armar();
  aplicarCambio(p.fichas[olas.id], 'autoria', 'otra_persona');
  aplicarCambio(p.fichas[olas.id], 'autorNombre', 'Luis');
  dibujar(olas.id);
  marcar(control(olas.id, 'respaldo', 'licencia'));
  dibujar(olas.id);
  const lista = control(olas.id, 'licencia');
  assert.ok(lista);
  assert.equal(lista.querySelectorAll('option').length, 10, 'elige + nueve códigos');
  assert.ok(codigos().includes('A12'));
  escribir(lista, 'CC-BY-SA-4.0');
  dibujar(olas.id);
  assert.ok(control(olas.id, 'licenciaLeida'));
  assert.ok(control(olas.id, 'aceptaCompartirIgual'));
  assert.ok(control(olas.id, 'modificado'), 'subido: se ofrece «lo modifiqué»');
  assert.deepEqual(codigos(), ['A01', 'A03', 'A07']);
  escribir(control(olas.id, 'licencia'), 'OTRA');
  dibujar(olas.id);
  assert.ok(control(olas.id, 'licenciaTexto'));
  assert.equal(qa('.ficha-condiciones input').length, 4);
  assert.ok(codigos().includes('A11'));
  marcar(control(olas.id, 'condicionesOtra', 'NC'));
  assert.deepEqual(p.fichas[olas.id].condicionesOtra, ['NC']);
  marcar(control(olas.id, 'respaldo', 'cesion'));
  dibujar(olas.id);
  assert.equal(control(olas.id, 'licencia'), null);
  assert.equal(p.fichas[olas.id].licencia, null);
  assert.equal(q('fieldset[data-campo="respaldo"] .ficha-breve').textContent.trim(), contenido.campos.respaldo.breve);
});

test('una ficha de biblioteca muestra como texto lo que viene del catálogo; «leí la licencia» la pone en verde y «lo modifiqué» en rojo por ND', () => {
  const { dibujar, q, qa, control, marcar, tema, color, codigos } = armar();
  dibujar(tema.id);
  const fijos = textos(q('.ficha'), '.ficha-fijo');
  assert.ok(fijos.includes('Otra persona'));
  assert.ok(fijos.includes('Autora Ejemplo'));
  assert.ok(fijos.includes('Licencia'));
  assert.ok(fijos.includes('Creative Commons Atribución y sin derivadas 4.0'));
  assert.equal(qa(`input[name="${tema.id}-autoria"]`).length, 0, 'la autoría no se edita');
  assert.equal(control(tema.id, 'credito').value, '«Tema» de Autora Ejemplo, CC BY-ND 4.0');
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A07']);
  marcar(control(tema.id, 'licenciaLeida'));
  dibujar(tema.id);
  assert.equal(color(), 'Semáforo: verde');
  marcar(control(tema.id, 'modificado'));
  dibujar(tema.id);
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R04']);
});

test('con IA pide la herramienta y la casilla de reconocimiento; al completarlas queda verde con la nota de IA', () => {
  const { dibujar, q, control, marcar, fondo, color, codigos } = armar();
  dibujar(fondo.id);
  marcar(control(fondo.id, 'autoria', 'ia'));
  dibujar(fondo.id);
  assert.ok(control(fondo.id, 'herramientaIA'));
  assert.ok(control(fondo.id, 'reconoceSinDerechos'));
  assert.equal(control(fondo.id, 'aporteHumano'), null);
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A04', 'A13']);
  escribir(control(fondo.id, 'herramientaIA'), 'Generador X');
  assert.deepEqual(codigos(), ['A04']);
  marcar(control(fondo.id, 'reconoceSinDerechos'));
  dibujar(fondo.id);
  assert.equal(color(), 'Semáforo: verde');
  assert.ok(q('.nota[data-codigo="N_IA"]'));
  marcar(control(fondo.id, 'autoria', 'ia_con_aporte'));
  dibujar(fondo.id);
  assert.ok(control(fondo.id, 'aporteHumano'));
  assert.deepEqual(codigos(), ['A05'], 'la herramienta se conserva entre los dos modos de IA; falta describir el aporte');
  assert.equal(control(fondo.id, 'reconoceSinDerechos'), null, 'la casilla de reconocimiento solo aplica a IA sin aporte');
});

test('A01 y A02 juntas se presentan como una sola razón', () => {
  const { dibujar, olas, p, codigos, color } = armar();
  const ficha = p.fichas[olas.id];
  for (const [campo, valor] of [['autoria', 'otra_persona'], ['autorNombre', 'Luis'], ['titular', 'otra_persona'], ['respaldo', 'licencia'], ['licencia', 'CC-BY-4.0'], ['licenciaLeida', true]]) aplicarCambio(ficha, campo, valor);
  dibujar(olas.id);
  assert.equal(color(), 'Semáforo: amarillo');
  assert.deepEqual(codigos(), ['A01']);
});

test('la ficha de un personaje enlaza a la de su retrato; «basado en obra ajena» pide la autorización (R06, por verificar)', () => {
  const { dibujar, q, control, marcar, ana, retrato, p, selecciones, color, codigos } = armar();
  dibujar(ana.id);
  assert.equal(q('fieldset[data-campo="tipoObra"] .ficha-fijo').textContent, 'Obra literaria');
  clic(q('button[data-accion="ver-retrato"]'));
  assert.deepEqual(selecciones, [{ tipo: 'elemento', id: retrato.id }]);
  assert.equal(control(ana.id, 'autorizacionDerivada'), null);
  marcar(control(ana.id, 'basadoEnObraAjena'));
  dibujar(ana.id);
  assert.ok(control(ana.id, 'autorizacionDerivada'));
  assert.equal(color(), 'Semáforo: rojo');
  assert.deepEqual(codigos(), ['R06']);
  assert.ok(q('.razon[data-codigo="R06"] .por-verificar'));
  marcar(control(ana.id, 'autorizacionDerivada'));
  dibujar(ana.id);
  assert.equal(color(), 'Semáforo: verde');
  const sombra = agregarPersonaje(p, { nombre: 'Sombra' });
  dibujar(sombra.id);
  assert.equal(q('button[data-accion="ver-retrato"]'), null);
  assert.match(q('fieldset[data-campo="tipoObra"] .ayuda').textContent, /retrato/);
  dibujar('no_existe');
  assert.match(q('.vacio').textContent, /ya no existe/);
});

test('una pieza de biblioteca muestra título, autor y fuente, y «ver más» revela lo que es en realidad', () => {
  const { dibujar, q, tema, fondo } = armar();
  dibujar(tema.id);
  const pieza = q('.ficha-pieza');
  assert.equal(pieza.querySelector('strong').textContent, 'Tema del muelle');
  assert.match(pieza.querySelector('p').textContent, /· Autora Ejemplo ·/);
  assert.equal(pieza.querySelector('a').getAttribute('href'), 'https://ejemplo.test/tema');
  assert.equal(pieza.querySelector('a').getAttribute('target'), '_blank');
  const revelado = pieza.querySelector('details p').textContent;
  assert.match(revelado, /^En la vida real esta pieza es Creative Commons Zero \(CC0 1\.0\) de Generada por programa \(scripts\/x\.js\)/);
  assert.match(revelado, /se presenta como Creative Commons Atribución y sin derivadas 4\.0 para que practiques\.$/);
  assert.equal(q('a[data-accion="licencia-curso"]'), null, 'no es CURSO');
  dibujar(fondo.id);
  assert.equal(q('.ficha-pieza'), null, 'un elemento creado no viene de la biblioteca');
});

test('una pieza CURSO enlaza a la licencia del curso; sin entrada en el catálogo se usa lo que guarda el elemento', () => {
  const { dibujar, q, p } = armar();
  const curso = agregarElemento(p, { tipo: 'efecto', nombre: 'Zumbido', archivo: 'z.wav', origen: 'biblioteca', biblioteca: { id: 'bib_e11', autor: 'Taller', licencia: 'CURSO', creditoSugerido: '«Zumbido», licencia limitada al curso' } });
  dibujar(curso.id);
  const enlace = q('a[data-accion="licencia-curso"]');
  assert.ok(enlace);
  assert.match(enlace.getAttribute('href'), /biblioteca\/LICENCIA-CURSO\.md$/);
  assert.equal(enlace.textContent, 'Leer la licencia del curso');
  const pieza = q('.ficha-pieza');
  assert.equal(pieza.querySelector('strong').textContent, 'Zumbido');
  assert.match(pieza.querySelector('p').textContent, /· Taller$/);
  assert.equal(pieza.querySelector('details'), null, 'sin entrada del catálogo no hay nada que revelar');
});

test('el resultado de una ficha sin notas no deja ningún texto «null»', () => {
  const { dibujar, q, qa, ana, fondo, olas, tema } = armar();
  let sinNotas = 0;
  for (const id of ['titulo', 'historia', ana.id, fondo.id, olas.id, tema.id]) {
    dibujar(id);
    const resultado = q('.ficha-resultado');
    assert.ok(resultado, `${id}: hay resultado`);
    assert.ok(!resultado.textContent.includes('null'), `${id}: el resultado no dice «null»: ${resultado.textContent}`);
    assert.ok(!q('.ficha').textContent.includes('null'), `${id}: la ficha no dice «null»`);
    if (!qa('.ficha-notas').length) sinNotas++;
  }
  assert.ok(sinNotas > 0, 'al menos una ficha sin notas ejercita el caso');
});

test('la ficha de un retrato de muestra solo avisa y ofrece reemplazarlo', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'm.png', origen: 'muestra' });
  const { sesion } = sesionDePrueba(p);
  const pedidos = [];
  const nodo = panelFicha(sesion, muestra.id, { contenido, alReemplazar: (clave) => pedidos.push(clave) });
  assert.equal(nodo.querySelector('.ficha-muestra-aviso').textContent, 'Retrato de muestra del ejemplo: reemplázalo por uno tuyo.');
  assert.equal(nodo.querySelector('.ficha-resultado'), null, 'no se evalúa');
  assert.equal(nodo.querySelector('fieldset'), null, 'no se llena');
  for (const boton of nodo.querySelectorAll('button[data-accion^="reemplazar-"]')) clic(boton);
  assert.deepEqual(pedidos, ['pixel', 'subir', 'biblioteca']);
});

test('en la ficha de muestra, una opción que no está disponible se ve deshabilitada', () => {
  const p = crearProyecto({ estudiante: 'Camila R.', titulo: 'El faro de Camila' });
  const muestra = agregarElemento(p, { tipo: 'retrato', nombre: 'Muestra', archivo: 'm.png', origen: 'muestra' });
  const { sesion } = sesionDePrueba(p);
  const nodo = panelFicha(sesion, muestra.id, { contenido, alReemplazar: () => {}, reemplazoDisponible: (clave) => clave === 'subir' });
  const estado = Object.fromEntries([...nodo.querySelectorAll('button[data-accion^="reemplazar-"]')].map((b) => [b.dataset.accion, b.disabled]));
  assert.deepEqual(estado, { 'reemplazar-pixel': true, 'reemplazar-subir': false, 'reemplazar-biblioteca': true });
});
