// plataforma/js/motor/pantalla.js
// Dibuja una vista del juego (fondo, retrato, nombre, texto, opciones, créditos) en
// un contenedor. No maneja entrada ni audio: eso lo hace reproductor.js. La vista
// previa del editor usa esta misma pantalla, así lo que se prueba es lo que se ve.
import { h, vaciar } from '../ui/dom.js';

/**
 * @param {HTMLElement} contenedor
 * @param {{ juego: object, resolverRecurso: (id: string) => string|null }} opciones
 */
export function crearPantalla(contenedor, { juego, resolverRecurso }) {
  const fondo = h('div', { class: 'escenario-fondo', 'aria-hidden': 'true' });
  const retrato = h('div', { class: 'escenario-retrato', 'aria-hidden': 'true' });
  const nombre = h('div', { class: 'escenario-nombre', hidden: true });
  const texto = h('div', { class: 'escenario-texto' });
  const opciones = h('div', { class: 'escenario-opciones', role: 'group', 'aria-label': 'Opciones' });
  const creditos = h('div', { class: 'escenario-creditos', hidden: true });
  const caja = h('div', { class: 'escenario-caja' }, nombre, texto, opciones, creditos);
  const escenario = h('div', { class: 'escenario' }, fondo, retrato, caja);
  vaciar(contenedor).append(escenario);

  // Las imágenes hechas con la herramienta de pixel art se escalan sin suavizado.
  const esPixel = (id) => ['creado', 'muestra'].includes(juego.elementos.find((e) => e.id === id)?.origen);

  function imagen(id, clase) {
    const url = id ? resolverRecurso(id) : null;
    if (!url) return null;
    return h('img', { src: url, alt: '', class: esPixel(id) ? `${clase} pixel` : clase });
  }

  function limpiar() {
    vaciar(fondo);
    vaciar(retrato);
    vaciar(opciones);
    vaciar(creditos);
    creditos.hidden = true;
    nombre.hidden = true;
    nombre.textContent = '';
    texto.textContent = '';
    escenario.classList.remove('en-creditos', 'es-fin', 'vacia');
  }

  /** @param {object} vista de partida.vistaDeLinea / vistaActual (no 'creditos') */
  function mostrar(vista, { alElegir } = {}) {
    limpiar();
    const imgFondo = imagen(vista.fondo, 'fondo');
    if (imgFondo) fondo.append(imgFondo);
    if (vista.tipo === 'vacia') {
      escenario.classList.add('vacia');
      texto.textContent = 'Esta escena no tiene líneas todavía.';
      return;
    }
    const imgRetrato = imagen(vista.retrato, 'retrato');
    if (imgRetrato) retrato.append(imgRetrato);
    if (vista.personaje) {
      nombre.hidden = false;
      nombre.textContent = vista.personaje.nombre?.trim() || 'Sin nombre';
    }
    texto.textContent = vista.texto ?? '';
    if (vista.tipo === 'decision') {
      vista.opciones.forEach((opcion, i) => {
        opciones.append(h('button', { type: 'button', class: 'opcion', dataset: { opcion: String(i) }, onclick: () => alElegir?.(i) },
          h('kbd', {}, String(i + 1)), ' ', opcion.texto?.trim() || `Opción ${i + 1}`));
      });
    }
    if (vista.tipo === 'fin') escenario.classList.add('es-fin');
  }

  function mostrarCreditos(titulo, lineas) {
    limpiar();
    escenario.classList.add('en-creditos');
    creditos.hidden = false;
    creditos.append(
      h('p', { class: 'creditos-titulo' }, titulo?.trim() || 'Sin título'),
      h('p', { class: 'creditos-encabezado' }, 'Créditos'),
      h('ul', {}, lineas.map((linea) => h('li', {}, linea))),
    );
  }

  return { escenario, mostrar, mostrarCreditos, destruir: () => vaciar(contenedor) };
}
