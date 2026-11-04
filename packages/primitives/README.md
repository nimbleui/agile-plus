# @agile-plus/primitives

框架无关的无头组件原语层：状态机、纯计算、稳定协议。

这里是四层模型的最底层，不导入 Vue / React，不订阅生命周期，只把「一个控件应该处于什么状态、
应该输出哪些 ARIA 与 `data-*` 属性」算成纯函数结果。上层拿这些结果去绑定响应式与 DOM。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           无样式组件（WAI-ARIA、键盘交互、Slots 契约）
@agile-plus/headless     Vue Composables（响应式桥接、生命周期、DOM 绑定）
@agile-plus/primitives   ← 本包
```

依赖方向严格单向，本包不依赖本库任何其他包。

## 安装

```bash
pnpm add @agile-plus/primitives
```

## 引入方式

根入口一次性引入全部原语，子路径入口按需引入单个组件，便于 tree-shaking：

```ts
import { getSwitchAttrs } from '@agile-plus/primitives';
import { getSwitchAttrs } from '@agile-plus/primitives/switch';
```

可用子路径：`dialog`、`flex`、`tabs`、`radio-group`、`checkbox`、`scroll-area`、`toast`、
`presence`、`toggle`、`switch`、`slider`、`dom`、`form`、`collapsible`、`progress`。

## 示例

属性表按「未启用时不输出属性」的约定生成，与 Radix 的选择器行为一致：

```ts
import { getSwitchAttrs, getSwitchDataState } from '@agile-plus/primitives/switch';

getSwitchDataState(true); // 'checked'

getSwitchAttrs({ checked: true, disabled: false, required: false });
// { role: 'switch', 'aria-checked': true, 'data-state': 'checked' }
// disabled / required 为 false 时对应的 data-disabled、aria-required 不出现
```

连续值走 CSS 自定义属性，而不是有限的属性选择器：

```ts
import { getProgressRatio, PROGRESS_VALUE_VAR } from '@agile-plus/primitives/progress';

getProgressRatio(40, 100); // 0.4，样式层把它写进 var(--y-progress-value)
getProgressRatio('NaN' as unknown, 100); // null —— 不确定进度，调用方据此不写数值变量
```

## 约束

- 禁止导入框架 API（`ref` / `reactive` / `watch` / 生命周期）。
- 不主动读写 DOM；少数函数（如 `getTabbableCandidates`）接收已存在的 `HTMLElement` 作为入参做纯读取，调用时机由上层决定。
- 所有导出都有明确类型与 JSDoc，测试是纯单元测试，不依赖 mount 或 jsdom。

## 版本与许可

当前 `0.1.0`，MIT。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，不构成公共 API。
