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

根入口导出全部组件；29 个子路径按控件切分（`slot` 只从根入口导出）：

```vue
import { SwitchRoot, SwitchThumb } from '@agile-plus/ui'; import { SwitchRoot } from
'@agile-plus/ui/switch';
```

`./dialog` `./tabs` `./flex` `./radio-group` `./checkbox` `./scroll-area` `./toast`
`./toggle` `./switch` `./slider` `./collapsible` `./form` `./progress` `./tooltip`
`./select`
`./date-picker`
`./date-range-picker`
`./ellipsis`
`./input`
`./textarea`
`./button`
`./pagination`
`./table`
`./accordion`
`./avatar`
`./splitter`

## 组合结构

每个控件都是「根 + 部件」成套导出，部件单独存在时靠开发期错误提示而不是静默渲染出坏 DOM。

| 子路径              | 导出                                                                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dialog`            | `DialogRoot` `DialogTrigger` `DialogOverlay` `DialogContent` `DialogTitle` `DialogDescription` `DialogClose`                                                                                                                        |
| `tabs`              | `TabsRoot` `TabsList` `TabsTrigger` `TabsContent`                                                                                                                                                                                   |
| `radio-group`       | `RadioGroupRoot` `RadioGroupItem` `RadioGroupIndicator`                                                                                                                                                                             |
| `checkbox`          | `CheckboxRoot` `CheckboxIndicator` `CheckboxGroupRoot`                                                                                                                                                                              |
| `toggle`            | `ToggleRoot` `ToggleGroupRoot` `ToggleGroupItem`                                                                                                                                                                                    |
| `switch`            | `SwitchRoot` `SwitchThumb`                                                                                                                                                                                                          |
| `slider`            | `SliderRoot` `SliderTrack` `SliderRange` `SliderThumb`                                                                                                                                                                              |
| `collapsible`       | `CollapsibleRoot` `CollapsibleTrigger` `CollapsibleContent`                                                                                                                                                                         |
| `progress`          | `ProgressRoot` `ProgressIndicator`                                                                                                                                                                                                  |
| `scroll-area`       | `ScrollAreaRoot` `ScrollAreaViewport` `ScrollAreaScrollbar` `ScrollAreaThumb` `ScrollAreaCorner`                                                                                                                                    |
| `toast`             | `ToastProvider` `ToastViewport` `ToastRoot` `ToastTitle` `ToastDescription` `ToastAction` `ToastClose`                                                                                                                              |
| `form`              | `FormRoot` `FormField` `FormFieldLabel` `FormFieldControl` `FormFieldMessage` `FormFieldValidityState` `FormSubmit`                                                                                                                 |
| `flex`              | `FlexRoot` `FlexItem`                                                                                                                                                                                                               |
| `tooltip`           | `TooltipRoot` `TooltipTrigger` `TooltipContent` `TooltipArrow`；另转出定位选项类型 `FloatingPlacement` `FloatingOffset` `FloatingArrowOptions` `FloatingStrategy`，下游只依赖本包即可标注类型                                       |
| `ellipsis`          | `Ellipsis`；另转出 `EllipsisMode` `EllipsisDataState`                                                                                                                                                                               |
| `select`            | `SelectRoot` `SelectTrigger` `SelectValue` `SelectIcon` `SelectContent` `SelectViewport` `SelectItem` `SelectItemText` `SelectItemIndicator` `SelectGroup` `SelectLabel` `SelectSeparator`；另转出 `SelectOption` 与定位选项类型    |
| `date-picker`       | `DatePickerRoot` `DatePickerInput` `DatePickerContent` `DatePickerGrid` `DatePickerCell`；另转出 `DateCell` `DateCellState` `DatePanel` `DatePickerViewUnit` 与定位选项类型                                                         |
| `date-range-picker` | `DateRangePickerRoot` `DateRangePickerInput` `DateRangePickerContent` `DateRangePickerGrid` `DateRangePickerCell`；另转出 `DateRangeCellState` `DateRangeDraft` `RangeHighlight` `DateRangeSide` `DateRangeViewUnit` 与定位选项类型 |
| `input`             | `Input`；另转出 `InputProps` `InputEmits`                                                                                                                                                                                           |
| `textarea`          | `Textarea`；另转出 `TextareaProps` `TextareaEmits`                                                                                                                                                                                  |
| `button`            | `Button`；另转出 `ButtonProps`                                                                                                                                                                                                      |
| `accordion`         | `AccordionRoot` `AccordionItem` `AccordionTrigger` `AccordionContent`；另转出 `AccordionItemContext` 与各部件 Props / Emits 类型                                                                                                     |
| `avatar`            | `AvatarRoot` `AvatarImage` `AvatarFallback`；另转出 `getAvatarInitials`（primitives 纯算法经本层转发给成品层）与各部件 Props / Emits 类型                                                                                              |
| `table`             | `TableRoot` `TableCaption` `TableHeader` `TableBody` `TableFooter` `TableRow` `TableHead` `TableCell` `TableEmpty` `TableSelectionHead` `TableSelectionCell` `TableExpandTrigger` `TableExpandedRow`；另转出表格类型与 `resolveTableCssSize` `resolveTableLayout` |
| `splitter`          | `SplitterRoot` `SplitterPanel` `SplitterBar`；分隔条由面板自动画在自己与后一个面板之间，`SplitterPanel` 因此没有 `asChild`（它本来就是多根片段），另转出 `SplitterLayout` `SplitterDirection` `SplitterSizeInput` `SplitterCollapsible`（尺寸与折叠入参形状经本层转出，下游不必依赖 primitives） |
| 根入口              | 额外导出 `Slot`，以及它的两个类型 `SlotElementType` / `SlotElementRef`（`slot` 子路径本身不存在）                                                                                                                                   |

`ToastProvider` 是 provide 根，一棵组件树只需要一个实例。

## 受控入参

每个根的受控入参直接对接 `useXxx`，写法是 getter 而非值，以便在 prop 未传时保持 `undefined`
（这正是这一层不破坏非受控模式的关键）：

```ts
useSwitch({
  checked: () => props.checked, // 未传 → undefined → 非受控
  defaultChecked: props.defaultChecked ?? false,
  onCheckedChange: (v) => emit('update:checked', v),
});
```

| 根                                                       | 受控入参                                              | 事件                                |
| -------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------- |
| `DialogRoot` `CollapsibleRoot` `ToastRoot` `TooltipRoot` | `:open`                                               | `@update:open`                      |
| `SwitchRoot` `CheckboxRoot`                              | `:checked`                                            | `@update:checked`                   |
| `ToggleRoot`                                             | `:pressed`                                            | `@update:pressed`                   |
| `TabsRoot` `RadioGroupRoot` `CheckboxGroupRoot`          | `:modelValue`                                         | `@update:modelValue`                |
| `SelectRoot`                                             | `:modelValue` 与 `:open`                              | `@update:modelValue` `@update:open` |
| `DatePickerRoot`                                         | `:modelValue`（`string \| null`）与 `:open`           | `@update:modelValue` `@update:open` |
| `DateRangePickerRoot`                                    | `:modelValue`（`[string, string] \| null`）与 `:open` | `@update:modelValue` `@update:open` |
| `ToggleGroupRoot`                                        | `:value` + 必填 `type`（`'single' \| 'multiple'`）    | `@update:value`                     |
| `AccordionRoot`                                          | `:value` + 必填 `type`（`'single' \| 'multiple'`）    | `@update:value`                     |
| `SliderRoot`                                             | `:value`（`number[]`）                                | `@update:value` `@value-commit`     |

`Slot` / `asChild` 是绝大多数部件的公共 prop（69 个模板里 49 个声明了它）：`asChild` 为真时组件
自身标签消失，`role`、`data-*`、事件合并进唯一子元素，你可以把触发器渲染成 `<button>`、`<a>`
甚至路由链接，而不必先写一层无意义容器。class 累加、style 逐键合并、同名事件先子后父串联；
子元素不唯一时直接抛错（不是告警），因为合并目标不唯一就没有正确解。
`elRef` 用于把组件需要的元素引用与消费者写在子元素上的引用合成，`cloneVNode` 第三个参数
负责这件事，`asChild` 下消费者自己的 `ref` 不会被覆盖。

没声明 `asChild` 的 20 个模板是有原因的：Dialog 与 Tabs 的全套部件、`CheckboxGroupRoot`、
`RadioGroupRoot` / `RadioGroupItem`、`FormFieldValidityState`（不渲染自己的元素）、
`ScrollAreaViewport`、`ToastProvider` / `ToastViewport`、`SelectRoot` / `SelectContent`。其中 `ScrollAreaViewport` 最典型：
它必须持有 DOM 元素读 `clientHeight` / `scrollHeight` 做滚动测量，而 `Slot` 的 ref 只能拿到
组件实例，所以它用 `<component :is>` 渲染，只支持 `as` 换标签，不支持 `asChild`。

## 状态钩子

多数部件带 `data-part`（69 个模板里 42 个），样式按它选择，避免类名冲突：

| 属性                                           | 取值                                                                                                                                                               |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| checkbox `data-state`                          | `checked` / `unchecked` / `indeterminate`（`aria-checked` 对应 `true` / `false` / `mixed`）                                                                        |
| switch / toggle / dialog / collapsible / toast | `checked`/`unchecked`、`on`/`off`、`open`/`closed`                                                                                                                 |
| tooltip                                        | `closed`/`delayed-open`/`instant-open`（区分延迟与即时，样式层据此决定是否给淡入）                                                                                 |
| select trigger 与 content                      | `open` / `closed`；item 为 `checked` / `unchecked`，另带 `data-highlighted` / `data-value`                                                                         |
| date-picker input 与 content                   | `open` / `closed`；content 另带 `data-panel`（`date` / `month` / `year`），cell 带 `data-selected` / `data-focused` / `data-today` / `data-outside` / `data-value` |
| date-range-picker input 与 content             | `open` / `closed`；input 另带 `data-active`，cell 带 `data-range-start` / `data-range-end` / `data-in-range` / `data-preview` / `data-hover-end` 及单选同名标记    |
| tabs trigger 与 content                        | `active` / `inactive`，并带 `data-value`                                                                                                                           |
| progress                                       | `loading` / `complete` / `indeterminate`，带 `data-value` / `data-max`                                                                                             |
| scroll-area 滚动条与 corner                    | `visible` / `hidden`，带 `data-orientation`                                                                                                                        |
| splitter 面板 / 分隔条 / 箭头                  | 没有 `data-state`：面板带 `data-index` / `data-collapsed`，分隔条带 `data-layout` / `data-index` / `data-resizing`，箭头带 `data-edge`（`start` / `end`）/ `data-collapsed` / `data-always` |
| 禁用态                                         | `data-disabled=""`（存在即禁用）                                                                                                                                   |
| form                                           | `data-valid=""` / `data-invalid=""`                                                                                                                                |

## 键盘与焦点

| 控件                       | 按键                                                                                                                                                      |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog                     | `Escape` 关闭（`closeOnEscape` 可关）；打开后焦点锁在内容内（`Tab` 在首尾间绕回，`Alt` / `Ctrl` / `Meta` 放行）                                           |
| Tabs                       | `ArrowLeft/Right`（`orientation="vertical"` 时为 `ArrowUp/Down`）、`Home` / `End`；`activationMode="manual"` 时方向键只移动焦点，`Enter` / `Space` 才激活 |
| RadioGroup                 | 方向键移动选中、`Home` / `End` 跳首尾；roving focus（可聚焦项 `tabindex="0"`，其余 `-1`）                                                                 |
| ToggleGroup                | 同上，方向键按 `dir` 做 RTL 换算；可聚焦项同样走 roving `tabindex`                                                                                        |
| Accordion                  | `ArrowUp/Down` 在可用项之间移动焦点（不展开）、`Home` / `End` 跳首尾，禁用项跳过；每个标题是独立 Tab 停靠点（不做 roving tabindex），`Enter` / `Space` 或点击才展开 |
| Slider                     | `ArrowUp/Right` 增、`ArrowDown/Left` 减、`Home`→min、`End`→max；`PageUp` / `PageDown` 与 `Shift+方向键` 的步长倍数为 10；拖动时指针可以越出轨道边界       |
| Splitter                   | 只接管与排列轴同向的方向键（横向 `ArrowLeft/Right`、纵向 `ArrowUp/Down`），`Shift` 倍率 5，`Home` / `End` 推到该侧边界；另一轴的按键不 `preventDefault`，交还页面滚动。可拖动的分隔条 `tabindex="0"` 且带 `aria-value*`，折叠按钮是 `tabindex="-1"` 的真 `button` |
| Toast                      | `Escape` 关闭当前（`@escape-keydown` 可 `preventDefault`）；视口 `F8` 聚焦列表，Tab 经首尾代理在「视口 ↔ 页面内容」间移动                                 |
| Switch / Checkbox / Toggle | 默认标签是 `button`，`Space` / `Enter` 由浏览器原生触发，这层不写 keydown                                                                                 |

## 作用域插槽

下表列出的模板给默认插槽传载荷，其余都是纯插槽：

| 组件                                   | 插槽载荷                                 |
| -------------------------------------- | ---------------------------------------- |
| `DialogContent` `ToastRoot`            | `{ close }`                              |
| `SwitchRoot`                           | `{ checked }`                            |
| `ToggleRoot` `ToggleGroupItem`         | `{ pressed }`                            |
| `CollapsibleRoot` `CollapsibleTrigger` | `{ open, disabled }`                     |
| `CollapsibleContent`                   | `{ open }`                               |
| `AccordionItem` `AccordionTrigger`     | `{ open, disabled }`                     |
| `AccordionContent`                     | `{ open }`                               |
| `FormField`                            | `{ validity, serverInvalid }`            |
| `FormFieldValidityState`               | `{ validity }`（该组件不渲染自己的元素） |
| `SplitterPanel`                        | `{ index, size, collapsed }`             |
| `SplitterBar`                          | `{ controls }`（该条上要画的折叠按钮）   |

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
.sw[data-state='checked'] {
  background: #2f7d32;
}
.sw[data-disabled] {
  opacity: 0.5;
  cursor: not-allowed;
}
.sw__thumb[data-state='checked'] {
  transform: translateX(100%);
}
</style>
```

## 版本与许可

许可 MIT。`sideEffects: false`。发布产物含 `dist` 与 `src`，`src` 供源码级排查对照，
不构成公共 API。`__tests__` 下 11 个测试文件。
