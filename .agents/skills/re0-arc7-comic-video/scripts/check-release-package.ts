import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const covers = [
  { name: '封面_4x3.png', width: 1280, height: 960 },
  { name: '封面_16x9.png', width: 1280, height: 720 },
];
const copyName = '发布文案.txt';
const names = [...covers.map(cover => cover.name), copyName];
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

async function unzip(args: string[], failure: string, consume?: (data: Buffer) => void) {
  const child = spawn('unzip', args, {
    stdio: ['ignore', 'pipe', 'ignore'],
    env: { PATH: process.env.PATH, LC_ALL: 'C.UTF-8' },
  });
  const result = new Promise<number | null | NodeJS.ErrnoException>(resolve => {
    child.once('error', resolve);
    child.once('close', resolve);
  });
  try {
    for await (const bytes of child.stdout) consume?.(bytes);
  } catch (error) {
    child.kill();
    await result;
    throw error;
  }
  const status = await result;
  if (status instanceof Error && (status as NodeJS.ErrnoException).code === 'ENOENT') throw Error('未找到 unzip。');
  if (status !== 0) throw Error(failure);
}

async function list(args: string[], archive: string) {
  const decoder = new TextDecoder();
  let listing = '';
  await unzip(['-Z', ...args, archive], '无法读取 ZIP 目录。', bytes => {
    listing += decoder.decode(bytes, { stream: true });
  });
  return (listing + decoder.decode()).replace(/\r?\n$/, '').split(/\r?\n/);
}

async function checkCover(archive: string, cover: (typeof covers)[number]) {
  const header = Buffer.alloc(33);
  let length = 0;
  await unzip(['-p', '-P', '', archive, cover.name], '无法读取封面。', bytes => {
    length += bytes.copy(header, length, 0, header.length - length);
  });
  if (length !== header.length || !header.subarray(0, 8).equals(pngSignature) ||
    header.readUInt32BE(8) !== 13 || header.toString('ascii', 12, 16) !== 'IHDR') {
    throw Error(`${cover.name} 缺少有效的 PNG 文件头。`);
  }
  if (header.readUInt32BE(16) !== cover.width || header.readUInt32BE(20) !== cover.height) {
    throw Error(`${cover.name} 的尺寸应为 ${cover.width}×${cover.height}。`);
  }
}

async function checkCopy(archive: string) {
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let hasText = false;
  function decode(bytes?: Buffer) {
    try {
      if (decoder.decode(bytes, { stream: bytes !== undefined }).trim()) hasText = true;
    } catch {
      throw Error(`${copyName} 应使用 UTF-8 编码。`);
    }
  }
  await unzip(['-p', '-P', '', archive, copyName], '无法读取发布文案。', decode);
  decode();
  if (!hasText) throw Error(`${copyName} 不能为空。`);
}

export async function checkReleasePackage(file: string) {
  const archive = path.resolve(file);
  const entries = await list(['-1'], archive);
  if (entries.length !== names.length || names.some(name => !entries.includes(name))) {
    throw Error(`ZIP 根目录必须各有一份 ${names.join('、')}，请移除其他条目。`);
  }
  const types = (await list(['-l'], archive))
    .filter(line => /^[?a-z-]\S+\s/.test(line) && names.some(name => line.endsWith(` ${name}`)));
  // An unknown Unix file type is normal for ZIPs written with only permission bits.
  if (types.length !== names.length || types.some(line => !/^[?-]/.test(line))) {
    throw Error('发布包的三个条目必须是文件，不能是目录或链接。');
  }
  await unzip(['-tqq', '-P', '', archive], 'ZIP 完整性检查失败，请检查文件是否完整、可正常解压。');
  for (const cover of covers) await checkCover(archive, cover);
  await checkCopy(archive);
  return {
    passed: true,
    entries: names,
    checks: ['ZIP 条目与 CRC', 'PNG 文件头与尺寸', '非空 UTF-8 文案'],
    manualReview: ['B站与 YouTube 标题格式', '简介内容', '分平台 tags', '必要署名与许可'],
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === '--help') {
    console.log('用法：npx tsx .agents/skills/re0-arc7-comic-video/scripts/check-release-package.ts <发布包.zip>');
    if (args[0] !== '--help') process.exitCode = 1;
  } else {
    checkReleasePackage(args[0]).then(report => console.log(JSON.stringify(report, null, 2))).catch(error => {
      console.error(error instanceof Error ? error.message : '无法检查发布包。');
      process.exitCode = 1;
    });
  }
}
