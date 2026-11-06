// tests/propiedades.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { instalarDom, clic, escribir, textos } from './ayudas/dom.js';
import { sesionDePrueba } from './ayudas/sesion.js';
import { agregarEscena, agregarPersonaje, agregarElemento, agregarLinea } from '../plataforma/js/estado/modelo.js';
import { crearPropiedades } from '../plataforma/js/editor/propiedades.js';

instalarDom();

async function armar({ confirmar = () => true } = {}) {
  const { sesion, eventos } = sesionDePrueba();
  const p = sesion.proyecto;
  const muelle = p.juego.escenas[0];
  muelle.nombre = 'El muelle';
  const torre = agregarEscena(p, 'La torre');
  const ana = agregarPersonaje(p, { nombre: 'Ana', descripcion: 'Farera.' });
  const fondo = agregarElemento(p, { tipo: 'fondo', nombre: 'Muelle', archivo: 'm.png', origen: 'creado' });
  const retrato = agregarElemento(p, { tipo: 'retrato', nombre: 'Ana', archivo: 'a.png', origen: 'subido' });
  const tema = agregarElemento(p, { tipo: 'musica', nombre: 'Tema', archivo: 't.ogg', origen: 'subido' });
  const olas = agregarElemento(p, { tipo: 'efecto', nombre: 'Olas', archivo: 'o.wav', origen: 'subido' });
  const bytes = new TextEncoder().encode('x').buffer;
  await sesion.agregarArchivo(fondo.id, { tipo: 'image/png', datos: bytes });
  await sesion.agregarArchivo(tema.id, { tipo: 'audio/ogg', datos: bytes });
  agregarLinea(muelle, 'narracion', { texto: 'Niebla.' });
  agregarLinea(muelle, 'dialogo', { personaje: ana.id, texto: '¿Quién?' });
  const selecciones = [];
  const contenedor = document.createElement('div');
  document.body.append(contenedor);
  const propiedades = crearPropiedades(contenedor, sesion, {
    contenido: { campos: { destino: { breve: 'El destino delimita qué licencias sirven.' } } },
    alSeleccionar: (s) => selecciones.push(s),
    confirmar,
  });
  const etiquetas = () => textos(contenedor, '.propiedades > .campo > .campo-etiqueta');
  const control = (clave) => contenedor.querySelector(`[data-foco="${clave}"]`);
  return { sesion, eventos, p, muelle, torre, ana, fondo, retrato, tema, olas, contenedor, propiedades, selecciones, etiquetas, control };
}

test('El juego: título, estudiante, destino con ayuda del contenido y sinopsis', async () => {
  const { contenedor, propiedades, p, eventos, etiquetas, control } = await armar();
  propiedades.dibujar({ tipo: 'juego' });
  assert.equal(contenedor.querySelector('h2').textContent, 'El juego');
  assert.deepEqual(etiquetas(), ['Título', 'Nombre del estudiante', 'Destino del juego', 'Sinopsis']);
  assert.deepEqual(textos(control('destino'), 'option'), ['Uso personal', 'Publicarlo gratis', 'Venderlo']);
  assert.equal(control('destino').value, 'gratis');
  assert.equal(contenedor.querySelector('.ayuda').textContent, 'El destino delimita qué licencias sirven.');
  escribir(control('titulo'), 'El faro');
  assert.equal(p.juego.titulo, 'El faro');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: false });
  escribir(control('sinopsis'), 'Una farera.');
  assert.equal(p.juego.sinopsis, 'Una farera.');
  escribir(control('estudiante'), 'Camila');
  assert.equal(p.estudiante, 'Camila');
  escribir(control('destino'), 'venta');
  assert.equal(p.juego.destino, 'venta');
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: true }, 'cambiar el destino recalcula todo');
  contenedor.remove();
});

test('Escena: nombre, fondo y música solo de su tipo, hacer inicial y eliminar con confirmación', async () => {
  const { contenedor, propiedades, p, muelle, torre, fondo, tema, selecciones, control } = await armar();
  propiedades.dibujar({ tipo: 'escena', id: torre.id });
  assert.deepEqual(textos(control('fondo'), 'option'), ['Ninguno', 'Muelle']);
  assert.deepEqual(textos(control('musica'), 'option'), ['Ninguno', 'Tema']);
  escribir(control('fondo'), fondo.id);
  escribir(control('musica'), tema.id);
  assert.equal(torre.fondo, fondo.id);
  assert.equal(torre.musica, tema.id);
  escribir(control('nombre'), 'La torre alta');
  assert.equal(torre.nombre, 'La torre alta');
  clic(contenedor.querySelector('button[data-accion="hacer-inicial"]'));
  assert.equal(p.juego.escenaInicial, torre.id);
  propiedades.dibujar({ tipo: 'escena', id: torre.id });
  assert.equal(contenedor.querySelector('button[data-accion="hacer-inicial"]'), null, 'la inicial no ofrece hacerse inicial');
  assert.match(contenedor.querySelector('.ayuda').textContent, /escena inicial/);
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  assert.deepEqual(p.juego.escenas.map((e) => e.id), [muelle.id]);
  assert.equal(p.juego.escenaInicial, muelle.id, 'eliminar la inicial pasa el inicio a la primera que queda');
  assert.deepEqual(selecciones.at(-1), null);
  contenedor.remove();
});

test('Línea: un diálogo elige personaje, efecto y voz; una narración solo informa', async () => {
  const { contenedor, propiedades, muelle, ana, olas, eventos, etiquetas, control } = await armar();
  propiedades.dibujar({ tipo: 'linea', escena: muelle.id, indice: 1 });
  assert.deepEqual(etiquetas(), ['Personaje', 'Efecto de sonido', 'Voz grabada']);
  assert.equal(control('personaje').value, ana.id);
  assert.deepEqual(textos(control('efecto'), 'option'), ['Ninguno', 'Olas']);
  assert.deepEqual(textos(control('voz'), 'option'), ['Ninguno']);
  escribir(control('efecto'), olas.id);
  assert.equal(muelle.lineas[1].efecto, olas.id);
  escribir(control('personaje'), '');
  assert.equal(muelle.lineas[1].personaje, null);
  assert.deepEqual(eventos.at(-1), { tipo: 'cambio', origen: 'propiedades', estructura: true }, 'el personaje se ve en el guion: redibuja');
  propiedades.dibujar({ tipo: 'linea', escena: muelle.id, indice: 0 });
  assert.deepEqual(etiquetas(), []);
  assert.match(contenedor.querySelector('.ayuda').textContent, /^Narración, línea 1 de 2/);
  contenedor.remove();
});

test('Personaje: nombre, descripción, retrato y eliminar', async () => {
  const { contenedor, propiedades, p, muelle, ana, retrato, selecciones, control } = await armar();
  propiedades.dibujar({ tipo: 'personaje', id: ana.id });
  assert.equal(control('nombre').value, 'Ana');
  assert.equal(control('descripcion').value, 'Farera.');
  assert.deepEqual(textos(control('retrato'), 'option'), ['Ninguno', 'Ana']);
  escribir(control('retrato'), retrato.id);
  assert.equal(ana.retrato, retrato.id);
  escribir(control('descripcion'), 'Farera en su primer turno.');
  assert.equal(ana.descripcion, 'Farera en su primer turno.');
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  assert.deepEqual(p.juego.personajes, []);
  assert.equal(muelle.lineas[1].personaje, null, 'sus diálogos quedan sin personaje');
  assert.equal(p.fichas[ana.id], undefined);
  assert.deepEqual(selecciones.at(-1), null);
  contenedor.remove();
});

test('Elemento: muestra la imagen (pixelada si es creada) o el audio, el origen, y eliminar quita también el archivo', async () => {
  const { contenedor, propiedades, p, sesion, fondo, tema, retrato, control } = await armar();
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id });
  assert.equal(contenedor.querySelector('h2').textContent, 'Fondo');
  const imagen = contenedor.querySelector('img.muestra');
  assert.equal(imagen.getAttribute('src'), 'blob:image/png');
  assert.ok(imagen.classList.contains('pixel'));
  assert.match(contenedor.querySelector('.ayuda').textContent, /Creado en la plataforma · m\.png/);
  escribir(control('nombre'), 'Muelle de noche');
  assert.equal(fondo.nombre, 'Muelle de noche');
  propiedades.dibujar({ tipo: 'elemento', id: tema.id });
  const audio = contenedor.querySelector('audio.muestra');
  assert.equal(audio.getAttribute('src'), 'blob:audio/ogg');
  assert.ok(audio.hasAttribute('controls'));
  propiedades.dibujar({ tipo: 'elemento', id: retrato.id });
  assert.equal(contenedor.querySelector('.muestra'), null);
  assert.match(contenedor.querySelector('.vacio').textContent, /No se encontró el archivo/);
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id });
  clic(contenedor.querySelector('button[data-accion="eliminar"]'));
  await sesion.esperarGuardado();
  assert.equal(p.juego.elementos.find((e) => e.id === fondo.id), undefined);
  assert.equal(p.fichas[fondo.id], undefined);
  assert.equal(sesion.archivos.has(fondo.id), false);
  contenedor.remove();
});

test('sin selección, o con algo que ya no existe, muestra textos de vacío', async () => {
  const { contenedor, propiedades } = await armar();
  propiedades.dibujar(null);
  assert.match(contenedor.querySelector('.vacio').textContent, /Selecciona algo/);
  propiedades.dibujar({ tipo: 'escena', id: 'esc_fantasma' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'linea', escena: 'esc_fantasma', indice: 0 });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'personaje', id: 'per_x' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  propiedades.dibujar({ tipo: 'elemento', id: 'el_x' });
  assert.match(contenedor.querySelector('.vacio').textContent, /ya no existe/);
  contenedor.remove();
});

test('El juego muestra las fichas del título y de la historia debajo de sus propiedades', async () => {
  const { contenedor, propiedades } = await armar();
  propiedades.dibujar({ tipo: 'juego' });
  const fichas = [...contenedor.querySelectorAll('section.ficha')];
  assert.deepEqual(fichas.map((f) => f.dataset.ficha), ['titulo', 'historia']);
  assert.deepEqual(fichas.map((f) => f.querySelector('h3').textContent), ['Ficha del título', 'Ficha de la historia']);
  assert.equal(fichas[0].querySelector('.ficha-color strong').textContent, 'Semáforo: verde');
  assert.ok(fichas[1].querySelector('fieldset[data-campo="autoria"]'), 'la historia sí tiene campos');
});

test('personaje y elemento muestran su ficha; enfocar lleva el foco a «¿Quién lo hizo?»', async () => {
  const { contenedor, propiedades, sesion, ana, fondo } = await armar();
  propiedades.dibujar({ tipo: 'personaje', id: ana.id });
  assert.equal(contenedor.querySelector('section.ficha').dataset.ficha, ana.id);
  assert.equal(contenedor.querySelector('section.ficha h3').textContent, 'Ficha jurídica del personaje');
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id }, { enfocar: `ficha:${fondo.id}:autoria` });
  assert.equal(contenedor.querySelector('section.ficha h3').textContent, 'Ficha jurídica del elemento');
  assert.equal(document.activeElement, contenedor.querySelector(`[data-foco="ficha:${fondo.id}:autoria:yo"]`));
  propiedades.dibujar({ tipo: 'elemento', id: fondo.id }, { enfocar: `ficha:${fondo.id}` });
  assert.equal(document.activeElement, contenedor.querySelector('section.ficha'), 'sin campo, el foco va a la ficha entera');
  propiedades.dibujar({ tipo: 'escena', id: sesion.proyecto.juego.escenas[0].id });
  assert.equal(contenedor.querySelector('section.ficha'), null, 'una escena no tiene ficha');
  contenedor.remove();
});
