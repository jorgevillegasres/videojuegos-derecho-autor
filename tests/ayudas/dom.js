// tests/ayudas/dom.js
// Ventana jsdom para probar las vistas sin navegador. Copia a globalThis lo que
// las vistas usan. Cada archivo de pruebas corre en su propio proceso.
import { JSDOM } from 'jsdom';

const GLOBALES = [
  'window', 'document', 'Node', 'HTMLElement', 'HTMLInputElement', 'HTMLSelectElement',
  'HTMLTextAreaElement', 'HTMLButtonElement', 'Event', 'KeyboardEvent', 'MouseEvent',
  'CustomEvent', 'FocusEvent', 'DragEvent', 'DataTransfer', 'getComputedStyle',
  'requestAnimationFrame', 'cancelAnimationFrame', 'HTMLMediaElement', 'Audio',
];

export function instalarDom(html = '<!DOCTYPE html><html lang="es"><head><title>prueba</title></head><body></body></html>') {
  const dom = new JSDOM(html, { pretendToBeVisual: true, url: 'http://localhost/' });
  for (const clave of GLOBALES) {
    if (clave in dom.window) globalThis[clave] = dom.window[clave];
  }
  return dom;
}

export function clic(nodo) {
  nodo.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

export function teclear(nodo, key) {
  return nodo.dispatchEvent(new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

export function escribir(control, valor) {
  control.value = valor;
  control.dispatchEvent(new window.Event('input', { bubbles: true }));
  control.dispatchEvent(new window.Event('change', { bubbles: true }));
}

export function textos(raiz, selector) {
  return [...raiz.querySelectorAll(selector)].map((n) => n.textContent.trim());
}
