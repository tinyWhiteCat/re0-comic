# UI 组件库选型

需求：TypeScript + React，尽量使用成熟组件，减少通用交互的自行实现。

2026-10-23 查询了以下官方 GitHub 仓库及 Ant Design README；Star 数仅用于判断社区规模，不作为唯一标准。

| 候选 | 官方仓库 | 调研时 Star 数（约） | 与本项目的关系 |
| --- | --- | --- | --- |
| Ant Design | https://github.com/ant-design/ant-design | 10 万 | TypeScript 编写，提供完整上传、表单、反馈、导航、布局、国际化和主题能力，可直接导入使用 |
| shadcn/ui | https://github.com/shadcn-ui/ui | 12.6 万 | 组件源码归项目管理，适合深度定制；当前更希望减少本地维护的通用 UI 代码 |
| Material UI | https://github.com/mui/material-ui | 9.9 万 | 完整 React 组件体系，适合 Material 视觉体系；本项目优先选择中文工作台常用的 Ant Design |

采用 **Ant Design**，统一搭配官方 `@ant-design/icons`；避免为同一类交互混装多个组件库。

- 布局与导航：`Layout`、`Menu`、`Row`、`Col`、`Flex`、`Space`。
- 素材与分镜：`Upload`、`Card`、`Image`、`Input.TextArea`、`InputNumber`、`Popconfirm`。
- 项目与输出：`Input`、`Select`、`Button`、`Statistic`、`Tag`。
- 异步状态：`App.message`、`Spin`、`Alert`、`Empty`。
- 中文文案与主题：`ConfigProvider`、`zh_CN`、主题 tokens。

只编写业务组合组件和少量布局 CSS。音视频使用原生 HTML 播放器；FFmpeg 合成逻辑属于业务服务，不通过 UI 库实现。组件库会增加前端包体积，后续可按实际性能指标拆分路由及较重模块。

官方说明：https://github.com/ant-design/ant-design/blob/master/README.md
