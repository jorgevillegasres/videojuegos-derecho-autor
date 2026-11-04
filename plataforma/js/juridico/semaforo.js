// plataforma/js/juridico/semaforo.js
// Reglas del semáforo (spec, sección 12.4). Función pura: entra una ficha y el
// contexto { destino }, sale { color, razones, notas } con códigos. Los textos
// se agregan aparte con describir() de textos.js.
import { condicionesDe } from './licencias.js';

export const CODIGOS_ROJO = ['R01', 'R02', 'R03', 'R04', 'R05', 'R06'];
export const CODIGOS_AMARILLO = ['A01', 'A02', 'A03', 'A04', 'A05', 'A06', 'A07', 'A08', 'A09', 'A10', 'A11', 'A12', 'A13'];
export const CODIGOS_NOTAS = ['N_TITULO', 'N_IA', 'N_IA_APORTE', 'N_SELLO'];
const DESTINOS = ['personal', 'gratis', 'venta']; // los mismos valores que estado/modelo.js

const vacio = (texto) => !(texto ?? '').trim();

export function evaluar(ficha, contexto) {
  const destino = contexto?.destino;
  if (!DESTINOS.includes(destino)) throw new Error(`Destino inválido: ${destino}`);

  if (ficha.tipo === 'titulo') {
    return { color: 'verde', razones: [], notas: ['N_TITULO'] };
  }
  // Sin autor ni licencia no hay nada que corregir: solo reemplazar.
  if (ficha.licencia === 'DESCONOCIDO') {
    return { color: 'rojo', razones: ['R01'], notas: [] };
  }

  const condiciones = condicionesDe(ficha);
  const tieneLicencia = ficha.respaldo === 'licencia' && Boolean(ficha.licencia);
  const ajeno = ficha.autoria === 'otra_persona' || ficha.titular === 'otra_persona';
  const conIA = ficha.autoria === 'ia' || ficha.autoria === 'ia_con_aporte';
  const razones = [];
  const notas = [];

  // ---- Rojo ----
  if (ajeno && ficha.respaldo === 'ninguno') razones.push('R02');
  if (tieneLicencia && condiciones.includes('NC') && destino === 'venta') razones.push('R03');
  if (tieneLicencia && condiciones.includes('ND') && ficha.modificado) razones.push('R04');
  if (tieneLicencia && ficha.licencia === 'CURSO' && destino !== 'personal') razones.push('R05');
  if (ficha.basadoEnObraAjena && !ficha.autorizacionDerivada) razones.push('R06');

  // ---- Amarillo ----
  if (tieneLicencia && condiciones.includes('BY') && vacio(ficha.credito)) razones.push('A01');
  if (ficha.autoria === 'otra_persona' && ficha.respaldo !== 'ninguno' && vacio(ficha.credito)) razones.push('A02');
  if (tieneLicencia && condiciones.includes('SA') && !ficha.aceptaCompartirIgual) razones.push('A03');
  if (ficha.autoria === 'ia' && !ficha.reconoceSinDerechos) razones.push('A04');
  if (ficha.autoria === 'ia_con_aporte' && vacio(ficha.aporteHumano)) razones.push('A05');
  if (ficha.origen === 'subido' && (ficha.autoria === 'yo' || ficha.autoria === 'ia_con_aporte') && ficha.prueba === 'ninguna') razones.push('A06');
  if (tieneLicencia && !ficha.licenciaLeida) razones.push('A07');
  if (ficha.autoria === 'otra_persona' && vacio(ficha.autorNombre)) razones.push('A08');
  if (ficha.respaldo === 'cesion' && ficha.titular === 'otra_persona') razones.push('A09');
  if (ficha.respaldo === 'autorizacion' && destino === 'venta') razones.push('A10');
  if (tieneLicencia && ficha.licencia === 'OTRA' && vacio(ficha.licenciaTexto)) razones.push('A11');
  if (ficha.respaldo === 'licencia' && !ficha.licencia) razones.push('A12');
  if (conIA && vacio(ficha.herramientaIA)) razones.push('A13');

  // ---- Notas (solo informan; no cambian el color) ----
  if (ficha.origen === 'creado' && ficha.prueba === 'sello') notas.push('N_SELLO');
  if (ficha.autoria === 'ia' && ficha.reconoceSinDerechos) notas.push('N_IA');
  if (ficha.autoria === 'ia_con_aporte' && !vacio(ficha.aporteHumano)) notas.push('N_IA_APORTE');

  const color = razones.some((c) => CODIGOS_ROJO.includes(c)) ? 'rojo'
    : razones.length ? 'amarillo'
    : 'verde';
  return { color, razones, notas };
}
