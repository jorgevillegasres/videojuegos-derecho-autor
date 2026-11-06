// plataforma/js/herramientas/pixelart.js
// La herramienta de pixel art (spec, sección 9): lienzo fijo (retratos de 64×64, fondos
// de 192×108), paleta de dieciséis colores, lápiz, borrador, relleno, cuentagotas,
// deshacer y rehacer, zoom. Produce un PNG. El lienzo es herramientas/pixel.js; aquí
// solo se dibuja y se maneja la entrada. El canvas y la codificación se inyectan para
// poder probar sin navegador.
import { h, vaciar } from '../ui/dom.js';
import { TAMANOS, TRANSPARENTE, crearLienzo, pintar, borrar, rellenar, tomar, linea, crearHistorial, aRgba, desdeRgba } from './pixel.js';

export const HERRAMIENTAS = { lapiz: 'Lápiz', borrador: 'Borrador', relleno: 'Relleno', cuentagotas: 'Cuentagotas' };
export const ZOOMS = [2, 4, 6, 8];

/** PNG desde píxeles RGBA con el canvas del navegador. */
export async function codificarPngConCanvas(rgba, ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext('2d').putImageData(new ImageData(rgba, ancho, alto), 0, 0);
  return new Promise((resolver, rechazar) => canvas.toBlob((blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo codificar el PNG.'))), 'image/png'));
}

/** Píxeles RGBA de una imagen ({ tipo, datos } o Blob), ajustada al tamaño del lienzo sin suavizado. */
export async function decodificarPngConCanvas(archivo, ancho, alto) {
  const blob = archivo instanceof Blob ? archivo : new Blob([archivo.datos], { type: archivo.tipo });
  const imagen = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(imagen, 0, 0, ancho, alto);
  return ctx.getImageData(0, 0, ancho, alto).data;
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {{ paleta: Array<{ nombre: string, hex: string }>, crearContexto?, codificarPng?, decodificarPng? }} deps
 */
export function crearPixelArt(contenedor, {
  paleta,
  crearContexto = (canvas) => canvas.getContext('2d'),
  codificarPng = codificarPngConCanvas,
  decodificarPng = decodificarPngConCanvas,
}) {
  const hexes = paleta.map((c) => c.hex);
  let cerrarActual = null;

  /**
   * @param {{ tipo?: 'retrato'|'fondo', archivo?: { tipo, datos }|Blob|null }} opciones
   * @returns {Promise<Blob|null>} el PNG al guardar, null al cancelar
   */
  function abrir({ tipo = 'retrato', archivo = null } = {}) {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      preparar({ tipo, archivo }, resolver).catch((error) => {
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(null);
        throw error;
      });
    });
  }

  async function preparar({ tipo, archivo }, resolver) {
    const { ancho, alto } = TAMANOS[tipo] ?? TAMANOS.retrato;
    let lienzo = crearLienzo(ancho, alto);
    if (archivo) {
      try {
        lienzo = desdeRgba(await decodificarPng(archivo, ancho, alto), ancho, alto, hexes);
      } catch {
        lienzo = crearLienzo(ancho, alto); // si la imagen no se puede leer, se empieza en blanco
      }
    }
    const historial = crearHistorial(lienzo);
    let herramienta = 'lapiz';
    let color = 0;
    let zoom = tipo === 'fondo' ? 4 : 6;
    let cursor = { x: Math.floor(ancho / 2), y: Math.floor(alto / 2) };
    let trazo = null;

    const oculto = h('canvas', { width: ancho, height: alto });
    const ctxOculto = crearContexto(oculto);
    const canvas = h('canvas', {
      class: 'pixel-lienzo',
      width: ancho * zoom,
      height: alto * zoom,
      tabIndex: 0,
      role: 'img',
      'aria-label': `Lienzo de ${ancho} por ${alto} píxeles. Flechas para mover el cursor, Enter para pintar.`,
      onpointerdown: (e) => { canvas.focus(); const celda = celdaDe(e); cursor = celda; empezarTrazo(celda.x, celda.y); },
      onpointermove: (e) => { if (!trazo) return; const celda = celdaDe(e); cursor = celda; seguirTrazo(celda.x, celda.y); },
      onpointerup: terminarTrazo,
      onpointerleave: terminarTrazo,
      onkeydown: alTeclear,
    });
    const ctx = crearContexto(canvas);

    const celdaDe = (e) => {
      const rect = canvas.getBoundingClientRect();
      return { x: Math.floor((e.clientX - rect.left) / zoom), y: Math.floor((e.clientY - rect.top) / zoom) };
    };

    function aplicar(x, y) {
      switch (herramienta) {
        case 'lapiz': return trazo?.ultimo ? linea(lienzo, trazo.ultimo.x, trazo.ultimo.y, x, y, color) : pintar(lienzo, x, y, color);
        case 'borrador': return trazo?.ultimo ? linea(lienzo, trazo.ultimo.x, trazo.ultimo.y, x, y, TRANSPARENTE) : borrar(lienzo, x, y);
        case 'relleno': return rellenar(lienzo, x, y, color);
        case 'cuentagotas': {
          const tomado = tomar(lienzo, x, y);
          if (tomado !== TRANSPARENTE) { color = tomado; pintarPaleta(); }
          return false;
        }
        default: return false;
      }
    }
    function empezarTrazo(x, y) {
      historial.registrar();
      trazo = { ultimo: null, cambio: false };
      if (aplicar(x, y)) trazo.cambio = true;
      trazo.ultimo = { x, y };
      pintarTodo();
    }
    function seguirTrazo(x, y) {
      if (!trazo || (herramienta !== 'lapiz' && herramienta !== 'borrador')) return;
      if (aplicar(x, y)) trazo.cambio = true;
      trazo.ultimo = { x, y };
      pintarTodo();
    }
    function terminarTrazo() {
      if (!trazo) return;
      if (!trazo.cambio) historial.olvidar();
      trazo = null;
      actualizarBotones();
    }
    function alTeclear(e) {
      const mover = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
      if (mover) {
        e.preventDefault();
        cursor = { x: Math.max(0, Math.min(ancho - 1, cursor.x + mover[0])), y: Math.max(0, Math.min(alto - 1, cursor.y + mover[1])) };
        pintarTodo();
        return;
      }
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        empezarTrazo(cursor.x, cursor.y);
        terminarTrazo();
      }
    }

    // ---- dibujo ----
    function pintarTodo() {
      if (!ctx || !ctxOculto) return;
      ctxOculto.putImageData(new ImageData(aRgba(lienzo, hexes), ancho, alto), 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.fillStyle = '#d9d2c3';
      ctx.fillRect(0, 0, ancho * zoom, alto * zoom);
      ctx.fillStyle = '#ebe5d7';
      for (let y = 0; y < alto; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < ancho; x += 8) ctx.fillRect(x * zoom, y * zoom, 4 * zoom, 4 * zoom);
      ctx.drawImage(oculto, 0, 0, ancho * zoom, alto * zoom);
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1;
      ctx.strokeRect(cursor.x * zoom + 0.5, cursor.y * zoom + 0.5, zoom - 1, zoom - 1);
    }
    function cambiarZoom(nuevo) {
      zoom = nuevo;
      canvas.width = ancho * zoom;
      canvas.height = alto * zoom;
      pintarTodo();
    }

    // ---- controles ----
    const botonesHerramienta = Object.entries(HERRAMIENTAS).map(([clave, texto]) => h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { herramienta: clave }, 'aria-pressed': clave === herramienta ? 'true' : 'false', onclick: () => { herramienta = clave; for (const b of botonesHerramienta) b.setAttribute('aria-pressed', b.dataset.herramienta === clave ? 'true' : 'false'); } }, texto));
    const zonaPaleta = h('div', { class: 'pixel-paleta', role: 'group', 'aria-label': 'Paleta' });
    function pintarPaleta() {
      vaciar(zonaPaleta).append(...paleta.map((c, i) => h('button', { type: 'button', class: 'pixel-color', style: `background:${c.hex}`, title: c.nombre, 'aria-label': `Color ${c.nombre}`, 'aria-pressed': i === color ? 'true' : 'false', dataset: { color: String(i) }, onclick: () => { color = i; pintarPaleta(); } })));
    }
    const botonDeshacer = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'deshacer' }, onclick: () => { if (historial.deshacer()) { pintarTodo(); actualizarBotones(); } } }, 'Deshacer');
    const botonRehacer = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'rehacer' }, onclick: () => { if (historial.rehacer()) { pintarTodo(); actualizarBotones(); } } }, 'Rehacer');
    function actualizarBotones() {
      botonDeshacer.disabled = !historial.puedeDeshacer;
      botonRehacer.disabled = !historial.puedeRehacer;
    }
    const selectorZoom = h('select', { 'aria-label': 'Zoom', dataset: { accion: 'zoom' }, onchange: (e) => cambiarZoom(Number(e.target.value)) }, ZOOMS.map((z) => h('option', { value: String(z) }, `${z}×`)));
    selectorZoom.value = String(zoom);

    function cerrar(valor) {
      cerrarActual = null;
      vaciar(contenedor);
      contenedor.hidden = true;
      resolver(valor);
    }
    cerrarActual = cerrar;
    async function guardar() {
      const blob = await codificarPng(aRgba(lienzo, hexes), ancho, alto);
      cerrar(blob);
    }

    contenedor.hidden = false;
    vaciar(contenedor).append(h('div', { class: 'herramienta pixelart', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'pixelart-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
      h('div', { class: 'mapa-cabecera' },
        h('div', {}, h('h2', { id: 'pixelart-titulo' }, tipo === 'fondo' ? 'Pixel art: fondo' : 'Pixel art: retrato'), h('p', { class: 'mapa-resumen' }, `${ancho} × ${alto} píxeles, dieciséis colores. Lo que dibujes entra al juego como obra tuya, con sello de fecha.`)),
        h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
      h('div', { class: 'pixel-barra' }, h('div', { class: 'pixel-herramientas', role: 'group', 'aria-label': 'Herramienta' }, botonesHerramienta), botonDeshacer, botonRehacer, h('label', { class: 'pixel-zoom' }, 'Zoom ', selectorZoom)),
      zonaPaleta,
      h('div', { class: 'pixel-marco' }, canvas),
      h('div', { class: 'acciones' }, h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar'), h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
    pintarPaleta();
    actualizarBotones();
    pintarTodo();
    canvas.focus();
  }

  return { abrir };
}
