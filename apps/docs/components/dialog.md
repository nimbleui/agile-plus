<script setup>
import DialogDemo from '../.vitepress/components/DialogDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Dialog 对话框

模态对话框。管理打开状态、焦点进入、Escape 关闭、遮罩点击关闭，并提供完整的 `role="dialog"` 无障碍结构。

## 基础示例

<Preview description="左边的按钮用 v-model:open 受控，右边那个完全不绑定 open、只靠内部状态驱动。点击触发器打开，按 Esc 或点击遮罩关闭。">
  <DialogDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { Dialog } from '@agile-plus/components/dialog';

const visible = ref(false);
</script>

<template>
  <Dialog v-model:open="visible">
    <template #trigger>打开对话框</template>
    <template #title>创建资源</template>
    <template #description>该操作将在当前工作区创建一个新的资源实例。</template>
  </Dialog>
</template>
```

## Dialog

带样式的复合组件。内部封装 `@agile-plus/ui` 的七个子组件并注入样式。

### Props

| 属性                  | 类型                      | 默认值      | 说明                                                |
| --------------------- | ------------------------- | ----------- | --------------------------------------------------- |
| `open`                | `boolean`                 | `undefined` | 受控打开状态，传入后进入受控模式                    |
| `defaultOpen`         | `boolean`                 | `false`     | 非受控模式下的初始状态                              |
| `closeOnEscape`       | `boolean`                 | `true`      | 按 Escape 是否关闭                                  |
| `closeOnOverlayClick` | `boolean`                 | `true`      | 点击遮罩是否关闭                                    |
| `container`           | `HTMLElement`             | `undefined` | Portal 目标，遮罩与内容共用；缺省为 `document.body` |
| `onOpenChange`        | `(open: boolean) => void` | `undefined` | 状态变化回调                                        |

### Events

| 事件          | 参数             | 说明                     |
| ------------- | ---------------- | ------------------------ |
| `update:open` | `value: boolean` | 配合 `v-model:open` 使用 |

### Slots

| 名称          | 说明                               |
| ------------- | ---------------------------------- |
| `trigger`     | 触发按钮内容                       |
| `title`       | 对话框标题，关联 `aria-labelledby` |
| `description` | 描述文本，关联 `aria-describedby`  |
| `default`     | 主体内容，渲染在标题与描述之后     |

## 无样式层 API

需要自定义结构与样式时，直接使用 `@agile-plus/ui/dialog` 的复合组件：

```vue
<script setup lang="ts">
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from '@agile-plus/ui/dialog';
</script>

<template>
  <DialogRoot v-model:open="visible">
    <DialogTrigger>打开</DialogTrigger>

    <DialogOverlay class="my-overlay" />

    <DialogContent class="my-content">
      <DialogTitle class="my-title">标题</DialogTitle>
      <DialogDescription class="my-desc">描述</DialogDescription>

      <DialogClose class="my-close">关闭</DialogClose>
    </DialogContent>
  </DialogRoot>
</template>
```

UI 层组件渲染的元素不带任何 class，消费者自行决定类名，通过 `data-part` 与 `data-state` 定位。

### useDialog

```ts
import { useDialog } from '@agile-plus/headless';

const { isOpen, open, close, toggle, getTriggerProps, getContentProps } = useDialog();
```

| 返回值                      | 类型                                 | 说明                          |
| --------------------------- | ------------------------------------ | ----------------------------- |
| `isOpen`                    | `Ref<boolean>`                       | 当前是否打开                  |
| `open` / `close` / `toggle` | `() => void`                         | 状态操作方法                  |
| `getTriggerProps()`         | `Record<string, unknown>`            | ARIA 属性，绑定到触发按钮     |
| `getContentProps()`         | `Record<string, unknown>`            | ARIA 属性，绑定到内容容器     |
| `getOverlayProps()`         | `Record<string, unknown>`            | ARIA 属性，绑定到遮罩层       |
| `getTitleProps()`           | `Record<string, unknown>`            | id，绑定到标题元素            |
| `getDescriptionProps()`     | `Record<string, unknown>`            | id，绑定到描述元素            |
| `portalTarget`              | `ComputedRef<HTMLElement \| 'body'>` | Teleport 目标，遮罩与内容共用 |
| `setContentElement(node)`   | `(node: unknown) => void`            | 注册内容元素，焦点陷阱靠它    |
| `onContentKeydown(event)`   | `(event: KeyboardEvent) => void`     | 绑定到内容容器的 `@keydown`   |
| `onOverlayClick()`          | `() => void`                         | 绑定到遮罩层的 `@click`       |

`get*Props` 只返回可 `v-bind` 的属性，事件处理器单独暴露。在 Vue 中事件必须通过 `v-on` 显式绑定，把 `onClick` 混入 `v-bind` 对象会降低模板的可读性，也让消费者难以叠加自己的处理逻辑：

```vue
<button v-bind="getTriggerProps()" @click="open()">打开</button>
```

## 无障碍行为

| 项         | 实现                                                                          |
| ---------- | ----------------------------------------------------------------------------- |
| 角色       | 内容容器 `role="dialog"` + `aria-modal="true"`                                |
| 标题关联   | `aria-labelledby` 指向 `DialogTitle` 的 id                                    |
| 描述关联   | `aria-describedby` 指向 `DialogDescription` 的 id                             |
| 触发器状态 | `aria-haspopup="dialog"` + `aria-expanded` + `aria-controls`                  |
| 键盘       | `Escape` 关闭（受 `closeOnEscape` 控制）                                      |
| 焦点       | 打开后聚焦内容容器；Tab / Shift+Tab 在内容内循环，外部聚焦会被收回            |
| 滚动       | 打开时锁定 `body` 滚动，关闭或卸载后恢复                                      |
| 渲染       | 遮罩与内容都通过 `Teleport` 挂到同一个目标（默认 `body`），脱离父级层叠上下文 |

## 进出场动画

遮罩与内容各持有一个共享的 `usePresence` 实例，因此关闭不是立即卸载：元素会先带上
`data-state="closed"`，等 `@keyframes` 播完再移除。没有动画时判定不成立，元素当帧卸载，
行为与接入 Presence 之前一致。

**本库的 Presence 只认 animation 事件**（`animationstart` / `animationend` / `animationcancel`），
所以进出场必须写成 `@keyframes`；用 `transition` 写退场会把元素留在 DOM 里——transition
被打断时没有对应事件。样式层当前的遮罩仍是 `transition: opacity`，因此退场仍是即时卸载；
要改成动画，按 Toast 的写法补 `@keyframes` 与 `prefers-reduced-motion` 分支。

退场期间焦点陷阱与滚动锁已经随 `isOpen` 释放，不会出现「对话框已经关闭还能 Tab 进去」。

## 样式钩子

```text
.y-dialog[data-part='overlay']      遮罩层
.y-dialog[data-part='content']      内容容器
.y-dialog[data-part='title']        标题
.y-dialog[data-part='description']  描述
.y-dialog__close                    关闭按钮
```

组件级 CSS Variables：`--y-dialog-overlay-bg`、`--y-dialog-bg`、`--y-dialog-radius`、`--y-dialog-shadow`、`--y-dialog-padding`、`--y-dialog-title-color`、`--y-dialog-description-color`、`--y-dialog-close-size`、`--y-dialog-close-color`、`--y-dialog-close-hover-bg`。

## 已知限制

- 尚未实现关闭后焦点还原：关闭后焦点不会回到触发按钮。
- 样式层的遮罩还是 `transition`，因此退场目前即时卸载；要让退场成为动画需改成 `@keyframes`，原因见「进出场动画」。

## Primitives 层

状态机与键盘判断完全独立于框架：

```ts
import { createDialogMachine, handleDialogKeydown } from '@agile-plus/primitives/dialog';

const machine = createDialogMachine({ defaultOpen: false });

machine.send({ type: 'OPEN' });

const { shouldClose, handled } = handleDialogKeydown('Escape', {
  isOpen: true,
  canCloseOnEscape: true,
});
```

`DialogAction` 支持 `OPEN` / `CLOSE` / `TOGGLE` / `SET_OPEN`；`DialogState` 包含 `open` 与四个 ARIA 关联 id。
