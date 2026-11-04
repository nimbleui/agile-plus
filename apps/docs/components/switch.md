<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import SwitchDemo from '../.vitepress/components/SwitchDemo.vue';
</script>

# Switch 开关

`role="switch"` 的开关，对应 Radix Primitives 的 `switch` 包。Radix 内部由 Provider / Trigger / Thumb / BubbleInput 四段组成，对外只暴露 `Switch`（=Root）与 `Switch.Thumb`，本库同样只有这两个部件加一个样式层封装。

## 基础示例

<Preview description="前两行是 v-model 与受控用法；第三行用来禁用表单里的开关；表单内的开关演示了原生提交（勾上后 FormData 才有值）、required 校验与 reset 复原。">
  <SwitchDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Switch } from '@agile-plus/components/switch';

const notify = ref(false);
</script>

<template>
  <Switch v-model:checked="notify" name="notify" value="yes" required />
</template>
```

## SwitchRoot

### Props

| 属性             | 类型      | 默认值      | 说明                                                   |
| ---------------- | --------- | ----------- | ------------------------------------------------------ |
| `checked`        | `boolean` | `undefined` | 受控状态，传入后进入受控模式                           |
| `defaultChecked` | `boolean` | `false`     | 非受控初始状态，也是 `form.reset()` 要回到的值         |
| `disabled`       | `boolean` | `false`     | 禁用，输出原生 `disabled` 与 `data-disabled`           |
| `required`       | `boolean` | `false`     | 必填，输出 `aria-required` 并让隐藏 input 参与原生校验 |
| `name`           | `string`  | `undefined` | 表单字段名；未提供时 input 不带 name，因此不会被提交   |
| `value`          | `string`  | `'on'`      | 提交值，与原生 checkbox 一致                           |
| `form`           | `string`  | `undefined` | 显式指定所属表单 id，用于控件放在 `<form>` 外部的场景  |
| `id`             | `string`  | `undefined` | 控件 id，用于 aria 关联                                |
| `as`             | `string`  | `'button'`  | 渲染的目标标签名                                       |
| `asChild`        | `boolean` | `false`     | 用唯一子元素替换按钮本体                               |

### Events

| 事件             | 参数               | 说明                        |
| ---------------- | ------------------ | --------------------------- |
| `update:checked` | `checked: boolean` | 配合 `v-model:checked` 使用 |

### DOM 输出

| 属性            | 位置   | 说明                                                                   |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `type="button"` | 按钮   | 避免误提交表单                                                         |
| `role="switch"` | 按钮   | 与 `role="checkbox"` 的区别是它表达二元开关，读屏会读作「开/关」       |
| `aria-checked`  | 按钮   | 始终输出布尔值                                                         |
| `aria-required` | 按钮   | 仅在 `required` 时输出，未启用时不输出 `false`                         |
| `data-state`    | 按钮   | `checked` / `unchecked`（不是 `on` / `off`，也不是 `open` / `closed`） |
| `data-disabled` | 按钮   | 禁用时存在                                                             |
| `value`         | 按钮   | 与 Radix 一致把提交值写在按钮上；按钮没有 `name`，故不会重复提交       |
| `data-part`     | 各部件 | `root` / `thumb` / `input`                                             |

## SwitchThumb

滑块**始终挂载**（与 Checkbox 的 Indicator 只在选中时挂载不同），同时输出 `data-state` / `data-disabled`，因此样式可以只针对滑块写，而不必假设「父级属性能不能传导」。位移由样式层用可继承的 `--y-switch-thumb-position` 完成：在状态块里嵌套元素选择器会生成 `.y-switch[data-state='checked']__thumb` 这种永不命中的选择器。

## 表单集成（bubble input）

开关本身是 `<button>`，没有原生表单能力；而 `<button>` 内又不允许出现别的交互元素，所以按 Radix 的做法渲染一个**兄弟节点** `<input type="checkbox">`，用内联样式覆盖在按钮之上。这套接线（尺寸跟随、写值与通知、reset 复原）与 Checkbox 共用同一份实现：`@agile-plus/primitives/form` 的属性表 + `useBubbleInput`，不要在组件里各写一份：

- `position: absolute` + `transform: translateX(-100%)` 把它拉回按钮正上方（因为它排在按钮之后）。
- 宽高取按钮的实测尺寸（ResizeObserver 跟随，与 Radix 的 `useSize` 等价），所以按钮尺寸变化时 input 同步。
- `pointer-events: none`、`opacity: 0`、`aria-hidden="true"`、`tabindex="-1"`：指针与焦点都归按钮。
- 值通过**原型上的原始 setter** 写入，而不是 `input.checked = value`：部分表单库会在实例上劫持这个 setter 来区分「框架写入」与「用户操作」，走原始 setter 才能保证真实状态被写入，随后我们自己派发一次 `change`。
- 只在值真的发生变化时派发 `change`（冒泡），因此 `form.addEventListener('change')`、依赖 change 的校验与自动保存都能正常工作，且一次变化只有一次事件。初次挂载只同步值不派发事件。
- 归属判定与原生一致：在 `<form>` 内部（`closest('form')`）或显式给了 `form` id 才算表单控件；两者都不满足时**不渲染** input。控件尚未挂载（含 SSR 首帧）时按表单控件处理，保证无 JS 时提交路径仍然存在。
- `form` 的 `reset` 会把状态恢复到 `defaultChecked`（监听原生 reset 事件），与 Radix 的行为一致。

一个容易踩的点：`<label for="开关的 id">` 能切换开关，但走的是「button 是 labelable 元素」这条路——浏览器把标签上的点击转发成按钮上的一次 click，因此切换由 `@click` 完成，不是原生的 checkbox 勾选。包裹式 `<label>` 同理：它的隐式控件是按树序取到的第一个 labelable 后代，也就是按钮而不是隐藏 input，所以不会出现「一次点击切换两次」。

### 覆盖位置不是像素级精确（实测）

`position: absolute` 配 auto 偏移时，元素落在它的**静态位置**上，而静态位置由父容器决定。在 Chrome 里实测的结果：

| 父容器                            | 水平偏差                 | 垂直偏差            | 是否产生滚动溢出 |
| --------------------------------- | ------------------------ | ------------------- | ---------------- |
| 块级（`<form>` 里直接放组件）     | 0px                      | 约 -5px（行盒基线） | 否               |
| flex 行（`display: flex` 的一行） | 约 -16px（一个自身宽度） | 0px                 | 否               |

不影响功能：input 是 `opacity: 0` + `pointer-events: none` 且脱离文档流，测量到的 `scrollWidth` 与视口宽度一致，不会出现幻影滚动条；提交值、`required` 拦截、`change` 派发都与位置无关。唯一可见的后果是浏览器 `required` 校验气泡的锚点会跟着偏一点。

这与 Radix 同源：它的 BubbleInput 包在 `display: contents` 的 span 里，展平后走的是同一套静态位置规则。要做到像素级对齐只能改成按 `offsetParent` 反算 `left` / `top`，代价是每次测量多读一次布局信息，本库没有为这个不可见的差别付这笔钱。

## 键盘与可访问性

按钮原生可聚焦，`Space` / `Enter` 触发切换；状态由 `aria-checked` 表达，禁用由原生 `disabled` 表达，因此不需要额外的按键处理，也没有罗盘焦点（每个开关各自是一格 Tab 停靠点，这是它与 ToggleGroup 的区别）。

## 与 Radix 的差异

| 差异                                    | 本库                                       | 说明                                                                                                                                                          |
| --------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 部件命名                                | `SwitchRoot` / `SwitchThumb`               | 与库内其它 `*Root` 命名统一                                                                                                                                   |
| 事件名                                  | `update:checked`                           | 对应 `v-model:checked`，替代 `onCheckedChange`                                                                                                                |
| 表单通知事件                            | 派发原生 `change`                          | Radix 派发 `click`（React 靠冒泡 click 推导 change），因此需要「用户点击 / 程序化更新」两套记账；直接派发 change 后这套记账不再必要，对外可观察的表单行为等价 |
| 不导出 Provider / Trigger / BubbleInput | 只有 Root 与 Thumb，input 由 Root 内部渲染 | Radix 拆四段是为了让消费者自行组装；本库没有这个需求，需要定制时用 `data-part="input"` 选中即可                                                               |
| `defaultChecked`                        | 只在 input 挂载时写一次                    | 语义与原生一致：reset 回到「初次出现的值」，而不是每次改动都刷新默认值                                                                                        |
| 样式层                                  | `.y-switch` 与 `.y-switch__thumb`          | 位移用可继承变量表达                                                                                                                                          |

## 已知限制

- `required` 的拦截、`form` 归属与 `reset` 复原依赖浏览器实现；单元测试覆盖的是「属性与事件是否正确给出」，浏览器里的原生校验行为需在文档站实测。
- input 的尺寸跟随依赖 ResizeObserver；在服务端渲染环境不生效，此时内联样式不带宽高（浏览器仍能让隐藏的 checkbox 参与提交，提交不依赖尺寸）。
