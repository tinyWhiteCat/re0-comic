import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Project } from '../shared/project.js';
import type { CameraPlan } from '../shared/camera.js';
import { cameraFilter, cameraTimings, fitImage, frameRate, type VideoSize } from './camera-render.js';

const exec = promisify(execFile);
export async function run(command: string, args: string[], cwd?: string) {
  try {
    return await exec(command, args, { cwd, timeout: 1_800_000, maxBuffer: 4 * 1024 * 1024 });
  } catch (error) {
    const result = error as Error & { stderr?: string };
    throw new Error(result.stderr?.slice(-2500) || result.message);
  }
}

export async function validateMedia(file: string, isImage: boolean) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-of', 'json', file,
  ], { timeout: 20_000, maxBuffer: 1024 * 1024 });
  const probe = JSON.parse(stdout) as {
    streams: Array<{ codec_type: string; width?: number; height?: number }>;
  };
  if (!probe.streams.some(stream => stream.codec_type === (isImage ? 'video' : 'audio'))) {
    throw new Error('文件内容与格式不符');
  }
  if (isImage) {
    const stream = probe.streams.find(stream => stream.codec_type === 'video')!;
    if (!stream.width || !stream.height || stream.width * stream.height > 40_000_000) {
      throw new Error('图片尺寸无效或超过 4000 万像素');
    }
    await exec('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-frames:v', '1', '-f', 'null', '-'], {
      timeout: 20_000, maxBuffer: 1024 * 1024,
    });
  }
}

export function timestamp(seconds: number) {
  const ms = Math.round(seconds * 1000);
  const pad = (value: number, digits = 2) => String(value).padStart(digits, '0');
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}

async function fittedFrame(directory: string, image: string, viewport: VideoSize): Promise<VideoSize> {
  // This probe measures the displayed image after FFmpeg's automatic rotation.
  const { stderr } = await run('ffmpeg', [
    '-v', 'info', '-threads', '2', '-i', image,
    '-vf', `${fitImage(viewport)},showinfo`, '-frames:v', '1', '-f', 'null', '-',
  ], directory);
  const size = /\[Parsed_showinfo_.*?\bs:(\d+)x(\d+)\b/.exec(stderr);
  if (!size) throw new Error('无法读取分镜图片的实际画幅');
  return { width: Number(size[1]), height: Number(size[2]) };
}

export async function renderVideo(directory: string, project: Project, plan?: CameraPlan) {
  const [width, height] = project.ratio === 'portrait' ? [720, 1280] : [1280, 720];
  const viewport = { width, height };
  const timings = plan && cameraTimings(plan, project.scenes.map(scene => scene.duration));
  const artworkSizes = new Map<string, VideoSize>();
  const subtitles: string[] = [];
  let cursor = 0;
  for (const [index, scene] of project.scenes.entries()) {
    if (scene.text) {
      const text = scene.text.replace(/<[^>]*>|\{[^}]*\}/g, '').replaceAll('\\', '／');
      const characters = Array.from(text);
      const lines: string[] = [];
      for (let i = 0; i < characters.length; i += 22) lines.push(characters.slice(i, i + 22).join(''));
      subtitles.push(`${subtitles.length + 1}\n${timestamp(cursor)} --> ${timestamp(cursor + scene.duration)}\n${lines.join('\n')}\n`);
    }
    cursor += scene.duration;
    const shot = plan?.shots[index];
    const timing = timings?.[index];
    const clip = ['-y', '-v', 'error', '-threads', '2'];
    if (shot && timing) {
      let artwork = artworkSizes.get(scene.image);
      if (shot.camera !== 'hold' && !artwork) {
        artwork = await fittedFrame(directory, scene.image, viewport);
        artworkSizes.set(scene.image, artwork);
      }
      clip.push('-i', scene.image, '-frames:v', String(timing.frames), '-vf', cameraFilter(shot, timing, viewport, artwork));
    } else {
      clip.push('-loop', '1', '-i', scene.image, '-t', String(scene.duration), '-vf',
        `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=0x12151c,setsar=1`);
    }
    clip.push('-r', String(frameRate), '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-pix_fmt', 'yuv420p', `clip-${index}.mp4`);
    await run('ffmpeg', clip, directory);
  }
  await writeFile(path.join(directory, 'subtitles.srt'), subtitles.join('\n'), 'utf8');
  await writeFile(path.join(directory, 'concat.txt'), project.scenes.map((_, i) => `file 'clip-${i}.mp4'\n`).join(''));
  const args = ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', 'concat.txt'];
  if (project.audio) args.push('-i', project.audio, '-map', '0:v:0', '-map', '1:a:0', '-af', 'apad', '-c:a', 'aac');
  if (subtitles.length) args.push('-vf', "subtitles=subtitles.srt:force_style='FontName=Noto Sans CJK SC,FontSize=22,Outline=2,MarginV=30'");
  if (plan) args.push('-r', String(frameRate));
  args.push('-t', String(cursor), '-c:v', 'libx264', '-threads', '2', '-preset', 'fast', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', 'render.mp4');
  await run('ffmpeg', args, directory);
}
