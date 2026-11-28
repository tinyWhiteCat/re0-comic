import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
type Route = { defaults: string[]; docs: Array<[string, string[]]>; style?: { rows: string[]; sections: string[] } };
export const routes: Record<string, Route> = {
  plan: { defaults: ['图稿与故事', '审稿', '配乐音效', '封面与简介'], docs: [['source-fidelity.md', ['本节只建立一次的资料', '共享素材与逐镜状态', '每镜五项信息', '两次检查，各有范围']], ['execution.md', ['阶段依赖', '生成前先固定约束', '外部模型与成片来源']]], style: { rows: ['自然解说与情绪衔接'], sections: ['解说：原因接动作，冲突带情绪'] } },
  storyboard: { defaults: ['图稿与故事', '审稿', '运镜与视频', '字幕'], docs: [['source-fidelity.md', ['共享素材与逐镜状态', '结构检查工具']], ['execution.md', ['阶段依赖', '生成前先固定约束', '生成提示词']], ['quality-checklist.md', ['分镜']]], style: { rows: ['日常/回忆彩图', '对话/人物关系彩图', '动作/冲击彩图'], sections: ['彩图：动画插画质感与可读的动作'] } },
  voice: { defaults: ['声线', '人声处理', '读音', '片头'], docs: [['execution.md', ['有限语音返修']], ['quality-checklist.md', ['配音']], ['delivery-and-publishing.md', ['短样交付']]], style: { rows: ['已确认音色', '已确认RE0连读'], sections: ['声音：保留已确认自然说话方式'] } },
  alignment: { defaults: ['字幕', '读音'], docs: [['quality-checklist.md', ['对齐']]] },
  visuals: { defaults: ['运镜与视频', '字幕', '片头', '片尾'], docs: [['quality-checklist.md', ['画面与动效']], ['execution.md', ['外部模型与成片来源']]], style: { rows: ['字幕与片头片尾实现'], sections: ['运镜、字幕与片头片尾', '片尾放置与抽查'] } },
  sound: { defaults: ['配乐音效', '人声处理'], docs: [['execution.md', ['声音时间线']], ['quality-checklist.md', ['音效选材与混音']], ['delivery-and-publishing.md', ['短样交付']]], style: { rows: ['已确认音色'], sections: ['场景配乐', '声音：保留已确认自然说话方式'] } },
  render: { defaults: ['运镜与视频', '字幕', '片头', '片尾', '人声处理'], docs: [['quality-checklist.md', ['渲染前核对', '画面与动效', '音效选材与混音', '成片终检']]] },
  review: { defaults: ['运镜与视频', '字幕', '片头', '片尾', '人声处理'], docs: [['quality-checklist.md', ['成片终检', '音效选材与混音']], ['execution.md', ['证据复用与交接']]] },
  covers: { defaults: ['封面与简介'], docs: [['quality-checklist.md', ['封面与简介']]], style: { rows: ['封面与标题'], sections: ['封面与标题：人物冲突与悬念'] } },
  package: { defaults: ['交付', '封面与简介'], docs: [['quality-checklist.md', ['打包与交付']], ['delivery-and-publishing.md', ['打包']]] },
  delivery: { defaults: ['交付', '封面与简介'], docs: [['delivery-and-publishing.md', ['短样交付', '上传与核验', '仅素材邮件', '完成交付']]] },
};
const risks: Record<string, [file: string, topic: string]> = {
  scene: ['execution.md', '按需场景构建'],
  space: ['confirmed-cases.md', '家具背后与观察视线'],
  props: ['confirmed-cases.md', '刀、鞭与佩戴状态'],
  body: ['confirmed-cases.md', '身体受限与整体比例'],
  fall: ['confirmed-cases.md', '高处扑击与动作方向'],
  continuity: ['production-lessons.md', '跨镜道具与场景连续性'],
  parallel: ['execution.md', '长分镜的分段制作'],
  action: ['production-lessons.md', '连续动作与人物轮廓'],
  effects: ['production-lessons.md', '局部动效短样'],
  seams: ['production-lessons.md', '镜头接缝与旁白衔接'],
  cover: ['production-lessons.md', '封面悬念与整套题字'],
};
const lessons: Record<string, Route> = {
  continuity: { defaults: [], docs: [['production-lessons.md', ['跨镜道具与场景连续性']]] },
  motion: { defaults: [], docs: [['production-lessons.md', ['运镜与表情']]] },
  'image-quality': { defaults: [], docs: [['production-lessons.md', ['画面模糊与压缩块']]] },
  effects: { defaults: [], docs: [['production-lessons.md', ['局部动效短样']]] },
  pronunciation: { defaults: ['读音'], docs: [['execution.md', ['有限语音返修']]] },
  sound: { defaults: [], docs: [['production-lessons.md', ['环境声与关键动作的瞬态']]] },
  outro: { defaults: ['片尾'], docs: [['style-reference.md', ['片尾放置与抽查']]] },
  covers: { defaults: ['封面与简介'], docs: [['production-lessons.md', ['封面悬念与整套题字']]] },
};
export function section(text: string, heading: string) {
  const lines = text.split('\n'), start = lines.indexOf('## ' + heading);
  if (start < 0) throw Error(`Missing section: ${heading}`);
  let end = start + 1; while (end < lines.length && !lines[end].startsWith('## ')) end++;
  return lines.slice(start, end).join('\n').trim();
}
export function tableRows(text: string, wanted: string[]) {
  const lines = text.split('\n'), rows = new Map<string, string>();
  for (const line of lines) if (line.startsWith('|')) { const key = line.split('|')[1].trim(); if (wanted.includes(key)) rows.set(key, line); }
  for (const key of wanted) if (!rows.has(key)) throw Error(`Missing table row: ${key}`);
  return ['| 项目 | 规则或参考 |', '| --- | --- |', ...wanted.map(k => rows.get(k)!)].join('\n');
}
export async function buildContext(stage: string, options: { risks?: string[]; repair?: boolean } = {}) {
  if (!Object.hasOwn(routes, stage)) throw Error(`Unknown stage: ${stage}`);
  return buildSelection(stage, routes[stage], options);
}
export async function buildLesson(topic: string) {
  if (!Object.hasOwn(lessons, topic)) throw Error(`Unknown lesson: ${topic}`);
  return buildSelection(topic, lessons[topic], { lesson: true });
}
async function buildSelection(stage: string, route: Route, options: { risks?: string[]; repair?: boolean; lesson?: boolean }) {
  const selectedRisks = new Set(options.risks);
  for (const risk of selectedRisks) if (!Object.hasOwn(risks, risk)) throw Error(`Unknown risk: ${risk}`);
  const cache = new Map<string, Promise<string>>();
  const load = (name: string) => { if (!cache.has(name)) cache.set(name, readFile(path.join(root, 'references', name), 'utf8')); return cache.get(name)!; };
  const chunks: Array<{ file: string; topic: string; text: string }> = [];
  const add = (file: string, topic: string, text: string) => { if (!chunks.some(c => c.file === file && c.topic === topic)) chunks.push({ file, topic, text }); };
  if (route.defaults.length) add('production-defaults.md', options.lesson ? '适用规格' : '本阶段规格', tableRows(await load('production-defaults.md'), route.defaults));
  for (const [file, topics] of route.docs) for (const topic of topics) add(file, topic, section(await load(file), topic));
  if (route.style) {
    const text = await load('style-reference.md');
    const intro = section(text, '参考来源与确认边界').split('\n|')[0];
    const references = tableRows(text, route.style.rows);
    add('style-reference.md', '参考来源与确认边界', references.includes('S3/') ? intro + '\n\n' + references : references);
    for (const topic of route.style.sections) add('style-reference.md', topic, section(text, topic));
  }
  for (const risk of selectedRisks) {
    const [file, topic] = risks[risk];
    const text = await load(file);
    if (file === 'confirmed-cases.md') add(file, '版本与依据', section(text, '版本与依据'));
    add(file, topic, section(text, topic));
  }
  if (options.repair) for (const topic of ['变更影响', '证据复用与交接']) add('execution.md', topic, section(await load('execution.md'), topic));
  const heading = options.lesson ? '制作心得' : '当前阶段';
  const text = `# ${heading}：${stage}\n\n以下只摘取选定资料；并非独立批准或语义验收。原著/原画仍须实际查看。已读且未变的内容复用，失败才展开相关日志。\n\n` + chunks.map(c => `来源：references/${c.file} · ${c.topic}\n\n${c.text}`).join('\n\n');
  return { stage, bytes: Buffer.byteLength(text), text, sections: chunks.map(({ file, topic, text }) => ({ file, topic, bytes: Buffer.byteLength(text) })) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), stage = args.shift();
  const show = (result: Awaited<ReturnType<typeof buildSelection>>, stats: boolean) => {
    console.log(stats ? JSON.stringify({ stage: result.stage, bytes: result.bytes, sections: result.sections }, null, 2) : result.text);
  };
  const fail = (error: unknown) => { console.error(String(error)); process.exitCode = 1; };
  if (stage === '--lesson') {
    const [topic, flag, ...extra] = args;
    if (!topic || (flag && flag !== '--stats') || extra.length) fail(Error('Use --lesson TOPIC [--stats]'));
    else buildLesson(topic).then(result => show(result, flag === '--stats')).catch(fail);
  } else if (!stage || stage === '--help') console.log(`Usage: read-stage.ts STAGE [--risk TOPIC]... [--repair] [--stats]\n       read-stage.ts --lesson TOPIC [--stats]\nLessons: ${Object.keys(lessons).join(', ')}\nStages: ${Object.keys(routes).join(', ')}\nRisk topics: ${Object.keys(risks).join(', ')}\nOutputs only selected rules. --stats reports bytes/sections without loading content into the conversation; not a token meter.`);
  else {
    const selected: string[] = []; let repair = false, stats = false, error = '';
    while (args.length) { const a = args.shift(); if (a === '--risk' && args[0] && !args[0].startsWith('--')) selected.push(args.shift()!); else if (a === '--repair') repair = true; else if (a === '--stats') stats = true; else { error = `Invalid argument: ${a}`; break; } }
    if (error) { console.error(error); process.exitCode = 1; }
    else buildContext(stage, { risks: selected, repair }).then(result => show(result, stats)).catch(fail);
  }
}
