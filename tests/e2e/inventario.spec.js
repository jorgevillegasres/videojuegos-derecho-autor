// tests/e2e/inventario.spec.js
// Lo que jsdom no puede medir: que los botones del inventario quepan en su columna
// (sin desplazamiento horizontal escondido) y que la lista «Falta para publicar» no
// reciba los clics destinados al panel derecho. Playwright desplaza a la vista lo que
// pulsa, así que el recorrido completo no detecta un botón fuera del borde.
import { test, expect } from '@playwright/test';

async function abrirEditor(page) {
  await page.goto('/plataforma/');
  await page.fill('#inicio-estudiante', 'Camila Rojas');
  await page.fill('#inicio-titulo', 'La llave del faro');
  await page.getByRole('button', { name: 'Empezar' }).click();
  await expect(page.locator('.barra-juego')).toHaveText('La llave del faro');
}

test('los botones de crear del inventario se ven sin desplazar la columna', async ({ page }) => {
  await abrirEditor(page);
  const columna = page.locator('.columna-inventario');
  const sinDesborde = await columna.evaluate((c) => c.scrollWidth <= c.clientWidth);
  expect(sinDesborde, 'la columna del inventario no debe desbordarse a lo ancho').toBe(true);

  const cajaColumna = await columna.boundingBox();
  const botones = page.locator('.inventario-botones button');
  await expect(botones).toHaveCount(7);
  for (const boton of await botones.all()) {
    const texto = (await boton.textContent()).trim();
    await expect(boton, texto).toBeInViewport();
    const caja = await boton.boundingBox();
    expect(caja.x, `${texto}: borde izquierdo`).toBeGreaterThanOrEqual(cajaColumna.x);
    expect(caja.x + caja.width, `${texto}: borde derecho`).toBeLessThanOrEqual(cajaColumna.x + cajaColumna.width + 0.5);
  }

  // Un clic en el botón, tal como lo ve el estudiante, crea el personaje.
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  await expect(page.locator('.inventario-seccion').nth(1).locator('button.entrada')).toHaveCount(1);
});

test('la lista del candado de Publicar no tapa el panel derecho', async ({ page }) => {
  await abrirEditor(page);
  await page.getByRole('button', { name: 'Nuevo personaje' }).click();
  const nombre = page.locator('.propiedades [data-foco="nombre"]');
  await expect(nombre).toBeVisible();

  const publicar = page.locator('button[data-accion="publicar"]');
  const falta = page.locator('.publicar-falta');
  await publicar.hover();
  await expect(falta).toBeVisible();
  await expect(falta).toContainText('Falta para publicar');

  // El cursor baja desde «Publicar» hacia el panel: la lista se cierra en vez de quedarse encima.
  const cajaFalta = await falta.boundingBox();
  await page.mouse.move(cajaFalta.x + cajaFalta.width / 2, cajaFalta.y + cajaFalta.height / 2);
  await expect(falta).toBeHidden();

  // Y un clic en el campo «Nombre», en la zona que la lista ocupaba, llega al campo.
  await publicar.hover();
  await expect(falta).toBeVisible();
  const cajaNombre = await nombre.boundingBox();
  await page.mouse.click(cajaNombre.x + cajaNombre.width / 2, cajaNombre.y + cajaNombre.height / 2);
  await expect(nombre).toBeFocused();
});
