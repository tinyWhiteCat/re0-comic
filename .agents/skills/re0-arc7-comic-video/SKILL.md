---
name: re0-arc7-comic-video
description: 制作或修订Re:0第七章帝国篇漫画解说视频。按原著与设定生成分镜，确认后制作配音、字幕、运镜与声音；视频用Wormhole，两个平台的标题、简介、两种封面和tags用Gmail交付。按阶段读取，只返修受影响内容。
---

# Re:0 第七章漫画解说视频

用户当前要求优先，只执行本次范围。遵守仓库AGENTS.md；Humanizer-zh首次使用时读一次，已在上下文中则复用。原著在`source/novel/chapter070/`（分支节号按目录顺序），角色原画在`data/source-webp/chapter07/settings/characters/sheets/`；媒体、原音、缓存、私有回执存忽略目录`data/productions/chapter070/`，不提交素材或密钥。

## 最短执行入口

1. 先读本节current-storyboard/current-video指针和production-state摘要，确定版本、授权范围、变化组与下一阶段；新节尚无状态时初始化，不遍历历代目录。旧节只有manifest.json时，沿其currentVideo、adoptedStoryboard、pronunciationPatch等字段定位实际采用项，不补造缺失的批准或通过状态。
2. plan阶段实际通读目标原著与必要前文，其他阶段按来源锚点读相关段落。只加载当前阶段规则：`npx tsx .agents/skills/re0-arc7-comic-video/scripts/read-stage.ts <阶段>`。支持plan、storyboard、voice、alignment、visuals、sound、render、review、covers、package、delivery；已读且未变的内容不重复调用。条件案例用`--risk space|props|body|fall`，只展开命中的条目；局部返修或中断恢复加`--repair`，查读取体积用`--stats`（字节数，不是token账单）。
3. 通过阶段工具check/run/freeze维持唯一状态；首次配置或报错才读[工具说明](references/state-tool.md)。图文必须获用户明确确认后才正式配音；配音冻结后才做正式对齐、混音和渲染。沉默、自查通过不代替用户批准，同版本已有批准直接复用。
4. 每阶段只记录输出、变化、阻塞与证据路径。反馈返修只重开受影响阶段，检查与缓存复用按[执行规则](references/execution.md)。默认单执行者，需要独立终检时集中一次，不按岗位扩散上下文。

## 通用制作方法

- 共享设定集中记录，逐镜引用适用的剧情状态与变化；检查画面先整体后局部。依据与参考按[原著对应](references/source-fidelity.md#本节只建立一次的资料)保存，检查顺序见[分镜验收](references/quality-checklist.md#分镜)。
- 分镜确认前联检构图、正式文字与计划运镜；代表性小样只覆盖新增或变化的风险，复用同条件下已验证的结果。小样范围遵守[阶段依赖](references/execution.md#阶段依赖)，不增加例行确认。
- 先定位出错环节，再按[变更影响](references/execution.md#变更影响)限定返工范围；缓存复用核对内容、参数和实际文件哈希，保留已经通过的部分。
- 保存可恢复的产物与证据，中断后先盘点实际完成情况；技术测量、看图/听审、用户确认和真实交付分别记录。具体按[证据复用与交接](references/execution.md#证据复用与交接)执行。
- 把模糊反馈落实为修改目标、保留项和验收方法；复杂动作先定相机、胸背方向、来向和遮挡。返修对照清晰母图检查人物与环境是否退化，局部图再放回叙事中检查。具体按[可复用的制作方法](references/production-lessons.md)读取本阶段相关段落，不每阶段加载全文。

用户本轮明确要求优先。原著准确、人物状态与人体成立、关键信息可读和声音安全等核心要求优先于装饰或近似目标；运镜幅度、字幕参考位置等随实际构图取舍，记录采用依据，数值规格仍查唯一的默认规格。

完整交付分两路：视频通过Wormhole，发布素材通过Gmail。素材必须有B站与YouTube各一份视频标题、内容简介、4:3与16:9封面、视频tags；标题格式与清单以[默认规格](references/production-defaults.md)为准，操作与实际发送状态按[交付操作](references/delivery-and-publishing.md)记录。本轮只更新规则时，不据此重寄历史素材。

## 资料归属

| 规则 | 唯一维护位置；何时读取 |
| --- | --- |
| 数值规格、声线与交付偏好 | [默认规格](references/production-defaults.md)：按阶段提取对应行 |
| 依赖、重试、失效与交接 | [执行规则](references/execution.md)：当前问题涉及的段落 |
| 需求、透视、返修保护与验收方法 | [制作心得](references/production-lessons.md)：出现新风险或模糊反馈时只读相关段落；日常执行按阶段清单 |
| 原著依据、人物认知和演出分类 | [原著对应](references/source-fidelity.md)：plan阶段；实质变更再查相关镜 |
| 帝国旗视觉设定与参考图 | [旗帜设定](../../../docs/settings/chapter070/imperial-flag.md)：相关分镜/封面生成前实际查看正面图和场景母图；不把项目金绣装饰说成原著事实 |
| 小刀统一外形与连续性 | [剑狼短刀设定](../../../data/source-webp/chapter07/settings/props/01-sword-wolf-dagger.md)：出现同一把刀时实际查看P01多视图，保持棕皮短柄、扁圆黄铜柄尾、短护手与短直刃；按本节状态核对伤势 |
| 左手三指伤的软绷带 | [伤手参考](references/subaru-left-hand-bandage.md)：相关状态出场时实际查看并引用，解剖左手中指、无名指、小指及手掌包扎，拇指食指裸露、右手裸露，不画夹板 |
| 片头品牌读法与缓存标识 | [独立读法规则](references/intro-contract.json)：voice阶段合成或复用前用 `scripts/check-re0-intro.ts` 校验，源音与成片另核真实读法；细节查[片头检查](references/production-pipeline.md#片头读法与缓存检查) |
| 创作品味和少量可看正例 | [风格参考](references/style-reference.md)：本阶段相关条目，不强套旧场景 |
| 家具遮挡、道具、身体受限、高处扑击 | [最终案例](references/confirmed-cases.md)：生成前按风险读，不等失败才查 |
| 阶段通过标准与证据继承 | [验收清单](references/quality-checklist.md)：当前阶段一节 |
| 上传、匿名下载和素材邮件步骤 | [交付操作](references/delivery-and-publishing.md)：delivery阶段 |
| 创作决策与资料指针 | [短任务模板](templates/episode-brief.md)：只填未在JSON中的信息 |

历史资料只在现有接口不明或排错时按需查看：[旧脚本接口](references/production-pipeline.md)、[第一节基线](references/section01-baseline.md)、[第二节复盘](references/section02-lessons.md)、[第三节返修史](references/section03-storyboard-lessons.md)、[旧交付经验](references/delivery-history.md)。第四、五节的具体问题按需查[第四节返修](references/section04-revision-lessons.md)与[第五节返修](references/section05-revision-lessons.md)：包括跨镜伤势、箭的旧伤与透视、托抱/背负、水深、展示标题、河水和咳水声、句末声调。生成前的短规则已并入风险案例和当前阶段验收，不默认加载整篇返修史。当前规则和最终用户确认优先，不把旧待确认方案、旧参数或旧平台默认带回新节。

第9节的刀伤透视、包扎、体态、牢笼与追逐空间问题见[第九节返修](references/section09-storyboard-lessons.md)。该稿尚待用户确认；小刀设定入库不等于完整分镜获批。

第10节已获用户成片确认；其伤情、牢笼、全cue遮手、真实焦点与听审证据问题见[第10节复盘](../../../docs/productions/chapter070/section10/retrospective.md)。按当前阶段检查并复用有效证据，不把该节的镜数、字号或音效增益变成新节固定值。

新增应用逻辑/脚本用TypeScript，前端React与Ant Design。已有同目的工具先核对接口再复用；只有新增镜头动效才读取video-shotcraft相应配方，不加载整套产品宣传流程。阶段/原著结构脚本只验证记录与文件，不判断剧情、图像或听感正确；未实际查看/试听不声称已完成。
