// tests/servir.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { crearServidor } from './manual/servir.js';

async function conServidor(fn) {
  const servidor = crearServidor();
  await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((listo) => servidor.close(listo));
  }
}

test('el servidor manual sirve archivos con su tipo, redirige carpetas y responde 404 a lo que no existe', async () => {
  await conServidor(async (base) => {
    const css = await fetch(`${base}/plataforma/css/tokens.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get('content-type'), /text\/css/);
    const js = await fetch(`${base}/plataforma/js/motor/partida.js`);
    assert.match(js.headers.get('content-type'), /text\/javascript/);
    const carpeta = await fetch(`${base}/plataforma`, { redirect: 'manual' });
    assert.equal(carpeta.status, 302);
    assert.equal(carpeta.headers.get('location'), '/plataforma/');
    assert.equal((await fetch(`${base}/no-existe.txt`)).status, 404);
    const paquete = await (await fetch(`${base}/..%2F..%2Fpackage.json`)).json();
    assert.equal(paquete.name, 'plataforma-primer-videojuego', 'subir con .. no sale de la raíz');
  });
});
