// plataforma/js/estado/corte.js
// La regla de corte (spec, sección 6): una escena termina en su primera línea de
// decisión o de fin. La comparten la validación y el motor; vive aparte para que el
// juego exportado (plan 6) incruste el motor sin arrastrar el modelo ni las fichas.

/** Índice de la primera línea de decisión o fin de la escena, o -1 si no hay. */
export function indiceCorte(escena) {
  return escena.lineas.findIndex((l) => l.tipo === 'decision' || l.tipo === 'fin');
}
