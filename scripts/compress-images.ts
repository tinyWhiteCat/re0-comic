import { execFile } from 'node:child_process';
import { constants } from 'node:fs';
import { copyFile, lstat, mkdir, mkdtemp, readdir, realpath, rename, rm, stat, chmod, readFile, writeFile } from 'node:fs/promises';
import { constants as zlibConstants, deflateSync, inflateSync } from 'node:zlib';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs, promisify } from 'node:util';

import { encodeLosslessWebp } from './lossless-webp.js';

const exec = promisify(execFile);
const supported = new Set(['.png', '.apng', '.jpg', '.jpeg']);
// PNG 只重压缩 IDAT；保留过滤后的像素字节及所有其他数据块（包括 APNG 帧）。
const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const crcTable = Array.from({ length: 256 }, (_, value) => {
  for (let bit = 0; bit < 8; bit++) value = (value >>> 1) ^ ((value & 1) ? 0xedb88320 : 0);
  return value >>> 0;
});
export function pngCrc(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 255];
  return (crc ^ 0xffffffff) >>> 0;
}
export function optimizePng(source: Buffer, level = 9): Buffer {
  if (!source.subarray(0, 8).equals(signature)) throw new Error('不是有效的 PNG 文件');
  const chunks: { type: string; bytes: Buffer; data: Buffer }[] = [];
  let offset = 8;
  let ended = false;
  let dataEnded = false;
  let sawData = false;
  while (offset < source.length) {
    if (ended || offset + 12 > source.length) throw new Error('PNG 数据块不完整或存在尾部数据');
    const length = source.readUInt32BE(offset);
    const end = offset + 12 + length;
    if (end > source.length) throw new Error('PNG 数据块长度无效');
    const type = source.toString('ascii', offset + 4, offset + 8);
    if (pngCrc(source.subarray(offset + 4, end - 4)) !== source.readUInt32BE(end - 4)) throw new Error('PNG CRC 校验失败');
    if (type === 'IDAT') {
      if (dataEnded) throw new Error('PNG IDAT 数据块不连续');
      sawData = true;
    } else if (sawData) dataEnded = true;
    chunks.push({ type, bytes: source.subarray(offset, end), data: source.subarray(offset + 8, end - 4) });
    ended = type === 'IEND';
    offset = end;
  }
  if (!ended || !sawData || chunks[0]?.type !== 'IHDR' || chunks[0].data.length !== 13) throw new Error('PNG 缺少必要的数据块');
  const compressed = Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data));
  const raw = inflateSync(compressed, { maxOutputLength: 512 * 1024 * 1024 });
  let best = compressed;
  for (const strategy of [zlibConstants.Z_DEFAULT_STRATEGY, zlibConstants.Z_FILTERED, zlibConstants.Z_RLE]) {
    const result = deflateSync(raw, { level, strategy });
    if (result.length < best.length) best = result;
  }
  if (!inflateSync(best, { maxOutputLength: 512 * 1024 * 1024 }).equals(raw)) throw new Error('PNG 无损校验失败');
  const idat = Buffer.alloc(best.length + 12);
  idat.writeUInt32BE(best.length, 0);
  idat.write('IDAT', 4, 'ascii');
  best.copy(idat, 8);
  idat.writeUInt32BE(pngCrc(idat.subarray(4, -4)), idat.length - 4);
  let inserted = false;
  const result = Buffer.concat([signature, ...chunks.flatMap(chunk => {
    if (chunk.type !== 'IDAT') return [chunk.bytes];
    if (inserted) return [];
    inserted = true;
    return [idat];
  })]);
  return result.length < source.length ? result : source;
}

export interface CompressionOptions {
  input: string;
  output?: string;
  inPlace?: boolean;
  dryRun?: boolean;
  level?: number;
  format?: 'original' | 'webp';
  effort?: number;
  jobs?: number;
  log?: (message: string) => void;
}

export async function compressImages(options: CompressionOptions) {
  const log = options.log ?? console.log;
  const level = options.level ?? 9;
  const webp = options.format === 'webp';
  const effort = options.effort ?? 4;
  const jobs = options.jobs ?? (webp ? 2 : 1);
  if (options.format && !['original', 'webp'].includes(options.format)) throw new Error('format 必须是 original 或 webp');
  if (!Number.isInteger(effort) || effort < 0 || effort > 6) throw new Error('effort 必须是 0–6 的整数');
  if (!Number.isInteger(jobs) || jobs < 1 || jobs > 8) throw new Error('jobs 必须是 1–8 的整数');
  if (webp && options.inPlace) throw new Error('WebP 转换不支持 --in-place，请使用独立输出目录以保留原图');
  if (!Number.isInteger(level) || level < 0 || level > 9) throw new Error('level 必须是 0–9 的整数');
  if (options.inPlace && options.output) throw new Error('--in-place 与 --output 不能同时使用');
  const input = await realpath(options.input);
  if (!(await stat(input)).isDirectory()) throw new Error('输入路径必须是目录');
  const files: string[] = [];
  const directories: string[] = [];
  let skipped = 0;
  async function walk(directory: string) {
    directories.push(path.relative(input, directory));
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(filename);
      else if (entry.isFile() && supported.has(path.extname(entry.name).toLowerCase())) files.push(filename);
      else skipped++;
    }
  }
  await walk(input); // 不跟随符号链接。
  files.sort();
  const webpName = (filename: string) => filename.slice(0, -path.extname(filename).length) + '.webp';
  if (webp) {
    const destinations = new Map<string, string>();
    for (const filename of files) {
      const relative = path.relative(input, filename);
      const destination = /\.(?:png|apng)$/i.test(filename) ? webpName(relative) : relative;
      const previous = destinations.get(destination);
      if (previous) throw new Error(`转换后文件名冲突：${previous} 和 ${relative} → ${destination}`);
      if (directories.includes(destination)) throw new Error(`转换后文件名与目录冲突：${relative} → ${destination}`);
      destinations.set(destination, relative);
    }
  }
  const engines = webp ? new Set(files.some(file => /\.(?:png|apng)$/i.test(file)) ? ['cwebp', 'dwebp'] : []) : new Set(files.filter(file => /\.jpe?g$/i.test(file)).map(() => 'jpegtran'));
  for (const engine of engines) {
    try {
      await exec(engine, ['-version']);
    } catch {
      throw new Error(`无法运行 ${engine}。macOS 可执行 brew install ${webp ? 'webp' : 'jpeg-turbo'}；其他系统请安装对应命令并加入 PATH。`);
    }
  }
  let output: string | undefined;
  if (!options.inPlace && !options.dryRun) {
    const requested = path.resolve(options.output ?? (webp ? 'data/source-webp' : 'data/source-compressed'));
    // 先解析父路径中的符号链接，防止输出落进输入树。
    async function canonical(filename: string): Promise<string> {
      try { return await realpath(filename); }
      catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
        return path.join(await canonical(path.dirname(filename)), path.basename(filename));
      }
    }
    output = await canonical(requested);
    const relative = path.relative(input, output);
    if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
      throw new Error('输出目录不能位于输入目录内；原地替换请使用 --in-place');
    }
    await mkdir(path.dirname(output), { recursive: true });
    await mkdir(output); // 拒绝复用已有输出目录，避免覆盖文件。
    for (const directory of directories) await mkdir(path.join(output, directory), { recursive: true });
  }
  const summary = { images: files.length, compressed: 0, unchanged: 0, failed: 0, skipped, before: 0, after: 0 };
  log(`发现 ${files.length} 张图片，跳过 ${skipped} 个非图片文件或符号链接。${options.dryRun ? '预览模式，不保存结果。' : ''}`);
  let completed = 0;
  async function processFile(filename: string) {
    const relative = path.relative(input, filename);
    let temporary: string | undefined;
    let originalSize = 0;
    try {
      const original = await lstat(filename);
      if (!original.isFile()) throw new Error('输入已不再是普通文件');
      originalSize = original.size;
      summary.before += originalSize;
      // 原地模式在同一目录准备结果，以便最后通过 rename 原子替换。
      temporary = await mkdtemp(path.join(options.inPlace && !options.dryRun ? path.dirname(filename) : tmpdir(), '.image-compress-'));
      const candidate = path.join(temporary, 'optimized');
      let retainedReason: string | undefined;
      if (webp) {
        if (/\.jpe?g$/i.test(filename)) retainedReason = 'JPEG 保留原文件，此模式仅转换静态 PNG';
        else retainedReason = await encodeLosslessWebp(filename, candidate, effort);
        if (retainedReason) await copyFile(filename, candidate);
      } else if (/\.jpe?g$/i.test(filename)) {
        await exec('jpegtran', ['-copy', 'all', '-optimize', '-outfile', candidate, filename]);
      } else {
        await writeFile(candidate, optimizePng(await readFile(filename), level));
      }
      const size = (await stat(candidate)).size;
      if (!size) throw new Error('压缩器输出为空');
      const smaller = size < originalSize;
      const latest = await lstat(filename);
      if (!latest.isFile() || latest.size !== original.size || latest.mtimeMs !== original.mtimeMs || latest.ino !== original.ino) {
        throw new Error('处理期间源文件发生变化，未保存结果');
      }
      if (!options.dryRun) {
        if (options.inPlace && smaller) {
          await chmod(candidate, original.mode);
          await rename(candidate, filename);
        } else if (output) {
          const destination = path.join(output, webp && smaller ? webpName(relative) : relative);
          await mkdir(path.dirname(destination), { recursive: true });
          await copyFile(smaller ? candidate : filename, destination, constants.COPYFILE_EXCL);
        }
      }
      summary.after += smaller ? size : originalSize;
      if (smaller) summary.compressed++; else summary.unchanged++;
      completed++;
      log(`[${completed}/${files.length}] ${relative}: ${originalSize} → ${smaller ? size : originalSize} 字节${smaller ? (webp ? '（WebP，像素校验通过）' : '') : `（${retainedReason ?? '保持原文件'}）`}`);
    } catch (error) {
      completed++;
      summary.failed++;
      summary.after += originalSize;
      log(`[失败] ${relative}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      if (temporary) await rm(temporary, { recursive: true, force: true });
    }
  }
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(jobs, files.length) }, async () => {
    while (next < files.length) await processFile(files[next++]);
  }));
  const saved = summary.before - summary.after;
  log(`${options.dryRun ? '预计' : '完成'}：缩小 ${summary.compressed}，不变 ${summary.unchanged}，失败 ${summary.failed}；节省 ${(saved / 1024 / 1024).toFixed(2)} MiB（${summary.before ? (saved / summary.before * 100).toFixed(2) : '0'}%）。`);
  if (output) log(`输出目录：${output}`);
  return summary;
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { output: { type: 'string' }, 'in-place': { type: 'boolean' }, 'dry-run': { type: 'boolean' }, level: { type: 'string' }, format: { type: 'string' }, effort: { type: 'string' }, jobs: { type: 'string' }, help: { type: 'boolean', short: 'h' } },
  });
  if (values.help) {
    console.log('用法：npm run compress:images -- [目录，默认 source] [--output 新目录 | --in-place] [--dry-run] [--level 0–9] [--format original|webp] [--effort 0–6] [--jobs 1–8]\nWebP 模式：静态 PNG 转无损 WebP，默认输出 data/source-webp；默认 effort=4、jobs=2，不支持原地替换。\n原格式模式支持 PNG/APNG/JPEG；默认输出到 data/source-compressed，输出目录必须不存在。--dry-run 实际压缩以估算收益，但不保存结果。');
    return;
  }
  if (positionals.length > 1) throw new Error('只能指定一个输入目录');
  if (values.format && !['original', 'webp'].includes(values.format)) throw new Error('format 必须是 original 或 webp');
  const summary = await compressImages({ input: positionals[0] ?? 'source', output: values.output, inPlace: values['in-place'], dryRun: values['dry-run'], level: values.level === undefined ? 9 : Number(values.level), format: values.format as 'original' | 'webp' | undefined, effort: values.effort === undefined ? undefined : Number(values.effort), jobs: values.jobs === undefined ? undefined : Number(values.jobs) });
  if (summary.failed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
}
