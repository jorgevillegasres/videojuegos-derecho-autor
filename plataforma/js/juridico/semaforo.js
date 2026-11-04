// plataforma/js/juridico/semaforo.js
// Reglas del semáforo (spec, sección 12.4). Función pura: entra una ficha y el
// contexto { destino }, sale { color, razones, notas } con códigos. Los textos
// se agregan aparte con describir() de textos.js.
import { condicionesDe } from './licencias.js';

export const CODIGOS_ROJO = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'];
export const CODIGOS_AMARILLO = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11'];
export const CODIGOS_NOTAS = ['N_TITULO', 'N_IA', 'N_IA_APORTE', 'N_SELLO'];

const vacio = (texto) => !(texto ?? '').trim();

export function evaluar(ficha, contexto) {
  const destino = contexto?.destino ?? 'gratis';
  const notas = [];

  if (ficha.tipo === 'titulo') {
    return { color: 'verde', razones: [], notas: ['N_TITULO'] };
  }
  // Sin autor ni licencia no hay nada que corregir: solo reemplazar.
  if (ficha.licencia === 'DESCONOCIDO') {
    return { color: 'rojo', razones: ['R01'], notas };
  }

  const condiciones = condicionesDe(ficha);
  const tieneLicencia = ficha.respaldo === 'licencia' && Boolean(ficha.licencia);
  const esDerivable = ficha.tipo === 'historia' || ficha.tipo === 'personaje';
  const razones = [];

  // ---- Rojo ----
  if (ficha.autoria === 'otra_persona' && ficha.respaldo === 'ninguno') razones.push('R02');
  if (tieneLicencia && condiciones.includes('NC') && destino === 'venta') razones.push('R03');
  if (tieneLicencia && condiciones.includes('ND') && ficha.modificado) razones.push('R04');
  if (ficha.licencia === 'CURSO' && destino !== 'personal') razones.push('R05');
  if (esDerivable && ficha.basadoEnObraAjena && !ficha.autorizacionDerivada) razones.push('R06');

  // ---- Amarillo ---- (Task 7)

  // ---- Notas ----
  if (ficha.origen === 'creado' && ficha.prueba === 'sello') notas.push('N_SELLO');

  const color = razones.some((c) => CODIGOS_ROJO.includes(c)) ? 'rojo'
    : razones.length ? 'amarillo'
    : 'verde';
  return { color, razones, notas };
}
