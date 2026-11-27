import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

type Language = 'chinese' | 'english';
type Options = {
  chineseStyles?: readonly string[];
  englishStyles?: readonly string[];
  allowEmpty?: boolean;
};
type PlayRes = { width: number; height: number };
type Position = { x: number; y: number; alignment: number };
type Anchor = Position & { file: string; line: number; style: string };
type Issue = { file: string; line?: number; style?: string; message: string };
type FileReport = { file: string; playRes: PlayRes | null; captions: Record<Language, number> };
type LayoutReport = {
  passed: boolean;
  files: FileReport[];
  captions: Record<Language, number>;
  issues: Issue[];
};

const defaultStyleFields = 'name,fontname,fontsize,primarycolour,secondarycolour,outlinecolour,backcolour,bold,italic,underline,strikeout,scalex,scaley,spacing,angle,borderstyle,outline,shadow,alignment,marginl,marginr,marginv,encoding'.split(',');
const defaultEventFields = 'layer,start,end,style,name,marginl,marginr,marginv,effect,text'.split(',');
const legacyAlignment: Record<number, number> = { 1: 1, 2: 2, 3: 3, 5: 7, 6: 8, 7: 9, 9: 4, 10: 5, 11: 6 };
const precision = 0.5;

function fields(value: string): string[] {
  return value.split(',').map(item => item.trim().toLowerCase());
}

function row(format: string[], value: string): Record<string, string> | undefined {
  const cells = value.split(',');
  if (cells.length < format.length || format.includes('text') && format.at(-1) !== 'text') return undefined;
  // The event's last field can contain arbitrary commas.
  const last = format.length - 1;
  const values = [...cells.slice(0, last), cells.slice(last).join(',')];
  return Object.fromEntries(format.map((name, index) => [name, values[index]!.trim()]));
}

function margin(style: Record<string, string>, event: Record<string, string>, field: string): number {
  const overridden = Number(event[field] || 0);
  const result = overridden === 0 ? Number(style[field]) : overridden;
  if (!Number.isInteger(result) || result < 0) throw Error('字幕边距必须是非负整数。');
  return result;
}

function findPosition(
  style: Record<string, string>,
  event: Record<string, string>,
  { width, height }: PlayRes,
): Position {
  if (/^(?:banner|scroll (?:up|down))(?:;|$)/i.test(event.effect ?? '')) {
    throw Error('字幕使用了滚动效果，无法保持固定锚点。');
  }

  const overrides = Array.from(event.text.matchAll(/\{([^{}]*)\}/g), match => match[1]).join(' ');
  // In libass these are event-level settings. If repeated, the first tag takes effect.
  const alignTag = /\\(an|a)\s*([+-]?\d+)(?=\s*(?:\\|[),]|$))/.exec(overrides);
  const alignment = alignTag?.[1] === 'a'
    ? legacyAlignment[Number(alignTag[2])]
    : Number(alignTag?.[2] ?? style.alignment);
  if (![2, 5, 8].includes(alignment)) throw Error(`字幕对齐为 ${alignment ?? '无效值'}，应使用水平居中对齐。`);

  const placement = /\\(pos|move)\s*\(([^()]*)\)/.exec(overrides);
  if (placement) {
    const cells = placement[2]!.split(',').map(cell => cell.trim());
    const isMove = placement[1] === 'move';
    const validLength = isMove ? [4, 6].includes(cells.length) : cells.length === 2;
    const values = cells.map(Number);
    if (!validLength || cells.some(cell => !cell) || values.some(value => !Number.isFinite(value))) {
      throw Error(`无法读取 \\${placement[1]} 中的字幕坐标。`);
    }
    const [x, y, endX, endY] = values;
    if (isMove && (Math.abs(x - endX) > precision || Math.abs(y - endY) > precision)) {
      throw Error(`字幕含移动锚点，起点 (${x}, ${y}) 与终点 (${endX}, ${endY}) 不同。`);
    }
    return { x, y, alignment };
  }

  const resetStyle = Array.from(overrides.matchAll(/\\r([^\\),]*)/g), match => match[1]!.trim())
    .find(name => name && name !== event.style);
  if (resetStyle) throw Error('字幕覆盖中重置了样式，无法核定默认边距。请给出实际采用的明确坐标。');

  const left = margin(style, event, 'marginl');
  const right = margin(style, event, 'marginr');
  const vertical = margin(style, event, 'marginv');
  if (left + right >= width) throw Error('字幕左右边距超出可用画幅。');
  const x = (width + left - right) / 2;
  const y = alignment === 2 ? height - vertical : alignment === 8 ? vertical : height / 2;
  return { x, y, alignment };
}

function parseAss(input: string, file: string, styles: Map<string, Language>) {
  let section = '';
  let styleFormat = defaultStyleFields;
  let eventFormat = defaultEventFields;
  const styleRows = new Map<string, Record<string, string>>();
  const scriptInfo: Record<string, string> = {};
  const events: { line: number; row: Record<string, string> }[] = [];
  const issues: Issue[] = [];
  const captions = { chinese: 0, english: 0 };
  for (const [index, raw] of input.replace(/^\uFEFF/, '').split(/\r?\n/).entries()) {
    const line = raw.trim();
    const heading = /^\[([^\]]+)\]$/.exec(line);
    if (heading) {
      section = heading[1]!.trim().toLowerCase();
      continue;
    }
    const entry = /^([\w]+)\s*:\s*(.*)$/.exec(line);
    if (!entry) continue;
    const key = entry[1]!.toLowerCase();
    const value = entry[2]!;
    if (section === 'script info') {
      scriptInfo[key] = value;
    } else if (section === 'v4+ styles') {
      if (key === 'format') styleFormat = fields(value);
      if (key === 'style') {
        const parsed = row(styleFormat, value);
        if (parsed?.name) styleRows.set(parsed.name, parsed);
      }
    } else if (section === 'events') {
      if (key === 'format') eventFormat = fields(value);
      if (key === 'dialogue') {
        const parsed = row(eventFormat, value);
        if (!parsed?.style || !parsed.start || !parsed.end || parsed.text === undefined) {
          issues.push({ file, line: index + 1, message: '无法读取 Dialogue 行的样式、时间和文字栏。' });
        } else if (styles.has(parsed.style)) {
          events.push({ line: index + 1, row: parsed });
          captions[styles.get(parsed.style)!]++;
        }
      }
    }
  }
  const width = Number(scriptInfo.playresx);
  const height = Number(scriptInfo.playresy);
  const validResolution = Number.isInteger(width) && Number.isInteger(height) && width > 0 && height > 0;
  const playRes = validResolution ? { width, height } : null;
  const report: FileReport = { file, playRes, captions };
  const anchors: { language: Language; window: string; anchor: Anchor }[] = [];
  if (!playRes) {
    issues.push({ file, message: 'ASS 必须显式声明正整数 PlayResX 和 PlayResY。' });
    return { report, issues, anchors };
  }

  for (const event of events) {
    const { style } = event.row;
    const issue = { file, line: event.line, style };
    const definition = styleRows.get(style);
    if (!definition) {
      issues.push({ ...issue, message: '找不到该字幕的 V4+ 样式定义。' });
      continue;
    }
    let position: Position;
    try {
      position = findPosition(definition, event.row, playRes);
    } catch (error) {
      issues.push({ ...issue, message: (error as Error).message });
      continue;
    }
    if (Math.abs(position.x - width / 2) > precision) {
      issues.push({ ...issue, message: `字幕横向锚点为 ${position.x}，画面中心为 ${width / 2}。` });
      continue;
    }
    const { y, alignment } = position;
    if (y <= height / 2 || y > height || (alignment !== 2 && y === height)) {
      issues.push({ ...issue, message: `字幕纵向锚点 ${y} 不在画面下半部。` });
      continue;
    }
    anchors.push({
      language: styles.get(style)!,
      window: `${event.row.start}/${event.row.end}`,
      anchor: { ...position, ...issue },
    });
  }
  return { report, issues, anchors };
}

export async function checkCaptionLayout(files: readonly string[], options: Options = {}): Promise<LayoutReport> {
  if (!files.length) throw Error('请提供至少一个实际烧录的 ASS 文件。');
  const styles = new Map<string, Language>();
  for (const [language, names] of [
    ['chinese', options.chineseStyles ?? ['Chinese']],
    ['english', options.englishStyles ?? ['English']],
  ] as const) {
    for (const name of names) {
      if (!name.trim() || styles.has(name) && styles.get(name) !== language) {
        throw Error('字幕样式名必须非空，且中英文不能共用同一样式名。');
      }
      styles.set(name, language);
    }
  }

  const captions = { chinese: 0, english: 0 };
  const reports: FileReport[] = [];
  const issues: Issue[] = [];
  const referenceAnchors = new Map<string, Anchor>();

  function compareAnchor(key: string, anchor: Anchor): void {
    const reference = referenceAnchors.get(key);
    if (!reference) {
      referenceAnchors.set(key, anchor);
    } else if (Math.abs(anchor.y - reference.y) > precision || anchor.alignment !== reference.alignment) {
      issues.push({
        file: anchor.file, line: anchor.line, style: anchor.style,
        message: `字幕纵向锚点或对齐方式发生变化，参照 ${reference.file} 第 ${reference.line} 行 (y=${reference.y}, an${reference.alignment})。`,
      });
    }
  }

  for (const file of files) {
    const result = parseAss(await readFile(file, 'utf8'), file, styles);
    reports.push(result.report);
    issues.push(...result.issues);
    captions.chinese += result.report.captions.chinese;
    captions.english += result.report.captions.english;
    const { playRes } = result.report;
    if (!playRes) continue;
    const resolution = `${playRes.width}×${playRes.height}`;
    const windows = new Map<string, Record<Language, Anchor[]>>();
    for (const item of result.anchors) {
      const group = windows.get(item.window) ?? { chinese: [], english: [] };
      group[item.language].push(item.anchor);
      windows.set(item.window, group);
    }
    // Independently positioned English rows in the same cue share a time window.
    // A multiline event using \N has a single anchor.
    for (const { chinese, english } of windows.values()) {
      for (const [index, anchor] of chinese.entries()) {
        const first = chinese[0]!;
        if (index > 0 && Math.abs(anchor.y - first.y) <= precision && anchor.alignment === first.alignment) {
          issues.push({ file, line: anchor.line, style: anchor.style, message: '同一字幕时段的中文行使用了同一锚点。' });
        } else {
          compareAnchor(resolution + '/chinese', anchor);
        }
      }
      english.sort((a, b) => a.y - b.y || a.alignment - b.alignment);
      let englishRow = 0;
      for (const [index, anchor] of english.entries()) {
        const previous = english[index - 1];
        if (previous && Math.abs(anchor.y - previous.y) <= precision && anchor.alignment === previous.alignment) {
          issues.push({ file, line: anchor.line, style: anchor.style, message: '同一字幕时段的英文行使用了同一锚点。' });
          continue;
        }
        if (englishRow < 2) {
          compareAnchor(resolution + '/english/' + englishRow, anchor);
        } else {
          issues.push({ file, line: anchor.line, style: anchor.style, message: '同一字幕时段出现超过两个独立英文锚点。' });
        }
        englishRow++;
      }
      const lastEnglish = english.at(-1);
      // An anchor's height does not describe its visible glyphs. Only flag a clear inversion.
      if (lastEnglish && chinese.length && lastEnglish.y < Math.min(...chinese.map(anchor => anchor.y)) - playRes.height * .05) {
        issues.push({ file, line: lastEnglish.line, style: lastEnglish.style, message: '此字幕时段英文整体明显高于中文。' });
      }
    }
  }
  if (captions.chinese + captions.english === 0) {
    if (!options.allowEmpty && !issues.length) {
      issues.push({ file: files[0]!, message: '未找到所选样式的字幕。只核无对白的 ASS 时可以传入 --allow-empty。' });
    }
  } else if (!captions.chinese || !captions.english) {
    const missing = captions.chinese ? '英文' : '中文';
    issues.push({ file: files[0]!, message: `未找到所选样式的${missing}字幕，请核对样式参数和输入文件。` });
  }
  return { passed: issues.length === 0, files: reports, captions, issues };
}

const usage = `用法
  npx tsx .agents/skills/re0-arc7-comic-video/scripts/check-caption-layout.ts [--zh-style Chinese] [--en-style English] [--allow-empty] FILE.ass [FILE.ass …]

传入同一成片实际烧录的 ASS，含 UTF-8 V4+ 样式及明确的 PlayResX、PlayResY。
默认核验 Chinese 和 English。样式参数可重复指定，替换该语言的默认名称。其他样式和注释跳过。
整组需同时有中文和英文。单个无对白文件可随其他 ASS 检查，整组有意无字幕时用 --allow-empty。
核对水平居中和固定纵锚，筛查锚点明显偏高或超出画幅。同一时段的英文分行须使用不同的锚点。
涵盖默认样式、边距覆盖和常用位置标签。实际字形、上下间距、遮挡及翻译完整性另看成片。`;

async function main(args: string[]): Promise<void> {
  if (args.length === 1 && args[0] === '--help') {
    console.log(usage);
    return;
  }
  const files: string[] = [];
  const chineseStyles: string[] = [];
  const englishStyles: string[] = [];
  let allowEmpty = false;
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]!;
    if (arg === '--zh-style' || arg === '--en-style') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw Error(`缺少 ${arg} 的样式名。`);
      (arg === '--zh-style' ? chineseStyles : englishStyles).push(value.trim());
    } else if (arg === '--allow-empty') {
      allowEmpty = true;
    } else if (arg.startsWith('--')) {
      throw Error(`未知参数 ${arg}。可用 --help 查看说明。`);
    } else {
      files.push(arg);
    }
  }
  const report = await checkCaptionLayout(files, {
    chineseStyles: chineseStyles.length ? chineseStyles : undefined,
    englishStyles: englishStyles.length ? englishStyles : undefined,
    allowEmpty,
  });
  console.log(JSON.stringify(report, null, 2));
  if (!report.passed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
