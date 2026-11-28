import { expect, test } from '@playwright/test';
import type { Project } from '../../src/shared/project';

test('saves the narration voice, confirms the provider, and shows the voice on the resulting audio', async ({ page }) => {
  let project: Project = {
    id: 'a'.repeat(32), title: '配音测试', ratio: 'landscape', status: 'draft',
    scenes: [{ image: `${'b'.repeat(32)}.png`, text: '', duration: 1 }],
    audio: null,
  };
  const endpoint = `**/api/projects/${project.id}`;
  const narration = '天亮时，雨停了。';
  const requests: string[] = [];
  const generatedVoices: string[] = [];
  await page.route('**/api/tts-options', route => route.fulfill({
    json: {
      defaultVoice: 'Leda',
      voices: [{ value: 'Leda', label: 'Leda · Gemini', configured: true }, { value: '冰糖', label: '冰糖 · 小米 MiMo', configured: true }],
    },
  }));
  await page.route('**/api/projects', route => route.fulfill({ json: [project] }));
  await page.route(`${endpoint}/narration-voice`, route => {
    project = { ...project, narrationVoice: route.request().postDataJSON().voice };
    return route.fulfill({ json: project });
  });
  await page.route(`${endpoint}/save`, route => {
    requests.push('save');
    project = { ...project, scenes: route.request().postDataJSON().scenes };
    return route.fulfill({ json: project });
  });
  await page.route(`${endpoint}/narration`, route => {
    requests.push('narration');
    generatedVoices.push(route.request().postDataJSON().voice);
    project = { ...project, narrationJob: { status: 'generating' } };
    return route.fulfill({ json: project });
  });

  await page.goto('/');
  const voice = page.getByRole('combobox', { name: '配音音色' });
  const voiceField = page.locator('.narration-voice-field');
  const generate = page.getByRole('button', { name: '生成配音', exact: true });
  const render = page.getByRole('button', { name: /合成视频$/ });
  await expect(voiceField.getByText('Leda · Gemini', { exact: true })).toBeVisible();
  await voice.click();
  await page.getByText('冰糖 · 小米 MiMo', { exact: true }).click();
  await expect(voiceField.getByText('冰糖 · 小米 MiMo', { exact: true })).toBeVisible();
  await page.reload();
  await expect(voiceField.getByText('冰糖 · 小米 MiMo', { exact: true })).toBeVisible();
  await expect(generate).toBeDisabled();
  await page.getByRole('textbox', { name: '第 1 镜解说' }).fill(narration);
  await generate.click();
  await expect(page.getByText('分镜解说会发送给小米 MiMo。若配音比镜头长，会延长该镜头。')).toBeVisible();
  await page.getByRole('button', { name: /取\s*消/ }).click();
  expect(requests).toEqual([]);

  await generate.click();
  await page.getByRole('button', { name: '确认生成', exact: true }).click();
  await expect(page.getByText('正在生成配音')).toBeVisible();
  await expect(render).toBeDisabled();
  await expect(voice).toBeDisabled();
  expect(requests).toEqual(['save', 'narration']);
  expect(generatedVoices).toEqual(['冰糖']);
  expect(project.scenes[0].text).toBe(narration);

  const audio = `${'c'.repeat(32)}.wav`;
  project = { ...project, audio, narrationAudioVoice: '冰糖', scenes: [{ ...project.scenes[0], duration: 1.4 }], narrationJob: undefined };
  await expect(page.getByLabel('配音预览')).toHaveAttribute('src', `/files/${project.id}/${audio}`);
  await expect(page.getByRole('spinbutton', { name: '第 1 镜时长' })).toHaveValue('1.4');
  await expect(render).toBeEnabled();
  await voice.click();
  await page.getByText('Leda · Gemini', { exact: true }).click();
  await expect(page.getByText('当前配音 · 冰糖')).toBeVisible();
  await expect(page.getByText('点击「生成配音」更换音色。')).toBeVisible();
});
