import { z } from 'zod';
import { decodeNarrationPcm, narrationSampleRate, type SpeechSynthesizer } from './narration.js';

export const defaultGeminiTts = { model: 'gemini-3.8-flash-tts', voice: 'Leda' };

const endpoint = 'https://generativelanguage.googleapis.com/v1beta/interactions';
const interactionSchema = z.object({
  status: z.string(),
  steps: z.array(z.object({
    type: z.string(),
    content: z.array(z.object({
      type: z.string(),
      mime_type: z.string().optional(),
      data: z.string().optional(),
    })).optional(),
  })).optional(),
});

function requestError(status: number) {
  if (status === 429) return new Error('Gemini TTS 已达到请求或用量上限，请稍后重试。');
  if (status === 401 || status === 403) return new Error('Gemini TTS 鉴权失败，请检查 API 密钥和模型权限。');
  if (status >= 500) return new Error('Gemini TTS 暂时不可用，请稍后重试。');
  return new Error(`Gemini TTS 请求失败（HTTP ${status}），请检查 API 密钥、模型和音色配置。`);
}

export function createGeminiSpeechSynthesizer(options: {
  apiKey: string;
  model: string;
  fetch?: typeof fetch;
}): SpeechSynthesizer {
  const { apiKey, model, fetch: request = globalThis.fetch } = options;
  return async text => {
    let response: Response;
    try {
      response = await request(endpoint, {
        method: 'POST',
        headers: { 'x-goog-api-key': apiKey, 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model,
          store: false,
          input: [{ type: 'user_input', content: [{ type: 'text', text }] }],
          response_format: { type: 'audio', mime_type: 'audio/l16', sample_rate: narrationSampleRate },
          generation_config: { speech_config: [{ voice: defaultGeminiTts.voice }] },
        }),
      });
    } catch {
      throw new Error('无法连接 Gemini TTS 服务，或请求已超时。');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw requestError(response.status);
    }
    const payload = interactionSchema.safeParse(await response.json().catch(() => null));
    if (!payload.success || payload.data.status !== 'completed') throw new Error('Gemini TTS 未返回完整响应。');
    const audio = payload.data.steps?.filter(step => step.type === 'model_output')
      .flatMap(step => step.content ?? []).findLast(part => part.type === 'audio');
    if (!audio?.data || audio.mime_type?.split(';')[0].toLowerCase() !== 'audio/l16') {
      throw new Error('Gemini TTS 未返回约定的 PCM 音频。');
    }
    return decodeNarrationPcm(audio.data, 'Gemini TTS');
  };
}
