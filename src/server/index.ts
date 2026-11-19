import http from 'node:http';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createOpenAICameraPlanner } from './openai-camera.js';

try { loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url))); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 无效');
const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_CAMERA_MODEL?.trim() || 'gpt-6.1-sol';
if (apiKey && (process.env.HTTPS_PROXY || process.env.https_proxy)) http.setGlobalProxyFromEnv?.();
const { app } = await createApp({
  dataDir: process.env.DATA_DIR ?? fileURLToPath(new URL('../../data', import.meta.url)),
  webDir: fileURLToPath(new URL('../../dist', import.meta.url)),
  openai: apiKey ? { model, plan: createOpenAICameraPlanner({ apiKey, model }) } : undefined,
});
app.listen(port, '127.0.0.1', () => console.log(`RE:FRAME API listening on port ${port}`));
