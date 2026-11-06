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

export function crearInventario(contenedor, sesion, { alSeleccionar, alSubir }) {
  function entrada({ clave, texto, detalle = null, activa = false, marca = null, alPulsar }) {
    return h('li', {},
      h('button', { type: 'button', class: `entrada${activa ? ' activa' : ''}`, dataset: { foco: clave }, 'aria-current': activa ? 'true' : null, onclick: alPulsar },
        marca,
        h('span', { class: 'entrada-texto' }, texto),
        detalle ? h('span', { class: 'entrada-detalle' }, detalle) : null));
  }

  function seccion(titulo, textoBoton, alCrear, entradas) {
    return h('section', { class: 'inventario-seccion' },
      h('div', { class: 'inventario-cabecera' }, h('h2', {}, titulo), h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: alCrear }, textoBoton)),
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
        h('ul', { class: 'lista' }, entrada({ clave: 'juego', texto: juego.titulo?.trim() || 'Sin título', detalle: 'El juego', activa: seleccion?.tipo === 'juego', alPulsar: () => alSeleccionar({ tipo: 'juego' }) })),
        seccion('Escenas', 'Nueva escena', nuevaEscena, juego.escenas.map((escena, i) => entrada({
          clave: `escena:${escena.id}`,
          texto: escena.nombre?.trim() || `Escena ${i + 1}`,
          detalle: escena.id === juego.escenaInicial ? 'inicial' : null,
          activa: escenaActiva === escena.id,
          marca: marcaAvisos(avisos.filter((a) => a.escena === escena.id)),
          alPulsar: () => alSeleccionar({ tipo: 'escena', id: escena.id }),
        }))),
        seccion('Personajes', 'Nuevo personaje', nuevoPersonaje, juego.personajes.map((personaje) => entrada({
          clave: `personaje:${personaje.id}`,
          texto: personaje.nombre?.trim() || 'Sin nombre',
          detalle: personaje.retrato ? null : 'sin retrato',
          activa: esActiva('personaje', personaje.id),
          marca: punto(personaje.id, personaje.nombre?.trim() || 'Sin nombre'),
          alPulsar: () => alSeleccionar({ tipo: 'personaje', id: personaje.id }),
        }))),
        seccion('Elementos', 'Subir archivo', alSubir, juego.elementos.map((elemento) => entrada({
          clave: `elemento:${elemento.id}`,
          texto: elemento.nombre?.trim() || 'Sin nombre',
          detalle: NOMBRES_TIPO[elemento.tipo],
          activa: esActiva('elemento', elemento.id),
          marca: punto(elemento.id, elemento.nombre?.trim() || 'Sin nombre'),
          alPulsar: () => alSeleccionar({ tipo: 'elemento', id: elemento.id }),
        }))),
      ));
    });
  }

  return { dibujar };
}
