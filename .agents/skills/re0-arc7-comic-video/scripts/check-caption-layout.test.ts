import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test, type TestContext } from 'node:test';
import { fileURLToPath } from 'node:url';
import { checkCaptionLayout } from './check-caption-layout.js';

const cli = fileURLToPath(new URL('./check-caption-layout.ts', import.meta.url));
const dialogue = (style: string, text: string, second = 0, margins = '0,0,0', effect = '') =>
  `Dialogue: 2,0:00:0${second}.00,0:00:0${second + 1}.00,${style},,${margins},${effect},${text}`;
const defaults = ['Chinese,2,64,64,132', 'English,8,64,64,954', 'Brand,7,4,4,10'];
function ass(events: string[], styles = defaults, width = 1920, height = 1080) {
  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
[V4+ Styles]
Format: Name, Alignment, MarginL, MarginR, MarginV
${styles.map(style => 'Style: ' + style).join('\n')}
[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join('\n')}
`;
}

async function fixture(context: TestContext) {
  const dir = await mkdtemp(path.join(tmpdir(), 're0-caption-layout-'));
  context.after(() => rm(dir, { recursive: true, force: true }));
  return async (name: string, contents: string) => {
    const file = path.join(dir, name + '.ass');
    await writeFile(file, contents);
    return file;
  };
}

test('accepts centered explicit and inherited anchors and skips title styles and comments', async context => {
  const save = await fixture(context);
  const first = await save('intro', ass([
    dialogue('Brand', '{\\an7\\pos(1500,100)}片头字标'),
    dialogue('Chinese', '{\\an2\\pos(960,948)}正文'),
    dialogue('English', '{\\an8\\pos(960,954)}First line, with a comma'),
    dialogue('English', '{\\an8\\pos(960,1004)}Second line'),
    dialogue('Chinese', '{\\i1}样式定义里的默认锚点', 2),
    dialogue('English', 'An inherited top anchor', 2),
    dialogue('English', '{\\a6\\pos(960,1004)}Legacy alignment for the second row', 2),
    dialogue('Chinese', '{\\an3\\pos(200,200)}草稿注释').replace('Dialogue:', 'Comment:'),
  ]));
  const ending = await save('outro', ass([dialogue('Brand', '未完待续')]));
  const report = await checkCaptionLayout([first, ending]);
  assert.equal(report.passed, true);
  assert.deepEqual(report.captions, { chinese: 2, english: 4 });
  assert.deepEqual(report.files[1]?.captions, { chinese: 0, english: 0 });
});

test('uses the PlayRes midpoint and selected style names', async context => {
  const save = await fixture(context);
  const file = await save('small', ass([
    dialogue('旁白字幕', '{\\an2\\pos(640,632)}居中'),
    dialogue('译文', 'Centered English from its style'),
    dialogue('另一个英文样式', '{\\an8\\pos(640,636)}Also centered', 2),
    dialogue('Chinese', '{\\an7\\pos(60,80)}Unselected caption style'),
  ], ['旁白字幕,2,20,20,88', '译文,8,40,40,636', '另一个英文样式,8,32,32,636'], 1280, 720));
  const report = await checkCaptionLayout([file], {
    chineseStyles: ['旁白字幕'], englishStyles: ['译文', '另一个英文样式'],
  });
  assert.equal(report.passed, true);
  assert.deepEqual(report.captions, { chinese: 1, english: 2 });
});

test('reports lateral alignment, shifted positions, asymmetric margins and moving captions', async context => {
  const save = await fixture(context);
  const file = await save('bad', ass([
    dialogue('Chinese', '{\\an3\\an2\\pos(960,948)}First alignment takes effect'),
    dialogue('Chinese', '{\\pos(1020,948)\\pos(960,948)}First position takes effect', 1),
    dialogue('Chinese', 'Asymmetric event margins', 2, '210,10,0'),
    dialogue('English', '{\\an8\\pos(960,200)}Too high', 3),
    dialogue('English', '{\\move(960,954,1070,954,0,120)}Moving', 4),
    dialogue('Chinese', 'Scrolling', 5, '0,0,0', 'Banner;10'),
  ]));
  const { passed, issues } = await checkCaptionLayout([file]);
  assert.equal(passed, false);
  assert.equal(issues.length, 6);
  assert.match(issues[0]!.message, /水平居中/);
  assert.match(issues[1]!.message, /1020.*960/);
  assert.match(issues[2]!.message, /1060.*960/);
  assert.match(issues[3]!.message, /下半部/);
  assert.match(issues[4]!.message, /移动锚点/);
  assert.match(issues[5]!.message, /滚动效果/);
  assert.ok(issues.every(issue => issue.file === file && issue.line));
});

test('detects changing vertical anchors across actual clip files while allowing two fixed English rows', async context => {
  const save = await fixture(context);
  const first = await save('opening', ass([
    dialogue('Chinese', '文本'),
    dialogue('English', 'The first anchor at 954'),
    dialogue('English', '{\\pos(960,1004)}English line two'),
  ]));
  const second = await save('later', ass([
    dialogue('Chinese', '{\\pos(960,925)}Same screen zone, changed anchor'),
    dialogue('English', 'Same first anchor'),
    dialogue('English', '{\\pos(960,992)}Second line moved'),
    dialogue('English', '{\\pos(960,1004)}Unexpected additional row'),
  ]));
  const report = await checkCaptionLayout([first, second]);
  assert.equal(report.passed, false);
  assert.equal(report.issues.length, 3);
  assert.match(report.issues[0]!.message, /纵向锚点.*948/);
  assert.match(report.issues[1]!.message, /纵向锚点.*1004/);
  assert.match(report.issues[2]!.message, /两个独立英文/);
});

test('handles captionless files explicitly and rejects missing geometry or ambiguous style resets', async context => {
  const save = await fixture(context);
  const empty = await save('ending', ass([dialogue('Brand', '{\\an7\\pos(1500,950)}未完待续')]));
  assert.equal((await checkCaptionLayout([empty], { allowEmpty: true })).passed, true);
  assert.match((await checkCaptionLayout([empty])).issues[0]!.message, /未找到/);
  const bad = await save('no-y', ass([]).replace('PlayResY: 1080', ''));
  assert.match((await checkCaptionLayout([bad], { allowEmpty: true })).issues[0]!.message, /PlayResY/);
  const reset = await save('reset', ass([dialogue('Chinese', '{\\rBrand}Named style reset')]));
  assert.match((await checkCaptionLayout([reset])).issues[0]!.message, /重置了样式/);
});

test('requires both selected languages even with the captionless-file option', async context => {
  const save = await fixture(context);
  const file = await save('missing-English-style', ass([
    dialogue('Chinese', '字幕'),
    dialogue('English', 'Translation'),
  ]));
  const report = await checkCaptionLayout([file], { englishStyles: ['Misspelled'], allowEmpty: true });
  assert.equal(report.passed, false);
  assert.match(report.issues[0]!.message, /未找到所选样式的英文字幕/);
});

test('flags clear row inversion and stacked split rows while allowing bottom and top anchors', async context => {
  const save = await fixture(context);
  const file = await save('inverted', ass([
    dialogue('Chinese', '{\\an2\\pos(960,1000)}字幕'),
    dialogue('English', '{\\an8\\pos(960,800)}First row'),
    dialogue('English', '{\\an8\\pos(960,800)}Second row at the same anchor'),
  ]));
  assert.deepEqual((await checkCaptionLayout([file])).issues.map(issue => issue.message), [
    '同一字幕时段的英文行使用了同一锚点。',
    '此字幕时段英文整体明显高于中文。',
  ]);
  const valid = await save('valid', ass([
    dialogue('Chinese', '{\\an2\\pos(960,770)}随构图使用的统一位置'),
    dialogue('English', '{\\an8\\pos(960,780)}English starts below the Chinese baseline'),
  ]));
  assert.equal((await checkCaptionLayout([valid])).passed, true);
});

test('CLI returns structured fixes without disclosing caption text', async context => {
  const save = await fixture(context);
  const source = '发给审稿人的私密原话';
  const one = await save('clip 1', ass([
    dialogue('Chinese', '标题以外的字幕'),
    dialogue('自定英文', '{\\an8\\pos(1500,954)}' + source),
  ], [...defaults, '自定英文,2,64,64,80']));
  const result = spawnSync(process.execPath, ['--import', 'tsx', cli, '--en-style', '自定英文', one], { encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.doesNotMatch(result.stdout, new RegExp(source));
  const report = JSON.parse(result.stdout);
  assert.equal(report.passed, false);
  assert.deepEqual(report.captions, { chinese: 1, english: 1 });
  assert.match(report.issues[0].message, /1500.*960/);
});
