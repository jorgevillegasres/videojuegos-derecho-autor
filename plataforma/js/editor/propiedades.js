// plataforma/js/editor/propiedades.js
// Columna derecha: propiedades de lo seleccionado (el juego, una escena, una línea, un
// personaje o un elemento). El plan 3 agrega aquí la ficha jurídica de elementos,
// personajes, título e historia. Los textos cambian sin redibujar (origen 'propiedades');
// lo que se ve en otras columnas (destino, personaje de la línea, escena inicial,
// eliminar) redibuja (estructura).
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { DESTINOS, eliminarEscena, eliminarPersonaje, eliminarElemento } from '../estado/modelo.js';
import { selector, campoTexto, areaTexto } from './controles.js';
import { NOMBRES_TIPO } from './inventario.js';
import { NOMBRES_LINEA } from './guion.js';

export const NOMBRES_DESTINO = { personal: 'Uso personal', gratis: 'Publicarlo gratis', venta: 'Venderlo' };
const NOMBRES_ORIGEN = { creado: 'Creado en la plataforma', subido: 'Subido', biblioteca: 'De la biblioteca' };

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {{ contenido?: object|null, alSeleccionar: (seleccion: object|null) => void, confirmar?: (mensaje: string) => boolean }} opciones
 *   contenido es el JSON de contenido/juridico.json (para la ayuda del destino); puede faltar.
 */
export function crearPropiedades(contenedor, sesion, { contenido = null, alSeleccionar, confirmar = (mensaje) => window.confirm(mensaje) }) {
  const cambiar = (fn, estructura = false) => sesion.cambiar(fn, { origen: 'propiedades', estructura });
  const nombreDe = (cosa, alternativa) => cosa.nombre?.trim() || alternativa;
  const elementosDe = (tipo) => sesion.proyecto.juego.elementos.filter((e) => e.tipo === tipo).map((e) => [e.id, nombreDe(e, 'Sin nombre')]);
  const panel = (titulo, ...hijos) => h('section', { class: 'propiedades', 'aria-label': `Propiedades: ${titulo}` }, h('h2', {}, titulo), hijos);
  const noExiste = (titulo, que) => panel(titulo, h('p', { class: 'vacio' }, `${que} ya no existe.`));
  const botonEliminar = (texto, mensaje, fn) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm peligro', dataset: { accion: 'eliminar' }, onclick: () => {
    if (!confirmar(mensaje)) return;
    fn();
    alSeleccionar(null);
  } }, texto);

  function deJuego() {
    const proyecto = sesion.proyecto;
    const { juego } = proyecto;
    const ayudaDestino = contenido?.campos?.destino?.breve ?? '';
    return panel('El juego',
      campoTexto('Título', 'titulo', juego.titulo, (v) => cambiar((p) => { p.juego.titulo = v; })),
      campoTexto('Nombre del estudiante', 'estudiante', proyecto.estudiante, (v) => cambiar((p) => { p.estudiante = v; })),
      selector('Destino del juego', 'destino', DESTINOS.map((d) => [d, NOMBRES_DESTINO[d]]), juego.destino, (v) => cambiar((p) => { p.juego.destino = v; }, true), { sinOpcion: null }),
      ayudaDestino ? h('p', { class: 'ayuda' }, ayudaDestino) : null,
      areaTexto('Sinopsis', 'sinopsis', juego.sinopsis, (v) => cambiar((p) => { p.juego.sinopsis = v; }), { filas: 4, placeholder: 'De qué trata el juego, en dos o tres líneas.' }));
  }

  function deEscena(id) {
    const { juego } = sesion.proyecto;
    const k = juego.escenas.findIndex((e) => e.id === id);
    const escena = juego.escenas[k];
    if (!escena) return noExiste('Escena', 'Esta escena');
    const esInicial = juego.escenaInicial === escena.id;
    return panel('Escena',
      campoTexto('Nombre', 'nombre', escena.nombre, (v) => cambiar(() => { escena.nombre = v; })),
      selector('Fondo', 'fondo', elementosDe('fondo'), escena.fondo, (v) => cambiar(() => { escena.fondo = v; })),
      selector('Música', 'musica', elementosDe('musica'), escena.musica, (v) => cambiar(() => { escena.musica = v; })),
      h('p', { class: 'ayuda' }, esInicial ? 'Es la escena inicial: el juego empieza aquí.' : 'El juego no empieza aquí.'),
      h('div', { class: 'acciones' },
        esInicial ? null : h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'hacer-inicial' }, onclick: () => cambiar((p) => { p.juego.escenaInicial = escena.id; }, true) }, 'Hacer inicial'),
        botonEliminar('Eliminar escena', `¿Eliminar la escena «${nombreDe(escena, `Escena ${k + 1}`)}» con todas sus líneas?`, () => cambiar((p) => eliminarEscena(p, escena.id), true))));
  }

  function deLinea(escenaId, indice) {
    const { juego } = sesion.proyecto;
    const escena = juego.escenas.find((e) => e.id === escenaId);
    const linea = escena?.lineas[indice];
    if (!linea) return noExiste('Línea', 'Esta línea');
    const hijos = [h('p', { class: 'ayuda' }, `${NOMBRES_LINEA[linea.tipo]}, línea ${indice + 1} de ${escena.lineas.length}. El texto se edita en el guion.`)];
    if (linea.tipo === 'dialogo') {
      hijos.push(
        selector('Personaje', 'personaje', juego.personajes.map((p) => [p.id, nombreDe(p, 'Sin nombre')]), linea.personaje, (v) => cambiar(() => { linea.personaje = v; }, true), { sinOpcion: 'Elige un personaje' }),
        selector('Efecto de sonido', 'efecto', elementosDe('efecto'), linea.efecto, (v) => cambiar(() => { linea.efecto = v; })),
        selector('Voz grabada', 'voz', elementosDe('voz'), linea.voz, (v) => cambiar(() => { linea.voz = v; })));
    }
    return panel('Línea', hijos);
  }

  function dePersonaje(id) {
    const { juego } = sesion.proyecto;
    const personaje = juego.personajes.find((p) => p.id === id);
    if (!personaje) return noExiste('Personaje', 'Este personaje');
    return panel('Personaje',
      campoTexto('Nombre', 'nombre', personaje.nombre, (v) => cambiar(() => { personaje.nombre = v; })),
      areaTexto('Descripción corta', 'descripcion', personaje.descripcion, (v) => cambiar(() => { personaje.descripcion = v; }), { filas: 2 }),
      selector('Retrato', 'retrato', elementosDe('retrato'), personaje.retrato, (v) => cambiar(() => { personaje.retrato = v; })),
      h('div', { class: 'acciones' },
        botonEliminar('Eliminar personaje', `¿Eliminar a «${nombreDe(personaje, 'Sin nombre')}»? Sus diálogos quedarán sin personaje.`, () => cambiar((p) => eliminarPersonaje(p, personaje.id), true))));
  }

  function deElemento(id) {
    const { juego } = sesion.proyecto;
    const elemento = juego.elementos.find((e) => e.id === id);
    if (!elemento) return noExiste('Elemento', 'Este elemento');
    const url = sesion.resolverRecurso(elemento.id);
    const esImagen = elemento.tipo === 'fondo' || elemento.tipo === 'retrato';
    let muestra;
    if (!url) muestra = h('p', { class: 'vacio' }, 'No se encontró el archivo de este elemento.');
    else if (esImagen) muestra = h('img', { class: `muestra${elemento.origen === 'creado' ? ' pixel' : ''}`, src: url, alt: `Vista de ${nombreDe(elemento, 'el elemento')}` });
    else muestra = h('audio', { class: 'muestra', controls: true, preload: 'none', src: url });
    return panel(NOMBRES_TIPO[elemento.tipo],
      campoTexto('Nombre', 'nombre', elemento.nombre, (v) => cambiar(() => { elemento.nombre = v; })),
      h('p', { class: 'ayuda' }, `${NOMBRES_ORIGEN[elemento.origen]} · ${elemento.archivo}`),
      muestra,
      h('div', { class: 'acciones' },
        botonEliminar('Eliminar elemento', `¿Eliminar «${nombreDe(elemento, 'Sin nombre')}»? Las escenas, personajes y líneas que lo usan quedarán sin él.`, () => {
          cambiar((p) => eliminarElemento(p, elemento.id), true);
          sesion.quitarArchivo(elemento.id).catch(() => {});
        })));
  }

  function dibujar(seleccion) {
    conservarFoco(contenedor, () => {
      vaciar(contenedor);
      if (!seleccion) {
        contenedor.append(h('p', { class: 'vacio' }, 'Selecciona algo del inventario o del guion para ver sus propiedades.'));
        return;
      }
      const vistas = {
        juego: () => deJuego(),
        escena: () => deEscena(seleccion.id),
        linea: () => deLinea(seleccion.escena, seleccion.indice),
        personaje: () => dePersonaje(seleccion.id),
        elemento: () => deElemento(seleccion.id),
      };
      contenedor.append(vistas[seleccion.tipo]());
    });
  }

  return { dibujar };
}
