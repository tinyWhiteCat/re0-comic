# Project guidance

本项目是漫画解说视频生成工具，当前是 Python 标准库 Web 工作台 + FFmpeg 合成。

- 启动：`python3 app.py --port 8000`；测试：`python3 -m unittest discover -s tests -v`。
- 本地素材和成片在忽略目录 `data/`，不要提交用户素材或密钥。
- 已安装项目技能 `.agents/skills/video-shotcraft/SKILL.md`。用户要求镜头动效、Remotion 或宣传视频时先阅读，按需参考配方和实现。安装恢复命令：`bash scripts/install_skill.sh`。
- 该技能是视频制作辅助，不是漫画理解模型或 TTS 服务。不要把它描述成已集成的自动漫画解说 API。
- 云任务已经隔离，使用现有 checkout，无需创建 worktree。
