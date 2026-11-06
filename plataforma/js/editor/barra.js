// plataforma/js/editor/barra.js
// Barra superior: título del juego y nombre del estudiante; Jugar, Guardar copia,
// Abrir copia, Nuevo juego y Publicar. Publicar lleva candado hasta que puedePublicar
// diga que sí; al pasar el cursor o enfocarlo, dice qué falta (la lista se muestra con
// CSS en :hover y :focus-within).
import { h, vaciar, conservarFoco } from '../ui/dom.js';
import { puedePublicar } from '../estado/validacion.js';

const MAXIMO_MOTIVOS = 8;

export function crearBarra(contenedor, sesion, { alJugar, alMapa, alGuardarCopia, alAbrirCopia, alNuevoJuego, alPublicar }) {
  const boton = (accion, texto, alPulsar, clase = 'btn-ghost') =>
    h('button', { type: 'button', class: `btn ${clase} btn-sm`, dataset: { foco: accion, accion }, onclick: alPulsar }, texto);

  function queFalta(decision) {
    if (decision.ok) return 'Todo listo para publicar.';
    const motivos = decision.motivos.map((m) => m.mensaje);
    const visibles = motivos.slice(0, MAXIMO_MOTIVOS);
    const resto = motivos.length - visibles.length;
    return [
      h('p', {}, `Falta para publicar (${motivos.length}):`),
      h('ul', {}, visibles.map((m) => h('li', {}, m))),
      resto > 0 ? h('p', {}, `y ${resto} más.`) : null,
    ];
  }

  function dibujar() {
    const proyecto = sesion.proyecto;
    const decision = puedePublicar(proyecto);
    conservarFoco(contenedor, () => {
      vaciar(contenedor).append(h('header', { class: 'barra' },
        h('div', { class: 'barra-titulo' },
          h('span', { class: 'barra-juego' }, proyecto.juego.titulo?.trim() || 'Sin título'),
          h('span', { class: 'barra-estudiante' }, proyecto.estudiante?.trim() || 'Sin nombre')),
        h('div', { class: 'barra-acciones' },
          boton('jugar', 'Jugar', alJugar, 'btn-primary'),
          boton('mapa', 'Mapa de activos', alMapa),
          boton('guardar-copia', 'Guardar copia', alGuardarCopia),
          boton('abrir-copia', 'Abrir copia', alAbrirCopia),
          boton('nuevo-juego', 'Nuevo juego', alNuevoJuego),
          h('span', { class: 'publicar' },
            h('button', {
              type: 'button',
              class: `btn btn-sm ${decision.ok ? 'btn-primary' : 'btn-ghost con-candado'}`,
              dataset: { foco: 'publicar', accion: 'publicar' },
              'aria-describedby': 'publicar-falta',
              'aria-disabled': decision.ok ? null : 'true',
              onclick: () => { if (decision.ok) alPublicar(); },
            }, decision.ok ? null : h('span', { class: 'candado', 'aria-hidden': 'true' }, '🔒'), 'Publicar'),
            h('div', { id: 'publicar-falta', class: 'publicar-falta', role: 'tooltip' }, queFalta(decision))))));
    });
  }

  return { dibujar };
}
