# 阶段工具使用说明

仅首次配置状态、调用接口不明或工具报错时读取。本工具检查依赖和文件有效性，不证明剧情、图像或听感正确。

## 一份状态与明确依赖

每期在忽略目录保存 `production-state.json`，阶段检查工具位于 `../scripts/production-state.ts`（相对本文件目录）。从仓库根目录调用：

```bash
npx tsx .agents/skills/re0-arc7-comic-video/scripts/production-state.ts init data/productions/chapter070/sectionNN/production-state.json
```

将 `episode` 改为本期标识，在每个阶段填写实际 `inputs` / `outputs` 路径，均相对状态文件。需要run执行的阶段还要配置 `command` 字符串数组（可执行文件及每个参数），与命令行 `--` 后完全一致；命令或参数变化也使旧冻结失效。不要直接复制旧节路径或镜数。初始化只写模板，空配置不能通过执行检查；已有文件拒绝覆盖。

阶段依赖见[执行规则](execution.md)，以脚本依赖表为准。

每个阶段的输入应包含真正影响结果的配置或素材清单，输出应包含可追溯的产物清单；清单必须绑定实际资产哈希。工具不解释任意第三方manifest的嵌套结构：需要直接验证的文件应列入inputs/outputs，或由现有资产校验器验证后把结果绑定到阶段证据。不要只登记一个不随素材变化更新的文件名。

## 执行与证据

例如voice已冻结、要运行本期已有的字幕对齐命令：

```bash
npx tsx .agents/skills/re0-arc7-comic-video/scripts/production-state.ts run data/productions/chapter070/sectionNN/production-state.json alignment -- npx tsx data/productions/chapter070/sectionNN/align-subtitles.ts
```

`run` 检查前置阶段的实际文件与证据是否仍有效。已有效冻结的目标直接跳过；命令成功后仍需检查与freeze，不会把退出码0冒充质量通过。它不自动生成缺失的配音或渲染脚本，也不解析成片内容。

完成检查后，保存一份阶段证据。例如voice的证据结构如下；哈希填写真实值，不可使用占位符冻结：

```json
{
  "episode": "chapter070-sectionNN",
  "stage": "voice",
  "passed": true,
  "unresolvedIssues": [],
  "parametersChecked": true,
  "pronunciationChecked": true,
  "actualListening": false,
  "files": {
    "voice-plan.json": "实际SHA-256",
    "audio/manifest.json": "实际SHA-256"
  },
  "details": ["audio/technical-review.json"]
}
```

`files` 必须覆盖该阶段配置的每个输入和输出。storyboard与covers还需 `userApproved: true` 和非空 `approvalReference`，指向真实用户批准记录；不得由代理自查替代。其他阶段也需passed、无未解决项及文件绑定。voice的 `actualListening: false` 如实说明仅做技术/识别检查，不等于已经听审；读音仍有实质疑点时不能清空未解决项。

```bash
npx tsx .agents/skills/re0-arc7-comic-video/scripts/production-state.ts freeze data/productions/chapter070/sectionNN/production-state.json voice audio/voice-review.json
npx tsx .agents/skills/re0-arc7-comic-video/scripts/production-state.ts check data/productions/chapter070/sectionNN/production-state.json render
```

退出码：0为有效/执行成功，2为check发现未冻结或失效，1为配置、依赖、证据或命令错误。`check` 默认只打印阶段、有效性和失效原因，不把长manifest或原文灌入对话。

状态文件由主执行者顺序写入；写入时有锁及旧内容比较，冲突时重读再提交。冻结目录不允许后台任务改文件。阶段产物变更会使依赖检查失效；不会删缓存或自动付费重做。外部命令也可能有副作用，必须先按当前任务范围确认命令正确，不能把run视为安全沙箱。
