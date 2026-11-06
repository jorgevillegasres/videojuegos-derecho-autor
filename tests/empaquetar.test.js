// tests/empaquetar.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aBase64, aDataUrl, escaparHtml, escaparParaScript, empaquetarModulos, declaracionesDe, cargarMotor, RUTAS_MOTOR, RUTAS_ESTILOS } from '../plataforma/js/exportar/empaquetar.js';
import { motorDesdeDisco } from './ayudas/motor.js';

test('aBase64 codifica igual que Node, con bytes sueltos, ArrayBuffer y más de un trozo', () => {
  assert.equal(aBase64(new Uint8Array([72, 111, 108, 97])), 'SG9sYQ==');
  assert.equal(aBase64(new Uint8Array(0)), '');
  const grande = new Uint8Array(100_003);
  for (let i = 0; i < grande.length; i += 1) grande[i] = (i * 31 + 7) % 256;
  assert.equal(aBase64(grande), Buffer.from(grande).toString('base64'));
  assert.equal(aBase64(grande.buffer), Buffer.from(grande).toString('base64'));
});

test('aDataUrl arma la URL con el tipo y el base64', () => {
  const datos = new TextEncoder().encode('PNG').buffer;
  assert.equal(aDataUrl({ tipo: 'image/png', datos }), 'data:image/png;base64,UE5H');
  assert.equal(aDataUrl({ tipo: '', datos }), 'data:application/octet-stream;base64,UE5H');
});

test('escaparHtml y escaparParaScript neutralizan lo que rompería la página', () => {
  assert.equal(escaparHtml(`<b class="x">Ana & 'Eva'</b>`), '&lt;b class=&quot;x&quot;&gt;Ana &amp; &#39;Eva&#39;&lt;/b&gt;');
  assert.equal(escaparHtml(null), '');
  const [sep1, sep2] = [String.fromCharCode(0x2028), String.fromCharCode(0x2029)];
  const json = JSON.stringify({ t: `</script><!-- x ${sep1} y ${sep2}` });
  const escapado = escaparParaScript(json);
  assert.ok(!escapado.includes('</script'));
  assert.ok(!escapado.includes('<!--'));
  assert.ok(!escapado.includes(sep1) && !escapado.includes(sep2), 'sin separadores de línea Unicode crudos');
  assert.deepEqual(new Function(`return ${escapado}`)(), JSON.parse(json), 'sigue siendo el mismo valor al evaluarlo');
});

test('empaquetarModulos quita import y export, conserva el código y separa por módulo', () => {
  const modulos = [
    { ruta: 'a.js', codigo: "import { x } from './x.js';\nimport './efecto.js';\nexport const A = 1;\nexport function f() { return A; }\nexport async function g() {}\nexport class C {}\nexport { f as h };\nexport { y } from './y.js';\n" },
    { ruta: 'b.js', codigo: "const B = 2;\r\nexport let z = B;\r\n" },
  ];
  const salida = empaquetarModulos(modulos);
  assert.ok(!/^\s*(import|export)\b/m.test(salida), 'no quedan import ni export');
  assert.ok(salida.includes('// ---- a.js'));
  assert.ok(salida.includes('// ---- b.js'));
  assert.ok(salida.includes('const A = 1;'));
  assert.ok(salida.includes('async function g() {}'));
  assert.ok(salida.includes('class C {}'));
  assert.ok(salida.includes('let z = B;'));
  assert.ok(!salida.includes('\r'), 'sin retornos de carro');
  assert.equal(new Function(`${salida}\nreturn f() + z;`)(), 3);
});

test('empaquetarModulos rechaza lo que no sabe quitar: import de varias líneas o export default', () => {
  assert.throws(() => empaquetarModulos([{ ruta: 'm.js', codigo: "import {\n  a,\n} from './a.js';\n" }]), /m\.js.*varias líneas/);
  assert.throws(() => empaquetarModulos([{ ruta: 'd.js', codigo: 'export default function () {}\n' }]), /d\.js.*export/);
});

test('el motor real se empaqueta, evalúa y no repite nombres de primer nivel entre módulos', () => {
  const { modulos, estilos } = motorDesdeDisco();
  assert.deepEqual(modulos.map((m) => m.ruta), RUTAS_MOTOR);
  assert.ok(estilos.includes('.reproductor') && estilos.includes('--accent'), 'los estilos traen tokens y reproductor');
  const salida = empaquetarModulos(modulos);
  const tipos = new Function(`${salida}\nreturn [typeof jugar, typeof crearPantalla, typeof crearPartida, typeof indiceCorte, typeof h];`)();
  assert.deepEqual(tipos, ['function', 'function', 'function', 'function', 'function']);
  const vistos = new Map();
  for (const modulo of modulos) {
    for (const nombre of declaracionesDe(modulo.codigo)) {
      assert.ok(!vistos.has(nombre), `«${nombre}» está declarado en ${vistos.get(nombre)} y en ${modulo.ruta}`);
      vistos.set(nombre, modulo.ruta);
    }
  }
  assert.ok(vistos.size >= 15, `se detectaron ${vistos.size} declaraciones; deberían ser muchas más`);
});

test('cargarMotor lee las rutas en orden con fetch y falla con la ruta que no carga', async () => {
  const pedidas = [];
  const fetch = async (url) => {
    const ruta = String(url).replace('http://x/plataforma/', '');
    pedidas.push(ruta);
    return { ok: true, status: 200, text: async () => `/* ${ruta} */` };
  };
  const motor = await cargarMotor({ base: 'http://x/plataforma/', fetch });
  assert.deepEqual(pedidas, [...RUTAS_MOTOR, ...RUTAS_ESTILOS]);
  assert.deepEqual(motor.modulos.map((m) => m.codigo), RUTAS_MOTOR.map((r) => `/* ${r} */`));
  assert.equal(motor.estilos, RUTAS_ESTILOS.map((r) => `/* ${r} */`).join('\n'));

  const roto = async (url) => ({ ok: !String(url).endsWith('pantalla.js'), status: 404, text: async () => '' });
  await assert.rejects(cargarMotor({ base: 'http://x/plataforma/', fetch: roto }), /js\/motor\/pantalla\.js \(404\)/);
});
