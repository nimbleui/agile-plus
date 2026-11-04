# @agile-plus/headless

Vue Composables 适配层：把 `@agile-plus/primitives` 的纯计算桥接成响应式状态与 DOM 绑定。

本包不渲染任何东西，只返回「状态 + props 生成函数 + 元素 ref 收集器」。你要自己写模板，
因此结构、类名、样式完全由你决定；交互语义、受控/非受控切换、表单集成由本包保证。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           无样式组件
@agile-plus/headless     ← 本包
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/primitives`，peer 依赖 `vue ^3.5.0`。

## 安装

```bash
pnpm add @agile-plus/headless
```

## 引入方式

```ts
import { useSwitch } from '@agile-plus/headless';
import { useSwitch } from '@agile-plus/headless/useSwitch';
```

每个 composable 一个子路径入口（`useDialog`、`useTabs`、`useRadioGroup`、`useCheckbox`、
`useCheckboxGroup`、`useForm`、`useFormField`、`useFormControl`、`useFormMessage`、
`useCollapsible`、`useScrollArea`、`usePresence`、`useToastProvider`、`useToastViewport`、
`useToast`、`useToggle`、`useToggleGroup`、`useSwitch`、`useSlider`）。

## 示例

```vue
<script setup lang="ts">
import { useSwitch } from '@agile-plus/headless/useSwitch';

const sw = useSwitch({
  defaultChecked: false,
  onCheckedChange: (checked) => console.log(checked),
});
</script>

<template>
  <button :ref="sw.setControl" v-bind="sw.getRootProps()">
    <span v-bind="sw.getThumbProps()" />
  </button>
</template>
```

`useSwitch` 返回 `checked` / `isDisabled` / `isFormControl` 等计算状态，`getRootProps()` /
`getThumbProps()` / `getInputProps()` 生成属性，`setControl` / `setInputElement` 收集元素引用。
传入 `checked` 即进入受控模式；在 `<form>` 内会自动渲染隐藏的 bubble input 承接原生提交与校验。

## 版本与许可

当前 `0.1.0`，MIT。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，不构成公共 API。
