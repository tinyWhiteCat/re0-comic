import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContext, buildLesson, routes, section } from './read-stage.js';
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
test('prompt, sound timing and render preparation appear only in their production stages', async () => {
  const stageByTopic = new Map([
    ['生成提示词', 'storyboard'],
    ['声音时间线', 'sound'],
    ['渲染前核对', 'render'],
  ]);

  for (const stage of Object.keys(routes)) {
    const context = await buildContext(stage);
    for (const [topic, owner] of stageByTopic) {
      const count = context.sections.filter(section => section.topic === topic).length;
      assert.equal(count, stage === owner ? 1 : 0, `${stage}: ${topic}`);
    }
  }
});
test('risk lookup and repair are opt-in and deduplicated', async () => {
  const base = await buildContext('storyboard'); assert.doesNotMatch(base.text, /v4虽露出背板/);
  const r = await buildContext('storyboard', { risks: ['space', 'continuity', 'space', 'continuity'], repair: true });
  assert.match(r.text, /柜体靠墙原位/); assert.equal(r.sections.filter(s => s.topic === '家具背后与观察视线').length, 1);
  assert.equal(r.sections.some(s => s.topic === '刀、鞭与佩戴状态'), false);
  assert.equal(r.sections.filter(s => s.topic === '版本与依据').length, 1);
  assert.equal(r.sections.filter(s => s.topic === '跨镜道具与场景连续性').length, 1);
  assert.equal(r.sections.filter(s => s.topic === '变更影响').length, 1);
});
test('routes the section 13 checks to the stages that can act on them', async () => {
  const cases = {
    storyboard: [/\| 字幕 \|/, /\| 运镜与视频 \|/, /助词是否自然/],
    voice: [/节号、节名和片尾字标只上屏/, /每一处/],
    alignment: [/宾语“雷姆”应随“拉了拉”收句/],
    visuals: [/营火先在本期实际镜头做连播短样/],
    sound: [/从片头到正文的短样/],
    review: [/连续播放最终编码中新增或改过的代表镜头/, /片尾入场至结束/],
    covers: [/出图前实际查看用户提供或本项目已采用/, /两种比例共用主标题和故事重心/, /单字返修/],
    package: [/check-release-package\.ts/, /current-materials\.json/],
  };
  for (const [stage, checks] of Object.entries(cases)) {
    const { text } = await buildContext(stage);
    for (const check of checks) assert.match(text, check, stage);
  }
});
test('each production risk adds only the requested lesson to the stage context', async () => {
  const topics = [
    ['storyboard', 'continuity', '跨镜道具与场景连续性'],
    ['visuals', 'action', '连续动作与人物轮廓'],
    ['visuals', 'effects', '局部动效短样'],
    ['review', 'seams', '镜头接缝与旁白衔接'],
    ['covers', 'cover', '封面悬念与整套题字'],
  ];
  for (const [stage, risk, topic] of topics) {
    const result = await buildContext(stage, { risks: [risk] });
    const lessons = result.sections.filter(s => s.file === 'production-lessons.md');
    assert.deepEqual(lessons.map(s => s.topic), [topic]);
    assert.ok(result.text.includes(`## ${topic}\n`), risk);
    assert.ok(!result.sections.some(s => s.file === 'confirmed-cases.md'), risk);
  }
});
test('section boundaries exclude later topics; missing routing keys fail loudly', async () => {
  assert.equal(section('## A\na\n## B\nb\n', 'A'), '## A\na');
  assert.throws(() => section('## A\na', 'B'));
  await assert.rejects(buildContext('unknown')); await assert.rejects(buildContext('plan', { risks: ['unknown'] }));
});

test('lesson lookup reads only selected guidance and any applicable defaults', async () => {
  const cases = {
    continuity: ['跨镜道具与场景连续性', /沿出场镜号复查/],
    motion: ['运镜与表情', /起点和落点/],
    'image-quality': ['画面模糊与压缩块', /最大裁切.*最终MP4/],
    pronunciation: ['有限语音返修', /实测停顿处接回/],
    outro: ['片尾放置与抽查', /右下角淡入/],
    covers: ['封面悬念与整套题字', /ImageGen 生成标题字/],
  } as const;
  for (const [topic, [heading, check]] of Object.entries(cases)) {
    const result = await buildLesson(topic);
    assert.match(result.text, check, topic);
    assert.equal(result.sections.filter(s => s.file !== 'production-defaults.md').length, 1, topic);
    assert.ok(result.sections.some(s => s.topic.includes(heading)), topic);
  }
  await assert.rejects(buildLesson('toString'), /Unknown lesson/);
});
