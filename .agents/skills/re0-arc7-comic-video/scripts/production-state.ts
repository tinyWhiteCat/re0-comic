import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const dependencies = {
  storyboard: [], voice: ['storyboard'], alignment: ['voice'],
  visuals: ['alignment'], sound: ['alignment'], render: ['visuals', 'sound'],
  review: ['render'], covers: ['storyboard'], package: ['review', 'covers'], delivery: ['package'],
} satisfies Record<string, string[]>;
type Stage = keyof typeof dependencies;
type Snapshot = { inputs: Record<string, string>; outputs: Record<string, string>; evidence: string; evidenceHash: string; dependencies: Record<string, string>; frozenAt: string; command?: string[] };
type Step = { inputs: string[]; outputs: string[]; command?: string[]; frozen?: Snapshot };
type State = { version: 1; episode: string; stages: Record<Stage, Step> };
const digest = (s: string) => createHash('sha256').update(s).digest('hex');
const stages = Object.keys(dependencies) as Stage[];
const [command, filename, target, ...rest] = process.argv.slice(2);
if (!command || command === '--help') {
  console.log('Usage: production-state.ts init STATE | check STATE [STAGE] | freeze STATE STAGE EVIDENCE | run STATE STAGE -- COMMAND [ARGS...]\nPaths in state/evidence are relative to STATE. run checks prerequisites and skips valid frozen stages; successful commands still need reviewed evidence and freeze.');
  process.exit(0);
}
const main = async () => {
  if (!filename) throw Error('State path required');
  const stateFile = path.resolve(filename), directory = path.dirname(stateFile);
  const local = (file: string) => path.resolve(directory, file);
  const hashes = new Map<string, Promise<string>>();
  const hash = (file: string) => {
    const absolute = local(file);
    if (!hashes.has(absolute)) hashes.set(absolute, (async () => {
      const h = createHash('sha256'); for await (const chunk of createReadStream(absolute)) h.update(chunk); return h.digest('hex');
    })());
    return hashes.get(absolute)!;
  };
  const save = async (state: State, previous?: string) => {
    await mkdir(directory, { recursive: true });
    const lock = stateFile + '.lock';
    await mkdir(lock); // A concurrent writer must retry after rereading the state.
    try {
      let current: string | undefined;
      try { current = await readFile(stateFile, 'utf8'); } catch (e) { if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e; }
      if (current !== previous) throw Error('State changed; reread before saving');
      const tmp = stateFile + `.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(state, null, 2) + '\n'); await rename(tmp, stateFile);
    } finally { await rm(lock, { recursive: true }); }
  };
  if (command === 'init') {
    if (target) throw Error('Unexpected init arguments');
    await save({ version: 1, episode: 'SET_EPISODE', stages: Object.fromEntries(stages.map(s => [s, { inputs: [], outputs: [] }])) as unknown as State['stages'] });
    console.log(JSON.stringify({ initialized: stateFile, configured: false })); return;
  }
  const original = await readFile(stateFile, 'utf8');
  const state: State = JSON.parse(original);
  if (state.version !== 1 || typeof state.episode !== 'string' || !state.stages) throw Error('Invalid state');
  for (const s of stages) {
    const step = state.stages[s];
    if (step?.command && (!Array.isArray(step.command) || !step.command.length || step.command.some(v => typeof v !== 'string'))) throw Error(`Invalid command: ${s}`);
    if (!step || !Array.isArray(step.inputs) || !Array.isArray(step.outputs) || [...step.inputs, ...step.outputs].some(f => typeof f !== 'string' || !f.trim())) throw Error(`Invalid paths: ${s}`);
  }
  if (target && !stages.includes(target as Stage)) throw Error('Unknown stage');
  const fingerprint = (s: Stage) => digest(JSON.stringify(state.stages[s].frozen?.outputs ?? {}));
  const memo = new Map<Stage, Promise<string[]>>();
  const inspect = (s: Stage): Promise<string[]> => {
    if (!memo.has(s)) memo.set(s, (async () => {
      const step = state.stages[s], reasons: string[] = [];
      for (const dep of dependencies[s] as Stage[]) {
        if ((await inspect(dep)).length) reasons.push(`dependency:${dep}`);
        else if (step.frozen && step.frozen.dependencies[dep] !== fingerprint(dep)) reasons.push(`changed-dependency:${dep}`);
      }
      if (!step.inputs.length || !step.outputs.length) reasons.push('unconfigured');
      const frozen = step.frozen;
      if (!frozen) return [...reasons, 'not-frozen'];
      if (JSON.stringify(step.command) !== JSON.stringify(frozen.command)) reasons.push('changed-command');
      for (const [kind, files] of [['inputs', step.inputs], ['outputs', step.outputs]] as const) {
        if (JSON.stringify([...files].sort()) !== JSON.stringify(Object.keys(frozen[kind]).sort())) reasons.push(`changed-${kind}-configuration`);
        for (const file of files) {
          try { if (await hash(file) !== frozen[kind][file]) reasons.push(`changed:${file}`); }
          catch { reasons.push(`missing:${file}`); }
        }
      }
      try { if (await hash(frozen.evidence) !== frozen.evidenceHash) reasons.push('changed-evidence'); } catch { reasons.push('missing-evidence'); }
      return reasons;
    })());
    return memo.get(s)!;
  };
  if (command === 'check') {
    const selected = target ? [target as Stage] : stages;
    const results = await Promise.all(selected.map(async s => ({ stage: s, valid: !(await inspect(s)).length, reasons: await inspect(s) })));
    console.log(JSON.stringify({ episode: state.episode, stages: results }, null, 2));
    if (results.some(r => !r.valid)) process.exitCode = 2;
    return;
  }
  if (!target) throw Error('Stage required');
  const stage = target as Stage, step = state.stages[stage];
  for (const dep of dependencies[stage] as Stage[]) if ((await inspect(dep)).length) throw Error(`Blocked: ${dep} is not frozen or has changed`);
  if (!step.inputs.length || !step.outputs.length) throw Error('Configure stage inputs and outputs first');
  for (const file of step.inputs) await hash(file);
  if (command === 'run') {
    if (rest[0] !== '--' || !rest[1]) throw Error('Expected -- COMMAND [ARGS...]');
    if (!step.command || JSON.stringify(step.command) !== JSON.stringify(rest.slice(1))) throw Error('Configure the exact command array in this stage before run');
    if (!(await inspect(stage)).length) { console.log(JSON.stringify({ stage, skipped: true, reason: 'frozen-files-unchanged' })); return; }
    const result = spawnSync(rest[1], rest.slice(2), { stdio: 'inherit', shell: false });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(`Command failed: ${result.status ?? result.signal}`);
    console.log(JSON.stringify({ stage, commandCompleted: true, frozen: false, next: 'Review outputs, then freeze with evidence' })); return;
  }
  if (command !== 'freeze' || rest.length !== 1) throw Error('Expected freeze STATE STAGE EVIDENCE');
  const evidenceFile = rest[0];
  if ([...step.inputs, ...step.outputs].some(f => local(f) === local(evidenceFile))) throw Error('Evidence must be separate from stage assets');
  const evidence = JSON.parse(await readFile(local(evidenceFile), 'utf8'));
  if (evidence.episode !== state.episode || evidence.stage !== stage) throw Error('Evidence belongs to another episode or stage');
  if (evidence.passed !== true || !evidence.files || !Array.isArray(evidence.unresolvedIssues) || evidence.unresolvedIssues.length) throw Error('Evidence must pass with no unresolved issues');
  if (['storyboard', 'covers'].includes(stage) && (evidence.userApproved !== true || !evidence.approvalReference?.trim())) throw Error('Actual user approval reference required');
  if (stage === 'voice' && (evidence.parametersChecked !== true || evidence.pronunciationChecked !== true || typeof evidence.actualListening !== 'boolean')) throw Error('Voice parameters, pronunciation review and listening scope required');
  const inputs: Record<string, string> = {}, outputs: Record<string, string> = {};
  for (const [files, into] of [[step.inputs, inputs], [step.outputs, outputs]] as const) for (const file of files) {
    const actual = await hash(file); if (evidence.files[file] !== actual) throw Error(`Evidence not bound to current file: ${file}`); into[file] = actual;
  }
  step.frozen = { inputs, outputs, command: step.command, evidence: evidenceFile, evidenceHash: await hash(evidenceFile), dependencies: Object.fromEntries((dependencies[stage] as Stage[]).map(dep => [dep, fingerprint(dep)])), frozenAt: new Date().toISOString() };
  await save(state, original);
  console.log(JSON.stringify({ stage, frozen: true, fingerprint: fingerprint(stage) }));
};
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
