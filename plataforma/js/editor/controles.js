// plataforma/js/editor/controles.js
// Controles de formulario que comparten el guion y el panel de propiedades.
// Cada uno devuelve un .campo con su etiqueta; data-foco permite conservar el foco al redibujar.
import { h } from '../ui/dom.js';

let contador = 0;
function idUnico(prefijo) {
  contador += 1;
  return `${prefijo}-${contador}`;
}

function campo(etiqueta, control, id) {
  return h('div', { class: 'campo' }, h('label', { for: id, class: 'campo-etiqueta' }, etiqueta), control);
}

/**
 * Lista desplegable. pares: [[valor, texto], ...]. Con sinOpcion (texto) hay una primera
 * opción vacía que vale null; con sinOpcion: null no la hay (el valor es obligatorio).
 */
export function selector(etiqueta, clave, pares, valor, alCambiar, { sinOpcion = 'Ninguno' } = {}) {
  const id = idUnico('sel');
  const select = h('select', { id, dataset: { foco: clave }, onchange: (e) => alCambiar(e.target.value || null) },
    sinOpcion === null ? null : h('option', { value: '' }, sinOpcion),
    pares.map(([v, texto]) => h('option', { value: v }, texto)));
  select.value = valor ?? ''; // un valor que ya no existe queda en ''
  return campo(etiqueta, select, id);
}

export function campoTexto(etiqueta, clave, valor, alCambiar, { placeholder = '' } = {}) {
  const id = idUnico('txt');
  return campo(etiqueta, h('input', { type: 'text', id, dataset: { foco: clave }, value: valor ?? '', placeholder, oninput: (e) => alCambiar(e.target.value) }), id);
}

export function areaTexto(etiqueta, clave, valor, alCambiar, { filas = 3, placeholder = '' } = {}) {
  const id = idUnico('area');
  return campo(etiqueta, h('textarea', { id, rows: filas, dataset: { foco: clave }, value: valor ?? '', placeholder, oninput: (e) => alCambiar(e.target.value) }), id);
}
