// plataforma/js/motor/reproductor.js
// El reproductor: une la partida (estado), la pantalla (dibujo), la entrada (clic,
// toque, teclado) y el audio. Es el mismo código que usa la vista previa del editor
// (a través de pantalla.js) y el que irá dentro de juego.html (plan 6).
//
// jugar(contenedor, juego, resolverRecurso, opciones) → { cerrar, partida, raiz }
//   resolverRecurso(id) → URL del archivo del elemento, o null.
//   opciones: escenaInicial, creditos (lista de textos), titulo, alCerrar, crearAudio.
import { crearPartida, vistaActual, avanzar, elegir, reiniciar } from './partida.js';
import { crearPantalla } from './pantalla.js';
import { h, vaciar } from '../ui/dom.js';

/** Música en bucle (una), efectos sueltos y una voz a la vez. crearAudio(url) devuelve algo con play(), pause() y loop. */
function crearMezclador(crearAudio, resolverRecurso) {
  let musica = { id: null, nodo: null };
  let voz = null;

  function crear(id, bucle) {
    const url = resolverRecurso(id);
    if (!url) return null;
    const nodo = crearAudio(url);
    nodo.loop = bucle;
    return nodo;
  }
  function reproducir(nodo) {
    const promesa = nodo.play();
    // Los navegadores rechazan play() sin gesto del usuario; aquí siempre hay uno, pero no debe reventar.
    if (promesa && typeof promesa.catch === 'function') promesa.catch(() => {});
  }
  function ponerMusica(id) {
    if (id === musica.id) return;
    musica.nodo?.pause();
    musica = { id, nodo: id ? crear(id, true) : null };
    if (musica.nodo) reproducir(musica.nodo);
  }
  function sonarEfecto(id) {
    if (!id) return;
    const nodo = crear(id, false);
    if (nodo) reproducir(nodo);
  }
  function detenerVoz() {
    voz?.pause();
    voz = null;
  }
  function ponerVoz(id) {
    detenerVoz();
    if (!id) return;
    voz = crear(id, false);
    if (voz) reproducir(voz);
  }
  return {
    musica: ponerMusica,
    efecto: sonarEfecto,
    voz: ponerVoz,
    detenerVoz,
    detenerTodo() {
      ponerMusica(null);
      detenerVoz();
    },
  };
}

export function jugar(contenedor, juego, resolverRecurso, opciones = {}) {
  const {
    escenaInicial = juego.escenaInicial,
    creditos = [],
    titulo = juego.titulo,
    alCerrar = null,
    crearAudio = (url) => new Audio(url),
  } = opciones;
  const nombreJuego = titulo?.trim() || 'Sin título';
  const partida = crearPartida(juego, { escenaInicial });
  const audio = crearMezclador(crearAudio, resolverRecurso);
  let enCreditos = false; // abiertos con el botón, sobre cualquier punto de la partida
  let ultimaLinea = null; // "escena:índice" de la última línea dibujada, para no repetir efecto ni voz

  const boton = (accion, texto, alPulsar, extra = {}) =>
    h('button', { type: 'button', class: 'btn btn-ghost btn-sm', dataset: { accion }, onclick: alPulsar, ...extra }, texto);
  const botonCreditos = boton('creditos', 'Créditos', () => { enCreditos = true; dibujar(); });
  const botonVolver = boton('volver', 'Volver al juego', () => { enCreditos = false; dibujar(); }, { hidden: true });
  const botonReiniciar = boton('reiniciar', 'Reiniciar', () => { reiniciar(partida); enCreditos = false; ultimaLinea = null; dibujar(); });
  const botonCerrar = alCerrar ? boton('cerrar', 'Cerrar', () => cerrar()) : null;

  const zonaEscena = h('div', { class: 'reproductor-escena', onclick: alClic });
  const barra = h('div', { class: 'reproductor-barra' },
    h('span', { class: 'reproductor-titulo' }, nombreJuego),
    h('span', { class: 'reproductor-acciones' }, botonCreditos, botonVolver, botonReiniciar, botonCerrar));
  const pista = h('p', { class: 'reproductor-pista' }, 'Clic, Espacio o Enter para seguir. Teclas 1 a 4 para elegir.');
  const raiz = h('div', { class: 'reproductor', tabIndex: 0, role: 'application', 'aria-label': `Juego: ${nombreJuego}`, onkeydown: alTeclear }, barra, zonaEscena, pista);
  vaciar(contenedor).append(raiz);
  const pantalla = crearPantalla(zonaEscena, { juego, resolverRecurso });

  function dibujar() {
    const vista = vistaActual(partida);
    const terminada = vista.tipo === 'creditos';
    if (terminada || enCreditos) {
      audio.musica(null);
      audio.detenerVoz();
      pantalla.mostrarCreditos(nombreJuego, creditos);
      botonCreditos.hidden = true;
      botonVolver.hidden = terminada;
      return;
    }
    botonCreditos.hidden = false;
    botonVolver.hidden = true;
    audio.musica(vista.musica);
    pantalla.mostrar(vista, { alElegir: (i) => { elegir(partida, i); dibujar(); } });
    const clave = `${vista.escena.id}:${vista.indice}`;
    if (clave !== ultimaLinea) {
      ultimaLinea = clave;
      audio.efecto(vista.efecto);
      if (vista.voz) audio.voz(vista.voz);
    }
  }

  function seguir() {
    if (enCreditos) return;
    const vista = vistaActual(partida);
    if (vista.tipo === 'decision' || vista.tipo === 'creditos') return;
    avanzar(partida);
    dibujar();
  }

  function alClic(evento) {
    if (evento.target.closest('button')) return;
    seguir();
  }

  function alTeclear(evento) {
    const enBoton = Boolean(evento.target.closest('button'));
    if (evento.key === ' ' || evento.key === 'Enter') {
      if (enBoton) return; // el botón se activa solo
      evento.preventDefault();
      seguir();
      return;
    }
    if (/^[1-4]$/.test(evento.key)) {
      if (enCreditos || vistaActual(partida).tipo !== 'decision') return;
      evento.preventDefault();
      elegir(partida, Number(evento.key) - 1);
      dibujar();
      return;
    }
    if (evento.key === 'Escape' && alCerrar) cerrar();
  }

  function cerrar() {
    audio.detenerTodo();
    vaciar(contenedor);
    alCerrar?.();
  }

  dibujar();
  raiz.focus();
  return { cerrar, partida, raiz };
}
