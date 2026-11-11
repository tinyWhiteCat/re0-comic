import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { checkStoryboardSources, textHash } from './check-storyboard-sources.js';
const dirs: string[] = [];
afterEach(async () => { for (const d of dirs.splice(0)) await rm(d, { recursive: true, force: true }); });
async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 're0-source-')); dirs.push(root);
  const source = 'First event.\nSecond event.\n';
  await writeFile(path.join(root, 'novel.md'), source);
  const shots = ['01', '02'].map((id, index) => {
    const narration = `Narration ${id}`, frameDescription = `Frame ${id}`;
    return { id, narration, frameDescription, sourceLines: [[index + 1, index + 1]], sourceNotes: 'Existing notes retained', sourceReview: {
      sourceRefs: [`novel#a${id}`], eventIds: ['e' + id], mustKeep: ['Preserve this event'], knowledge: ['current-state'], forbiddenAdditions: [],
      visualRequirements: [{ description: 'A visible action', basis: 'explicit', sourceRefs: [`novel#a${id}`] }],
      status: 'reviewed', checkedNarrationSha256: textHash(narration), checkedFrameDescriptionSha256: textHash(frameDescription),
    } };
  });
  const board = { source: 'novel.md', sourceSha256: textHash(source), sourceMapping: {
    documents: [{ id: 'novel', file: 'novel.md', sha256: textHash(source), anchors: [{ id: 'a01', quote: 'First event.', lineRange: [1, 1] }, { id: 'a02', quote: 'Second event.', lineRange: [2, 2] }] }],
    events: shots.map(s => ({ id: 'e' + s.id, summary: 'An event', sourceRefs: s.sourceReview.sourceRefs, shotIds: [s.id] })),
    states: [{ id: 'current-state', description: 'Current knowledge and ability', sourceRefs: ['novel#a01'] }],
  }, shots };
  const file = path.join(root, 'storyboard.json');
  const check = async () => { await writeFile(file, JSON.stringify(board)); return checkStoryboardSources(file, root); };
  return { root, board, check };
}
test('compatible source/shot fields validate without claiming semantic correctness', async () => {
  const f = await fixture(), result = await f.check(); assert.equal(result.valid, true); assert.equal(result.semanticReview, 'not-automated');
  assert.equal(f.board.shots[0].sourceNotes, 'Existing notes retained');
});
test('source drift, incorrect quotes and wrong line ranges are rejected', async () => {
  const f = await fixture(); await writeFile(path.join(f.root, 'novel.md'), 'Changed event.\nSecond event.\n');
  let r = await f.check(); assert.equal(r.valid, false); assert.ok(r.issues.some(i => i.message.includes('version changed')));
  f.board.sourceMapping.documents[0].anchors[1].lineRange = [1, 1];
  r = await f.check(); assert.ok(r.issues.some(i => i.message.includes('outside declared line')));
});
test('unknown knowledge, dangling references and uncovered declared events are rejected', async () => {
  const f = await fixture(); f.board.shots[0].sourceReview.knowledge = ['unknown'];
  f.board.shots[0].sourceReview.sourceRefs = ['novel#missing'];
  f.board.sourceMapping.events[1].shotIds = ['99'];
  const r = await f.check(); assert.equal(r.valid, false);
  for (const term of ['Unknown state', 'Unknown source reference', 'Unknown shot']) assert.ok(r.issues.some(i => i.message.includes(term)));
});
test('staging needs its own decision reference rather than pretending to be explicit text', async () => {
  const f = await fixture(); const v = f.board.shots[0].sourceReview.visualRequirements[0] as { description: string; basis: string; sourceRefs?: string[]; decisionReference?: string };
  v.basis = 'staging'; delete v.sourceRefs;
  assert.equal((await f.check()).valid, false);
  v.decisionReference = 'shot01-staging-decision'; assert.equal((await f.check()).valid, true);
});
test('text edits invalidate manual review; an unchanged reviewed neighbor stays bound', async () => {
  const f = await fixture(); f.board.shots[0].narration = 'Changed narration';
  let r = await f.check(); assert.ok(r.issues.some(i => i.scope === 'shot:01' && i.message.includes('narration')));
  assert.equal(r.issues.some(i => i.scope === 'shot:02'), false);
  f.board.shots[0].sourceReview.checkedNarrationSha256 = textHash('Changed narration');
  f.board.shots[0].sourceReview.status = 'pending'; r = await f.check(); assert.equal(r.valid, false);
});
test('declared event order and reciprocal shot mapping must match', async () => {
  const f = await fixture(); f.board.sourceMapping.events.reverse();
  assert.ok((await f.check()).issues.some(i => i.message.includes('event order')));
  f.board.sourceMapping.events.reverse(); f.board.shots[0].sourceReview.eventIds = [];
  assert.ok((await f.check()).issues.some(i => i.message.includes('reciprocal event')));
});
