import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { PNG } from 'pngjs';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { renderVideo, run } from '../src/server/media.js';
import type { CameraPlan } from '../src/shared/camera.js';
import type { Project } from '../src/shared/project.js';

let directory: string;
const filename = (id: number) => `${id.toString(16).padStart(32, '0')}.png`;
const project = (scenes: Project['scenes'], audio: Project['audio'] = null): Project => ({
  id: 'a'.repeat(32), title: '运镜测试', ratio: 'landscape', scenes, audio, status: 'draft',
});

beforeEach(async () => { directory = await mkdtemp(path.join(os.tmpdir(), 're0-camera-render-')); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

async function draw(id: number, color: [number, number, number], marker = false) {
  const image = new PNG({ width: 640, height: 480 });
  for (let y = 0; y < image.height; y++) {
    for (let x = 0; x < image.width; x++) {
      const offset = (y * image.width + x) * 4;
      const fill = marker && x >= 415 && x < 435 ? [245, 245, 245] : color;
      image.data.set([...fill, 255], offset);
    }
  }
  await writeFile(path.join(directory, filename(id)), PNG.sync.write(image));
}

async function readFrames(indices: number[]) {
  const select = indices.map(index => `eq(n\\,${index})`).join('+');
  await run('ffmpeg', ['-y', '-v', 'error', '-i', 'render.mp4', '-vf', `select=${select}`, '-fps_mode', 'vfr',
    '-threads', '1', 'qa-frame-%03d.png'], directory);
  return Promise.all(indices.map(async (_, index) =>
    PNG.sync.read(await readFile(path.join(directory, `qa-frame-${String(index + 1).padStart(3, '0')}.png`)))));
}

function sample(frame: PNG, x: number, y: number) {
  return Array.from(frame.data.subarray((y * frame.width + x) * 4, (y * frame.width + x) * 4 + 3));
}

function markerCenter(frame: PNG) {
  const bright = Array.from({ length: frame.width }, (_, x) => x)
    .filter(x => sample(frame, x, frame.height / 2).every(channel => channel > 210));
  expect(bright.length).toBeGreaterThan(10);
  return (bright[0] + bright.at(-1)!) / 2;
}

it('applies each camera move to the artwork while keeping the side margins fixed', async () => {
  await draw(1, [42, 95, 112], true);
  const cameras = ['hold', 'push_in', 'pull_out', 'pan_left', 'pan_right', 'push_in'] as const;
  const durations = [.53, .64, .54, .61, .73, .57];
  const scenes = durations.map(duration => ({ image: filename(1), text: '', duration }));
  const focus = [.5, .5, .5, .02, .98, .8];
  const plan: CameraPlan = { shots: cameras.map((camera, index) => ({ index, camera, focusX: focus[index], focusY: .47, transition: 'cut' })) };
  await renderVideo(directory, project(scenes), plan);

  let seconds = 0;
  const indices = durations.flatMap(duration => {
    const start = Math.round(seconds * 24);
    seconds += duration;
    return [start, Math.round(seconds * 24) - 1];
  });
  const frames = await readFrames(indices);
  expect(frames).toHaveLength(12);
  const changes = cameras.map((_, index) => markerCenter(frames[index * 2 + 1]) - markerCenter(frames[index * 2]));
  expect(Math.abs(changes[0])).toBeLessThan(1);
  expect(changes[1]).toBeGreaterThan(8);
  expect(changes[2]).toBeLessThan(-8);
  expect(changes[3]).toBeGreaterThan(40);
  expect(changes[4]).toBeLessThan(-40);
  expect(changes[5]).toBeLessThan(-20);
  for (const frame of frames) {
    // The 4:3 source remains centered at its fitted 960×720 size on the 1280×720 canvas.
    for (const x of [140, 1140]) expect(Math.max(...sample(frame, x, 360))).toBeLessThan(35);
    for (const x of [180, 1100]) expect(sample(frame, x, 360)[2]).toBeGreaterThan(80);
  }
}, 60_000);

it('fades only the requested scene boundary without moving the subtitles or shortening the narration', async () => {
  await Promise.all([draw(1, [235, 22, 22]), draw(2, [22, 220, 22]), draw(3, [22, 22, 240])]);
  const audio = `${'b'.repeat(32)}.wav`;
  await run('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=0.3', audio], directory);
  const scenes = [.51, .54, .52].map((duration, index) => ({ image: filename(index + 1), text: `台词${index + 1}`, duration }));
  const plan: CameraPlan = { shots: scenes.map((_, index) => ({
    index, camera: 'hold', focusX: .5, focusY: .5, transition: index === 1 ? 'cut' : 'fade',
  })) };
  await renderVideo(directory, project(scenes, audio), plan);
  const frames = await readFrames([0, 11, 12, 16, 24, 25, 37]);
  const center = frames.map(frame => sample(frame, 640, 360));
  expect(center[0][0]).toBeGreaterThan(190);
  expect(Math.max(...center[1])).toBeLessThan(40);
  expect(Math.max(...center[2])).toBeLessThan(40);
  expect(center[3][1]).toBeGreaterThan(170);
  expect(center[4][1]).toBeGreaterThan(170);
  expect(center[5][2]).toBeGreaterThan(195);
  expect(center[6][2]).toBeGreaterThan(195);

  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'stream=codec_type,nb_frames,duration,r_frame_rate',
    '-of', 'json', 'render.mp4'], directory);
  const { streams } = JSON.parse(stdout);
  expect(streams[0]).toMatchObject({ codec_type: 'video', nb_frames: '38', r_frame_rate: '24/1' });
  expect(streams[1].codec_type).toBe('audio');
  expect(Number(streams[1].duration)).toBeCloseTo(1.57, 1);
  const subtitles = await readFile(path.join(directory, 'subtitles.srt'), 'utf8');
  expect(subtitles).toContain('00:00:00,510 --> 00:00:01,050\n台词2');
  expect(subtitles).toContain('00:00:01,050 --> 00:00:01,570\n台词3');
}, 60_000);
