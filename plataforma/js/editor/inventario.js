// plataforma/js/editor/inventario.js
// Columna izquierda: la entrada fija «El juego», y las listas de escenas (con su
// aviso gris), personajes y elementos, cada una con su botón de crear. El punto de
// semáforo de personajes y elementos queda como marcador vacío (data-ficha) y lo
// colorea el plan 3.
//
// Selección: { tipo: 'juego' } | { tipo: 'escena', id } | { tipo: 'linea', escena, indice }
//          | { tipo: 'personaje', id } | { tipo: 'elemento', id }
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { validar } from '../estado/validacion.js';
import { agregarEscena, agregarPersonaje } from '../estado/modelo.js';
import { evaluarTodo } from '../juridico/semaforo.js';
import { puntoSemaforo } from './panel-ficha.js';

export const NOMBRES_TIPO = { fondo: 'Fondo', retrato: 'Retrato', musica: 'Música', efecto: 'Efecto', voz: 'Voz' };

export function crearInventario(contenedor, sesion, { alSeleccionar, alSubir, alBiblioteca = null, alCrear = null }) {
  function entrada({ clave, texto, detalle = null, activa = false, marca = null, clase = '', alPulsar }) {
    return h('li', {},
      h('button', { type: 'button', class: `entrada${activa ? ' activa' : ''}${clase ? ` ${clase}` : ''}`, dataset: { foco: clave }, 'aria-current': activa ? 'true' : null, onclick: alPulsar },
        marca,
        h('span', { class: 'entrada-texto' }, texto),
        detalle ? h('span', { class: 'entrada-detalle' }, detalle) : null));
  }

  const botonCrear = (texto, alPulsar, extra = {}) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: alPulsar, ...extra }, texto);

  // data-seccion permite que la guía resalte o atenúe cada sección según la fase.
  function seccion(clave, titulo, botones, entradas) {
    return h('section', { class: 'inventario-seccion', dataset: { seccion: clave } },
      h('div', { class: 'inventario-cabecera' }, h('h2', {}, titulo), h('span', { class: 'inventario-botones' }, botones)),
      entradas.length ? h('ul', { class: 'lista' }, entradas) : h('p', { class: 'vacio' }, 'Nada todavía.'));
  }

  function marcaAvisos(propios) {
    if (!propios.length) return h('span', { class: 'marca-vacia', 'aria-hidden': 'true' });
    return h('span', { class: 'aviso-gris', title: propios.map((a) => a.mensaje).join('\n'), 'aria-label': `${propios.length} aviso(s)`, role: 'img' }, '!');
  }

  function nuevaEscena() {
    const escena = sesion.cambiar((p) => agregarEscena(p, `Escena ${p.juego.escenas.length + 1}`), { origen: 'inventario', estructura: true });
    alSeleccionar({ tipo: 'escena', id: escena.id });
  }

  function nuevoPersonaje() {
    const personaje = sesion.cambiar((p) => agregarPersonaje(p, { nombre: `Personaje ${p.juego.personajes.length + 1}` }), { origen: 'inventario', estructura: true });
    alSeleccionar({ tipo: 'personaje', id: personaje.id });
  }

  function dibujar(seleccion) {
    const { juego } = sesion.proyecto;
    const avisos = validar(juego);
    const semaforos = evaluarTodo(sesion.proyecto);
    const punto = (id, nombre) => {
      const nodo = puntoSemaforo(semaforos.get(id)?.color ?? 'verde', `Semáforo de ${nombre}`);
      nodo.dataset.ficha = id;
      return nodo;
    };
    const esActiva = (tipo, id) => seleccion?.tipo === tipo && seleccion.id === id;
    const escenaActiva = seleccion?.tipo === 'escena' ? seleccion.id : seleccion?.tipo === 'linea' ? seleccion.escena : null;
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('nav', { class: 'inventario', 'aria-label': 'Inventario' },
        h('ul', { class: 'lista', dataset: { seccion: 'juego' } }, entrada({ clave: 'juego', texto: juego.titulo?.trim() || 'Sin título', detalle: 'El juego', activa: seleccion?.tipo === 'juego', marca: h('span', { class: 'marca-vacia', 'aria-hidden': 'true' }), alPulsar: () => alSeleccionar({ tipo: 'juego' }) })),
        seccion('escenas', 'Escenas', [botonCrear('Nueva escena', nuevaEscena)], juego.escenas.map((escena, i) => entrada({
          clave: `escena:${escena.id}`,
          texto: escena.nombre?.trim() || `Escena ${i + 1}`,
          detalle: escena.id === juego.escenaInicial ? 'inicial' : null,
          activa: escenaActiva === escena.id,
          marca: marcaAvisos(avisos.filter((a) => a.escena === escena.id)),
          alPulsar: () => alSeleccionar({ tipo: 'escena', id: escena.id }),
        }))),
        seccion('personajes', 'Personajes', [botonCrear('Nuevo personaje', nuevoPersonaje)], juego.personajes.map((personaje) => entrada({
          clave: `personaje:${personaje.id}`,
          texto: personaje.nombre?.trim() || 'Sin nombre',
          detalle: personaje.retrato ? null : 'sin retrato',
          activa: esActiva('personaje', personaje.id),
          marca: punto(personaje.id, personaje.nombre?.trim() || 'Sin nombre'),
          alPulsar: () => alSeleccionar({ tipo: 'personaje', id: personaje.id }),
        }))),
        seccion('elementos', 'Elementos', [
          botonCrear('Pixel art', alCrear ? () => alCrear('pixel') : undefined, { dataset: { accion: 'crear-pixel' }, disabled: !alCrear, title: alCrear ? 'Dibujar un fondo o un retrato' : 'Las herramientas no están disponibles' }),
          botonCrear('Grabar', alCrear ? () => alCrear('grabar') : undefined, { dataset: { accion: 'crear-grabar' }, disabled: !alCrear, title: alCrear ? 'Grabar una voz o un efecto con el micrófono' : 'Las herramientas no están disponibles' }),
          botonCrear('Secuenciador', alCrear ? () => alCrear('secuencia') : undefined, { dataset: { accion: 'crear-secuencia' }, disabled: !alCrear, title: alCrear ? 'Componer una pista' : 'Las herramientas no están disponibles' }),
          botonCrear('Biblioteca', alBiblioteca ?? undefined, { dataset: { accion: 'biblioteca' }, disabled: !alBiblioteca, title: alBiblioteca ? null : 'La biblioteca no está disponible' }),
          botonCrear('Subir archivo', alSubir, { dataset: { accion: 'subir' } }),
        ], juego.elementos.map((elemento) => {
          // Los retratos de muestra del ejemplo no tienen semáforo: se reemplazan.
          const deMuestra = elemento.origen === 'muestra';
          return entrada({
            clave: `elemento:${elemento.id}`,
            texto: elemento.nombre?.trim() || 'Sin nombre',
            detalle: deMuestra ? `${NOMBRES_TIPO[elemento.tipo]} de muestra` : NOMBRES_TIPO[elemento.tipo],
            activa: esActiva('elemento', elemento.id),
            clase: deMuestra ? 'entrada-muestra' : '',
            marca: deMuestra ? h('span', { class: 'marca-muestra', 'aria-hidden': 'true' }) : punto(elemento.id, elemento.nombre?.trim() || 'Sin nombre'),
            alPulsar: () => alSeleccionar({ tipo: 'elemento', id: elemento.id }),
          });
        })),
      ));
    });
  }

  return { dibujar };
}
