// plataforma/js/herramientas/secuencia.js
// El patrón del secuenciador (spec, sección 9) y su render a muestras: dos compases de
// ocho pasos, cuatro instrumentos sintetizados (bajo, melodía, acorde, percusión),
// tempo entre 80 y 160 y escala pentatónica. Puro: lo que se oye en el editor y lo que
// se guarda en WAV sale de renderizar(), sin Web Audio.

export const PASOS = 16;
export const INSTRUMENTOS = ['bajo', 'melodia', 'acorde', 'percusion'];
export const NOMBRES_INSTRUMENTO = { bajo: 'Bajo', melodia: 'Melodía', acorde: 'Acorde', percusion: 'Percusión' };
export const GRADOS = 5; // grados de la pentatónica por paso: 0 es silencio, 1 a 5 suben
export const TEMPO = { min: 80, max: 160, defecto: 110 };
const PENTATONICA = [0, 2, 4, 7, 9]; // semitonos sobre la base (pentatónica mayor)
const BASE = { bajo: 55, melodia: 220, acorde: 110 };

export function crearPatron(tempo = TEMPO.defecto) {
  return {
    tempo,
    pasos: {
      bajo: Array(PASOS).fill(0),
      melodia: Array(PASOS).fill(0),
      acorde: Array(PASOS).fill(0),
      percusion: Array(PASOS).fill(false),
    },
  };
}

/** Para bajo, melodía y acorde recorre 0 → 1 → … → 5 → 0 (o al revés con direccion -1); la percusión se enciende y apaga. */
export function alternar(patron, instrumento, paso, direccion = 1) {
  if (!INSTRUMENTOS.includes(instrumento) || !Number.isInteger(paso) || paso < 0 || paso >= PASOS) return patron;
  if (instrumento === 'percusion') {
    patron.pasos.percusion[paso] = !patron.pasos.percusion[paso];
    return patron;
  }
  const ciclo = GRADOS + 1;
  patron.pasos[instrumento][paso] = (((patron.pasos[instrumento][paso] + direccion) % ciclo) + ciclo) % ciclo;
  return patron;
}

export function fijarTempo(patron, tempo) {
  const numero = Math.round(Number(tempo));
  patron.tempo = Number.isFinite(numero) ? Math.min(TEMPO.max, Math.max(TEMPO.min, numero)) : TEMPO.defecto;
  return patron;
}

export function esVacio(patron) {
  return INSTRUMENTOS.every((instrumento) => patron.pasos[instrumento].every((valor) => !valor));
}

export const duracionPaso = (patron) => 60 / patron.tempo / 2;
export const duracionSegundos = (patron) => duracionPaso(patron) * PASOS;

/** Frecuencia del grado (1 a 5 y más, por octavas) de un instrumento. */
export function frecuenciaDe(instrumento, grado) {
  const g = grado - 1;
  const octava = Math.floor(g / PENTATONICA.length);
  const semitonos = PENTATONICA[g % PENTATONICA.length] + 12 * octava;
  return BASE[instrumento] * 2 ** (semitonos / 12);
}

function azar(semilla) {
  let a = semilla >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Dos compases a la frecuencia dada. Determinista: el mismo patrón da las mismas muestras. */
export function renderizar(patron, frecuencia = 22050) {
  const paso = duracionPaso(patron);
  const largoPaso = Math.round(paso * frecuencia);
  const total = largoPaso * PASOS;
  const salida = new Float32Array(total);
  const r = azar(7);

  const sumar = (inicio, duracion, fn) => {
    const n = Math.min(Math.round(duracion * frecuencia), total - inicio);
    for (let i = 0; i < n; i += 1) salida[inicio + i] += fn(i / frecuencia, i / n);
  };
  const ataque = (t) => Math.min(1, t / 0.008);

  for (let i = 0; i < PASOS; i += 1) {
    const inicio = i * largoPaso;
    const bajo = patron.pasos.bajo[i];
    if (bajo) {
      const f = frecuenciaDe('bajo', bajo);
      sumar(inicio, paso * 1.9, (t, p) => (4 * Math.abs(((t * f) % 1) - 0.5) - 1) * ataque(t) * Math.exp(-p * 2.5) * 0.28);
    }
    const melodia = patron.pasos.melodia[i];
    if (melodia) {
      const f = frecuenciaDe('melodia', melodia);
      sumar(inicio, paso * 0.95, (t, p) => (((t * f) % 1 < 0.5 ? 1 : -1) * 0.55 + Math.sin(2 * Math.PI * f * t) * 0.45) * ataque(t) * Math.exp(-p * 3) * 0.2);
    }
    const acorde = patron.pasos.acorde[i];
    if (acorde) {
      const notas = [acorde, acorde + 2, acorde + 4].map((g) => frecuenciaDe('acorde', g));
      sumar(inicio, paso * 1.9, (t, p) => notas.reduce((s, f) => s + Math.sin(2 * Math.PI * f * t), 0) / 3 * ataque(t) * Math.exp(-p * 1.8) * 0.18);
    }
    if (patron.pasos.percusion[i]) {
      sumar(inicio, Math.min(paso, 0.18), (t, p) => ((r() * 2 - 1) * 0.35 + Math.sin(2 * Math.PI * 70 * t) * 0.5) * Math.exp(-p * 6));
    }
  }
  for (let i = 0; i < total; i += 1) salida[i] = Math.max(-1, Math.min(1, salida[i]));
  return salida;
}
