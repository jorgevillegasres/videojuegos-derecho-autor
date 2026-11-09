// tests/banda.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { instalarDom, clic, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { ejemploArmado } from './ayudas/ejemplo.js';
import { crearBanda, retirarMuestrasSinUso } from '../plataforma/js/guia/banda.js';
import { agregarElemento } from '../plataforma/js/estado/modelo.js';

instalarDom();
const contenido = JSON.parse(readFileSync(new URL('../plataforma/contenido/juridico.json', import.meta.url), 'utf8'));

async function armar({ ancho = 1280, preparar = () => {} } = {}) {
  const { proyecto, archivos } = await ejemploArmado();
  preparar(proyecto);
  const { sesion } = sesionDePrueba(proyecto, { archivos });
  const raiz = document.createElement('div');
  const contenedor = document.createElement('section');
  raiz.append(contenedor);
  document.body.append(raiz);
  const llamadas = [];
  const banda = crearBanda(contenedor, sesion, { contenido, raiz, alJugar: () => llamadas.push('jugar'), alMapa: () => llamadas.push('mapa'), alPublicar: () => llamadas.push('publicar'), anchoVentana: () => ancho });
  sesion.suscribir((e) => { if (e.tipo === 'cambio') banda.dibujar(); });
  banda.dibujar();
  const q = (s) => contenedor.querySelector(s);
  return { sesion, banda, raiz, contenedor, llamadas, q, cerrar: () => raiz.remove() };
}

test('dibuja la fase 0: progreso, instrucción, lección del contenido, tareas y botones; marca la raíz con data-fase', async () => {
  const { q, contenedor, raiz, llamadas, cerrar } = await armar();
  assert.equal(raiz.dataset.fase, 'conocer');
  assert.equal(q('.banda-fase').textContent, 'Inicio · Conoce el ejemplo');
  assert.equal(contenedor.querySelectorAll('.banda-punto').length, 9);
  assert.equal(q('.banda-punto[aria-current="step"]').dataset.fase, 'conocer');
  assert.match(q('.banda-instruccion').textContent, /La llave del faro/);
  assert.equal(q('.banda-leccion .ficha-breve').textContent.trim(), contenido.campos.tipoObra.breve);
  assert.ok(q('.banda-leccion').hasAttribute('open'), 'a 1280 px la lección se ve abierta');
  assert.deepEqual(textos(contenedor, '.banda-lista li .banda-tarea'), ['Juega el ejemplo hasta los créditos']);
  assert.equal(q('[data-accion="guia-atras"]').disabled, true);
  assert.equal(q('[data-accion="guia-siguiente"]').disabled, true);
  clic(q('[data-accion="guia-jugar"]'));
  assert.deepEqual(llamadas, ['jugar']);
  cerrar();
});

test('en una ventana angosta la lección se pliega bajo «Ver la lección»', async () => {
  const { q, cerrar } = await armar({ ancho: 1000 });
  assert.equal(q('.banda-leccion').hasAttribute('open'), false);
  assert.equal(q('.banda-leccion summary').textContent, 'Ver la lección');
  cerrar();
});

test('al jugar se marca la tarea y se anuncia; Siguiente avanza, cambia data-fase y deja el foco en la banda', async () => {
  const { sesion, q, raiz, cerrar } = await armar();
  sesion.cambiar((p) => { p.guia.jugado = true; }, { origen: 'guia' });
  assert.ok(q('.banda-lista li').classList.contains('cumplida'));
  assert.match(document.getElementById('anuncios').textContent, /^Fase completa: Conoce el ejemplo/);
  const siguiente = q('[data-accion="guia-siguiente"]');
  assert.equal(siguiente.disabled, false);
  siguiente.focus();
  clic(siguiente);
  assert.equal(sesion.proyecto.guia.fase, 'historia');
  assert.equal(raiz.dataset.fase, 'historia');
  assert.equal(q('.banda-fase').textContent, 'Fase 1 de 8 · Tu historia');
  assert.equal(q('[data-accion="guia-siguiente"]').disabled, true, 'la historia está por hacer');
  assert.equal(document.activeElement, q('.banda-fase'), 'el foco no se pierde: va al título de la fase');
  assert.equal(document.getElementById('anuncios').textContent, 'Fase 1 de 8: Tu historia.');
  assert.match(q('.banda-lista').textContent, /Reescribe las 8 líneas de muestra \(quedan 8\)/);
  cerrar();
});

test('Atrás vuelve; los puntos de fases posteriores solo se pulsan si las intermedias están completas', async () => {
  const { sesion, q, cerrar } = await armar({ preparar: (p) => { p.guia = { fase: 'historia', jugado: true }; } });
  assert.equal(q('.banda-punto[data-fase="conocer"]').disabled, false);
  assert.equal(q('.banda-punto[data-fase="personajes"]').disabled, true);
  clic(q('[data-accion="guia-atras"]'));
  assert.equal(sesion.proyecto.guia.fase, 'conocer');
  clic(q('.banda-punto[data-fase="historia"]'));
  assert.equal(sesion.proyecto.guia.fase, 'historia');
  cerrar();
});

test('en la fase de publicar el botón de la banda sigue el candado de Publicar', async () => {
  const { q, llamadas, cerrar } = await armar({ preparar: (p) => { p.guia = { fase: 'publicar', jugado: true }; } });
  assert.equal(q('[data-accion="guia-siguiente"]'), null, 'la última fase no tiene Siguiente');
  assert.equal(q('[data-accion="guia-publicar"]').disabled, true);
  clic(q('[data-accion="guia-publicar"]'));
  assert.deepEqual(llamadas, []);
  cerrar();
});

test('retirarMuestrasSinUso quita los retratos de muestra que ningún personaje usa, con su archivo', async () => {
  const { sesion, cerrar } = await armar();
  const [ana] = sesion.proyecto.juego.personajes;
  const muestra = ana.retrato;
  assert.deepEqual(retirarMuestrasSinUso(sesion), [], 'mientras se usan, se quedan');
  const propio = sesion.cambiar((p) => agregarElemento(p, { tipo: 'retrato', nombre: 'Propio', archivo: 'propio.png', origen: 'creado' }));
  sesion.cambiar(() => { ana.retrato = propio.id; });
  assert.deepEqual(retirarMuestrasSinUso(sesion), [muestra]);
  assert.equal(sesion.proyecto.juego.elementos.some((e) => e.id === muestra), false);
  assert.equal(sesion.proyecto.fichas[muestra], undefined);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(sesion.archivos.has(muestra), false);
  cerrar();
});
