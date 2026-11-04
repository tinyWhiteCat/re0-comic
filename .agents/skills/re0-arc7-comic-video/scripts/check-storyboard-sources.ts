import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const textHash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
type ObjectValue = Record<string, any>;
export async function checkStoryboardSources(file: string, root = process.cwd()) {
  const issues: Array<{ scope: string; message: string }> = [];
  const fail = (scope: string, message: string) => { issues.push({ scope, message }); };
  const object = (v: unknown, scope: string): ObjectValue => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) { fail(scope, 'Expected object'); return {}; } return v;
  };
  const array = (v: unknown, scope: string): any[] => { if (!Array.isArray(v)) { fail(scope, 'Expected array'); return []; } return v; };
  const nonempty = (v: unknown): v is string => typeof v === 'string' && !!v.trim();
  const strings = (v: unknown, scope: string, required = false): string[] => {
    const a = array(v, scope); if (required && !a.length) fail(scope, 'Cannot be empty');
    if (a.some(x => !nonempty(x))) fail(scope, 'Expected nonempty strings'); return a.filter(nonempty);
  };
  const board = object(JSON.parse(await readFile(file, 'utf8')), 'storyboard');
  const mapping = object(board.sourceMapping, 'sourceMapping');
  const docs = array(mapping.documents, 'documents'); if (!docs.length) fail('documents', 'No source documents');
  if (!nonempty(board.source) || !/^[a-f0-9]{64}$/.test(board.sourceSha256 ?? '') || !docs.some(d => d && nonempty(d.file) && path.resolve(root, d.file) === path.resolve(root, board.source) && d.sha256 === board.sourceSha256)) fail('source', 'Primary source/version must match the document registry');
  const refs = new Set<string>(), docIds = new Set<string>();
  for (const raw of docs) {
    const d = object(raw, 'document'), scope = `document:${d.id}`;
    if (!nonempty(d.id) || d.id.includes('#') || docIds.has(d.id)) { fail(scope, 'Missing/duplicate/invalid document id'); continue; }
    docIds.add(d.id);
    if (!nonempty(d.file) || !/^[a-f0-9]{64}$/.test(d.sha256 ?? '')) { fail(scope, 'Source path and SHA-256 required'); continue; }
    let source: string;
    try { const bytes = await readFile(path.resolve(root, d.file)); source = bytes.toString('utf8'); if (createHash('sha256').update(bytes).digest('hex') !== d.sha256) fail(scope, 'Source version changed'); }
    catch { fail(scope, 'Source file missing/unreadable'); continue; }
    const anchors = array(d.anchors, scope + ':anchors'); if (!anchors.length) fail(scope, 'No anchors');
    for (const value of anchors) {
      const a = object(value, scope + ':anchor'), key = `${d.id}#${a.id}`;
      if (!nonempty(a.id) || a.id.includes('#') || refs.has(key)) { fail(scope, 'Missing/duplicate/invalid anchor id'); continue; }
      refs.add(key);
      if (!nonempty(a.quote) || !source.includes(a.quote)) fail(key, 'Anchor quote not found verbatim');
      if (a.lineRange !== undefined) {
        const r = a.lineRange, lines = source.split(/\r?\n/);
        if (!Array.isArray(r) || r.length !== 2 || !r.every(Number.isInteger) || r[0] < 1 || r[1] < r[0] || r[1] > lines.length) fail(key, 'Invalid line range');
        else if (!nonempty(a.quote) || !lines.slice(r[0] - 1, r[1]).join('\n').includes(a.quote)) fail(key, 'Quote outside declared line range');
      }
    }
  }
  const checkRefs = (value: unknown, scope: string) => {
    for (const ref of strings(value, scope, true)) if (!refs.has(ref)) fail(scope, `Unknown source reference: ${ref}`);
  };
  const states = array(mapping.states, 'states'), stateIds = new Set<string>();
  for (const value of states) {
    const s = object(value, 'state'), scope = `state:${s.id}`;
    if (!nonempty(s.id) || stateIds.has(s.id)) fail(scope, 'Missing/duplicate state id'); else stateIds.add(s.id);
    if (!nonempty(s.description)) fail(scope, 'Description required'); checkRefs(s.sourceRefs, scope);
  }
  const shots = array(board.shots, 'shots'), shotIds = new Set<string>();
  if (!shots.length) fail('shots', 'No shots');
  for (const value of shots) { const s = object(value, 'shot'); if (!nonempty(s.id) || shotIds.has(s.id)) fail('shots', 'Missing/duplicate shot id'); else shotIds.add(s.id); }
  const events = array(mapping.events, 'events'), eventMap = new Map<string, string[]>();
  if (!events.length) fail('events', 'No event chain');
  let previousFirst = -1;
  for (const value of events) {
    const e = object(value, 'event'), scope = `event:${e.id}`;
    if (!nonempty(e.id) || eventMap.has(e.id)) fail(scope, 'Missing/duplicate event id');
    if (!nonempty(e.summary)) fail(scope, 'Summary required'); checkRefs(e.sourceRefs, scope);
    const ids = strings(e.shotIds, scope + ':shotIds', true); eventMap.set(e.id, ids);
    for (const id of ids) if (!shotIds.has(id)) fail(scope, `Unknown shot: ${id}`);
    const first = Math.min(...ids.map(id => shots.findIndex(s => s?.id === id)).filter(i => i >= 0));
    if (Number.isFinite(first)) { if (first < previousFirst) fail(scope, 'Shot order contradicts declared event order'); previousFirst = first; }
  }
  for (const value of shots) {
    const s = object(value, 'shot'), scope = `shot:${s.id}`, r = object(s.sourceReview, scope + ':sourceReview');
    checkRefs(r.sourceRefs, scope); strings(r.mustKeep, scope + ':mustKeep', true); strings(r.forbiddenAdditions, scope + ':forbiddenAdditions');
    for (const id of strings(r.knowledge, scope + ':knowledge')) if (!stateIds.has(id)) fail(scope, `Unknown state: ${id}`);
    const eventIds = strings(r.eventIds, scope + ':eventIds', true);
    for (const id of eventIds) if (!eventMap.get(id)?.includes(s.id)) fail(scope, `Event does not map back to shot: ${id}`);
    for (const [id, members] of eventMap) if (members.includes(s.id) && !eventIds.includes(id)) fail(scope, `Missing reciprocal event: ${id}`);
    const visuals = array(r.visualRequirements, scope + ':visualRequirements'); if (!visuals.length) fail(scope, 'Visual requirements required');
    for (const value of visuals) {
      const v = object(value, scope + ':visual'); if (!nonempty(v.description)) fail(scope, 'Visual description required');
      if (!['explicit', 'staging', 'user-direction', 'continuity'].includes(v.basis)) fail(scope, 'Unknown visual basis');
      else if (v.basis === 'explicit') checkRefs(v.sourceRefs, scope + ':explicit-visual');
      else if (!nonempty(v.decisionReference)) fail(scope, 'Nonliteral staging needs a decision/reference');
    }
    if (r.status !== 'reviewed') fail(scope, 'Manual source review pending');
    for (const [field, checked] of [['narration', 'checkedNarrationSha256'], ['frameDescription', 'checkedFrameDescriptionSha256']]) {
      if (!nonempty(s[field]) || textHash(s[field]) !== r[checked]) fail(scope, `${field} is missing or changed since manual review`);
    }
  }
  return { valid: issues.length === 0, documentsChecked: docs.length, shotsChecked: shots.length, semanticReview: 'not-automated', issues };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [file, flag, root] = process.argv.slice(2);
  if (!file || file === '--help') console.log('Usage: check-storyboard-sources.ts STORYBOARD [--root ROOT]\nChecks source hashes, anchors, references and review bindings; does not judge fidelity or images.');
  else if ((flag && flag !== '--root') || (flag && !root) || process.argv.length > 5) { console.error('Invalid arguments'); process.exitCode = 1; }
  else checkStoryboardSources(path.resolve(file), root ? path.resolve(root) : process.cwd()).then(result => { console.log(JSON.stringify(result, null, 2)); if (!result.valid) process.exitCode = 2; }).catch(error => { console.error(String(error)); process.exitCode = 1; });
}
