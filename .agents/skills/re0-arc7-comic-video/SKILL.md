---
name: re0-arc7-comic-video
description: 制作或修订 Re:0 第七章帝国篇漫画解说视频。按原著与设定生成分镜，确认后制作配音、字幕、运镜和声音。按阶段验收，视频与发布素材分别交付。
---

# Re:0 第七章漫画解说视频

遵守仓库 AGENTS.md，使用 Humanizer-zh 润色自然语言。先执行用户本轮明确的范围与要求，再查本节采用版本和同范围批准，最后使用当前默认规格。历史案例用于理解或复现，对新节的镜号、音源、剪辑参数及交付渠道均以当期依据为准。对批准稿的剧情、镜头顺序、主要画面或台词含义有实质改动时，重新确认受影响内容。

## 执行入口

1. 先读本节 `production-state.json` 摘要和适用的 `current-storyboard.json`、`current-video.json`、`current-materials.json`。封面和发布包按独立的素材指针定位。旧节缺指针时沿 manifest、采用清单或交付回执追溯实际采用文件，缺失的批准或验收如实记录。新节按需初始化状态。
2. `plan` 是策划预检。通读 `source/novel/chapter070/` 下的目标原著与必要前文，按目录顺序确定节号。后续阶段按来源锚点查阅相关段落。开始一个阶段时运行 `npx tsx .agents/skills/re0-arc7-comic-video/scripts/read-stage.ts <阶段>`，规则已在上下文且未变化时直接复用。风险案例用 `--risk space|props|body|fall`，返修与恢复用 `--repair`，读取体积用 `--stats`。
3. 从完整分镜开始维护唯一生产状态，按[阶段依赖](references/execution.md#阶段依赖)执行。已有记录先 `check`，需制作时 `run`，验收后 `freeze`。正式配音以前必须有当前完整分镜的明确确认，同版本同范围的已有批准直接复用。首次配置或排错查[状态工具](references/state-tool.md)。
4. 每阶段记录采用文件、变化范围、阻塞项和证据路径。返修按[变更影响](references/execution.md#变更影响)处理相关阶段、相邻接点与缓存。原音、成片、素材、缓存与私有回执留在忽略目录 `data/productions/chapter070/`，公开记录只保留必要引用。

## 阶段交接

| 阶段 | 产物与通过条件 |
| --- | --- |
| plan / storyboard | 明确原著事件、人物认知及每镜状态，设置主要动作和注意重点。交审完整编号彩色分镜、逐镜台词、转场与估时，连同字幕和计划裁切查可读性。见[原著对应](references/source-fidelity.md)与[分镜清单](references/quality-checklist.md#分镜)。 |
| voice / alignment | 先润色跨句承接、人称与语气，再按完整语义组合成。按片头合同和词组读音核实际音频，反复错读逐处排查。冻结采用音后对齐实测时间，核目标词前后停顿及所属分句。见[配音](references/quality-checklist.md#配音)与[对齐](references/quality-checklist.md#对齐)。 |
| visuals / sound | 分别按实音对齐生成底片、动效和混音。新动效先做真实镜头短样，营火核火舌、遮挡、光照与运动。脚步、笑声、火声等按本节实际事件锚定，开场保留清晰口播。见[画面与动效](references/quality-checklist.md#画面与动效)与[音效选材与混音](references/quality-checklist.md#音效选材与混音)。 |
| render / review | 检查最终编码的实际镜头、字幕、品牌片头、片尾字标和音轨。检查覆盖范围、实际听审、技术证据和用户批准分别登记。见[成片终检](references/quality-checklist.md#成片终检)。 |
| covers | 先锁定同一剧情切入点和采用标题，再独立排版 4:3 和 16:9。对照同系列采用参考，并排检查缩略图与原尺寸字形；改单字时核相邻笔画和底图。见[风格参考](references/style-reference.md)和[封面清单](references/quality-checklist.md#封面与简介)。 |
| package / delivery | 核实际 ZIP 与文案。完整交付的视频走 Wormhole，发布素材走 Gmail；局部任务按授权更新相应指针。见[默认规格](references/production-defaults.md)与[交付操作](references/delivery-and-publishing.md)。 |

## 规则与参考

- [默认规格](references/production-defaults.md)维护参数、声线与发布格式。片头固定品牌口播和显示稿以[片头合同](references/intro-contract.json)为准；合成或复用前运行 [片头检查](references/production-pipeline.md#片头读法与缓存检查)。视觉标志、节名、封面主标题和两平台发布标题各按相应用途采用。
- 分镜生成先实际查看适用的[设定索引](../../../data/source-webp/chapter07/settings/README.md)。帝国旗按[项目旗帜](../../../docs/settings/chapter070/imperial-flag.md)，同一把短刀按[剑狼短刀](../../../data/source-webp/chapter07/settings/props/01-sword-wolf-dagger.md)，昴左手受伤时按[软绷带](references/subaru-left-hand-bandage.md)。优先落实接触、侧别、支撑、遮挡与状态变化，再处理光效与纹理。高风险姿态查[最终案例](references/confirmed-cases.md)。
- [任务摘要模板](templates/episode-brief.md)记录创作决策、固定设定和逐镜变化。已有事实用原路径引用。[执行规则](references/execution.md)管理短样、返修、证据、复用与中断恢复；[验收清单](references/quality-checklist.md)管理阶段通过条件。
- 有镜头动效需求时按需查看 video-shotcraft 的相关配方。[制作脚本参考](references/production-pipeline.md)的历史脚本先核路径和接口再复用。阶段与结构工具验证记录及文件；语义、图义、字形和听感由相应实查判断。
- 具体历史问题按需查[制作心得](references/production-lessons.md)、[旧交付经验](references/delivery-history.md)、[第9节复盘](references/section09-storyboard-lessons.md)、[第10节复盘](../../../docs/productions/chapter070/section10/retrospective.md)、[第11节复盘](../../../docs/productions/chapter070/section11/retrospective.md)、[第12节复盘](../../../docs/productions/chapter070/section12/retrospective.md)和[第13节复盘](../../../docs/productions/chapter070/section13/retrospective.md)。通用做法已归入各阶段。
