import { test, expect } from '@playwright/test';

test('gallery displays artwork, filters, previews and adapts to mobile', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/gallery');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('藏在画里');
  await expect(page.locator('.art-card')).toHaveCount(12);
  await expect.poll(() => page.locator('.art-image img').first().evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole('textbox', { name: '搜索画作' }).fill('subaru');
  await expect(page.locator('.art-card')).toHaveCount(2);
  await page.getByRole('button', { name: '查看 Subaru', exact: true }).click();
  await expect(page.locator('.ant-image-preview')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.ant-image-preview')).not.toBeVisible();
  await page.getByRole('textbox', { name: '搜索画作' }).fill('no-such-artwork');
  await expect(page.getByText('没有找到匹配的画作，试试其他名字或编号。')).toBeVisible();
  await page.getByRole('button', { name: '清除搜索' }).click();
  await page.locator('.ant-pagination-item-6').click();
  await expect(page.locator('.art-card')).toHaveCount(1);
  await page.getByText('漫画彩图', { exact: true }).first().click();
  await expect(page.getByText('漫画彩图尚未收录。后续将在这里按顺序展示故事画面。')).toBeVisible();
  await page.getByText('角色原画', { exact: true }).first().click();
  await expect(page.locator('.art-card')).toHaveCount(12);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const image of await page.locator('.art-image img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate(element => (element as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: '/tmp/re0-gallery-mobile.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '/tmp/re0-gallery-desktop.png', fullPage: true });
  await page.getByRole('link', { name: '视频工作台' }).click();
  await expect(page.getByRole('link', { name: '故事画廊' })).toBeVisible();
  expect(errors).toEqual([]);
});
