import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PNG } from 'pngjs';
import { deflateSync, inflateSync } from 'node:zlib';
import { afterEach, describe, expect, it } from 'vitest';
import { compressImages, optimizePng, pngCrc } from '../scripts/compress-images';

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
function chunk(type: string, data: Buffer) {
  const result = Buffer.alloc(data.length + 12);
  result.writeUInt32BE(data.length);
  result.write(type, 4);
  data.copy(result, 8);
  result.writeUInt32BE(pngCrc(result.subarray(4, -4)), result.length - 4);
  return result;
}
function fixture() {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(64); header.writeUInt32BE(64, 4); header[8] = 8; header[9] = 6;
  // RGBA，包括透明像素中的非零颜色值；每行使用 None 过滤。
  const raw = Buffer.alloc(64 * (1 + 64 * 4));
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const offset = y * 257 + 1 + x * 4;
    raw[offset] = 137; raw[offset + 1] = x; raw[offset + 2] = y; raw[offset + 3] = x % 2 ? 255 : 0;
  }
  const metadata = chunk('tEXt', Buffer.from('Comment\0keep me'));
  const compressed = deflateSync(raw, { level: 0 });
  return { raw, metadata, png: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', header), metadata, chunk('IDAT', compressed.subarray(0, 30)), chunk('IDAT', compressed.subarray(30)), chunk('IEND', Buffer.alloc(0))]) };
}
async function setup() {
  const root = await mkdtemp(path.join(tmpdir(), 're0-compress-test-')); roots.push(root);
  const input = path.join(root, 'input'); await mkdir(path.join(input, '中文 空格'), { recursive: true });
  const filename = path.join(input, '中文 空格', 'page.PNG');
  const { png } = fixture(); await writeFile(filename, png);
  return { root, input, filename, png, output: path.join(root, 'output'), log: () => {} };
}
describe('lossless image compression', () => {
  it('keeps exact filtered pixel bytes, transparent colors and metadata', () => {
    const { png, raw, metadata } = fixture(); const result = optimizePng(png);
    expect(result.length).toBeLessThan(png.length); expect(result.includes(metadata)).toBe(true);
    const idat = result.indexOf(Buffer.from('IDAT'));
    expect(inflateSync(result.subarray(idat + 4, idat + 4 + result.readUInt32BE(idat - 4)))).toEqual(raw);
    expect(optimizePng(result).length).toBeLessThanOrEqual(result.length);
  });
  it('rejects corrupt chunks instead of repairing silently', () => {
    const { png } = fixture(); png[20] ^= 1;
    expect(() => optimizePng(png)).toThrow('CRC');
    expect(() => optimizePng(Buffer.from('not png'))).toThrow('PNG');
  });
  it('preserves source, nested names and skips documents and symlinks', async () => {
    const options = await setup(); await writeFile(path.join(options.input, 'novel.md'), 'text');
    await mkdir(path.join(options.input, 'empty', 'nested'), { recursive: true });
    await symlink(options.filename, path.join(options.input, 'link.png'));
    const summary = await compressImages(options);
    expect(summary).toMatchObject({ images: 1, compressed: 1, skipped: 2, failed: 0 });
    expect(await readdir(path.join(options.output, 'empty', 'nested'))).toEqual([]);
    expect(await readFile(options.filename)).toEqual(options.png);
    expect((await readFile(path.join(options.output, '中文 空格', 'page.PNG'))).length).toBeLessThan(options.png.length);
    await expect(compressImages(options)).rejects.toThrow();
  });
  it('dry run measures savings without creating output or changing source', async () => {
    const options = await setup(); const summary = await compressImages({ ...options, dryRun: true });
    expect(summary.compressed).toBe(1); expect(await readFile(options.filename)).toEqual(options.png);
    expect(await readdir(options.root)).toEqual(['input']);
  });
  it('replaces in place and leaves no temporary files', async () => {
    const { output: _output, ...options } = await setup();
    const summary = await compressImages({ ...options, inPlace: true });
    expect(summary.compressed).toBe(1);
    expect((await readFile(options.filename)).length).toBeLessThan(options.png.length);
    expect(await readdir(path.dirname(options.filename))).toEqual(['page.PNG']);
  });
  it('continues after a corrupt image, preserving its source', async () => {
    const options = await setup(); const bad = path.join(options.input, 'bad.png'); await writeFile(bad, 'broken');
    expect(await compressImages(options)).toMatchObject({ images: 2, compressed: 1, failed: 1 });
    expect(await readFile(bad, 'utf8')).toBe('broken');
  });
  it('rejects nested output, including through a symbolic link, and conflicting options', async () => {
    const options = await setup();
    await expect(compressImages({ ...options, output: path.join(options.input, 'output') })).rejects.toThrow('输出目录');
    await symlink(options.input, path.join(options.root, 'alias'));
    await expect(compressImages({ ...options, output: path.join(options.root, 'alias', 'out') })).rejects.toThrow('输出目录');
    await expect(compressImages({ ...options, inPlace: true })).rejects.toThrow('不能同时');
  });
});

// These integration tests require cwebp and dwebp (brew install webp / apt install webp).
describe('lossless WebP conversion', () => {
  it('preserves RGBA including hidden colors, nested names, and original files', async () => {
    const options = await setup();
    const summary = await compressImages({ ...options, format: 'webp', jobs: 2 });
    expect(summary).toMatchObject({ compressed: 1, failed: 0 });
    const output = path.join(options.output, '中文 空格', 'page.webp');
    const decoded = path.join(options.root, 'decoded.png');
    execFileSync('dwebp', ['-quiet', output, '-o', decoded]);
    expect(PNG.sync.read(await readFile(decoded)).data).toEqual(PNG.sync.read(options.png).data);
    expect(await readFile(options.filename)).toEqual(options.png);
    expect((await readFile(output)).length).toBeLessThan(options.png.length);
  });
  it('measures WebP savings in dry run without creating output', async () => {
    const options = await setup();
    expect(await compressImages({ ...options, format: 'webp', dryRun: true })).toMatchObject({ compressed: 1, failed: 0 });
    expect(await readdir(options.root)).toEqual(['input']);
    expect(await readFile(options.filename)).toEqual(options.png);
  });
  it('retains 16-bit PNG and APNG instead of reducing depth or losing frames', async () => {
    const options = await setup();
    const header = Buffer.alloc(13); header.writeUInt32BE(1); header.writeUInt32BE(1, 4); header[8] = 16; header[9] = 6;
    const png16 = Buffer.concat([options.png.subarray(0, 8), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.alloc(9))), chunk('IEND', Buffer.alloc(0))]);
    await writeFile(options.filename, png16);
    const animated = Buffer.concat([options.png.subarray(0, 33), chunk('acTL', Buffer.from([0,0,0,2,0,0,0,0])), options.png.subarray(33)]);
    await writeFile(path.join(options.input, 'animation.png'), animated);
    expect(await compressImages({ ...options, format: 'webp' })).toMatchObject({ unchanged: 2, failed: 0 });
    expect(await readFile(path.join(options.output, '中文 空格', 'page.PNG'))).toEqual(png16);
    expect(await readFile(path.join(options.output, 'animation.png'))).toEqual(animated);
  });
  it('processes siblings concurrently without colliding and continues on a corrupt PNG', async () => {
    const options = await setup();
    await writeFile(path.join(options.input, 'page.png'), options.png);
    await writeFile(path.join(options.input, 'other.apng'), options.png);
    await writeFile(path.join(options.input, 'bad.png'), 'broken');
    expect(await compressImages({ ...options, format: 'webp', jobs: 3 })).toMatchObject({ compressed: 3, failed: 1 });
    expect(await readdir(options.output)).toEqual(['other.webp', 'page.webp', '中文 空格']);
  });
  it('rejects conflicting converted names before creating output', async () => {
    const options = await setup();
    await writeFile(path.join(options.input, '中文 空格', 'page.apng'), options.png);
    await expect(compressImages({ ...options, format: 'webp' })).rejects.toThrow('文件名冲突');
    expect(await readdir(options.root)).toEqual(['input']);
  });
  it('rejects converted names that conflict with source directories', async () => {
    const options = await setup();
    await mkdir(path.join(options.input, '中文 空格', 'page.webp'));
    await expect(compressImages({ ...options, format: 'webp' })).rejects.toThrow('与目录冲突');
    expect(await readdir(options.root)).toEqual(['input']);
  });
  it('keeps the original PNG bytes when WebP would be larger', async () => {
    const options = await setup();
    const image = new PNG({ width: 16, height: 16 });
    let seed = 1234567;
    for (let i = 0; i < image.data.length; i++) {
      seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
      image.data[i] = seed & 255;
    }
    const original = PNG.sync.write(image);
    await writeFile(options.filename, original);
    expect(await compressImages({ ...options, format: 'webp' })).toMatchObject({ compressed: 0, unchanged: 1, failed: 0 });
    expect(await readFile(path.join(options.output, '中文 空格', 'page.PNG'))).toEqual(original);
    expect(await readdir(path.join(options.output, '中文 空格'))).toEqual(['page.PNG']);
  });
  it('rejects in-place WebP, invalid effort and invalid concurrency before writing', async () => {
    const options = await setup();
    await expect(compressImages({ ...options, format: 'webp', inPlace: true })).rejects.toThrow('不支持');
    await expect(compressImages({ ...options, format: 'webp', effort: 7 })).rejects.toThrow('effort');
    await expect(compressImages({ ...options, format: 'webp', jobs: 0 })).rejects.toThrow('jobs');
    expect(await readdir(options.root)).toEqual(['input']);
  });
});
