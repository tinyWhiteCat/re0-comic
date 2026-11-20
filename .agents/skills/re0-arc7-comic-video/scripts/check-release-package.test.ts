import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { checkReleasePackage } from './check-release-package.js';

const cli = fileURLToPath(new URL('./check-release-package.ts', import.meta.url));
const files = ['封面_4x3.png', '封面_16x9.png', '发布文案.txt'];
const draftContent = '私密测试文案';
const directories: string[] = [];
const makePng = (width: number, height: number) => PNG.sync.write(new PNG({ width, height }));
const cover43 = makePng(1280, 960);
const cover169 = makePng(1280, 720);

afterEach(() => {
  for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 're0-release-package-'));
  directories.push(dir);
  const archive = path.join(dir, '发布素材.zip');
  const write = (name: string, data: string | Buffer) => writeFileSync(path.join(dir, name), data);
  write(files[0], cover43);
  write(files[1], cover169);
  write(files[2], draftContent);
  const zip = (entries = files) => {
    const result = spawnSync('zip', ['-q', '-0', archive, ...entries], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    return archive;
  };
  return { archive, dir, write, zip };
}

test('checks a complete three-entry ZIP and prints the check scope without exposing copy', async () => {
  const f = setup();
  const archive = f.zip([files[2], files[0], files[1]]);
  const result = spawnSync(process.execPath, ['--import', 'tsx', cli, archive], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(draftContent));
  const report = JSON.parse(result.stdout);
  assert.deepEqual(report.entries, files);
  assert.equal(report.passed, true);
  assert.ok(report.manualReview.some((item: string) => item.includes('tags')));
});

test('rejects an otherwise valid package that includes the internal Section 13 files', async () => {
  const f = setup();
  const extras = ['cover-4x3.jpg', 'subtitles.ass', 'narration.txt', 'manifest.json'];
  for (const name of extras) f.write(name, 'internal');
  await assert.rejects(checkReleasePackage(f.zip([...files, ...extras])), /移除其他条目/);
});

test('rejects missing entries, root directories and duplicate names', async () => {
  const missing = setup();
  await assert.rejects(checkReleasePackage(missing.zip(files.slice(0, 2))), /必须各有一份/);

  const directory = setup();
  rmSync(path.join(directory.dir, files[0]));
  mkdirSync(path.join(directory.dir, files[0]));
  await assert.rejects(checkReleasePackage(directory.zip()), /必须各有一份/);

  const duplicate = setup();
  const alias = '发布复件.txt';
  duplicate.write(alias, '另一个条目');
  const archive = duplicate.zip([...files, alias]);
  const bytes = readFileSync(archive);
  const aliasBytes = Buffer.from(alias);
  const expectedBytes = Buffer.from(files[2]);
  assert.equal(aliasBytes.length, expectedBytes.length);
  const local = bytes.indexOf(aliasBytes);
  const central = bytes.indexOf(aliasBytes, local + aliasBytes.length);
  assert.ok(local >= 0 && central > local);
  expectedBytes.copy(bytes, local);
  expectedBytes.copy(bytes, central);
  writeFileSync(archive, bytes);
  await assert.rejects(checkReleasePackage(archive), /必须各有一份/);
});

test('rejects truncated archives and changed bytes with an intact ZIP directory', async () => {
  const truncated = setup();
  const incomplete = truncated.zip();
  writeFileSync(incomplete, readFileSync(incomplete).subarray(0, -22));
  await assert.rejects(checkReleasePackage(incomplete), /ZIP/);

  const damaged = setup();
  const archive = damaged.zip();
  const bytes = readFileSync(archive);
  const offset = bytes.indexOf(Buffer.from(draftContent));
  assert.ok(offset >= 0);
  bytes[offset] ^= 1;
  writeFileSync(archive, bytes);
  await assert.rejects(checkReleasePackage(archive), /ZIP 完整性检查失败/);
});

test('rejects an incorrect cover format or dimensions', async () => {
  const format = setup();
  format.write(files[0], '不是图片');
  await assert.rejects(checkReleasePackage(format.zip()), /PNG 文件头/);

  const dimensions = setup();
  dimensions.write(files[1], cover43);
  await assert.rejects(checkReleasePackage(dimensions.zip()), /1280×720/);
});

test('rejects blank copy and incomplete UTF-8 without exposing the copy', async () => {
  const blank = setup();
  blank.write(files[2], '\uFEFF \t\n');
  await assert.rejects(checkReleasePackage(blank.zip()), /不能为空/);

  const invalid = setup();
  invalid.write(files[2], Buffer.concat([Buffer.from(draftContent), Buffer.from([0xe4, 0xb8])]));
  await assert.rejects(checkReleasePackage(invalid.zip()), { message: '发布文案.txt 应使用 UTF-8 编码。' });
});
