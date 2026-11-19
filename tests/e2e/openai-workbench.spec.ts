import { test, expect } from '@playwright/test';
import type { Project } from '../../src/shared/project';

const draft: Project = {
  id: 'a'.repeat(32),
  title: '第十三节',
  ratio: 'landscape',
  scenes: [{ image: `${'b'.repeat(32)}.png`, text: '昴在茅屋里醒来。', duration: 3 }],
  audio: null,
  status: 'draft',
};

test('OpenAI planning discloses sharing and renders after explicit confirmation', async ({ page }) => {
  let project = draft;
  const renderRequests: unknown[] = [];
  const narration = '昴睁开眼，雷姆就在床边。';
  const endpoint = `**/api/projects/${project.id}`;
  await page.route('**/api/render-options', route => route.fulfill({ json: { openai: { configured: true, model: 'test-model' } } }));
  await page.route('**/api/projects', route => route.fulfill({ json: [project] }));
  await page.route(`${endpoint}/save`, async route => {
    project = { ...project, scenes: route.request().postDataJSON().scenes };
    await route.fulfill({ json: project });
  });
  await page.route(`${endpoint}/render`, async route => {
    renderRequests.push(route.request().postDataJSON());
    project = { ...project, status: 'rendering', renderProvider: 'openai' };
    await route.fulfill({ json: project });
  });

  await page.goto('/');
  await page.getByRole('textbox', { name: '第 1 镜解说' }).fill(narration);
  const openAi = page.getByRole('button', { name: 'OpenAI 运镜合成' });
  await openAi.click();
  await expect(page.getByText('当前的分镜图和解说会发送给 OpenAI。视频由本地 FFmpeg 合成。')).toBeVisible();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  expect(renderRequests).toEqual([]);

  await openAi.click();
  const confirm = page.getByRole('button', { name: '用当前分镜编排并合成' });
  await confirm.evaluate((button: HTMLButtonElement) => {
    button.click();
    button.click();
  });
  await expect(page.getByText('正在规划运镜并合成视频')).toBeVisible();
  expect(renderRequests).toEqual([{ provider: 'openai' }]);
  expect(project.scenes[0].text).toBe(narration);
  await expect(openAi).toBeDisabled();
  await expect(page.getByRole('button', { name: /合成视频$/ })).toBeDisabled();

  project = { ...project, status: 'done' };
  await expect(page.getByRole('link', { name: '下载 MP4 成片' })).toBeVisible();
});

test('missing OpenAI configuration leaves local rendering available', async ({ page }) => {
  await page.route('**/api/render-options', route => route.fulfill({ json: { openai: { configured: false, model: null } } }));
  await page.route('**/api/projects', route => route.fulfill({ json: [draft] }));
  const endpoint = `**/api/projects/${draft.id}/render`;
  await page.route(endpoint, route => route.fulfill({ json: { ...draft, status: 'rendering', renderProvider: 'local' } }));

  await page.goto('/');
  await expect(page.getByText('OPENAI_API_KEY', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'OpenAI 运镜合成' })).toBeDisabled();
  const render = page.waitForRequest(endpoint);
  await page.getByRole('button', { name: /合成视频$/ }).click();
  expect((await render).postDataJSON()).toEqual({});
  await expect(page.getByText('正在合成视频', { exact: true })).toBeVisible();
});
