# 制作工具与复现边界

本参考根据仓库中第一节《洗礼》的实现整理。下列命令均从仓库根目录运行；`chapter070` 是第七章的现有目录名。这里的 `section01`、24 镜、75 条正文字幕和 42 组语音属于第一节实例，不是后续各节的规格。

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

语音模块为 `src/server/narration/edge.ts`，依赖 `msedge-tts`，通过 Microsoft Edge Read Aloud 联网合成。它不是本地 TTS 模型，也不是蕾姆或声优的声纹克隆。服务失败应保留已有音轨并明确报错，不自动切换声音。

`.agents/skills/video-shotcraft/SKILL.md` 提供镜头制作参考。缺失时可检查并使用仓库的 `bash scripts/install_skill.sh` 恢复；它不会自动生成漫画、配音或完整解说视频。该技能目录目前被 `.gitignore` 忽略，不能只凭文档中的“已安装”认定新环境也有它。

## 找到当前版本

优先读取目标节目录中的当前 `video-manifest.json`、`video-delivery.json` 和该版本 README，确认文件存在及哈希。文件名里的 `v5` 本身不能区分衔接版和读音修正版。

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
| `npm run video:upload` | R2 上传入口 | 属于之前的备选交付方案，需要 R2 配置；当前默认交付平台是 Wormhole，此旧入口不表示已有 Wormhole 上传实现。 |

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

配音准备读取 `voice-direction.json` 的合成分组，生成实际语音时序；混音按照新镜头起止时间放置配乐与音效；最终时间线把混音、字幕、镜头和片尾组合起来。渲染后再打包 1080p、720p、无配乐版、SRT、ASS 和口播稿。打包脚本不会自动补齐音乐授权说明和片尾 PNG，需另行整理并加入交付清单。

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

### 片头读法与缓存检查

片头品牌直接念“RE0”。当前独立规则是 `references/intro-contract.json`，其中显示稿与允许的实际TTS输入分别列出；规则按最新用户要求维护，不能从待检查的配音计划自动生成。`原著 → 原住` 只能作为这一个词组的读音辅助，不能带出整句作品名替换。

制作本期计划后、正式合成或选择缓存之前，执行只读前置检查。以下路径中的节号和版本按本期实际目录替换：

```bash
npx tsx scripts/check-re0-intro.ts \
  --plan data/productions/chapter070/sectionNN/video-vN/mimo-plan.json \
  --direction data/productions/chapter070/sectionNN/video-vN/voice-direction.json
```

校验失败须先修正本期计划或代码，不能跳过检查继续合成。检查实际变换后的口播，不能只看字幕写着 `Re:0` 就通过。复用片头时使用同一检查入口的缓存参数，核对当前请求、独立规则及真实音频哈希；具体参数见 `npx tsx scripts/check-re0-intro.ts --help`。

缓存标识须包含规则版本与内容哈希、显示稿、口播稿、模型、声线及全部影响合成的参数。既有 `selection` 标记不能绕过检查。旧片头只有声线批准或缺少新缓存标识时不能直接复用；输入、声线、模型、语速、音高、样式、参考音频或其他合成参数变化均使该缓存失效。保留历史计划、音频和交付记录，生产入口与缓存校验代码的修改另记来源。

内容核对另存 `tts/records/intro-content-verification.json`，至少绑定独立规则哈希、实际音频SHA-256、核验方法、品牌与“原著”的核对结果，以及原始证据文件及其SHA-256。ASR方法读取真实识别文本，不能读取 `expectedSpeechText` 代替；听辨方法如实登记实际听审。该文件只能在完成真实检查后创建。待核验的合成断点作为候选保留，补齐证据后才可作为已验证片头复用；校验器只检查证据与音频、规则的对应关系，不自行生成“已听审”结论。

缓存校验使用 `--cache-record`、`--cache-audio`、`--request-context` 和 `--content-verification` 四个参数。请求上下文保存本次实际 `{ endpoint, body }`，`body` 包含服务收到的模型、口播消息及音频参数。内容记录字段为 `policySha256`、`audioSha256`、`method`、`literalBrandVerified`、`yuanZhuVerified`、`evidenceFile`、`evidenceSha256`。`raw-asr` 证据保存音频哈希、真实 `recognizedText` 和一致的 `rawResult.text`；`listening` 证据须如实记录 `actualListening` 与两项具体读法检查。结果为已核对时才写对应通过字段，不能把模板中的期望文本填成真实证据。

`policySha256` 使用前置检查命令输出的规范化JSON哈希，不能混用规则文件原始字节的哈希；若需登记来源文件字节哈希，另列字段。`identitySha256` 则绑定规则、两份文本及完整请求参数。

静态检查只验证计划与缓存一致性。源片头和最终成片开场还须核对真实声音，至少分别检查品牌读法与“原著”的 zhù。保留真实音频的原始ASR转写、方法和音频SHA-256；不能用期望稿、声线批准或文件来源相同替代声音内容核验。ASR有疑问时再用音频感知或真人听辨，无法判定则明确记录未核验。已有同请求、同规则、同音频的可靠检查可复用，无需每次重新向用户申请批准。

### 其他音画要求

- 默认声音为 `zh-CN-XiaoxiaoNeural`，语速基线 `0.97`。普通段落连续合成；重点对白可以按配音计划分组，用原生语速、轻微音高和音量变化及标点表达情绪。该服务不支持情绪 style 标签。不要为每条字幕单独合成而反复重置韵律。
- 当前合成脚本遇到服务合并字幕边界时会拆组重试。应查看实际生成组数和日志；若破坏连续性，调整标点或分组再合成，不能把“计划组数”冒充“实际组数”。
- 原始音高是默认值；已确认的正文分组中存在轻微原生音高设置。禁止用后期移调、逐句拉伸、均衡或降噪改变获认可的声音。整轨优先用固定增益保留轻重，成片目标约 `-18 LUFS`、真峰值不高于 `-2 dBTP`。
- 历史 `edge.ts` 将“昴”在语音输入中映射为“卯”，“原著”使用局部 `{ text: '原著', spoken: '原住' }` 发音覆盖，其词组覆盖有等 Unicode 字符数约束。片头品牌按独立规则分别登记显示稿和口播稿、使用新前置检查，不能为凑等长把 `Re:0` 展开成中文作品名。显示文本保留原字；艾米莉娅完整连写，不在姓名内插入空格或句界。
- `bilingual-bottom-fixed` 的中文字幕为 Noto Sans CJK SC 64，锚点 `(960,948)`；英文 DejaVu Sans 44，在 `y=954`、`1004` 固定排一至两行。字幕在运镜后叠加。换字体或字号后重新检查实际渲染范围。
- `scripts/lib/shot-camera.ts` 提供逐镜焦点和缓慢推进；已确认实例多为 `1.00 → 1.08–1.16`。人物关系和关键手脚始终可读，比套统一放大幅度更重要。renderer 的 4 倍、4:4:4 中间画布用于减轻缓慢推进的像素抖动。
- 混音保留人声主体，只对背景音乐作随人声衰减；音效在对应镜头内，峰值贴合动作。镜头变化后重新定位事件，不沿用第一节固定时间。授权来源、作者、下载地址和许可证保存在声音清单中。

## 小范围修复与验证

用户只改一张图、一个读音或标题时，先确认影响范围。保留已确认原稿和母版；图像修复只换受影响素材并重算缓存，语音修复优先只换相应分组。替换后时长不同就重排后续时序；仅在可验证的静音接点且时长保持一致时沿用现有时间线。

只改音频且画面和时间轴确实不变时，可直接复制视频流；保留修复前后 SHA-256、时长、帧数和未改区间的样本对照。不要把第一节的具体接点或固定增益套给新录音。

代码变化后按范围运行类型检查和相关测试：

```bash
npm run typecheck
npx vitest run tests/edge-narration.test.ts
```

上面的语音测试用于语音模块变化，不需要为单纯改文稿或图片重复执行全部应用测试。前端变更再运行构建及相应浏览器测试。

成片检查至少包含：完整解码、音画时长与同步、每镜首中末画面、全部字幕的边界与可读性、片尾接续、响度和真峰值。帧数、字幕数、镜头数从本节时间线读取。技术指标和自动字幕检查不能替代对读音、情绪或背景噪声的实际试听；未试听要如实说明。

完整制作的交付目录必须包含 1080p 成片、4:3 与 16:9 两张封面，以及 `description.txt` 视频简介；文稿、字幕、声音来源与清单一并归档，预览版按需附上。现有视频打包脚本不会自动生成两张封面和简介，须另行制作并补入交付清单。Wormhole 上传、完整分享链接保存及匿名下载后的解密文件校验按主技能的交付流程执行；过期链接不能作为新交付结果。

## 仓库依据

- `docs/productions/chapter070/section01/keyframes-v5/continuity/README.md`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/production.json`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/voice-direction.json`
- `docs/productions/chapter070/section01/keyframes-v5/continuity/intro-pronunciation/README.md`
- `scripts/prepare-chapter-expressive.ts`、`scripts/mix-chapter-soundtrack.ts`、`scripts/finalize-chapter-expressive.ts`
- `scripts/render-chapter-video.ts`、`scripts/package-chapter-keyframe-video.ts`、`scripts/repair-chapter-intro-pronunciation.ts`
- `src/server/narration/edge.ts`、`AGENTS.md`、`package.json`
