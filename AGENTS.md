# Project guidance

本项目是漫画解说视频生成工具。所有应用逻辑和测试必须使用 TypeScript；前端使用 React。

- 技术栈：React + Vite + Ant Design 前端；Node.js + Express + Zod 后端；FFmpeg 合成视频。
- 优先复用成熟、持续维护的组件库，当前统一使用 Ant Design 和 `@ant-design/icons`。新增组件先检查库内已有能力，避免手写按钮、表单、弹窗、上传、提示等通用交互。CSS 只负责页面布局和品牌样式。
- 安装：`npm ci`；开发：`npm run dev`；类型检查及构建：`npm run build`。
- 后端集成测试：`npm test`；浏览器测试：`npm run test:e2e`。测试使用临时目录和真实 FFmpeg 输出，不写入用户素材目录。
- 本地素材和成片在忽略目录 `data/`，不要提交用户素材或密钥。兼容已有项目 JSON，不要因迁移技术栈删除或重置用户数据。
- 已安装项目技能 `.agents/skills/video-shotcraft/SKILL.md`。用户要求镜头动效、Remotion 或宣传视频时先阅读，按需参考配方和实现。安装恢复命令：`bash scripts/install_skill.sh`。
- 该技能是视频制作辅助，不是漫画理解模型或 TTS 服务。不要把它描述成已集成的自动漫画解说 API。
- 云任务已经隔离，使用现有 checkout，无需创建 worktree。
