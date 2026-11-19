import type { CameraPlan } from '../shared/camera.js';

type Shot = CameraPlan['shots'][number];
export type VideoSize = { width: number; height: number };
export type ShotTiming = { frames: number; fadeIn: number; fadeOut: number };
export const frameRate = 24;
const background = '0x12151c';

export function cameraTimings(plan: CameraPlan, durations: number[]): ShotTiming[] {
  if (plan.shots.length !== durations.length || plan.shots.some((shot, index) => shot.index !== index)) {
    throw new Error('运镜计划与分镜顺序不符');
  }

  let seconds = 0;
  let lastBoundary = 0;
  const timings = durations.map(duration => {
    seconds += duration;
    const boundary = Math.round(seconds * frameRate);
    const frames = boundary - lastBoundary;
    lastBoundary = boundary;
    return { frames, fadeIn: 0, fadeOut: 0 };
  });
  for (let index = 0; index < timings.length - 1; index++) {
    if (plan.shots[index].transition !== 'fade') continue;
    const current = timings[index];
    const next = timings[index + 1];
    const frames = Math.min(5, Math.floor(Math.min(current.frames, next.frames) / 4));
    current.fadeOut = frames;
    next.fadeIn = frames;
  }
  return timings;
}

export function fitImage({ width, height }: VideoSize) {
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2`;
}

function framing(shot: Shot, frames: number) {
  // Model output supplies only a bounded focal point and an allowlisted move.
  const focal = (value: number) => Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.5;
  const focusX = focal(shot.focusX);
  const focusY = focal(shot.focusY);
  const progress = `(on/${Math.max(1, frames - 1)})`;
  const ease = `(${progress}*${progress}*(3-2*${progress}))`;
  const zoom = 1.10;
  const centered = (dimension: 'iw' | 'ih', focus: number) =>
    `clip(${dimension}*${focus}-${dimension}/(2*zoom),0,${dimension}-${dimension}/zoom)`;

  if (shot.camera === 'pan_left' || shot.camera === 'pan_right') {
    const available = 1 - 1 / zoom;
    const travel = available * 0.72;
    const desiredLeft = focusX - 0.5 / zoom - travel / 2;
    const left = Math.min(available - travel, Math.max(0, desiredLeft));
    const fraction = shot.camera === 'pan_left' ? `1-${ease}` : ease;
    return { zoom: String(zoom), x: `iw*(${left}+${travel}*(${fraction}))`, y: centered('ih', focusY) };
  }
  const amount = shot.camera === 'pull_out' ? `(1-${ease})` : ease;
  return { zoom: `1+${zoom - 1}*${amount}`, x: centered('iw', focusX), y: centered('ih', focusY) };
}

function pad({ width, height }: VideoSize) {
  return `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=${background}`;
}

export function cameraFilter(shot: Shot, timing: ShotTiming, viewport: VideoSize, artwork?: VideoSize) {
  const filters = ['trim=end_frame=1'];
  if (shot.camera === 'hold') {
    filters.push(fitImage(viewport), pad(viewport));
    filters.push(`zoompan=z=1:x=0:y=0:d=${timing.frames}:s=${viewport.width}x${viewport.height}:fps=${frameRate}`);
  } else {
    if (!artwork) throw new Error('缺少运镜图片尺寸');
    const { zoom, x, y } = framing(shot, timing.frames);
    // Upsample once before cropping to avoid visible one-pixel jumps on slow moves.
    filters.push(`scale=${artwork.width * 2}:${artwork.height * 2}:flags=lanczos`, 'format=yuv444p');
    filters.push(`zoompan=z='${zoom}':x='${x}':y='${y}':d=${timing.frames}:s=${artwork.width}x${artwork.height}:fps=${frameRate}`);
    filters.push(pad(viewport));
  }
  if (timing.fadeIn) filters.push(`fade=t=in:s=0:n=${timing.fadeIn}:c=${background}`);
  if (timing.fadeOut) filters.push(`fade=t=out:s=${timing.frames - timing.fadeOut - 1}:n=${timing.fadeOut}:c=${background}`);
  filters.push('setsar=1');
  return filters.join(',');
}
