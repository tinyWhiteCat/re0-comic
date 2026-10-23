import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server/app';
import { run } from '../src/server/media';
import type { Project } from '../src/shared/project';

let dataDir: string;
let service: Awaited<ReturnType<typeof createApp>>;
let image: string;
beforeEach(async () => {
  dataDir = await mkdtemp(path.join(os.tmpdir(), 're0-ts-test-'));
  service = await createApp({ dataDir });
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x536a82:s=320x480', '-frames:v', '1', '-threads', '1', path.join(dataDir, 'sample.png')]);
  image = (await readFile(path.join(dataDir, 'sample.png'))).toString('base64');
});
afterEach(async () => {
  await service.waitForJobs();
  await rm(dataDir, { recursive: true, force: true });
});
async function createWithImage() {
  const { body } = await request(service.app).post('/api/projects').send({ title: '测试漫画' }).expect(200);
  const response = await request(service.app).post(`/api/projects/${body.id}/upload`).send({ extension: 'png', content: image }).expect(200);
  return response.body as Project;
}

describe('comic narration workflow', () => {
  it('uploads real media and exports decodable Chinese-subtitled video with padded audio', async () => {
    const project = await createWithImage();
    const route = `/api/projects/${project.id}`;
    project.scenes[0] = { ...project.scenes[0], text: '一场奇妙的冒险，就此开始。', duration: 0.5 };
    await request(service.app).post(`${route}/save`).send({ ...project, ratio: 'landscape' }).expect(200);
    const audio = path.join(dataDir, 'voice.wav');
    await run('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.2', audio]);
    await request(service.app).post(`${route}/upload`).send({ extension: 'wav', content: (await readFile(audio)).toString('base64') }).expect(200);
    const response = await request(service.app).post(`${route}/render`).send({}).expect(200);
    expect(response.body.status).toBe('rendering');
    await request(service.app).post(`${route}/save`).send(project).expect(409);
    await service.waitForJobs();
    const { body: list } = await request(service.app).get('/api/projects').expect(200);
    expect(list[0].status, list[0].error).toBe('done');
    const file = path.join(dataDir, project.id, 'render.mp4');
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file]);
    const probe = JSON.parse(stdout);
    expect(probe.streams.find((stream: { codec_type: string }) => stream.codec_type === 'video')).toMatchObject({ width: 1280, height: 720 });
    expect(probe.streams.some((stream: { codec_type: string }) => stream.codec_type === 'audio')).toBe(true);
    expect(Number(probe.format.duration)).toBeCloseTo(0.5, 1);
    const subtitles = await readFile(path.join(dataDir, project.id, 'subtitles.srt'), 'utf8');
    expect(subtitles).toContain('奇妙的冒险');
    expect(subtitles).toContain('00:00:00,000 --> 00:00:00,500');
    await run('ffmpeg', ['-v', 'error', '-i', file, '-f', 'null', '-']);
    await request(service.app).get(`/files/${project.id}/render.mp4`).set('Range', 'bytes=0-99').expect(206);
  });

  it('renders portrait without audio and persists an empty draft without allowing empty renders', async () => {
    const project = await createWithImage();
    project.scenes[0].duration = 0.5;
    const route = `/api/projects/${project.id}`;
    await request(service.app).post(`${route}/save`).send(project).expect(200);
    await request(service.app).post(`${route}/render`).send({}).expect(200);
    await service.waitForJobs();
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', path.join(dataDir, project.id, 'render.mp4')]);
    const probe = JSON.parse(stdout);
    expect(probe.streams[0]).toMatchObject({ width: 720, height: 1280 });
    expect(probe.streams).toHaveLength(1);
    await request(service.app).post(`${route}/save`).send({ ...project, scenes: [] }).expect(200);
    await request(service.app).post(`${route}/render`).send({}).expect(400);
  });

  it('rejects damaged media, missing assets, invalid dimensions and unsafe filenames', async () => {
    const project = await createWithImage();
    const route = `/api/projects/${project.id}`;
    await request(service.app).post(`${route}/upload`).send({ extension: 'png', content: Buffer.from('not a png').toString('base64') }).expect(400);
    await request(service.app).post(`${route}/upload`).send({ extension: 'png', content: 'invalid base64!' }).expect(400);
    await request(service.app).post(`${route}/upload`).send({ extension: 'exe', content: image }).expect(400);
    for (const duration of [0, 31, '4']) {
      await request(service.app).post(`${route}/save`).send({ ...project, scenes: [{ ...project.scenes[0], duration }] }).expect(400);
    }
    await request(service.app).post(`${route}/save`).send({ ...project, scenes: [{ ...project.scenes[0], image: '../../README.md' }] }).expect(400);
    await request(service.app).post(`${route}/save`).send({ ...project, scenes: [{ ...project.scenes[0], image: `${'0'.repeat(32)}.png` }] }).expect(400);
    await request(service.app).get(`/files/${project.id}/project.json`).expect(400);
    expect((await readdir(path.join(dataDir, project.id))).filter(name => name.endsWith('.png'))).toHaveLength(1);
  });

  it('serializes simultaneous uploads without dropping scenes and blocks cross-origin writes', async () => {
    const project = await createWithImage();
    await Promise.all([0, 1].map(() => request(service.app).post(`/api/projects/${project.id}/upload`).send({ extension: 'png', content: image }).expect(200)));
    const { body } = await request(service.app).get('/api/projects');
    expect(body[0].scenes).toHaveLength(3);
    await request(service.app).post('/api/projects').set('Origin', 'https://unrelated.example').send({ title: 'no' }).expect(403);
  });

  it('reopens existing JSON drafts and marks an interrupted render as failed on restart', async () => {
    const project = await createWithImage();
    await writeFile(path.join(dataDir, project.id, 'project.json'), JSON.stringify({ ...project, status: 'rendering' }));
    const restarted = await createApp({ dataDir });
    const { body } = await request(restarted.app).get('/api/projects');
    expect(body[0]).toMatchObject({ ...project, status: 'failed', error: '服务已重启，请重新合成' });
  });
});
