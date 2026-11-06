// plataforma/js/editor/guion.js
// Columna central, abajo: el guion de la escena activa como bloques que se editan en
// el lugar. Se reordena con los botones de subir y bajar (teclado) y arrastrando.
// Escribir cambia el texto sin redibujar (origen 'guion', sin estructura); agregar,
// mover, quitar y cambiar el número de opciones redibujan (estructura).
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { agregarLinea, moverLinea, eliminarLinea, indiceCorte } from '../estado/modelo.js';
import { OPCIONES_MIN, OPCIONES_MAX } from '../estado/validacion.js';
import { selector } from './controles.js';

export const NOMBRES_LINEA = { narracion: 'Narración', dialogo: 'Diálogo', decision: 'Decisión', fin: 'Fin' };
const MARCADORES = {
  narracion: 'Lo que cuenta el narrador…',
  dialogo: 'Lo que dice el personaje…',
  decision: 'La pregunta que se le hace al jugador…',
  fin: 'El texto de cierre…',
};

/**
 * @param {HTMLElement} contenedor
 * @param {object} sesion de crearSesion
 * @param {{ alSeleccionar: (indice: number|null) => void, confirmar?: (mensaje: string) => boolean }} opciones
 */
export function crearGuion(contenedor, sesion, { alSeleccionar, confirmar = (mensaje) => window.confirm(mensaje) }) {
  let escenaId = null;

  const escenaActual = () => sesion.proyecto.juego.escenas.find((e) => e.id === escenaId) ?? null;
  const cambiar = (fn, estructura = false) => sesion.cambiar((proyecto) => fn(escenaActual(), proyecto), { origen: 'guion', estructura });

  function agregar(tipo) {
    const indice = cambiar((escena, proyecto) => {
      const datos = tipo === 'dialogo' ? { personaje: proyecto.juego.personajes[0]?.id ?? null } : {};
      agregarLinea(escena, tipo, datos);
      return escena.lineas.length - 1;
    }, true);
    alSeleccionar(indice);
  }

  function mover(indice, desplazamiento) {
    const destino = indice + desplazamiento;
    const largo = escenaActual()?.lineas.length ?? 0;
    if (destino < 0 || destino >= largo) return;
    cambiar((escena) => moverLinea(escena, indice, desplazamiento), true);
    alSeleccionar(destino);
  }

  function eliminar(indice) {
    if (!confirmar('¿Eliminar esta línea? No se puede deshacer.')) return;
    const restantes = cambiar((escena) => {
      eliminarLinea(escena, indice);
      return escena.lineas.length;
    }, true);
    alSeleccionar(restantes ? Math.min(indice, restantes - 1) : null);
  }

  function opciones(linea, i) {
    const destinos = sesion.proyecto.juego.escenas.map((e, k) => [e.id, e.nombre?.trim() || `Escena ${k + 1}`]);
    return h('div', { class: 'opciones' },
      linea.opciones.map((opcion, j) => h('div', { class: 'opcion-fila' },
        h('span', { class: 'opcion-numero', 'aria-hidden': 'true' }, String(j + 1)),
        h('input', { type: 'text', class: 'opcion-texto', dataset: { foco: `opcion:${i}:${j}` }, placeholder: `Opción ${j + 1}`, value: opcion.texto, 'aria-label': `Texto de la opción ${j + 1}`, oninput: (e) => cambiar(() => { opcion.texto = e.target.value; }) }),
        selector('Lleva a', `destino:${i}:${j}`, destinos, opcion.escena, (valor) => cambiar(() => { opcion.escena = valor; }), { sinOpcion: 'Elige una escena' }),
        h('button', { type: 'button', class: 'icono', dataset: { accion: 'quitar-opcion' }, 'aria-label': `Quitar la opción ${j + 1}`, disabled: linea.opciones.length <= OPCIONES_MIN, onclick: () => cambiar(() => { linea.opciones.splice(j, 1); }, true) }, '✕'))),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'agregar-opcion' }, disabled: linea.opciones.length >= OPCIONES_MAX, onclick: () => cambiar(() => { linea.opciones.push({ texto: '', escena: null }); }, true) }, 'Agregar opción'));
  }

  function bloque(linea, i, { escena, juego, corte, seleccionada }) {
    const trasCorte = corte !== -1 && i > corte;
    const seleccionar = () => alSeleccionar(i);
    const accion = (nombre, texto, etiqueta, deshabilitado, alPulsar) =>
      h('button', { type: 'button', class: 'icono', dataset: { foco: `${nombre}:${i}`, accion: nombre }, 'aria-label': etiqueta, disabled: deshabilitado, onclick: (e) => { e.stopPropagation(); alPulsar(); } }, texto);
    const cabecera = h('div', { class: 'linea-cabecera' },
      h('span', { class: 'linea-asa', draggable: true, title: 'Arrastra para reordenar', 'aria-hidden': 'true', ondragstart: (e) => { e.dataTransfer?.setData('text/plain', String(i)); } }, '⋮⋮'),
      h('span', { class: `linea-tipo tipo-${linea.tipo}` }, NOMBRES_LINEA[linea.tipo]),
      trasCorte ? h('span', { class: 'aviso-gris', title: 'Está después de la decisión o el fin: nunca se verá.' }, 'no se verá') : null,
      h('span', { class: 'linea-acciones' },
        accion('subir', '▲', `Subir la línea ${i + 1}`, i === 0, () => mover(i, -1)),
        accion('bajar', '▼', `Bajar la línea ${i + 1}`, i === escena.lineas.length - 1, () => mover(i, 1)),
        accion('eliminar', '✕', `Eliminar la línea ${i + 1}`, false, () => eliminar(i))));
    const cuerpo = [];
    if (linea.tipo === 'dialogo') {
      cuerpo.push(selector('Personaje', `personaje:${i}`, juego.personajes.map((p) => [p.id, p.nombre?.trim() || 'Sin nombre']), linea.personaje, (valor) => cambiar(() => { linea.personaje = valor; }), { sinOpcion: 'Elige un personaje' }));
    }
    cuerpo.push(h('textarea', { class: 'linea-texto', rows: 2, dataset: { foco: `texto:${i}` }, placeholder: MARCADORES[linea.tipo], value: linea.texto, 'aria-label': `Texto de la línea ${i + 1}`, oninput: (e) => cambiar(() => { linea.texto = e.target.value; }), onfocus: seleccionar }));
    if (linea.tipo === 'decision') cuerpo.push(opciones(linea, i));
    return h('li', {
      class: `linea linea-${linea.tipo}${seleccionada ? ' seleccionada' : ''}${trasCorte ? ' tras-corte' : ''}`,
      dataset: { indice: String(i) },
      'aria-current': seleccionada ? 'true' : null,
      onclick: seleccionar,
      ondragover: (e) => e.preventDefault(),
      ondrop: (e) => {
        e.preventDefault();
        const origen = Number(e.dataTransfer?.getData('text/plain'));
        if (Number.isInteger(origen) && origen !== i) mover(origen, i - origen);
      },
    }, cabecera, cuerpo);
  }

  function dibujar(escena, indiceSeleccionado = null) {
    escenaId = escena?.id ?? null;
    conservarFoco(contenedor, () => {
      vaciar(contenedor);
      if (!escena) {
        contenedor.append(h('p', { class: 'vacio' }, 'Selecciona una escena para editar su guion.'));
        return;
      }
      const corte = indiceCorte(escena);
      const { juego } = sesion.proyecto;
      contenedor.append(h('section', { class: 'guion', 'aria-label': 'Guion de la escena' },
        h('div', { class: 'guion-cabecera' }, h('h2', {}, escena.nombre?.trim() || 'Escena sin nombre'), h('span', { class: 'guion-cuenta' }, `${escena.lineas.length} línea(s)`)),
        escena.lineas.length
          ? h('ol', { class: 'lineas' }, escena.lineas.map((linea, i) => bloque(linea, i, { escena, juego, corte, seleccionada: i === indiceSeleccionado })))
          : h('p', { class: 'vacio' }, 'Esta escena no tiene líneas. Agrega la primera con los botones de abajo.'),
        h('div', { class: 'guion-agregar', role: 'group', 'aria-label': 'Agregar línea' },
          h('span', { class: 'guion-etiqueta' }, 'Línea:'),
          Object.keys(NOMBRES_LINEA).map((tipo) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { agregar: tipo }, onclick: () => agregar(tipo) }, NOMBRES_LINEA[tipo])))));
    });
  }

  /** Cambia la línea marcada sin redibujar, para no perder el foco ni el cursor. */
  function marcarSeleccion(indice) {
    for (const nodo of contenedor.querySelectorAll('li.linea')) {
      const activa = Number(nodo.dataset.indice) === indice;
      nodo.classList.toggle('seleccionada', activa);
      if (activa) nodo.setAttribute('aria-current', 'true');
      else nodo.removeAttribute('aria-current');
    }
  }

  return { dibujar, marcarSeleccion };
}
