import { mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { run } from '../src/server/media.js';
import { createOpenAICameraPlanner } from '../src/server/openai-camera.js';
import type { Project } from '../src/shared/project.js';

const image = `${'a'.repeat(32)}.png`;
const audio = `${'b'.repeat(32)}.wav`;
const apiKey = 'only-the-server-has-this-key';
let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), 're0-camera-test-'));
  await run('ffmpeg', [
    '-v', 'error', '-f', 'lavfi', '-i', 'color=c=0x436285:s=960x640',
    '-frames:v', '1', '-threads', '1', path.join(directory, image),
  ]);
});
afterAll(async () => { await rm(directory, { force: true, recursive: true }); });

const project = (count: number): Project => ({
  id: 'c'.repeat(32), status: 'draft', title: '不必发送的项目标题', ratio: 'landscape', audio,
  scenes: Array.from({ length: count }, (_, index) => ({ image, duration: 3, text: `第 ${index + 1} 镜的原字幕。` })),
});
const shot = (index: number) => ({ index, camera: 'push_in', focusX: 0.35, focusY: 0.4, transition: 'cut' });
const output = (...shots: object[]) => Response.json({
  status: 'completed',
  output: [{ type: 'reasoning' }, { type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ shots }) }] }],
});

describe('OpenAI camera planner', () => {
  it('sends only bounded images and shot context, then joins batches by global index', async () => {
    const request = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(output(...Array.from({ length: 8 }, (_, index) => shot(index))))
      .mockResolvedValueOnce(output(shot(8), shot(9)));
    const plan = await createOpenAICameraPlanner({ apiKey, model: 'gpt-6.1-sol', fetch: request })(directory, project(10));
    expect(plan.shots).toEqual(Array.from({ length: 10 }, (_, index) => shot(index)));
    expect(request).toHaveBeenCalledTimes(2);

    const payloads = request.mock.calls.map(([url, init]) => {
      expect(url).toBe('https://api.openai.com/v1/responses');
      expect(init).toMatchObject({ method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, redirect: 'error' });
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      const body = String(init?.body);
      for (const privateValue of [apiKey, directory, image, audio, project(1).title, project(1).id]) {
        expect(body).not.toContain(privateValue);
      }
      return JSON.parse(body);
    });
    expect(payloads[0]).toMatchObject({
      model: 'gpt-6.1-sol', reasoning: { effort: 'max' }, store: false, max_output_tokens: 25_000,
      text: { format: { type: 'json_schema', name: 'camera_plan', strict: true, schema: { additionalProperties: false } } },
    });
    const firstContent = payloads[0].input[0].content;
    expect(firstContent).toHaveLength(19);
    expect(JSON.parse(firstContent[1].text)).toEqual({ index: 0, durationSeconds: 3, subtitle: '第 1 镜的原字幕。', contextOnly: false });
    expect(JSON.parse(firstContent[17].text)).toMatchObject({ index: 8, contextOnly: true });
    expect(JSON.parse(payloads[1].input[0].content[1].text)).toMatchObject({ index: 8, contextOnly: false });
    expect(firstContent[2]).toMatchObject({ type: 'input_image', detail: 'low' });

    const preview = path.join(directory, 'preview.jpg');
    const dataUrl: string = firstContent[2].image_url;
    expect(dataUrl).toMatch(/^data:image\/jpeg;base64,/);
    await writeFile(preview, Buffer.from(dataUrl.split(',')[1], 'base64'));
    const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=width,height', '-of', 'json', preview]);
    expect(JSON.parse(stdout).streams).toEqual([{ width: 512, height: 341 }]);
  });

  it.each([
    ['rate limit', () => new Response(apiKey, { status: 429 }), '达到请求限额'],
    ['refusal', () => Response.json({
      status: 'completed',
      output: [{ type: 'message', content: [{ type: 'refusal', refusal: apiKey }] }],
    }), '拒绝了这次运镜规划'],
    ['output token limit', () => Response.json({
      status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [],
    }), '达到运镜规划的 token 上限'],
    ['malformed plan', () => output({ index: 0, camera: apiKey }), '缺少字段或字段无效'],
    ['wrong index', () => output(shot(3)), '第 1 镜索引不符'],
  ])('reports %s without exposing upstream details', async (_name, reply, message) => {
    const request = vi.fn<typeof fetch>().mockResolvedValueOnce(reply());
    const error = await createOpenAICameraPlanner({ apiKey, model: 'gpt-5.4-mini', fetch: request })(directory, project(1)).catch(cause => cause);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain(message);
    expect((error as Error).message).not.toContain(apiKey);
  });

  it('declines to send a file referenced through a symlink', async () => {
    const linkedImage = `${'d'.repeat(32)}.png`;
    await symlink(path.join(directory, image), path.join(directory, linkedImage));
    const input = project(1);
    input.scenes[0].image = linkedImage;
    const request = vi.fn<typeof fetch>();
    await expect(createOpenAICameraPlanner({ apiKey, model: 'gpt-5.4-mini', fetch: request })(directory, input))
      .rejects.toThrow('第 1 镜无法生成规划缩略图');
    expect(request).not.toHaveBeenCalled();
  });
});
