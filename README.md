# RE:FRAME · re0-comic

漫画解说视频生成工具：导入漫画图片 → 编辑逐镜头解说和时长 → 导入配音 → 导出带中文字幕的 MP4。

## 技术栈

应用前后端、共享类型和测试全部使用 **TypeScript**：

- **React + Vite**：前端组件和开发构建。
- **Ant Design + @ant-design/icons**：布局、菜单、按钮、上传、输入框、时长输入、画幅选择、卡片、图片预览、删除确认、状态提示和下载入口。
- **Node.js + Express**：本地 API、素材管理和异步视频任务。
- **Zod**：前后端共享数据类型与运行时校验。
- **FFmpeg**：图像拼接、配音处理和中文字幕烧录。

组件库调研与选型依据见 [UI 组件库选型](docs/ui-library-selection.md)。通用交互优先使用现成组件，项目 CSS 仅负责布局和品牌样式。音视频播放使用浏览器原生播放器。

## 安装与运行

依赖：Node.js **22.12+**（推荐 Node 24）、npm、FFmpeg/ffprobe（包含 libx264、libass）、中文字体（推荐 Noto Sans CJK）。应用不再依赖 Python。

```bash
npm ci
npm run dev
```

开发模式：Vite 监听本机 5173 端口，API 监听 8000 端口；Vite 自动代理 `/api` 和 `/files`，浏览器操作前端即可。

构建后运行：

```bash
npm run build
npm start
```

此时 8000 端口同时提供前端产物和 API。`npm start` 使用 tsx 执行 TypeScript 后端，需保留 npm 安装的开发依赖。`PORT` 可调整 API 端口（开发模式修改端口时需同步调整 Vite 代理）；`DATA_DIR` 可指定独立数据目录。服务仅绑定 `127.0.0.1`，目前用于本地单用户工作台，不提供公网鉴权和多用户隔离。

## 工作流

1. 新建作品，填写名称，选择 9:16 竖屏或 16:9 横屏。
2. 批量导入 PNG/JPG/WebP 漫画图片，按文件选择顺序添加分镜。单文件最多 25 MB，图片最多 4000 万像素，一个作品最多 100 个分镜。
3. 输入每个镜头的解说和 0.5–30 秒停留时长，使用箭头调整顺序，或确认删除分镜。
4. 可选：导入一条整段 MP3/WAV/M4A 配音。过长按视频时长裁切，过短补静音；不导入则生成无声视频。
5. 保存草稿并合成视频。完成后可预览成片、下载 MP4 和独立 SRT 字幕。

导出为 720p / 24 fps，图片等比完整显示并留边，字幕烧录到画面。中文长文案按 22 字换行，配音与停留时长仍需人工对齐。

素材、草稿和视频位于忽略目录 `data/<项目编号>/`。保存草稿、导入素材、切换或新建作品时会持久化当前编辑；关闭页面前如有未保存修改会提示。迁移前 Python 版的项目 JSON 和素材文件继续兼容。服务重启会将中断的合成标记为失败，保留草稿供重试。合成期间对应项目锁定修改，其他作品仍可编辑。

## 验证

```bash
npm run typecheck
npm run build
npm test
npm run test:e2e
```

- Vitest + Supertest：真实 HTTP 素材上传、字幕与配音合成、横竖屏尺寸、时长、音轨、可解码性、范围下载、并发上传、媒体及路径校验、旧草稿和重启恢复。
- Playwright：在 Chromium 中创建作品、导入多张图片、编辑和排序分镜、保存重载、合成、预览、下载字幕和移动端布局检查。

浏览器测试自动启动服务，使用临时数据目录，不复用或覆盖用户数据。默认使用系统 `/usr/bin/chromium`；也可设置 `CHROMIUM_PATH`，或运行 `npx playwright install chromium` 使用 Playwright 浏览器。

## video-shotcraft 技能

项目级安装目录：`.agents/skills/video-shotcraft/`。固定上游提交：`43bd349a136651865ecfa6ea1cf012f6e957d304`。

```bash
bash scripts/install_skill.sh
```

此脚本恢复完整技能、镜头卡及素材，并安装其测试和 Remotion 模板依赖。上游资源、依赖和许可证保留在本地忽略目录，不加入业务仓库。现有安装不会被覆盖；`AGENTS.md` 提供后续任务的技能入口。

使用前阅读其 `SKILL.md`。该技能可辅助制作 Remotion 动效视频、查阅镜头配方和导出剪映工程；它主要面向产品宣传视频，不是漫画看图模型或 TTS API。当前业务合成器仍使用 FFmpeg，尚未集成技能的动效工作台。

## 目录

```text
src/client/     React 界面和 API 客户端
src/server/     Express API 与 FFmpeg 合成
src/shared/     共享 Zod 数据模型和 TypeScript 类型
tests/          后端集成测试和 Playwright 浏览器测试
scripts/        固定版本技能安装脚本
```

## 后续扩展

AI 漫画理解与解说稿生成、TTS 配音、按人声对齐字幕、漫画分格、推拉运镜、背景音乐混合、Remotion 镜头集成和任务取消尚未实现。当前无需 API 密钥；未来模型凭据通过环境配置，不写入仓库或项目草稿。
