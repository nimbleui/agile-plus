# @agile-plus/ui

无样式组件层：WAI-ARIA、键盘交互、Slots 契约。

结构、角色、状态属性都在这一层落地，但**不带任何视觉样式**——组件只输出
`data-state` / `data-*` 钩子和语义化 DOM，外观完全交给你的 CSS。适合自建设计体系，
也是 `@agile-plus/components` 的下一层。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           ← 本包
@agile-plus/headless     Vue Composables
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/headless` 与 `@agile-plus/primitives`，peer 依赖 `vue ^3.5.0`。

## 安装

```bash
pnpm add @agile-plus/ui
```

## 引入方式

```ts
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui';
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui/switch';
```

可用子路径：`dialog`、`tabs`、`flex`、`radio-group`、`checkbox`、`scroll-area`、`toast`、
`toggle`、`switch`、`slider`、`collapsible`、`form`、`progress`。

## 示例

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui/switch';

const enabled = ref(false);
</script>

<template>
  <SwitchRoot v-model:checked="enabled">
    <SwitchThumb />
  </SwitchRoot>
</template>

<style>
/* 样式层只依赖状态钩子，不依赖内部类名 */
[data-state='checked'] {
  /* ... */
}
</style>
```

## 约定

- **受控与非受控**：传 `checked` 走受控，传 `defaultChecked` 走非受控；`v-model:checked` 两者都兼容。
- **`asChild`**：所有可渲染元素的部件都支持 `asChild`，配合根入口导出的 `Slot` 把属性合并进你的单个子节点，不再多包一层 DOM。
- **表单集成**：`name` / `value` / `form` / `required` 沿用 Radix 语义，控件在 `<form>` 内时渲染隐藏 bubble input。
- **类型透传**：各部件的 `*Props` / `*Emits` 类型从根入口导出，供上层声明运行时 props。

## 版本与许可

当前 `0.1.0`，MIT。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，不构成公共 API。
