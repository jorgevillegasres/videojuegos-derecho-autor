// plataforma/js/estado/archivos.js
// Utilidades para archivos binarios: tipo MIME, huella SHA-256 y sello de creación.

const MIME_POR_EXTENSION = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  mp3: 'audio/mpeg',
  ogg: 'audio/ogg',
  wav: 'audio/wav',
  webm: 'audio/webm',
  m4a: 'audio/mp4',
  mp4: 'audio/mp4',
};

const EXTENSION_POR_MIME = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'audio/mpeg': 'mp3',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/webm': 'webm',
  'audio/mp4': 'm4a',
};

export const LIMITES = {
  imagenBytes: 2 * 1024 * 1024,
  audioBytes: 5 * 1024 * 1024,
  avisoPaqueteBytes: 50 * 1024 * 1024,
};

export function mimePorExtension(nombre) {
  const extension = String(nombre).split('.').pop().toLowerCase();
  return MIME_POR_EXTENSION[extension] ?? 'application/octet-stream';
}

export function extensionPorMime(mime) {
  const base = String(mime).split(';')[0].trim().toLowerCase();
  return EXTENSION_POR_MIME[base] ?? 'bin';
}

/** @param {ArrayBuffer|Uint8Array} datos */
export async function huellaSha256(datos) {
  const resumen = await crypto.subtle.digest('SHA-256', datos);
  const hex = [...new Uint8Array(resumen)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return `sha256:${hex}`;
}

/** Sello de creación para lo que se hace dentro de la plataforma. */
export async function crearSello(datos, ahora = new Date()) {
  return { fecha: ahora.toISOString(), huella: await huellaSha256(datos) };
}
