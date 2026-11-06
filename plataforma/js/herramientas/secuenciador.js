// plataforma/js/herramientas/secuenciador.js
// El secuenciador (spec, sección 9): dos compases de ocho pasos, cuatro instrumentos,
// tempo entre 80 y 160, escala pentatónica. Se oye en bucle mientras se edita y al
// guardar se escribe un WAV. El patrón y la síntesis son herramientas/secuencia.js;
// aquí se dibuja la rejilla y se toca con Web Audio, que se inyecta para poder probar.
import { h, vaciar } from '../ui/dom.js';
import { crearPatron, alternar, fijarTempo, esVacio, renderizar, PASOS, INSTRUMENTOS, NOMBRES_INSTRUMENTO, TEMPO, duracionSegundos } from './secuencia.js';
import { codificarWav, FRECUENCIA_WAV } from './audio-util.js';

/** Toca unas muestras en bucle con Web Audio. crearAudioContext() devuelve un AudioContext (o un doble). */
export function crearReproductorDeBucle(crearAudioContext) {
  let contexto = null;
  let fuente = null;
  function parar() {
    if (!fuente) return;
    try { fuente.stop(); } catch { /* ya parada */ }
    fuente.disconnect?.();
    fuente = null;
  }
  return {
    tocar(muestras, frecuencia) {
      parar();
      contexto ??= crearAudioContext();
      const buffer = contexto.createBuffer(1, muestras.length, frecuencia);
      buffer.copyToChannel(muestras, 0);
      fuente = contexto.createBufferSource();
      fuente.buffer = buffer;
      fuente.loop = true;
      fuente.connect(contexto.destination);
      fuente.start();
      contexto.resume?.()?.catch?.(() => {});
    },
    parar,
    get sonando() { return fuente !== null; },
    cerrar() {
      parar();
      contexto?.close?.()?.catch?.(() => {});
      contexto = null;
    },
  };
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {{ crearAudioContext?: () => AudioContext }} deps
 */
export function crearSecuenciador(contenedor, { crearAudioContext = () => new (window.AudioContext || window.webkitAudioContext)() } = {}) {
  let cerrarActual = null;

  /** @returns {Promise<Blob|null>} el WAV al guardar, null al cancelar */
  function abrir() {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      const patron = crearPatron();
      const bucle = crearReproductorDeBucle(crearAudioContext);
      let sonando = false;

      const celdas = {};
      const botonGuardar = h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar');
      const botonTocar = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'tocar' }, 'aria-pressed': 'false', onclick: () => (sonando ? parar() : tocar()) }, 'Tocar en bucle');
      const salidaTempo = h('output', { class: 'secuenciador-tempo' }, `${patron.tempo} pulsos por minuto`);
      const entradaTempo = h('input', { type: 'range', min: String(TEMPO.min), max: String(TEMPO.max), step: '1', value: String(patron.tempo), dataset: { accion: 'tempo' }, 'aria-label': 'Tempo', oninput: (e) => { fijarTempo(patron, e.target.value); e.target.value = String(patron.tempo); salidaTempo.textContent = `${patron.tempo} pulsos por minuto`; cambio(); } });

      function textoCelda(instrumento, paso) {
        const valor = patron.pasos[instrumento][paso];
        if (instrumento === 'percusion') return valor ? '●' : '·';
        return valor ? String(valor) : '·';
      }
      function pintarCelda(instrumento, paso) {
        const boton = celdas[`${instrumento}:${paso}`];
        const valor = patron.pasos[instrumento][paso];
        boton.textContent = textoCelda(instrumento, paso);
        boton.classList.toggle('paso-activo', Boolean(valor));
        boton.setAttribute('aria-pressed', valor ? 'true' : 'false');
        boton.setAttribute('aria-label', `${NOMBRES_INSTRUMENTO[instrumento]}, paso ${paso + 1}: ${instrumento === 'percusion' ? (valor ? 'suena' : 'silencio') : (valor ? `grado ${valor}` : 'silencio')}`);
      }
      function cambio() {
        botonGuardar.disabled = esVacio(patron);
        if (sonando) tocar();
      }
      function celda(instrumento, paso) {
        const boton = h('button', {
          type: 'button',
          class: `paso${paso % 8 === 0 ? ' paso-compas' : ''}`,
          dataset: { instrumento, paso: String(paso) },
          onclick: (e) => { alternar(patron, instrumento, paso, e.shiftKey ? -1 : 1); pintarCelda(instrumento, paso); cambio(); },
          oncontextmenu: (e) => { e.preventDefault(); alternar(patron, instrumento, paso, -1); pintarCelda(instrumento, paso); cambio(); },
          onkeydown: (e) => {
            if (instrumento === 'percusion' || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
            e.preventDefault();
            alternar(patron, instrumento, paso, e.key === 'ArrowUp' ? 1 : -1);
            pintarCelda(instrumento, paso);
            cambio();
          },
        });
        celdas[`${instrumento}:${paso}`] = boton;
        pintarCelda(instrumento, paso);
        return boton;
      }
      function tocar() {
        sonando = true;
        botonTocar.setAttribute('aria-pressed', 'true');
        botonTocar.textContent = 'Parar';
        bucle.tocar(renderizar(patron, FRECUENCIA_WAV), FRECUENCIA_WAV);
      }
      function parar() {
        sonando = false;
        botonTocar.setAttribute('aria-pressed', 'false');
        botonTocar.textContent = 'Tocar en bucle';
        bucle.parar();
      }
      function limpiar() {
        for (const instrumento of INSTRUMENTOS) {
          for (let paso = 0; paso < PASOS; paso += 1) {
            patron.pasos[instrumento][paso] = instrumento === 'percusion' ? false : 0;
            pintarCelda(instrumento, paso);
          }
        }
        cambio();
      }
      function cerrar(valor) {
        cerrarActual = null;
        parar();
        bucle.cerrar();
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(valor);
      }
      function guardar() {
        if (esVacio(patron)) return;
        const muestras = renderizar(patron, FRECUENCIA_WAV);
        cerrar(new Blob([codificarWav(muestras, FRECUENCIA_WAV)], { type: 'audio/wav' }));
      }
      cerrarActual = cerrar;

      contenedor.hidden = false;
      vaciar(contenedor).append(h('div', { class: 'herramienta secuenciador', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'secuenciador-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
        h('div', { class: 'mapa-cabecera' },
          h('div', {}, h('h2', { id: 'secuenciador-titulo' }, 'Secuenciador'), h('p', { class: 'mapa-resumen' }, `Dos compases de ocho pasos. Clic sube el grado (Mayús y clic lo baja); la percusión se enciende y apaga. Dura ${duracionSegundos(patron).toFixed(1)} s a ${patron.tempo} pulsos.`)),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
        h('div', { class: 'secuenciador-rejilla', role: 'grid', 'aria-label': 'Patrón' }, INSTRUMENTOS.map((instrumento) =>
          h('div', { class: 'secuenciador-fila', role: 'row' },
            h('span', { class: 'secuenciador-instrumento', role: 'rowheader' }, NOMBRES_INSTRUMENTO[instrumento]),
            Array.from({ length: PASOS }, (_, paso) => celda(instrumento, paso))))),
        h('div', { class: 'secuenciador-controles' },
          h('label', { class: 'campo-tempo' }, 'Tempo ', entradaTempo, ' ', salidaTempo),
          botonTocar,
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'limpiar' }, onclick: limpiar }, 'Limpiar')),
        h('div', { class: 'acciones' }, botonGuardar, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
      botonGuardar.disabled = true;
      celdas['melodia:0'].focus();
    });
  }

  return { abrir };
}
