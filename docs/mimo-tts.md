# 小米 MiMo TTS 接入

MiMo 配音通过 TypeScript 模块和 `npm run voice:mimo` 命令调用。支持预设音色、文字设计音色和参考音频克隆；一份计划可为各个语义组分别设置语气。已有 `video:prepare` 晓晓流程继续使用原配置。

本文记录制作工作区中的接入方式。配音实现未包含在本次技能文档提交中；从仓库获取技能后，先确认已有 `scripts/mimo-tts.ts`、`src/server/narration/mimo.ts` 和 `package.json` 中的 `voice:mimo` 命令，补齐后再运行下方示例。配置模板和 JSON 示例本身不包含配音实现。

2026-11-02，用户在后续试听中确认了冰糖的原始音色和默认语速。Re:0 新制作显式指定 `mimo-v2.5-tts` 和 `voice: 冰糖`，不传 `style`，不加入括号语气或速度标签，不使用参考音频克隆。原话、24 kHz API 原样 WAV 与 48 kHz 制作副本的区别见[冰糖默认音色记录](voice-profiles/mimo-bingtang-default.md)。此前 [A 音色记录](voice-profiles/mimo-clear-soft-a.md)保留用于历史复现。

下方茉莉及语气示例展示通用接口能力，不是当前 Re:0 配音参数。通用 CLI 省略音色时仍为茉莉，已有晓晓命令也不自动切换。按当前制作偏好试音时可用：

```bash
npm run voice:mimo -- \
  --text-file data/narration-sample.txt \
  --model mimo-v2.5-tts \
  --voice 冰糖 \
  --output-dir data/mimo-bingtang-default-01
```

## 配置密钥

在运行命令的环境中配置 `MIMO_API_KEY`。云环境 Secret 的目标变量名也使用这个名字；通过代理注入的凭据需要允许 `api.xiaomimimo.com`。程序沿用环境的 HTTPS 代理和证书校验。

本地也可以使用项目根目录的配置文件：

```bash
cp -n .env.mimo.example .env.mimo
chmod 600 .env.mimo
```

用编辑器打开 `.env.mimo`，填写：

```dotenv
MIMO_API_KEY=你的密钥
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
```

`.env.mimo` 已被 Git 忽略。密钥不要写入脚本、计划 JSON、提交说明或聊天。已有环境变量优先于文件配置；其他配置文件可用 `--env-file PATH` 指定。若平台把密钥挂载成文件，可将 `MIMO_API_KEY_FILE` 指向只包含密钥的文件；它不是 dotenv 配置文件。

```bash
npm run voice:mimo -- --check
```

此命令只检查本地配置与 FFmpeg/ffprobe，不请求小米接口。`configured: true` 只表示凭据可读取，真实生成成功后才能确认账号权限和网络可用。

## 单段试音

把要朗读的文字保存成 UTF-8 文件，然后指定一个新的输出目录：

```bash
npm run voice:mimo -- \
  --text-file data/narration-sample.txt \
  --voice 茉莉 \
  --style '自然讲故事，语速适中。疑问处稍作停顿，情绪克制，咬字清楚。' \
  --output-dir data/mimo-sample-01
```

默认模型为 `mimo-v2.5-tts`，默认音色为茉莉。真实生成会调用小米服务；价格和可用额度以账号为准。[官方计费文档](https://mimo.mi.com/static/docs/price/pay-as-you-go.md)在 2026-11-01 核验时将这三种 TTS 标为限时免费。

## 为不同段落设置语气

计划的顶层参数作为默认值，每组可以覆盖 `model`、`voice`、`style`、`referenceAudioFile` 和 `pauseAfterSeconds`。同一组完整合成，避免按每条字幕打断语调。路径相对计划文件所在目录解析。

```json
{
  "voice": "茉莉",
  "style": "自然、清晰地讲故事，语速适中。",
  "pauseAfterSeconds": 0.3,
  "groups": [
    {
      "id": "opening",
      "text": "他走到门前，终于松了一口气。",
      "style": "放松、温和，句尾轻轻收住。"
    },
    {
      "id": "turn",
      "text": "可门后的脚步声，让他又停了下来。",
      "style": "从平静转为不安，压低声音，在转折处略作停顿，不要喊叫。"
    }
  ]
}
```

仓库提供可直接检查的 [示例计划](../examples/mimo-narration.example.json)：

```bash
npm run voice:mimo -- --plan examples/mimo-narration.example.json --plan-only
npm run voice:mimo -- --plan examples/mimo-narration.example.json --output-dir data/mimo-first-trial
```

`--plan-only` 不联网，也不生成音频。正式调用前会检查全部分组和参考文件。成功音频缓存在 `data/tts-cache/mimo`，文字、模型、音色、语气或参考录音改变时重新生成；输出目录需为新目录或空目录，避免覆盖已有成片资料。

## 设计音色和参考音频克隆

设计音色时选择 `mimo-v2.5-tts-voicedesign`，用 `--style` 同时描述音色和说话方式，不传 `--voice`：

```bash
npm run voice:mimo -- \
  --text-file data/narration-sample.txt \
  --model mimo-v2.5-tts-voicedesign \
  --style '清澈柔和的年轻普通话女声，吐字干净，叙述自然，紧张处略微放慢。' \
  --output-dir data/mimo-design-01
```

克隆模式使用自己或已获授权的干净录音：

```bash
npm run voice:mimo -- \
  --text-file data/narration-sample.txt \
  --model mimo-v2.5-tts-voiceclone \
  --reference-audio data/voice-reference.wav \
  --style '自然叙述，保留参考声音的音色，句子之间稍作停顿。' \
  --output-dir data/mimo-clone-01
```

官方参考音频格式为 WAV 或 MP3，Base64 编码后的内容不超过 10 MB。密钥和参考音频的 Base64 内容不会写入生成清单。

## 输出与现有制作流程

- `groups/<id>.wav`：每组配音，转为 48 kHz 单声道 PCM。
- `narration.wav`：按计划顺序与组间停顿拼接的完整音频。
- `manifest.json`：模型、音色、语气、实际时长、分组起止时间及音频校验值。

这一阶段只做采样格式转换和拼接，不添加均衡、降噪、压缩、混响、移调或时间拉伸。视频混音前仍需检查听感、读音和响度。

MiMo 接口不提供逐词时间。本命令把 `timingSource` 标为 `unavailable`、`subtitleAlignmentRequired` 标为 `true`，不会按字数猜测字幕时序。组级时间用于定位整段音频；正式中英字幕需要另行做语音对齐，不能将这个清单直接当成视频渲染时间线。

网页工作台可以导入 `narration.wav`，配合实际分组时长调整镜头。工作台单文件上限为 25 MB，长配音可保留 WAV 原件，另转 MP3 后导入。完整漫画视频的自动字幕对齐和渲染仍由制作流程处理。模型调用失败时明确报错，不自动切换声音；遇到超时或连接中断也不盲目重复提交，以免重复计费。

## 实现与验证

- 服务模块：`src/server/narration/mimo.ts`。
- 命令入口：`scripts/mimo-tts.ts`。
- 分组校验：`scripts/lib/mimo-plan.ts`。
- 接口参考：[小米 TTS API](https://mimo.mi.com/static/docs/api/audio/tts.md)、[语音合成指南](https://mimo.mi.com/static/docs/quick-start/usage-guide/audio/speech-synthesis-v2.5.md)。

```bash
npm run typecheck
npx vitest run tests/mimo-narration.test.ts tests/mimo-plan.test.ts
```

自动化测试使用模拟接口与临时音频，不消耗账号额度。真实短句合成用于另行验证密钥、网络和服务返回；技术检查通过不代表情绪和自然度已经试听确认。
