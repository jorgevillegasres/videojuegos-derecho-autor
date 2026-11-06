// tests/ayudas/motor.js
// El motor tal como lo incrusta juego.html, leído del disco con la misma lista de rutas
// que usa app.js en el navegador (exportar/empaquetar.js). Si falta una ruta, falla aquí.
import { readFileSync } from 'node:fs';
import { RUTAS_MOTOR, RUTAS_ESTILOS } from '../../plataforma/js/exportar/empaquetar.js';

const BASE = new URL('../../plataforma/', import.meta.url);

export function motorDesdeDisco() {
  const leer = (ruta) => readFileSync(new URL(ruta, BASE), 'utf8');
  return {
    modulos: RUTAS_MOTOR.map((ruta) => ({ ruta, codigo: leer(ruta) })),
    estilos: RUTAS_ESTILOS.map(leer).join('\n'),
  };
}
