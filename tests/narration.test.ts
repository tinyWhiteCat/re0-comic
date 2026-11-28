import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/server/app.js';
import { createGeminiSpeechSynthesizer, defaultGeminiTts } from '../src/server/gemini-tts.js';
import { run } from '../src/server/media.js';
import { createMimoSpeechSynthesizer } from '../src/server/mimo-tts.js';
import type { Project } from '../src/shared/project.js';

let dataDir: string;
let service: Awaited<ReturnType<typeof createApp>>;
const { model, voice } = defaultGeminiTts;
const apiKey = 'test-key';
const options = { model, apiKey };
const pcm = Buffer.alloc(24_000 * 2 * 0.8, 1);
const audioResponse = () => Response.json({
  status: 'completed',
  steps: [{ type: 'model_output', content: [{ type: 'audio', mime_type: 'audio/l16', data: pcm.toString('base64') }] }],
});
const voiceOptions = (gemini: boolean, mimo: boolean) => [
  { value: 'Leda', label: 'Leda · Gemini', configured: gemini },
  { value: '冰糖', label: '冰糖 · 小米 MiMo', configured: mimo },
];

beforeEach(async () => { dataDir = await mkdtemp(path.join(tmpdir(), 're0-gemini-tts-')); });
afterEach(async () => {
  await service?.waitForJobs();
  await rm(dataDir, { recursive: true, force: true });
});

async function createDraft() {
  const { body: project } = await request(service.app).post('/api/projects').send({ title: '试音' }).expect(200);
  const dir = path.join(dataDir, project.id);
  const route = `/api/projects/${project.id}`;
  const image = `${'a'.repeat(32)}.png`;
  await run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=s=64x64', '-frames:v', '1', '-threads', '1', image], dir);
  const scenes = [
    { image, text: '他推开门。', duration: 0.5 },
    { image, text: '', duration: 0.5 },
    { image, text: '屋里空荡荡的。', duration: 1 },
  ];
  const { body: draft } = await request(service.app).post(`${route}/save`).send({ ...project, scenes }).expect(200);
  return { project: draft as Project, dir, route };
}

it('uses the saved Leda voice, aligns the WAV to the scenes, and renders it through the normal video route', async () => {
  let release!: (response: Response) => void;
  const pending = new Promise<Response>(resolve => { release = resolve; });
  const fetch = vi.fn<typeof globalThis.fetch>().mockReturnValueOnce(pending)
    .mockImplementation(async () => audioResponse());
  service = await createApp({ dataDir, gemini: { model, synthesize: createGeminiSpeechSynthesizer({ ...options, fetch }) } });
  const { project, dir, route } = await createDraft();
  await request(service.app).get('/api/tts-options').expect(200, {
    configured: true, model, voice: 'Leda', defaultVoice: 'Leda', voices: voiceOptions(true, false),
  });
  await request(service.app).post(`${route}/narration-voice`).send({ voice: 'Achernar' }).expect(400);
  const chosen = await request(service.app).post(`${route}/narration-voice`).send({ voice }).expect(200);
  expect(chosen.body.narrationVoice).toBe('Leda');
  try {
    const begin = await request(service.app).post(`${route}/narration`).send({}).expect(200);
    expect(begin.body.narrationJob).toEqual({ status: 'generating' });
    await request(service.app).post(`${route}/narration-voice`).send({ voice: '冰糖' }).expect(409);
    await request(service.app).post(`${route}/narration`).send({}).expect(409);
    await request(service.app).post(`${route}/render`).send({}).expect(409);
  } finally {
    release(audioResponse());
  }
  await service.waitForJobs();
  expect(fetch).toHaveBeenCalledTimes(2);
  for (const [index, [url, init]] of fetch.mock.calls.entries()) {
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/interactions');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': apiKey });
    expect(JSON.parse(String(init?.body))).toEqual({
      model,
      store: false,
      input: [{ type: 'user_input', content: [{ type: 'text', text: project.scenes[index * 2].text }] }],
      response_format: { type: 'audio', mime_type: 'audio/l16', sample_rate: 24_000 },
      generation_config: { speech_config: [{ voice: 'Leda' }] },
    });
  }
  const { body: [latest] } = await request(service.app).get('/api/projects').expect(200);
  expect(latest.narrationJob).toBeUndefined();
  expect(latest).toMatchObject({ narrationVoice: 'Leda', narrationAudioVoice: 'Leda' });
  expect(latest.scenes.map((scene: Project['scenes'][number]) => scene.duration)).toEqual([0.8, 0.5, 1]);
  expect(latest.audio).toMatch(/^[a-f0-9]{32}\.wav$/);
  await request(service.app).get(`/files/${project.id}/${latest.audio}`).set('Range', 'bytes=0-43').expect(206);
  const wav = await readFile(path.join(dir, latest.audio));
  const gap = Buffer.alloc(24_000 * 2 * 0.5);
  const tail = Buffer.alloc(24_000 * 2 * 0.2);
  expect(wav.subarray(44).equals(Buffer.concat([pcm, gap, pcm, tail]))).toBe(true);
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', latest.audio], dir);
  expect(JSON.parse(stdout).streams[0]).toMatchObject({
    codec_name: 'pcm_s16le', sample_rate: '24000', channels: 1, duration: '2.300000',
  });
  await request(service.app).post(`${route}/render`).send({}).expect(200);
  await service.waitForJobs();
  const { body: [rendered] } = await request(service.app).get('/api/projects').expect(200);
  expect(rendered.status, rendered.error).toBe('done');
  await run('ffmpeg', ['-v', 'error', '-i', 'render.mp4', '-map', '0:a:0', '-f', 'null', '-'], dir);
  const changed = await request(service.app).post(`${route}/narration-voice`).send({ voice: '冰糖' }).expect(200);
  expect(changed.body).toMatchObject({ status: 'done', audio: latest.audio, narrationVoice: '冰糖', narrationAudioVoice: 'Leda' });
  await request(service.app).post(`${route}/narration`).send({}).expect(503, { error: '服务器尚未配置 MIMO_API_KEY' });
});

it('calls MiMo with the confirmed Bingtang preset and keeps the previous audio on failure', async () => {
  const fetch = vi.fn<typeof globalThis.fetch>().mockImplementationOnce(async () => Response.json({
    choices: [{ finish_reason: 'stop', message: { audio: { data: pcm.toString('base64') } } }],
  }))
    .mockImplementation(async () => new Response('private details', { status: 429 }));
  service = await createApp({ dataDir, mimo: createMimoSpeechSynthesizer({ apiKey, fetch }) });
  const { project, route, dir } = await createDraft();
  const original = `${'b'.repeat(32)}.wav`;
  await run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=duration=0.1', original], dir);
  await writeFile(path.join(dir, 'project.json'), JSON.stringify({ ...project, audio: original, narrationAudioVoice: 'Leda' }));
  await request(service.app).get('/api/tts-options').expect(200, {
    configured: false, model, voice, defaultVoice: '冰糖', voices: voiceOptions(false, true),
  });
  await request(service.app).post(`${route}/narration`).send({ voice: 'Zephyr' }).expect(400);
  await request(service.app).post(`${route}/narration`).send({ voice: '冰糖' }).expect(200);
  await service.waitForJobs();
  expect(fetch).toHaveBeenCalledTimes(2);
  const [url, init] = fetch.mock.calls[0];
  expect(url).toBe('https://api.xiaomimimo.com/v1/chat/completions');
  expect(init?.headers).toMatchObject({ 'api-key': apiKey });
  expect(JSON.parse(String(init?.body))).toEqual({
    model: 'mimo-v2.5-tts',
    messages: [{ role: 'assistant', content: project.scenes[0].text }],
    audio: { format: 'pcm16', voice: '冰糖' },
  });

  const { body: [latest] } = await request(service.app).get('/api/projects').expect(200);
  expect(latest).toMatchObject({ ...project, audio: original, narrationVoice: '冰糖', narrationAudioVoice: 'Leda', narrationJob: {
    status: 'failed', error: '第 3 镜配音失败。小米 MiMo 已达到请求或用量上限，请稍后重试。',
  } });
  expect(await readdir(dir)).not.toContain('narration.tmp');
});

it('reports missing configuration and recovers an interrupted narration without changing the draft', async () => {
  service = await createApp({ dataDir });
  const { project, route, dir } = await createDraft();
  await request(service.app).get('/api/tts-options').expect(200, {
    configured: false, model, voice, defaultVoice: 'Leda', voices: voiceOptions(false, false),
  });
  await request(service.app).post(`${route}/gemini-tts`).send({}).expect(503);
  await request(service.app).get('/api/projects').expect(200, [project]);
  await writeFile(path.join(dir, 'gemini-tts.tmp'), 'partial audio');
  await writeFile(path.join(dir, 'project.json'), JSON.stringify({ ...project, geminiTts: { status: 'generating' } }));
  service = await createApp({ dataDir });
  const { body: [latest] } = await request(service.app).get('/api/projects').expect(200);
  expect(latest).toMatchObject({ ...project, geminiTts: { status: 'failed' } });
  expect(await readdir(dir)).not.toContain('gemini-tts.tmp');
});
