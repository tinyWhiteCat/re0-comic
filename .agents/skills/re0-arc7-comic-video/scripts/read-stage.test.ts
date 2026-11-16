import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, routes, section } from './read-stage.js';
test('every route resolves real headings and stays within a bounded context size', async () => {
  for (const stage of Object.keys(routes)) {
    const result = await buildContext(stage); assert.ok(result.bytes < 16000, `${stage}: ${result.bytes}`);
    assert.ok(result.sections.length); assert.equal(result.sections.some(s => /history|lessons|pipeline/.test(s.file)), false);
  }
});
test('voice context keeps confirmed defaults without unrelated graphics or material mail', async () => {
  const r = await buildContext('voice'); assert.match(r.text, /voice: 冰糖/); assert.match(r.text, /最多两次额外/);
  assert.doesNotMatch(r.text, /原著对应与校对|素材邮件|封面与标题：|v5全28镜|^## 家具/m);
  assert.equal(r.sections.some(s => s.topic === '封面与标题：人物冲突与悬念'), false);
});
test('audition instructions are available before asking for voice or sound feedback', async () => {
  for (const stage of ['voice', 'sound', 'delivery']) {
    const r = await buildContext(stage);
    assert.match(r.text, /先提供真实可访问的试听入口/, stage);
    assert.match(r.text, /排除旧目标音效/, stage);
    if (stage !== 'delivery') assert.doesNotMatch(r.text, /^## 仅素材邮件/m, stage);
  }
});
test('sound and final review include listening checks without pulling them into visual work', async () => {
  for (const stage of ['sound', 'render', 'review']) {
    const r = await buildContext(stage);
    assert.match(r.text, /怪物声核物种感、体量和情绪/, stage);
    assert.match(r.text, /分别记录源音、带旁白短混音与最终编码的检查范围/, stage);
  }
  const visuals = await buildContext('visuals');
  assert.match(visuals.text, /箭尖、剑轴、手指与接触点/);
  assert.doesNotMatch(visuals.text, /^## 音效选材与混音/m);
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
