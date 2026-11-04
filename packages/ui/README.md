# @agile-plus/ui

无样式组件层：WAI-ARIA、键盘交互、Slots 契约。

结构与角色、状态属性都在这一层落地，但**不带任何视觉样式**——组件只输出 `data-state` / `data-*`
钩子和语义化 DOM，外观完全交给你的 CSS。适合自建设计体系，也是 `@agile-plus/components` 的下一层。

```text
@agile-plus/components   带样式成品组件
@agile-plus/ui           ← 本包
@agile-plus/headless     Vue Composables
@agile-plus/primitives   框架无关内核
```

依赖 `@agile-plus/headless` 与 `@agile-plus/primitives`，peer 依赖 `vue ^3.5.0`。
这一层是库内唯一持有模板与 DOM 事件的层。

## 安装

```bash
pnpm add @agile-plus/ui
```

## 入口

根入口导出全部组件；13 个子路径按控件切分（`slot` 只从根入口导出）：

```vue
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui';
import { SwitchRoot } from '@agile-plus/ui/switch';
```

`./dialog` `./tabs` `./flex` `./radio-group` `./checkbox` `./scroll-area` `./toast`
`./toggle` `./switch` `./slider` `./collapsible` `./form` `./progress`

## 组合结构

每个控件都是「根 + 部件」成套导出，部件单独存在时靠开发期错误提示而不是静默渲染出坏 DOM。

| 子路径 | 导出 |
| --- | --- |
| `dialog` | `DialogRoot` `DialogTrigger` `DialogOverlay` `DialogContent` `DialogTitle` `DialogDescription` `DialogClose` |
| `tabs` | `TabsRoot` `TabsList` `TabsTrigger` `TabsContent` |
| `radio-group` | `RadioGroupRoot` `RadioGroupItem` `RadioGroupIndicator` |
| `checkbox` | `CheckboxRoot` `CheckboxIndicator` `CheckboxGroupRoot` |
| `toggle` | `ToggleRoot` `ToggleGroupRoot` `ToggleGroupItem` |
| `switch` | `SwitchRoot` `SwitchThumb` |
| `slider` | `SliderRoot` `SliderTrack` `SliderRange` `SliderThumb` |
| `collapsible` | `CollapsibleRoot` `CollapsibleTrigger` `CollapsibleContent` |
| `progress` | `ProgressRoot` `ProgressIndicator` |
| `scroll-area` | `ScrollAreaRoot` `ScrollAreaViewport` `ScrollAreaScrollbar` `ScrollAreaThumb` `ScrollAreaCorner` |
| `toast` | `ToastProvider` `ToastViewport` `ToastRoot` `ToastTitle` `ToastDescription` `ToastAction` `ToastClose` |
| `form` | `FormRoot` `FormField` `FormFieldLabel` `FormFieldControl` `FormFieldMessage` `FormFieldValidityState` `FormSubmit` |
| `flex` | `FlexRoot` `FlexItem` |
| 根入口 | 额外导出 `Slot`，以及它的两个类型 `SlotElementType` / `SlotElementRef`（`slot` 子路径本身不存在） |

`ToastProvider` 是 provide 根，一棵组件树只需要一个实例。

## 受控入参

每个根的受控入参直接对接 `useXxx`，写法是 getter 而非值，以便在 prop 未传时保持 `undefined`
（这正是这一层不破坏非受控模式的关键）：

```ts
useSwitch({
  checked: () => props.checked,             // 未传 → undefined → 非受控
  defaultChecked: props.defaultChecked ?? false,
  onCheckedChange: (v) => emit('update:checked', v),
});
```

| 根 | 受控入参 | 事件 |
| --- | --- | --- |
| `DialogRoot` `CollapsibleRoot` `ToastRoot` | `:open` | `@update:open` |
| `SwitchRoot` `CheckboxRoot` | `:checked` | `@update:checked` |
| `ToggleRoot` | `:pressed` | `@update:pressed` |
| `TabsRoot` `RadioGroupRoot` `CheckboxGroupRoot` | `:modelValue` | `@update:modelValue` |
| `ToggleGroupRoot` | `:value` + 必填 `type`（`'single' \| 'multiple'`） | `@update:value` |
| `SliderRoot` | `:value`（`number[]`） | `@update:value` `@value-commit` |

`Slot` / `asChild` 是绝大多数部件的公共 prop（52 个模板里 34 个声明了它）：`asChild` 为真时组件
自身标签消失，`role`、`data-*`、事件合并进唯一子元素，你可以把触发器渲染成 `<button>`、`<a>`
甚至路由链接，而不必先写一层无意义容器。class 累加、style 逐键合并、同名事件先子后父串联；
子元素不唯一时直接抛错（不是告警），因为合并目标不唯一就没有正确解。
`elRef` 用于把组件需要的元素引用与消费者写在子元素上的引用合成，`cloneVNode` 第三个参数
负责这件事，`asChild` 下消费者自己的 `ref` 不会被覆盖。

没声明 `asChild` 的 18 个模板是有原因的：Dialog 与 Tabs 的全套部件、`CheckboxGroupRoot`、
`RadioGroupRoot` / `RadioGroupItem`、`FormFieldValidityState`（不渲染自己的元素）、
`ScrollAreaViewport`、`ToastProvider` / `ToastViewport`。其中 `ScrollAreaViewport` 最典型：
它必须持有 DOM 元素读 `clientHeight` / `scrollHeight` 做滚动测量，而 `Slot` 的 ref 只能拿到
组件实例，所以它用 `<component :is>` 渲染，只支持 `as` 换标签，不支持 `asChild`。

## 状态钩子

多数部件带 `data-part`（52 个模板里 31 个），样式按它选择，避免类名冲突：

| 属性 | 取值 |
| --- | --- |
| checkbox `data-state` | `checked` / `unchecked` / `indeterminate`（`aria-checked` 对应 `true` / `false` / `mixed`） |
| switch / toggle / dialog / collapsible / toast | `checked`/`unchecked`、`on`/`off`、`open`/`closed` |
| tabs trigger 与 content | `active` / `inactive`，并带 `data-value` |
| progress | `loading` / `complete` / `indeterminate`，带 `data-value` / `data-max` |
| scroll-area 滚动条与 corner | `visible` / `hidden`，带 `data-orientation` |
| 禁用态 | `data-disabled=""`（存在即禁用） |
| form | `data-valid=""` / `data-invalid=""` |

## 键盘与焦点

| 控件 | 按键 |
| --- | --- |
| Dialog | `Escape` 关闭（`closeOnEscape` 可关）；打开后焦点锁在内容内（`Tab` 在首尾间绕回，`Alt` / `Ctrl` / `Meta` 放行） |
| Tabs | `ArrowLeft/Right`（`orientation="vertical"` 时为 `ArrowUp/Down`）、`Home` / `End`；`activationMode="manual"` 时方向键只移动焦点，`Enter` / `Space` 才激活 |
| RadioGroup | 方向键移动选中、`Home` / `End` 跳首尾；roving focus（可聚焦项 `tabindex="0"`，其余 `-1`） |
| ToggleGroup | 同上，方向键按 `dir` 做 RTL 换算；可聚焦项同样走 roving `tabindex` |
| Slider | `ArrowUp/Right` 增、`ArrowDown/Left` 减、`Home`→min、`End`→max；`PageUp` / `PageDown` 与 `Shift+方向键` 的步长倍数为 10；拖动时指针可以越出轨道边界 |
| Toast | `Escape` 关闭当前（`@escape-keydown` 可 `preventDefault`）；视口 `F8` 聚焦列表，Tab 经首尾代理在「视口 ↔ 页面内容」间移动 |
| Switch / Checkbox / Toggle | 默认标签是 `button`，`Space` / `Enter` 由浏览器原生触发，这层不写 keydown |

## 作用域插槽

10 个模板给默认插槽传载荷，其余都是纯插槽：

| 组件 | 插槽载荷 |
| --- | --- |
| `DialogContent` `ToastRoot` | `{ close }` |
| `SwitchRoot` | `{ checked }` |
| `ToggleRoot` `ToggleGroupItem` | `{ pressed }` |
| `CollapsibleRoot` `CollapsibleTrigger` | `{ open, disabled }` |
| `CollapsibleContent` | `{ open }` |
| `FormField` | `{ validity, serverInvalid }` |
| `FormFieldValidityState` | `{ validity }`（该组件不渲染自己的元素） |

## 示例：一只开关的全部 CSS

```vue
<script setup lang="ts">
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui/switch';
import { ref } from 'vue';
const on = ref(false);
</script>

<template>
  <SwitchRoot v-model:checked="on" class="sw"><SwitchThumb class="sw__thumb" /></SwitchRoot>
</template>

<style>
.sw[data-state='checked'] { background: #2f7d32; }
.sw[data-disabled] { opacity: 0.5; cursor: not-allowed; }
.sw__thumb[data-state='checked'] { transform: translateX(100%); }
</style>
```

## 版本与许可

许可 MIT。`sideEffects: false`。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，
不构成公共 API。`__tests__` 下 11 个测试文件。
