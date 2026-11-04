<script setup>
import CollapsibleDemo from '../.vitepress/components/CollapsibleDemo.vue';
import Preview from '../.vitepress/components/Preview.vue';
</script>

# Collapsible 折叠区

可展开 / 收起的内容区，对应 Radix Primitives 的 `collapsible` 包：`Root` / `Trigger` / `Content` 三个部件。

## 基础示例

<Preview description="四段折叠区：默认收起、默认展开、受控、禁用。展开与收起都有高度 + 透明度动画，终点高度由无头层测量写入 CSS 变量。">
  <CollapsibleDemo />
</Preview>

```vue
<script setup lang="ts">
import { Collapsible } from '@agile-plus/components/collapsible';
</script>

<template>
  <Collapsible>
    <template #trigger>更新日志</template>

    <ul>
      <li>第一条</li>
    </ul>
  </Collapsible>
</template>
```

## Collapsible

### Props

| 属性          | 类型      | 默认值      | 说明                             |
| ------------- | --------- | ----------- | -------------------------------- |
| `open`        | `boolean` | `undefined` | 受控展开状态，传入后进入受控模式 |
| `defaultOpen` | `boolean` | `false`     | 非受控模式下的初始状态           |
| `disabled`    | `boolean` | `false`     | 禁用，只挡住 Trigger 的点击      |

### Events

| 事件          | 参数             | 说明                     |
| ------------- | ---------------- | ------------------------ |
| `update:open` | `value: boolean` | 配合 `v-model:open` 使用 |

### Slots

| 名称      | 说明           |
| --------- | -------------- |
| `trigger` | 触发按钮的内容 |
| `default` | 折叠区主体     |

## 无样式层用法

```vue
<script setup lang="ts">
import {
  CollapsibleContent,
  CollapsibleRoot,
  CollapsibleTrigger,
} from '@agile-plus/ui/collapsible';
</script>

<template>
  <CollapsibleRoot v-model:open="open" class="my-panel">
    <CollapsibleTrigger class="my-header">详情</CollapsibleTrigger>

    <CollapsibleContent class="my-body">
      <p>内容</p>
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
```

三个部件都支持 `as` 与 `asChild`。`CollapsibleContent` 另有 `forceMount`：强制挂载，用于需要自己控制动画的场景；平时不要开，收起的内容会一直留在 DOM 与可访问性树里。

## 无障碍行为

| 项         | 说明                                                                  |
| ---------- | --------------------------------------------------------------------- |
| 触发器     | `type="button"` + `aria-expanded`（始终输出布尔值）                   |
| 关联       | 展开时 `aria-controls` 指向 Content 的 id；收起后不输出，避免悬空引用 |
| 禁用       | 原生 `disabled` + `data-disabled`                                     |
| 收起的内容 | 不在 DOM 中（Presence 卸载），因此不进焦点序与可访问性树              |
| 键盘       | 按钮原生可聚焦，`Space` / `Enter` 触发切换，无额外按键处理            |

## 高度动画是怎么做到的

`@keyframes` 读不到「内容的自然高度」（`height: auto` 不能作为动画终点），所以无头层在开合变化时测量一次 Content，把结果写成内联变量：

```html
<div class="y-collapsible__content" style="--y-collapsible-content-height: 128px">…</div>
```

样式层再用它做终点：

```scss
@keyframes y-collapsible-open {
  from {
    height: 0;
    opacity: 0;
  }

  to {
    height: var(--y-collapsible-content-height);
    opacity: 1;
  }
}
```

测量有两个必须照搬 Radix 的细节，否则动画会抖：

- **量之前把 `transition-duration` 与 `animation-name` 临时归零**，否则元素正停在动画中间帧，量到的中间值会被当成自然高度写进变量，下一次动画终点就错了。
- **首帧不还原**：初始就展开的折叠区如果立刻还原，浏览器会在同一帧补一段「从 0 展开」的入场动画；用一个 `requestAnimationFrame` 把挡板放掉，第一次真正的开合才恢复动画。这个 rAF 在作用域销毁时取消。

退出动画依赖共享的 `usePresence`：它监听 `animationend`，动画结束才卸载节点；没有动画（例如 reduced-motion）时当帧卸载，行为与接入前一致。

## 样式钩子

```text
.y-collapsible                        外框
.y-collapsible[data-state='open']     展开
.y-collapsible[data-state='closed']   收起
.y-collapsible[data-disabled]         禁用
.y-collapsible__trigger               触发按钮（箭头是 ::after，随 data-state 旋转）
.y-collapsible__content               内容区（进出场动画在这里）
```

组件级变量：`--y-collapsible-radius`、`--y-collapsible-border`、`--y-collapsible-bg`、`--y-collapsible-trigger-hover-bg`、`--y-collapsible-padding-block`、`--y-collapsible-padding-inline`、`--y-collapsible-content-padding-inline`、`--y-collapsible-duration`、`--y-collapsible-ease`、`--y-collapsible-arrow-size`。

测量变量（`--y-collapsible-content-height/width`）由无头层内联写入，**不要**在样式层重新声明：自定义属性只向下继承，重新声明会把内联值盖掉。

## 与 Radix 的差异

| 项目     | Radix                                              | 本库                                                            |
| -------- | -------------------------------------------------- | --------------------------------------------------------------- |
| 命名     | `Collapsible` / `Collapsible.Trigger` / `.Content` | `CollapsibleRoot` / `CollapsibleTrigger` / `CollapsibleContent` |
| 变量名   | `--radix-collapsible-content-height/width`         | `--y-collapsible-content-height/width`                          |
| 受控状态 | `useControllableState`                             | 共享的 `useControllable`，语义相同                              |
| 禁用语义 | Trigger 原生 disabled                              | 相同；程序化 `open()` 不受禁用影响（Radix 同样只挡用户交互）    |
| 样式层   | 无                                                 | 有：外框、箭头与进出场动画，动画终点用测量变量                  |

## 已知限制

- 高度动画的终点是**测量时**的自然高度。若展开后内容自己变高（异步加载、窗口变窄换行），变量不会自动更新——需要时由消费者在内容变化后重新触发展开/收起，或改用 `max-height` 方案。宽度变量同理提供但样式层未使用。
- 嵌套折叠区可用，但内层的测量变量会覆盖外层的同名变量（自定义属性向下继承）：内层 Content 上有自己的内联值，因此互不影响；**不要**在外层手写这两个变量。

## Primitives 层

```ts
import {
  getCollapsibleContentAttrs,
  getCollapsibleContentVars,
  getCollapsibleRootAttrs,
  getCollapsibleState,
  getCollapsibleTriggerAttrs,
} from '@agile-plus/primitives/collapsible';

getCollapsibleState(true); // 'open'
getCollapsibleTriggerAttrs({ open: false, disabled: false, contentId: 'c-1' });
// { type: 'button', 'aria-expanded': false, 'aria-controls': undefined,
//   'data-state': 'closed', 'data-disabled': undefined }
getCollapsibleContentVars({ height: 128, width: 640 });
// { '--y-collapsible-content-height': '128px', '--y-collapsible-content-width': '640px' }
```
