# 历史偏好说明

这里保留被后续确认替代的方案，供追溯既有产物。开始本节任务时，先读本轮用户要求和目标节的版本、交付偏好记录，不从历史文件重新推导默认值。

## 交付平台

2026-10-30的项目记录曾将文叔叔设为后续视频默认平台。第一节访客上传当时观察为约24小时有效、无需提取码、仅支持下载；这不是永久的平台规则。

2026-11-12，用户在第7章第8节任务中要求使用 Wormhole，并纠正了视频再次使用文叔叔的做法。本节的分镜、视频及后续返修重发按 `data/productions/chapter070/section08/delivery-preference.json` 使用 Wormhole。文叔叔旧交付记录只作历史，不覆盖本节要求。其他节的既有交付事实仍保留在各自记录中。

第一节曾用 `data/productions/chapter070/section01/keyframes-v5/video/continuity/wenshushu-browser.ts` 进行浏览器上传。它是忽略目录中的临时脚本，不是本技能自带的稳定依赖，也不是网站 API。

## 片头作品名

第一节较早方案把 `Re:0` 展开为“从零开始的异世界生活”。后期第2节v4使用已试听的短读“从零开始，帝国篇原著解说”，其 `voice-direction.json` 明确 `Re:0 → 从零开始`。2026-11-12用户要求从项目既有记录查找作品名念法，第8节v2据此采用短读。

来源位置均相对仓库根目录，可能只保存在当前制作工作区：

- 第一节旧全称：`data/productions/chapter070/section01/keyframes-v5/video/continuity/intro-pronunciation/intro-metadata.json`。
- 第2节后期短读：`data/productions/chapter070/section02/video-v4-bingtang/voice-direction.json`、`storyboard-approval.json`及实际TTS清单。
- 第8节沿用依据：`data/productions/chapter070/section08/video-v2/revision/narration-final.json` 的 `projectIntroSource`。

这些记录证明各版本采用过的输入与交付，不等于用户逐字单独批准了每个读音。用户确认样音时，试听范围仍按实际文件和反馈记录。

2026-11-13复核发现，第8节v2仍额外播报了“本期第八节《名字》”。当天v6重制稿据第2节短片头和titleOnScreen记录，曾写成“从零开始，帝国篇原著解说。”，节号和标题只上屏。

用户随后明确纠正：“开头应该念 RE 0 的字母和数字”。现行v6.1方案据此改为字母与数字分读，口播显示稿写“RE 0，帝国篇原著解说。”。执行约定为R、E各读英文字母名，0读“零”，不念冒号，不读成单词，也不展开成“从零开始”。拟用TTS输入“R E 零，帝国篇原著解说。”尚未合成或试听；不得把空格机械扩成等长停顿。节号和标题仍只上屏。第2节中文短读及v6稿保留为历史，不再作为当前发音要求。

同日，用户对第8节v3实际4秒片头回复“读法正确”。该条实际TTS输入为“R，E，零，帝国篇原住解说。”，替代上段文字审稿时的空格输入；显示稿仍为“RE 0，帝国篇原著解说。”。原WAV为 `data/productions/chapter070/section08/video-v3/audio/groups/intro.wav`，SHA-256 `a4e4a8912d7073e871c37f64fcc56c72c165b936d4a4394be6ea1f95f8aee7be`，确认见同节 `video-v3/audio/intro-pronunciation-approval.json`。沿用MiMo冰糖既定声线时可复用这条音轨，不再索取同条确认。此反馈只覆盖4秒片头发音，不代表全片正文听审或新的全局选声；早期中文短读与空格输入继续保留作历史。

## 声音基线纠正

第1节早期确认过晓晓。第2节随后经历A“清澈轻柔”设计音色及多轮试听，最终在2026-11-02确认MiMo冰糖原始预设和默认速度，正式v4配置未传speed、pitch、style。第8节v2错误沿用晓晓；用户对46秒短样“读音和停顿正常”的反馈不等于批准改变音色。重制按后期冰糖确认记录执行，审计见 `data/productions/chapter070/section08/revision-v3-review/voice-intro-baseline-audit.json`，旧确认样音的字节副本保存在其baseline-reference目录。

## 第一节工具与路径

第一节旧文档引用过 `docs/productions/`、`public/comics/`、`src/server/narration/edge.ts` 和 `video:*` 命令。当前 checkout 没有提供这些第一节制作入口；旧说明见[历史工具链快照](section01-toolchain.md)，不得直接当作现行命令执行。
