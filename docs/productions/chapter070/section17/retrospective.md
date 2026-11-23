# 第 17 节《悄然接近的凶气》制作复盘

2026 年 11 月 23 日（北京时间）。正式成片采用已确认的 V9 分镜，经历 V1 至 V4 四版。V4 正片已通过 Wormhole 匿名整片下载核验。用户确认两张封面共用节名，发布素材包已通过 Gmail 发出并读回核对。[分镜采用记录](../../../../data/productions/chapter070/section17/current-storyboard.json) · [成片采用记录](../../../../data/productions/chapter070/section17/current-video.json) · [素材采用记录](../../../../data/productions/chapter070/section17/current-materials.json)

## 分镜与动作连续性

早期一些子分镜只在版面上换了台词，角色仍停在同一个状态。后续把变化画成独立画面。第 11 镜先让弗洛普看昴，再转向人群骚动的方向。第 12 镜分开交代车冲来、昴被撞飞、最后滚到墙边，车身遮住弗洛普。第 15 镜补两人喘气时的动作变化，审稿版面分别标明动作和台词。[分镜调整记录](../../../../data/productions/chapter070/section17/storyboard-v4/visual-decisions.md)

第 24 至 28 镜的返工集中在同一套空间关系。罗恩拔刀和横劈时，右手握刀，左手可被身体和衣物挡住。几张图分别调整时，人物站姿、门板透视和破损阶段容易各自变化。后续按门框斜向、门环和上下门板对齐 24A 至 25B，再按冲击方向安排罗恩倒向室内。第 26 至 28 镜延续罗恩的落点、头颈姿态、门槛碎片、烟雾及蒙面男的斧头朝向。修姿势时得连着看前后两镜的人物与道具。[V5 挥刀与破门记录](../../../../data/productions/chapter070/section17/storyboard-v5/visual-decisions.md) · [V8 落点与头颈记录](../../../../data/productions/chapter070/section17/storyboard-v8/visual-decisions.md) · [V9 最终画面调整](../../../../data/productions/chapter070/section17/storyboard-v9/visual-decisions.md)

## 合成残影、画幅与运镜

| 发现的问题 | 定位和处理 |
| --- | --- |
| V1 两侧有模糊留白，部分画面细节不足，片头题字也需要调整 | 模糊带来自虚化补边。V2 改用原画取景铺满 16:9，47 张分镜原图先经 FSRCNN ×2，再按 1080p 输出。片头用 ImageGen 重做轻小说风格题字。超分尺寸与源图尺寸分别记录。 |
| V2 约 2:30 有两个昴的头，右手少一截。约 3:44、5:04 有罗恩的发梢和头部残影 | 局部合成沿用了旧姿势的一部分，又切进了新姿势的头发和手臂。V3 把遮罩扩到新旧姿势的完整轮廓，接缝移到背景。车轮、角色和阴影一起换位置的画面采用完整姿势。逐张对照 19 处子分镜切换，重做 12 处，并检查成片的 90 张首、中、末取样帧。 |
| V2 在部分镜头里仍有抖动 | 第 02 镜实测推进没有回摆，排查范围限于代表镜头。V3 将本节机位固定，按成片抽查背景边缘的位置。烟雾另做局部漂移，覆盖 15 个画面状态，短样比对烟区和受保护区域。 |

[画幅与超分记录](../../../../data/productions/chapter070/section17/video-v2/assets/sr-manifest.json) · [V2 运镜抽检](../../../../data/productions/chapter070/section17/video-v2/qa/encoded-preview-review.json) · [V3 静态画面复查](../../../../data/productions/chapter070/section17/video-v3/qa/static-art-review.json) · [V3 最终编码画面复查](../../../../data/productions/chapter070/section17/video-v3/qa/visual-inspection.json)

## 门板飞出与停留段跳回旧画面

V2 的下门板翻落时看起来像缩小。V3 保持板面尺寸，用无门板的门洞底图补齐背景。门板向右运动并经过前景门柱遮挡，出脚后约 0.21 秒完全出画。第 25 镜单独表现上半扇破碎，后续六个画面清掉了反复出现的整块下门板。

V3 首轮试渲在动画接停留画面时又跳回旧姿势，门板也重新出现。排查发现输入目录混有 V2 的尾帧，本次 FFmpeg 的序列取帧和 tpad 停帧流程仍带进了旧图。改用独立输入目录，只放清单里哈希匹配的帧，再逐帧复查门板出画、动画转入停留及下镜接点。问题是在实际编码的停留段暴露的，检查静态底图和飞行动作时都容易漏掉。[动效记录](../../../../data/productions/chapter070/section17/video-v3/qa/motion-review.json) · [停留段编码检查](../../../../data/productions/chapter070/section17/video-v3/qa/preview-timber-holds.json) · [动效编码复查](../../../../data/productions/chapter070/section17/video-v3/qa/motion-encoded-review.json)

## 专名读音与句内停顿

V1 第 07 镜在约 1:24 被指出漏读「昴」。这一句的字幕本身正确，早期实际音频的识别结果把句首听成了「吃口说」。V2 修补后检查全片 33 处「昴」，用户确认读音，但发现名字后面有突兀停顿。V2 合成输入在部分读音别名后加了逗号，造成五处 230–390 毫秒的低电平间隔。V3 留下两侧音节采样，只将这五处静音缩至约 47–65 毫秒。全片因此少了约 1.34 秒，字幕和音效重新跟随实音对齐。最终 AAC 复核了全部姓名及五个剪接点。声音复核用语音识别、基频和波形，主观听感来自用户反馈。[V1 第 07 镜识别](../../../../data/productions/chapter070/section17/video-v1/alignment/asr-shot-07.json) · [V2 姓名复查](../../../../data/productions/chapter070/section17/video-v2/qa/final-name-recognition.json) · [V3 停顿处理](../../../../data/productions/chapter070/section17/video-v3/qa/mao-pause-review.json) · [V3 编码后接点复查](../../../../data/productions/chapter070/section17/video-v3/qa/final-mao-pauses-aac.json)

## 火焰声与片尾斧击抢位

V2 的片尾撞击用木击和低频闷撞叠成，用户希望听到斧头击中骨头的声音。V3 改用短促骨裂拟音，击中后两帧切黑，再出「未完待续」。片尾仍被指出有怪声。拆开混音定位后发现，5:55.92 与 5:58.97 的尖峰来自循环播放的木柴爆裂声。两处在 V3 主片中的峰值约为 −4.9、−7.2 dBFS，比真正斧击的 −9.8 dBFS 更响。第二处正好撞上「斧头就落了下来」的旁白。

V4 按用户要求移除整条木柴爆裂声，用已有的持续火焰声交代火场。两处异常时间窗的峰值分别降至约 −19.2、−18.6 dBFS。混音在修改区间外逐样相同，V4 与 V3 的视频包及时间戳逐项一致，画面检查可沿用到 V4。片尾再次核对了斧击时点、切黑后的衰减及字标时的静音。[V4 混音变更](../../../../data/productions/chapter070/section17/video-v4/qa/sound-difference.json) · [最终编码声音复查](../../../../data/productions/chapter070/section17/video-v4/qa/final-review.json) · [V4 画面证据继承](../../../../data/productions/chapter070/section17/video-v4/qa/visual-review.json)

## 交付核验

首次 Wormhole 尝试出现分享链接时仍在加密。后续以官网确认上传完成为准，关闭发送页，再从新匿名会话下载解密整片，比对字节数和 SHA-256。发布素材单独交付，先确认两张封面的共同主标题，再用原尺寸与缩略图检查字形和表情。ZIP 核实内含两张 PNG 和一份发布文案。Gmail 完成发送并读回收件范围、附件名和大小，核验范围到已发送邮件。[首次分享记录](../../../../data/productions/chapter070/section17/video-v1/delivery/wormhole-first-attempt.json) · [V4 正片交付记录](../../../../data/productions/chapter070/section17/video-v4/delivery/wormhole.json) · [发布包检查](../../../../data/productions/chapter070/section17/materials-v1/qa/package-review.json)

## 下次提前检查

1. 交审分镜就把动作前、接触、结果画出来，注明人物朝向、支点、旧姿势和新姿势的完整轮廓。连续道具用同一地标对齐，出画后对照后续各镜。
2. 全片渲染前先看三类按成片规格编码的短样。选有发梢和手部的局部切换、动效结束接停留画面、以及片尾接黑。返修后复查所有使用同一合成方法的镜头。
3. 配音同时核目标字、相邻音节和词组内部停顿。从最终 AAC 回查发音和剪接，测量与人工听感分别记录。
4. 对环境声先核短时峰值，再查它与旁白、动作和最后一击是否抢位。把持续声和瞬态分轨，按用户反馈精准返修。纯音频改动逐包核旧画面与时间戳。
