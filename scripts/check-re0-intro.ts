import { readFile } from 'node:fs/promises';
import { loadIntroContract, validateIntroPlan, validateIntroCache, identitySha256, readIntroContentVerification } from './lib/re0-intro-contract.js';

const args = process.argv.slice(2);
const allowed = new Set(['--plan', '--direction', '--policy', '--cache-record', '--cache-audio', '--request-context', '--content-verification']);
const options = new Map<string, string>();
async function main() {
  if (args.length === 1 && args[0] === '--help') {
    console.log('tsx scripts/check-re0-intro.ts --plan PLAN [--direction DIRECTION] [--policy POLICY] [--cache-record RECORD --cache-audio WAV --request-context REQUEST_JSON --content-verification VERIFICATION_JSON]');
    return;
  }
  for (let i = 0; i < args.length; i += 2) {
    if (!allowed.has(args[i]) || options.has(args[i]) || !args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Unknown, duplicate or incomplete option: ' + args[i]);
    options.set(args[i], args[i + 1]);
  }
  const planFile = options.get('--plan');
  if (!planFile) throw new Error('--plan is required');
  const json = async (file: string) => JSON.parse(await readFile(file, 'utf8')) as unknown;
  const policy = await loadIntroContract(options.get('--policy'));
  const direction = options.has('--direction') ? await json(options.get('--direction')!) : undefined;
  const requestContext = options.has('--request-context') ? await json(options.get('--request-context')!) : null;
  const identity = validateIntroPlan(await json(planFile), policy, direction, requestContext);
  const recordFile = options.get('--cache-record');
  const audioFile = options.get('--cache-audio');
  if (Boolean(recordFile) !== Boolean(audioFile)) throw new Error('--cache-record and --cache-audio must be supplied together');
  if (recordFile && audioFile) {
    if (!options.has('--request-context')) throw new Error('Cache verification requires the actual --request-context JSON, including endpoint and synthesis body');
    if (!options.has('--content-verification')) throw new Error('Cache verification requires independent --content-verification evidence');
    const content = await readIntroContentVerification(options.get('--content-verification')!);
    validateIntroCache(identity, await json(recordFile), await readFile(audioFile), content.verification, content.evidenceBytes);
  }
  console.log(JSON.stringify({ status: 'pass', scope: recordFile ? 'current-plan-and-cache' : 'current-plan', policyVersion: identity.policyVersion, policySha256: identity.policySha256, identitySha256: identitySha256(identity), actualListening: false }));
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
