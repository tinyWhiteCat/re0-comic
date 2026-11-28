# 制作工具与复现边界

本页记录脚本入口、已知限制和音画实现。阶段顺序见[执行规则](execution.md)，规格与验收分别见[默认规格](production-defaults.md)和[验收清单](quality-checklist.md)。命令从仓库根目录运行。

## 运行前检查

```bash
node --version
command -v ffmpeg ffprobe
fc-match 'Noto Sans CJK SC'
fc-match 'DejaVu Sans'
```

Node 版本按 `package.json`，目前为 `>=22.12.0`。依赖缺失时运行 `npm ci`。检查 FFmpeg 的 H.264、AAC 和 libass 支持，以及两种字体的实际匹配结果。云端调用沿用当前环境的代理与 CA 信任，以真实请求结果核凭据可用性，日志不记录密钥。

镜头动效需要实现参考时查 `.agents/skills/video-shotcraft/SKILL.md`。缺失时先确认 `scripts/install_skill.sh` 存在，再按需运行 `bash scripts/install_skill.sh`。

## 找到当前版本

从本节 `production-state.json` 和适用的 `current-storyboard.json`、`current-video.json`、`current-materials.json` 定位采用文件和证据。沿指针查实际路径与哈希；旧节缺指针时从清单和回执回查。被忽略的 `data/productions/` 可能缺少音轨、模型、缓存和当期脚本，先确认依赖是否齐全。 [阶段状态工具](state-tool.md)

## 已有脚本能做什么

| 入口 | 能力与限制 |
| --- | --- |
| `scripts/check-re0-intro.ts` | 核片头计划、实际请求和缓存身份。执行参数见[片头检查](#片头读法与缓存检查)。 |
| 技能的 `scripts/production-state.ts`、`check-storyboard-sources.ts`、`check-caption-layout.ts`、`check-release-package.ts` | 分别查阶段依赖、原著映射、字幕布局和发布包结构。实际看图、听辨和授权状态按各阶段证据核对。 |
| `src/server/openai-camera.ts`、`src/server/camera-render.ts` | 工作台规划运镜后用本地 FFmpeg 合成，支持 720p 预览。完整节成片另按生产规格对齐实音、烧录双语字幕。 [工作台入口和参数](../../../../README.md#使用-openai-编排运镜和转场) |
| `src/server/mimo-tts.ts` | 工作台冰糖语音的服务入口。独立制作先核可用的合成脚本和真实请求，旧版 MiMo CLI 参数见[语音接口记录](../../../../docs/mimo-tts.md)。 |
| 当期目录中的对齐、混音和渲染脚本 | 先读参数及依赖，再按采用分镜、音轨和时间线运行。仓库只跟踪通用阶段检查和片头校验等入口。旧脚本的 `--help` 是否只读，以脚本实际实现为准。 |

## 第一节已有输入的复现顺序

第一节的脚本参数、依赖、固定版本和完整命令链集中在[历史工具链快照](history/section01-toolchain.md#第一节已有输入的复现顺序)。

## 制作下一节时怎样复用

先按[变更影响](execution.md#变更影响)核目标目录、缓存和脚本写入点。遇到旧工具固定镜数、片头、片尾、音效编号或输出路径时，从本期计划读取这些值。旧文件可能连同版本号一起被覆盖，运行前先核实际 CLI 和输出位置。显式区分口播读音别名与显示文本。旧 `prepare-chapter-expressive.ts` 的 `speechText` 仅调整标点和空白，接入词组别名需要单独实现 `pronunciationOverrides`。

## 音画实现要点

### 片头读法与缓存检查

以[片头合同](intro-contract.json)为准。在合成或选择缓存前检查实际将要发送的请求，先修正检查失败项。请求 JSON 记录 `{ endpoint, body }`，认证信息由服务传入。

```bash
npx tsx scripts/check-re0-intro.ts \
  --plan data/productions/chapter070/sectionNN/video-vN/mimo-plan.json \
  --direction data/productions/chapter070/sectionNN/video-vN/voice-direction.json \
  --request-context data/productions/chapter070/sectionNN/video-vN/tts/records/intro-request.json
```

检查缓存时同时传 `--cache-record`、`--cache-audio` 和独立的 `--content-verification`。缓存身份 `identitySha256` 绑定规则版本、显示稿、口播稿、模型、声线及实际合成参数。实际音频哈希、缓存身份和独立内容证据都须匹配。参数说明可用 `npx tsx scripts/check-re0-intro.ts --help` 查看。

内容核对可存 `tts/records/intro-content-verification.json`，字段包括 `policySha256`、`audioSha256`、`method`、`literalBrandVerified`、`yuanZhuVerified`、`evidenceFile`、`evidenceSha256`。`policySha256` 使用检查器输出的规范化规则哈希。`evidenceFile` 可用绝对路径，或相对内容记录的路径。独立证据须绑定可复核的原始结果和音频哈希。

`raw-asr` 需要真实 `recognizedText` 和与其一致的 `rawResult.text`。`listening` 需要实际试听和两项读法检查。数字 `0` 的识别结果若无法确定语言读法，再补声音证据。校验器只做身份和证据校验，输出中的 `actualListening` 为 `false`。源音与最终 AAC 的验收范围见[配音和成片清单](quality-checklist.md#配音)。

### 其他音画要求

- MiMo 不提供逐词时间。正式字幕从冻结的采用音频另行对齐。第 28 节的 `alignment/align-ctc.ts --only <镜号或 intro>` 可更新一组，依赖本地 ONNX 模型和 `sherpa-onnx-node`，需先检查模型、运行库和配置路径。逐组缓存核模型、脚本、实际音频与显示稿、口播稿。对齐结果由 `alignment/build-subtitles.ts` 组成字幕；`alignment/audit-timing.ts` 用独立识别结果检查实音锚点。
- 第 28 节的 `render/render-video.ts` 接受 `--root`、`--jobs` 和 `--sample`。它读取本节时间线、相机计划、图层、ASS 和混音，按段合成，字幕在运镜后烧录。布局尺寸、样式和取样参数按本期实际计划。第 28 节的渲染和校验脚本属于本节工作区，迁移前检查其中相对路径、缓存键和帧率。
- `render/verify-video.ts --frames` 会从当前渲染清单定位 MP4、核文件哈希、解码和抽帧。要查样片，渲染和验收都传同一个 `--sample` 值。输出当前版本报告后，再按[终检清单](quality-checklist.md#成片终检)实看声画。

## 小范围修复与验证

1. 冻结旧采用目录和时间线。取实音或哈希匹配的对齐结果作裁接依据。按本期采样率和帧率换算样本边界，比例无法整除时使用一致的有理时间基准，避免逐段舍入累积。
2. 整帧对齐后按 `deltaFrames = newFrames - oldFrames`、`deltaSeconds = deltaFrames / fps` 更新时序。仅在替换点之后正文、原音和相对时序都相同时，才整段平移字幕、镜头、配乐与音效，否则重对齐受影响的区间。 [第二节案例](section02-lessons.md#局部替换的同步与验收)
3. 等长补录也会改变音节入点和字幕边界，按新实音更新相关 cue 及声音事件。画面与字幕时间未变时可复制视频流；字幕烧录起止改变时只重编相应段。合片核对视频包哈希、时间戳、实际帧数和段界，再按一致区间继承画面证据。第 28 节可参考 `render/check-patch-isolation.ts`。
4. 对旁白、混音 WAV 分别逐样本比较补丁窗外的 PCM。最终 AAC 如整轨重编，按有效采样时间对齐两版解码结果，另记修补窗内外的差值 RMS、峰值和异常时点。只对实际相等的对象和区间记录逐样本一致。复看最终画面进出点与更新的字幕，并从最终 AAC 连听目标词、补丁接缝和邻句。无法试听时，分别登记实看的画面和完成的音频技术检查。 [第 28 节成片复盘](../../../../docs/productions/chapter070/section28/retrospective.md#配音字幕与成片)

批量抽帧按当前成片帧号排序去重，同帧保留全部检查用途，字幕中点须落在实际可见区间。FFmpeg `select` 条件多时，将 `eq(n,帧号)` 按两半递归组合成平衡括号表达式，或分批取帧，避免平铺求和达到解析深度上限。抽帧目录绑定成片哈希，核实际输出数量、编号、帧号与清单的对应关系。

### 句末声调与旁白补丁

同一专名反复出现时，按采用文稿逐处定位。若遇句首识别漏字或强制对齐置信偏低，对照同声线的句中读法、源录音和制作音的有声区间，核音节完整性与剪接点。

补录沿用已采用的声线和合成参数。按触发位置带上下文，句首可加入前文末句，句末声尾不全可加辅助后句。在实测低电平处定裁点，保留完整词组，去掉辅助句。有安全接点时用原窗样本数等长替换，缺少安全接点时重新合成受影响语义组。重试次数按[有限语音返修](execution.md#有限语音返修)。

原始服务音频、归一化采用音频各留哈希，例如 `sourceAudioSha256` 与 `audioSha256`。在冻结混音中只替换对应旁白贡献，用固定增益按原有声道映射匹配，记录旁白增益和总增益。在有配乐和无配乐版本分别核窗外样本。完整末句仍处在原字幕窗时可沿用窗口，同时刷新逐词时序。新音超窗时按实际边界重排。 [第五节句末声调案例](section05-revision-lessons.md#句末声调与最小音频修复)

## 仓库依据

通用实现从 `package.json`、`scripts/check-re0-intro.ts`、`scripts/lib/re0-intro-contract.ts` 和技能的 `scripts/` 查起。第 28 节的对齐、渲染、返修脚本路径相对于 `data/productions/chapter070/section28/video-v1/`，详细证据索引见[制作复盘](../../../../docs/productions/chapter070/section28/retrospective.md)。
