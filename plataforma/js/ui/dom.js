// plataforma/js/ui/dom.js
// Utilidades mínimas de interfaz. h() crea un nodo con atributos, propiedades,
// manejadores (on<evento>) e hijos; lo demás son ayudas que las vistas comparten.

const PROPIEDADES = new Set(['value', 'checked', 'disabled', 'hidden', 'selected', 'draggable', 'tabIndex', 'indeterminate']);

export function h(etiqueta, atributos = {}, ...hijos) {
  const nodo = document.createElement(etiqueta);
  const despues = [];
  for (const [clave, valor] of Object.entries(atributos ?? {})) {
    if (valor === null || valor === undefined || valor === false) continue;
    if (clave === 'class') nodo.className = valor;
    else if (clave === 'dataset') Object.assign(nodo.dataset, valor);
    else if (clave.startsWith('on') && typeof valor === 'function') nodo.addEventListener(clave.slice(2), valor);
    else if (PROPIEDADES.has(clave)) despues.push([clave, valor]);
    else nodo.setAttribute(clave, valor === true ? '' : String(valor));
  }
  agregar(nodo, hijos);
  for (const [clave, valor] of despues) nodo[clave] = valor;
  return nodo;
}

function agregar(nodo, hijos) {
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    nodo.append(typeof hijo === 'object' ? hijo : document.createTextNode(String(hijo)));
  }
}

export function vaciar(nodo) {
  while (nodo.firstChild) nodo.removeChild(nodo.firstChild);
  return nodo;
}

/** Redibuja con fn() y devuelve el foco al nodo que tenga el mismo data-foco que el que lo tenía. */
export function conservarFoco(contenedor, fn) {
  const activo = document.activeElement;
  const clave = contenedor.contains(activo) ? activo.dataset?.foco : undefined;
  fn();
  if (clave === undefined) return;
  const candidato = [...contenedor.querySelectorAll('[data-foco]')].find((n) => n.dataset.foco === clave);
  candidato?.focus();
}

/** Mensaje para lectores de pantalla. Una sola zona aria-live en el documento. */
export function anunciar(texto) {
  let zona = document.getElementById('anuncios');
  if (!zona) {
    zona = h('div', { id: 'anuncios', class: 'sr-only', 'aria-live': 'polite', 'aria-atomic': 'true' });
    document.body.append(zona);
  }
  zona.textContent = texto;
}

/** Descarga un Blob con el nombre dado. Las funciones del navegador se reciben para poder probar. */
export function descargar(blob, nombre, {
  crearUrl = (b) => URL.createObjectURL(b),
  liberarUrl = (url) => URL.revokeObjectURL(url),
  pulsar = (enlace) => enlace.click(),
} = {}) {
  const url = crearUrl(blob);
  const enlace = h('a', { href: url, download: nombre, hidden: true });
  document.body.append(enlace);
  try {
    pulsar(enlace);
  } finally {
    enlace.remove();
    liberarUrl(url);
  }
}
