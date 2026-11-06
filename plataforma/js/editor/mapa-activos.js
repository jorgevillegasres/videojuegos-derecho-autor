// plataforma/js/editor/mapa-activos.js
// El mapa de activos (spec, sección 12.8) sobre el editor: la tabla del taller, llena
// sola, con enlace a cada ficha. Las filas salen de juridico/mapa.js.
import { h, vaciar } from '../ui/dom.js';
import { filas } from '../juridico/mapa.js';
import { puntoSemaforo, NOMBRES_COLOR } from './panel-ficha.js';

const COLUMNAS = ['Activo', '¿Quién lo creó?', 'Contrato o licencia', 'Prueba', 'Riesgo', 'Acción', ''];

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} sesion de crearSesion
 * @param {{ contenido: object, alSeleccionar: (seleccion: object, enfocar: string) => void, alCerrar?: () => void }} opciones
 */
export function crearMapaActivos(contenedor, sesion, { contenido, alSeleccionar, alCerrar = () => {} }) {
  let abierto = false;

  function seleccionDe(fila) {
    if (fila.id === 'titulo' || fila.id === 'historia') return { seleccion: { tipo: 'juego' }, enfocar: `ficha:${fila.id}` };
    const esPersonaje = sesion.proyecto.juego.personajes.some((p) => p.id === fila.id);
    return { seleccion: { tipo: esPersonaje ? 'personaje' : 'elemento', id: fila.id }, enfocar: `ficha:${fila.id}` };
  }

  function verFicha(fila) {
    cerrar();
    const { seleccion, enfocar } = seleccionDe(fila);
    alSeleccionar(seleccion, enfocar);
  }

  function dibujar() {
    const lista = filas(sesion.proyecto, contenido);
    const cuenta = { verde: 0, amarillo: 0, rojo: 0 };
    for (const fila of lista) cuenta[fila.color] += 1;
    vaciar(contenedor).append(h('div', { class: 'mapa', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'mapa-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {},
          h('h2', { id: 'mapa-titulo' }, 'Mapa de activos'),
          h('p', { class: 'mapa-resumen' }, `${lista.length} activos: ${cuenta.verde} en verde, ${cuenta.amarillo} en amarillo, ${cuenta.rojo} en rojo.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cerrar-mapa' }, onclick: cerrar }, 'Cerrar')),
      h('div', { class: 'table-wrap' }, h('table', { class: 'mapa-tabla' },
        h('thead', {}, h('tr', {}, COLUMNAS.map((texto) => h('th', { scope: 'col' }, texto)))),
        h('tbody', {}, lista.map((fila) => h('tr', { dataset: { ficha: fila.id }, class: `riesgo-${fila.color}` },
          h('td', {}, h('strong', {}, fila.activo), h('span', { class: 'mapa-tipo' }, fila.tipo)),
          h('td', {}, fila.creador),
          h('td', {}, fila.contrato),
          h('td', {}, fila.prueba),
          h('td', {}, puntoSemaforo(fila.color, `Riesgo de ${fila.activo}`), ' ', NOMBRES_COLOR[fila.color], ' ',
            fila.porVerificar ? h('span', { class: 'por-verificar', title: 'Algún texto de esta fila está pendiente de verificación jurídica' }, 'Por verificar') : null),
          h('td', {}, fila.acciones.length ? h('ul', { class: 'mapa-acciones' }, fila.acciones.map((a) => h('li', {}, a))) : 'Nada por hacer'),
          h('td', {}, h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'ver-ficha' }, onclick: () => verFicha(fila) }, 'Ver ficha')),
        ))))),
    ));
    contenedor.querySelector('button[data-accion="cerrar-mapa"]')?.focus();
  }

  function abrir() {
    abierto = true;
    contenedor.hidden = false;
    dibujar();
  }

  function cerrar() {
    if (!abierto) return;
    abierto = false;
    vaciar(contenedor);
    contenedor.hidden = true;
    alCerrar();
  }

  return {
    abrir,
    cerrar,
    dibujar: () => { if (abierto) dibujar(); },
    get abierto() { return abierto; },
  };
}
