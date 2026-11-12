import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('public header redesign', () => {
  test('desktop navigation exposes the commercial action without duplicate Contact link', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 1024) < 600) await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    const navigation = page.getByRole('navigation', { name: 'Navegación principal' });
    await expect(navigation.getByRole('link', { name: 'Inventario' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Soportes' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Soluciones' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Nosotros' })).toBeVisible();
    await expect(navigation.getByRole('link', { name: 'Contacto' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Solicitar cotización' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Buscar soportes' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Abrir Media Kit/ })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).include('header').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test('desktop header fits without horizontal overflow from 1024px upward', async ({ page }) => {
    for (const width of [1024, 1100, 1280, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto('/');
      const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
      expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
      await expect(page.getByRole('link', { name: 'Solicitar cotización' })).toBeVisible();
    }
  });

  test('mobile menu removes redundant Inicio, traps focus and closes with Escape', async ({ page }) => {
    if ((page.viewportSize()?.width ?? 1024) >= 600) await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Abrir menú' });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Menú de navegación' });
    await expect(dialog).toBeVisible();
    const navigation = dialog.getByRole('navigation', { name: 'Navegación principal' });
    await expect(navigation.getByRole('link', { name: 'Inicio' })).toHaveCount(0);
    await expect(navigation.getByRole('link', { name: 'Contacto' })).toHaveCount(0);
    await expect(dialog.getByRole('link', { name: 'Solicitar cotización' })).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Buscar soportes' })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).include('#mobile-navigation').withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await expect(dialog.getByRole('button', { name: 'Buscar soportes' })).toBeFocused();
    await page.keyboard.press('Shift+Tab');
    await expect(dialog.getByRole('link', { name: 'WhatsApp comercial' })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(dialog.getByRole('button', { name: 'Buscar soportes' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Abrir menú' })).toBeFocused();
  });

  test('public pages do not overflow horizontally at common viewport widths', async ({ page }) => {
    for (const width of [320, 360, 375, 390, 414]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/');
      const dimensions = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
      }));
      expect(dimensions.content, `horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);
    }
  });
});
