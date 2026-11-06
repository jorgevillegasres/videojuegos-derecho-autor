// plataforma/js/motor/partida.js
// Estado puro de una partida: en qué escena y en qué línea va el jugador, sin DOM
// ni audio. Comparte la regla de corte con la validación (indiceCorte): una escena
// termina en su primera decisión o fin; sin ninguna de las dos, sigue la siguiente
// escena de la lista; sin siguiente, créditos. Una escena sin líneas se salta.
import { indiceCorte } from '../estado/modelo.js';

const escenaPorId = (juego, id) => juego.escenas.find((e) => e.id === id) ?? null;

function siguienteEscena(juego, id) {
  const i = juego.escenas.findIndex((e) => e.id === id);
  return i === -1 ? null : (juego.escenas[i + 1]?.id ?? null);
}

function terminar(partida) {
  partida.escenaId = null;
  partida.indice = 0;
  partida.creditos = true;
}

/** Entra a la primera línea de la escena; si no existe o está vacía, sigue la lista; sin más escenas, créditos. */
function irAEscena(partida, id) {
  let actual = id;
  while (actual !== null) {
    const escena = escenaPorId(partida.juego, actual);
    if (!escena) break;
    if (escena.lineas.length > 0) {
      partida.escenaId = actual;
      partida.indice = 0;
      partida.creditos = false;
      return;
    }
    actual = siguienteEscena(partida.juego, actual);
  }
  terminar(partida);
}

export function crearPartida(juego, { escenaInicial = juego.escenaInicial } = {}) {
  const partida = { juego, inicial: escenaInicial, escenaId: null, indice: 0, creditos: false };
  irAEscena(partida, escenaInicial);
  return partida;
}

export function escenaActual(partida) {
  return partida.escenaId === null ? null : escenaPorId(partida.juego, partida.escenaId);
}

/**
 * Vista de una línea concreta de una escena. También la usa la vista previa del editor.
 * Tipos: 'linea' (narración o diálogo), 'decision', 'fin', 'vacia' (sin línea en ese índice).
 */
export function vistaDeLinea(juego, escena, indice) {
  const linea = escena.lineas[indice] ?? null;
  const base = { escena, indice, linea, fondo: escena.fondo ?? null, musica: escena.musica ?? null, personaje: null, retrato: null, efecto: null, voz: null };
  if (!linea) return { ...base, tipo: 'vacia', texto: '' };
  if (linea.tipo === 'dialogo') {
    const personaje = juego.personajes.find((p) => p.id === linea.personaje) ?? null;
    return { ...base, tipo: 'linea', texto: linea.texto, personaje, retrato: personaje?.retrato ?? null, efecto: linea.efecto ?? null, voz: linea.voz ?? null };
  }
  if (linea.tipo === 'decision') {
    return { ...base, tipo: 'decision', texto: linea.texto, opciones: linea.opciones.map((o) => ({ texto: o.texto, escena: o.escena })) };
  }
  return { ...base, tipo: linea.tipo === 'fin' ? 'fin' : 'linea', texto: linea.texto };
}

export function vistaActual(partida) {
  if (partida.creditos) return { tipo: 'creditos' };
  return vistaDeLinea(partida.juego, escenaActual(partida), partida.indice);
}

export function avanzar(partida) {
  if (partida.creditos) return partida;
  const escena = escenaActual(partida);
  const linea = escena.lineas[partida.indice];
  if (linea.tipo === 'decision') return partida;
  if (linea.tipo === 'fin') {
    terminar(partida);
    return partida;
  }
  const corte = indiceCorte(escena);
  const siguiente = partida.indice + 1;
  if (siguiente < escena.lineas.length && (corte === -1 || siguiente <= corte)) {
    partida.indice = siguiente;
    return partida;
  }
  irAEscena(partida, siguienteEscena(partida.juego, escena.id));
  return partida;
}

export function elegir(partida, numero) {
  const vista = vistaActual(partida);
  if (vista.tipo !== 'decision') return partida;
  const opcion = vista.opciones[numero];
  if (!opcion) return partida;
  if (!escenaPorId(partida.juego, opcion.escena)) {
    terminar(partida);
    return partida;
  }
  irAEscena(partida, opcion.escena);
  return partida;
}

export function reiniciar(partida) {
  irAEscena(partida, partida.inicial);
  return partida;
}
