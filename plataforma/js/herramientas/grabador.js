// plataforma/js/herramientas/grabador.js
// El grabador (spec, sección 9): micrófono del navegador, grabar, detener, escuchar y
// recortar inicio y final con dos manijas sobre una forma de onda; máximo treinta
// segundos. Sin recorte se guarda lo que entregó el navegador (WebM/Opus o MP4/AAC);
// con recorte se decodifica y se guarda en WAV. Si el micrófono falla, explica cómo
// permitirlo y ofrece subir un archivo (spec, sección 17). Todo lo del navegador se inyecta.
import { h, vaciar } from '../ui/dom.js';
import { mezclarAMono, remuestrear, codificarWav, formaDeOnda, recortar, elegirFormato, FRECUENCIA_WAV } from './audio-util.js';

export const MAXIMO_SEGUNDOS = 30;
export const COLUMNAS_ONDA = 120;
const MARGEN_RECORTE = 0.05;

/** Muestras mono de un Blob de audio, con Web Audio. */
export async function decodificarConWebAudio(blob) {
  const Contexto = window.AudioContext || window.webkitAudioContext;
  const contexto = new Contexto();
  try {
    const buffer = await contexto.decodeAudioData(await blob.arrayBuffer());
    const canales = Array.from({ length: buffer.numberOfChannels }, (_, i) => buffer.getChannelData(i));
    return { muestras: mezclarAMono(canales), frecuencia: buffer.sampleRate };
  } finally {
    contexto.close?.();
  }
}

/**
 * @param {HTMLElement} contenedor capa oculta hasta abrir()
 * @param {object} deps pedirMicrofono, crearGrabadora, formatoSoportado, decodificar, crearAudio, crearUrl, liberarUrl, planificar, cancelar, crearContexto
 */
export function crearGrabador(contenedor, {
  pedirMicrofono = () => navigator.mediaDevices.getUserMedia({ audio: true }),
  crearGrabadora = (stream, opciones) => new MediaRecorder(stream, opciones),
  formatoSoportado = (tipo) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(tipo),
  decodificar = decodificarConWebAudio,
  crearAudio = (url) => new Audio(url),
  crearUrl = (blob) => URL.createObjectURL(blob),
  liberarUrl = (url) => URL.revokeObjectURL(url),
  planificar = (fn, ms) => setTimeout(fn, ms),
  cancelar = (temporizador) => clearTimeout(temporizador),
  crearContexto = (canvas) => canvas.getContext('2d'),
} = {}) {
  let cerrarActual = null;

  /**
   * @param {{ alSubirEnSuLugar?: (() => void)|null }} opciones se ofrece cuando el micrófono falla
   * @returns {Promise<Blob|null>}
   */
  function abrir({ alSubirEnSuLugar = null } = {}) {
    cerrarActual?.(null);
    return new Promise((resolver) => {
      let estado = 'listo'; // listo | grabando | grabado | sin-microfono
      let grabacion = null; // { blob, muestras, frecuencia, duracion }
      let inicio = 0;
      let fin = 0;
      let stream = null;
      let grabadora = null;
      let temporizador = null;
      let urlEscucha = null;
      let audioEscucha = null;

      const texto = h('p', { class: 'grabador-estado', 'aria-live': 'polite' });
      const errorNodo = h('div', { class: 'grabador-error', role: 'alert', hidden: true });
      const canvas = h('canvas', { class: 'grabador-onda', width: 480, height: 80, role: 'img', 'aria-label': 'Forma de onda de la grabación' });
      const ctx = crearContexto(canvas);
      const tiempo = h('span', { class: 'grabador-tiempo' }, '0.0 s');
      const botonGrabar = h('button', { type: 'button', class: 'btn btn-primary btn-sm', dataset: { accion: 'grabar' }, onclick: grabar }, 'Grabar');
      const botonDetener = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'detener' }, onclick: detener }, 'Detener');
      const botonEscuchar = h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'escuchar' }, onclick: escuchar }, 'Escuchar');
      const botonGuardar = h('button', { type: 'button', class: 'btn btn-primary', dataset: { accion: 'guardar' }, onclick: guardar }, 'Guardar');
      const rangoInicio = h('input', { type: 'range', min: '0', max: '0', step: '0.1', value: '0', dataset: { accion: 'recorte-inicio' }, 'aria-label': 'Inicio del recorte, en segundos', oninput: (e) => { inicio = Math.min(Number(e.target.value), Math.max(0, fin - 0.1)); e.target.value = String(inicio); pintar(); } });
      const rangoFin = h('input', { type: 'range', min: '0', max: '0', step: '0.1', value: '0', dataset: { accion: 'recorte-fin' }, 'aria-label': 'Final del recorte, en segundos', oninput: (e) => { fin = Math.max(Number(e.target.value), Math.min(grabacion?.duracion ?? 0, inicio + 0.1)); e.target.value = String(fin); pintar(); } });
      const botonSubir = alSubirEnSuLugar ? h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'subir' }, onclick: () => { cerrar(null); alSubirEnSuLugar(); } }, 'Subir un archivo en su lugar') : null;

      function mensajeEstado() {
        switch (estado) {
          case 'grabando': return `Grabando… Pulsa Detener cuando termines. Máximo ${MAXIMO_SEGUNDOS} segundos.`;
          case 'grabado': return grabacion?.muestras ? 'Grabación lista. Escúchala y, si quieres, recorta el inicio y el final con las manijas.' : 'Grabación lista. No se pudo analizar para recortarla; se guardará completa.';
          case 'sin-microfono': return 'No se pudo usar el micrófono.';
          default: return 'Pulsa Grabar y habla o haz el sonido. Sirve para voces y para efectos caseros.';
        }
      }

      function pintarOnda() {
        if (!ctx) return;
        const ancho = canvas.width;
        const alto = canvas.height;
        ctx.fillStyle = '#0a0d12';
        ctx.fillRect(0, 0, ancho, alto);
        if (!grabacion?.muestras) return;
        const picos = formaDeOnda(grabacion.muestras, COLUMNAS_ONDA);
        const paso = ancho / COLUMNAS_ONDA;
        const { duracion } = grabacion;
        for (let c = 0; c < COLUMNAS_ONDA; c += 1) {
          const t = (c / COLUMNAS_ONDA) * duracion;
          ctx.fillStyle = t >= inicio && t <= fin ? '#b6ff3b' : '#3a4a5c';
          const h2 = Math.max(1, picos[c] * (alto - 4));
          ctx.fillRect(c * paso, (alto - h2) / 2, Math.max(1, paso - 1), h2);
        }
      }

      function pintar() {
        texto.textContent = mensajeEstado();
        botonGrabar.disabled = estado === 'grabando';
        botonDetener.disabled = estado !== 'grabando';
        botonEscuchar.disabled = estado !== 'grabado';
        botonGuardar.disabled = estado !== 'grabado';
        const puedeRecortar = estado === 'grabado' && Boolean(grabacion?.muestras);
        rangoInicio.disabled = !puedeRecortar;
        rangoFin.disabled = !puedeRecortar;
        const duracion = grabacion?.duracion ?? 0;
        rangoInicio.max = String(duracion.toFixed(1));
        rangoFin.max = String(duracion.toFixed(1));
        tiempo.textContent = `${duracion.toFixed(1)} s${puedeRecortar && (inicio > 0 || fin < duracion) ? ` (recorte: ${inicio.toFixed(1)} a ${fin.toFixed(1)} s)` : ''}`;
        pintarOnda();
      }

      async function grabar() {
        if (estado === 'grabando') return;
        try {
          stream = await pedirMicrofono();
        } catch (error) {
          estado = 'sin-microfono';
          errorNodo.hidden = false;
          vaciar(errorNodo).append(
            h('p', {}, `No se pudo usar el micrófono${error?.message ? ` (${error.message})` : ''}. Permite el micrófono para este sitio en el navegador (el candado o el ícono junto a la dirección) y vuelve a intentar.`),
            h('p', {}, 'Si no tienes micrófono, puedes subir un archivo de audio en su lugar.'),
            botonSubir);
          pintar();
          return;
        }
        const formato = elegirFormato(formatoSoportado);
        grabadora = crearGrabadora(stream, formato ? { mimeType: formato } : {});
        const trozos = [];
        grabadora.ondataavailable = (e) => { if (e.data?.size) trozos.push(e.data); };
        grabadora.onstop = async () => {
          const blob = new Blob(trozos, { type: grabadora.mimeType || formato || 'audio/webm' });
          stream?.getTracks?.().forEach((pista) => pista.stop());
          stream = null;
          try {
            const { muestras, frecuencia } = await decodificar(blob);
            grabacion = { blob, muestras, frecuencia, duracion: muestras.length / frecuencia };
          } catch {
            grabacion = { blob, muestras: null, frecuencia: null, duracion: 0 };
          }
          inicio = 0;
          fin = grabacion.duracion;
          estado = 'grabado';
          pintar(); // fija los máximos de las manijas antes de ponerles valor
          rangoInicio.value = '0';
          rangoFin.value = String(fin.toFixed(1));
        };
        errorNodo.hidden = true;
        grabadora.start();
        estado = 'grabando';
        temporizador = planificar(() => detener(), MAXIMO_SEGUNDOS * 1000);
        pintar();
      }

      function detener() {
        if (temporizador !== null) { cancelar(temporizador); temporizador = null; }
        if (grabadora && grabadora.state !== 'inactive') grabadora.stop();
      }

      function liberarEscucha() {
        audioEscucha?.pause?.();
        audioEscucha = null;
        if (urlEscucha) { liberarUrl(urlEscucha); urlEscucha = null; }
      }

      function escuchar() {
        if (!grabacion) return;
        liberarEscucha();
        urlEscucha = crearUrl(grabacion.blob);
        audioEscucha = crearAudio(urlEscucha);
        const promesa = audioEscucha.play?.();
        if (promesa && typeof promesa.catch === 'function') promesa.catch(() => {});
      }

      function guardar() {
        if (!grabacion) return;
        const recortada = grabacion.muestras && (inicio > MARGEN_RECORTE || fin < grabacion.duracion - MARGEN_RECORTE);
        if (!recortada) { cerrar(grabacion.blob); return; }
        const muestras = remuestrear(recortar(grabacion.muestras, grabacion.frecuencia, inicio, fin), grabacion.frecuencia, FRECUENCIA_WAV);
        cerrar(new Blob([codificarWav(muestras, FRECUENCIA_WAV)], { type: 'audio/wav' }));
      }

      function cerrar(valor) {
        cerrarActual = null;
        detener();
        stream?.getTracks?.().forEach((pista) => pista.stop());
        stream = null;
        liberarEscucha();
        vaciar(contenedor);
        contenedor.hidden = true;
        resolver(valor);
      }
      cerrarActual = cerrar;

      contenedor.hidden = false;
      vaciar(contenedor).append(h('div', { class: 'herramienta grabador', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': 'grabador-titulo', onkeydown: (e) => { if (e.key === 'Escape') cerrar(null); } },
        h('div', { class: 'mapa-cabecera' },
          h('div', {}, h('h2', { id: 'grabador-titulo' }, 'Grabador'), h('p', { class: 'mapa-resumen' }, `Hasta ${MAXIMO_SEGUNDOS} segundos con el micrófono. Lo que grabes entra al juego como obra tuya, con sello de fecha.`)),
          h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion: 'cancelar' }, onclick: () => cerrar(null) }, 'Cancelar')),
        texto,
        errorNodo,
        h('div', { class: 'grabador-controles' }, botonGrabar, botonDetener, botonEscuchar, tiempo),
        h('div', { class: 'grabador-marco' }, canvas),
        h('div', { class: 'grabador-recorte' },
          h('label', { class: 'campo-rango' }, 'Inicio ', rangoInicio),
          h('label', { class: 'campo-rango' }, 'Final ', rangoFin)),
        h('div', { class: 'acciones' }, botonGuardar, h('button', { type: 'button', class: 'btn btn-ghost', onclick: () => cerrar(null) }, 'Cancelar'))));
      pintar();
      botonGrabar.focus();
    });
  }

  return { abrir };
}
