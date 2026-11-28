import http from 'node:http';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { createApp } from './app.js';
import { createGeminiSpeechSynthesizer, defaultGeminiTts } from './gemini-tts.js';
import { createMimoSpeechSynthesizer } from './mimo-tts.js';
import { createOpenAICameraPlanner } from './openai-camera.js';

// Prefer the process environment, including the existing Codex Cloud secret binding.
const injectedGeminiKey = process.env.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_EKY?.trim();
try { loadEnvFile(fileURLToPath(new URL('../../.env', import.meta.url))); }
catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
const port = Number(process.env.PORT ?? 8000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 无效');
const apiKey = process.env.OPENAI_API_KEY?.trim();
const model = process.env.OPENAI_CAMERA_MODEL?.trim() || 'gpt-6.1-sol';
const geminiKey = injectedGeminiKey || process.env.GEMINI_API_KEY?.trim();
const geminiModel = process.env.GEMINI_TTS_MODEL?.trim() || defaultGeminiTts.model;
const mimoKey = process.env.MIMO_API_KEY?.trim();
if ((apiKey || geminiKey || mimoKey) && (process.env.HTTPS_PROXY || process.env.https_proxy)) http.setGlobalProxyFromEnv?.();
const { app } = await createApp({
  dataDir: process.env.DATA_DIR ?? fileURLToPath(new URL('../../data', import.meta.url)),
  webDir: fileURLToPath(new URL('../../dist', import.meta.url)),
  openai: apiKey ? { model, plan: createOpenAICameraPlanner({ apiKey, model }) } : undefined,
  gemini: geminiKey ? {
    model: geminiModel,
    synthesize: createGeminiSpeechSynthesizer({ apiKey: geminiKey, model: geminiModel }),
  } : undefined,
  mimo: mimoKey ? createMimoSpeechSynthesizer({ apiKey: mimoKey }) : undefined,
});
app.listen(port, '127.0.0.1', () => console.log(`RE:FRAME API listening on port ${port}`));
