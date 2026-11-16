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

## 通用制作原则

以下作为各集制作的默认方法；具体角色状态、道具形制、镜号和演出方案按当前原著、设定与用户要求确定。这里保留入口摘要，细则在对应阶段文件维护。

1. **设定成为生成依据。** 生成前实际查看适用的角色、道具、标志和场景参考，按[原著对应](references/source-fidelity.md#本节只建立一次的资料)集中记录版本与共享约束，主体与背景共用同一依据。
2. **固定特征与变化状态分开。** 本段外形与身份保持一致；伤势、污损、持有物、行动能力和认知随事件更新，出画不重置状态。
3. **结构关系先于细节。** 先确认比例、支撑受力、接触、遮挡和距离，再做纹理与光效；侧别和道具归属按身体与场景判断，随镜头角度变化核对投影。
4. **按事件链检查连续性。** 连看动作发生前、接触或命中、可见后果和后续状态，核对前后镜交接及原著因果。
5. **演出目标落实到声画。** 将压迫、虚弱、警惕等目标转成可观察的尺度、姿态、表情、光影和声音层次，保持本镜重点清楚。
6. **高风险部分先试做。** 仅对本期新增或变化的风险做代表性验证，同条件下的有效证据直接复用；分镜确认前联检构图、正式文字与计划运镜，小样范围遵守[阶段依赖](references/execution.md#阶段依赖)，不增加例行确认。
7. **局部修改同时验收保留项。** 先定位出错环节，明确改动范围与基线，再对照目标修改、非目标内容及相邻接点，处理误加物件、人体变化和时序漂移。
8. **分层制作，验收实际产物。** 图像、旁白、音效、字幕和机位按依赖与实际文件哈希复用，持久保存产物与证据，中断后先盘点完成情况；最终看实际运镜、字幕、编码音轨与接收文件，分别记录技术检查、看图、听审及用户批准。

用户本轮明确要求优先。原著准确、人物状态与人体成立、关键信息可读和声音安全等核心要求优先于装饰或近似目标；运镜幅度、字幕参考位置等随实际构图取舍，记录采用依据，数值规格仍查唯一的默认规格。

策划和分镜阶段自动读取[生成前约束](references/execution.md#生成前先固定约束)，返修与中断恢复通过 `--repair` 读取[变更影响](references/execution.md#变更影响)与[证据复用规则](references/execution.md#证据复用与交接)，各阶段按[验收清单](references/quality-checklist.md)检查。[任务摘要模板](templates/episode-brief.md)记录固定设定、变化状态、试做结论与返修保留项；已有依据只引用，不重复抄写。

完整交付分两路：视频通过Wormhole，发布素材通过Gmail。面向用户的素材ZIP默认仅含两张封面和一份发布文案，共三个文件；两平台标题、简介、tags和必要署名集中在文案中。具体清单和格式以[默认规格](references/production-defaults.md)为准；制作资料内部归档，只有用户明确索取时另附。操作与真实发送状态按[交付操作](references/delivery-and-publishing.md)记录。本轮只整理规则时，不据此重寄历史素材。

## 资料归属

| 规则 | 唯一维护位置；何时读取 |
| --- | --- |
| 数值规格、声线与交付偏好 | [默认规格](references/production-defaults.md)：按阶段提取对应行 |
| 通用制作方法、依赖、返修与交接 | [执行规则](references/execution.md)：plan/storyboard读取生成前约束，返修读取变更影响，其余按当前问题读取 |
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

第9节的刀伤、包扎、体态、牢笼、国旗、巨蛇声画及合成交付问题见[第九节制作复盘](references/section09-storyboard-lessons.md)。分镜v4已获用户确认，视频v2已交付；后续从本节当前指针核对采用版本和确认范围，不把交付写成用户已验收成片。

第10节已获用户成片确认；其伤情、牢笼、全cue遮手、真实焦点与听审证据问题见[第10节复盘](../../../docs/productions/chapter070/section10/retrospective.md)。按当前阶段检查并复用有效证据，不把该节的镜数、字号或音效增益变成新节固定值。

新增应用逻辑/脚本用TypeScript，前端React与Ant Design。已有同目的工具先核对接口再复用；只有新增镜头动效才读取video-shotcraft相应配方，不加载整套产品宣传流程。阶段/原著结构脚本只验证记录与文件，不判断剧情、图像或听感正确；未实际查看/试听不声称已完成。
