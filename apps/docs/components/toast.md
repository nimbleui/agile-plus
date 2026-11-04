<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import ToastDemo from '../.vitepress/components/ToastDemo.vue';
</script>

# Toast 通知

对齐 Radix `Toast` 的部件结构与行为：`Provider` 提供共享状态、`Viewport` 负责定位与键盘可达性、`Root` 是每一条通知并被 portal 进视口。Radix 现在的导出就是 Provider / Viewport / Root / Title / Description / Action / Close 七个部件，**没有 `Content`、`Cancel`、独立的 `Portal`**，本库同样如此（`Toast.Root` 本身就是内容卡片，Radix 源码里它渲染 `<li>`）。

## 基础示例

<Preview description="点击按钮推送通知；方位、时长、朗读敏感度可以实时切换。把指针停在通知上或切走窗口标签，计时会暂停；F8 把焦点送进通知列表，Tab 从最新一条开始，Escape 关闭最上面一条，向右拖可滑走。">
  <ToastDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Toast, ToastProvider, ToastViewport } from '@agile-plus/components/toast';

const visible = ref(false);
</script>

<template>
  <ToastProvider label="通知" :duration="5000">
    <button @click="visible = true">推送通知</button>

    <ToastViewport position="top-right" />

    <Toast :open="visible" @update:open="visible = $event">
      <template #title>已保存草稿</template>
      <template #description>离开页面前的改动已经存进草稿箱。</template>
    </Toast>
  </ToastProvider>
</template>
```

`ToastViewport` 必须存在：通知本体是 portal 进视口列表的 `<ol>`，没有视口时 `Toast` 不渲染任何东西（与 Radix 一致）。视口放在哪里都行，它只提供一个挂载点。

## ToastProvider

不渲染 DOM，只下发配置与共享状态。

### Props

| 属性                | 类型                                  | 默认值           | 说明                                                      |
| ------------------- | ------------------------------------- | ---------------- | --------------------------------------------------------- |
| `label`             | `string`                              | `'Notification'` | 每条通知朗读文本的前缀；空字符串会在开发期告警            |
| `duration`          | `number`                              | `5000`           | 自动关闭时长（毫秒），`0` / `NaN` / `Infinity` 表示常驻   |
| `swipeDirection`    | `'up' \| 'down' \| 'left' \| 'right'` | `'right'`        | 触发关闭的滑动方向，单方向                                |
| `swipeThreshold`    | `number`                              | `50`             | 关闭所需的最小主轴位移（像素）                            |
| `announceContainer` | `Element \| DocumentFragment`         | `undefined`      | announcer 挂载容器，默认 body；模态框内使用时应指向容器内 |

## ToastViewport

| 属性       | 类型       | 默认值                       | 说明                                                    |
| ---------- | ---------- | ---------------------------- | ------------------------------------------------------- |
| `hotkey`   | `string[]` | `['F8']`                     | 把焦点送进视口的快捷键，每项是布尔标志名或 `event.code` |
| `label`    | `string`   | `'Notifications ({hotkey})'` | 视口的 `aria-label` 模板，`{hotkey}` 替换成按键文案     |
| `position` | `string`   | `'top-right'`                | **仅样式层**：六个方位之一，无头层不含定位              |

渲染出的结构是「`div[role=region]` + 两个焦点代理 + `ol`」：

- 包裹层承担 `aria-label`、`tabindex="-1"`，并在没有通知时把 `pointer-events` 关掉，避免空列表挡住页面交互。
- 消费者传入的 `class` / `style` 落到 `<ol>` 上（Radix 也是把 props 展开到 `Primitive.ol`）。
- `Viewport` 不开放 `as` / `asChild`：它由两个职责不同的元素组成，换成单个标签无法表达。

## Toast（`ToastRoot`）

### Props

| 属性            | 类型                                                        | 默认值         | 说明                                             |
| --------------- | ----------------------------------------------------------- | -------------- | ------------------------------------------------ |
| `open`          | `boolean`                                                   | `undefined`    | 受控状态；传入后进入受控模式                     |
| `defaultOpen`   | `boolean`                                                   | `true`         | 非受控初始状态                                   |
| `duration`      | `number`                                                    | `undefined`    | 覆盖 Provider 的时长                             |
| `type`          | `'foreground' \| 'background'`                              | `'foreground'` | 朗读敏感度，决定 announcer 的 `aria-live`        |
| `forceMount`    | `boolean`                                                   | `false`        | 强制留在 DOM，由外部接管进出场                   |
| `as`            | `string`                                                    | `'li'`         | 渲染的目标标签名                                 |
| `asChild`       | `boolean`                                                   | `false`        | 用唯一子元素替换本体                             |
| `variant`       | `'default' \| 'success' \| 'warning' \| 'danger' \| 'info'` | `'default'`    | **仅样式层**的视觉意图，与 `type` 是两回事       |
| `actionAltText` | `string`                                                    | `''`           | **仅样式层**：使用 `action` 插槽时的替代朗读文案 |

### Events

| 事件             | 参数                       | 说明                                                        |
| ---------------- | -------------------------- | ----------------------------------------------------------- |
| `update:open`    | `open: boolean`            | 配合 `v-model:open`；计时到点、Escape、滑动、Close 都会触发 |
| `escape-keydown` | `event: KeyboardEvent`     | 按 Escape 时触发，`preventDefault()` 可阻止关闭             |
| `pause`          | —                          | 自动计时被暂停                                              |
| `resume`         | —                          | 自动计时恢复                                                |
| `swipe-start`    | `{ originalEvent, delta }` | 位移越过启动阈值（触摸 10px、指针 2px）                     |
| `swipe-move`     | `{ originalEvent, delta }` | 滑动过程中持续触发，`delta` 已按方向钳制                    |
| `swipe-cancel`   | `{ originalEvent, delta }` | 抬手时未达阈值，回弹保留                                    |
| `swipe-end`      | `{ originalEvent, delta }` | 抬手时达到阈值，随后关闭                                    |

### DOM 输出

| 属性 / 变量                    | 位置         | 说明                                                |
| ------------------------------ | ------------ | --------------------------------------------------- |
| `data-part="root"`             | 通知本体     | 样式钩子                                            |
| `data-state="open\|closed"`    | 通知本体     | 关闭动画期间为 `closed` 但元素仍在 DOM 中           |
| `data-swipe-direction`         | 通知本体     | 跟随 Provider                                       |
| `data-swipe`                   | 通知本体     | `start` / `move` / `cancel` / `end`，无手势时不输出 |
| `tabindex="0"`                 | 通知本体     | 让通知可被 Tab 直达，同时是 Tab 遍历的起点          |
| `--y-toast-swipe-move-x\|y`    | 通知本体内联 | 滑动中的位移；`end` 时被清除                        |
| `--y-toast-swipe-end-x\|y`     | 通知本体内联 | 抬手时的位移，供飞出动画使用                        |
| `user-select` / `touch-action` | 通知本体内联 | 内联而非样式表，保证不引样式也不会误选手势          |

## Title / Description / Action / Close

| 部件               | Props                              | 说明                                                              |
| ------------------ | ---------------------------------- | ----------------------------------------------------------------- |
| `ToastTitle`       | `as`、`asChild`                    | 只是带 `data-part="title"` 的容器，Radix 也不给它 id 或 aria 关联 |
| `ToastDescription` | `as`、`asChild`                    | 同上，`data-part="description"`                                   |
| `ToastAction`      | `altText`（必填）、`as`、`asChild` | 会关闭通知的按钮；`altText` 为空时不渲染并告警                    |
| `ToastClose`       | `as`、`asChild`                    | 会关闭通知的按钮，无替代文案需求                                  |

`Action` 与 `Close` 都带 `data-toast-announce-exclude`：按钮可见文案（「撤销」）不会被读进 announcer，`Action` 改读 `data-toast-announce-alt` 里的完整句子。

## 关键行为

### 计时与暂停

`duration` 到点即关闭；暂停时记录**剩余时间**、恢复时按剩余时间重开，因此「看了 3 秒再移开」不会重新获得完整 5 秒。暂停/恢复的事件源与 Radix 相同：视口内 `focusin`、`pointermove`、窗口 `blur` 触发暂停；焦点移出视口、`pointerleave`（且焦点不在层内）、窗口 `focus` 触发恢复。重复事件不会重复扣时间——状态只在真正翻转时广播一次。

`duration` 或 `open` 变化都会重建计时快照。这是 Radix issue #2233 的回归点：常驻通知（`Infinity`）改成有限时长后，若沿用旧的剩余时间就永远不会关闭。

### 滑动手势

位移先按方向钳制（右滑时负位移压到 0），启动阈值触摸 10px、指针 2px，两者不同是因为手指按下时的抖动远大于鼠标。启动后 `setPointerCapture` 挂在**命中元素**上，从按钮上起手的滑动也能继续拖。抬手时用累计钳制位移与 `swipeThreshold` 比较：达到阈值发 `swipe-end` 并关闭，否则 `swipe-cancel` 回弹。抬手同时会吞掉这一次 `click`，否则「滑着通知去点里面的按钮」会误触。

### 退出动画与 Presence

`open` 变 false 时元素不会立刻移除，而是带着 `data-state="closed"` 留在 DOM 中，等到 `animationend` / `animationcancel` 才卸载；识别不出动画（`animation-name: none` 或 `display: none`）时立即卸载。判定方式与 Radix 一致，因此**进出场必须写成 `@keyframes`**——只用 `transition` 时打断没有对应事件，本库会当作「没有退出动画」处理。动画结束到节点移除之间会把 `animation-fill-mode` 短暂置为 `forwards`，避免最后一帧与移除之间闪一下。

### 键盘与读屏

- 视口是 `role="region"` 的地标，`aria-label` 自带快捷键说明；`F8`（或自定义组合）把焦点送进去。
- 通知被 portal 进 `<ol>`，DOM 顺序是旧→新而视觉顺序相反，因此 Tab 由视口接管：正向从最新一条开始，配合头/尾两个焦点代理与文档首尾衔接。
- 朗读走独立的 announcer：`role="status"` + `aria-live`（`foreground` → assertive，`background` → polite），文本在**两帧之后**写入（否则 NVDA 会把它当作初始内容忽略），并在 1 秒后移除，使同一条通知再次出现时还能重新播报。
- 通知自动关闭时若焦点还在其内部，先把焦点交还视口，避免掉回 `body`。

## 与 Radix 的差异

| 差异                           | 本库                                                                                            | 原因                                                                              |
| ------------------------------ | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 手势事件负载                   | `{ originalEvent, delta }` 对象                                                                 | Radix 用 CustomEvent 是为了让默认行为与消费者共同写属性；本库默认行为走响应式状态 |
| 位移变量前缀                   | `--y-toast-swipe-*`                                                                             | 与全库 `--y-` 命名空间一致                                                        |
| 朗读排除属性                   | `data-toast-announce-exclude` / `data-toast-announce-alt`                                       | 去掉厂商前缀，语义不变                                                            |
| Escape 归属                    | 无 DismissableLayer，改用两条规则：焦点在通知内交给该通知；焦点在 `aria-modal` 容器内让给模态框 | 本库还没有层级栈管理，规则可验证且不引入新抽象                                    |
| 暂停/恢复的传播                | Provider 内的订阅函数                                                                           | Radix 用 DOM CustomEvent 是因为通知在 React 树外，Vue 侧有 provide/inject         |
| `Viewport` 的 `as` / `asChild` | 不提供                                                                                          | 两个元素的职责不同，单标签名无法表达                                              |
| `VisuallyHidden`               | 未做成独立组件，用内联样式常量                                                                  | 只有 announcer 与焦点代理需要，独立组件是多余的一层                               |
| 空 `label` 告警                | 只在初始化时告警一次                                                                            | Radix 每次 render 都会打日志                                                      |
| `Toast.Root` 的 `forceMount`   | 类型是 `boolean`                                                                                | Radix 的 `forceMount?: true` 是 React 的类型技巧，Vue 侧无收益                    |

## 已知限制

- 关闭动画依赖 `animationend`：浏览器在后台标签页会挂起动画与 `requestAnimationFrame`，announcer 的「两帧后写入」与退出动画的卸载时机在页面隐藏时会被推迟，回到前台后自行恢复。
- announcer 的文本收集发生在元素挂载后，动态改写通知内容不会自动重新播报——需要重播就关闭再打开一条新通知。

## 头层用法

只用无头层时按 Radix 的结构组合，样式全部自带：

```vue
<ToastProvider>
  <ToastViewport />

  <ToastRoot v-model:open="open">
    <ToastTitle>已保存</ToastTitle>
    <ToastDescription>改动已写入草稿。</ToastDescription>
    <ToastAction alt-text="前往草稿箱查看">查看</ToastAction>
    <ToastClose aria-label="关闭">×</ToastClose>
  </ToastRoot>
</ToastProvider>
```
