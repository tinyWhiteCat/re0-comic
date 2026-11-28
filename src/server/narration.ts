import { open } from 'node:fs/promises';
import { maxSceneDuration, type Scene } from '../shared/project.js';

export type SpeechSynthesizer = (text: string) => Promise<Buffer>;
export const narrationSampleRate = 24_000;
const sampleBytes = 2;
const wavHeaderBytes = 44;

export function decodeNarrationPcm(data: string, service: string) {
  const pcm = Buffer.from(data, 'base64');
  if (!pcm.length || pcm.length % sampleBytes !== 0 || pcm.toString('base64') !== data) {
    throw new Error(`${service} 返回的 PCM 音频已损坏。`);
  }
  return pcm;
}

function wavHeader(dataBytes: number) {
  const header = Buffer.alloc(wavHeaderBytes);
  header.write('RIFF', 0);
  header.writeUInt32LE(dataBytes + 36, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(narrationSampleRate, 24);
  header.writeUInt32LE(narrationSampleRate * sampleBytes, 28);
  header.writeUInt16LE(sampleBytes, 32);
  header.writeUInt16LE(sampleBytes * 8, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataBytes, 40);
  return header;
}

export async function writeNarration(file: string, scenes: Scene[], synthesize: SpeechSynthesizer): Promise<Scene[]> {
  const output = await open(file, 'w');
  const updatedScenes: Scene[] = [];
  let dataBytes = 0;
  try {
    await output.writeFile(Buffer.alloc(wavHeaderBytes));
    for (const [index, scene] of scenes.entries()) {
      const pcm = scene.text ? await synthesize(scene.text).catch((error: unknown) => {
        const reason = error instanceof Error ? error.message : '配音服务请求失败。';
        throw new Error(`第 ${index + 1} 镜配音失败。${reason}`);
      }) : Buffer.alloc(0);
      const speechDuration = pcm.length / (narrationSampleRate * sampleBytes);
      if (speechDuration > maxSceneDuration) {
        throw new Error(`第 ${index + 1} 镜配音超过 ${maxSceneDuration} 秒，请缩短解说或拆成多个分镜。`);
      }
      const duration = speechDuration > scene.duration ? Math.ceil(speechDuration * 10) / 10 : scene.duration;
      const sceneBytes = Math.round(duration * narrationSampleRate) * sampleBytes;
      if (pcm.length) await output.writeFile(pcm);
      if (sceneBytes > pcm.length) await output.writeFile(Buffer.alloc(sceneBytes - pcm.length));
      dataBytes += sceneBytes;
      updatedScenes.push({ ...scene, duration });
    }
    const header = wavHeader(dataBytes);
    const { bytesWritten } = await output.write(header, 0, header.length, 0);
    if (bytesWritten !== header.length) throw new Error('无法写入配音文件头。');
    return updatedScenes;
  } finally {
    await output.close();
  }
}
