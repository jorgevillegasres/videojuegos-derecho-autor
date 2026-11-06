// plataforma/js/exportar/empaquetar.js
// Lo que hace falta para meter el juego en un solo archivo HTML (spec, sección 14):
// archivos como data: URLs en base64, textos escapados, y los módulos ES del motor
// convertidos en un solo script clásico. Puro: funciona igual en Node y en el navegador.
//
// Regla del empaquetado: los módulos se concatenan en orden de dependencias quitando
// las líneas `import` y la palabra `export`. Exige imports de una sola línea y que
// ningún nombre de primer nivel se repita entre módulos (tests/empaquetar.test.js lo
// comprueba con el motor real).

/** Rutas, relativas a plataforma/, de lo que juego.html incrusta. El orden es el de las dependencias. */
export const RUTAS_MOTOR = ['js/ui/dom.js', 'js/estado/corte.js', 'js/motor/partida.js', 'js/motor/pantalla.js', 'js/motor/reproductor.js'];
export const RUTAS_ESTILOS = ['css/tokens.css', 'css/reproductor.css'];

const TROZO = 0x8000;

/** @param {ArrayBuffer|Uint8Array} datos */
export function aBase64(datos) {
  const bytes = datos instanceof Uint8Array ? datos : new Uint8Array(datos);
  let binario = '';
  for (let i = 0; i < bytes.length; i += TROZO) binario += String.fromCharCode.apply(null, bytes.subarray(i, i + TROZO));
  return btoa(binario);
}

/** @param {{ tipo: string, datos: ArrayBuffer|Uint8Array }} archivo */
export function aDataUrl(archivo) {
  return `data:${archivo.tipo || 'application/octet-stream'};base64,${aBase64(archivo.datos)}`;
}

const ENTIDADES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function escaparHtml(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, (c) => ENTIDADES[c]);
}

/** JSON que va dentro de un <script>: nada que cierre la etiqueta ni abra un comentario HTML, y sin separadores de línea Unicode. */
// Los separadores U+2028 y U+2029 se construyen con fromCharCode para que ningún editor los convierta en caracteres crudos.
const SEPARADORES_DE_LINEA = new RegExp(`[${String.fromCharCode(0x2028)}${String.fromCharCode(0x2029)}]`, 'g');

export function escaparParaScript(texto) {
  return texto
    .replace(/<\//g, '<\\/')
    .replace(/<!--/g, '<\\!--')
    .replace(SEPARADORES_DE_LINEA, (c) => `\\u${c.charCodeAt(0).toString(16)}`);
}

const IMPORT_DE_UNA_LINEA = /^import\s[^;]*;\s*$/;
const REEXPORT = /^export\s*\{[^}]*\}\s*(from\s*['"][^'"]+['"])?\s*;\s*$/;
const EXPORT_DECLARACION = /^export\s+(?=(?:async\s+)?function\b|const\b|let\b|class\b)/;
const DECLARACION = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm;

/** Nombres declarados en el primer nivel de un módulo (function, const, let, class). */
export function declaracionesDe(codigo) {
  return [...codigo.matchAll(DECLARACION)].map((m) => m[1]);
}

/**
 * @param {Array<{ ruta: string, codigo: string }>} modulos en orden de dependencias
 * @returns {string} un script clásico con todos los módulos
 */
export function empaquetarModulos(modulos) {
  return modulos.map(({ ruta, codigo }) => {
    const lineas = codigo.split('\n').map((cruda) => {
      const linea = cruda.replace(/\r$/, '');
      if (IMPORT_DE_UNA_LINEA.test(linea) || REEXPORT.test(linea)) return '';
      if (/^import\b/.test(linea)) throw new Error(`${ruta}: hay un import de varias líneas y no se puede empaquetar: ${linea}`);
      const sinExport = linea.replace(EXPORT_DECLARACION, '');
      if (/^export\b/.test(sinExport)) throw new Error(`${ruta}: hay un export que no se puede empaquetar: ${linea}`);
      return sinExport;
    });
    return `// ---- ${ruta}\n${lineas.join('\n')}`;
  }).join('\n');
}

/**
 * Lee el motor y los estilos desde la propia plataforma (en el navegador, con fetch).
 * @param {{ base?: string|URL, fetch?: typeof fetch }} opciones base es la carpeta plataforma/
 * @returns {Promise<{ modulos: Array<{ ruta, codigo }>, estilos: string }>}
 */
export async function cargarMotor({ base = new URL('../../', import.meta.url), fetch = globalThis.fetch } = {}) {
  const leer = async (ruta) => {
    const respuesta = await fetch(new URL(ruta, base));
    if (!respuesta.ok) throw new Error(`No se pudo leer ${ruta} (${respuesta.status}).`);
    return respuesta.text();
  };
  const modulos = [];
  for (const ruta of RUTAS_MOTOR) modulos.push({ ruta, codigo: await leer(ruta) });
  const estilos = [];
  for (const ruta of RUTAS_ESTILOS) estilos.push(await leer(ruta));
  return { modulos, estilos: estilos.join('\n') };
}
