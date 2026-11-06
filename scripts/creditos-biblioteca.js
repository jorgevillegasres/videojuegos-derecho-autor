// scripts/creditos-biblioteca.js
// Escribe plataforma/biblioteca/CREDITOS.md a partir de catalogo.json, para que los
// créditos nunca se desvíen del catálogo. Uso: node scripts/creditos-biblioteca.js
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(fileURLToPath(new URL('../', import.meta.url)));
const BIBLIOTECA = resolve(RAIZ, 'plataforma/biblioteca');
const NOMBRES = { fondo: 'Fondos', retrato: 'Retratos', musica: 'Pistas musicales', efecto: 'Efectos de sonido' };
const NOMBRES_LICENCIA = {
  DP: 'Dominio público',
  CC0: 'CC0 1.0',
  'CC-BY-4.0': 'CC BY 4.0',
  'CC-BY-SA-4.0': 'CC BY-SA 4.0',
  'CC-BY-NC-4.0': 'CC BY-NC 4.0',
  'CC-BY-ND-4.0': 'CC BY-ND 4.0',
  CURSO: 'Licencia limitada al curso',
  DESCONOCIDO: 'Autor desconocido',
};

const celda = (texto) => String(texto ?? '').replaceAll('|', '\\|');
const enlace = (fuente) => (/^https?:\/\//.test(fuente) ? `<${fuente}>` : `\`${fuente}\``);

export function generarCreditos(catalogo) {
  const lineas = ['# Créditos de la biblioteca', ''];
  if (catalogo.provisional) {
    lineas.push(`> **Catálogo provisional.** ${catalogo.nota ?? ''}`.trim(), '');
  }
  lineas.push('Cada pieza aparece con el autor, la licencia y la fuente que muestra la plataforma. Las piezas simuladas se explican al final.', '');
  for (const tipo of Object.keys(NOMBRES)) {
    const piezas = catalogo.piezas.filter((p) => p.tipo === tipo);
    if (!piezas.length) continue;
    lineas.push(`## ${NOMBRES[tipo]}`, '', '| Título | Autor | Licencia | Fuente |', '|---|---|---|---|');
    for (const p of piezas) lineas.push(`| ${celda(p.titulo)} | ${celda(p.autor)} | ${NOMBRES_LICENCIA[p.licencia] ?? p.licencia} | ${enlace(p.fuente)} |`);
    lineas.push('');
  }
  const simuladas = catalogo.piezas.filter((p) => p.simulado);
  if (simuladas.length) {
    lineas.push('## Lo que hay detrás de las piezas simuladas', '', 'La plataforma presenta estas piezas con una licencia distinta de la real para que el ejercicio tenga casos de todos los colores. Lo real es lo siguiente.', '', '| Título | Se presenta como | En realidad es | Autor real | Fuente real |', '|---|---|---|---|---|');
    for (const p of simuladas) lineas.push(`| ${celda(p.titulo)} | ${NOMBRES_LICENCIA[p.licencia] ?? p.licencia} | ${NOMBRES_LICENCIA[p.simulado.licencia] ?? p.simulado.licencia} | ${celda(p.simulado.autor)} | ${enlace(p.simulado.fuente)} |`);
    lineas.push('');
  }
  return `${lineas.join('\n')}`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const catalogo = JSON.parse(readFileSync(resolve(BIBLIOTECA, 'catalogo.json'), 'utf8'));
  writeFileSync(resolve(BIBLIOTECA, 'CREDITOS.md'), generarCreditos(catalogo));
  console.log(`CREDITOS.md: ${catalogo.piezas.length} piezas`);
}
