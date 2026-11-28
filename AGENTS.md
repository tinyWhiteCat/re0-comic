# Project guidance

## 理解用户需求

接到请求时，先弄清用户希望达成什么结果。结合上下文和已有证据，判断用户对问题的定义是否成立，留意是否把症状当成原因，或把提出的做法当成目标。

如果发现更值得解决的问题，直接指出来，说明判断依据，以及解决它为什么更有助于实现用户的目标。证据不足时，明确哪些判断还需要验证。

## 所有生成文本的润色要求

本项目后续生成或修改的自然语言文本，都必须使用项目技能 [humanizer-zh](.agents/skills/humanizer-zh/SKILL.md) 润色。范围包括聊天回复（进度说明和最终答复）、解说稿、角色台词、分镜说明、字幕、页面文案、文档及提交说明；写入文件的文本同样适用。主代理和子代理均须遵守。

首次使用时读取该技能，后续按已读取的规则执行。先完成初稿，再检查空话、重复和模板化表达；润色后核对事实、剧情因果、人物称呼、限定条件、归因和完成状态。保留作者语气和必要细节，不为追求口语感改变原意；已通顺的文字可以保留。交付时只展示润色后的文本，无需附检查过程。

自然语言内容应在写入 JSON、字幕文件等载体前完成润色，相关文稿保持一致。代码、命令、路径、链接目标、标识符、数据结构和字幕时间码不作文字风格改写；仓库原著、角色设定原文和明确要求逐字保留的引文也不得擅自改写。

## 协作方式

### 1. Collaborator style

Use the terminology the user and sources use. Keep relevant technical details and use domain-specific language when it adds precision. Use the active voice, lead with the key points, and keep closely related details together. Introduce context and references before the reader needs them. Give the user enough context to follow your reasoning.

### 2. Self-contained final answers

Treat the final answer as the user's first look at the work. Include all context needed to understand it on its own, since earlier commentary is collapsed. Write the final answer and other user-facing material for the intended reader. Avoid copying or closely paraphrasing internal reasoning or carrying over shorthand, jargon, or abbreviations from reasoning, tool calls, or instructions to subagents and automations.

### 3. Persist on long tasks

Continue taking authorized steps within scope until the user's goal is met. If you can execute a plan, make a routine decision, or run a follow-up step yourself, do so and state any relevant assumptions or decisions. Pause when the scope changes significantly, a blocker prevents further progress, a decision requires the user's input, or an action is irreversible or destructive.

Before ending the turn, check the result against every part of the request. Complete any remaining authorized work and verify the deliverables. If a blocker prevents completion, state what remains and identify the blocker.

### 4. Proceed under ambiguity

Make reasonable, reversible assumptions when they let you move the task forward within scope, and state them to the user. Follow any viable authorized path through to a complete result. Give a partial answer only when there is no useful way to proceed.

## 项目约定

制作或修订 Re:0 第七章帝国篇的图文、解说视频、封面及交付时，使用项目技能 [re0-arc7-comic-video](.agents/skills/re0-arc7-comic-video/SKILL.md)。技能记录了已确认的制作偏好、原著与人体结构检查、配音和字幕规则及交付流程；按本次任务范围执行。第一节的具体镜号、时长与剪接点只作复现参考，新节必须重新规划。用户当前要求优先于技能默认值。

本项目是漫画解说视频生成工具。所有应用逻辑和测试必须使用 TypeScript；前端使用 React。

帝国国旗使用项目设定[佛拉基亚帝国旗帜](docs/settings/chapter070/imperial-flag.md)，资产入口为 `data/source-webp/chapter07/settings/flags/manifest.json`。后续分镜、封面和相关视觉素材中的帝国旗默认沿用此版；生成前实际查看独立正面参考图与已采用场景图，保持蓝底、剑贯黑狼、金色月桂环、双绣边、卷草角和短流苏一致。金色装饰属于项目美术设计，解说不得把它说成原著明确记载；红旗医帐按原文保留。

- 技术栈：React + Vite + Ant Design 前端；Node.js + Express + Zod 后端；FFmpeg 合成视频。
- 优先复用成熟、持续维护的组件库，当前统一使用 Ant Design 和 `@ant-design/icons`。新增组件先检查库内已有能力，避免手写按钮、表单、弹窗、上传、提示等通用交互。CSS 只负责页面布局和品牌样式。
- 安装：`npm ci`；开发：`npm run dev`；类型检查及构建：`npm run build`。
- 后端集成测试：`npm test`；浏览器测试：`npm run test:e2e`。测试使用临时目录和真实 FFmpeg 输出，不写入用户素材目录。
- 本地素材和成片在忽略目录 `data/`，不要提交用户素材或密钥。兼容已有项目 JSON，不要因迁移技术栈删除或重置用户数据。
- 已安装项目技能 `.agents/skills/video-shotcraft/SKILL.md`。用户要求镜头动效、Remotion 或宣传视频时先阅读，按需参考配方和实现。安装恢复命令：`bash scripts/install_skill.sh`。
- 该技能是视频制作辅助，不是漫画理解模型或 TTS 服务。不要把它描述成已集成的自动漫画解说 API。
- 云任务已经隔离，使用现有 checkout，无需创建 worktree。

## 问题修复

从第一性原理出发，先明确预期、实际表现和触发条件，再沿因果链找出造成问题的机制或错误假设。用现有证据检验根因，必要时做最小范围的验证，再选择能解决根因的改动。

修复前，沿因果链推演改动的影响。先看它会直接改变什么（一阶），再看共用同一规则、设定或状态的其他场景与角色行为会怎样变化（二阶），最后看这些变化是否会影响后续情节、人物行动或前后连贯性（三阶）。修复后复查受影响的场景与环节，优先验证最可能发生或后果最重的连锁影响。

## 视频交付偏好

生产视频前，先生成完整分镜稿（按顺序编号的彩色分镜图、逐镜解说台词、转场及预计时长）并交给用户确认。只有用户明确确认当前版本后，才开始正式配音、混音和视频渲染；初始制作请求、沉默或 Agent 自查通过不能代替分镜确认。记录确认版本与范围，已有同版本确认不重复询问。剧情、镜头顺序、主要画面或台词含义有实质改动时，重新确认受影响内容；小范围读音或编码修复按用户指令执行。

完整制作按技能[默认规格](.agents/skills/re0-arc7-comic-video/references/production-defaults.md)准备视频与发布素材。视频通过 Wormhole，实际匿名下载并核对 SHA-256 后在聊天中给完整链接。素材通过 Gmail 发到已授权的收件范围，附件为已检查的默认发布 ZIP，按真实回执记录发送结果。局部制作按本轮范围执行，同包已有接受回执直接引用。打包、渠道与版本规则见[交付操作](.agents/skills/re0-arc7-comic-video/references/delivery-and-publishing.md)，先前平台见[历史交付经验](.agents/skills/re0-arc7-comic-video/references/delivery-history.md)。

## 已确认的配音偏好

固定品牌口播与显示稿按[片头读法规则](.agents/skills/re0-arc7-comic-video/references/intro-contract.json)执行。R、E 读英文字母名，0 读中文“零”，按正常台词速度连读；节号和节名默认只上屏。正式合成或复用前运行[片头检查](.agents/skills/re0-arc7-comic-video/references/production-pipeline.md#片头读法与缓存检查)，按源音及最终编码核真实读法。

2026-11-02，用户在后续试听中确认冰糖的原始音色和默认语速，原话及样音见[冰糖默认音色记录](docs/voice-profiles/mimo-bingtang-default.md)。新制作显式使用 `mimo-v2.5-tts`、`voice: 冰糖`；顶层及各语音组都不传 `style`，文本不加括号语气或速度标签，不使用参考音频克隆，也不调整服务默认语速。API 原样样音为 24 kHz 单声道、16 秒；48 kHz 制作副本另有哈希，复核时须区分。

此确认替代此前的 MiMo A「清澈轻柔」默认方向。保留 [A 的样音与历史参数](docs/voice-profiles/mimo-clear-soft-a.md)及晓晓成片用于复现，不将 A 的原始确认改写为已确认克隆结果。通用 MiMo CLI 不带音色参数时仍为茉莉；历史 Edge 命令不自动切换声音。

普通段落按每镜或完整语义组连续合成，不按每条字幕重启合成；各组均保持冰糖默认音色和语速。整轨目标约 `-18 LUFS`，真峰值不高于 `-2 dBTP`，只用固定增益安排人声音量，不加均衡、降噪、压缩、后期移调或时间拉伸。服务失败时明确报错，不自动换声线。MiMo 不提供逐词时间，正式字幕需要另行对齐。配音分组、参数与脚本适用范围见技能内的[制作脚本参考](.agents/skills/re0-arc7-comic-video/references/production-pipeline.md)。

配乐和动作音效要有可听见的层次，并保持解说清楚。用户特别要求木棒击中、割开树枝等实际动作的音效；按本节发生的事件安排，不能直接沿用旧版时间点。

原著标题、展示节名、封面主标题与两平台发布标题按用途记录。第4节展示节名为《勇气的抉择》，第5节为《一个都不能丢》。显示与发布核各自文字出口；用户明确要求口播节名时核该独立语义组的请求和采用音频。

“昴”读 mǎo，“宣布”的“宣”读 xuān，其他多音字按词组和词义核对。读音别名仅用于 TTS 输入。反复错读排查采用音频中的每一处，实际听审与声学检查分别记录。片尾“未完待续”默认只显示已确认字标。 [当前配音与画面规则](.agents/skills/re0-arc7-comic-video/references/quality-checklist.md)

2026-11-15 第11节 V3 优化中，用户进一步要求品牌字母与数字按正常台词速度连读，不逐字拉长间隔，并试听A片头后回复“这个语速可以的”。采用该实际录音，批准不扩展到其他候选或全部效果声。剑击、大火燃烧、巨蛇嘶吼与爆炸需按事件补足层次，火魔法沿已有轨迹增加局部动效；日语低语因机械感按本轮允许移除。具体采用源、声量和动效范围见第11节制作记录，不把本次增益数值作为后续固定值。

V3交付后，用户再次指出巨蛇声音怪异，程序气流版本未获听感确认。第11节改为对比可追溯的蛇类实录与现成设计音效，用户试听后选择D（Artninja的怪蛇表演设计源），V4仅替换8处蛇声。不能把“无动物喉音”、来源标签或技术数值合格当作声音已经像巨蛇。采用状态查本节 `current-sound-audition.json` 及制作记录。用户随后明确“这次只交付视频”，故V4素材只归档、不发邮件；这仅限定本轮，不改写其他任务的Gmail默认规则。

## 分镜与视频中的角色高光

保留原著的关键事件、因果关系，以及角色的动机和能力边界。设计高光时，先找出最能体现这个角色的动作、选择或气质，再主动构思几种演出方式，选出最能拍出角色魅力、也最有冲击力的方案。

在原著允许的范围内，大胆用构图、景别、运镜、剪辑节奏、光影和声音，让角色的高光更帅气、更令人惊叹。把演出写进具体分镜，交代观众先看到或听到什么，在哪一刻看清关键动作或选择。根据场景用前面的镜头蓄势，再视需要用反应镜头或留白延续这一刻的冲击力。

## 故事分镜的连续性

故事分镜默认按原文顺序展开，先交代本节开场、地点和人物位置。不要为了悬念自行把中段提到开头；跨场景要交代时间关系，人物位置或动作发生明显变化时补足关键画面。保留原文有意省略的过程，不用虚构情节填补。

正式出分镜前按场景或连续动作段判断是否要画草图。已有参考能说明站位、视线和动作接点时，直接做分镜。多人交错、楼层或地形变化、换机位等情况让这些关系难以判断时，先用草图定空间和关键动作。相关镜头共用核过原著、设定和采用邻镜的版本。 [按需场景构建](.agents/skills/re0-arc7-comic-video/references/execution.md#按需场景构建)

角色与道具先查[设定集索引](data/source-webp/chapter07/settings/README.md)。2026-11-12，用户要求将第9节v2的小刀收入设定集；后续出现同一把剑狼短刀时，统一引用[道具多视图](data/source-webp/chapter07/settings/props/sheets/01-sword-wolf-dagger.png)和[制作说明](data/source-webp/chapter07/settings/props/01-sword-wolf-dagger.md)，保持刀刃、握柄、护手、柄尾及比例。伤势左右按角色身体判断，不能随画面转向换肩；第9节的右肩伤与后背新伤分开核对。本次设定入库不代表第9节完整分镜已获确认。

帝国初期昴的左手三指伤沿用用户指定的[软绷带画法](.agents/skills/re0-arc7-comic-video/references/subaru-left-hand-bandage.md)：中指、无名指、小指及手掌包扎，拇指食指裸露、右手不包扎，取消夹板；相关改编台词同步，原著不改。复杂动作先确定相机、胸背、来向及遮挡，不能把画面左右当作解剖左右。返修对照清晰母图，检查人物与环境没有退化；具体方法已接入技能的[制作心得](.agents/skills/re0-arc7-comic-video/references/production-lessons.md)。

第8节用户明确不使用Fal，按项目imagegen工作流出独立全幅图，记录真实原生尺寸，不把插值称为原生4K。截至2026-11-15，完整 `storyboard-v12-review` 已获明确确认，`video-v6` 及素材已按授权完成交付；后续先读该节current指针、实际采用清单与批准/交付证据，不恢复早期待审状态，也不重复发送相同素材。具体镜号、时长、候选和回执留在本节忽略目录，后续更新以现行记录为准。

第10节返修复盘见[制作记录](docs/productions/chapter070/section10/retrospective.md)。场景、伤势、五指及内外位置先登记连续性；字幕与构图、计划运镜联合预检。初次完整成片检查全部cue的实际字形与关键伤手/接触点，不只检查最长句；局部改动按阶段规则复看受影响内容。源焦点、屏幕目标与边界夹紧要用实际编码验证。图、相机、ASS、音轨、分页稿和引用QA一并绑定；新实看与旧证据继承分别计数。用户成片接受另存记录，不回写代理历史听审事实。

2026-11-15，用户说明子分镜不必采用规则、等宽的分格；在视频中可以按动作与口播顺序依次快速显现。第11节第21镜采用本轮授权的自由分区与顺次显现，后续多子分镜场景可参考这一偏好，仍须保证阅读顺序清楚、关键动作完整。本节伤势、服装、巨蛇、道具及地形的连续性约束，以及本轮批准范围，见[第11节制作记录](docs/productions/chapter070/section11.md)。

第11节问题与方法见[制作复盘](docs/productions/chapter070/section11/retrospective.md)。一次性红眼等效果按出现区间管理；魔法分别核触发、轨迹和实际落点，复杂动作核支点与邻镜状态。怪物音效须检查物种感和混音听感，来源标签、程序设计与响度合格均不能替代；需要选声时先交付同条件短对比。通用检查已接入技能当前阶段，不把本节D音源、舌面落脚、镜号和增益变成后续固定要求。

第12节经验见[制作复盘](docs/productions/chapter070/section12/retrospective.md)：首镜先明确对象与因果；掌击核肩肘腕、掌背、路径及受力；多音字按词义核对。片尾默认右下角，沿用已确认字标，具体效果与当前正例查技能[默认规格](.agents/skills/re0-arc7-comic-video/references/production-defaults.md)和[风格参考](.agents/skills/re0-arc7-comic-video/references/style-reference.md)。用户确认了本节片尾单图及最后一镜预览，V3已交付，不扩大为整片验收。通用检查已接入阶段资料；本节坐标、淡入时长、补丁窗口和音效数量只用于复现。
