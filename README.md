# RE:FRAME · re0-comic

漫画解说视频生成工具。当前提供可在本地使用的基础工作台：导入漫画图片 → 编辑逐镜头解说和时长 → 导入配音 → 合成带中文字幕的 MP4。

## 运行

需要 Python 3.10+、FFmpeg/ffprobe（包含 libx264、libass）和中文字体（推荐 Noto Sans CJK）。Web 服务只使用 Python 标准库，不需要 pip 安装。

```bash
cd /workspace/re0-comic
python3 app.py --port 8000
```

浏览器访问本机 8000 端口。服务绑定 `127.0.0.1`，用于单用户本地工作台；当前不提供公网鉴权或多用户隔离。

## 基础工作流

1. 新建作品，填写名称，选择 9:16 竖屏或 16:9 横屏。
2. 批量导入 PNG/JPG/WebP 图片，按文件名自然顺序加入分镜。单文件最多 25 MB。
3. 为每个镜头填写解说字幕，设置 0.5–30 秒时长，使用上下箭头排序或删除镜头。
4. 可选：导入一条整段 MP3/WAV/M4A 配音。配音过长按视频时长裁切，过短补静音；不上传则生成无声视频。
5. 保存草稿，点击合成视频。完成后可预览、下载 MP4 和独立 SRT 字幕。

当前导出为 720p / 24 fps，图片等比完整显示并留边，字幕烧录到画面。中文长文案按 22 字换行；每镜头解说应尽量短，与配音及停留时长人工对齐。

素材、草稿、合成片保存在忽略目录 `data/<项目编号>/`，不提交到 Git。草稿保存以及素材导入会持久化；编辑文案后点击保存，切换作品也会保存。服务器重启后可继续打开草稿，中断的合成需要重新启动。当前每个项目合成时锁定修改，不同项目可独立处理。

## video-shotcraft 技能

已在项目级路径 `.agents/skills/video-shotcraft/` 安装完整技能资源，并安装根目录测试依赖及 Remotion 模板依赖。固定上游版本：`43bd349a136651865ecfa6ea1cf012f6e957d304`。

恢复安装：

```bash
bash scripts/install_skill.sh
```

该目录忽略提交，避免将约 66 MB 上游素材和依赖纳入业务仓库；恢复脚本保留上游许可证，并使用固定提交。已有安装不会被覆盖。第一次使用前阅读 `.agents/skills/video-shotcraft/SKILL.md`；项目 `AGENTS.md` 也提供了入口。技能可辅助制作 Remotion 视频、查阅镜头卡、制作动效和导出剪映工程。它主要服务产品宣传视频，不是看图模型或自动配音 API，当前基础合成器使用 FFmpeg，尚未接入其动效工作台。

检验模板可用性（云环境已验证）：

```bash
cd .agents/skills/video-shotcraft/template
npx remotion compositions src/index.ts --browser-executable=/usr/bin/chromium
```

## 验证

```bash
python3 -m unittest discover -s tests -v
node --check web/app.js
```

集成测试使用临时图片和音频，经 HTTP 上传、保存、合成，检查视频尺寸、时长、音轨、SRT 与可解码性；并覆盖空分镜、错误媒体和路径校验。测试文件位于临时目录，不污染用户项目。

## 后续扩展

- 漫画理解、角色识别与根据剧情生成解说稿。
- TTS 配音生成、自动字幕断句和按人声对齐时间线。
- 漫画分格、推拉运镜、转场、背景音乐与音量混合。
- 集成 Remotion 和 video-shotcraft 镜头、任务队列与取消、长视频渲染。

以上扩展尚未实现。当前不需要 API 密钥；未来模型接入应通过环境变量配置凭据，不写入仓库或草稿文件。
