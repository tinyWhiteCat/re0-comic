---
name: re0-arc7-comic-video
description: 制作或修订 Re:0 第七章帝国篇漫画解说视频。按原著和项目设定制作分镜，经确认后完成配音、字幕、成片、封面及交付。按当前阶段和遇到的问题读取对应规则。
---

# Re:0 第七章漫画解说视频

以用户本轮范围为准，遵守仓库 AGENTS.md，中文用 Humanizer-zh 润色。采用版本和批准以本节记录为准，参数与发布格式见[默认规格](references/production-defaults.md)。

## 执行入口

1. 读本节 `production-state.json` 及适用的 `current-storyboard.json`、`current-video.json`、`current-materials.json`。缺指针时沿采用清单或回执追溯文件，如实记录缺失的证据。新节按需初始化。[状态工具](references/state-tool.md)
2. 策划时通读目标原著和必要前文，按 `source/novel/chapter070/` 定节号，后续按锚点查阅。生成前实看当期[设定集](../../../data/source-webp/chapter07/settings/README.md)与需要接续的采用图，在[任务摘要](templates/episode-brief.md)记录出图约束和引用。
3. 每阶段开工运行 `npx tsx .agents/skills/re0-arc7-comic-video/scripts/read-stage.ts <阶段>`。返修加 `--repair`，按风险加 `--risk`，用 `--stats` 看载入范围。续做或同步代码后先核版本。
4. 正式配音前取得当前完整分镜的明确确认。复用同版同范围的批准，实质改动重审受影响部分。已有阶段先 `check`，需要制作时 `run`，验收后 `freeze`。[阶段依赖](references/execution.md#阶段依赖) · [变更影响](references/execution.md#变更影响)
5. 把采用文件、变化范围、阻塞项及证据留在本节记录。原音、成片和私有回执留在 `data/productions/chapter070/`。按[新设定入库](references/source-fidelity.md#新设定入库)整理本节新增设定并交接提交。可复用问题补入[错题集](../../../docs/productions/chapter070/error-catalog.md#如何持续更新)，有同类条目时补具体修法和复验。

## 按问题取用

`--risk` 可重复传入。单查制作方法用 `--lesson <主题>`，完整参数见 `read-stage.ts --help`。

| 遇到的问题 | 参数示例 |
| --- | --- |
| 现有参考难以说明走位、跨层视线、地形变化或受力 | `plan --risk scene` |
| 长分镜需要按场景或动作段分工 | `storyboard --risk parallel` |
| 跨节或换机位后场景、道具状态接不上 | `storyboard --risk continuity` |
| 家具遮挡、持物、身体受限或高处扑击 | `storyboard --risk space`、`--risk props`、`--risk body`、`--risk fall` |
| 局部换动作、残影或局部火烟动效 | `visuals --risk action`、`--risk effects` |
| 台词、字幕和动作在切点接不上 | `review --risk seams` |
| 封面悬念或题字有问题 | `covers --risk cover` |

常用主题有运镜与表情 `motion`、清晰度 `image-quality`、读音与停顿 `pronunciation`、动作声音 `sound` 和片尾 `outro`。案例及实测参数见[错题集](../../../docs/productions/chapter070/error-catalog.md)。

## 阶段交接

| 阶段 | 交给下一步的产物 |
| --- | --- |
| `plan` / `storyboard` | 核过原著与设定的编号彩图、逐镜台词、转场和估时，附批准范围。 |
| `voice` / `alignment` | 采用音、实测逐字时序与双语字幕。 |
| `visuals` / `sound` | 按冻结时序制作的画面段、动效和混音。 |
| `render` / `review` | 可解码的成片和绑定该文件的验收记录。 |
| `covers` | 获批主标题、独立排版的两种封面和发布文案。 |
| `package` / `delivery` | 实际检查的素材 ZIP、成片和各自交付回执。 |

## 规则与参考

- [阶段验收](references/quality-checklist.md)规定实看、试听与技术核验范围。[源文与分镜记录](references/source-fidelity.md)用来核原著依据和演出选择。
- [制作脚本](references/production-pipeline.md)收录片头检查、对齐、渲染及局部返修命令。片头文本和读法以[片头合同](references/intro-contract.json)为准。镜头动效需要实现参考时查 video-shotcraft。
- [交付操作](references/delivery-and-publishing.md)管理打包、真实接收验证及回执。历史平台查[旧交付经验](references/delivery-history.md)。
