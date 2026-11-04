# @agile-plus/components

带样式组件层：Design Token、BEM、主题化。

在 `@agile-plus/ui` 的无结构契约之上预置好轨道、滑块、指示器等内部 DOM，开箱即用地提供
一套视觉。所有外观走 `--y-*` CSS 变量，覆盖变量即可换主题，不必改组件源码。

```text
@agile-plus/components   ← 本包
@agile-plus/ui           无样式组件
@agile-plus/headless     Vue Composables
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/ui`，peer 依赖 `vue ^3.5.0`。

## 安装

```bash
pnpm add @agile-plus/components
```

样式需要显式引入一次（只引子路径时同样要引，Token 变量声明在这里）：

```ts
import '@agile-plus/components/style.css';
```

## 示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { Switch } from '@agile-plus/components/switch';
import '@agile-plus/components/style.css';

const enabled = ref(false);
</script>

<template>
  <Switch v-model:checked="enabled" />
</template>
```

## 组件清单

`Dialog`、`Tabs`、`RadioGroup`、`RadioGroupItem`、`Checkbox`、`CheckboxGroup`、`Toggle`、
`ToggleGroup`、`ToggleGroupItem`、`Switch`、`Slider`、`Progress`、`Collapsible`、
`ScrollArea`、`Toast`、`ToastViewport`、`Flex`、`FlexItem`。

按 `@agile-plus/components/<name>` 子路径按需引入：`dialog`、`tabs`、`radio-group`、`flex`、
`checkbox`、`scroll-area`、`toast`、`toggle`、`switch`、`slider`、`progress`、`collapsible`。

## 约定

- 组件行为与其对应的 UI 层部件一致，样式层不改语义；无头能力可直接下沉到 `@agile-plus/ui` 或 `@agile-plus/headless` 自行组装。
- 支持 `asChild`，可以把自己的元素替换成组件的行为载体。
- 状态钩子（`data-state`、`data-disabled` 等）同时是样式与测试的断言点。

## 版本与许可

当前 `0.1.0`，MIT。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，不构成公共 API。
