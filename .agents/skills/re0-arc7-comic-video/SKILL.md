---
name: re0-arc7-comic-video
description: 制作或修订 Re:0 第七章帝国篇漫画解说视频。按原著与设定生成分镜，确认后制作配音、字幕、运镜和声音。按阶段验收，遇到跨镜连续性、动作残影、局部动效、转场旁白或封面题字问题时按需查制作心得。视频与发布素材分别交付。
---

# Re:0 第七章漫画解说视频

遵守仓库 AGENTS.md，使用 Humanizer-zh 润色自然语言。先执行用户本轮明确的范围与要求，再查本节采用版本和同范围批准，最后使用当前默认规格。历史案例用于理解或复现，对新节的镜号、音源、剪辑参数及交付渠道均以当期依据为准。对批准稿的剧情、镜头顺序、主要画面或台词含义有实质改动时，重新确认受影响内容。

## 执行入口

1. 先读本节 `production-state.json` 摘要和适用的 `current-storyboard.json`、`current-video.json`、`current-materials.json`。封面和发布包按独立的素材指针定位。旧节缺指针时沿 manifest、采用清单或交付回执追溯实际采用文件，缺失的批准或验收如实记录。新节按需初始化状态。
2. `plan` 是策划预检。通读 `source/novel/chapter070/` 下的目标原著与必要前文，按目录顺序确定节号。后续阶段按来源锚点查阅。开始阶段时运行 `npx tsx .agents/skills/re0-arc7-comic-video/scripts/read-stage.ts <阶段>`；续做或同步代码后，核对当前版本再复用已读规则。根据本节将出现的内容在制作前选 `--risk`。返修与恢复用 `--repair`，用 `--stats` 查看条目和字节数。
3. 从完整分镜开始维护唯一生产状态，按[阶段依赖](references/execution.md#阶段依赖)执行。已有记录先 `check`，需制作时 `run`，验收后 `freeze`。正式配音以前必须有当前完整分镜的明确确认，同版本同范围的已有批准直接复用。首次配置或排错查[状态工具](references/state-tool.md)。
4. 每阶段记录采用文件、变化范围、阻塞项和证据路径。返修按[变更影响](references/execution.md#变更影响)处理相关阶段、相邻接点与缓存。原音、成片、素材、缓存与私有回执留在忽略目录 `data/productions/chapter070/`，公开记录只保留必要引用。
5. 阶段收尾时，把本节可复用的错误补入[制作错题集](../../../docs/productions/chapter070/error-catalog.md#如何持续更新)。遇到同类问题，给已有条目补充新节次、修法差异和复验结果。

策划时按场景或连续动作段判断是否需要草图。多人走位、跨层视线、地形变化或接触前后难以从现有参考判定时，用 `plan --risk scene`。独立场景 Agent 先画共用简图，关键动作按需加小草图，由主 Agent 核对后，相关镜头再出图。有足够参考的固定站位和简单动作直接做分镜。见[按需场景构建](references/execution.md#按需场景构建)。

长分镜需要并行出图时，按[长分镜的分段制作](references/execution.md#长分镜的分段制作)分派子 Agent。出图前统一采用设定和跨段状态，主 Agent 负责合稿和交审。

## 按问题取用

开工或返修前，按阶段或症状查[制作错题集](../../../docs/productions/chapter070/error-catalog.md)。在 `read-stage.ts` 后传入阶段和对应的 `--risk`。同一处有多个问题时可重复传 `--risk`，脚本在阶段规则之外只补充选中的条目。

| 遇到的问题 | 参数示例 |
| --- | --- |
| 多人交错、跨层视线难读，或地形、接触、支点和持物变化影响后续动作 | `plan --risk scene` |
| 长分镜按场景或连续动作段分给子 Agent | `storyboard --risk parallel` |
| 换机位时站位、地标或受力点跳变，或跨节同场接不上 | `storyboard --risk continuity` |
| 台词首次提到一位角色，定妆插画没能表现他的能力 | `--lesson motion` |
| 同机位局部换姿势、表情或动作，涉及脸、手、衣物的遮罩或轮廓 | `visuals --risk action` |
| 火、烟、云或出框道具需要局部运动，涉及光线或遮挡 | `visuals --risk effects` |
| 重复称谓读错声调，或重复呼唤缺少惊讶感 | `--lesson pronunciation` |
| 片尾字标已经设在右下，成片看起来仍离右缘很远 | `--lesson outro` |
| 转场生硬，或切镜处的旁白、字幕和动作接不上 | `review --risk seams` |
| 封面标题缺少悬念、文字错笔或被特效拆散 | `covers --risk cover` |

家具遮挡、武器与佩戴、身体受限、高处扑击的已确认案例分别用 `--risk space`、`--risk props`、`--risk body`、`--risk fall`。需要核对上表的具体案例时查[第15节制作复盘](../../../docs/productions/chapter070/section15/retrospective.md)。

单查一项心得时，用 `npx tsx .agents/skills/re0-arc7-comic-video/scripts/read-stage.ts --lesson <主题>`，可加 `--stats`。主题包括 `continuity`（跨镜设定）、`motion`（表情与运镜）、`image-quality`（模糊与压缩）、`effects`（局部动效与停留段）、`pronunciation`（读音与停顿）、`sound`（环境声与动作瞬态）、`outro`（片尾）和 `covers`（封面）。各期镜号、实测参数与采用依据在对应制作复盘中。[第 16 节制作复盘](../../../docs/productions/chapter070/section16/retrospective.md) · [第 17 节制作复盘](../../../docs/productions/chapter070/section17/retrospective.md)

## 阶段交接

| 阶段 | 产物与通过条件 |
| --- | --- |
| plan / storyboard | 按原著定镜头任务。跨节核采用尾帧，多人对话核座位和正反打。需要场景草图的段落先核共用参考，再出正式图。成组连看关键动作从起势到结果。首版关键图就叠双语字幕查运镜终点和遮挡，再交审完整编号彩图、台词、转场和估时。见[原著对应](references/source-fidelity.md)和[分镜清单](references/quality-checklist.md#分镜)。 |
| voice / alignment | 先润色跨句承接、人称与语气，再按完整语义组合成。按片头合同和词组读音核实际音频，易错词查全片每次出现，语气转折连前一句试听。冻结采用音后用实测时间核停顿与分句。见[配音](references/quality-checklist.md#配音)与[对齐](references/quality-checklist.md#对齐)。 |
| visuals / sound | 按实音对齐制作底片、动效和混音。新动效先做真实镜头短样。按[场景配乐](references/style-reference.md#场景配乐)分段选曲，按[声音时间线](references/execution.md#声音时间线)安排配乐进出与同步音效。按[画面与动效](references/quality-checklist.md#画面与动效)和[混音清单](references/quality-checklist.md#音效选材与混音)验收。 |
| render / review | 按[渲染前核对](references/quality-checklist.md#渲染前核对)查实际烧录字幕，按[成片终检](references/quality-checklist.md#成片终检)看片中遮挡和片尾字标完全显影时的右、下留边。分别记录覆盖范围、看图听审、技术证据和用户批准。 |
| covers | 先锁定同一剧情切入点和采用标题，再独立排版 4:3 和 16:9。对照同系列采用参考，并排检查缩略图与原尺寸字形；改单字时核相邻笔画和底图。见[风格参考](references/style-reference.md)和[封面清单](references/quality-checklist.md#封面与简介)。 |
| package / delivery | 打开待发 ZIP，用最终混音清单核文案署名。按本轮授权交付，默认视频走 Wormhole，发布素材走 Gmail。各自核验后更新对应指针。见[默认规格](references/production-defaults.md)与[交付操作](references/delivery-and-publishing.md)。 |

## 规则与参考

- [默认规格](references/production-defaults.md)维护参数、声线与发布格式。片头固定品牌口播和显示稿以[片头合同](references/intro-contract.json)为准；合成或复用前运行 [片头检查](references/production-pipeline.md#片头读法与缓存检查)。视觉标志、节名、封面主标题和两平台发布标题各按相应用途采用。
- 分镜生成先实际查看适用的[设定索引](../../../data/source-webp/chapter07/settings/README.md)。帝国旗按[项目旗帜](../../../docs/settings/chapter070/imperial-flag.md)，同一把短刀按[剑狼短刀](../../../data/source-webp/chapter07/settings/props/01-sword-wolf-dagger.md)，昴左手受伤时按[软绷带](references/subaru-left-hand-bandage.md)。优先落实接触、侧别、支撑、遮挡与状态变化，再处理光效与纹理。高风险姿态查[最终案例](references/confirmed-cases.md)。
- [任务摘要模板](templates/episode-brief.md)记录创作决策、固定设定和逐镜变化。已有事实用原路径引用。[执行规则](references/execution.md)管理短样、返修、证据、复用与中断恢复；[验收清单](references/quality-checklist.md)管理阶段通过条件。
- 有镜头动效需求时按需查看 video-shotcraft 的相关配方。[制作脚本参考](references/production-pipeline.md)的历史脚本先核路径和接口再复用。阶段与结构工具验证记录及文件；语义、图义、字形和听感由相应实查判断。
- 具体历史问题从[制作错题集](../../../docs/productions/chapter070/error-catalog.md)进入各节复盘，通用做法查[制作心得](references/production-lessons.md)，历史平台操作查[旧交付经验](references/delivery-history.md)。
