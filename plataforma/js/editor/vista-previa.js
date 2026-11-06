// plataforma/js/editor/vista-previa.js
// Columna central, arriba: la línea seleccionada tal como se verá en el juego, con la
// misma pantalla del reproductor (spec, sección 8: lo que se prueba es lo que se entrega).
import { crearPantalla } from '../motor/pantalla.js';
import { vistaDeLinea } from '../motor/partida.js';
import { h, vaciar } from '../ui/dom.js';

export function crearVistaPrevia(contenedor, sesion) {
  function dibujar(escena, indice) {
    vaciar(contenedor);
    if (!escena) {
      contenedor.append(h('p', { class: 'vacio' }, 'Selecciona una escena para ver cómo se verá.'));
      return;
    }
    const { juego } = sesion.proyecto;
    const zona = h('div', { class: 'vista-previa', role: 'img', 'aria-label': 'Vista previa de la línea seleccionada' });
    contenedor.append(zona);
    const pantalla = crearPantalla(zona, { juego, resolverRecurso: (id) => sesion.resolverRecurso(id) });
    pantalla.mostrar(vistaDeLinea(juego, escena, indice ?? 0));
  }
  return { dibujar };
}
