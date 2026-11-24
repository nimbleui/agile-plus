# 更新日志

条目由 `pnpm release` 生成，取自上一次发布以来的提交主题。

## 0.2.0 - 2026-11-24

### 新增

- **virtual**: 新增虚拟列表与虚拟树组件
- **splitter**: 新增可折叠分隔面板与键盘调宽
- **menu**: 新增四层导航菜单与低代码物料
- **tabs**: 成品 Tabs 提供带样式出口并修正焦点与受控语义
- **themes**: 暗色主题预设，文档站明暗开关直接驱动组件库
- **avatar**: Avatar 四层实现
- **accordion**: Accordion 四层实现
- **table**: Table 四层实现
- **pagination**: Pagination 四层实现
- **date-range-picker**: DateRangePicker 四层实现
- **date-picker**: DatePicker 四层实现，日期原语独立成 primitives/date
- **button**: Button 四层实现
- **textarea**: Textarea 四层实现
- **input**: Input 四层实现，文本控件共用 useTextControl 内核
- **ellipsis**: Ellipsis 四层实现
- **select**: Select 四层实现
- **dropdown-menu**: DropdownMenu 四层实现
- **popover**: Popover 四层实现
- **tooltip**: Tooltip 四层实现
- **keep-mounted**: useKeepMounted 统一「打开过就常驻」判定
- **floating**: 浮层定位原语与 useFloating

### 修复

- **release**: 仅将真实版本提交作为 CHANGELOG 起点
- **release**: dry-run 跳过预期中的工作区变更检查
- **menu**: 对齐 Menu 物料登记顺序
- **menu**: 对齐 Menu 与 Collapsible 导出顺序
- **select**: 移除下拉入场动画位移以消除打开抖动
- **headless**: 修正表单边界值与异步校验竞态
- **toast**: 统一计时真源并修正 asChild 的 type 语义
- **collapsible**: 收起时立刻还原首帧归零的内联样式
- **tabs**: 空列表导航不再把 undefined 写进焦点态
- **materials**: 容器件一律补 default 插槽，accepts 用在非容器上抛错

### 文档

- 各包 README 与架构文档登记新增能力
- 架构文档对齐真实的分层界线与目录结构

### 测试

- **coverage**: 抬升 components 覆盖率棘轮至实测基线
- 补齐既有组件单测与物料契约校验

### 工程

- **release**: 补齐 npm 文档与仓库元数据
- **integration**: 对齐共享入口与架构登记
- **docs**: 文档站发布到 GitHub Pages
- **release**: 统一发布入口，版本号与 CHANGELOG 一次改齐
- **ci**: verify 校验链、覆盖率棘轮与 CI 流水线
