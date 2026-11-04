# 制作工具与复现边界

新制作先读[执行规则](execution.md)。本文件用于查找旧脚本接口与复现边界，不作为每阶段必读材料。配音检查并冻结后才进入正式对齐、混音和渲染；下列历史执行示例不允许越过该顺序。

本参考保留第一节《洗礼》的实现说明，并补充第二节的已确认样音复用、局部替换和时序校验。下列命令均从仓库根目录运行；`chapter070` 是第七章的现有目录名。这里的 `section01`、24 镜、75 条正文字幕和 42 组语音属于第一节实例，不是后续各节的规格。第二节的实际返修过程见[制作复盘](section02-lessons.md)。

本技能提交只包含流程文档、模板和项目说明，不包含制作脚本及生成素材。下文部分脚本和记录可能仅存在于制作工作区；执行前逐项确认文件和依赖存在。干净 checkout 缺少时，按流程补齐实现或恢复所需输入，不直接运行历史命令。

## 运行前检查

开始本期正式配音、混音或视频渲染前，检查用户是否已明确确认当前版本的分镜图与逐镜台词。未确认时先按主技能交付分镜稿并等待回复；这些命令不能代替用户审稿。现有脚本没有自动验证确认状态，须由执行任务的 Agent 核对制作记录。已经确认的同版本无需重复确认。

应用逻辑、制作脚本和测试使用 TypeScript。需要扩展操作界面时，使用 React、Vite 和 Ant Design，先检查组件库已有能力。当前合成由 FFmpeg 完成，不要求迁移到 Remotion。

```bash
node --version
command -v ffmpeg ffprobe
fc-match 'Noto Sans CJK SC'
fc-match 'DejaVu Sans'
```

`package.json` 要求 Node.js `>=22.12.0`。依赖缺失时运行 `npm ci`；已有依赖无需为每次制片重装。FFmpeg 需要 H.264/AAC 编码及 libass 字幕支持。运行云端语音或上传之前，按当前环境规则检查网络；保留已有代理和证书设置。

当前新制作使用 `src/server/narration/mimo.ts` 与 `scripts/mimo-tts.ts`，按用户确认显式指定MiMo冰糖参数，接入方式见[MiMo说明](../../../../docs/mimo-tts.md)。历史 `src/server/narration/edge.ts` 依赖 `msedge-tts`，通过 Microsoft Edge Read Aloud 联网合成，用于旧版复现；这些服务不代表蕾姆或声优声纹克隆。服务失败应保留已有音轨并明确报错，不自动切换声音。

云环境的凭据就绪状态按当前环境技能核验。网络密钥可能由代理注入，环境变量为占位值不能单独证明密钥缺失；保留代理和CA信任，核对服务目标及实际请求结果，不打印密钥值。

`.agents/skills/video-shotcraft/SKILL.md` 提供镜头制作参考。缺失时可检查并使用仓库的 `bash scripts/install_skill.sh` 恢复；它不会自动生成漫画、配音或完整解说视频。该技能目录目前被 `.gitignore` 忽略，不能只凭文档中的“已安装”认定新环境也有它。

## 找到当前版本

优先读取目标节的当前版本指针，再打开它指向的清单、验收与交付记录，确认文件存在及哈希。第二节使用 `current-video.json`、`current-intro-audition.json`，版本目录内有 `delivery-latest.json`、`intro-approval.json` 和 `final-review.json`；旧流程也可能使用 `video-manifest.json`、`video-delivery.json` 和README。文件名中的版本号或目录刚生成，不代表已经批准或交付。只有对应阶段实际完成后才更新指针，并保存旧指针快照。

第一节最新参考位置：

| 内容 | 路径 |
| --- | --- |
| 原著 | `source/novel/chapter070/01.md` |
| 定稿、英文翻译、配音与运镜计划 | `docs/productions/chapter070/section01/keyframes-v5/continuity/` |
| 彩色关键帧 | `public/comics/chapter070/section01/keyframes-v5/shot-01.png` 至 `shot-24.png` |
| Re:0 片尾字标 | `public/comics/chapter070/section01/keyframes-v5/overlays/outro-re0.png` |
| 最新读音修复记录 | `docs/productions/chapter070/section01/keyframes-v5/continuity/intro-pronunciation/` |
| 最新成片及字幕 | `data/productions/chapter070/section01/keyframes-v5/video/continuity/intro-pronunciation/delivery/` |

`data/productions/` 中的音轨、缓存、浏览器辅助脚本及 QA 脚本是本地工作产物，并未随仓库跟踪。新 checkout 缺少这些文件时，先列出缺少的输入，再恢复素材或适配制作脚本。不要将历史目录存在于当前机器等同于完整的一键部署能力。

## 已有脚本能做什么

| 脚本或命令 | 已实现的入口 | 使用限制 |
| --- | --- | --- |
| `npm run video:prepare` | `--revision 3\|5`、`--sample`、`--voice`、`--rate`、`--output-dir` | 默认仍是旧版 revision 3；v5 强制第一节 24 镜。还从 `RE0_VIDEO_TOOLS` 或 `../re0-video-tools` 加载 `sherpa-onnx-node` 读写 WAV，该包不在主项目依赖内。 |
| `prepare-chapter-bilingual-audio.ts` | 无通用章节参数 | 固定第一节的片头文案、旧混音路径与音乐。创建片头音轨和 `intro-metadata.json`；已加入“原著”的发音覆盖。 |
| `prepare-chapter-bilingual.ts` | 无通用章节参数 | 固定第一节标题与 70 条旧版正文字幕，生成旧版双语基础时间线。当前正文已经是 75 条，不能把这个旧脚本作为最新稿的翻译入口。 |
| `prepare-chapter-expressive.ts` | `--config PATH` | 读取配音、翻译、镜头与输出配置，但片头仍固定从第一节 `video/bilingual/` 读取；帧率固定 24。未传配置时保留旧 70 条字幕、JoJo 箭头片尾等默认值。 |
| `mix-chapter-soundtrack.ts` | `--timeline`、`--directory`、`--docs-manifest`、`--edition` | 可对第一节新时间线重新排布声音，但音乐库、镜头编号与音效事件仍写在脚本中；新节需适配。旧 `--outro-hit` 用于箭头落定，当前 Re:0 片尾不用。 |
| `finalize-chapter-expressive.ts` | `--directory`、`--narration-timeline`、`--sound-manifest`、`--output` | 校验混音时长、旁白哈希和素材哈希，再生成最终时间线；各默认路径仍指向第一节旧版。 |
| `npm run video:render` | `--timeline`、`--output`、`--preview SEGMENT_ID`、`--visuals-only` | 输入 schema 固定 1920×1080、24 fps；revision 5 使用满幅关键帧。必须明确传时间线，默认路径仍指向 revision 3。 |
| `package-chapter-keyframe-video.ts` | `--directory`、`--source` | 强制 revision 5、24 镜，固定输出文件名，并写回第一节 `docs/.../video-manifest.json`。新节不能原样调用。 |
| `repair-chapter-intro-pronunciation.ts` | 无通用章节参数 | 只修复已冻结第一节母版的第一句，校验旧母版的固定 SHA-256；不是任意视频的读音修复器。 |
| `npm run video:upload` | R2 上传入口 | 属于之前的备选交付方案，需要 R2 配置；当前视频默认上传至 [Wormhole](https://wormhole.app/)，核验后在聊天中给链接，只有非视频素材发邮件。此命令仍是 R2 入口，不能用于 Wormhole。 |

可安全查看已有帮助：

```bash
npm run video:prepare -- --help
npm run video:render -- --help
npx tsx scripts/mix-chapter-soundtrack.ts --help
```

不要向其他脚本猜测传入 `--help`：部分脚本不会识别它，可能直接开始制作或覆盖产物。

## 第一节已有输入的复现顺序

这是第一节衔接版的既有复现链，需已有彩图、`timeline-bilingual.json`、`video/bilingual/intro-voice-mono.wav`、片头元数据和 `video/sound-design/` 的音乐及音效。运行会重写对应版本的产物；修订时先建立新的版本目录并适配所有输出路径。不要为了制作下一节运行这组第一节命令。

```bash
npx tsx scripts/prepare-chapter-expressive.ts \
  --config docs/productions/chapter070/section01/keyframes-v5/continuity/production.json

npx tsx scripts/mix-chapter-soundtrack.ts \
  --timeline data/productions/chapter070/section01/keyframes-v5/video/continuity/narration-timeline.json \
  --directory data/productions/chapter070/section01/keyframes-v5/video/continuity/sound-design \
  --docs-manifest docs/productions/chapter070/section01/keyframes-v5/continuity/sound-design.json \
  --edition continuity-re0-20261030

npx tsx scripts/finalize-chapter-expressive.ts \
  --directory data/productions/chapter070/section01/keyframes-v5/video/continuity \
  --narration-timeline data/productions/chapter070/section01/keyframes-v5/video/continuity/narration-timeline.json \
  --sound-manifest docs/productions/chapter070/section01/keyframes-v5/continuity/sound-design.json \
  --output data/productions/chapter070/section01/keyframes-v5/video/continuity/timeline.json

npm run video:render -- \
  --timeline data/productions/chapter070/section01/keyframes-v5/video/continuity/timeline.json \
  --output /workspace/artifacts/re0-chapter07-section01-v5-continuity.mp4

npx tsx scripts/package-chapter-keyframe-video.ts \
  --directory data/productions/chapter070/section01/keyframes-v5/video/continuity \
  --source /workspace/artifacts/re0-chapter07-section01-v5-continuity.mp4
```

配音准备读取 `voice-direction.json` 的合成分组，生成实际语音时序；混音按照新镜头起止时间放置配乐与音效；最终时间线把混音、字幕、镜头和片尾组合起来。渲染后由打包脚本整理出 1080p、720p、无配乐版、SRT、ASS 和口播稿等交付文件。正式交付时，各视频单独提供下载，字幕和口播稿等非视频资料另行打包为素材 ZIP。打包脚本不会自动补齐音乐授权说明和片尾 PNG，需另行整理并加入交付清单。

最新读音修正版是在冻结的衔接版母版上执行以下专用修复得到的：

```bash
npx tsx scripts/repair-chapter-intro-pronunciation.ts
```

只有它要求的旧母版、音轨和元数据仍完整且哈希匹配时才可执行。修复在静音处接回旧音轨，固定增益匹配首句响度，保留后续 PCM 和全部视频流。重新合成整段片头可能改变时长；不能把新的片头元数据配给旧时间线，也不能删除哈希检查来强行执行。

## 制作下一节时怎样复用

1. 为新节建立独立的 `docs/productions/chapter070/sectionNN/`、`public/comics/chapter070/sectionNN/` 和 `data/productions/chapter070/sectionNN/`。镜头数按本节内容决定，不为兼容旧脚本硬凑 24 镜。
2. 先准备本节原著映射、角色参考、逐镜稿、英文字幕、配音分组、焦点和声音事件。保存实际原著路径与 SHA-256。
3. 在 TypeScript 中把上述脚本残留的章节路径、片头文本及音轨、镜头数量、声音事件、片尾和输出文件名改为明确配置。检查所有写入点，保证不会写回第一节。修改完成前不声称“已支持任意章节”。
4. 当前 `prepare-chapter-expressive.ts` 的 `speechText` 只能调整标点和空白，不能通过改写显示文本塞入同音字。需要发音别名时，将 `pronunciationOverrides` 正式接入调用；字幕继续保留原字。
5. 按“生成完整图文分镜稿 → 交付用户审阅 → 等待用户明确确认当前版本 → 语音 → 真实时间码 → 声音混合 → 镜头与字幕渲染 → 检查与打包”的顺序执行。剧情或图文发生实质修改时，重新确认受影响内容。文字或语音时长变化后，重算受影响的字幕、音效和镜头时间，不沿用旧时间码。
6. 用户确认分镜稿后，先渲染关键镜头和片尾连接处，技术检查通过再出完整成片。参数 `--preview shot-20` 属于现有 renderer；本节的实际镜头 ID 需从时间线读取。

## 音画实现要点

- 2026-11-02 的后续确认将新制作默认改为 MiMo 冰糖原始音色和默认语速，见[样音与参数记录](../../../../docs/voice-profiles/mimo-bingtang-default.md)。通过 `npm run voice:mimo` 显式指定 `mimo-v2.5-tts` 与 `voice: 冰糖`；顶层及每组均不传 `style`，正文不加括号语气或速度标签，不使用克隆参考音频。通用 CLI 省略音色时仍为茉莉，历史 A 描述和晓晓命令仅用于复现。
- MiMo 不返回逐词时间；清单只有实际分组时长，正式字幕需要另行对齐。现有晓晓脚本保留用于旧成片复现，其 `zh-CN-XiaoxiaoNeural`、语速 `0.97` 和原生语速、音高、音量设置不直接套给 MiMo。Edge 不支持情绪 style 标签。两条流程都按完整语义组连续合成，不按每条字幕重启。
- 历史 Edge 合成脚本遇到服务合并字幕边界时会拆组重试。应查看实际生成组数和日志；若破坏连续性，调整标点或分组再合成，不能把“计划组数”冒充“实际组数”。
- 冰糖使用服务默认音高和语速，保留 API 原样音频；制作流程转换采样格式时保持内容和时长。历史 Edge 正文分组中的轻微原生音高设置不套用到冰糖。人声只用固定增益调音量，不加后期移调、时间拉伸、均衡、降噪或压缩；成片目标约 `-18 LUFS`、真峰值不高于 `-2 dBTP`，峰值约束优先。
- `edge.ts` 已将“昴”在语音输入中映射为“卯”；“原著”使用局部 `{ text: '原著', spoken: '原住' }` 发音覆盖。覆盖词需等 Unicode 字符数，显示文本不改。艾米莉娅完整连写，不在姓名内插入空格或句界；首先调整上下文并重生成含名段落。
- `bilingual-bottom-fixed` 的中文字幕为 Noto Sans CJK SC 64，锚点 `(960,948)`；英文 DejaVu Sans 44，在 `y=954`、`1004` 固定排一至两行。字幕在运镜后叠加。换字体或字号后重新检查实际渲染范围。
- `scripts/lib/shot-camera.ts` 提供逐镜焦点和缓慢推进；已确认实例多为 `1.00 → 1.08–1.16`。人物关系和关键手脚始终可读，比套统一放大幅度更重要。renderer 的 4 倍、4:4:4 中间画布用于减轻缓慢推进的像素抖动。
- 混音保留人声主体，只对背景音乐作随人声衰减；音乐与音效需要有可听见的层次。木棒击中、切断枝叶等实际动作单独安排音效，峰值贴合动作或对应解说。镜头或配音变化后重新定位事件，不沿用第一节固定时间。授权来源、作者、下载地址和许可证保存在声音清单中。

## 小范围修复与验证

用户只改一张图、一个读音或标题时，先确认影响范围。保留已确认原稿和母版；图像修复只换受影响素材并重算缓存，语音修复优先只换相应分组。替换后时长不同就重排后续时序；仅在可验证的静音接点且时长保持一致时沿用现有时间线。

对读法或节奏返修，先用短样核验问题；用户要求试听或当前读法、节奏仍需用户选择时，再交付短样确认，其他情况按已有授权执行。用户已批准的同一录音可直接复用。第二节最终片头使用已确认的4.32秒源音，本轮没有新的TTS请求。保留试听MP3、API原样WAV、制作WAV各自的哈希和转换关系，按批准记录选取无损源，不重新合成同一句，也不覆盖此前待确认或ASR检查记录。节号、文字或声线变了，应生成并检查新的录音。

片段长度变化时按以下顺序处理：

1. 为修订建立新目录，冻结旧时间线、图稿、源音、混音声部、字幕、镜头参数和批准记录。确认改动只是局部，再决定哪些内容可以复用。
2. 从实际音频或已有且哈希匹配的对齐结果获取边界，为新片段添加必要首尾留白并整帧对齐。只用固定增益匹配音量，不拉伸获批录音来凑旧时长，也不在已确认连读的音节间加静音。
3. 计算 `deltaFrames = newFrames - oldFrames`，以及 `deltaSeconds = deltaFrames / fps`。只有替换点后的正文文字、原音和相对时序都不变时，才将字幕、逐词边界、镜头起点、音乐段和音效事件统一平移；正文也改了就重新对齐受影响区间。
4. 校验接点的采样边界与画面帧边界。按当前采样率和帧率计算，不能机械套用第二节的48kHz、24fps、每帧2000采样；不是整数采样比时须使用一致的有理时间基准，检查舍入累积和接缝。
5. 对未改区间比较解码后的PCM，对源录音、图片和可复用底片核对哈希。背景声还须衔接连续，逐项复核动作音效锚点。区别源文件字节一致、增益后源音保持、正文PCM一致和最终AAC质量检查。
6. 缓存复用还要核对运镜、裁切、滤镜、帧数、尺寸和编码规格。烧录字幕随时间轴改变时重新生成；新片头、接缝和受影响字幕实际抽帧检查，最终视频做一次完整解码及AAC响度/真峰值测量。已确认未变的部分可依据充分证据继承旧审查，不为局部返修重做所有图稿检查。
7. 重建包含新字幕和口播稿的非视频素材包，按实际上传与邮件结果记录交付。待确认样音、用户已批准源音、已生成成片、已验证下载分别标记；批准原样音不等于代理已试听最终混音。

第二节v7→v8的例子是151帧变114帧，正文统一前移37帧；26组原音、140条正文字幕的相对顺序及正文PCM保持。具体数值和证据见[第二节复盘](section02-lessons.md#局部替换的同步与验收)，不作为下次修复的硬编码。

只改音频且画面和时间轴确实不变时，可直接复制视频流；保留修复前后 SHA-256、时长、帧数和未改区间的样本对照。不要把第一节的具体接点或固定增益套给新录音。

代码变化后按范围运行类型检查和相关测试：

```bash
npm run typecheck
npx vitest run tests/edge-narration.test.ts
```

上面的语音测试用于语音模块变化，不需要为单纯改文稿或图片重复执行全部应用测试。前端变更再运行构建及相应浏览器测试。

完整新片检查至少包含：完整解码、音画时长与同步、每镜首中末画面、全部字幕的边界与可读性、片尾接续、响度和真峰值。局部修复按上面的变更范围检查，并保留可继承的旧验收证据。帧数、字幕数、镜头数从本节时间线读取。技术指标和自动字幕检查不能替代对读音、情绪或背景噪声的实际试听；代理未试听要如实说明，用户对特定样音的实际确认另行记录。

完整制作的交付目录必须包含 1080p 成片、4:3 与 16:9 两张封面，以及 `description.txt` 视频简介；文稿、字幕、声音来源与清单一并归档，预览版按需单独提供下载。各视频单独交付，只将非视频资料打包为素材 ZIP，不直接压缩整个交付目录。现有视频打包脚本不会自动生成两张封面和简介，须另行制作并补入交付清单。按主技能的默认地址 https://wormhole.app/ 上传视频并核验下载，在聊天中提供完整链接；素材 ZIP 才发邮件，已有相同素材的接受回执时不重复发送。过期链接不能作为新交付结果。

## 仓库依据

- `docs/productions/chapter070/section01/keyframes-v5/continuity/README.md`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/production.json`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/voice-direction.json`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/intro-pronunciation/README.md`
- `scripts/prepare-chapter-expressive.ts`、`scripts/mix-chapter-soundtrack.ts`、`scripts/finalize-chapter-expressive.ts`
- `scripts/render-chapter-video.ts`、`scripts/package-chapter-keyframe-video.ts`、`scripts/repair-chapter-intro-pronunciation.ts`
- `src/server/narration/edge.ts`、`AGENTS.md`、`package.json`
- `src/server/narration/mimo.ts`、`scripts/mimo-tts.ts`、`docs/voice-profiles/mimo-bingtang-default.md`
- 第二节忽略目录中的 `intro-connected-audition/approval.json`、`video-v8-connected-intro/intro-replacement.json`、`final-review.json`、`delivery-latest.json`；本地存在时才可用于复核。
