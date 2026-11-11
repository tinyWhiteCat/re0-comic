import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const cli = fileURLToPath(new URL('./production-state.ts', import.meta.url));
const dirs: string[] = [];
afterEach(() => { for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true }); });
function fixture() {
  const dir = mkdtempSync(path.join(tmpdir(), 're0-state-')); dirs.push(dir);
  const stateFile = path.join(dir, 'state.json');
  const run = (...args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', cli, args[0], stateFile, ...args.slice(1)], { encoding: 'utf8' });
  assert.equal(run('init').status, 0);
  const state = JSON.parse(readFileSync(stateFile, 'utf8')); state.episode = 'test-episode';
  for (const [stage, step] of Object.entries(state.stages) as Array<[string, {inputs: string[]; outputs: string[]}]>) {
    step.inputs = [stage + '.in']; step.outputs = [stage + '.out'];
    for (const file of [...step.inputs, ...step.outputs]) writeFileSync(path.join(dir, file), file);
  }
  writeFileSync(stateFile, JSON.stringify(state));
  const configure = (stage: string, command: string[]) => { const j = JSON.parse(readFileSync(stateFile, 'utf8')); j.stages[stage].command = command; writeFileSync(stateFile, JSON.stringify(j)); };
  const freeze = (stage: string, overrides: Record<string, unknown> = {}) => {
    const current = JSON.parse(readFileSync(stateFile, 'utf8')).stages[stage];
    const report = { episode: 'test-episode', stage, passed: true, unresolvedIssues: [], userApproved: true, approvalReference: 'user-message-id', parametersChecked: true, pronunciationChecked: true, actualListening: false,
      files: Object.fromEntries([...current.inputs, ...current.outputs].map((file: string) => [file, createHash('sha256').update(readFileSync(path.join(dir, file))).digest('hex')])), ...overrides };
    writeFileSync(path.join(dir, stage + '.review.json'), JSON.stringify(report));
    return run('freeze', stage, stage + '.review.json');
  };
  const throughRender = () => { for (const s of ['storyboard', 'voice', 'alignment', 'visuals', 'sound', 'render']) assert.equal(freeze(s).status, 0, s); };
  return { dir, stateFile, run, freeze, throughRender, configure };
}
test('cannot execute rendering before reviewed voice; failed dependency never runs command', () => {
  const f = fixture(); assert.equal(f.freeze('storyboard').status, 0);
  const marker = path.join(f.dir, 'executed');
  const result = f.run('run', 'render', '--', process.execPath, '-e', `require('fs').writeFileSync(${JSON.stringify(marker)},'bad')`);
  assert.equal(result.status, 1); assert.equal(existsSync(marker), false);
});
test('approval, unresolved issues, stage identity and exact evidence hashes are required', () => {
  const f = fixture(); assert.equal(f.freeze('storyboard', { userApproved: false }).status, 1);
  assert.equal(f.freeze('storyboard').status, 0);
  assert.equal(f.freeze('voice', { unresolvedIssues: ['unclear first word'] }).status, 1);
  assert.equal(f.freeze('voice', { files: {} }).status, 1);
  assert.equal(f.freeze('voice', { stage: 'alignment' }).status, 1);
  assert.equal(f.freeze('voice').status, 0);
});
test('voice edits invalidate downstream even after refreeze; independent covers remain valid', () => {
  const f = fixture(); f.throughRender(); assert.equal(f.freeze('covers').status, 0);
  writeFileSync(path.join(f.dir, 'voice.out'), 'new audio');
  assert.equal(f.run('check', 'render').status, 2);
  assert.equal(f.freeze('voice').status, 0);
  assert.equal(f.run('check', 'render').status, 2);
  assert.equal(f.run('check', 'covers').status, 0);
});
test('unapproved covers do not block render but do block complete packaging', () => {
  const f = fixture(); f.throughRender(); assert.equal(f.run('check', 'render').status, 0);
  assert.equal(f.freeze('review').status, 0);
  assert.equal(f.freeze('package').status, 1);
  assert.equal(f.freeze('covers').status, 0); assert.equal(f.freeze('package').status, 0);
});
test('successful execution is not a quality freeze; valid frozen stage is skipped', () => {
  const f = fixture(); assert.equal(f.freeze('storyboard').status, 0);
  const marker = path.join(f.dir, 'runs');
  const args = [process.execPath, '-e', `require('fs').appendFileSync(${JSON.stringify(marker)},'x')`];
  f.configure('voice', args);
  assert.equal(f.run('run', 'voice', '--', ...args).status, 0);
  assert.equal(f.run('check', 'voice').status, 2);
  assert.equal(f.freeze('voice').status, 0);
  const result = f.run('run', 'voice', '--', ...args);
  assert.equal(result.status, 0); assert.match(result.stdout, /"skipped":true/); assert.equal(readFileSync(marker, 'utf8'), 'x');
  f.configure('voice', [process.execPath, '-e', 'process.exit(99)']);
  assert.equal(f.run('check', 'voice').status, 2);
  assert.equal(f.run('run', 'voice', '--', process.execPath, '-e', 'process.exit(99)').status, 1);
});
test('changed evidence, missing assets and reinitialization cannot silently pass', () => {
  const f = fixture(); assert.equal(f.freeze('storyboard').status, 0);
  writeFileSync(path.join(f.dir, 'storyboard.review.json'), '{}');
  assert.equal(f.run('check', 'storyboard').status, 2);
  assert.equal(f.freeze('storyboard').status, 0);
  rmSync(path.join(f.dir, 'storyboard.out'));
  assert.equal(f.run('check', 'storyboard').status, 2);
  assert.equal(f.run('init').status, 1);
});
