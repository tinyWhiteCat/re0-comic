# 冰糖默认音色与语速

2026-11-02，用户试听不加语气或速度控制的冰糖样音后，确认将它用于后续 Re:0 第七章漫画解说。用户原话：

> 原始的音色我觉得就行，速度也OK，使用原始音色吧，另外你可以加入一些音效么？比如角色被木棒击中、割开树枝等，现在音效和背景音乐有点缺失，听觉感受不丰富。

当前默认是 `mimo-v2.5-tts` 的“冰糖”预设音色和服务默认语速。此前的 [A「清澈轻柔」](mimo-clear-soft-a.md)及其他候选保留用于历史复现，不再作为新制作的默认值。这次确认采用冰糖预设，不涉及参考音频克隆，也不表示复刻了蕾姆声优。

## 已确认参数

| 项目 | 当前要求 |
| --- | --- |
| 模型 | `mimo-v2.5-tts` |
| `voice` | `冰糖` |
| `style` | 顶层和各语音组均不提供 |
| 语速 | 使用服务默认值，不传速度调整指令 |
| 语气与速度标签 | 不在 TTS 文本中加入 `(语速较快)` 等括号控制标签 |
| 参考音频 | 不提供 `referenceAudioFile`，不使用 `voiceclone` |
| 人声处理 | 不加均衡、降噪、压缩、后期变调或时间拉伸；混音时只用固定增益安排人声音量 |
| 语音分组 | 按每镜或完整语义组合成，不按每条字幕重启 |

保留正常标点及必要的词组级读音处理。样音中 `原著 → 原住`、`昴 → 卯` 只作用于 TTS 输入，显示稿仍写“原著”和“昴”。专名连续输入，不在姓名内部断句。

用户于 2026-11-02 进一步要求 RE0 连着读，指出上一版 `R，E，零` 停顿过长。读法仍是英文字母 R、E 加数字“零”，三个音自然连读，不逐字停顿；取消强制用逗号隔开的 TTS 输入规则。之后先交付开头几秒的音频，用户试听后确认：

> 没问题了，以这种方式重新生成视频吧

这次确认覆盖 `R E零，帝国篇原住解说，第七章第二节。` 对应的片头样音，显示稿仍写 `Re:0` 和“原著”。模型为 `mimo-v2.5-tts`，音色为冰糖，保持默认语速，顶层和语音组均不传 `style`。本次视频直接复用已确认源录音，不重新合成这句话，避免读法或停顿变化。

### 已确认的第二节连读片头

目录：`data/productions/chapter070/section02/intro-connected-audition/`。以下文件均在 Git 忽略目录，保留原件，不依赖临时下载链接；两份 WAV 的时长均为 4.32 秒。

| 文件（相对样音目录） | 用途 | SHA-256 |
| --- | --- | --- |
| `Re0-Arc7-E02-connected-intro-audition.mp3` | 用户试听文件 | `22409951b4f1b4a94b87d9b5e345e12917aaafcbba9a5f6b6138efba49f94c02` |
| `candidate-a/groups/intro.wav` | 48 kHz 制作副本，本次复用源 | `cc7447543fe240b1133b3814b5fddbe451e0064a0cd545bcfa3fd80dee9f0779` |
| `candidate-a/original-api-24000.wav` | 24 kHz API 原样 WAV | `3813c31d032b5afbcf1d328dde3e67efa649e1bb4e6a4d82d9031fe6d08764b9` |

实际输入保存在 `mimo-plan-a.json`，生成清单为 `candidate-a/manifest.json`，技术检查为 `audio-qa/candidate-a-review.json`。保留原 ASR 结果和 `actualListening: false`：它们记录代理当时的检查方式，不改写为代理已经听音；用户后续明确试听确认记录在上面。

以后相同片头可核对文本、版本及音频哈希后复用。节号或其他文字改变时，不能套用这段录音，应按当前冰糖默认参数生成并检查新音频；本次确认不代表用户已确认所有新文本的读法。此前冰糖原始音色与语速的确认也继续按其原范围保留。

## 样音来源与校验

样音目录为 `data/productions/chapter070/section02/bingtang-default-audition/`。以下路径均相对仓库根目录，音频位于 Git 忽略目录；保存原件，不依赖临时分享链接。

### API 原样 WAV

- 保留文件：`data/productions/chapter070/section02/bingtang-default-audition/delivery/Bingtang-default-original.wav`。
- 服务返回文件：`data/tts-cache/mimo/d6348a8dc90a330709162de1e0b5f28e603ec4123b0b81b15643a2acbf39bb86/attempt-fC8JYs/audio.wav`。
- 两份文件逐字节一致，SHA-256：`b5a1459c0380f5778c8093eb75e1a3892e1caf640a203eb0e82c0caac3e1367f`。
- 格式：24 kHz、单声道、PCM 16-bit WAV；时长 16.00 秒；大小 768044 字节。
- 原样文件未调整音量、语速或音色，也未加入背景音乐。

### 制作副本与生成记录

- `output/narration.wav` 与 `output/groups/sample.wav` 是转为 48 kHz 的单声道 PCM 16-bit 制作副本，时长仍为 16.00 秒。
- 制作副本 SHA-256：`41e3be1dfa934de47e3ea88462de67f760167316bd87b6da7fbdf2e04e757a63`。它与 24 kHz API 原样 WAV 的哈希不同，不应混称为原样文件。
- 实际计划：`data/productions/chapter070/section02/bingtang-default-audition/plan.json`，SHA-256：`4f96f1e872ec5c08a989da21fcdb7ee4356a0ce1e10452dd8028af733312ffc2`。
- 生成清单：同目录的 `output/manifest.json`，SHA-256：`288c74716aaae13f04efd59f478d2bd2f458d2ec7bb583c9ef982676831b489f`。
- 技术检查：同目录的 `technical-review.json`，记录了原样 WAV 与服务文件一致、完整解码通过、未加 `style`、控制标签或参考音频。
- 试听 MP3 为 `delivery/Bingtang-default-preview.mp3`，仅从原样 WAV 编码，未加音频滤镜。其 16.056 秒封装时长包含编码填充，不能据此认为语速发生了变化。

这些哈希用于核对保留样音，不用于要求新台词生成相同文件。技术报告中的 `actualListening: false` 记录的是代理没有实际听音；用户随后明确确认了音色与速度。保留原报告，不将技术检查改写为代理已经试听。

## 后续制作

显式指定模型和冰糖预设，不继承旧计划中的 `style`、语速标签或克隆参数。通用 CLI 省略音色时仍为茉莉；这份制作偏好不修改通用 CLI 默认值，也不改变历史 Edge 命令。调用方式见 [MiMo 接入说明](../mimo-tts.md)。

```bash
npm run voice:mimo -- \
  --text-file data/narration-sample.txt \
  --model mimo-v2.5-tts \
  --voice 冰糖 \
  --output-dir data/mimo-bingtang-default-01
```

保留 API 原始音频；制作流程需要 48 kHz 时，只转换采样格式，保持内容、时长和音高。替换配音后，按实际音频重新对齐字幕、镜头、配乐和音效，不能沿用旧语速的时间码。服务失败时明确报告，不自动换音色。

声音的层次通过场景配乐和动作音效补足。角色被木棒击中、切断树枝等确实发生的动作要配对应声音，并贴合动作或解说的时间点。音乐与音效应能听见，但不遮住人声；不要用额外的 TTS 语气指令代替这次要求的声音设计。
