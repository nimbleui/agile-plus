<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import ScrollAreaDemo from '../.vitepress/components/ScrollAreaDemo.vue';
</script>

# ScrollArea 滚动区域

自定义滚动条容器。部件与属性对齐 Radix 的 `ScrollArea.Root` / `Viewport` / `Scrollbar` / `Thumb` / `Corner`，用测量得到的几何驱动 thumb，替换样式受限的原生滚动条。

命名需要先说明：Radix 里这个组件叫 **`ScrollArea`**，`Scrollbar` 与 `Thumb` 只是它的部件，本库沿用同样的分层命名。

## 基础示例

<Preview description="四种 type 并排。滚动时 thumb 位置由 scrollTop 换算；切换内容长度后不溢出的实例会连滚动条一起消失。">
  <ScrollAreaDemo />
</Preview>

```vue
<script setup lang="ts">
import { ScrollArea } from '@agile-plus/components/scroll-area';
</script>

<template>
  <ScrollArea style="height: 240px">
    <div class="content">很长很长的内容……</div>
  </ScrollArea>
</template>
```

**根容器必须有确定高度**（`height` 或 `max-height`）：视口用 `height: 100%` 撑满父级，父级没有高度时永远不会溢出，也就永远看不到滚动条。这是该组件最常见的误用。

## ScrollArea

### Props

| 属性              | 类型                                        | 默认值      | 说明                                     |
| ----------------- | ------------------------------------------- | ----------- | ---------------------------------------- |
| `type`            | `'hover' \| 'scroll' \| 'always' \| 'auto'` | `'hover'`   | 滚动条出现时机，见下表                   |
| `scrollHideDelay` | `number`                                    | `600`       | 停止交互到隐藏的延迟（毫秒）             |
| `dir`             | `'ltr' \| 'rtl'`                            | `undefined` | 输出根元素 `dir`，横向偏移映射见已知限制 |
| `minThumbSize`    | `number`                                    | `20`        | thumb 最小可点中长度（px）               |
| `as`              | `string`                                    | `'div'`     | 渲染的目标标签名                         |
| `asChild`         | `boolean`                                   | `false`     | 不渲染自身容器，把属性合并到唯一子元素   |

### 子部件

| 部件        | Props                                                           | 说明                                    |
| ----------- | --------------------------------------------------------------- | --------------------------------------- |
| `Viewport`  | `as`                                                            | 真实发生滚动的容器，隐藏原生滚动条      |
| `Scrollbar` | `orientation`（默认 `vertical`）、`forceMount`、`as`、`asChild` | 轨道，默认只在可见时存在                |
| `Thumb`     | `as`、`asChild`                                                 | 拖拽块，朝向取自所属 Scrollbar 的上下文 |
| `Corner`    | `as`、`asChild`                                                 | 两轨道交汇处，仅双向都可见时渲染        |

## 四种出现时机

| `type`   | 何时出现                                          | 依赖的输入                |
| -------- | ------------------------------------------------- | ------------------------- |
| `always` | 始终出现，即使内容没有溢出（此时 thumb 长度为 0） | 无                        |
| `auto`   | 内容溢出时始终出现                                | `hasOverflow`             |
| `hover`  | 指针悬停、键盘聚焦或拖拽时出现（默认）            | `interacting`、`dragging` |
| `scroll` | 滚动后出现，停止 `scrollHideDelay` 后隐藏         | `recentlyScrolled`        |

判定逻辑是 `primitives` 里的一个纯函数，规则读作一条链：`always` 常驻；否则**必须先有溢出**，再在该类型自己的触发条件或拖拽中时放行。

两条容易忽略但必须成立的约束：

- **`hover` 要包含键盘聚焦**。只看 `pointerenter` 的话，用键盘滚动的人永远看不到滚动条。因此输入字段叫 `interacting`（悬停或聚焦），不是 `hovered`。
- **拖拽中强制可见**。否则指针一按下去滚动条就消失，thumb 会从指针底下被抽走。

## 几何怎么算

thumb 的尺寸与位置全部来自同一组像素输入，正算与反算严格互逆：

```text
size   = max(minThumbSize, viewportSize² / scrollSize)
offset = (scrollOffset / (scrollSize - viewportSize)) × (viewportSize - size)
```

- **最小长度是必须的**：内容远大于视口时按比例算出的 thumb 会细到 1px 以下，指针无法点中。Radix 未公开这个常量，本库把它显式化为 `minThumbSize` 并允许覆盖。
- **偏移做了取整**，为了写进内联样式时不出现亚像素抖动；拖拽反算复用同一份取整结果，因此不会出现「拖一下跳一下」。轨道余量越界时先钳制再反算。
- **位移用 `transform: translate()` 而不是 `top` / `left`**：每次滚动都触发布局的话，长列表滚动会明显掉帧。

## 测量与更新如何避免抖动

这一层是 `ScrollArea` 唯一有难度的地方，四个约束都写进了代码：

1. **`computed` 读 DOM 不会自动失效**。滚动、 resize 都是布局变化而非响应式变化，因此有一个 `measureVersion` 作为显式代号，测量请求推进它，几何 computed 依赖它——少了这一步会表现为「滚了但 thumb 不动」。
2. **高频事件用 `requestAnimationFrame` 合并**。`scroll` 与 `pointermove` 都是逐帧多次触发，逐次读布局会造成强制同步布局；`requestMeasure` 保证一帧只测一次，并把「推进版本」与「读 DOM」分开，避免读写交错。
3. **同时观察视口与内容**。视口尺寸变化改变轨道长度，内容尺寸变化改变溢出量；只观察视口会在「容器不变、内容变长」时漏更新。内容子元素被整体替换时旧观察目标失效，因此还有一个 `MutationObserver` 重新挂载。回调里只读不写视口尺寸（写的是视口之外轨道上的 transform），不会形成观察循环。
4. **拖拽只写 `scrollTop`**，thumb 的新位置仍由 `scroll` 事件走同一套测量得到。若拖拽路径直接改 thumb 样式，就出现两套真源、互相抖。

拖拽监听挂在 `window` 而非 thumb，也不需要 `setPointerCapture`（它在合成指针事件下会抛 `InvalidStateError`）。清理集中在一个 `disposeDrag`，`pointerup`、`pointercancel` 与组件卸载共用同一条路径，否则中断的拖拽会把状态留在「正在拖」、滚动条再也不会隐藏。

## 无样式层用法

```vue
<script setup lang="ts">
import {
  ScrollAreaCorner,
  ScrollAreaRoot,
  ScrollAreaScrollbar,
  ScrollAreaThumb,
  ScrollAreaViewport,
} from '@agile-plus/ui/scroll-area';
</script>

<template>
  <ScrollAreaRoot type="always">
    <ScrollAreaViewport class="my-viewport">
      <slot />
    </ScrollAreaViewport>

    <ScrollAreaScrollbar orientation="vertical" class="my-track">
      <ScrollAreaThumb class="my-thumb" />
    </ScrollAreaScrollbar>

    <ScrollAreaScrollbar orientation="horizontal" class="my-track">
      <ScrollAreaThumb class="my-thumb" />
    </ScrollAreaScrollbar>

    <ScrollAreaCorner class="my-corner" />
  </ScrollAreaRoot>
</template>
```

样式层必须自己隐藏原生滚动条，否则会和自定义 thumb 同时出现：`scrollbar-width: none` 与 `::-webkit-scrollbar { display: none }`。Components 层已包含这段。

## useScrollArea

```ts
import { useScrollArea } from '@agile-plus/headless';

const area = useScrollArea({ type: 'auto' });
```

| 返回值                                                                                                                         | 说明                                            |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| `viewportRef`                                                                                                                  | 由 Viewport 写入的元素引用，测量的读取源        |
| `type`                                                                                                                         | 当前生效的出现时机                              |
| `requestMeasure()`                                                                                                             | 请求一次测量，同帧内重复调用会被合并            |
| `getRootProps()` / `getViewportProps()` / `getScrollbarProps(orientation)` / `getThumbProps(orientation)` / `getCornerProps()` | 各部件可 `v-bind` 的属性                        |
| `getThumbStyle(orientation)`                                                                                                   | thumb 的内联几何（长轴长度与 `transform` 位移） |
| `getVisibility(orientation)`                                                                                                   | 该朝向滚动条当前是 `visible` 还是 `hidden`      |
| `isCornerVisible`                                                                                                              | 两个方向是否同时可见                            |
| `onViewportScroll` / `onViewportPointerEnter` / `…PointerLeave` / `onViewportFocusin` / `onViewportFocusout`                   | 绑定到视口的事件                                |
| `onScrollbarPointerEnter(orientation)` / `…Leave(orientation)`                                                                 | 绑定到轨道的事件，保证鼠标在轨道上时不消失      |
| `onThumbPointerDown(event, orientation)`                                                                                       | 绑定到 thumb 的 `@pointerdown`                  |

## Primitives 层

```ts
import {
  clampThumbOffset,
  DEFAULT_MIN_THUMB_SIZE,
  getScrollOffsetFromThumb,
  getThumbMetrics,
  resolveScrollbarVisibility,
} from '@agile-plus/primitives/scroll-area';

getThumbMetrics({ viewportSize: 100, scrollSize: 200, scrollOffset: 100 });
// → { size: 50, offset: 50, hasOverflow: true }

resolveScrollbarVisibility(
  { interacting: false, dragging: true, recentlyScrolled: false, hasOverflow: true },
  'hover'
);
// → 'visible'，拖拽中不允许 thumb 从指针下消失
```

本组件的几何与可见性判断都不读取 DOM，因此 19 个单测在 node 环境下即可完整覆盖边界（零尺寸、无溢出、thumb 占满轨道、越界偏移、正算反算互逆）。

## 无障碍行为

| 项             | 实现                                                          |
| -------------- | ------------------------------------------------------------- |
| 视口可聚焦     | `tabindex="0"`，让键盘用户能够滚动内容                        |
| 滚动条与 thumb | 纯指针控件，不参与 Tab 序，也没有 ARIA 角色                   |
| 状态           | 轨道与 thumb 都带 `data-state`，thumb 另带 `data-orientation` |
| 焦点反馈       | 视口聚焦时算作 `interacting`，滚动条随之出现                  |

原生滚动条被隐藏后，若视口不可聚焦，键盘用户就完全没有滚动手段——这也是本库比 Radix 多做的一件事（见下表）。

## 样式钩子

```text
.y-scroll-area                       根容器（需要确定高度）
.y-scroll-area__viewport             视口，隐藏原生滚动条
.y-scroll-area__scrollbar            轨道，带 data-orientation 与 data-state
.y-scroll-area__thumb                拖拽块，尺寸与位移来自内联样式
.y-scroll-area__corner               角部方块
```

组件级变量：`--y-scroll-area-size`（轨道厚度）、`--y-scroll-area-thumb-color`、`--y-scroll-area-thumb-color-hover`、`--y-scroll-area-corner-bg`、`--y-scroll-area-radius`。

## 与 Radix 的差异

| 项目                  | Radix                       | 本库                                                                                       |
| --------------------- | --------------------------- | ------------------------------------------------------------------------------------------ |
| 视口可聚焦            | 未设置 `tabindex`           | 设 `tabindex="0"`，否则隐藏原生滚动条后键盘无法滚动                                        |
| Viewport 的 `asChild` | 提供                        | 不提供：Viewport 必须持有自己的元素引用才能测量，`Slot` 的 ref 只能拿到组件实例；支持 `as` |
| `minThumbSize`        | 内部常量                    | 显式化为可配属性，默认 20                                                                  |
| `nonce`               | 提供                        | 不提供：本库不注入 `<style>`，没有 CSP nonce 的需求                                        |
| 可见性定时器          | 状态与定时器混在 context 里 | 纯函数判定 + Headless 侧定时器，边界可单测                                                 |

## 已知限制

- **RTL 的横向滚动偏移未做映射**：`dir="rtl"` 时各浏览器对 `scrollLeft` 的取值约定不同，本库仍按 `ltr` 计算，横向滚动条在 RTL 下位置可能反向。`dir` 只用于输出属性。
- 拖拽期间内容尺寸若发生变化（图片异步加载完成等），`size` 与 `scrollSize` 仍是按下时的快照，需要松手后重新拖拽；这一取舍换来的是拖拽过程中不出现反馈回路。
- 角部只处理「双向都可见」的情况，不处理嵌套滚动容器的层叠顺序。
