// tests/ayudas/ejemplo.js
// Lo que el ejemplo necesita, leído del disco: el catálogo real de la biblioteca (con
// sus archivos) y cargar(ruta) para los retratos de muestra.
import { readFile } from 'node:fs/promises';
import { crearCatalogo } from '../../plataforma/js/biblioteca/catalogo.js';
import { mimePorExtension } from '../../plataforma/js/estado/archivos.js';

const PLATAFORMA = new URL('../../plataforma/', import.meta.url);

async function fetchDelDisco(url) {
  const ruta = new URL(String(url).replace('http://localhost/plataforma/', ''), PLATAFORMA);
  try {
    const datos = await readFile(ruta);
    return { ok: true, status: 200, json: async () => JSON.parse(datos.toString('utf8')), arrayBuffer: async () => datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) };
  } catch {
    return { ok: false, status: 404 };
  }
}

export async function catalogoReal() {
  const catalogo = crearCatalogo({ url: 'http://localhost/plataforma/biblioteca/catalogo.json', fetch: fetchDelDisco });
  await catalogo.cargar();
  return catalogo;
}

export async function cargarDelDisco(ruta) {
  const datos = await readFile(new URL(ruta, PLATAFORMA));
  return { tipo: mimePorExtension(ruta), datos: datos.buffer.slice(datos.byteOffset, datos.byteOffset + datos.byteLength) };
}

/** El ejemplo recién armado, como lo arma «Empezar». */
export async function ejemploArmado(datos = { estudiante: 'Camila R.', destino: 'gratis' }) {
  const { crearEjemplo } = await import('../../plataforma/js/guia/ejemplo.js');
  return crearEjemplo(datos, { catalogo: await catalogoReal(), cargar: cargarDelDisco });
}
