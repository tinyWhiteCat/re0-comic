import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, routes, section } from './read-stage.js';
test('every route resolves real headings and stays within a bounded context size', async () => {
  for (const stage of Object.keys(routes)) {
    const result = await buildContext(stage); assert.ok(result.bytes < 16000, `${stage}: ${result.bytes}`);
    assert.ok(result.sections.length); assert.equal(result.sections.some(s => /history|lessons|pipeline/.test(s.file)), false);
  }
});
test('voice context excludes unrelated graphics, delivery and legacy voice defaults', async () => {
  const r = await buildContext('voice'); assert.match(r.text, /voice: 冰糖/); assert.match(r.text, /最多两次额外/);
  assert.doesNotMatch(r.text, /原著对应与校对|素材邮件|封面与标题：|v5全28镜|^## 家具/m);
  assert.equal(r.sections.some(s => s.topic === '封面与标题：人物冲突与悬念'), false);
});
test('risk lookup and repair are opt-in and deduplicated', async () => {
  const base = await buildContext('storyboard'); assert.doesNotMatch(base.text, /v4虽露出背板/);
  const r = await buildContext('storyboard', { risks: ['space', 'space'], repair: true });
  assert.match(r.text, /柜体靠墙原位/); assert.equal(r.sections.filter(s => s.topic === '家具背后与观察视线').length, 1);
  assert.equal(r.sections.some(s => s.topic === '刀、鞭与佩戴状态'), false);
  assert.equal(r.sections.filter(s => s.topic === '变更影响').length, 1);
});
test('section boundaries exclude later topics; missing routing keys fail loudly', async () => {
  assert.equal(section('## A\na\n## B\nb\n', 'A'), '## A\na');
  assert.throws(() => section('## A\na', 'B'));
  await assert.rejects(buildContext('unknown')); await assert.rejects(buildContext('plan', { risks: ['unknown'] }));
});
