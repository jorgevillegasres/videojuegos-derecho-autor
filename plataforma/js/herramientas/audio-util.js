// plataforma/js/herramientas/audio-util.js
// Utilidades de audio puras que comparten el grabador y el secuenciador: mezcla a mono,
// remuestreo, WAV (PCM 16 bits mono) como ArrayBuffer, forma de onda y recorte.
// Funcionan igual en el navegador y en Node (no usan Web Audio).

export const FRECUENCIA_WAV = 22050;

/** Promedio de varios canales (Float32Array del mismo largo) en uno. */
export function mezclarAMono(canales) {
  if (!canales.length) return new Float32Array(0);
  const n = canales[0].length;
  const salida = new Float32Array(n);
  for (const canal of canales) {
    for (let i = 0; i < n; i += 1) salida[i] += canal[i] / canales.length;
  }
  return salida;
}

/** Cambia la frecuencia de muestreo por interpolación lineal. */
export function remuestrear(muestras, de, a) {
  if (de === a) return muestras;
  const n = Math.round((muestras.length * a) / de);
  const salida = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    const pos = (i * de) / a;
    const j = Math.floor(pos);
    const t = pos - j;
    const actual = muestras[j] ?? 0;
    const siguiente = muestras[j + 1] ?? actual;
    salida[i] = actual * (1 - t) + siguiente * t;
  }
  return salida;
}

/** WAV PCM 16 bits mono. Recorta lo que se sale de [-1, 1]. */
export function codificarWav(muestras, frecuencia = FRECUENCIA_WAV) {
  const n = muestras.length;
  const buffer = new ArrayBuffer(44 + n * 2);
  const vista = new DataView(buffer);
  const texto = (pos, s) => { for (let i = 0; i < s.length; i += 1) vista.setUint8(pos + i, s.charCodeAt(i)); };
  texto(0, 'RIFF');
  vista.setUint32(4, 36 + n * 2, true);
  texto(8, 'WAVE');
  texto(12, 'fmt ');
  vista.setUint32(16, 16, true);
  vista.setUint16(20, 1, true); // PCM
  vista.setUint16(22, 1, true); // mono
  vista.setUint32(24, frecuencia, true);
  vista.setUint32(28, frecuencia * 2, true);
  vista.setUint16(32, 2, true);
  vista.setUint16(34, 16, true);
  texto(36, 'data');
  vista.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i += 1) {
    const m = Math.max(-1, Math.min(1, muestras[i]));
    vista.setInt16(44 + i * 2, Math.round(m * 32767), true);
  }
  return buffer;
}

/** Pico absoluto por columna, para dibujar la forma de onda. */
export function formaDeOnda(muestras, columnas) {
  const salida = new Float32Array(columnas);
  if (!muestras.length || columnas <= 0) return salida;
  const porColumna = muestras.length / columnas;
  for (let c = 0; c < columnas; c += 1) {
    const inicio = Math.floor(c * porColumna);
    const fin = Math.max(inicio + 1, Math.floor((c + 1) * porColumna));
    let pico = 0;
    for (let i = inicio; i < fin && i < muestras.length; i += 1) pico = Math.max(pico, Math.abs(muestras[i]));
    salida[c] = pico;
  }
  return salida;
}

/** Recorta entre dos tiempos en segundos (copia). */
export function recortar(muestras, frecuencia, inicioSeg, finSeg) {
  const inicio = Math.max(0, Math.round(inicioSeg * frecuencia));
  const fin = Math.min(muestras.length, Math.round(finSeg * frecuencia));
  return muestras.slice(inicio, Math.max(inicio, fin));
}

export const FORMATOS_GRABACION = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4;codecs=mp4a.40.2', 'audio/mp4'];

/** Primer formato de grabación que el navegador soporta; '' si ninguno (MediaRecorder elige). */
export function elegirFormato(soporta) {
  return FORMATOS_GRABACION.find((formato) => {
    try {
      return Boolean(soporta(formato));
    } catch {
      return false;
    }
  }) ?? '';
}
