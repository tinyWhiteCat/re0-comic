# RE:FRAME · re0-comic

漫画解说视频生成工具：导入漫画图片 → 编辑逐镜头解说和时长 → 导入配音 → 导出带中文字幕的 MP4。

故事画廊位于 `/gallery`，也可从工作台右上角进入。展示已收录的第七章角色原画，支持英文名称或编号搜索、排序、分页与大图预览，并预留漫画彩图分类。图片清单位于 `src/client/artworks.ts`，通过静态导入随构建打包；新增已授权图片时，在清单中添加资源、标题、唯一编号和分类（`original` 原画、`comic` 漫画彩图），不会自动公开本地素材目录。

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

## 素材图片无损压缩

```bash
# 递归压缩 source，输出到 data/source-compressed（必须是尚不存在的目录）
npm run compress:images

# 试压缩并统计可节省空间，不保存结果
npm run compress:images -- source --dry-run

# 指定输入与新的输出目录，保留子目录结构及文件名
npm run compress:images -- source/chapter07/comics --output data/comics-compressed

# 原地替换：仅在结果更小时替换源图片
npm run compress:images -- source --in-place
```

PNG/APNG 使用 Node 自带 zlib 重压缩 IDAT 数据，校验 CRC 并核对解压后的数据逐字节一致；不缩放、不改色深、不修改透明像素、不删除元数据。APNG 的其他帧数据保持原样。已有较好压缩的图片可能无法继续缩小，脚本保留原文件。`--level 0–9` 控制 zlib 压缩级别，默认 9；这不会改变画质。为控制内存，单张 PNG 的 IDAT 解压数据上限为 512 MiB，超限计为失败。

JPEG 使用 [jpegtran](https://github.com/libjpeg-turbo/libjpeg-turbo/blob/main/doc/usage.txt) 的 `-copy all -optimize`，保留元数据并优化熵编码，不重新量化。只有处理 JPG/JPEG 时才需要额外安装该命令：macOS 可用 `brew install jpeg-turbo`，Debian/Ubuntu 可用 `sudo apt install libjpeg-turbo-progs`，安装后确保 `jpegtran` 在 PATH 中。

其他格式、文稿和符号链接会跳过，不复制到输出目录。默认保留源文件，输出目录不得已存在或位于输入目录内。原地替换先写临时文件，再原子替换；处理期间发现源文件变化会报错。单个文件失败会继续处理其他图片，最终以非零退出码报告失败；输出目录可能只包含部分成功文件。脚本逐张处理，打印进度及节省空间统计。测试使用临时目录，不改动 `source` 素材。

### 无损 WebP 转换

```bash
# 安装本地编码器和解码器（macOS）
brew install webp
# Debian/Ubuntu：sudo apt install webp

# 递归处理 source，输出到 data/source-webp，保留原图
npm run compress:webp

# 先试压缩，不保存输出
npm run compress:webp -- source/chapter07/comics/61 --dry-run

# 指定新的输出目录；调整并行数及压缩耗时
npm run compress:webp -- source --output data/webp-export --jobs 4 --effort 6
```

`npm run compress:webp` 等同于 `npm run compress:images -- --format webp`。输出目录必须不存在，且不能位于输入目录内；WebP 模式不支持 `--in-place`。

仅转换静态 PNG（包括扩展名为 `.apng` 的静态图片），使用 `cwebp -lossless -exact`，不缩放、不使用近无损预处理。每张图用 `dwebp` 解码后，与原 PNG 逐像素比较 RGBA，包括完全透明像素中的颜色值；只有校验通过且文件变小时才采用 WebP。输出保留输入目录的层级（包括空目录）和图片名称，只将扩展名替换为 `.webp`，例如 `source/61/page-001.png` → `data/source-webp/61/page-001.webp`。若 PNG/APNG 替换扩展名后重名，或与源目录名称冲突，脚本会在创建输出目录前报错，不自动改名或覆盖。

结果没有变小、16 位 PNG、动画 PNG、任一边超过 16,383 像素或总像素超过 4,000 万时，复制原文件并保留原名称。JPEG 也按原文件复制；已有 WebP 和其他文件会跳过。本模式不保证所有输出都是 WebP。损坏文件或像素校验失败会计为失败，继续处理其余图片，最终返回非零退出码。

默认同时处理 2 张，`--jobs 1–8` 控制并行数；`--effort 0–6` 控制编码耗时，默认 4，数值越大通常越慢，两者都不会降低画质。WebP 可以保留编码器支持的 EXIF、ICC、XMP 元数据，但不承载所有 PNG 专用数据块（例如文本注释）；原 PNG 始终保留，便于归档。无损指尺寸和 RGBA 像素一致，不代表两种文件格式的所有元数据完全相同。

图片压缩脚本测试：`npx vitest run tests/compress-images.test.ts`。其中 WebP 集成测试需要 `cwebp` 和 `dwebp` 在 PATH 中，使用临时素材验证透明像素、原图保护、动画和 16 位图片保留、并发、预览及错误处理。

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

## Humanizer-zh 文本润色

项目已内置 [Humanizer-zh](.agents/skills/humanizer-zh/SKILL.md)，来源为 [op7418/Humanizer-zh](https://github.com/op7418/Humanizer-zh)。2026-10-28 已核对本地技能文件与上游提交 `f4518a8eab97b8bfebc66a89d34320a89bef6930` 一致，技能、许可证及配套资料随项目保存，无需另装运行依赖。

[AGENTS.md](AGENTS.md) 要求后续生成的回复、解说稿、台词、字幕、页面文案和文档都先用该技能润色，再交付或写入文件。润色须保留事实、剧情、专名和原意。这是 Agent 的写作流程要求，网页端尚未接入自动润色服务。

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
scripts/        技能安装与图片压缩脚本
```

## 后续扩展

AI 漫画理解与解说稿生成、TTS 配音、按人声对齐字幕、漫画分格、推拉运镜、背景音乐混合、Remotion 镜头集成和任务取消尚未实现。当前无需 API 密钥；未来模型凭据通过环境配置，不写入仓库或项目草稿。
