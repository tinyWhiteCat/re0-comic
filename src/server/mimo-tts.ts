import { z } from 'zod';
import { decodeNarrationPcm, type SpeechSynthesizer } from './narration.js';

const endpoint = 'https://api.xiaomimimo.com/v1/chat/completions';
const responseSchema = z.object({
  choices: z.array(z.object({
    finish_reason: z.literal('stop'),
    message: z.object({ audio: z.object({ data: z.string() }) }),
  })).min(1),
});

function requestError(status: number) {
  if (status === 429) return new Error('小米 MiMo 已达到请求或用量上限，请稍后重试。');
  if (status === 401 || status === 403) return new Error('小米 MiMo 鉴权失败，请检查 API 密钥。');
  if (status >= 500) return new Error('小米 MiMo 暂时不可用，请稍后重试。');
  return new Error(`小米 MiMo 请求失败（HTTP ${status}）。`);
}

export function createMimoSpeechSynthesizer(options: { apiKey: string; fetch?: typeof fetch }): SpeechSynthesizer {
  const { apiKey, fetch: request = globalThis.fetch } = options;
  return async text => {
    let response: Response;
    try {
      response = await request(endpoint, {
        method: 'POST',
        headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(120_000),
        body: JSON.stringify({
          model: 'mimo-v2.5-tts',
          messages: [{ role: 'assistant', content: text }],
          audio: { format: 'pcm16', voice: '冰糖' },
        }),
      });
    } catch {
      throw new Error('无法连接小米 MiMo，或请求已超时。');
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      throw requestError(response.status);
    }
    const payload = responseSchema.safeParse(await response.json().catch(() => null));
    if (!payload.success) throw new Error('小米 MiMo 未返回完整音频。');
    return decodeNarrationPcm(payload.data.choices[0].message.audio.data, '小米 MiMo');
  };
}
