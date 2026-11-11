import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
type Route = { defaults: string[]; docs: Array<[string, string[]]>; style?: { rows: string[]; sections: string[] } };
export const routes: Record<string, Route> = {
  plan: { defaults: ['图稿与故事', '审稿', '封面与简介'], docs: [['source-fidelity.md', ['本节只建立一次的资料', '每镜五项信息', '两次检查，各有范围']], ['execution.md', ['阶段依赖']]], style: { rows: ['自然解说与情绪衔接'], sections: ['解说：原因接动作，冲突带情绪'] } },
  storyboard: { defaults: ['图稿与故事', '审稿'], docs: [['source-fidelity.md', ['两次检查，各有范围', '结构检查工具']], ['quality-checklist.md', ['分镜']]], style: { rows: ['日常/回忆彩图', '对话/人物关系彩图', '动作/冲击彩图'], sections: ['彩图：动画插画质感与可读的动作'] } },
  voice: { defaults: ['声线', '人声处理', '读音', '片头'], docs: [['execution.md', ['有限语音返修']], ['quality-checklist.md', ['配音']]], style: { rows: ['已确认音色', '已确认RE0连读'], sections: ['声音：保留已确认自然说话方式'] } },
  alignment: { defaults: ['字幕', '读音'], docs: [['quality-checklist.md', ['对齐']]] },
  visuals: { defaults: ['运镜与视频', '字幕', '片头', '片尾'], docs: [['quality-checklist.md', ['画面与混音']]], style: { rows: ['字幕与片头片尾实现'], sections: ['运镜、字幕与片头片尾'] } },
  sound: { defaults: ['配乐音效', '人声处理'], docs: [['quality-checklist.md', ['画面与混音']]], style: { rows: ['已确认音色'], sections: ['声音：保留已确认自然说话方式'] } },
  render: { defaults: ['运镜与视频', '字幕', '片头', '片尾', '人声处理'], docs: [['quality-checklist.md', ['画面与混音', '成片终检']]] },
  review: { defaults: ['运镜与视频', '字幕', '片头', '片尾', '人声处理'], docs: [['quality-checklist.md', ['成片终检']], ['execution.md', ['证据复用与交接']]] },
  covers: { defaults: ['封面与简介'], docs: [['quality-checklist.md', ['封面与简介']]], style: { rows: ['封面与标题'], sections: ['封面与标题：人物冲突与悬念'] } },
  package: { defaults: ['交付', '封面与简介'], docs: [['quality-checklist.md', ['打包与交付']], ['delivery-and-publishing.md', ['打包']]] },
  delivery: { defaults: ['交付'], docs: [['delivery-and-publishing.md', ['上传与核验', '仅素材邮件', '完成交付']]] },
};
const risks: Record<string, string> = { space: '家具背后与观察视线', props: '刀、鞭与佩戴状态', body: '身体受限与整体比例', fall: '高处扑击与动作方向' };
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
  const route = routes[stage]; if (!route) throw Error(`Unknown stage: ${stage}`);
  for (const risk of options.risks ?? []) if (!risks[risk]) throw Error(`Unknown risk: ${risk}`);
  const cache = new Map<string, Promise<string>>();
  const load = (name: string) => { if (!cache.has(name)) cache.set(name, readFile(path.join(root, 'references', name), 'utf8')); return cache.get(name)!; };
  const chunks: Array<{ file: string; topic: string; text: string }> = [];
  const add = (file: string, topic: string, text: string) => { if (!chunks.some(c => c.file === file && c.topic === topic)) chunks.push({ file, topic, text }); };
  add('production-defaults.md', '本阶段规格', tableRows(await load('production-defaults.md'), route.defaults));
  for (const [file, topics] of route.docs) for (const topic of topics) add(file, topic, section(await load(file), topic));
  if (route.style) {
    const text = await load('style-reference.md');
    const intro = section(text, '参考来源与确认边界').split('\n|')[0];
    const references = tableRows(text, route.style.rows);
    add('style-reference.md', '参考来源与确认边界', references.includes('S3/') ? intro + '\n\n' + references : references);
    for (const topic of route.style.sections) add('style-reference.md', topic, section(text, topic));
  }
  if (options.risks?.length) {
    const text = await load('confirmed-cases.md'); add('confirmed-cases.md', '版本与依据', section(text, '版本与依据'));
    for (const risk of options.risks) add('confirmed-cases.md', risks[risk], section(text, risks[risk]));
  }
  if (options.repair) for (const topic of ['变更影响', '证据复用与交接']) add('execution.md', topic, section(await load('execution.md'), topic));
  const text = `# 当前阶段：${stage}\n\n以下只摘取当前阶段资料；并非独立批准或语义验收。原著/原画仍须实际查看。已读且未变的内容复用，失败才展开相关日志。\n\n` + chunks.map(c => `来源：references/${c.file} · ${c.topic}\n\n${c.text}`).join('\n\n');
  return { stage, bytes: Buffer.byteLength(text), text, sections: chunks.map(({ file, topic, text }) => ({ file, topic, bytes: Buffer.byteLength(text) })) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), stage = args.shift();
  if (!stage || stage === '--help') console.log(`Usage: read-stage.ts STAGE [--risk space|props|body|fall] [--repair] [--stats]\nStages: ${Object.keys(routes).join(', ')}\nOutputs only selected rules. --stats reports bytes/sections without loading content into the conversation; not a token meter.`);
  else {
    const selected: string[] = []; let repair = false, stats = false, error = '';
    while (args.length) { const a = args.shift(); if (a === '--risk' && args[0] && !args[0].startsWith('--')) selected.push(args.shift()!); else if (a === '--repair') repair = true; else if (a === '--stats') stats = true; else { error = `Invalid argument: ${a}`; break; } }
    if (error) { console.error(error); process.exitCode = 1; }
    else buildContext(stage, { risks: selected, repair }).then(result => console.log(stats ? JSON.stringify({ stage, bytes: result.bytes, sections: result.sections }, null, 2) : result.text)).catch(e => { console.error(String(e)); process.exitCode = 1; });
  }
}
