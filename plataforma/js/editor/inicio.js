// plataforma/js/editor/inicio.js
// Pantalla de arranque (spec, sección 3, paso 1): qué va a hacer el estudiante, qué va
// a entregar y que nada sale del navegador. Pide nombre, título y destino, o abre una copia.
import { h, vaciar } from '../ui/dom.js';
import { DESTINOS } from '../estado/modelo.js';
import { NOMBRES_DESTINO } from './propiedades.js';

const EXPLICACION_DESTINO = {
  personal: 'Solo tú lo juegas.',
  gratis: 'Lo publicas sin cobrar.',
  venta: 'Lo vendes o lo monetizas.',
};

export function crearInicio(contenedor, { nombreProducto, contenido = null, alEmpezar, alAbrirCopia }) {
  let error = null;

  function mostrarError(mensaje) {
    if (!error) return;
    error.textContent = mensaje;
    error.hidden = !mensaje;
  }

  function dibujar() {
    const estudiante = h('input', { type: 'text', id: 'inicio-estudiante', name: 'estudiante', autocomplete: 'name', maxlength: '80' });
    const titulo = h('input', { type: 'text', id: 'inicio-titulo', name: 'titulo', maxlength: '120', placeholder: 'Puedes cambiarlo después' });
    const radios = DESTINOS.map((destino) => h('input', { type: 'radio', name: 'destino', value: destino, checked: destino === 'gratis' }));
    error = h('p', { class: 'inicio-error', role: 'alert', hidden: true });
    const ayudaDestino = contenido?.campos?.destino?.breve ?? '';

    const formulario = h('form', { class: 'inicio-formulario', novalidate: true, onsubmit: (evento) => {
      evento.preventDefault();
      const nombre = estudiante.value.trim();
      if (!nombre) {
        mostrarError('Escribe tu nombre para empezar.');
        estudiante.focus();
        return;
      }
      mostrarError('');
      alEmpezar({ estudiante: nombre, titulo: titulo.value.trim(), destino: radios.find((r) => r.checked)?.value ?? 'gratis' });
    } },
      h('div', { class: 'campo' }, h('label', { for: 'inicio-estudiante', class: 'campo-etiqueta' }, 'Tu nombre'), estudiante),
      h('div', { class: 'campo' }, h('label', { for: 'inicio-titulo', class: 'campo-etiqueta' }, 'Título del juego'), titulo),
      h('fieldset', { class: 'destinos' },
        h('legend', {}, 'Destino del juego'),
        DESTINOS.map((destino, i) => h('label', { class: 'opcion-destino' }, radios[i], h('span', { class: 'opcion-nombre' }, NOMBRES_DESTINO[destino]), h('span', { class: 'opcion-explicacion' }, EXPLICACION_DESTINO[destino]))),
        ayudaDestino ? h('p', { class: 'ayuda' }, ayudaDestino) : null),
      error,
      h('div', { class: 'acciones' },
        h('button', { type: 'submit', class: 'btn btn-primary' }, 'Empezar'),
        h('button', { type: 'button', class: 'btn btn-ghost', dataset: { accion: 'abrir-copia' }, onclick: alAbrirCopia }, 'Abrir una copia')));

    vaciar(contenedor).append(h('main', { class: 'inicio', id: 'contenido' },
      h('p', { class: 'eyebrow' }, 'Plataforma de práctica'),
      h('h1', {}, nombreProducto),
      h('div', { class: 'inicio-explicacion' },
        h('p', {}, 'Vas a armar una aventura narrativa corta: escenas, personajes, diálogos con decisiones, fondos, música, efectos y voces. Cada elemento que entre al juego abre una ficha jurídica con semáforo que tú resuelves.'),
        h('p', {}, 'Puedes jugar tu juego cuantas veces quieras. Cuando todas las fichas estén en verde, lo publicas y descargas un paquete con el juego, su informe jurídico y el proyecto en bruto, que subes al formulario del curso.'),
        h('p', { class: 'privacidad' }, 'Nada sale de tu navegador: tu nombre, tus archivos y tus grabaciones se guardan aquí y en las copias que tú mismo descargues.')),
      formulario,
      contenido?.aviso ? h('p', { class: 'aviso-legal' }, contenido.aviso) : null));
    estudiante.focus();
  }

  return { dibujar, mostrarError };
}
