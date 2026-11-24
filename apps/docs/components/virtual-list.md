<script setup>
import Preview from '../.vitepress/components/Preview.vue';
import VirtualListDemo from '../.vitepress/components/VirtualListDemo.vue';
</script>

# VirtualList 虚拟列表

只渲染视口内那十几行、却给出与十万行一致的滚动条与滚动行程，并支持**每行高度不同**。四层实现：`primitives/virtual` 负责 Fenwick 树、前缀和与树上二分；`headless/useVirtualList` 负责滚动读取、高度测量与区间提交；`ui/virtual-list` 提供两层结构、ARIA 与功能性内联样式；`components/virtual-list` 注入字号、行内边距与分隔线。

**动态高度的虚拟列表，本质是一道前缀和查询。** 等高列表可以算 `Math.floor(scrollTop / 行高)`；行高不一时「第 i 项的顶边在哪」只能从累计高度里查。这一层用一棵按项高度建立的 Fenwick 树来回答这个问题：`lowBit(n) = n & -n` 决定树上每个节点覆盖哪几项，于是「改一项的高度」和「查偏移落在哪一项」都是 O(log n)。

## 基础示例

<Preview description="实时演练场（条数 / 内容形态 / 预估行高 / 预渲染行数 / 容器高度 / 跳转 / 追加 / 替换 / 重量高度全部即时生效）、等高与动态高度对照、无样式层直接读区间状态。">
  <VirtualListDemo />
</Preview>

```vue
<script setup lang="ts">
import { ref } from 'vue';

import { VirtualList } from '@agile-plus/components/virtual-list';

const rows = ref(
  Array.from({ length: 100000 }, (_, index) => ({ id: index, text: `第 ${index} 行` }))
);
</script>

<template>
  <VirtualList :items="rows" :item-key="(item) => item.id" :height="400" :estimate-size="40">
    <template #default="{ item, index }">
      <span>{{ index }} · {{ item.text }}</span>
    </template>
  </VirtualList>
</template>
```

## 成品层 Props

| 属性           | 类型                   | 默认值      | 说明                                                      |
| -------------- | ---------------------- | ----------- | --------------------------------------------------------- |
| `items`        | `readonly T[]`         | `[]`        | 数据源，长度即项数；插槽里的 `item` 按当前窗口下标取      |
| `itemKey`      | `(item, index) => key` | `index`     | 返回项的唯一稳定身份；高度与行 DOM 按它复用，适合重排数据 |
| `estimateSize` | `number`               | `40`        | 未测量项所用高度；非正值按 1 兜住                         |
| `overscan`     | `number`               | `3`         | 视口上下各多渲染的项数；`0` 是有效配置，负数按 0          |
| `height`       | `string \| number`     | `undefined` | 容器高度；数字按 `px`，字符串原样写入，不传则由样式层决定 |

插槽：带作用域的默认插槽，参数为 `{ item, index }`，`index` 即数据下标。事件：无——滚动位置变化直接在容器上监听 `scroll`，区间状态到无头层读。

成品层 expose：`scrollToIndex(index)`、`scrollIntoView(index)`、`scrollToOffset(offset)`、`invalidateMeasurements()`。`scrollIntoView` 只在目标不完整可见时做最小位移，不会强制对齐顶部。区间状态（`startIndex` / `endIndex` / `visibleIndices` / `totalSize` / `scrollTop` / `viewportSize`）刻意不转发，需要它就用 `@agile-plus/ui/virtual-list` 或直接 `useVirtualList`。

## 无样式层与无头层

`ui/virtual-list` 是同一套结构去掉 CSS 的样子：Props 完全一致，expose 额外带上面那六个区间状态。`headless/useVirtualList` 只认 `count` 与可选的稳定身份解析器，不持有数据数组：

```ts
import { useVirtualList } from '@agile-plus/headless';

const list = useVirtualList({
  count: () => items.value.length,
  getItemKey: (index) => items.value[index].id,
  estimateSize: 40,
  overscan: 3,
});
```

返回值里 `setViewportElement` / `setContentElement` 用 `:ref` 绑定两个元素，`paddingTop` / `paddingBottom` 与 `visibleIndices` 由调用方自己写进模板。契约只有一条：`content` 的**直接子元素**必须与 `visibleIndices` 一一对应且顺序一致——中间插一层包装元素会把高度记到错误的项上。

## 定位：Fenwick 树上的二分

- **树是 `Float64Array`，且整体不进响应式系统。** 十万项的 Proxy 会把 O(log n) 的优势整个还回去；树上的每个节点 `tree[i]` 保存第 `i - lowBit(i)` 到第 `i - 1` 项的高度之和，下标 1-based。
- **建树 O(n)**：升序扫过每一项时把累加值转发给父节点（`j = i + lowBit(i)` 恒大于 `i`），不需要逐次 `add`。
- **偏移 → 下标用位下降，而不是「二分下标 + 每次查前缀和」的 O(log² n)**：从最高位开始逐层试探，每层一次加法一次比较，`accumulated` 是已经走过的总高度。滚动一次只用它定位两次（视口上沿、视口下沿），中间的渲染区间是直接可枚举的连续下标——代价只跟实际渲染数有关，跟总项数无关。
- **前提是树上不能有负数**：一旦出现，前缀和不再单调，二分结果不再正确。所以测量值统一 `Math.max(0, offsetHeight)`。
- 为什么不维护普通前缀数组：单项量出真实高度后要更新它之后的所有前缀和，那是 O(n)；Fenwick 把「量一项、改一项」压回 O(log n)。

## 定位靠 padding，而不是逐行 absolute

内容层只有两个内联样式：`box-sizing: content-box` 与上下 `padding`——`paddingTop` 是 `start` 之前所有项的高度之和，`paddingBottom` 是 `end` 之后的和。flow 布局让行自然生长，动态高度在测量前不可知也不需要可知。

absolute 定位要为每一行再算一次偏移，等于把同一个前缀和编码两遍，还会让行内文本选中与焦点顺序依赖定位上下文。**content 也不钉 `height`**：flow 下「上 padding + 各行实际高 + 下 padding」已经等于总高，再钉一次会把渲染行算两遍。

视口下沿正好落在项边界时该项会算进可见区（二分取 `<=`），底部多渲染一行——`scrollTop` 在小数缩放与惯性滚动下会拿到非整数值，宁可多画一行也不留一条因四舍五入出现的空白。

## 估算、实测与滚动补偿

每个 key 只保存一份实测高度；当前生效高度仍按位置放进 Fenwick 树，未测量项使用 `estimateSize`。估算调整不会覆盖真实结论，数据重排时实测高度随 key 移动。

一个窗口的收敛最多花两帧，更新周期严格分三段，每段只碰一类资源：

```text
readAndCommit    读 scrollTop / clientHeight  →  量上一轮已 patch 的 DOM  →  算新区间
                          ↓（Vue patch 完，watcher flush: post）
measureRendered  核对新 DOM 身份并读高度 → 打补丁算 delta → 写 scrollTop 与区间
```

- **旧 DOM 不会按新下标测量**：目标区间变化时，DOM 仍是上一轮内容；只有 `renderedKeys` 与当前 key 一致的行才参与测量，patch 后再量新行。
- **读取段循环体内只读布局、只改本地数组**，`scrollTop` 与响应式提交一律留到循环之后——读写交错是 Layout Thrashing 唯一的成因。
- **量到的差异补回滚动位置**：视口**上方**某项被量出真实高度后内容整体位移，用户正在读的一行会在指针下突然滑走。分界线是「滚动锚点落在哪一项」（`findFenwickIndex(tree, scrollTop)`），不是渲染区间首项——两者只差前置 overscan，而能测到高度的行恰恰只有渲染区间那一段。视口首项及其之下的变化不补：该项本来就压在锚点上，用滚动位置去抵消反而让正在阅读的内容跳动。
- **收敛条件是区间去重**：`commitWindow` 算出的区间与上一次的三项样式值都相同就不写新对象，链路自己停住。
- **同一帧的多次请求合并进一次 rAF**：`scroll` 与 `ResizeObserver` 的触发频率都远高于渲染。
- **viewport 自身也进入尺寸观察**：侧栏展开、Splitter 拖动或窗口缩放改变可视高度时，不需要等下一次滚动才重算区间。
- 行内异步内容（图片懒加载、字体换取行高）由 `ResizeObserver` 自动重测，不需要手动调用。

## 数据变更与高度记账

高度结论按**数据身份**记账，窗口与 Fenwick 树仍按当前位置组织：

- 尾部追加是安全的——已有 key 的实测高度保留，新增项回落到估算值，上方内容不跳。
- 传入 `itemKey` / `getItemKey` 后，整体替换、前插与重排会把同一 key 的高度带到新位置；不需要手动重测。key 必须在当前数据中唯一。
- 不传稳定身份时默认按下标记账，行为与早期版本一致；整体替换数据后仍要调 `invalidateMeasurements()`。
- 数据缩小时 DOM 可能比状态慢半拍，测量只读取上一轮已 patch 的区间，并核对 key；旧行不会写进新项。
- 渲染行的 `:key` 与高度缓存使用同一身份：默认是下标，传入 `itemKey` 后是数据 key。窗口移动或重排时，DOM 跟随数据而不是位置。

`scrollToIndex` 的目标偏移是一次前缀和查询，未测量的项也能跳；代价是落点基于估算，等真实高度量出来后偏移会继续漂移。刻意不做「跳完再跟随修正」的循环——跟随循环会在每次测量后重写 `scrollTop`，用户看到滚动自己不停微调，比一次落点偏差更难解释。

## 无障碍行为

| 项       | 说明                                                                                   |
| -------- | -------------------------------------------------------------------------------------- |
| 结构     | `content` 是 `role="list"`，行是 `role="listitem"`                                     |
| 命名     | 宿主传入的 `aria-*` 转发到 content；`class` / `style` 等透传属性仍落在 viewport        |
| 位置     | 每行带 `aria-posinset` / `aria-setsize`，只渲染片段时读屏仍报「第 3 项，共 100000 项」 |
| 滚动     | 滚动容器就是列表根元素，键盘 PageDown / 方向键走原生滚动，不劫持                       |
| 焦点     | 行本身不可聚焦；行内可交互元素按原生顺序 Tab，窗口移动不额外插 Tab 落点                |
| 减少动效 | 组件无进出场动画，天然尊重 reduced-motion                                              |

## 已知限制

- **纵向、元素内滚动**：不接 `window` 或外部滚动容器，没有横向模式。滚动容器必须是列表自己（`height` 或样式层给出确定高度）。
- **容器高度必须确定**：`viewportSize` 还没量到时算出来的是「首项 + 前后 overscan」，不会崩，但也不覆盖视口。
- **未测量区段始终按 `estimateSize` 记账**：估算与真实行高差得越多，滚动条在滚动过程中伸缩得越明显。这是动态高度的固有代价，不是缺陷。
- **不做自动滚动锚定**：传入稳定 `itemKey` 可以正确重排高度，但前插不会自动调整 `scrollTop` 来保持当前视口内容不动。
- **成品层不暴露区间状态**：需要「接近底部加载更多」这类判断，请用 `ui` 层的 `scrollTop` / `totalSize` 或 `headless` 的 `useVirtualList`。
- **行内本地状态跟随下标**：`key` 是下标，整批替换数据后已挂载行的内部状态（行内输入草稿等）不会随数据重新分配，需要时自行让行组件按数据身份重建。
