# @agile-plus/components

带样式组件层：Design Token、BEM、主题化。

在 `@agile-plus/ui` 的无结构契约之上预置好轨道、指示器、内部 DOM，开箱即用地提供一套视觉。
所有外观走 `--y-*` CSS 变量，覆盖变量即可换主题，不必改组件源码，也不必像 Tailwind 那样
为了换外观而重写整段类名串。

```text
@agile-plus/components   ← 本包
@agile-plus/ui           无样式组件
@agile-plus/headless     Vue Composables
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/ui`（以及它下层的 `headless` 与 `primitives`），peer 依赖 `vue ^3.5.0`。
交互语义与可访问性行为都继承自下层，这一层只加视觉。

## 安装

```bash
pnpm add @agile-plus/components
```

## 入口

| 入口                                     | 内容                                               |
| ---------------------------------------- | -------------------------------------------------- |
| `@agile-plus/components`                 | 全部组件，并自动引入 `:root` 上的 Token 声明 |
| `@agile-plus/components/switch` 等 26 个 | 单个控件，**不自动引入 Token**                     |
| `@agile-plus/components/style.css`       | 单独的 `:root` Token 声明，给只引子路径的场景      |

```ts
import { Switch, Slider } from '@agile-plus/components';
import { Switch } from '@agile-plus/components/switch';
import '@agile-plus/components/style.css'; // 用子路径时必须自行引入
```

可用子路径：`dialog` `tabs` `radio-group` `flex` `checkbox` `scroll-area` `toast` `toggle`
`switch` `slider` `collapsible` `progress` `tooltip` `popover` `dropdown-menu` `select` `date-picker` `date-range-picker` `ellipsis` `input` `textarea` `button` `pagination` `table` `accordion` `avatar` `splitter` `style.css`。

`Form` 系列与 `Slot` 不在这层（前者留在 `@agile-plus/ui/form`）。`ToastProvider` 是 provide 根，
一棵树只需要一个实例，放在 `App.vue` 而不是放在某个页面里。

`sideEffects` 已把 `**/*.css`、`**/*.scss` 登记为副作用，因此裸引 `style.css` 不会被 tree-shake 掉；
其余模块保持可摇。

## 组件清单

| 子路径              | 导出                                     | 双向绑定                                                                                                                              |
| ------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog`            | `Dialog`                                 | `v-model:open`                                                                                                                        |
| `collapsible`       | `Collapsible`                            | `v-model:open`                                                                                                                        |
| `tooltip`           | `Tooltip`                                | `v-model:open`                                                                                                                        |
| `ellipsis`          | `Ellipsis`                               | `v-model:expanded`                                                                                                                    |
| `select`            | `Select`                                 | `v-model:modelValue`（另支持 `v-model:open`）                                                                                         |
| `date-picker`       | `DatePicker`                             | `v-model:modelValue`（`string \| null`，另支持 `v-model:open`）                                                                       |
| `date-range-picker` | `DateRangePicker`                        | `v-model:modelValue`（`[string, string] \| null`，另支持 `v-model:open`）                                                             |
| `toast`             | `Toast` `ToastViewport` `ToastProvider`  | `Toast` 用 `v-model:open`                                                                                                             |
| `tabs`              | `Tabs`                                   | `v-model:modelValue`                                                                                                                  |
| `radio-group`       | `RadioGroup` `RadioGroupItem`            | `v-model:modelValue`                                                                                                                  |
| `checkbox`          | `Checkbox` `CheckboxGroup`               | `v-model:checked`（`Checkbox` 支持 `'indeterminate'`）；Group 用 `v-model:modelValue`（`string[]`）                                   |
| `switch`            | `Switch`                                 | `v-model:checked`                                                                                                                     |
| `toggle`            | `Toggle` `ToggleGroup` `ToggleGroupItem` | `Toggle` 用 `v-model:pressed`；Group 用 `v-model:value` 且 `type` 必填（`'single' \| 'multiple'`）；`ToggleGroupItem` 的 `value` 必填 |
| `slider`            | `Slider`                                 | `v-model:value`（`number[]`），另有 `@value-commit`                                                                                   |
| `scroll-area`       | `ScrollArea`                             | —                                                                                                                                     |
| `progress`          | `Progress`                               | —                                                                                                                                     |
| `flex`              | `Flex` `FlexItem`                        | —                                                                                                                                     |
| `input`             | `Input`                                  | `v-model:modelValue`                                                                                                                  |
| `textarea`          | `Textarea`                               | `v-model:modelValue`                                                                                                                  |
| `button`            | `Button`                                 | —（点击走原生 `click`）                                                                                                               |
| `table`             | `Table`                                  | `v-model:sort` / `v-model:selectedKeys` / `v-model:expandedKeys`；另有 `@rowClick` `@rowDblclick`                                      |
| `accordion`         | `Accordion` `AccordionItem`              | `v-model:value` 且 `type` 必填（`'single' \| 'multiple'`）；`AccordionItem` 的 `value` 必填，single 另有 `collapsible`                  |
| `avatar`            | `Avatar`                                 | —（另有 `@loading-status-change`；`name` 自动生成文字缩写，默认插槽覆盖补位）                                                          |
| `splitter`          | `Splitter` `SplitterPanel`               | `SplitterPanel` 用 `v-model:size`（`number \| string`），根另有 `@resize-start` `@resize` `@resize-end` `@collapse` `@dragger-double-click` |

布尔受控入参缺省是 `undefined`（表示「用户没传，交给非受控」），不是 `false`；
`Slot` / `asChild` 的行为与 `@agile-plus/ui` 一致，但这层不是每个组件都透传：

| 透传情况               | 组件                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------- |
| `as` 与 `asChild` 都有 | `Button` `Checkbox` `Flex` `FlexItem` `Input` `ScrollArea` `Switch` `Textarea` `Toast` `Toggle` `ToggleGroup` `ToggleGroupItem` |
| 只有 `as`              | `CheckboxGroup` `Progress` `Slider` `Splitter` `SplitterPanel`                                    |
| 两者都不透传           | `Accordion` `AccordionItem` `Avatar` `Collapsible` `Dialog` `RadioGroup` `RadioGroupItem` `Tabs` `ToastViewport`                         |

## 主题定制

`_tokens.scss` 定义 73 个 `--y-*` 全局基准，按 `color` / `border` / `control` / `focus` /
`font` / `line` / `motion` / `padding` / `shadow` / `z` 分组。每个组件在自己的块上声明组件级变量，
值取自这些全局基准，所以改全局能带走所有组件，改单个组件只影响它。

```css
/* 1. 全局：换主色，所有组件的选中态背景跟随 */
:root {
  --y-color-primary: #1677ff;
}

/* 2. 作用域：只换这一片区域的控件基准高度（基准 32px，另有 sm 24px / lg 40px） */
.admin-theme {
  --y-control-height: 40px;
}

/* 3. 单组件：只改这一只开关 */
.y-switch {
  --y-switch-width: 48px;
  --y-switch-bg-checked: var(--y-color-success);
}
```

组件级变量由 `set-component-css-var('switch', (...))` 生成 `--y-<组件>-<键>`（如
`--y-switch-width` / `--y-switch-height` / `--y-switch-gap` / `--y-switch-radius` /
`--y-switch-bg` / `--y-switch-bg-hover` / `--y-switch-bg-checked` / `--y-switch-thumb-bg`），
样式内部用 `getCssVar('switch', 'width')` 读回。消费方只要重写块上的变量就能换外观，
不必覆写任何一条规则。

### 暗色主题

主入口同时发布 `_themes.scss`：在 `html`/`body`（或任意祖先）上设 `data-theme="dark"`，
整棵组件树自动翻色，不改任何组件源码。预设只覆盖颜色类 token——字体、间距、圆角、
控件高度、动效时长、z-index 与主题无关，不重复声明。

```html
<html data-theme="dark"></html>
```

色值取自 Ant Design v5 暗色板，是「开箱可用」的默认值；要改配色仍覆盖 `--y-*` 即可。

## 约定

- BEM：`b('switch')` 生成 `.y-switch`（命名空间 `y` 可用 `!default` 覆盖），`e('thumb')` 生成
  `&__thumb`，`m(...)` 是修饰符，`when(...)` 生成状态类 `.is-xxx`。`e()` 必须在 `b()` 内部，
  否则编译期直接 `@error`，不会安静生成一个选择器前缀丢失的规则。
- 位移与连续值写成可继承的变量（`--y-switch-thumb-position`、`--y-progress-value`），
  不在状态块里嵌套元素选择器：`e()` 嵌进 `&[data-state]` 会生成
  `.y-switch[data-state='checked']__thumb` 这种永不命中的选择器。
- 状态层变量与设计层变量分开命名（`--y-checkbox-state-border` 而非复用 `--y-checkbox-border`），
  避免同名造成循环引用。
- 布局语义仍由无头层的 `data-*` 钩子表达，这一层只补类名与样式，所以同一份结构可以换主题而不改逻辑。
- 动画遵守 `prefers-reduced-motion`（`@include reduced-motion`）。
- 这一层没有自己的单测：它只做「把无头层的钩子接上样式」，行为契约在 `primitives` / `headless` /
  `ui` 三层覆盖，此处再加断言只会重复下层已验过的东西。

## 示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Switch, Slider, Progress } from '@agile-plus/components';

const on = ref(true);
const range = ref([20, 70]);
</script>

<template>
  <Switch v-model:checked="on" />

  <Slider v-model:value="range" :min="0" :max="100" :step="5" :thumb-labels="['低', '高']" />

  <Progress :value="65" :max="100" />
</template>
```

## 版本与许可

许可 MIT。发布产物含 `dist`（含打包出的 `style.css`）与 `src`（含 SCSS 源，供自定义构建）。
这一层没有单测，理由见上文约定最后一条。
