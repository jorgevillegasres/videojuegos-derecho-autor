// plataforma/js/ui/capacidades.js
// Lo que la plataforma necesita del navegador (spec, secciones 16 y 17). Se comprueba
// al arrancar; si falta algo, la pantalla de inicio lo dice y lista los navegadores.
export const NAVEGADORES = 'Chrome, Edge o Firefox de escritorio actualizados en el último año; Safari de escritorio o iPad. En celular solo se juega.';

export function comprobar(ventana = globalThis) {
  const faltantes = [];
  if (!ventana.indexedDB) faltantes.push('guardar en el navegador (IndexedDB)');
  if (!ventana.crypto?.subtle) faltantes.push('calcular huellas (Web Crypto; hace falta HTTPS o localhost)');
  if (typeof ventana.URL?.createObjectURL !== 'function') faltantes.push('mostrar archivos (URL.createObjectURL)');
  if (typeof ventana.Blob !== 'function') faltantes.push('manejar archivos (Blob)');
  if (!ventana.JSZip) faltantes.push('comprimir copias (JSZip no cargó)');
  return { ok: faltantes.length === 0, faltantes };
}
