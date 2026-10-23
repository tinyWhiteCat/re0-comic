import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

test('React workbench imports, edits, reorders and renders a comic video', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const temporary = await mkdtemp(path.join(os.tmpdir(), 're0-browser-'));
  try {
    const image = path.join(temporary, 'panel.png');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x778c75:s=640x960', '-frames:v', '1', '-threads', '1', image]);
    await page.goto('/');
    await page.getByRole('button', { name: '创建第一支作品' }).click();
    await page.getByRole('textbox', { name: '作品名称' }).fill('React 漫画验收');
    await page.getByText('导入漫画', { exact: true }).locator('..').locator('..').locator('input[type=file]').setInputFiles([image, image]);
    await expect(page.getByTestId('scene-card')).toHaveCount(2);
    await expect(page.getByRole('textbox', { name: '第 1 镜解说' })).toBeEnabled();
    await page.getByRole('textbox', { name: '第 1 镜解说' }).fill('翻开这一页，故事才刚刚开始。');
    await page.getByRole('textbox', { name: '第 2 镜解说' }).fill('新的冒险正在等待我们。');
    await page.getByRole('spinbutton', { name: '第 1 镜时长' }).fill('0.5');
    await page.getByRole('spinbutton', { name: '第 2 镜时长' }).fill('0.5');
    await page.getByRole('button', { name: '下移第 1 镜' }).click();
    await expect(page.getByRole('textbox', { name: '第 1 镜解说' })).toHaveValue('新的冒险正在等待我们。');
    await page.getByRole('button', { name: '保存草稿' }).click();
    await expect(page.getByText('草稿已保存')).toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox', { name: '作品名称' })).toHaveValue('React 漫画验收');
    await expect(page.getByRole('textbox', { name: '第 1 镜解说' })).toHaveValue('新的冒险正在等待我们。');
    await page.getByRole('button', { name: '合成视频' }).click();
    await expect(page.getByRole('link', { name: '下载 MP4 成片' })).toBeVisible({ timeout: 30_000 });
    const video = page.locator('video');
    await expect(video).toBeVisible();
    await expect.poll(() => video.evaluate(element => (element as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(1);
    const download = page.waitForEvent('download');
    await page.getByRole('link', { name: '下载 SRT 字幕' }).click();
    expect((await download).suggestedFilename()).toBe('subtitles.srt');
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: '/tmp/re0-react-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(page.getByRole('button', { name: '合成视频' })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator('.ant-layout-sider-children')).toBeHidden();
    await page.screenshot({ path: '/tmp/re0-react-mobile.png', fullPage: true });
    expect(errors).toEqual([]);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
