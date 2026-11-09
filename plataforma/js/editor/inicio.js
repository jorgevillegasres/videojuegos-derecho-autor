// plataforma/js/editor/inicio.js
// Pantalla de arranque (diseño del modo guiado, sección 9): el estudiante va a recibir un
// juego terminado y hacerlo suyo, qué va a entregar y que nada sale del navegador. Pide
// nombre y destino, o abre una copia. «Empezar» arma el juego de ejemplo; mientras tanto el
// botón dice «Preparando el ejemplo…». Sin biblioteca el ejemplo no se puede armar y lo dice.
import { h, vaciar } from '../ui/dom.js';
import { DESTINOS } from '../estado/modelo.js';
import { NOMBRES_DESTINO } from './propiedades.js';

const EXPLICACION_DESTINO = {
  personal: 'Solo tú lo juegas.',
  gratis: 'Lo publicas sin cobrar.',
  venta: 'Lo vendes o lo monetizas.',
};

/**
 * @param {object} opciones alEmpezar({ estudiante, destino }) puede ser asíncrona: si falla, su mensaje se muestra
 *   y «Empezar» vuelve a habilitarse. ejemploDisponible es falso si la biblioteca no cargó.
 */
export function crearInicio(contenedor, { nombreProducto, contenido = null, ejemploDisponible = true, alEmpezar, alAbrirCopia }) {
  let error = null;

  function mostrarError(mensaje) {
    if (!error) return;
    error.textContent = mensaje;
    error.hidden = !mensaje;
  }

  function dibujar() {
    const estudiante = h('input', { type: 'text', id: 'inicio-estudiante', name: 'estudiante', autocomplete: 'name', maxlength: '80' });
    const radios = DESTINOS.map((destino) => h('input', { type: 'radio', name: 'destino', value: destino, checked: destino === 'gratis' }));
    error = h('p', { class: 'inicio-error', role: 'alert', hidden: true });
    const ayudaDestino = contenido?.campos?.destino?.breve ?? '';
    const empezar = h('button', { type: 'submit', class: 'btn btn-primary', disabled: !ejemploDisponible }, 'Empezar');

    const formulario = h('form', { class: 'inicio-formulario', novalidate: true, onsubmit: async (evento) => {
      evento.preventDefault();
      if (empezar.disabled) return;
      const nombre = estudiante.value.trim();
      if (!nombre) {
        mostrarError('Escribe tu nombre para empezar.');
        estudiante.focus();
        return;
      }
      mostrarError('');
      empezar.disabled = true;
      empezar.textContent = 'Preparando el ejemplo…';
      try {
        await alEmpezar({ estudiante: nombre, destino: radios.find((r) => r.checked)?.value ?? 'gratis' });
      } catch (fallo) {
        empezar.disabled = false;
        empezar.textContent = 'Empezar';
        mostrarError(fallo?.message ?? String(fallo));
      }
    } },
      h('div', { class: 'campo' }, h('label', { for: 'inicio-estudiante', class: 'campo-etiqueta' }, 'Tu nombre'), estudiante),
      h('fieldset', { class: 'destinos' },
        h('legend', {}, 'Destino del juego'),
        DESTINOS.map((destino, i) => h('label', { class: 'opcion-destino' }, radios[i], h('span', { class: 'opcion-nombre' }, NOMBRES_DESTINO[destino]), h('span', { class: 'opcion-explicacion' }, EXPLICACION_DESTINO[destino]))),
        ayudaDestino ? h('p', { class: 'ayuda' }, ayudaDestino) : null),
      ejemploDisponible ? null : h('p', { class: 'inicio-sin-ejemplo' }, 'No se puede preparar el juego de ejemplo porque la biblioteca no está disponible. Si tienes una copia de tu proyecto, ábrela.'),
      error,
      h('div', { class: 'acciones' },
        empezar,
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'abrir-copia' }, onclick: alAbrirCopia }, 'Abrir una copia')));

    vaciar(contenedor).append(h('main', { class: 'inicio', id: 'contenido' },
      h('p', { class: 'eyebrow' }, 'Plataforma de práctica'),
      h('h1', {}, nombreProducto),
      h('div', { class: 'inicio-explicacion' },
        h('p', {}, 'Vas a recibir un juego terminado, «La llave del faro», y a hacerlo tuyo pieza por pieza: la historia, los personajes, sus retratos, el fondo, la música y los efectos. Cada pieza que entre al juego abre una ficha jurídica con semáforo que tú resuelves.'),
        h('p', {}, 'Puedes jugar tu juego cuantas veces quieras. Cuando no quede nada del ejemplo y todas las fichas estén en verde, lo publicas y descargas un paquete con el juego, su informe jurídico y el proyecto en bruto, que subes al formulario del curso.'),
        h('p', { class: 'privacidad' }, 'Nada sale de tu navegador: tu nombre, tus archivos y tus grabaciones se guardan aquí y en las copias que tú mismo descargues.')),
      formulario,
      contenido?.aviso ? h('p', { class: 'aviso-legal' }, contenido.aviso) : null));
    estudiante.focus();
  }

  return { dibujar, mostrarError };
}
