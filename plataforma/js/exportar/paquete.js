// plataforma/js/exportar/paquete.js
// El paquete de entrega (spec, sección 14): juego.html con el motor, el documento y
// los recursos incrustados; el informe; y el proyecto en bruto. Sin DOM de la
// plataforma: lo llama el editor en el navegador y las pruebas en Node.
import { creditos as creditosDe } from '../juridico/cadena.js';
import { generar as generarInforme } from '../juridico/informe.js';
import { validarEstructura } from '../estado/copias.js';
import { huellaSha256, nombreDeArchivo } from '../estado/archivos.js';
import { empaquetarModulos, aDataUrl, escaparHtml, escaparParaScript } from './empaquetar.js';

/** Cada archivo va dos veces en el paquete (en bruto y en base64 dentro de juego.html): el peso se estima al doble. */
export const FACTOR_PAQUETE = 2;

const falla = (codigo, mensaje) => Object.assign(new Error(mensaje), { codigo });

const ESTILOS_PAGINA = `
html, body { margin: 0; min-height: 100%; background: #06080b; }
body { display: flex; }
#juego { flex: 1; display: flex; }
#juego .reproductor { flex: 1; }
noscript { display: block; padding: 24px; color: #f2efe6; font-family: system-ui, sans-serif; }`;

/**
 * El juego completo en un solo archivo HTML, sin internet (spec 14). El motor es el mismo
 * que corre en el editor; los recursos van como data: URLs.
 * @param {object} proyecto
 * @param {Map<string, { tipo, datos }>} archivos por id de elemento
 * @param {{ modulos: Array<{ ruta, codigo }>, estilos: string }} motor de cargarMotor() o motorDesdeDisco()
 * @param {{ creditos?: string[] }} opciones las líneas de créditos; por defecto salen de las fichas
 * @returns {string}
 */
export function generarJuegoHtml(proyecto, archivos, motor, { creditos = creditosDe(proyecto) } = {}) {
  const { juego } = proyecto;
  const recursos = {};
  for (const elemento of juego.elementos) {
    const archivo = archivos.get(elemento.id);
    if (!archivo) throw falla('archivo_faltante', `Falta el archivo del elemento «${elemento.nombre}».`);
    recursos[elemento.id] = aDataUrl(archivo);
  }
  const titulo = juego.titulo?.trim() || 'Sin título';
  const datos = escaparParaScript(JSON.stringify({ juego, recursos, creditos }));
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escaparHtml(titulo)}</title>
<style>
${motor.estilos}
${ESTILOS_PAGINA}
</style>
</head>
<body>
<div id="juego"></div>
<noscript>Este juego necesita JavaScript para funcionar.</noscript>
<script>
(() => {
${empaquetarModulos(motor.modulos)}
// ---- el juego
const DATOS = ${datos};
jugar(document.getElementById('juego'), DATOS.juego, (id) => DATOS.recursos[id] ?? null, { creditos: DATOS.creditos });
})();
</script>
</body>
</html>
`;
}

/**
 * Cuánto pesa cada elemento, de mayor a menor, y el total (spec 14 y 17: paquete pesado).
 * @returns {{ elementos: Array<{ id, nombre, tipo, bytes }>, total: number, estimado: number }}
 */
export function pesos(proyecto, archivos) {
  const elementos = proyecto.juego.elementos.map((e) => ({
    id: e.id,
    nombre: e.nombre?.trim() || 'Sin nombre',
    tipo: e.tipo,
    bytes: archivos.get(e.id)?.datos?.byteLength ?? 0,
  }));
  elementos.sort((a, b) => b.bytes - a.bytes);
  const total = elementos.reduce((suma, e) => suma + e.bytes, 0);
  return { elementos, total, estimado: total * FACTOR_PAQUETE };
}

/** entrega-<estudiante>-<juego>.zip (spec 14). */
export function nombreDeEntrega(proyecto) {
  return `entrega-${nombreDeArchivo(proyecto.estudiante)}-${nombreDeArchivo(proyecto.juego?.titulo)}.zip`;
}

/**
 * El paquete de entrega completo (spec 14): juego.html, informe-juridico.html,
 * proyecto.json y archivos/. proyecto.json va en el mismo formato que «Guardar copia»,
 * así «Abrir copia» acepta el paquete. No muta el proyecto: la fecha de publicación la
 * escribe el editor antes de llamar; si no la hay, el informe usa `ahora`.
 * @param {object} proyecto
 * @param {Map<string, { tipo, datos }>} archivos
 * @param {{ JSZip: any, contenido: object, motor: object, nombreProducto?: string, ahora?: Date }} opciones
 * @returns {Promise<{ blob: Blob, huella: string, nombre: string }>} huella: SHA-256 del proyecto.json del zip
 */
export async function generarEntrega(proyecto, archivos, { JSZip, contenido, motor, nombreProducto = contenido?.nombre, ahora = new Date() }) {
  const problemas = validarEstructura(proyecto);
  if (problemas.length) throw Object.assign(new Error(`El proyecto no tiene la forma esperada: ${problemas.join('; ')}.`), { codigo: 'forma', problemas });
  const juego = generarJuegoHtml(proyecto, archivos, motor); // primero: falla pronto si falta un archivo
  const texto = JSON.stringify(proyecto, null, 2);
  const huella = await huellaSha256(new TextEncoder().encode(texto));
  const fecha = proyecto.publicado ?? ahora.toISOString();
  const informe = generarInforme(proyecto, { contenido, huella, fecha, nombreProducto });
  const zip = new JSZip();
  zip.file('juego.html', juego);
  zip.file('informe-juridico.html', informe);
  zip.file('proyecto.json', texto);
  for (const elemento of proyecto.juego.elementos) zip.file(`archivos/${elemento.archivo}`, archivos.get(elemento.id).datos);
  const bytes = await zip.generateAsync({ type: 'uint8array' });
  return { blob: new Blob([bytes], { type: 'application/zip' }), huella, nombre: nombreDeEntrega(proyecto) };
}
