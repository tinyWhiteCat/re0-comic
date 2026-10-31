# 第一节《洗礼》基线

这份记录帮助复核既有成果和迁移经验。数字、台词、镜号与剪接点均属于第一节，不是第七章每节的制作要求。路径相对仓库根目录；`data/` 下的文件可能只存在于当前工作区。

## 当前版本入口

| 内容 | 路径 |
| --- | --- |
| 原著 | `source/novel/chapter070/01.md` |
| 最新图稿 | `public/comics/chapter070/section01/keyframes-v5/shot-01.png` 至 `shot-24.png` |
| 剧情衔接与运镜方案 | `docs/productions/chapter070/section01/keyframes-v5/continuity/README.md` |
| 当前文稿与原著审校 | 同目录 `narration.md`、`narration.txt`、`source-review.md` |
| 声音、运镜与英文 | 同目录 `voice-direction.json`、`camera-plan.json`、`subtitles-en.json`、`sound-design.json` |
| 片头读音修正版 | `docs/productions/chapter070/section01/keyframes-v5/continuity/intro-pronunciation/README.md` |
| 当前视频清单入口 | `docs/productions/chapter070/section01/keyframes-v5/video-manifest.json`、`video-delivery.json` |
| 封面版本与生成记录 | `docs/productions/chapter070/section01/keyframes-v5/cover/README.md`、`generation.json` |

2026-10-31 整理时，当前成片位于 `data/productions/chapter070/section01/keyframes-v5/video/continuity/intro-pronunciation/delivery/narrated-v5-1080p.mp4`。它包含 24 个正文分镜、42 组正文语音、75 条正文双语字幕和 2 条片头字幕；全长约 389.708 秒，24 fps、9353 帧。这些数值仅用于判断是否拿错第一节版本。

该 1080p 文件为 211758678 字节，SHA-256 为 `e9e082fff37e124bb97317f2be14a97e03e4100e0b16351ac3442fdbfda03801`。若未来更新成片，以新 manifest 和实测为准。

## 叙事边界

开场在监视塔：拉姆寻找雷姆，艾米莉娅拦住她，绿色房间和床已经消失。拉姆靠姐妹共感、碧翠丝靠契约确认两人仍活着。位置线索指向南方，众人只是怀疑到了帝国；不能把此时的推测讲成确认。

随后转到同一时间的森林：雷姆醒来但仍失忆，昴自称她的英雄。她对他戒备，路伊介入。昴认得路伊的危险，雷姆看到的却是需要帮助的孩子，两人因此冲突。背负、勒颈、倒地和失去意识要有连续画面。这里昴没有死亡回归。

结尾昴醒来追寻两人，飞箭将他钉在树上。他试图呼唤雷姆。第一节停在受伤与呼唤，不确认射手或死亡结果。

正文展示译名沿用原著的“雷姆”“艾米莉娅”；用户聊天和封面使用“蕾姆”。不能把不同写法误当不同角色，也不要把 TTS 同音输入写入字幕。

## 已被后续需求替代的方案

| 旧方案 | 当前基线 |
| --- | --- |
| 多格漫画页、开场缺失 | 独立彩色视频分镜，补齐监视塔开场 |
| 只有女声，声音单调 | 晓晓保持声线，分语义组安排语气，加入低音量配乐与关键音效 |
| 单中文或字幕位置跳动 | 固定下部的中英双语字幕，直接叠画面 |
| 居中极小缩放、接近静态轮播 | 每镜独立焦点与可见的缓慢推进 |
| 正式宋体或 JOJO 箭头片尾 | 冷白淡紫的 Re:0 氛围字标，与末镜连续衔接 |
| Filebin/R2 作为交付尝试 | 默认文叔叔，实际下载验证 |
| “她终于醒了／却把英雄当成敌人”长标题 | “她醒了／英雄成了敌人” |
| 最初 16:9 封面 | 当前 4:3 封面；16:9 旧版保留 |

## 音频局部修复示例

第一节“原著”的读音使用词组级 `原著 → 原住` 覆盖，显示稿不变。首句在静音处接回旧轨，片中切点为 4.795875 秒；第二句与正文 WAV 样本保持一致，视频流直接复制。切点只能在这份音轨使用，其他语音需要重新测量。

文件 `scripts/repair-chapter-intro-pronunciation.ts` 是第一节专用修复脚本，不是通用的任意句子替换工具。最终 AAC 技术测量约 -18.01 LUFS / -4.05 dBTP；已有记录明确“未作人工听审”。不要把该记录改写成试听结论。

## 封面示例

当前原图 `public/comics/chapter070/section01/keyframes-v5/covers/cover-04.png` 为 1448×1086；上传版 `cover-04-1280x960.jpg` 为 1280×960，均为精确 4:3。

主标题为“她醒了／英雄成了敌人”，系列为“Re:0 帝国篇”，副标题为“原著解说 · 01《洗礼》”。人物对比是昴含泪重逢与蕾姆陌生、戒备的目光。后续封面沿用简短情感落差的方向，文字与画面仍须依据本期剧情。

分享链接保存在各版 delivery 记录中，可能已经失效；本参考不把临时链接作为制作依赖。
