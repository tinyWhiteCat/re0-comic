import { test, expect } from 'vitest';
import request from 'supertest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../src/server/app';

test('production gallery URLs serve the app without exposing local data', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 're0-gallery-'));
  try {
    const webDir = path.join(root, 'dist');
    const dataDir = path.join(root, 'data');
    await mkdir(webDir);
    await writeFile(path.join(webDir, 'index.html'), '<html>Gallery application</html>');
    const { app } = await createApp({ dataDir, webDir });
    await writeFile(path.join(dataDir, 'private.txt'), 'private');
    for (const url of ['/gallery', '/gallery/']) {
      const response = await request(app).get(url);
      expect(response.status).toBe(200);
      expect(response.text).toContain('Gallery application');
    }
    expect((await request(app).get('/data/private.txt')).status).toBe(404);
    expect((await request(app).get('/api/unknown')).status).toBe(404);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
