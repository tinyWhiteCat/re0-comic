import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { PNG } from 'pngjs';

const exec = promisify(execFile);
const signature = Buffer.from('89504e470d0a1a0a', 'hex');

/** WebP is limited to 8-bit static images here. Unsupported images keep their original format. */
export async function encodeLosslessWebp(input: string, output: string, effort: number): Promise<string | undefined> {
  const source = await readFile(input);
  if (!source.subarray(0, 8).equals(signature) || source.length < 33) throw new Error('不是有效的 PNG 文件');
  const width = source.readUInt32BE(16);
  const height = source.readUInt32BE(20);
  if (source[24] === 16) return '16 位 PNG 保留原文件，避免降低色深';
  if (width > 16383 || height > 16383) return '尺寸超出 WebP 上限，保留原文件';
  if (width * height > 40_000_000) return '超过 4000 万像素，保留原文件';
  for (let offset = 8; offset < source.length;) {
    if (offset + 12 > source.length) throw new Error('PNG 数据块不完整');
    const end = offset + source.readUInt32BE(offset) + 12;
    if (end > source.length) throw new Error('PNG 数据块长度无效');
    if (source.toString('ascii', offset + 4, offset + 8) === 'acTL') return '动画 PNG 保留原文件，避免丢帧';
    offset = end;
  }
  const original = PNG.sync.read(source, { checkCRC: true });
  await exec('cwebp', ['-quiet', '-lossless', '-exact', '-m', String(effort), '-q', '75', '-metadata', 'all', input, '-o', output]);
  const decodedFile = `${output}.png`;
  await exec('dwebp', ['-quiet', output, '-o', decodedFile]);
  const decoded = PNG.sync.read(await readFile(decodedFile), { checkCRC: true });
  if (decoded.width !== original.width || decoded.height !== original.height || !decoded.data.equals(original.data)) {
    throw new Error('WebP 无损校验失败：尺寸或 RGBA 像素不一致');
  }
  return undefined;
}
