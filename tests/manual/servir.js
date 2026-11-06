// tests/manual/servir.js
// Servidor estático mínimo para probar a mano en localhost. Sirve la raíz del
// repositorio. Uso: node tests/manual/servir.js [puerto]   (por defecto 8080)
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(fileURLToPath(new URL('../../', import.meta.url)));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.webm': 'audio/webm',
  '.m4a': 'audio/mp4',
  '.woff2': 'font/woff2',
};

export function crearServidor(raiz = RAIZ) {
  return createServer(async (solicitud, respuesta) => {
    try {
      const url = new URL(solicitud.url, 'http://localhost');
      let ruta = decodeURIComponent(url.pathname);
      if (ruta.endsWith('/')) ruta += 'index.html';
      const archivo = resolve(raiz, `.${normalize(ruta)}`);
      if (archivo !== raiz && !archivo.startsWith(raiz + sep)) {
        respuesta.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end('Fuera de la raíz');
        return;
      }
      const info = await stat(archivo).catch(() => null);
      if (!info) {
        respuesta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        respuesta.end(`No existe: ${ruta}`);
        return;
      }
      if (info.isDirectory()) {
        respuesta.writeHead(302, { Location: `${url.pathname}/` });
        respuesta.end();
        return;
      }
      const datos = await readFile(archivo);
      respuesta.writeHead(200, { 'Content-Type': MIME[extname(archivo).toLowerCase()] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      respuesta.end(datos);
    } catch (error) {
      respuesta.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      respuesta.end(String(error));
    }
  });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const puerto = Number(process.argv[2] ?? 8080);
  crearServidor().listen(puerto, '127.0.0.1', () => {
    console.log(`Sirviendo ${RAIZ}`);
    console.log(`  plataforma:        http://localhost:${puerto}/plataforma/`);
    console.log(`  prueba del motor:  http://localhost:${puerto}/tests/manual/motor.html`);
  });
}
