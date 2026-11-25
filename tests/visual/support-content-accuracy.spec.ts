import { test, expect } from '@playwright/test';

test('Soportes comunica especificaciones respaldadas por las fichas', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/soportes');

  await expect(page.getByRole('heading', { name: 'Pantallas LED' })).toBeVisible();
  await expect(page.getByText(/Frecuencia y horarios según cada ficha técnica/)).toBeVisible();
  await expect(page.getByText(/tres pantallas digitales/i)).toBeVisible();
  await expect(page.getByText(/2 pantallas laterales de 4 × 2 m y 1 posterior de 2 × 2 m/)).toBeVisible();
  await expect(page.getByText(/Spots de 10 segundos/)).toBeVisible();

  const pageText = (await page.locator('main').innerText()).toLowerCase();
  expect(pageText).not.toContain('p4 y p6');
  expect(pageText).not.toContain('actualización en tiempo real');
});

test('Soportes mantiene acciones y contenido legibles en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/soportes');

  await expect(page.getByRole('heading', { name: 'Soportes diseñados para hacerse notar.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver inventario' }).first()).toBeVisible();
  await expect(page.getByText(/tres pantallas digitales/i)).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
